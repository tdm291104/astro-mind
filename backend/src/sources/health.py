import time
from collections.abc import Callable

from core.config import Settings
from sources.apod import fetch_apod
from sources.arxiv import fetch_arxiv
from sources.nasa_images import fetch_images
from sources.websearch import fetch_web


def _probe(key: str, settings: Settings) -> Callable[[], object]:
    """Return a zero-arg callable that pings the source. Raises KeyError for unknown keys."""
    probes: dict[str, Callable[[], object]] = {
        "apod": lambda: fetch_apod(settings.nasa_api_key, None),
        "arxiv": lambda: fetch_arxiv("test", max_results=1),
        "images": lambda: fetch_images("moon", max_results=1),
        "web": lambda: fetch_web("astronomy", settings.tavily_api_key, max_results=1),
    }
    return probes[key]


def check_source(key: str, settings: Settings, *, dry_run: bool = False) -> tuple[str, int]:
    """Ping the source's fetcher with a minimal query. Returns (status, latency_ms):
    ('ok', ms) on success, ('error', ms) on any exception, ('ok', 0) on dry_run.
    Raises KeyError for an unknown key (validated even on dry_run)."""
    probe = _probe(key, settings)
    if dry_run:
        return ("ok", 0)
    start = time.perf_counter()
    try:
        probe()
        status = "ok"
    except Exception:  # any failure means the source is unreachable
        status = "error"
    return (status, int((time.perf_counter() - start) * 1000))
