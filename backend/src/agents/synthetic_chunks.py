import tiktoken

from core.models import Chunk

_ENC = tiktoken.get_encoding("cl100k_base")

_IMPORTANT_VALUES_GROUP_SIZE = 10


def _token_count(text: str) -> int:
    return len(_ENC.encode(text))


def _make_chunk(*, doc_id: str, content: str, page: int | None, section: str, chunk_index: int) -> Chunk:
    return Chunk(
        doc_id=doc_id,
        content=content,
        page_number=page,
        chunk_index=chunk_index,
        token_count=_token_count(content),
        section_title=section,
        chunk_type="analysis",
    )


def _overview_chunk(doc_id: str, analysis: dict, chunk_index: int) -> Chunk | None:
    summary = analysis.get("overall_summary") or ""
    insights = analysis.get("key_astronomy_insights") or []
    content = summary
    if insights:
        content += "\n\nCác phát hiện chính:\n" + "\n".join(f"- {i}" for i in insights)
    if not content.strip():
        return None
    return _make_chunk(doc_id=doc_id, content=content, page=None, section="Phân tích: Tổng quan", chunk_index=chunk_index)


def _celestial_object_chunks(doc_id: str, analysis: dict, start_index: int) -> list[Chunk]:
    chunks: list[Chunk] = []
    for i, obj in enumerate(analysis.get("celestial_objects") or []):
        name = obj.get("name", "")
        lines = [f"Thiên thể: {name} ({obj.get('type', '')})"]
        for k, v in (obj.get("properties") or {}).items():
            lines.append(f"- {k}: {v}")
        content = "\n".join(lines)
        chunks.append(_make_chunk(
            doc_id=doc_id, content=content, page=obj.get("page"),
            section=f"Phân tích: Thiên thể — {name}", chunk_index=start_index + i,
        ))
    return chunks


def _table_chunks(doc_id: str, analysis: dict, start_index: int) -> list[Chunk]:
    chunks: list[Chunk] = []
    for i, t in enumerate(analysis.get("tables_extracted") or []):
        title = t.get("title", "")
        lines = [f"Bảng: {title}"]
        if t.get("summary"):
            lines.append(t["summary"])
        key_rows = t.get("key_rows") or []
        if key_rows:
            lines.append("Dữ liệu:")
            lines.extend(f"- {row}" for row in key_rows)
        content = "\n".join(lines)
        chunks.append(_make_chunk(
            doc_id=doc_id, content=content, page=t.get("page"),
            section=f"Phân tích: Bảng — {title}", chunk_index=start_index + i,
        ))
    return chunks


def _formula_chunks(doc_id: str, analysis: dict, start_index: int) -> list[Chunk]:
    chunks: list[Chunk] = []
    for i, f in enumerate(analysis.get("formulas") or []):
        expression = f.get("expression", "")
        lines = [f"Công thức: {expression}"]
        if f.get("context"):
            lines.append(f"Ngữ cảnh: {f['context']}")
        if f.get("meaning"):
            lines.append(f"Ý nghĩa: {f['meaning']}")
        content = "\n".join(lines)
        chunks.append(_make_chunk(
            doc_id=doc_id, content=content, page=f.get("page"),
            section=f"Phân tích: Công thức — {expression[:40]}", chunk_index=start_index + i,
        ))
    return chunks


def _important_value_chunks(doc_id: str, analysis: dict, start_index: int) -> list[Chunk]:
    values = analysis.get("important_values") or []
    chunks: list[Chunk] = []
    for i in range(0, len(values), _IMPORTANT_VALUES_GROUP_SIZE):
        group = values[i : i + _IMPORTANT_VALUES_GROUP_SIZE]
        lines = ["Các tham số quan trọng:"]
        for v in group:
            unit = f" {v['unit']}" if v.get("unit") else ""
            context = f" ({v['context']})" if v.get("context") else ""
            lines.append(f"- {v.get('name', '')}: {v.get('value', '')}{unit}{context}")
        content = "\n".join(lines)
        chunks.append(_make_chunk(
            doc_id=doc_id, content=content, page=None,
            section="Phân tích: Tham số quan trọng", chunk_index=start_index + len(chunks),
        ))
    return chunks


def _references_chunk(doc_id: str, analysis: dict, chunk_index: int) -> Chunk | None:
    refs = analysis.get("references") or []
    if not refs:
        return None
    lines = ["Tài liệu tham khảo:"]
    for r in refs:
        bits = [r.get("paper", "")]
        if r.get("citation_key"):
            bits.append(f"({r['citation_key']})")
        if r.get("link"):
            bits.append(r["link"])
        lines.append("- " + " ".join(b for b in bits if b))
    content = "\n".join(lines)
    return _make_chunk(doc_id=doc_id, content=content, page=None, section="Phân tích: Tài liệu tham khảo", chunk_index=chunk_index)


def _fits_analysis_chunk(doc_id: str, analysis: dict, chunk_index: int) -> Chunk | None:
    fits = analysis.get("fits_analysis")
    if not fits:
        return None
    lines = ["Phân tích header FITS:"]
    for k, v in fits.items():
        lines.append(f"- {k}: {v}")
    content = "\n".join(lines)
    return _make_chunk(doc_id=doc_id, content=content, page=None, section="Phân tích: FITS Header", chunk_index=chunk_index)


def build_synthetic_chunks(doc_id: str, analysis: dict) -> list[Chunk]:
    """Converts an analysis JSON dict into Chunk(chunk_type="analysis") objects
    (see Part 4 of docs/superpowers/specs/2026-06-10-hierarchical-document-analysis-design.md)."""
    chunks: list[Chunk] = []
    idx = 0

    overview = _overview_chunk(doc_id, analysis, idx)
    if overview is not None:
        chunks.append(overview)
        idx += 1

    for builder in (_celestial_object_chunks, _table_chunks, _formula_chunks, _important_value_chunks):
        new_chunks = builder(doc_id, analysis, idx)
        chunks.extend(new_chunks)
        idx += len(new_chunks)

    references = _references_chunk(doc_id, analysis, idx)
    if references is not None:
        chunks.append(references)
        idx += 1

    fits_chunk = _fits_analysis_chunk(doc_id, analysis, idx)
    if fits_chunk is not None:
        chunks.append(fits_chunk)
        idx += 1

    return chunks
