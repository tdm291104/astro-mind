"""Kiểm thử ReportAgent — request builders dùng chung giữa live call và batch eval."""
from agents.report_agent import (
    _KEYWORD_SYSTEM,
    _RESEARCH_REPORT_SYSTEM,
    _TRENDING_REPORT_SYSTEM,
    build_keyword_request,
    build_research_report_request,
    build_trending_report_request,
    parse_keyword_response,
)


# ── build_keyword_request / parse_keyword_response ─────────────────────────────

def test_build_keyword_request_shape():
    params = build_keyword_request("black holes", model="m")
    assert params["system"] == _KEYWORD_SYSTEM
    assert params["messages"] == [{"role": "user", "content": "Topic: black holes"}]
    assert params["temperature"] == 0.1


def test_parse_keyword_response_valid_json_array():
    result = parse_keyword_response('["exoplanets", "TESS mission"]', "fallback topic")
    assert result == ["exoplanets", "TESS mission"]


def test_parse_keyword_response_markdown_fenced():
    result = parse_keyword_response('```json\n["black holes"]\n```', "fallback")
    assert result == ["black holes"]


def test_parse_keyword_response_malformed_falls_back_to_topic():
    result = parse_keyword_response("not json", "exoplanets")
    assert result == ["exoplanets"]


def test_parse_keyword_response_caps_at_5():
    result = parse_keyword_response('["a", "b", "c", "d", "e", "f", "g"]', "fallback")
    assert result == ["a", "b", "c", "d", "e"]


# ── build_research_report_request / build_trending_report_request ──────────────

def test_build_research_report_request_shape():
    params = build_research_report_request(
        "black holes", ["black holes", "merger"], [], [], model="m",
    )
    assert params["system"] == _RESEARCH_REPORT_SYSTEM
    assert "Chủ đề: black holes" in params["messages"][0]["content"]
    assert params["temperature"] == 0.4


def test_build_trending_report_request_includes_top_authors():
    params = build_trending_report_request(
        "exoplanets", ["exoplanets"], [], [], top_authors=[{"name": "A. Author", "count": 3}], model="m",
    )
    assert params["system"] == _TRENDING_REPORT_SYSTEM
    assert "A. Author" in params["messages"][0]["content"]


def test_build_research_report_request_includes_web_and_papers():
    web = [{"title": "Recent finding", "content": "details here"}]
    papers = [{"title": "A Paper", "published": "2026-01-01", "summary": "abstract text"}]
    params = build_research_report_request("topic", ["kw"], web, papers, model="m")
    content = params["messages"][0]["content"]
    assert "Recent finding" in content
    assert "A Paper" in content
