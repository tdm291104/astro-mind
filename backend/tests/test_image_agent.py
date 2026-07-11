"""Kiểm thử ImageAgent — phân tích ảnh thiên văn qua Claude Vision."""
from unittest.mock import MagicMock, patch

from agents.image_agent import (
    DetectedObject,
    ImageAgent,
    _ENHANCED_SYSTEM_PROMPT,
    _SYSTEM_PROMPT,
    build_stage1_request,
    build_stage2_request,
    parse_response,
)

_DATA_URL = "data:image/jpeg;base64,abc123"


# ── build_stage1_request / build_stage2_request ───────────────────────────────

def test_build_stage1_request_shape():
    params = build_stage1_request(_DATA_URL, "what is this?", model="m")
    assert params["model"] == "m"
    assert params["max_tokens"] == 512
    assert params["system"] == _SYSTEM_PROMPT
    content = params["messages"][0]["content"]
    assert content[0] == {
        "type": "image",
        "source": {"type": "base64", "media_type": "image/jpeg", "data": "abc123"},
    }
    assert "what is this?" in content[1]["text"]


def test_build_stage2_request_uses_enhanced_system_and_morphology():
    params = build_stage2_request(_DATA_URL, "q", "morphology data here", model="m")
    assert params["system"] == _ENHANCED_SYSTEM_PROMPT
    content_text = params["messages"][0]["content"][1]["text"]
    assert "morphology data here" in content_text


# ── parse_response ─────────────────────────────────────────────────────────────

def test_parse_response_valid_json():
    raw = '{"detected_objects": [{"class_name": "galaxy", "sub_type": "spiral", "confidence": "high", "description": "x"}]}'
    result = parse_response(raw)
    assert result.detected_objects == [
        DetectedObject(class_name="galaxy", sub_type="spiral", confidence="high", description="x")
    ]


def test_parse_response_markdown_fenced():
    raw = '```json\n{"detected_objects": []}\n```'
    result = parse_response(raw)
    assert result.detected_objects == []


def test_parse_response_malformed_json_returns_empty():
    result = parse_response("not json at all")
    assert result.detected_objects == []
    assert result.raw_response == "not json at all"


# ── ImageAgent.analyze (mocked) ─────────────────────────────────────────────────

async def test_analyze_non_galaxy_skips_morphology_call():
    mock_resp = MagicMock()
    mock_resp.content = [MagicMock(
        text='{"detected_objects": [{"class_name": "planet", "sub_type": "mars", '
             '"confidence": "high", "description": "x"}]}'
    )]
    with patch("agents.image_agent.anthropic.Anthropic") as mock_client_cls:
        mock_client_cls.return_value.messages.create.return_value = mock_resp
        agent = ImageAgent()
        result = await agent.analyze(_DATA_URL, "", "key", "model")
    assert result.detected_objects[0].class_name == "planet"
    # Only 1 call made (no stage 2) — galaxy gate correctly skipped morphology stage.
    assert mock_client_cls.return_value.messages.create.call_count == 1


async def test_analyze_api_failure_returns_empty_result():
    with patch("agents.image_agent.anthropic.Anthropic", side_effect=Exception("network error")):
        agent = ImageAgent()
        result = await agent.analyze(_DATA_URL, "", "key", "model")
    assert result.detected_objects == []
