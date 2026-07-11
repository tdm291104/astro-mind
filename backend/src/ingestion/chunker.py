import re

import tiktoken

from core.models import Chunk, SourceBlock

_ENC = tiktoken.get_encoding("cl100k_base")
_SEP_TOKENS = _ENC.encode("\n\n")


def _toks(s: str) -> list[int]:
    return _ENC.encode(s)


def _detok(tokens: list[int]) -> str:
    return _ENC.decode(tokens)


def _make_chunk(
    *,
    doc_id: str,
    tokens: list[int],
    page: int | None,
    section: str | None,
    chunk_index: int,
) -> Chunk:
    return Chunk(
        doc_id=doc_id,
        content=_detok(tokens),
        page_number=page,
        chunk_index=chunk_index,
        token_count=len(tokens),
        section_title=section,
    )


def _token_windows(tokens: list[int], max_tokens: int, overlap: int) -> list[list[int]]:
    """Slice tokens into <= max_tokens windows; consecutive windows share `overlap` tokens."""
    step = max_tokens - overlap  # overlap < max_tokens (e.g. 50 < 512) → step > 0
    windows: list[list[int]] = []
    i, n = 0, len(tokens)
    while i < n:
        windows.append(tokens[i : i + max_tokens])
        if i + max_tokens >= n:
            break
        i += step
    return windows


def chunk_blocks(
    blocks: list[SourceBlock],
    *,
    doc_id: str,
    max_tokens: int = 512,
    overlap: int = 50,
) -> list[Chunk]:
    """Split blocks into chunks of <= max_tokens. Chunks never cross a block boundary.

    A block is one page (PDF) or one section (DOCX). Each emitted chunk inherits its
    block's page and section locators.

    Strategy:
      1. Split each block on blank-line paragraph boundaries.
      2. Pack paragraphs into a chunk until adding another would exceed max_tokens.
      3. When emitting a chunk, the next chunk in the same block starts with the
         trailing `overlap` tokens of the emitted chunk.
      4. A single paragraph larger than max_tokens is split into <= max_tokens
         token windows (sharing `overlap` tokens), so no oversized chunk is
         emitted. (The overlap carry-over in step 3 can still push a packed chunk
         up to ~overlap tokens over max_tokens; that is bounded and pre-existing.)
    """
    chunks: list[Chunk] = []
    chunk_idx = 0

    for block in blocks:
        paras = [p.strip() for p in re.split(r"\n\s*\n", block.text) if p.strip()]
        if not paras:
            continue

        current: list[int] = []
        for para in paras:
            para_toks = _toks(para)

            if len(para_toks) > max_tokens:
                # Oversized paragraph: flush the packed chunk, then emit the
                # paragraph as standalone token windows (each <= max_tokens).
                if current:
                    chunks.append(
                        _make_chunk(
                            doc_id=doc_id, tokens=current, page=block.page,
                            section=block.section, chunk_index=chunk_idx,
                        )
                    )
                    chunk_idx += 1
                    current = []
                for window in _token_windows(para_toks, max_tokens, overlap):
                    chunks.append(
                        _make_chunk(
                            doc_id=doc_id, tokens=window, page=block.page,
                            section=block.section, chunk_index=chunk_idx,
                        )
                    )
                    chunk_idx += 1
                continue

            sep = _SEP_TOKENS if current else []

            if not current or len(current) + len(sep) + len(para_toks) <= max_tokens:
                current = current + sep + para_toks
                continue

            chunks.append(
                _make_chunk(
                    doc_id=doc_id, tokens=current, page=block.page,
                    section=block.section, chunk_index=chunk_idx,
                )
            )
            chunk_idx += 1
            tail = current[-overlap:] if 0 < overlap < len(current) else list(current)
            current = tail + _SEP_TOKENS + para_toks

        if current:
            chunks.append(
                _make_chunk(
                    doc_id=doc_id, tokens=current, page=block.page,
                    section=block.section, chunk_index=chunk_idx,
                )
            )
            chunk_idx += 1

    return chunks
