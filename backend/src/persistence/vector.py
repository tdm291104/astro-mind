from pathlib import Path

import chromadb
import numpy as np

from core.models import Chunk

COLLECTION_NAME = "astromind_chunks"


class VectorStore:
    def __init__(self, persist_dir: Path):
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=str(self.persist_dir))
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert(
        self,
        chunks: list[Chunk],
        embeddings: np.ndarray,
        *,
        doc_name: str,
        user_id: str | None = None,
    ) -> None:
        if not chunks:
            return
        ids = [c.id for c in chunks]
        metadatas = []
        for c in chunks:
            meta = {
                "doc_id": c.doc_id,
                "doc_name": doc_name,
                "page": c.page_number,
                "chunk_index": c.chunk_index,
                "section": c.section_title,
                "chunk_type": c.chunk_type,
                "user_id": user_id,
            }
            metadatas.append({k: v for k, v in meta.items() if v is not None})
        self._collection.upsert(
            ids=ids,
            embeddings=embeddings.tolist(),
            metadatas=metadatas,
        )

    def query(
        self,
        embedding: np.ndarray,
        *,
        top_k: int = 5,
        where: dict | None = None,
    ) -> list[tuple[str, float, dict]]:
        if self._collection.count() == 0:
            return []
        res = self._collection.query(
            query_embeddings=[embedding.tolist()],
            n_results=top_k,
            where=where if where else None,
        )
        out: list[tuple[str, float, dict]] = []
        for id_, dist, meta in zip(
            res["ids"][0], res["distances"][0], res["metadatas"][0], strict=True
        ):
            relevance = 1.0 - float(dist)
            out.append((id_, relevance, meta))
        return out

    def delete_by_doc(self, doc_id: str) -> int:
        """Delete all chunks belonging to a document. Returns number of chunks deleted."""
        got = self._collection.get(where={"doc_id": doc_id})
        ids = got["ids"]
        if not ids:
            return 0
        self._collection.delete(ids=ids)
        return len(ids)

    def set_doc_user(self, doc_id: str, user_id: str) -> int:
        """Set user_id on all stored chunks of a doc (backfilling legacy anonymous docs).
        Merges into existing metadata so doc_name/page/section are preserved.
        Returns the number of chunks updated."""
        got = self._collection.get(where={"doc_id": doc_id})
        ids = got["ids"]
        if not ids:
            return 0
        metas = got["metadatas"] or [{} for _ in ids]
        new_metas = [{**(m or {}), "user_id": user_id} for m in metas]
        self._collection.update(ids=ids, metadatas=new_metas)
        return len(ids)
