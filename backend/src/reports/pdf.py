import os
import sys

if sys.platform == "darwin":
    # Homebrew's pango/cairo/glib dylibs live in /opt/homebrew/lib but aren't on the
    # default dyld search path, so WeasyPrint's cffi bindings fail to dlopen them.
    os.environ.setdefault("DYLD_FALLBACK_LIBRARY_PATH", "/opt/homebrew/lib")

import base64
import html
import io

import markdown as md
from matplotlib import font_manager as fm
from weasyprint import CSS, HTML
from weasyprint.urls import default_url_fetcher

from trends.charts import bubble_chart, line_chart, stacked_area_chart

_REGULAR_FONT = fm.findfont(fm.FontProperties(family="DejaVu Sans", weight="normal"))
_BOLD_FONT = fm.findfont(fm.FontProperties(family="DejaVu Sans", weight="bold"))

_FONT_CSS = f"""
@font-face {{
    font-family: "DejaVu Sans";
    src: url("file://{_REGULAR_FONT}");
    font-weight: normal;
}}
@font-face {{
    font-family: "DejaVu Sans";
    src: url("file://{_BOLD_FONT}");
    font-weight: bold;
}}
body {{
    font-family: "DejaVu Sans", sans-serif;
    font-size: 11px;
    color: #1a1a2e;
    line-height: 1.6;
    padding: 24px 32px;
}}
h1 {{ font-size: 20px; border-bottom: 2px solid #c9a55c; padding-bottom: 8px; margin-bottom: 4px; }}
h2 {{ font-size: 15px; color: #8a6d2f; margin-top: 22px; margin-bottom: 6px; }}
p {{ margin: 6px 0; }}
.meta {{ color: #666; font-size: 10px; margin-bottom: 20px; }}
.chart {{ width: 100%; max-width: 560px; margin: 12px auto; display: block; }}
"""


def _safe_url_fetcher(url, *args, **kwargs):
    """Only allow data: and file: URLs — blocks SSRF via LLM-generated markdown
    that might contain external image links."""
    if not (url.startswith("data:") or url.startswith("file:")):
        raise ValueError(f"Blocked external resource in report PDF: {url}")
    return default_url_fetcher(url, *args, **kwargs)


def _chart_data_uri(chart_fn, data) -> str:
    buf = io.BytesIO()
    chart_fn(data, buf)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def render_report_pdf(title: str, created_at: str, payload: dict) -> bytes:
    """Render a report (title + created_at + payload, same shape as
    persistence.store.MetaStore.get_report()['payload']) to a PDF document."""
    research_text = payload.get("research_text", "")
    body_html = md.markdown(research_text, extensions=["extra"]) if research_text else ""

    charts_html = ""

    topic_rows = payload.get("topics", {}).get("rows", [])
    if topic_rows:
        uri = _chart_data_uri(bubble_chart, topic_rows)
        charts_html += f'<h2>Chủ đề nóng arXiv</h2><img class="chart" src="{uri}" />'
        topics_analysis = payload.get("topics", {}).get("analysis", "")
        if topics_analysis:
            charts_html += f"<p>{html.escape(topics_analysis)}</p>"

    by_method = payload.get("timeline", {}).get("by_method", {})
    if by_method.get("years"):
        uri = _chart_data_uri(stacked_area_chart, by_method)
        charts_html += f'<h2>Phát hiện exoplanet theo phương pháp</h2><img class="chart" src="{uri}" />'

    interest_series = payload.get("interest", {}).get("series", {})
    if interest_series:
        uri = _chart_data_uri(line_chart, interest_series)
        charts_html += f'<h2>Mức quan tâm công chúng (Google Trends)</h2><img class="chart" src="{uri}" />'
        interest_text = payload.get("interest", {}).get("text", "")
        if interest_text:
            charts_html += f"<p>{html.escape(interest_text)}</p>"

    document_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<h1>{html.escape(title)}</h1>
<div class="meta">{html.escape(created_at)}</div>
{body_html}
{charts_html}
</body>
</html>"""

    return HTML(string=document_html, url_fetcher=_safe_url_fetcher).write_pdf(
        stylesheets=[CSS(string=_FONT_CSS)]
    )
