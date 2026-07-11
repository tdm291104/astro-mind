import httpx

SERPAPI_URL = "https://serpapi.com/search"


def build_trends_params(keywords: list[str], api_key: str) -> dict:
    return {
        "engine": "google_trends",
        "q": ",".join(keywords),
        "data_type": "TIMESERIES",
        "date": "today 12-m",
        "api_key": api_key,
    }


def parse_trends(payload: dict) -> list[dict]:
    """Aggregate SerpAPI google_trends TIMESERIES into per-keyword avg/peak rows."""
    points = payload.get("interest_over_time", {}).get("timeline_data", [])
    series: dict[str, list[tuple[int, str]]] = {}
    for p in points:
        date = p.get("date", "")
        for v in p.get("values", []):
            series.setdefault(v.get("query", ""), []).append((v.get("extracted_value", 0), date))
    rows: list[dict] = []
    for keyword, vals in series.items():
        values = [ev for ev, _ in vals]
        avg = round(sum(values) / len(values), 1) if values else 0
        peak, peak_date = max(vals, key=lambda t: t[0]) if vals else (0, "")
        rows.append({"keyword": keyword, "avg": avg, "peak": peak, "peak_date": peak_date})
    return sorted(rows, key=lambda r: r["avg"], reverse=True)


def parse_series(payload: dict) -> dict[str, list[int]]:
    """Per-keyword weekly interest values from the TIMESERIES payload."""
    points = payload.get("interest_over_time", {}).get("timeline_data", [])
    series: dict[str, list[int]] = {}
    for p in points:
        for v in p.get("values", []):
            series.setdefault(v.get("query", ""), []).append(v.get("extracted_value", 0))
    return series


def fetch_trends(keywords: list[str], api_key: str, *, timeout: float = 30.0) -> dict:
    """GET the SerpAPI google_trends payload. SMOKE-ONLY (real network)."""
    resp = httpx.get(SERPAPI_URL, params=build_trends_params(keywords, api_key), timeout=timeout)
    resp.raise_for_status()
    return resp.json()
