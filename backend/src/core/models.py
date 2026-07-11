from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from uuid import uuid4


def new_uuid() -> str:
    return uuid4().hex


def _now() -> datetime:
    return datetime.now(UTC)


def locator_label(page: int | None, section: str | None) -> str:
    """Human-readable source locator: section (DOCX/FITS/text/URL) or page (PDF)."""
    if section:
        return f"Mục: {section}"
    if page is not None:
        return f"trang {page}"
    return "(không rõ vị trí)"


@dataclass
class SourceBlock:
    """A unit of parsed text: a PDF page (page set) or a DOCX/FITS/text/URL section
    (section set)."""

    text: str
    page: int | None = None
    section: str | None = None


@dataclass
class Document:
    name: str
    type: str
    file_path: str
    page_count: int
    id: str = field(default_factory=new_uuid)
    created_at: datetime = field(default_factory=_now)
    user_id: str | None = None


@dataclass
class Chunk:
    doc_id: str
    content: str
    page_number: int | None
    chunk_index: int
    token_count: int
    section_title: str | None = None
    chunk_type: str = "text"
    id: str = field(default_factory=new_uuid)


@dataclass
class Citation:
    citation_id: int
    doc_id: str
    doc_name: str
    page: int | None
    excerpt: str
    relevance_score: float
    section: str | None = None
    doc_type: str = "pdf"
    source: str = "chunk"

    def to_dict(self) -> dict:
        return asdict(self)
