from __future__ import annotations

# Giá đã verify qua WebFetch tới platform.claude.com/docs ngày 2026-06-22
# (xem backend/src/agent_eval/results/cost_estimate.md) — cập nhật cả 2 nơi
# nếu giá đổi.
PRICING = {
    "claude-haiku-4-5-20251001": {"input": 1.00, "output": 5.00},
    "claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
}
BATCH_DISCOUNT = 0.5
CACHE_WRITE_MULTIPLIER = 1.25
CACHE_READ_MULTIPLIER = 0.1


def compute_cost(usage: dict, model: str, *, is_batch: bool = False) -> float:
    """Tính $ từ 1 usage dict (xem instrumentation.extract_usage) + model +
    có phải batch call không. Cache tokens được tính theo giá cache
    write/read riêng (dựa trên giá input gốc), không theo giá input thường."""
    if model not in PRICING:
        return 0.0
    rates = PRICING[model]
    discount = BATCH_DISCOUNT if is_batch else 1.0

    input_tok = usage.get("input_tokens", 0)
    output_tok = usage.get("output_tokens", 0)
    cache_write_tok = usage.get("cache_creation_input_tokens", 0)
    cache_read_tok = usage.get("cache_read_input_tokens", 0)

    cost = 0.0
    cost += (input_tok / 1_000_000) * rates["input"] * discount
    cost += (output_tok / 1_000_000) * rates["output"] * discount
    cost += (cache_write_tok / 1_000_000) * rates["input"] * CACHE_WRITE_MULTIPLIER * discount
    cost += (cache_read_tok / 1_000_000) * rates["input"] * CACHE_READ_MULTIPLIER * discount
    return cost
