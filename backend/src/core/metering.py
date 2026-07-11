import contextvars
from collections.abc import Iterator
from contextlib import contextmanager


class _Meter:
    def __init__(self) -> None:
        self.total = 0
        self.prompt_total = 0
        self.completion_total = 0


_current: contextvars.ContextVar[_Meter | None] = contextvars.ContextVar("am_meter", default=None)


def record_usage(prompt_tokens: int, completion_tokens: int) -> None:
    """Add token usage to the active meter, if any (a no-op otherwise)."""
    m = _current.get()
    if m is not None:
        m.total += (prompt_tokens or 0) + (completion_tokens or 0)
        m.prompt_total += prompt_tokens or 0
        m.completion_total += completion_tokens or 0


@contextmanager
def meter() -> Iterator[_Meter]:
    """Within this block, every `record_usage` (incl. from `llm.complete`) accrues to `m.total`."""
    m = _Meter()
    token = _current.set(m)
    try:
        yield m
    finally:
        _current.reset(token)
