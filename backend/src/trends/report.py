from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path

from agents import llm
from sources.arxiv import fetch_count

from .exoplanets import fetch_timeline, parse_timeline, parse_timeline_by_method
from .googletrends import fetch_trends, parse_series, parse_trends

KEYWORDS = [
    "exoplanets", "black holes", "James Webb", "dark matter",
    "gravitational waves", "neutron stars", "fast radio bursts",
]

TREND_SYSTEM_PROMPT = (
    "Bạn là nhà phân tích xu hướng thiên văn học. Không dùng emoji. "
    "Dựa trên số lượng paper arXiv theo từng chủ đề trong hai năm, phân tích bằng tiếng Việt: "
    "chủ đề nào đang nổi bật, xu hướng tăng giảm như thế nào, lý do có thể là gì, kèm số liệu cụ thể. "
    "Viết thành đoạn văn mạch lạc, không dùng bullet point thừa."
)

EXOPLANET_START_YEAR = 2010

TIMELINE_SYSTEM_PROMPT = (
    "Bạn là nhà phân tích thiên văn học. Không dùng emoji. "
    "Dựa trên số ngoại hành tinh được phát hiện mỗi năm, phân tích bằng tiếng Việt: "
    "xu hướng phát hiện theo thời gian, các năm đột biến gắn với sứ mệnh (Kepler/TESS/JWST), "
    "tác động của từng sứ mệnh không gian, kèm số liệu cụ thể."
)

PUBLIC_INTEREST_KEYWORDS = ["solar eclipse", "meteor shower", "James Webb", "black hole", "aurora"]

INTEREST_SYSTEM_PROMPT = (
    "Bạn là nhà phân tích xu hướng truyền thông khoa học. Không dùng emoji. "
    "Dựa trên mức quan tâm của công chúng (Google Trends) với từng chủ đề thiên văn trong 12 tháng, "
    "phân tích bằng tiếng Việt: chủ đề nào được quan tâm nhiều nhất, các đỉnh quan tâm gắn với "
    "sự kiện thiên văn cụ thể nào, khoảng cách giữa quan tâm học thuật và đại chúng, kèm số liệu."
)

_INTEREST_MISSING_KEY = (
    "Mức quan tâm công chúng (Google Trends):\n  (cần SERPAPI_API_KEY để hiển thị)"
)


def two_full_years(current_year: int) -> tuple[int, int]:
    """The two most recent COMPLETE years (prev, recent) relative to current_year."""
    return current_year - 2, current_year - 1


def topic_row(keyword: str, prev: int, recent: int) -> dict:
    """A topic's two-year counts + growth percent (None when prev is 0)."""
    growth = round((recent - prev) / prev * 100, 1) if prev else None
    return {"keyword": keyword, "prev": prev, "recent": recent, "growth": growth}


def format_topics(rows: list[dict], prev_year: int, recent_year: int) -> str:
    ordered = sorted(rows, key=lambda r: r["recent"], reverse=True)
    lines = [f"Chủ đề nóng (arXiv, {prev_year} → {recent_year}):"]
    for i, r in enumerate(ordered, start=1):
        g = "n/a" if r["growth"] is None else f"{r['growth']:+.1f}%"
        lines.append(f"[{i}] {r['keyword']}: {r['prev']} → {r['recent']} ({g})")
    return "\n".join(lines)


def build_trend_prompt(rows: list[dict], prev_year: int, recent_year: int) -> list[llm.Message]:
    return [
        {"role": "system", "content": TREND_SYSTEM_PROMPT},
        {"role": "user", "content": format_topics(rows, prev_year, recent_year)},
    ]


def _fetch_count_safe(keyword: str, year: int, timeout: float = 8.0) -> int:
    """fetch_count that returns 0 on any network/timeout error instead of raising."""
    try:
        return fetch_count(keyword, year, timeout=timeout)
    except Exception:
        return 0


def collect_topic_counts(
    keywords: list[str], prev_year: int, recent_year: int,
) -> list[dict]:
    """Fetch arXiv counts for each keyword across both years in parallel.

    Uses a thread pool so all keyword+year pairs run concurrently. Individual
    failures return 0 and don't abort the rest. Max 4 workers to be polite to
    the arXiv API.
    """
    pairs = [(kw, prev_year) for kw in keywords] + [(kw, recent_year) for kw in keywords]
    counts: dict[tuple[str, int], int] = {}

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(_fetch_count_safe, kw, yr): (kw, yr) for kw, yr in pairs}
        for fut in as_completed(futures):
            key = futures[fut]
            try:
                counts[key] = fut.result()
            except Exception:
                counts[key] = 0

    return [
        topic_row(kw, counts.get((kw, prev_year), 0), counts.get((kw, recent_year), 0))
        for kw in keywords
    ]


def analyze_trends(
    rows: list[dict], prev_year: int, recent_year: int, *, api_key: str | None,
    model: str, dry_run: bool = False,
) -> str:
    if dry_run:
        return "[dry-run trends analysis]"
    return llm.complete(
        build_trend_prompt(rows, prev_year, recent_year),
        api_key=api_key, model=model, temperature=0.3,
    )


def format_timeline(rows: list[dict]) -> str:
    lines = ["Dòng thời gian phát hiện exoplanet (theo năm):"]
    for r in rows:
        lines.append(f"  {r['year']}: {r['count']}")
    return "\n".join(lines)


def build_timeline_prompt(rows: list[dict]) -> list[llm.Message]:
    return [
        {"role": "system", "content": TIMELINE_SYSTEM_PROMPT},
        {"role": "user", "content": format_timeline(rows)},
    ]


def analyze_timeline(
    rows: list[dict], *, api_key: str | None, model: str, dry_run: bool = False
) -> str:
    if dry_run:
        return "[dry-run timeline analysis]"
    return llm.complete(
        build_timeline_prompt(rows), api_key=api_key, model=model, temperature=0.3
    )


def format_interest(rows: list[dict]) -> str:
    lines = ["Mức quan tâm công chúng (Google Trends, 12 tháng):"]
    for r in rows:
        lines.append(f"  {r['keyword']}: TB {r['avg']}, đỉnh {r['peak']} ({r['peak_date']})")
    return "\n".join(lines)


def build_interest_prompt(rows: list[dict]) -> list[llm.Message]:
    return [
        {"role": "system", "content": INTEREST_SYSTEM_PROMPT},
        {"role": "user", "content": format_interest(rows)},
    ]


def analyze_interest(
    rows: list[dict], *, api_key: str | None, model: str, dry_run: bool = False
) -> str:
    if dry_run:
        return "[dry-run interest analysis]"
    return llm.complete(
        build_interest_prompt(rows), api_key=api_key, model=model, temperature=0.3
    )


def public_interest_data(
    *, serpapi_api_key: str, api_key: str | None, model: str
) -> tuple[str, dict]:
    """Return (section_text, weekly series). No key → (note, {}). SMOKE-ONLY when key present."""
    if not serpapi_api_key:
        return _INTEREST_MISSING_KEY, {}
    payload = fetch_trends(PUBLIC_INTEREST_KEYWORDS, serpapi_api_key)
    rows = parse_trends(payload)
    series = parse_series(payload)
    text = f"{format_interest(rows)}\n\n{analyze_interest(rows, api_key=api_key, model=model)}"
    return text, series


@dataclass
class TrendReport:
    prev_year: int
    recent_year: int
    topic_rows: list[dict]
    topics_analysis: str
    timeline_rows: list[dict]
    timeline_analysis: str
    interest_section: str
    interest_series: dict = field(default_factory=dict)
    timeline_by_method: dict = field(default_factory=dict)


def build_report(
    *, api_key: str | None, model: str, prev_year: int, recent_year: int,
    keywords: list[str] = KEYWORDS, serpapi_api_key: str = "",
) -> TrendReport:
    """Collect every section's data + analysis once. SMOKE-ONLY (network + Claude)."""
    topic_rows = collect_topic_counts(keywords, prev_year, recent_year)
    topics_analysis = analyze_trends(
        topic_rows, prev_year, recent_year, api_key=api_key, model=model
    )
    try:
        timeline_payload = fetch_timeline(EXOPLANET_START_YEAR, recent_year, timeout=15.0)
    except Exception:
        timeline_payload = []
    timeline_rows = parse_timeline(timeline_payload)
    timeline_analysis = analyze_timeline(timeline_rows, api_key=api_key, model=model)
    timeline_by_method = parse_timeline_by_method(timeline_payload)
    interest_section, interest_series = public_interest_data(
        serpapi_api_key=serpapi_api_key, api_key=api_key, model=model
    )
    return TrendReport(
        prev_year, recent_year, topic_rows, topics_analysis,
        timeline_rows, timeline_analysis, interest_section, interest_series,
        timeline_by_method,
    )


def render_text(report: TrendReport) -> str:
    """Render the structured report to text (matches get_trends's non-dry output)."""
    topics = format_topics(report.topic_rows, report.prev_year, report.recent_year)
    timeline = format_timeline(report.timeline_rows)
    return (
        f"{topics}\n\n{report.topics_analysis}\n\n"
        f"{timeline}\n\n{report.timeline_analysis}\n\n{report.interest_section}"
    )


def report_dict(report: TrendReport) -> dict:
    """Serialize a TrendReport into the structured /trends JSON shape."""
    return {
        "prev_year": report.prev_year,
        "recent_year": report.recent_year,
        "topics": {"rows": report.topic_rows, "analysis": report.topics_analysis},
        "timeline": {
            "rows": report.timeline_rows,
            "by_method": report.timeline_by_method,
            "analysis": report.timeline_analysis,
        },
        "interest": {"series": report.interest_series, "text": report.interest_section},
    }


def export_report(report: TrendReport, out_dir) -> Path:
    """Write report.md + charts into out_dir; return the md path."""
    from .charts import bubble_chart, line_chart, stacked_area_chart  # lazy: matplotlib on export

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    bubble_chart(report.topic_rows, out_dir / "topics.png")
    if report.timeline_by_method.get("years"):
        stacked_area_chart(report.timeline_by_method, out_dir / "timeline.png")
    charts_md = (
        "## Biểu đồ\n\n"
        "![Chủ đề nóng arXiv](topics.png)\n\n"
        "![Dòng thời gian phát hiện exoplanet](timeline.png)\n"
    )
    if report.interest_series:
        line_chart(report.interest_series, out_dir / "interest.png")
        charts_md += "\n![Mức quan tâm công chúng](interest.png)\n"
    md_path = out_dir / "report.md"
    md_path.write_text(f"{render_text(report)}\n\n{charts_md}", encoding="utf-8")
    return md_path


def get_trends(
    *, api_key: str | None, model: str, prev_year: int, recent_year: int,
    keywords: list[str] = KEYWORDS, serpapi_api_key: str = "", dry_run: bool = False,
) -> str:
    """Build the Trend Report (hot-topics + exoplanet timeline + public interest)."""
    if dry_run:
        return (
            f"[dry-run trends] {prev_year}-{recent_year} keywords={len(keywords)} "
            f"+ exoplanet timeline {EXOPLANET_START_YEAR}-{recent_year} "
            f"+ public interest {len(PUBLIC_INTEREST_KEYWORDS)} keywords"
        )
    return render_text(build_report(
        api_key=api_key, model=model, prev_year=prev_year, recent_year=recent_year,
        keywords=keywords, serpapi_api_key=serpapi_api_key,
    ))
