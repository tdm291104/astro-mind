from types import SimpleNamespace

from agent_eval.instrumentation import extract_usage


def test_extract_usage_full_fields():
    usage = SimpleNamespace(
        input_tokens=100, output_tokens=20,
        cache_creation_input_tokens=50, cache_read_input_tokens=10,
    )
    message = SimpleNamespace(usage=usage)
    assert extract_usage(message) == {
        "input_tokens": 100, "output_tokens": 20,
        "cache_creation_input_tokens": 50, "cache_read_input_tokens": 10,
    }


def test_extract_usage_none_message():
    assert extract_usage(None) == {}


def test_extract_usage_missing_usage_attr():
    assert extract_usage(SimpleNamespace()) == {}


def test_extract_usage_missing_cache_fields_default_zero():
    usage = SimpleNamespace(input_tokens=100, output_tokens=20)
    message = SimpleNamespace(usage=usage)
    result = extract_usage(message)
    assert result["cache_creation_input_tokens"] == 0
    assert result["cache_read_input_tokens"] == 0
