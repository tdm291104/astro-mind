import json

import tiktoken

from agents import llm
from core.models import SourceBlock

_ENC = tiktoken.get_encoding("cl100k_base")

_SINGLE_PASS_BUDGET = 120_000
_SEGMENT_SIZE = 100_000

_EMPTY_ANALYSIS: dict = {
    "document_type": "",
    "overall_summary": "",
    "key_astronomy_insights": [],
    "celestial_objects": [],
    "tables_extracted": [],
    "formulas": [],
    "references": [],
    "important_values": [],
    "research_gaps": [],
    "suggested_questions": [],
    "fits_analysis": None,
}

_EXTRACTION_SYSTEM = """Bạn là trợ lý phân tích tài liệu thiên văn học chuyên sâu. Đọc toàn bộ nội dung tài liệu được cung cấp (có đánh dấu [Trang N] / [Mục: ...] cho từng đoạn) và trả về DUY NHẤT một đối tượng JSON theo đúng schema sau, không kèm markdown, không giải thích thêm:

{
  "document_type": "pdf|docx|txt|md|url",
  "overall_summary": "tóm tắt 300-500 từ bằng tiếng Việt",
  "key_astronomy_insights": ["..."],
  "celestial_objects": [
    {"name": "...", "type": "...", "properties": {...}, "page": 8, "section": "..."}
  ],
  "tables_extracted": [
    {"title": "...", "summary": "...", "key_rows": [...], "page": 5, "section": "..."}
  ],
  "formulas": [
    {"expression": "...", "context": "...", "meaning": "...", "page": 3, "section": "..."}
  ],
  "references": [
    {"paper": "...", "citation_key": "...", "link": "..."}
  ],
  "important_values": [
    {"name": "...", "value": "...", "unit": "...", "context": "...", "page": 4}
  ],
  "research_gaps": ["..."],
  "suggested_questions": ["..."],
  "fits_analysis": null
}

Quy tắc:
- "document_type" phải khớp với loại tài liệu được cho biết trong tin nhắn người dùng.
- "fits_analysis" luôn là null (tài liệu này không phải FITS).
- Mọi mục trích xuất (celestial_objects, tables_extracted, formulas, important_values) PHẢI có "page" và/hoặc "section" lấy từ marker [Trang N]/[Mục: ...] gần nhất phía trên đoạn văn liên quan.
- Nếu tài liệu không có một loại mục nào đó, trả về mảng rỗng [] cho mục đó.
- Toàn bộ văn bản (summary, insights, mô tả...) viết bằng tiếng Việt, không dùng emoji.
- Không bọc JSON trong dấu ```."""

_FITS_SYSTEM = """Bạn là trợ lý phân tích dữ liệu thiên văn FITS. Đọc nội dung header FITS được cung cấp (mỗi HDU có marker [Mục: HDU N (...)]) và trả về DUY NHẤT một đối tượng JSON theo đúng schema sau, không kèm markdown, không giải thích thêm:

{
  "document_type": "fits",
  "overall_summary": "tóm tắt 150-300 từ bằng tiếng Việt về dữ liệu quan sát này",
  "key_astronomy_insights": ["..."],
  "celestial_objects": [],
  "tables_extracted": [],
  "formulas": [],
  "references": [],
  "important_values": [],
  "research_gaps": [],
  "suggested_questions": ["..."],
  "fits_analysis": {
    "object_identification": "...",
    "coordinates": "...",
    "telescope_instrument": "...",
    "filters": "...",
    "observing_conditions": "...",
    "scientific_interpretation": "..."
  }
}

Quy tắc:
- "celestial_objects", "tables_extracted", "formulas", "references", "important_values" PHẢI là mảng rỗng [].
- "fits_analysis" PHẢI được điền đầy đủ dựa trên các header card (OBJECT, RA, DEC, TELESCOP, INSTRUME, FILTER, EXPTIME, AIRMASS, ...).
- Toàn bộ văn bản viết bằng tiếng Việt, không dùng emoji.
- Không bọc JSON trong dấu ```."""

_REDUCE_SYSTEM = """Bạn là trợ lý tổng hợp phân tích tài liệu thiên văn học. Bạn được cung cấp nhiều đối tượng JSON, mỗi cái là kết quả phân tích của một phần (segment) của cùng một tài liệu lớn. Hãy hợp nhất chúng thành MỘT đối tượng JSON duy nhất theo đúng schema sau, không kèm markdown, không giải thích thêm:

{
  "document_type": "pdf|docx|txt|md|url",
  "overall_summary": "tóm tắt tổng hợp 300-500 từ bằng tiếng Việt cho TOÀN BỘ tài liệu",
  "key_astronomy_insights": ["..."],
  "celestial_objects": [...],
  "tables_extracted": [...],
  "formulas": [...],
  "references": [...],
  "important_values": [...],
  "research_gaps": [...],
  "suggested_questions": [...],
  "fits_analysis": null
}

Quy tắc:
- Gộp các mảng (celestial_objects, tables_extracted, formulas, references, important_values, key_astronomy_insights, research_gaps, suggested_questions) từ tất cả các segment, loại bỏ trùng lặp rõ ràng (ví dụ cùng tên thiên thể với properties giống hệt).
- Viết lại "overall_summary" thành một bản tóm tắt mạch lạc cho toàn tài liệu, không chỉ ghép các đoạn lại.
- Giữ nguyên "page"/"section" của từng mục.
- "fits_analysis" luôn là null.
- Toàn bộ văn bản viết bằng tiếng Việt, không dùng emoji.
- Không bọc JSON trong dấu ```."""


def _count_tokens(text: str) -> int:
    return len(_ENC.encode(text))


def _join_blocks(blocks: list[SourceBlock]) -> str:
    parts: list[str] = []
    for b in blocks:
        marker_bits = []
        if b.page is not None:
            marker_bits.append(f"Trang {b.page}")
        if b.section:
            marker_bits.append(f"Mục: {b.section}")
        marker = f"[{' | '.join(marker_bits)}]" if marker_bits else ""
        parts.append(f"{marker}\n{b.text}".strip())
    return "\n\n".join(parts)


def _parse_json_response(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    parsed = json.loads(text)
    if not isinstance(parsed, dict):
        raise ValueError("Expected a JSON object")
    return parsed


def _run_fits_analysis(blocks: list[SourceBlock], *, api_key: str, model: str) -> dict:
    text = _join_blocks(blocks)
    raw = llm.complete(
        [
            {"role": "system", "content": _FITS_SYSTEM},
            {"role": "user", "content": f"Header FITS:\n\n{text}"},
        ],
        api_key=api_key,
        model=model,
        temperature=0.2,
        max_tokens=4096,
    )
    return _parse_json_response(raw)


def _run_single_pass(blocks: list[SourceBlock], doc_type: str, *, api_key: str, model: str) -> dict:
    text = _join_blocks(blocks)
    raw = llm.complete(
        [
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": f"Loại tài liệu: {doc_type}\n\nNội dung tài liệu:\n\n{text}"},
        ],
        api_key=api_key,
        model=model,
        temperature=0.2,
        max_tokens=8192,
    )
    return _parse_json_response(raw)


def _segment_blocks(blocks: list[SourceBlock], max_tokens: int) -> list[list[SourceBlock]]:
    segments: list[list[SourceBlock]] = []
    current: list[SourceBlock] = []
    current_tokens = 0
    for block in blocks:
        block_tokens = _count_tokens(block.text)
        if current and current_tokens + block_tokens > max_tokens:
            segments.append(current)
            current = []
            current_tokens = 0
        current.append(block)
        current_tokens += block_tokens
    if current:
        segments.append(current)
    return segments


def _run_map_reduce(blocks: list[SourceBlock], doc_type: str, *, api_key: str, model: str) -> dict:
    segments = _segment_blocks(blocks, _SEGMENT_SIZE)
    partials = [
        _run_single_pass(segment, doc_type, api_key=api_key, model=model)
        for segment in segments
    ]
    raw = llm.complete(
        [
            {"role": "system", "content": _REDUCE_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Loại tài liệu: {doc_type}\n\nKết quả phân tích từng phần (JSON):\n\n"
                    + json.dumps(partials, ensure_ascii=False)
                ),
            },
        ],
        api_key=api_key,
        model=model,
        temperature=0.2,
        max_tokens=8192,
    )
    return _parse_json_response(raw)


def run_analysis(blocks: list[SourceBlock], doc_type: str, *, api_key: str, model: str) -> dict:
    """Returns the analysis JSON. Routes to FITS / single-pass / map-reduce
    per the token budget."""
    if doc_type == "fits":
        return _run_fits_analysis(blocks, api_key=api_key, model=model)

    total_tokens = sum(_count_tokens(b.text) for b in blocks)
    if total_tokens <= _SINGLE_PASS_BUDGET:
        return _run_single_pass(blocks, doc_type, api_key=api_key, model=model)

    return _run_map_reduce(blocks, doc_type, api_key=api_key, model=model)
