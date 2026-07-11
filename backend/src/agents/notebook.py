from dataclasses import dataclass, field

import numpy as np

from core.models import Citation
from persistence.embed import Embedder
from persistence.rerank import Reranker
from persistence.store import MetaStore
from persistence.vector import VectorStore

from .synth import synthesize

# How many vector-search candidates to fetch (and rerank) per requested chunk.
RERANK_FETCH_MULTIPLIER = 4


@dataclass
class NotebookResult:
    text: str
    citations: list[Citation] = field(default_factory=list)
    had_hits: bool = False


def _format_citations(
    answer_text: str,
    used: set[int],
    chunks_with_doc: list,
    score_by_id: dict[str, float],
) -> list[Citation]:
    citations: list[Citation] = []
    for i, (chunk, doc_name) in enumerate(chunks_with_doc, start=1):
        if i not in used:
            continue
        text = chunk.content.strip()
        excerpt = text[:200].rstrip() + ("..." if len(text) > 200 else "")
        citations.append(
            Citation(
                citation_id=i,
                doc_id=chunk.doc_id,
                doc_name=doc_name,
                page=chunk.page_number,
                excerpt=excerpt,
                relevance_score=round(score_by_id.get(chunk.id, 0.0), 4),
                section=chunk.section_title,
                source="analysis" if chunk.chunk_type == "analysis" else "chunk",
            )
        )
    return citations


_SUMMARY_PATTERNS = frozenset([
    "tóm tắt", "tổng quan", "nội dung", "giới thiệu",
    "summary", "summarize", "overview", "abstract",
])

def _is_summary_query(question: str) -> bool:
    q = question.lower()
    return any(p in q for p in _SUMMARY_PATTERNS)


def _build_where(
    user_id: str | None, doc: str | None, doc_ids: list[str] | None
) -> dict | None:
    """Build the Chroma metadata filter from the user, an optional single doc, and an
    optional list of context docs. Multiple clauses are AND-ed."""
    clauses: list[dict] = []
    if user_id is not None:
        clauses.append({"user_id": user_id})
    if doc:
        clauses.append({"doc_id": doc})
    if doc_ids:
        clauses.append({"doc_id": {"$in": doc_ids}})
    if len(clauses) > 1:
        return {"$and": clauses}
    return clauses[0] if clauses else None


def retrieve_chunks(
    question: str,
    *,
    store: MetaStore,
    vector: VectorStore,
    embedder: Embedder,
    doc: str | None = None,
    top_k: int = 5,
    user_id: str | None = None,
    doc_ids: list[str] | None = None,
    reranker: Reranker | None = None,
) -> tuple[list, dict[str, float]] | None:
    """Retrieve (chunks_with_doc, score_by_id) for a question, or None on no hits.

    Handles the summary/overview-query bypass (first chunks by page order) and
    falls back to semantic vector search otherwise. Shared by answer() and the
    direct notebook-streaming path in the /converse endpoint.

    If `reranker` is given, over-fetch candidates from the vector search and
    rerank them with a cross-encoder, keeping the top `top_k`.
    """
    where = _build_where(user_id, doc, doc_ids)

    # Summary/overview queries on specific docs: bypass semantic search entirely
    # and retrieve the first N chunks by page order (abstract + introduction).
    # Semantic search on "summarize this document" skews toward bibliography pages
    # because they contain high-density noun phrases that match the query embedding.
    effective_doc_ids = doc_ids or ([doc] if doc else None)
    if _is_summary_query(question) and effective_doc_ids:
        chunks_with_doc = store.get_first_chunks_by_doc(effective_doc_ids, limit=top_k)
        if chunks_with_doc:
            score_by_id = {c.id: 1.0 for c, _ in chunks_with_doc}
            return chunks_with_doc, score_by_id
        # fallthrough to semantic search if doc has no chunks yet

    q_emb = embedder.embed_one(question)
    fetch_k = top_k * RERANK_FETCH_MULTIPLIER if reranker is not None else top_k
    hits = vector.query(q_emb, top_k=fetch_k, where=where)
    if not hits:
        return None

    chunk_ids = [h[0] for h in hits]
    chunks_with_doc = store.fetch_chunks(chunk_ids)
    if not chunks_with_doc:
        return None

    score_by_id = {h[0]: h[1] for h in hits}

    if reranker is not None and len(chunks_with_doc) > 1:
        contents = [c.content for c, _ in chunks_with_doc]
        scores = reranker.score(question, contents)
        ranked = sorted(
            zip(chunks_with_doc, scores, strict=True), key=lambda pair: pair[1], reverse=True
        )[:top_k]
        chunks_with_doc = [cd for cd, _ in ranked]
        score_by_id = {cd[0].id: float(1.0 / (1.0 + np.exp(-s))) for cd, s in ranked}

    return chunks_with_doc, score_by_id


def answer(
    question: str,
    *,
    store: MetaStore,
    vector: VectorStore,
    embedder: Embedder,
    api_key: str | None,
    model: str,
    doc: str | None = None,
    top_k: int = 5,
    dry_run: bool = False,
    user_id: str | None = None,
    doc_ids: list[str] | None = None,
    reranker: Reranker | None = None,
) -> NotebookResult:
    """Retrieve + synthesize a document-grounded answer with citations.

    Returns a NotebookResult with had_hits=False when retrieval finds nothing.
    """
    retrieval = retrieve_chunks(
        question, store=store, vector=vector, embedder=embedder,
        doc=doc, top_k=top_k, user_id=user_id, doc_ids=doc_ids, reranker=reranker,
    )
    if retrieval is None:
        return NotebookResult(text="", citations=[], had_hits=False)

    chunks_with_doc, score_by_id = retrieval
    answer_text, used = synthesize(
        question, chunks_with_doc, api_key=api_key, model=model, dry_run=dry_run
    )
    citations = _format_citations(answer_text, used, chunks_with_doc, score_by_id)
    return NotebookResult(text=answer_text, citations=citations, had_hits=True)


from dataclasses import dataclass as _dataclass


@_dataclass
class NotebookAgent:
    """Wrapper around answer() with mini-ReAct retry on empty retrieval.
    Called by OrchestratorAgent as a tool."""
    store: "MetaStore"
    vector: "VectorStore"
    embedder: "Embedder"
    api_key: str | None
    model: str
    user_id: str | None = None
    reranker: "Reranker | None" = None

    def run(
        self,
        question: str,
        *,
        doc_ids: list[str] | None = None,
        dry_run: bool = False,
    ) -> NotebookResult:
        result = answer(
            question,
            store=self.store,
            vector=self.vector,
            embedder=self.embedder,
            api_key=self.api_key,
            model=self.model,
            dry_run=dry_run,
            user_id=self.user_id,
            doc_ids=doc_ids,
            reranker=self.reranker,
        )
        if result.had_hits:
            return result

        # Mini-ReAct: rephrase query in English and retry once
        rephrased = f"{question} astronomy"
        return answer(
            rephrased,
            store=self.store,
            vector=self.vector,
            embedder=self.embedder,
            api_key=self.api_key,
            model=self.model,
            dry_run=dry_run,
            user_id=self.user_id,
            doc_ids=doc_ids,
            reranker=self.reranker,
        )
