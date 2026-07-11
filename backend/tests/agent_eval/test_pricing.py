from agent_eval.pricing import compute_cost


def test_compute_cost_standard_rate():
    usage = {"input_tokens": 1_000_000, "output_tokens": 1_000_000}
    cost = compute_cost(usage, "claude-haiku-4-5-20251001")
    assert cost == 1.00 + 5.00


def test_compute_cost_batch_discount_halves_price():
    usage = {"input_tokens": 1_000_000, "output_tokens": 1_000_000}
    cost = compute_cost(usage, "claude-haiku-4-5-20251001", is_batch=True)
    assert cost == (1.00 + 5.00) / 2


def test_compute_cost_cache_write_and_read():
    usage = {
        "input_tokens": 0, "output_tokens": 0,
        "cache_creation_input_tokens": 1_000_000, "cache_read_input_tokens": 1_000_000,
    }
    cost = compute_cost(usage, "claude-sonnet-4-6")
    assert cost == 3.00 * 1.25 + 3.00 * 0.1


def test_compute_cost_unknown_model_returns_zero():
    assert compute_cost({"input_tokens": 1_000_000}, "unknown-model") == 0.0


def test_compute_cost_missing_fields_default_zero():
    assert compute_cost({}, "claude-haiku-4-5-20251001") == 0.0
