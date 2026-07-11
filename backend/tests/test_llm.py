"""Kiểm thử llm.py — wrapper gọi Anthropic dùng chung giữa các agent."""
from unittest.mock import MagicMock, patch

from agents.llm import build_request, complete, extract_text


def test_build_request_extracts_system_role():
    messages = [
        {"role": "system", "content": "You are helpful."},
        {"role": "user", "content": "Hello"},
    ]
    params = build_request(messages, model="claude-haiku-4-5-20251001")
    assert params["system"] == "You are helpful."
    assert params["messages"] == [{"role": "user", "content": "Hello"}]
    assert params["model"] == "claude-haiku-4-5-20251001"


def test_build_request_default_system_when_absent():
    messages = [{"role": "user", "content": "Hello"}]
    params = build_request(messages, model="m")
    assert params["system"] == "You are a helpful astronomy expert."


def test_build_request_default_temperature_and_max_tokens():
    params = build_request([{"role": "user", "content": "Hi"}], model="m")
    assert params["temperature"] == 0.2
    assert params["max_tokens"] == 4096


def test_build_request_custom_temperature_and_max_tokens():
    params = build_request(
        [{"role": "user", "content": "Hi"}], model="m", temperature=0.9, max_tokens=100,
    )
    assert params["temperature"] == 0.9
    assert params["max_tokens"] == 100


def test_extract_text_returns_first_text_block():
    resp = MagicMock()
    resp.content = [MagicMock(text="hello world")]
    assert extract_text(resp) == "hello world"


def test_extract_text_empty_content_returns_empty_string():
    resp = MagicMock()
    resp.content = []
    assert extract_text(resp) == ""


def test_complete_calls_api_with_built_params_and_returns_text():
    mock_resp = MagicMock()
    mock_resp.content = [MagicMock(text="the answer")]
    mock_resp.usage = MagicMock(input_tokens=10, output_tokens=5)
    with patch("agents.llm.Anthropic") as mock_anthropic_cls:
        mock_anthropic_cls.return_value.messages.create.return_value = mock_resp
        result = complete(
            [{"role": "system", "content": "sys"}, {"role": "user", "content": "q"}],
            api_key="key", model="m", temperature=0.5, max_tokens=200,
        )
    assert result == "the answer"
    mock_anthropic_cls.return_value.messages.create.assert_called_once_with(
        model="m", max_tokens=200, system="sys",
        messages=[{"role": "user", "content": "q"}], temperature=0.5,
    )
