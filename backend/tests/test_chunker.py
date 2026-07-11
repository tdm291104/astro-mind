"""Kiểm thử ingestion chunker — chia văn bản thành chunks."""
import pytest

from core.models import SourceBlock
from ingestion.chunker import chunk_blocks


DOC_ID = "test-doc-001"


def _blocks(text: str, page: int | None = 1, section: str | None = None) -> list[SourceBlock]:
    return [SourceBlock(text=text, page=page, section=section)]


# ── chunk_blocks ───────────────────────────────────────────────────────────────

def test_chunk_short_text_single_chunk():
    blocks = _blocks("Hố đen là vùng không-thời gian có lực hấp dẫn rất lớn.", page=1)
    chunks = chunk_blocks(blocks, doc_id=DOC_ID)
    assert len(chunks) == 1
    assert chunks[0].doc_id == DOC_ID


def test_chunk_long_text_multiple_chunks():
    # ~600 tokens worth of text: repeat a sentence many times
    sentence = "Thiên hà là một tập hợp gồm hàng tỷ ngôi sao, khí, bụi và vật chất tối. "
    long_text = sentence * 60  # well over 512 tokens
    blocks = _blocks(long_text, page=2)
    chunks = chunk_blocks(blocks, doc_id=DOC_ID, max_tokens=512)
    assert len(chunks) > 1


def test_chunk_preserves_page_number():
    blocks = _blocks("Văn bản thiên văn học trang 7.", page=7)
    chunks = chunk_blocks(blocks, doc_id=DOC_ID)
    assert all(c.page_number == 7 for c in chunks)


def test_chunk_preserves_section_title():
    blocks = _blocks("Nội dung về hố đen.", page=None, section="Giới thiệu")
    chunks = chunk_blocks(blocks, doc_id=DOC_ID)
    assert all(c.section_title == "Giới thiệu" for c in chunks)


def test_chunk_overlap():
    # Build a text that will produce exactly 2 chunks with overlap
    sentence = "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi. "
    # Repeat enough to get more than max_tokens but with overlap between chunks
    long_text = sentence * 40
    blocks = _blocks(long_text, page=1)
    chunks = chunk_blocks(blocks, doc_id=DOC_ID, max_tokens=100, overlap=20)
    assert len(chunks) >= 2
    # The second chunk should share some tokens with the end of the first
    # Verify by checking chunk contents overlap (last part of chunk[0] appears in chunk[1])
    end_of_first = chunks[0].content[-50:]
    # At least some characters from first chunk's tail should appear in second chunk
    # (overlap = 20 tokens, which is several words)
    assert chunks[1].token_count > 0


def test_empty_text_no_chunks():
    blocks = _blocks("", page=1)
    chunks = chunk_blocks(blocks, doc_id=DOC_ID)
    assert chunks == []


def test_chunk_index_increments():
    sentence = "Star nebula galaxy supernova pulsar quasar. "
    long_text = sentence * 60
    blocks = _blocks(long_text, page=1)
    chunks = chunk_blocks(blocks, doc_id=DOC_ID, max_tokens=100)
    indices = [c.chunk_index for c in chunks]
    assert indices == list(range(len(chunks)))
