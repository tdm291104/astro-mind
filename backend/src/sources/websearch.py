import httpx

TAVILY_URL = "https://api.tavily.com/search"


def build_web_params(
    query: str, api_key: str, *, max_results: int = 5, days: int | None = None
) -> dict:
    """Return the JSON body for a Tavily /search POST (api_key goes in the body)."""
    params: dict = {"api_key": api_key, "query": query, "max_results": max_results}
    if days is not None:
        params["days"] = days
    return params


def parse_web(payload: dict) -> list[dict]:
    """Parse the Tavily search JSON into result dicts."""
    results: list[dict] = []
    for r in payload.get("results", []):
        results.append(
            {
                "title": (r.get("title") or "").strip(),
                "url": r.get("url", ""),
                "content": (r.get("content") or "").strip(),
            }
        )
    return results


def format_web(items: list[dict], query: str) -> str:
    if not items:
        return f"Không tìm thấy kết quả web nào cho: {query}"
    lines = [f'🌐 Web — {len(items)} kết quả cho "{query}":']
    for i, it in enumerate(items, start=1):
        snippet = it["content"][:200].rstrip()
        if len(it["content"]) > 200:
            snippet += "..."
        lines.append(f"\n[{i}] {it['title']}\n    🔗 {it['url']}\n    {snippet}")
    return "\n".join(lines)


def fetch_web(
    query: str, api_key: str, *, max_results: int = 5, days: int | None = None, timeout: float = 15.0
) -> list[dict]:
    """POST to Tavily + parse. Raises on network/HTTP error. SMOKE-ONLY (real network)."""
    resp = httpx.post(
        TAVILY_URL,
        json=build_web_params(query, api_key, max_results=max_results, days=days),
        timeout=timeout,
    )
    resp.raise_for_status()
    return parse_web(resp.json())


def get_web(
    query: str, api_key: str, *, max_results: int = 5, days: int | None = None, dry_run: bool = False
) -> str:
    """Return a formatted web result list. In dry_run, returns a deterministic echo."""
    if dry_run:
        return f"[dry-run web] query={query}"
    return format_web(fetch_web(query, api_key, max_results=max_results, days=days), query)


def get_web_structured(
    query: str, api_key: str, *, max_results: int = 5, days: int | None = None, dry_run: bool = False
) -> tuple[str, list[dict]]:
    """Return (formatted_text, structured_results) so callers can surface links."""
    if dry_run:
        return f"[dry-run web] query={query}", []
    items = fetch_web(query, api_key, max_results=max_results, days=days)
    return format_web(items, query), items
