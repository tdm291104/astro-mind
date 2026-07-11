import asyncio
import json
from dataclasses import dataclass, field
from urllib.parse import quote

import anthropic

from sources.apod import fetch_apod, format_apod
from sources.arxiv import fetch_arxiv, format_arxiv
from sources.nasa_images import fetch_images
from sources.websearch import fetch_web, format_web

_HAIKU = "claude-haiku-4-5-20251001"
_THRESHOLD = 5  # 0-10; candidates below this are filtered out


@dataclass
class Candidate:
    source: str   # "arxiv" | "apod" | "images" | "web"
    kind: str     # "text" | "image"
    title: str
    summary: str  # truncated text used for relevance scoring
    url: str
    raw: dict     # original API dict, preserved for formatting
    score: float = 0.0


@dataclass
class SearchResult:
    text: str
    arxiv_papers: list[dict] = field(default_factory=list)
    web_sources: list[dict] = field(default_factory=list)


# ── per-source candidate fetchers ─────────────────────────────────────────────

async def _arxiv_candidates(query: str, dry_run: bool) -> list[Candidate]:
    if dry_run:
        paper = {"title": f"[dry-run arXiv] {query}", "authors": "", "summary": "...",
                 "published": "2025-01-01", "link": ""}
        return [Candidate("arxiv", "text", paper["title"], paper["summary"], paper["link"], paper)]
    papers = await asyncio.to_thread(fetch_arxiv, query, max_results=8)
    return [
        Candidate("arxiv", "text", p["title"], p["summary"][:200], p["link"], p)
        for p in papers
    ]


async def _apod_candidates(nasa_api_key: str, dry_run: bool) -> list[Candidate]:
    if dry_run:
        raw = {"title": "[dry-run APOD] today", "explanation": "...", "date": "2025-01-01",
               "url": "", "hdurl": ""}
        return [Candidate("apod", "image", raw["title"], raw["explanation"], raw["hdurl"], raw)]
    data = await asyncio.to_thread(fetch_apod, nasa_api_key)
    return [Candidate(
        "apod", "image",
        data.get("title", ""),
        data.get("explanation", "")[:300],
        data.get("hdurl") or data.get("url", ""),
        data,
    )]


async def _images_candidates(query: str, dry_run: bool) -> list[Candidate]:
    if dry_run:
        raw = {"title": f"[dry-run NASA Images] {query}", "description": "...",
               "center": "", "date": "", "nasa_id": "", "image": ""}
        return [Candidate("images", "image", raw["title"], raw["description"], raw["image"], raw)]
    # Fetch more candidates than needed so scoring has a better pool to filter from
    items = await asyncio.to_thread(fetch_images, query, max_results=10)
    return [
        Candidate("images", "image", it["title"], it["description"][:200], it["image"], it)
        for it in items
    ]


_WEB_RECENCY_DAYS_DEFAULT = 90  # default: articles from last 3 months


async def _web_candidates(
    query: str, tavily_key: str, dry_run: bool, days: int | None = _WEB_RECENCY_DAYS_DEFAULT
) -> list[Candidate]:
    if dry_run:
        raw = {"title": f"[dry-run web] {query}", "url": "", "content": "..."}
        return [Candidate("web", "text", raw["title"], raw["content"], raw["url"], raw)]
    items = await asyncio.to_thread(
        fetch_web, query, tavily_key, max_results=8, days=days
    )
    return [
        Candidate("web", "text", it["title"], it["content"][:200], it["url"], it)
        for it in items
    ]


# ── translation ────────────────────────────────────────────────────────────────

def build_translate_request(query: str, *, model: str = _HAIKU) -> dict:
    """Build the Anthropic request params for query translation. Reusable by
    both the live path (_translate_to_english) and batch-eval code."""
    return {
        "model": model,
        "max_tokens": 80,
        "messages": [{
            "role": "user",
            "content": (
                "Translate this astronomy search query to English. "
                "Reply ONLY with the English translation, nothing else.\n"
                f"Query: {query}"
            ),
        }],
    }


def parse_translate_response(raw_text: str, fallback_query: str) -> str:
    """Return the translated text, or fallback_query if the response was empty."""
    translated = raw_text.strip()
    return translated if translated else fallback_query


async def _translate_to_english(query: str, api_key: str) -> str:
    """Translate query to English for better API results. Fails open."""
    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(**build_translate_request(query))
        return parse_translate_response(resp.content[0].text, query)
    except Exception:
        return query


# ── relevance scoring ──────────────────────────────────────────────────────────

def build_score_request(candidates: list[Candidate], query_en: str, *, model: str = _HAIKU) -> dict:
    """Build the Anthropic request params for relevance scoring. Reusable by
    both the live path (_score_relevance) and batch-eval code."""
    entries = "\n".join(
        f"[{i}] {c.title[:100]} | {c.summary[:150]}"
        for i, c in enumerate(candidates)
    )
    prompt = (
        f'Rate each result\'s relevance to: "{query_en}"\n'
        "Score 0–10 (integer): 0–3=irrelevant, 4–6=somewhat relevant, 7–10=directly relevant\n\n"
        f"{entries}\n\n"
        "Reply ONLY with a JSON integer array in the same order, e.g. [8,3,7,...]"
    )
    return {"model": model, "max_tokens": 200, "messages": [{"role": "user", "content": prompt}]}


def parse_score_response(raw_text: str, num_candidates: int) -> list[float]:
    """Parse a relevance-scoring response into one float per candidate,
    falling back to all-5.0 on any parse failure or length mismatch."""
    try:
        raw = raw_text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        scores = json.loads(raw)
        if isinstance(scores, list) and len(scores) == num_candidates:
            return [float(s) for s in scores]
    except Exception:
        pass
    return [5.0] * num_candidates


async def _score_relevance(
    candidates: list[Candidate], query_en: str, api_key: str,
) -> list[float]:
    """One Haiku call to score all candidates 0-10. Fails open (all score 5.0)."""
    if not candidates or not api_key:
        return [5.0] * len(candidates)
    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(**build_score_request(candidates, query_en))
        return parse_score_response(resp.content[0].text, len(candidates))
    except Exception:
        return [5.0] * len(candidates)


# ── post-scoring formatting ────────────────────────────────────────────────────

_SOURCE_ORDER = ["arxiv", "apod", "images", "web"]


def _format_surviving(
    candidates: list[Candidate], query: str,
) -> tuple[str, list[dict], list[dict]]:
    """Group surviving candidates by source (ordered), format, return (text, papers, web)."""
    by_source: dict[str, list[Candidate]] = {}
    for c in candidates:
        by_source.setdefault(c.source, []).append(c)

    parts: list[str] = []
    arxiv_papers: list[dict] = []
    web_sources: list[dict] = []

    for src in _SOURCE_ORDER:
        cands = by_source.get(src)
        if not cands:
            continue

        if src == "arxiv":
            arxiv_papers = [c.raw for c in cands]
            parts.append(f"## arXiv\n{format_arxiv(arxiv_papers, query)}")

        elif src == "apod":
            for c in cands:
                parts.append(f"## NASA APOD\n{format_apod(c.raw)}")

        elif src == "images":
            lines = [f'NASA Image Library — {len(cands)} kết quả cho "{query}":']
            for i, c in enumerate(cands, start=1):
                safe_url = quote(c.url, safe=":/?=&%#@!$,;~+")
                r = c.raw
                lines.append(
                    f"\n[{i}] {c.title}\n"
                    f"    {r.get('center', '')}  {r.get('date', '')}\n"
                    f"    ![{c.title}]({safe_url})\n"
                    f"    {c.summary}"
                )
            parts.append("## NASA Images\n" + "\n".join(lines))

        elif src == "web":
            web_sources = [c.raw for c in cands]
            parts.append(f"## Web\n{format_web(web_sources, query)}")

    if not parts:
        return "Không tìm thấy kết quả phù hợp với câu hỏi.", [], []
    return "\n\n".join(parts), arxiv_papers, web_sources


# ── SearchAgent ────────────────────────────────────────────────────────────────

async def _noop(value: str) -> str:
    return value


@dataclass
class SearchAgent:
    nasa_api_key: str
    tavily_key: str
    api_key: str = ""  # Anthropic key for translation + scoring

    async def run(
        self,
        query: str,
        *,
        sources: list[str] | None = None,
        web_days: int = _WEB_RECENCY_DAYS_DEFAULT,
        dry_run: bool = False,
    ) -> SearchResult:
        """Fan-out → translate + collect in parallel → score → filter → rank → format.

        web_days=0 means no date filter (use for historical queries).
        """
        active = set(sources) if sources else {"arxiv", "apod", "images", "web"}
        effective_web_days: int | None = None if web_days == 0 else web_days

        coros: list = []
        if "arxiv" in active:
            coros.append(_arxiv_candidates(query, dry_run))
        if "apod" in active:
            coros.append(_apod_candidates(self.nasa_api_key, dry_run))
        if "images" in active:
            coros.append(_images_candidates(query, dry_run))
        if "web" in active and self.tavily_key:
            coros.append(_web_candidates(query, self.tavily_key, dry_run, days=effective_web_days))

        if not coros:
            return SearchResult("Không có nguồn tìm kiếm nào khả dụng.")

        # Fan-out sources + translate query in parallel
        translate_coro = (
            _translate_to_english(query, self.api_key)
            if self.api_key and not dry_run
            else _noop(query)
        )
        all_results = await asyncio.gather(translate_coro, *coros, return_exceptions=True)

        query_en: str = all_results[0] if not isinstance(all_results[0], Exception) else query

        candidates: list[Candidate] = []
        for res in all_results[1:]:
            if not isinstance(res, Exception):
                candidates.extend(res)

        if not candidates:
            return SearchResult("Không tìm thấy kết quả từ bất kỳ nguồn nào.")

        # Score relevance (skip in dry-run or without api_key)
        if dry_run or not self.api_key:
            scores: list[float] = [5.0] * len(candidates)
        else:
            scores = await _score_relevance(candidates, query_en, self.api_key)

        for c, s in zip(candidates, scores):
            c.score = s

        # Filter below threshold, then rank by score descending
        filtered = [c for c in candidates if c.score >= _THRESHOLD]
        if not filtered:
            return SearchResult("Không tìm thấy kết quả phù hợp với câu hỏi.")

        filtered.sort(key=lambda c: c.score, reverse=True)

        text, arxiv_papers, web_sources = _format_surviving(filtered, query)
        return SearchResult(text=text, arxiv_papers=arxiv_papers, web_sources=web_sources)
