from dataclasses import dataclass
from pathlib import Path

from core.models import Document, SourceBlock
from persistence.embed import Embedder
from persistence.store import MetaStore
from persistence.vector import VectorStore

from .chunker import chunk_blocks
from .parser import parse_docx, parse_fits, parse_pdf, parse_text

PARSERS = {
    ".pdf": (parse_pdf, "pdf"),
    ".docx": (parse_docx, "docx"),
    ".fits": (parse_fits, "fits"),
    ".txt": (parse_text, "text"),
    ".md": (parse_text, "text"),
}
SUPPORTED_EXTS = ", ".join(sorted(PARSERS))
UNIT_LABEL = {
    "pdf": "pages", "docx": "sections", "fits": "HDUs",
    "text": "sections", "url": "sections",
}


class IngestError(Exception):
    """Unsupported type, unparseable source, or no extractable text."""


@dataclass
class IngestResult:
    doc_id: str
    name: str
    type: str
    page_count: int
    chunk_count: int


def parse_file(path: Path) -> list[SourceBlock]:
    """Parse a local file by suffix. Raises IngestError on an unsupported suffix
    or a parse failure."""
    suffix = path.suffix.lower()
    if suffix not in PARSERS:
        raise IngestError(f"Unsupported file type (expected {SUPPORTED_EXTS}): {path.name}")
    parse, _ = PARSERS[suffix]
    try:
        return parse(path)
    except Exception as e:  # noqa: BLE001
        raise IngestError(f"Cannot parse {path.name}: {e}") from e


def persist_document(
    doc: Document, blocks: list[SourceBlock], *,
    store: MetaStore, vector: VectorStore, embedder: Embedder,
) -> IngestResult:
    """Chunk -> embed -> persist (store + vector). Raises IngestError if no text.

    Sets ``doc.page_count = len(blocks)`` before persisting, so the stored
    Document carries the correct count (the returned IngestResult mirrors it).
    """
    chunks = chunk_blocks(blocks, doc_id=doc.id)
    if not chunks:
        raise IngestError("Source has no extractable text.")
    doc.page_count = len(blocks)
    embeddings = embedder.embed_batch([c.content for c in chunks])
    store.insert_document(doc)
    store.insert_chunks(chunks)
    vector.upsert(chunks, embeddings, doc_name=doc.name, user_id=doc.user_id)
    return IngestResult(doc.id, doc.name, doc.type, len(blocks), len(chunks))
