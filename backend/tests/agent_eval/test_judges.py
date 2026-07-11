"""Kiểm thử judge chấm chất lượng văn phong báo cáo (Report Agent)."""
from unittest.mock import MagicMock, patch

from agent_eval.judges import judge_report_quality


def test_judge_report_quality_parses_valid_json():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"mach_lac": 4, "van_phong": 5, "do_sau": 3}')]
    with patch("agent_eval.judges.anthropic.Anthropic") as mock_client_cls:
        mock_client_cls.return_value.messages.create.return_value = mock_response
        result = judge_report_quality("nội dung báo cáo...", "hố đen", "key", "model")
    assert result == {"mach_lac": 4, "van_phong": 5, "do_sau": 3}


def test_judge_report_quality_strips_markdown_code_fence():
    mock_response = MagicMock()
    fenced = '```json\n{"mach_lac": 2, "van_phong": 2, "do_sau": 2}\n```'
    mock_response.content = [MagicMock(text=fenced)]
    with patch("agent_eval.judges.anthropic.Anthropic") as mock_client_cls:
        mock_client_cls.return_value.messages.create.return_value = mock_response
        result = judge_report_quality("nội dung", "topic", "key", "model")
    assert result == {"mach_lac": 2, "van_phong": 2, "do_sau": 2}


def test_judge_report_quality_fails_open_on_error():
    with patch("agent_eval.judges.anthropic.Anthropic", side_effect=Exception("network error")):
        result = judge_report_quality("nội dung", "hố đen", "key", "model")
    assert result["mach_lac"] == 0
    assert result["van_phong"] == 0
    assert result["do_sau"] == 0
    assert "error" in result


# ── build_request / parse_response ────────────────────────────────────────────

def test_build_request_shape():
    from agent_eval.judges import _RUBRIC_SYSTEM, build_request
    params = build_request("nội dung báo cáo", "hố đen", model="m")
    assert params["system"] == _RUBRIC_SYSTEM
    assert params["max_tokens"] == 100
    assert "hố đen" in params["messages"][0]["content"]
    assert "nội dung báo cáo" in params["messages"][0]["content"]


def test_parse_response_valid_json():
    from agent_eval.judges import parse_response
    result = parse_response('{"mach_lac": 4, "van_phong": 5, "do_sau": 3}')
    assert result == {"mach_lac": 4, "van_phong": 5, "do_sau": 3}


def test_parse_response_markdown_fenced():
    from agent_eval.judges import parse_response
    result = parse_response('```json\n{"mach_lac": 2, "van_phong": 2, "do_sau": 2}\n```')
    assert result == {"mach_lac": 2, "van_phong": 2, "do_sau": 2}


def test_parse_response_malformed_fails_open():
    from agent_eval.judges import parse_response
    result = parse_response("not json")
    assert result["mach_lac"] == 0
    assert result["van_phong"] == 0
    assert result["do_sau"] == 0
    assert "error" in result
