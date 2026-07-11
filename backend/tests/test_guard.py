"""Kiểm thử InputGuard — phân loại đầu vào thiên văn học."""
import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from agents.guard import InputGuard, _REJECT_MESSAGE, _SYSTEM, _classify


# ── _SYSTEM constant checks ────────────────────────────────────────────────────

def test_who_are_you_accepted():
    assert "bạn là ai" in _SYSTEM


def test_reject_message_is_vietnamese():
    assert "AstroMind" in _REJECT_MESSAGE


# ── _classify ──────────────────────────────────────────────────────────────────

async def test_fail_open_on_exception():
    with patch("agents.guard.asyncio.to_thread", side_effect=Exception("network error")):
        result = await _classify(_SYSTEM, [{"type": "text", "text": "test"}], "key", "model")
    assert result is True


# ── InputGuard.is_relevant ─────────────────────────────────────────────────────

async def test_astronomy_text_accepted():
    guard = InputGuard()
    with patch("agents.guard._classify", new=AsyncMock(return_value=True)):
        result = await guard.is_relevant("What is a black hole?", None, "key", "model")
    assert result is True


async def test_offtopic_rejected_by_mock():
    guard = InputGuard()
    with patch("agents.guard._classify", new=AsyncMock(return_value=False)):
        result = await guard.is_relevant("Cách nấu phở bò ngon?", None, "key", "model")
    assert result is False


async def test_greeting_accepted():
    guard = InputGuard()
    # "xin chào" is a conversational greeting → guard should not reject
    # We verify the content passed to _classify contains the text, not the behavior (fail open)
    captured = {}

    async def mock_classify(system, content, api_key, model):
        captured["content"] = content
        return True

    with patch("agents.guard._classify", side_effect=mock_classify):
        result = await guard.is_relevant("xin chào", None, "key", "model")

    assert result is True
    # Verify the text was included in the content
    text_blocks = [b for b in captured["content"] if b.get("type") == "text"]
    assert any("xin chào" in b["text"] for b in text_blocks)


async def test_image_only_accepted():
    guard = InputGuard()
    captured = {}

    async def mock_classify(system, content, api_key, model):
        captured["content"] = content
        return True

    image_data = "data:image/jpeg;base64,/9j/abc123"
    with patch("agents.guard._classify", side_effect=mock_classify):
        result = await guard.is_relevant("", image_data, "key", "model")

    assert result is True
    # Content should contain an image block
    image_blocks = [b for b in captured["content"] if b.get("type") == "image"]
    assert len(image_blocks) == 1
    assert image_blocks[0]["source"]["media_type"] == "image/jpeg"


async def test_history_context_injected():
    guard = InputGuard()
    captured = {}

    async def mock_classify(system, content, api_key, model):
        captured["content"] = content
        return True

    history = [
        {"role": "user", "content": "Tell me about galaxies"},
        {"role": "assistant", "content": "Galaxies are vast systems of stars."},
    ]
    with patch("agents.guard._classify", side_effect=mock_classify):
        await guard.is_relevant("tổng hợp lại", None, "key", "model", history=history)

    text_blocks = [b for b in captured["content"] if b.get("type") == "text"]
    combined = " ".join(b["text"] for b in text_blocks)
    assert "[Previous conversation]" in combined


async def test_doc_names_injected():
    guard = InputGuard()
    captured = {}

    async def mock_classify(system, content, api_key, model):
        captured["content"] = content
        return True

    doc_names = ["hubble_report.pdf", "jwst_paper.pdf"]
    with patch("agents.guard._classify", side_effect=mock_classify):
        await guard.is_relevant("tóm tắt tài liệu", None, "key", "model", doc_names=doc_names)

    text_blocks = [b for b in captured["content"] if b.get("type") == "text"]
    combined = " ".join(b["text"] for b in text_blocks)
    assert "[Attached documents:" in combined
    assert "hubble_report.pdf" in combined


async def test_is_document_relevant_delegates_to_classify():
    guard = InputGuard()
    captured = {}

    async def mock_classify(system, content, api_key, model):
        captured["content"] = content
        captured["system"] = system
        return True

    long_text = "astronomy " * 1000  # >4000 chars
    with patch("agents.guard._classify", side_effect=mock_classify):
        result = await guard.is_document_relevant(long_text, "key", "model")

    assert result is True
    # Text should be truncated to 4000 chars
    assert len(captured["content"]) <= 4000


# ── build_classify_content / build_request / parse_response ───────────────────

def test_build_classify_content_text_only():
    from agents.guard import build_classify_content
    content = build_classify_content("What is a black hole?", None)
    assert content == [{"type": "text", "text": "What is a black hole?"}]


def test_build_classify_content_empty_text_fallback():
    from agents.guard import build_classify_content
    content = build_classify_content("   ", None)
    assert content[-1]["text"] == "(image only, no text)"


def test_build_classify_content_with_doc_names():
    from agents.guard import build_classify_content
    content = build_classify_content("Summarize this", None, doc_names=["paper.pdf"])
    assert "[Attached documents: paper.pdf]" in content[-1]["text"]


def test_build_classify_content_with_history():
    from agents.guard import build_classify_content
    history = [{"role": "user", "content": "Tell me about black holes"}]
    content = build_classify_content("tổng hợp lại", None, history=history)
    assert "[Previous conversation]" in content[-1]["text"]


def test_build_classify_content_with_image():
    from agents.guard import build_classify_content
    content = build_classify_content("what is this", "data:image/jpeg;base64,abc123")
    assert content[0]["type"] == "image"
    assert content[0]["source"]["data"] == "abc123"


def test_build_request_shape():
    from agents.guard import build_request
    params = build_request(_SYSTEM, [{"type": "text", "text": "hi"}], model="m")
    assert params["model"] == "m"
    assert params["max_tokens"] == 5
    assert params["system"] == _SYSTEM
    assert params["messages"] == [{"role": "user", "content": [{"type": "text", "text": "hi"}]}]


def test_parse_response_yes():
    from agents.guard import parse_response
    assert parse_response("YES") is True


def test_parse_response_no():
    from agents.guard import parse_response
    assert parse_response("NO") is False
