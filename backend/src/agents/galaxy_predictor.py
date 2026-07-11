from __future__ import annotations

import asyncio
import base64
import io
import logging
import threading
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

_logger = logging.getLogger(__name__)

LABELS: list[str] = [
    "Class1.1 Smooth", "Class1.2 Featured/Disk", "Class1.3 Star/Artifact",
    "Class2.1 Edge-on Yes", "Class2.2 Edge-on No",
    "Class3.1 Bulge Rounded", "Class3.2 Bulge Boxy",
    "Class4.1 Bar present", "Class4.2 No bar",
    "Class5.1 Spiral Yes", "Class5.2 Spiral tight", "Class5.3 Spiral medium", "Class5.4 Spiral loose",
    "Class6.1 No bulge", "Class6.2 Obvious bulge",
    "Class7.1 Completely round", "Class7.2 In between", "Class7.3 Cigar shaped",
    "Class8.1 Ring", "Class8.2 Lens/Arc", "Class8.3 Disturbed", "Class8.4 Irregular",
    "Class8.5 Other", "Class8.6 Merger", "Class8.7 Dust lane",
    "Class9.1 Bulge round", "Class9.2 Bulge boxy", "Class9.3 Bulge no bulge",
    "Class10.1 Tight spiral", "Class10.2 Medium spiral", "Class10.3 Loose spiral",
    "Class11.1 1 arm", "Class11.2 2 arms", "Class11.3 3 arms",
    "Class11.4 4 arms", "Class11.5 More than 4", "Class11.6 Can't tell",
]

QUESTION_GROUPS: dict[str, list[int]] = {
    "Q1 Shape":           [0, 1, 2],
    "Q2 Edge-on":         [3, 4],
    "Q3 Bulge (edge-on)": [5, 6],
    "Q4 Bar":             [7, 8],
    "Q5 Spiral":          [9, 10, 11, 12],
    "Q6 Bulge prom.":     [13, 14],
    "Q7 Roundness":       [15, 16, 17],
    "Q8 Odd features":    [18, 19, 20, 21, 22, 23, 24],
    "Q9 Bulge shape":     [25, 26, 27],
    "Q10 Spiral wind.":   [28, 29, 30],
    "Q11 Spiral arms":    [31, 32, 33, 34, 35, 36],
}

_GROUP_THRESHOLD = 0.10
_IMAGE_SIZE = 160


@dataclass
class MorphologyResult:
    scores: dict[str, float]
    grouped_context: str


def _preprocess(image_data: str) -> np.ndarray | None:
    raw_b64 = image_data
    if "base64," in image_data:
        _, raw_b64 = image_data.split(",", 1)
    try:
        img_bytes = base64.b64decode(raw_b64, validate=True)
    except Exception:
        return None
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img = img.resize((_IMAGE_SIZE, _IMAGE_SIZE), Image.LANCZOS)
        arr = np.array(img, dtype=np.float32) / 255.0
        return np.expand_dims(arr, axis=0)
    except Exception:
        return None


def _build_grouped_context(scores: dict[str, float]) -> str:
    lines = ["[Galaxy morphology analysis — CNN model]"]
    for group_name, indices in QUESTION_GROUPS.items():
        group_scores = [(LABELS[i], scores.get(LABELS[i], 0.0)) for i in indices]
        if max(s for _, s in group_scores) <= _GROUP_THRESHOLD:
            continue
        parts = " | ".join(
            f"{lbl.split(' ', 1)[1]}={s:.2f}"
            for lbl, s in group_scores
        )
        lines.append(f"{group_name}: {parts}")
    lines.append("Use these scores as grounding facts. Do not contradict them.")
    return "\n".join(lines)


_lock = threading.Lock()


class GalaxyPredictor:
    def __init__(self, model_path: str) -> None:
        self._model_path = model_path
        self._model = None

    def _load_model(self) -> None:
        try:
            import tensorflow as tf
            self._model = tf.keras.models.load_model(self._model_path, compile=False)
            dummy = np.zeros((1, _IMAGE_SIZE, _IMAGE_SIZE, 3), dtype=np.float32)
            self._model(dummy, training=False)
            _logger.info("Galaxy model loaded: %s", self._model_path)
        except Exception as exc:
            _logger.warning("Failed to load galaxy model: %s", exc)
            self._model = None

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        with _lock:
            if self._model is None and Path(self._model_path).exists():
                self._load_model()

    async def predict(self, image_data: str) -> MorphologyResult | None:
        self._ensure_loaded()
        if self._model is None:
            return None
        arr = _preprocess(image_data)
        if arr is None:
            return None
        try:
            output = await asyncio.to_thread(lambda: self._model(arr, training=False))
            scores_list: list[float] = output.numpy()[0].tolist()
            scores = {LABELS[i]: float(scores_list[i]) for i in range(37)}
            return MorphologyResult(
                scores=scores,
                grouped_context=_build_grouped_context(scores),
            )
        except Exception as exc:
            _logger.warning("Galaxy prediction failed: %s", exc)
            return None
