import httpx

APOD_URL = "https://api.nasa.gov/planetary/apod"


def build_apod_params(api_key: str, date: str | None = None) -> dict:
    params = {"api_key": api_key}
    if date:
        params["date"] = date
    return params


def format_apod(data: dict) -> str:
    title = data.get("title", "(không tiêu đề)")
    date = data.get("date", "")
    media_type = data.get("media_type", "image")
    explanation = data.get("explanation", "")
    link = data.get("hdurl") or data.get("url", "")

    lines = [f"🌌 {title} ({date})"]
    if media_type != "image":
        lines.append(f"[media: {media_type}]")
    if explanation:
        lines.append(explanation)
    if link:
        if media_type == "image":
            lines.append(f"![{title}]({link})")
        else:
            lines.append(f"🔗 {link}")
    copyright_ = data.get("copyright")
    if copyright_:
        lines.append(f"© {copyright_.strip()}")
    return "\n".join(lines)


def shape_apod(data: dict) -> dict:
    """Shape the raw NASA APOD JSON into a frontend card."""
    copyright_ = (data.get("copyright") or "").strip()
    return {
        "title": data.get("title", ""),
        "date": data.get("date", ""),
        "explanation": data.get("explanation", ""),
        "image_url": data.get("hdurl") or data.get("url", ""),
        "media_type": data.get("media_type", "image"),
        "copyright": copyright_ or None,
    }


def fetch_apod(api_key: str, date: str | None = None, *, timeout: float = 15.0) -> dict:
    """GET the APOD JSON from the NASA API. Raises on network/HTTP error."""
    resp = httpx.get(APOD_URL, params=build_apod_params(api_key, date), timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def get_apod(api_key: str, *, date: str | None = None, dry_run: bool = False) -> str:
    """Return a formatted APOD card. In dry_run, returns a deterministic echo (no network)."""
    if dry_run:
        return f"[dry-run APOD] date={date or 'today'}"
    return format_apod(fetch_apod(api_key, date))
