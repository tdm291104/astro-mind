from __future__ import annotations

import json

import anthropic

_RUBRIC_SYSTEM = (
    "Bạn là người chấm điểm chất lượng báo cáo khoa học thiên văn học tiếng Việt. "
    "Chấm theo 3 tiêu chí, mỗi tiêu chí thang điểm 1-5 (số nguyên):\n"
    "- mach_lac: cấu trúc rõ ràng, các phần liên kết hợp lý, không lặp ý\n"
    "- van_phong: tiếng Việt tự nhiên, không emoji, không markdown thừa, "
    "đúng văn phong báo cáo khoa học\n"
    "- do_sau: nội dung có chiều sâu, không chung chung sáo rỗng, có khái niệm cụ thể\n\n"
    "Trả lời CHỈ bằng JSON, không giải thích thêm: "
    '{"mach_lac": <1-5>, "van_phong": <1-5>, "do_sau": <1-5>}'
)


def build_request(report_text: str, topic: str, *, model: str) -> dict:
    """Build the Anthropic request params for a judge call. Reusable by both
    the live path (judge_report_quality) and batch-eval code."""
    prompt = f"Chủ đề báo cáo: {topic}\n\nNội dung báo cáo:\n{report_text}"
    return {
        "model": model,
        "max_tokens": 100,
        "system": _RUBRIC_SYSTEM,
        "messages": [{"role": "user", "content": prompt}],
    }


def parse_response(raw_text: str) -> dict:
    """Parse a judge response's raw text into the 3-criteria score dict.
    Fails open with all-zero scores + an "error" key on any parse failure."""
    try:
        raw = raw_text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        scores = json.loads(raw)
        return {
            "mach_lac": int(scores.get("mach_lac", 0)),
            "van_phong": int(scores.get("van_phong", 0)),
            "do_sau": int(scores.get("do_sau", 0)),
        }
    except Exception as exc:
        return {"mach_lac": 0, "van_phong": 0, "do_sau": 0, "error": str(exc)}


def judge_report_quality(report_text: str, topic: str, api_key: str, model: str) -> dict:
    """Score a generated report's prose quality on a fixed 1-5 rubric (3 criteria).

    LIMITATION: this judge typically runs with the SAME model that generated
    the report being judged (no larger/independent model configured for this
    project). Treat scores as a rough signal only — validate against a human
    spot-check on ~20% of items before citing these numbers as primary
    evidence in the thesis.

    Fails open with all-zero scores + an "error" key on any API/parse failure,
    never raises.
    """
    try:
        client = anthropic.Anthropic(api_key=api_key)
        params = build_request(report_text, topic, model=model)
        response = client.messages.create(**params)
        raw_text = response.content[0].text
        return parse_response(raw_text)
    except Exception as exc:
        return {"mach_lac": 0, "van_phong": 0, "do_sau": 0, "error": str(exc)}
