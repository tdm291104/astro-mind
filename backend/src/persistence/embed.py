import os
from functools import cached_property
from pathlib import Path


def _normalize_hf_home() -> None:
    """Drop HF_HOME if it points to a missing or unwritable location.

    HuggingFace reads HF_HOME at import time. If it points to an unmounted
    external drive or a TCC-blocked / read-only path, sentence-transformers
    fails with PermissionError. In that case we unset it so HuggingFace falls
    back to its default cache (~/.cache/huggingface).
    """

    hf_home = os.environ.get("HF_HOME")
    if not hf_home:
        return
    path = Path(hf_home)
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".astromind-write-probe"
        probe.touch()
        probe.unlink()
    except OSError:
        os.environ.pop("HF_HOME", None)


# Must run at module load, BEFORE importing sentence_transformers below:
# huggingface_hub latches HF_HOME at its own import time, so normalizing it
# later has no effect. Do not move this into a lazy init.
_normalize_hf_home()

import numpy as np  # noqa: E402
from sentence_transformers import SentenceTransformer  # noqa: E402


class Embedder:
    """Lazy-loaded sentence-transformers wrapper.

    The model is downloaded on first call to `embed_one` / `embed_batch`,
    then cached for the lifetime of the process.
    """

    def __init__(self, model_name: str):
        self.model_name = model_name

    @cached_property
    def model(self) -> SentenceTransformer:
        return SentenceTransformer(self.model_name)

    def embed_batch(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0,), dtype=np.float32)
        return self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    def embed_one(self, text: str) -> np.ndarray:
        return self.embed_batch([text])[0]
