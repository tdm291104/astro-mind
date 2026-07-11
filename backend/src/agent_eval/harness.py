from __future__ import annotations

import os
from typing import Callable, TypeVar

T = TypeVar("T")

EVAL_USER_ID = "eval-user"
_EVAL_DATA_DIR = "data/eval_run"


def build_eval_resources():
    """Build real Settings/MetaStore/VectorStore/Embedder/Reranker, isolated from
    the production data directory.

    Sets DATA_DIR via os.environ BEFORE constructing Settings(), so every eval
    run writes its SQLite/Chroma/images data under `<cwd>/data/eval_run/`
    instead of the real app's `<cwd>/data/`. Real API keys (ANTHROPIC_API_KEY,
    NASA_API_KEY, TAVILY_API_KEY, SERPAPI_API_KEY) are left untouched and still
    load from the real backend/.env — only DATA_DIR is overridden. Never call
    Settings() directly in agent_eval code; always go through this function.
    """
    os.environ["DATA_DIR"] = _EVAL_DATA_DIR

    from api.app import Resources
    from core.config import Settings
    from persistence.embed import Embedder
    from persistence.rerank import Reranker
    from persistence.store import MetaStore
    from persistence.vector import VectorStore

    settings = Settings()
    settings.ensure_dirs()
    return Resources(
        settings=settings,
        store=MetaStore(settings.db_path),
        vector=VectorStore(settings.chroma_dir),
        embedder=Embedder(settings.embed_model),
        reranker=Reranker(settings.rerank_model),
    )


def ensure_eval_user(store) -> str:
    """Create the fixed eval user row if it doesn't exist yet. Idempotent —
    safe to call at the start of every run-script. Returns the user id."""
    if store.get_user_by_id(EVAL_USER_ID) is None:
        store.create_user(
            id=EVAL_USER_ID,
            email="eval@astromind.local",
            password_hash="not-a-real-password",
            display_name="Eval Runner",
        )
    return EVAL_USER_ID


def sample_per_group(items: list[T], key_fn: Callable[[T], str], limit: int | None) -> list[T]:
    """Take up to `limit` items per group (grouped by key_fn(item)), preserving
    original order. `limit=None` returns all items unchanged.

    Used so `--limit N` pilots stay representative across categories instead of
    skewing toward whichever category happens to sort first in a dataset file
    (e.g. taking the first N items of image_eval.json would all be galaxies).
    """
    if limit is None:
        return list(items)
    counts: dict[str, int] = {}
    result: list[T] = []
    for item in items:
        key = key_fn(item)
        if counts.get(key, 0) < limit:
            result.append(item)
            counts[key] = counts.get(key, 0) + 1
    return result
