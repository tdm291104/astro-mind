from __future__ import annotations

from collections import Counter

_ALL_SOURCES = {"arxiv", "apod", "images", "web"}


def baseline_guard(items) -> list[bool]:
    """Luôn accept — baseline "không lọc gì"."""
    return [True for _ in items]


def baseline_image(items) -> list[tuple[str, str]]:
    """Luôn đoán (class_name, sub_type="") phổ biến nhất trong dataset, không nhìn ảnh."""
    majority_class = Counter(it.expected_class_name for it in items).most_common(1)[0][0]
    return [(majority_class, "") for _ in items]


def baseline_notebook_from_retrieval(retrieval) -> tuple[str, list[int]]:
    """retrieval: kết quả agents.notebook.retrieve_chunks (tuple
    (chunks_with_doc, score_by_id)) hoặc None. Trả (text, pages) của chunk
    top-1 — text thô, không qua LLM synthesize/citation formatting; pages
    là list 0 hoặc 1 phần tử, dùng so với expected_page qua metrics.py."""
    if retrieval is None:
        return "", []
    chunks_with_doc, _ = retrieval
    if not chunks_with_doc:
        return "", []
    top_chunk, _ = chunks_with_doc[0]
    pages = [top_chunk.page_number] if top_chunk.page_number is not None else []
    return top_chunk.content, pages


def baseline_report_template(required_sections: list[str]) -> str:
    """Điền template rỗng theo tên section kỳ vọng, không gọi LLM viết nội dung."""
    return "\n\n".join(f"## {s}\n(chưa có nội dung)" for s in required_sections)


def baseline_search(items) -> list[set[str]]:
    """Luôn chọn cả 4 source bất kể câu hỏi."""
    return [set(_ALL_SOURCES) for _ in items]


def baseline_route_single(items) -> list[str]:
    """Luôn trả direct_chat."""
    return ["direct_chat" for _ in items]


def baseline_route_compound(items) -> list[list[str]]:
    """Luôn trả 1 bước duy nhất ["direct_chat"] cho mọi compound item."""
    return [["direct_chat"] for _ in items]
