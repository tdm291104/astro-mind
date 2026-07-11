"""Kiểm thử synthesize — RAG answer synthesis."""
import pytest

from agents.synth import build_user_prompt, extract_used_markers, synthesize
from core.models import Chunk


def _make_chunk(content: str, page: int | None = 1, section: str | None = None) -> Chunk:
    return Chunk(
        doc_id="doc-001",
        content=content,
        page_number=page,
        chunk_index=0,
        token_count=len(content.split()),
        section_title=section,
    )


# ── build_user_prompt ──────────────────────────────────────────────────────────

def test_build_user_prompt_contains_question():
    chunk = _make_chunk("Hố đen là vùng không-thời gian.")
    prompt = build_user_prompt("Hố đen là gì?", [(chunk, "doc.pdf")])
    assert "Hố đen là gì?" in prompt


def test_build_user_prompt_contains_excerpt():
    content = "Hố đen là vùng không-thời gian."
    chunk = _make_chunk(content)
    prompt = build_user_prompt("question", [(chunk, "doc.pdf")])
    assert content in prompt


def test_build_user_prompt_citation_marker():
    chunk = _make_chunk("Some astronomy text.")
    prompt = build_user_prompt("question", [(chunk, "doc.pdf")])
    assert "[1]" in prompt


def test_build_user_prompt_multiple_chunks():
    chunks = [
        (_make_chunk("First chunk content."), "doc1.pdf"),
        (_make_chunk("Second chunk content."), "doc2.pdf"),
    ]
    prompt = build_user_prompt("question", chunks)
    assert "[1]" in prompt
    assert "[2]" in prompt
    assert "First chunk content." in prompt
    assert "Second chunk content." in prompt


# ── extract_used_markers ───────────────────────────────────────────────────────

def test_extract_used_markers():
    answer = "hố đen [1] được phát hiện [3] vào năm 2019."
    markers = extract_used_markers(answer)
    assert markers == {1, 3}


def test_extract_used_markers_empty():
    answer = "Không có nguồn trích dẫn nào."
    markers = extract_used_markers(answer)
    assert markers == set()


# ── synthesize ─────────────────────────────────────────────────────────────────

def test_synthesize_dry_run_returns_prompt():
    chunk = _make_chunk("Thiên hà là tập hợp hàng tỷ ngôi sao.")
    question = "Thiên hà là gì?"
    answer, used = synthesize(question, [(chunk, "doc.pdf")], api_key=None, model="any", dry_run=True)
    expected_prompt = build_user_prompt(question, [(chunk, "doc.pdf")])
    assert answer == expected_prompt
    assert used == set()


# ── build_request / parse_response ────────────────────────────────────────────

def test_build_request_uses_system_prompt():
    from agents.synth import SYSTEM_PROMPT, build_request
    chunk = _make_chunk("Hố đen là vùng không-thời gian.")
    params = build_request("Hố đen là gì?", [(chunk, "doc.pdf")], model="m")
    assert params["system"] == SYSTEM_PROMPT
    assert params["model"] == "m"


def test_build_request_embeds_user_prompt():
    chunk = _make_chunk("Hố đen là vùng không-thời gian.")
    from agents.synth import build_request
    params = build_request("Hố đen là gì?", [(chunk, "doc.pdf")], model="m")
    expected_prompt = build_user_prompt("Hố đen là gì?", [(chunk, "doc.pdf")])
    assert params["messages"] == [{"role": "user", "content": expected_prompt}]


def test_parse_response_extracts_markers():
    from agents.synth import parse_response
    answer, used = parse_response("hố đen [1] được phát hiện [3].")
    assert answer == "hố đen [1] được phát hiện [3]."
    assert used == {1, 3}
