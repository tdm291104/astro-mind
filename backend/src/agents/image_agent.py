from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field

import anthropic

from agents.galaxy_predictor import GalaxyPredictor, MorphologyResult

_logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are an expert astronomer and astrophotographer. "
    "Analyze the provided astronomical image and identify any celestial objects.\n\n"
    "Respond with ONLY a JSON object — no markdown, no explanation:\n"
    '{"detected_objects": [\n'
    '  {\n'
    '    "class_name": "galaxy|nebula|planet|star_cluster|comet|asteroid|moon|constellation|star|other",\n'
    '    "sub_type": "spiral|elliptical|irregular|planetary nebula|emission nebula|'
    'saturn|jupiter|mars|venus|mercury|open cluster|globular cluster|etc.",\n'
    '    "confidence": "high|medium|low",\n'
    '    "description": "Brief description of what is detected"\n'
    "  }\n"
    "]}\n\n"
    "Distinguishing tips for commonly confused classes:\n"
    "- comet vs asteroid: a comet typically shows a visible tail or a diffuse "
    "coma (fuzzy glow) of gas/dust around its nucleus; an asteroid is a solid "
    "rocky body with a sharp, star-like or irregular silhouette and no tail/coma.\n"
    "- star_cluster vs nebula: a star_cluster is made of many distinct, "
    "point-like stars grouped together; a nebula is diffuse glowing or dark "
    "gas/dust without sharp point sources dominating the frame.\n"
    "- a close-up filling the frame with a grey, cratered, rocky surface is "
    "very likely \"moon\" even without surrounding context — classify it with "
    'confidence "low" or "medium" rather than returning no detection.\n\n'
    "Only include objects you are reasonably confident about (low confidence is "
    "fine if you still have a plausible best guess). "
    'If truly no astronomical object is identifiable at all, return {"detected_objects": []}\n\n'
    "IMPORTANT: keep class_name, sub_type and confidence in English exactly as listed above "
    "(they are used as machine-readable labels). Always write \"description\" in Vietnamese."
)

_ENHANCED_SYSTEM_PROMPT = (
    _SYSTEM_PROMPT
    + "\n\nWhen galaxy morphology data is provided in the user message, treat it as "
    "objective CNN measurements. Incorporate them into your description and "
    "do not contradict them."
)

_predictor: GalaxyPredictor | None = None


def _get_predictor() -> GalaxyPredictor:
    global _predictor
    if _predictor is None:
        from core.config import Settings
        s = Settings()
        _predictor = GalaxyPredictor(s.galaxy_model_path)
    return _predictor


@dataclass
class DetectedObject:
    class_name: str
    sub_type: str
    confidence: str
    description: str


@dataclass
class AnalyzeResult:
    detected_objects: list[DetectedObject] = field(default_factory=list)
    raw_response: str = ""
    morphology_context: str | None = None


def _image_block(image_data: str) -> dict:
    media_type = "image/jpeg"
    raw_b64 = image_data
    if "base64," in image_data:
        header, raw_b64 = image_data.split(",", 1)
        if ":" in header and ";" in header:
            media_type = header.split(":")[1].split(";")[0]
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": raw_b64},
    }


def build_stage1_request(image_data: str, user_question: str, *, model: str) -> dict:
    """Build the Anthropic request params for stage-1 analysis (no morphology
    context). Reusable by both the live path (analyze()) and batch-eval code."""
    prompt = (
        f"User question: {user_question}\n\n"
        "Analyze the image and respond with only the JSON format specified."
    )
    return {
        "model": model,
        "max_tokens": 512,
        "system": _SYSTEM_PROMPT,
        "messages": [{
            "role": "user",
            "content": [_image_block(image_data), {"type": "text", "text": prompt}],
        }],
    }


def build_stage2_request(
    image_data: str, user_question: str, morphology_context: str, *, model: str
) -> dict:
    """Build the Anthropic request params for stage-2 analysis (galaxy images
    only, with CNN morphology context injected). Reusable by both the live path
    and batch-eval code."""
    enhanced_prompt = (
        f"{morphology_context}\n\n"
        f"User question: {user_question}\n\n"
        "Analyze the image and respond with only the JSON format specified."
    )
    return {
        "model": model,
        "max_tokens": 512,
        "system": _ENHANCED_SYSTEM_PROMPT,
        "messages": [{
            "role": "user",
            "content": [_image_block(image_data), {"type": "text", "text": enhanced_prompt}],
        }],
    }


def parse_response(raw_text: str) -> AnalyzeResult:
    """Parse a stage-1 or stage-2 response's raw text into an AnalyzeResult.
    Reusable by both the live path and batch-eval code."""
    try:
        clean = raw_text.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            clean = parts[1] if len(parts) > 1 else clean
            if clean.startswith("json"):
                clean = clean[4:]
        data = json.loads(clean.strip())
        objects = [
            DetectedObject(
                class_name=o.get("class_name", ""),
                sub_type=o.get("sub_type", ""),
                confidence=o.get("confidence", "medium"),
                description=o.get("description", ""),
            )
            for o in data.get("detected_objects", [])
            if o.get("class_name")
        ]
        return AnalyzeResult(detected_objects=objects, raw_response=raw_text)
    except (json.JSONDecodeError, KeyError, TypeError):
        return AnalyzeResult(detected_objects=[], raw_response=raw_text)


class ImageAgent:
    async def analyze(
        self,
        image_data: str,
        user_question: str,
        api_key: str,
        model: str,
    ) -> AnalyzeResult:
        """Analyze an astronomical image using Claude Vision.

        image_data: base64 data URL ("data:image/jpeg;base64,...") or raw base64.
        Returns AnalyzeResult with list of detected celestial objects.
        """
        try:
            client = anthropic.Anthropic(api_key=api_key)
            response = await asyncio.to_thread(
                client.messages.create,
                **build_stage1_request(image_data, user_question, model=model),
            )
        except Exception as exc:
            return AnalyzeResult(detected_objects=[], raw_response=str(exc))

        raw_text = response.content[0].text if response.content else "{}"
        result = parse_response(raw_text)

        # Galaxy gate: only run morphology predictor for galaxy images
        is_galaxy = any(obj.class_name.lower() == "galaxy" for obj in result.detected_objects)
        if not is_galaxy:
            return result

        predictor = _get_predictor()
        morph: MorphologyResult | None = await predictor.predict(image_data)
        if morph is None:
            return result

        try:
            response2 = await asyncio.to_thread(
                client.messages.create,
                **build_stage2_request(image_data, user_question, morph.grouped_context, model=model),
            )
        except Exception:
            return result

        raw_text2 = response2.content[0].text if response2.content else "{}"
        result2 = parse_response(raw_text2)
        result2.morphology_context = morph.grouped_context
        return result2
