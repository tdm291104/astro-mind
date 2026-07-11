from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import httpx

from agent_eval.batch_runner import run_batch_sync
from agent_eval.harness import build_eval_resources, ensure_eval_user, sample_per_group
from agent_eval.metrics import citation_precision_recall
from agent_eval.schema import load_notebook_eval

_RESULTS_PATH = Path(__file__).parent / "results" / "run_notebook_eval.json"
_RESULTS_DIR = Path(__file__).parent / "results"

_PDF_URLS = {
    "gravitational_waves": "https://arxiv.org/pdf/2512.22679",
    "galaxy_morphology": "https://arxiv.org/pdf/2504.00500",
    "exoplanet_detection": "https://arxiv.org/pdf/2509.20310",
}


def _ingest_papers(resources, user_id: str) -> dict[str, str]:
    """Download (if not cached) + ingest the 3 source PDFs through the real
    pipeline. Returns doc_label -> doc_id."""
    from core.models import Document
    from ingestion import pipeline as ingestion

    tmp_dir = Path(__file__).parent / "results" / "_pdfs"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    doc_ids: dict[str, str] = {}
    for label, url in _PDF_URLS.items():
        pdf_path = tmp_dir / f"{label}.pdf"
        if not pdf_path.exists():
            resp = httpx.get(url, timeout=30.0, follow_redirects=True)
            resp.raise_for_status()
            pdf_path.write_bytes(resp.content)

        blocks = ingestion.parse_file(pdf_path)
        doc = Document(
            name=pdf_path.name, type="pdf", file_path=str(pdf_path), page_count=0, user_id=user_id,
        )
        result = ingestion.persist_document(
            doc, blocks, store=resources.store, vector=resources.vector, embedder=resources.embedder,
        )
        doc_ids[label] = result.doc_id
        print(f"Ingested {label} -> doc_id={result.doc_id} ({result.chunk_count} chunks)")
    return doc_ids


def _retrieve_for_items(items, resources, doc_ids: dict[str, str], user_id: str) -> dict:
    """Live retrieval (no LLM call) for each item, with the same mini-ReAct
    rephrase-retry NotebookAgent.run() does on empty retrieval. Returns
    item_id -> (chunks_with_doc, score_by_id), or None if no hits even after
    the retry."""
    from agents.notebook import retrieve_chunks

    retrieval_by_id: dict = {}
    for item in items:
        doc_id = doc_ids[item.doc_label]
        result = retrieve_chunks(
            item.question, store=resources.store, vector=resources.vector, embedder=resources.embedder,
            doc_ids=[doc_id], user_id=user_id, reranker=resources.reranker,
        )
        if result is None:
            # Mirrors NotebookAgent.run()'s mini-ReAct retry in agents/notebook.py — keep in sync if that logic changes.
            result = retrieve_chunks(
                f"{item.question} astronomy", store=resources.store, vector=resources.vector,
                embedder=resources.embedder, doc_ids=[doc_id], user_id=user_id, reranker=resources.reranker,
            )
        retrieval_by_id[item.id] = result
    return retrieval_by_id


def _synthesize_requests(items, retrieval_by_id: dict, model: str) -> list[dict]:
    from agents.synth import build_request

    requests = []
    for item in items:
        retrieval = retrieval_by_id.get(item.id)
        if retrieval is None:
            continue
        chunks_with_doc, _ = retrieval
        requests.append({
            "custom_id": item.id,
            "params": build_request(item.question, chunks_with_doc, model=model),
        })
    return requests


def _extract_raw_texts(batch_results: dict) -> dict[str, str | None]:
    from agents.llm import extract_text

    return {
        custom_id: (extract_text(message) if message is not None else None)
        for custom_id, message in batch_results.items()
    }


def _save_raw_results(raw_texts: dict) -> Path:
    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _RESULTS_DIR / f"run_notebook_eval_raw_{int(time.time())}.json"
    path.write_text(json.dumps(raw_texts, ensure_ascii=False, indent=2))
    return path


def _save_usage(batch_results: dict, model: str) -> Path:
    from agent_eval.instrumentation import extract_usage, usage_record

    usage_by_id = {cid: extract_usage(m) for cid, m in batch_results.items()}
    record = usage_record(call_type="synthesize", model=model, is_batch=True, usage=usage_by_id)
    path = _RESULTS_DIR / f"usage_notebook_{int(time.time())}.json"
    path.write_text(json.dumps({"calls": [record]}, ensure_ascii=False, indent=2))
    return path


def _build_rows(items, retrieval_by_id: dict, raw_texts: dict) -> list[dict]:
    from agents.notebook import _format_citations
    from agents.synth import parse_response

    rows = []
    for item in items:
        retrieval = retrieval_by_id.get(item.id)
        raw_text = raw_texts.get(item.id)
        if retrieval is None or raw_text is None:
            pages, keyword_hit, answer_text = [], False, ""
        else:
            chunks_with_doc, score_by_id = retrieval
            answer_text, used = parse_response(raw_text)
            citations = _format_citations(answer_text, used, chunks_with_doc, score_by_id)
            # NOTE: expected_page is a single ground-truth page, but real papers often
            # repeat a topic across several pages (e.g. GW150914 appears on pp. 6, 24, 27).
            # A correct answer citing a different-but-valid page still scores as a miss
            # below — known dataset limitation, not necessarily an agent bug.
            pages = [c.page for c in citations if c.page is not None]
            keyword_hit = any(item.expected_keyword in (c.excerpt or "") for c in citations)
        rows.append({
            "id": item.id, "doc_label": item.doc_label, "question": item.question,
            "expected_page": item.expected_page, "returned_pages": pages,
            "expected_keyword": item.expected_keyword, "keyword_hit": keyword_hit,
            "answer_text": answer_text,
        })
    return rows


def _run(limit: int | None, use_cached_results: str | None) -> None:
    items = load_notebook_eval()
    items = sample_per_group(items, lambda it: it.doc_label, limit)

    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    doc_ids = _ingest_papers(resources, user_id)
    # Retrieval has no LLM cost — always live, even under --use-cached-results, since citations must be reconstructed either way.
    retrieval_by_id = _retrieve_for_items(items, resources, doc_ids, user_id)

    if use_cached_results:
        raw_texts = json.loads(Path(use_cached_results).read_text())
    else:
        requests = _synthesize_requests(items, retrieval_by_id, resources.settings.anthropic_model_light)
        batch_results = run_batch_sync(requests, api_key=resources.settings.anthropic_api_key)
        raw_texts = _extract_raw_texts(batch_results)
        saved_path = _save_raw_results(raw_texts)
        print(f"Raw batch results saved to: {saved_path}")
        usage_path = _save_usage(batch_results, resources.settings.anthropic_model_light)
        print(f"Usage saved to: {usage_path}")

    rows = _build_rows(items, retrieval_by_id, raw_texts)
    for row in rows:
        print(
            f"{row['id']}: expected_page={row['expected_page']} returned={row['returned_pages']} "
            f"keyword_hit={row['keyword_hit']}"
        )

    expected_pages = [r["expected_page"] for r in rows]
    returned_pages = [r["returned_pages"] for r in rows]
    precision, recall = citation_precision_recall(expected_pages, returned_pages)

    _RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _RESULTS_PATH.write_text(json.dumps(
        {"rows": rows, "citation_precision": precision, "citation_recall": recall},
        ensure_ascii=False, indent=2,
    ))
    print(f"\nCitation Precision: {precision:.2%}  Citation Recall: {recall:.2%}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max questions per doc_label")
    parser.add_argument(
        "--use-cached-results", type=str, default=None,
        help="Path to a previously-saved run_notebook_eval_raw_*.json — recompute metrics without calling the API",
    )
    args = parser.parse_args()
    _run(args.limit, args.use_cached_results)


if __name__ == "__main__":
    main()
