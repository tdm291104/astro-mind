import re

from anthropic import AsyncAnthropic

from core.metering import record_usage
from core.models import Chunk, locator_label

from . import llm

SYSTEM_PROMPT = (
    "Bạn đang giúp người dùng hiểu tài liệu thiên văn học của họ. "
    "Trả lời dựa trên các đoạn trích được cung cấp — không suy đoán ngoài phạm vi đó.\n\n"
    "Chèn marker [N] ngay sau mệnh đề có nguồn gốc, "
    'ví dụ: "TRAPPIST-1e được phát hiện năm 2017 [1]."\n'
    "Nếu tài liệu không đủ thông tin để trả lời, nói thẳng điều đó thay vì suy đoán.\n"
    "Không dùng emoji. Trả lời bằng ngôn ngữ của câu hỏi (mặc định tiếng Việt)."
)

_MARKER_RE = re.compile(r"\[(\d+)\]")


def build_user_prompt(question: str, chunks: list[tuple[Chunk, str]]) -> str:
    blocks: list[str] = []
    for i, (chunk, doc_name) in enumerate(chunks, start=1):
        loc = locator_label(chunk.page_number, chunk.section_title)
        blocks.append(f"[{i}] (Nguồn: {doc_name}, {loc})\n{chunk.content}")
    sources = "\n\n".join(blocks)
    return f"Câu hỏi: {question}\n\nCác đoạn trích:\n\n{sources}"


def extract_used_markers(answer: str) -> set[int]:
    return {int(m) for m in _MARKER_RE.findall(answer)}


def build_request(question: str, chunks: list[tuple[Chunk, str]], *, model: str) -> dict:
    """Build the Anthropic request params for a synthesize() call — reusable by
    both the live path (synthesize()) and batch-eval code, so both send the
    exact same prompt."""
    user_prompt = build_user_prompt(question, chunks)
    return llm.build_request(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model=model,
        temperature=0.2,
    )


def parse_response(raw_text: str) -> tuple[str, set[int]]:
    """Parse a synthesize() response's raw text into (answer_text, used_markers)."""
    return raw_text, extract_used_markers(raw_text)


def synthesize(
    question: str,
    chunks: list[tuple[Chunk, str]],
    *,
    api_key: str | None,
    model: str,
    dry_run: bool = False,
) -> tuple[str, set[int]]:
    """Return (answer_text, set_of_used_marker_indices).

    In dry_run mode, returns the assembled user prompt as the answer and an empty
    used set — used by tests to verify prompt structure without calling Claude.
    """
    user_prompt = build_user_prompt(question, chunks)
    if dry_run:
        return user_prompt, set()

    if not api_key:
        raise ValueError("api_key is required when dry_run=False")

    params = build_request(question, chunks, model=model)
    raw_text = llm.call(params, api_key=api_key)
    return parse_response(raw_text)


async def stream_synthesize(
    question: str,
    chunks: list[tuple[Chunk, str]],
    *,
    api_key: str,
    model: str,
):
    """Stream a document-grounded answer token-by-token via the Anthropic API.

    Yields text deltas as they arrive. Records token usage on completion via
    core.metering.record_usage(). Does not extract citation markers — call
    extract_used_markers() on the concatenated output afterwards.
    """
    user_prompt = build_user_prompt(question, chunks)
    client = AsyncAnthropic(api_key=api_key)
    async with client.messages.stream(
        model=model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        temperature=0.2,
    ) as stream:
        async for delta in stream.text_stream:
            yield delta
        final = await stream.get_final_message()

    usage = getattr(final, "usage", None)
    if usage is not None:
        record_usage(getattr(usage, "input_tokens", 0) or 0, getattr(usage, "output_tokens", 0) or 0)
