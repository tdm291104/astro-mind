from __future__ import annotations


def extract_usage(message) -> dict:
    """Trích usage từ 1 Message (response live hoặc batch result message).
    Trả {} nếu message là None hoặc thiếu field usage — fail-open, nhất
    quán với convention trong toàn bộ agent_eval/."""
    if message is None:
        return {}
    usage = getattr(message, "usage", None)
    if usage is None:
        return {}
    return {
        "input_tokens": getattr(usage, "input_tokens", 0) or 0,
        "output_tokens": getattr(usage, "output_tokens", 0) or 0,
        "cache_creation_input_tokens": getattr(usage, "cache_creation_input_tokens", 0) or 0,
        "cache_read_input_tokens": getattr(usage, "cache_read_input_tokens", 0) or 0,
    }


def usage_record(*, call_type: str, model: str, is_batch: bool, usage: dict) -> dict:
    """1 entry trong list "calls" của file usage_<script>_<ts>.json."""
    return {"type": call_type, "model": model, "is_batch": is_batch, "usage": usage}
