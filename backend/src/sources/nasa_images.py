import httpx
from urllib.parse import quote

IMAGES_URL = "https://images-api.nasa.gov/search"


def build_images_params(query: str, *, max_results: int = 5) -> dict:
    return {"q": query, "media_type": "image", "page_size": max_results}


def parse_images(payload: dict) -> list[dict]:
    """Parse the NASA Image Library search JSON into result dicts."""
    items = payload.get("collection", {}).get("items", [])
    results: list[dict] = []
    for item in items:
        # "data" may be absent, None, or [] → sentinel keeps [0] safe
        data = (item.get("data") or [{}])[0]
        links = item.get("links") or []
        # prefer the "preview" link; fall back to the first link
        image = next(
            (lnk.get("href", "") for lnk in links if lnk.get("rel") == "preview"),
            links[0].get("href", "") if links else "",
        )
        results.append(
            {
                "title": (data.get("title") or "").strip(),
                "center": data.get("center", ""),
                "date": (data.get("date_created") or "")[:10],
                "description": (data.get("description") or "").strip(),
                "nasa_id": data.get("nasa_id", ""),
                "image": image,
            }
        )
    return results


def format_images(items: list[dict], query: str) -> str:
    if not items:
        return f"Không tìm thấy ảnh nào trong NASA Image Library cho: {query}"
    lines = [f'NASA Image Library — {len(items)} kết quả cho "{query}":']
    for i, it in enumerate(items, start=1):
        desc = it["description"][:200].rstrip()
        if len(it["description"]) > 200:
            desc += "..."
        safe_url = quote(it["image"], safe=":/?=&%#@!$,;~+")
        lines.append(
            f"\n[{i}] {it['title']}\n"
            f"    {it['center']}    {it['date']}\n"
            f"    ![{it['title']}]({safe_url})\n"
            f"    {desc}"
        )
    return "\n".join(lines)


def fetch_images(query: str, *, max_results: int = 5, timeout: float = 15.0) -> list[dict]:
    """GET + parse NASA Image Library results. Raises on network/HTTP error."""
    resp = httpx.get(
        IMAGES_URL,
        params=build_images_params(query, max_results=max_results),
        timeout=timeout,
        follow_redirects=True,
    )
    resp.raise_for_status()
    return parse_images(resp.json())[:max_results]


def get_images(query: str, *, max_results: int = 5, dry_run: bool = False) -> str:
    """Return a formatted image result list. In dry_run, returns a deterministic echo."""
    if dry_run:
        return f"[dry-run NASA Images] query={query}"
    return format_images(fetch_images(query, max_results=max_results), query)
