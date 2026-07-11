import re
from pathlib import Path

import pymupdf
from astropy.io import fits
from docx import Document as DocxDocument

from core.models import SourceBlock

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")  # markdown ATX headings


def parse_text(path: Path) -> list[SourceBlock]:
    """Parse a .txt/.md file into SourceBlocks.

    Markdown ATX headings ("# Title" … "###### Title") split the text into
    sections, mirroring parse_docx: content before the first heading is labeled
    "(Mở đầu)", each heading starts a new section (its text), the heading line is
    kept as the block's first line so heading words stay searchable, and a
    heading with no body under it is skipped. A file with no ATX headings becomes
    a single "(toàn văn)" block. Setext (underline) headings are not recognized.
    Blank-line paragraph breaks within a section are preserved (so the chunker can
    split large sections into multiple chunks); only the section's leading/trailing
    whitespace is trimmed.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Text file not found: {path}")
    if path.suffix.lower() not in (".txt", ".md"):
        raise ValueError(f"Not a .txt/.md file: {path}")

    text = path.read_text(encoding="utf-8-sig")
    lines = text.splitlines()

    if not any(_HEADING_RE.match(line) for line in lines):
        content = text.strip()
        return [SourceBlock(text=content, section="(toàn văn)")] if content else []

    blocks: list[SourceBlock] = []
    current_section = "(Mở đầu)"
    heading_line: str | None = None
    body: list[str] = []

    def flush() -> None:
        content = "\n".join(body).strip()
        if not content:
            return
        full = f"{heading_line}\n\n{content}" if heading_line else content
        blocks.append(SourceBlock(text=full, page=None, section=current_section))

    for line in lines:
        m = _HEADING_RE.match(line)
        if m:
            flush()
            current_section = m.group(2).strip()
            heading_line = current_section
            body = []
        else:
            body.append(line)
    flush()
    return blocks


def parse_pdf(path: Path) -> list[SourceBlock]:
    """Return a SourceBlock per page (1-based page number, extracted text)."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")
    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Not a PDF: {path}")

    blocks: list[SourceBlock] = []
    with pymupdf.open(path) as doc:
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text") or ""
            blocks.append(SourceBlock(text=text, page=i))
    return blocks


def parse_docx(path: Path) -> list[SourceBlock]:
    """Parse a .docx into SourceBlocks, one per heading section.

    Each block is labeled by the nearest preceding heading (any level). Content
    before the first heading is labeled "(Mở đầu)". The heading line is kept as
    the first line of its block's text so heading words remain searchable. A
    heading with no body text under it is skipped. Tables, images, and footnotes
    are ignored.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"DOCX not found: {path}")
    if path.suffix.lower() != ".docx":
        raise ValueError(f"Not a DOCX: {path}")

    doc = DocxDocument(str(path))
    blocks: list[SourceBlock] = []
    current_section = "(Mở đầu)"
    heading_line: str | None = None
    body: list[str] = []

    # NB: python-docx paragraphs are already discrete units, so each is stripped
    # and stored as its own paragraph (joined with "\n\n"). This intentionally
    # differs from parse_text, which preserves raw lines to keep blank-line breaks.
    def flush() -> None:
        if not body:
            return
        parts = ([heading_line] if heading_line else []) + body
        blocks.append(
            SourceBlock(text="\n\n".join(parts), page=None, section=current_section)
        )

    for para in doc.paragraphs:
        text = para.text.strip()
        style_name = (para.style.name if para.style is not None else "") or ""
        if style_name.startswith("Heading"):
            flush()
            current_section = text or "(Mở đầu)"
            heading_line = text or None
            body = []
        elif text:
            body.append(text)
    flush()
    return blocks


def _data_summary(hdu) -> str | None:
    """One-line description of an HDU's data, from the header (never loads the array)."""
    if isinstance(hdu, (fits.BinTableHDU, fits.TableHDU)):
        nrows = hdu.header.get("NAXIS2", 0)
        ncols = hdu.header.get("TFIELDS", 0)
        return f"Table data: {nrows} rows, {ncols} columns"
    naxis = hdu.header.get("NAXIS", 0)
    if naxis and naxis > 0:
        dims = [str(hdu.header[f"NAXIS{j}"]) for j in range(naxis, 0, -1)]
        return f"Image data: {'x'.join(dims)}"
    return None


def _format_card(card) -> str | None:
    kw = card.keyword
    if kw in ("", "END"):
        return None
    if kw in ("COMMENT", "HISTORY"):
        return f"{kw}: {card.value}"
    line = f"{kw} = {card.value}"
    if card.comment:
        line += f"  / {card.comment}"
    return line


def parse_fits(path: Path) -> list[SourceBlock]:
    """Parse a .fits file into SourceBlocks, one per HDU (header text + data summary).

    Each block is labeled `HDU {i} ({name})` via the section locator. The header
    cards are the searchable text; the binary data array is not indexed (only a
    one-line shape/row summary derived from the header).
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"FITS not found: {path}")
    if path.suffix.lower() != ".fits":
        raise ValueError(f"Not a FITS file: {path}")

    blocks: list[SourceBlock] = []
    with fits.open(path) as hdul:
        for i, hdu in enumerate(hdul):
            name = hdu.name or "PRIMARY"
            section = f"HDU {i} ({name})"
            lines = [section]
            for card in hdu.header.cards:
                formatted = _format_card(card)
                if formatted is not None:
                    lines.append(formatted)
            summary = _data_summary(hdu)
            if summary:
                lines.append(summary)
            blocks.append(SourceBlock(text="\n".join(lines), page=None, section=section))
    return blocks
