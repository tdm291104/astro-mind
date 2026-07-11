from . import llm

MAX_TURNS = 20  # a turn = one user message + one assistant reply


class ConversationMemory:
    """In-RAM sliding window of the last `max_turns` user/assistant pairs."""

    def __init__(self, max_turns: int = MAX_TURNS):
        self.max_turns = max_turns
        self._messages: list[llm.Message] = []

    def add_user(self, content: str, image_url: str | None = None) -> None:
        msg: llm.Message = {"role": "user", "content": content}
        if image_url:
            msg["image_url"] = image_url  # type: ignore[typeddict-unknown-key]
        self._messages.append(msg)

    def add_assistant(self, content: str) -> None:
        self._messages.append({"role": "assistant", "content": content})
        self._trim()

    def _trim(self) -> None:
        excess = len(self._messages) - self.max_turns * 2
        if excess > 0:
            self._messages = self._messages[excess:]

    def messages(self) -> list[llm.Message]:
        return list(self._messages)


TITLE_SYSTEM_PROMPT = (
    "Đặt tiêu đề ngắn (tối đa 6 từ) tóm tắt nội dung tin nhắn sau. "
    "Dùng cùng ngôn ngữ với tin nhắn (mặc định tiếng Việt). "
    "Nếu có ảnh, tiêu đề nên nêu thiên thể hoặc hiện tượng trong ảnh. "
    "Chỉ trả về tiêu đề, không dấu ngoặc kép, không giải thích."
)

IMAGE_TITLE_FALLBACK = "Phân tích ảnh thiên văn"


def generate_title(
    first_message: str,
    *,
    api_key: str | None,
    model: str,
    dry_run: bool = False,
    image_data: str | None = None,
) -> str:
    """A short conversation title. Falls back to the truncated message on dry-run or any failure."""
    fallback = first_message.strip()[:60] or (IMAGE_TITLE_FALLBACK if image_data else "")
    if not fallback:
        return "Hội thoại mới"
    if dry_run:
        return fallback

    user_content: str | list
    if image_data:
        media_type = "image/jpeg"
        raw_b64 = image_data
        if "base64," in image_data:
            header, raw_b64 = image_data.split(",", 1)
            if ":" in header and ";" in header:
                media_type = header.split(":")[1].split(";")[0]
        user_content = [
            {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": raw_b64}},
            {"type": "text", "text": first_message.strip() or "(image only, no text)"},
        ]
    else:
        user_content = first_message

    try:
        title = llm.complete(
            [{"role": "system", "content": TITLE_SYSTEM_PROMPT},
             {"role": "user", "content": user_content}],
            api_key=api_key, model=model, temperature=0.3,
        ).strip().strip('"')
    except Exception:  # noqa: BLE001 - any LLM failure → fallback
        title = ""
    return title[:60] if title else fallback


def memory_from_messages(messages: list[dict]) -> ConversationMemory:
    """Rebuild a ConversationMemory from stored {role, content} messages (in order)."""
    mem = ConversationMemory()
    for m in messages:
        if m["role"] == "user":
            mem.add_user(m["content"], image_url=m.get("image_url"))
        elif m["role"] == "assistant":
            mem.add_assistant(m["content"])
    return mem
