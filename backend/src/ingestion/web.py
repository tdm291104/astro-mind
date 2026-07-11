import httpx
from bs4 import BeautifulSoup

from core.models import SourceBlock

_NOISE = ["script", "style", "nav", "header", "footer", "aside"]
_HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"]
_HEADERS = {"User-Agent": "AstroMind/0.1 (astronomy notebook ingester)"}


def extract_blocks(html: str) -> list[SourceBlock]:
    """Extract SourceBlocks from HTML: headings (h1–h6) become sections.

    Mirrors parse_docx: content before the first heading is "(Mở đầu)", each
    heading starts a new section with its text kept as the block's first line,
    and a heading with no <p>/<li> body under it is skipped. HTML with no
    headings becomes a single "(toàn văn)" block. Noise tags (script/style/nav/
    header/footer/aside) are dropped first. Body extraction targets the common
    article shape (headings + <p>/<li>); content in bare <div>s is not captured.
    Text inside nested <p>/<li> is captured once via the ancestor <li> (not
    double-counted).
    """
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(_NOISE):
        tag.decompose()

    if soup.find(_HEADINGS) is None:
        text = soup.get_text("\n", strip=True)
        return [SourceBlock(text=text, section="(toàn văn)")] if text else []

    blocks: list[SourceBlock] = []
    current_section = "(Mở đầu)"
    heading_line: str | None = None
    body: list[str] = []

    def flush() -> None:
        if not body:
            return
        parts = ([heading_line] if heading_line else []) + body
        blocks.append(SourceBlock(text="\n\n".join(parts), page=None, section=current_section))

    for el in soup.find_all(_HEADINGS + ["p", "li"]):
        if el.name in _HEADINGS:
            flush()
            current_section = el.get_text(strip=True)
            heading_line = current_section
            body = []
        elif el.find_parent("li") is not None:
            continue  # text already captured by the ancestor <li>
        else:
            txt = el.get_text(" ", strip=True)
            if txt:
                body.append(txt)
    flush()
    return blocks


def fetch_html(url: str, *, timeout: float = 15.0) -> str:
    """GET a URL and return its HTML text. Raises on network/HTTP error.

    SMOKE-ONLY: makes a real network request, so it is not exercised by the
    automated test suite (verified via the manual smoke step instead).
    """
    resp = httpx.get(url, follow_redirects=True, timeout=timeout, headers=_HEADERS)
    resp.raise_for_status()
    return resp.text


def parse_url(url: str) -> list[SourceBlock]:
    """Fetch a URL and extract its content as SourceBlocks. SMOKE-ONLY (network)."""
    return extract_blocks(fetch_html(url))
