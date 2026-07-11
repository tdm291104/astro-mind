from functools import cached_property

import numpy as np

from persistence.embed import _normalize_hf_home

# HF_HOME must be normalized before any sentence_transformers import (see embed.py).
_normalize_hf_home()

from sentence_transformers import CrossEncoder  # noqa: E402


class Reranker:
    """Lazy-loaded cross-encoder reranker.

    The model is downloaded on first call to `score`, then cached for the
    lifetime of the process.
    """

    def __init__(self, model_name: str):
        self.model_name = model_name

    @cached_property
    def model(self) -> CrossEncoder:
        return CrossEncoder(self.model_name)

    def score(self, query: str, documents: list[str]) -> np.ndarray:
        if not documents:
            return np.zeros((0,), dtype=np.float32)
        pairs = [(query, doc) for doc in documents]
        return self.model.predict(pairs)
