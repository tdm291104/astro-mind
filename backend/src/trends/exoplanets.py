import httpx

TAP_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"


def build_timeline_params(start_year: int, end_year: int) -> dict:
    """Build the TAP ADQL params for exoplanet discoveries per year × method (pscomppars)."""
    query = (
        "SELECT disc_year, discoverymethod, COUNT(*) AS ct FROM pscomppars "
        f"WHERE disc_year >= {start_year} AND disc_year <= {end_year} "
        "GROUP BY disc_year, discoverymethod ORDER BY disc_year"
    )
    return {"query": query, "format": "json"}


def parse_timeline(payload: list) -> list[dict]:
    """Total discoveries per year (summed over methods)."""
    totals: dict[int, int] = {}
    for r in payload:
        y = int(r["disc_year"])
        totals[y] = totals.get(y, 0) + int(r["ct"])
    return [{"year": y, "count": c} for y, c in sorted(totals.items())]


def parse_timeline_by_method(
    payload: list, *, top_n: int = 4, other_label: str = "Khác"
) -> dict:
    """Stacked-area data: top_n methods by total + 'other', counts aligned over years."""
    years = sorted({int(r["disc_year"]) for r in payload})
    by_ym: dict[tuple[int, str], int] = {}
    method_totals: dict[str, int] = {}
    for r in payload:
        y = int(r["disc_year"])
        m = r.get("discoverymethod") or other_label
        c = int(r["ct"])
        by_ym[(y, m)] = by_ym.get((y, m), 0) + c
        method_totals[m] = method_totals.get(m, 0) + c
    # sort by total desc, then method name asc → deterministic on ties
    top = [m for m, _ in sorted(method_totals.items(), key=lambda t: (-t[1], t[0]))[:top_n]]
    labels = [*top, other_label]
    series = {label: [0] * len(years) for label in labels}
    year_index = {y: i for i, y in enumerate(years)}
    for (y, m), c in by_ym.items():
        label = m if m in top else other_label
        series[label][year_index[y]] += c
    if not any(series[other_label]):
        del series[other_label]
    return {"years": years, "series": series}


def fetch_timeline(start_year: int, end_year: int, *, timeout: float = 30.0) -> list:
    """GET the TAP discoveries-by-method payload. SMOKE-ONLY (real network)."""
    resp = httpx.get(TAP_URL, params=build_timeline_params(start_year, end_year), timeout=timeout)
    resp.raise_for_status()
    return resp.json()
