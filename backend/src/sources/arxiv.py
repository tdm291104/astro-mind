import feedparser
import httpx

ARXIV_URL = "http://export.arxiv.org/api/query"


def build_arxiv_params(query: str, *, max_results: int = 5, sort_by: str = "submittedDate") -> dict:
    return {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": max_results,
        "sortBy": sort_by,
        "sortOrder": "descending",
    }


def parse_arxiv(feed_text: str) -> list[dict]:
    """Parse arXiv Atom XML into paper dicts (title, authors, summary, published, link, categories)."""
    parsed = feedparser.parse(feed_text)
    papers: list[dict] = []
    for entry in parsed.entries:
        authors = ", ".join(a.get("name", "") for a in entry.get("authors", []))
        categories = [t.get("term", "") for t in entry.get("tags", [])]
        papers.append(
            {
                "title": entry.get("title", "").strip(),
                "authors": authors,
                "summary": entry.get("summary", "").strip(),
                "published": entry.get("published", ""),
                "link": entry.get("link", ""),
                "categories": categories,
            }
        )
    return papers


def format_arxiv(papers: list[dict], query: str) -> str:
    if not papers:
        return f"Không tìm thấy paper nào trên arXiv cho: {query}"
    lines = [f'📄 arXiv — {len(papers)} kết quả cho "{query}":']
    for i, p in enumerate(papers, start=1):
        summary = p["summary"][:200].rstrip()
        if len(p["summary"]) > 200:
            summary += "..."
        lines.append(
            f"\n[{i}] {p['title']}\n"
            f"    👥 {p['authors']}\n"
            f"    📅 {p['published'][:10]}\n"
            f"    🔗 {p['link']}\n"
            f"    {summary}"
        )
    return "\n".join(lines)


def fetch_arxiv(
    query: str, *, max_results: int = 5, timeout: float = 15.0, sort_by: str = "submittedDate"
) -> list[dict]:
    """GET + parse arXiv results. Raises on network/HTTP error."""
    resp = httpx.get(
        ARXIV_URL,
        params=build_arxiv_params(query, max_results=max_results, sort_by=sort_by),
        timeout=timeout,
        follow_redirects=True,  # arXiv 301-redirects http:// → https://
    )
    resp.raise_for_status()
    return parse_arxiv(resp.text)


def get_arxiv(query: str, *, max_results: int = 5, dry_run: bool = False, sort_by: str = "submittedDate") -> str:
    """Return a formatted arXiv result list. In dry_run, returns a deterministic echo."""
    if dry_run:
        return f"[dry-run arXiv] query={query}"
    return format_arxiv(fetch_arxiv(query, max_results=max_results, sort_by=sort_by), query)


def build_count_params(keyword: str, year: int) -> dict:
    return {
        "search_query": f'all:"{keyword}" AND submittedDate:[{year}01010000 TO {year}12312359]',
        "start": 0,
        "max_results": 1,
    }


def parse_count(feed_text: str) -> int:
    """Read the arXiv opensearch totalResults count from an Atom feed."""
    parsed = feedparser.parse(feed_text)
    return int(parsed.feed.get("opensearch_totalresults", 0))


def fetch_count(keyword: str, year: int, *, timeout: float = 15.0) -> int:
    """GET the arXiv result count for a keyword in a year. SMOKE-ONLY (real network)."""
    resp = httpx.get(
        ARXIV_URL,
        params=build_count_params(keyword, year),
        timeout=timeout,
        follow_redirects=True,  # arXiv 301-redirects http → https
    )
    resp.raise_for_status()
    return parse_count(resp.text)
