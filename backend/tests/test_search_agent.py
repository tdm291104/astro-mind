"""Kiểm thử SearchAgent — fan-out tìm kiếm đa nguồn."""
from unittest.mock import AsyncMock, patch

import pytest

from agents.search import (
    Candidate,
    SearchAgent,
    SearchResult,
    _apod_candidates,
    _arxiv_candidates,
    _images_candidates,
    _web_candidates,
)


QUERY = "black holes"


# ── Dataclass field checks ─────────────────────────────────────────────────────

def test_candidate_dataclass():
    c = Candidate(
        source="arxiv",
        kind="text",
        title="On Black Holes",
        summary="A study of black holes.",
        url="https://arxiv.org/abs/1234.5678",
        raw={"title": "On Black Holes"},
        score=8.5,
    )
    assert c.source == "arxiv"
    assert c.kind == "text"
    assert c.title == "On Black Holes"
    assert c.url == "https://arxiv.org/abs/1234.5678"
    assert c.score == 8.5


def test_search_result_dataclass():
    result = SearchResult(text="some text", arxiv_papers=[{"title": "p1"}], web_sources=[{"url": "u"}])
    assert result.text == "some text"
    assert len(result.arxiv_papers) == 1
    assert len(result.web_sources) == 1


def test_search_result_defaults():
    result = SearchResult(text="hello")
    assert result.arxiv_papers == []
    assert result.web_sources == []


# ── Per-source dry-run candidates ─────────────────────────────────────────────

async def test_arxiv_candidates_dry_run():
    candidates = await _arxiv_candidates(QUERY, dry_run=True)
    assert len(candidates) == 1
    assert candidates[0].source == "arxiv"
    assert QUERY in candidates[0].title


async def test_apod_candidates_dry_run():
    candidates = await _apod_candidates("", dry_run=True)
    assert len(candidates) == 1
    assert candidates[0].source == "apod"


async def test_images_candidates_dry_run():
    candidates = await _images_candidates(QUERY, dry_run=True)
    assert len(candidates) == 1
    assert candidates[0].source == "images"
    assert QUERY in candidates[0].title


async def test_web_candidates_dry_run():
    candidates = await _web_candidates(QUERY, "", dry_run=True)
    assert len(candidates) == 1
    assert candidates[0].source == "web"
    assert QUERY in candidates[0].title


async def test_web_days_zero_passes_none():
    """days=0 means no date filter → effective_web_days is None."""
    captured = {}

    async def mock_web_cands(query, tavily_key, dry_run, days=None):
        captured["days"] = days
        raw = {"title": f"[dry-run web] {query}", "url": "", "content": "..."}
        return [Candidate("web", "text", raw["title"], raw["content"], raw["url"], raw)]

    agent = SearchAgent(nasa_api_key="", tavily_key="fake-key", api_key="")
    with patch("agents.search._web_candidates", side_effect=mock_web_cands):
        await agent.run(QUERY, sources=["web"], web_days=0, dry_run=True)

    assert captured.get("days") is None


# ── SearchAgent.run ────────────────────────────────────────────────────────────

async def test_search_agent_run_dry_run():
    agent = SearchAgent(nasa_api_key="", tavily_key="", api_key="")
    result = await agent.run(QUERY, sources=["arxiv"], dry_run=True)
    assert isinstance(result, SearchResult)
    assert result.text  # non-empty


async def test_search_agent_all_sources_dry_run():
    """No sources specified → uses all four sources."""
    agent = SearchAgent(nasa_api_key="", tavily_key="fake-key", api_key="")
    result = await agent.run(QUERY, dry_run=True)
    assert isinstance(result, SearchResult)
    # dry-run scores are all 5.0 (≥ threshold of 5), so results should come through
    assert result.text


async def test_search_agent_no_tavily_key_skips_web():
    """Empty tavily_key → web source skipped even if requested."""
    agent = SearchAgent(nasa_api_key="", tavily_key="", api_key="")
    result = await agent.run(QUERY, sources=["web"], dry_run=True)
    # No coros added → returns "no sources" message
    assert isinstance(result, SearchResult)
    assert result.text
