"""Kiểm thử search.py — request builders dùng chung giữa live call và batch eval."""
from agents.search import (
    Candidate,
    build_score_request,
    build_translate_request,
    parse_score_response,
    parse_translate_response,
)


def test_build_translate_request_shape():
    params = build_translate_request("hố đen là gì")
    assert params["max_tokens"] == 80
    assert "hố đen là gì" in params["messages"][0]["content"]


def test_parse_translate_response_returns_stripped_text():
    assert parse_translate_response("  black holes  ", "fallback") == "black holes"


def test_parse_translate_response_empty_falls_back():
    assert parse_translate_response("   ", "original query") == "original query"


def test_build_score_request_includes_all_candidates():
    candidates = [
        Candidate("arxiv", "text", "Paper A", "summary a", "url-a", {}),
        Candidate("web", "text", "Article B", "summary b", "url-b", {}),
    ]
    params = build_score_request(candidates, "black holes")
    content = params["messages"][0]["content"]
    assert "Paper A" in content
    assert "Article B" in content
    assert "black holes" in content


def test_parse_score_response_valid_array():
    assert parse_score_response("[8, 3]", 2) == [8.0, 3.0]


def test_parse_score_response_markdown_fenced():
    assert parse_score_response("```json\n[7, 2]\n```", 2) == [7.0, 2.0]


def test_parse_score_response_length_mismatch_falls_back():
    assert parse_score_response("[8, 3, 1]", 2) == [5.0, 5.0]


def test_parse_score_response_malformed_falls_back():
    assert parse_score_response("not json", 3) == [5.0, 5.0, 5.0]
