from __future__ import annotations

import asyncio

import anthropic

_SYSTEM = (
    "You are a content classifier for AstroMind, an astronomy assistant. "
    "Decide whether the user's input is relevant to AstroMind's domain.\n\n"
    "ACCEPT:\n"
    "- Astronomy, astrophysics, cosmology, space science\n"
    "- Celestial objects: stars, planets, galaxies, nebulae, black holes, comets, moons, asteroids\n"
    "- Space missions, telescopes, observatories, space agencies\n"
    "- Physics concepts relevant to space (gravity, light, radiation, dark matter, etc.)\n"
    "- Astronomical images or phenomena\n"
    "- Conversational messages: greetings, thanks, follow-up questions about previous topics\n"
    "- Questions about AstroMind itself: 'who are you', 'what can you do', 'bạn là ai', "
    "'bạn có thể làm gì', 'giới thiệu bản thân' — these are always relevant\n"
    "- If a [Previous conversation] block is included, judge the new message in that "
    "context — a short reply or request (e.g. 'tổng hợp lại', 'tạo báo cáo', 'không, tôi không biết') "
    "is relevant if the previous conversation was about astronomy\n"
    "- If an [Attached documents] block is included, requests operating on those document(s) "
    "(summarize, translate, explain, extract, compare, answer questions about them) are relevant "
    "even if the request text itself doesn't mention astronomy — the documents were already "
    "validated as astronomy-related at upload time\n\n"
    "REJECT:\n"
    "- Cooking, food, recipes\n"
    "- Politics, news, sports, entertainment\n"
    "- Personal advice, health, finance, law\n"
    "- Programming, software development (unless about astronomy software)\n"
    "- Creative writing, art unrelated to space\n"
    "- Any topic clearly unrelated to space science\n\n"
    "If an image is provided, also check whether it looks like an astronomical image "
    "(galaxy, nebula, planet, star field, telescope photo, space mission image, etc.).\n\n"
    "Reply with exactly one word: YES or NO."
)

_REJECT_MESSAGE = (
    "Câu hỏi này nằm ngoài phạm vi của mình. AstroMind chuyên về thiên văn học, "
    "vật lý thiên văn và khoa học vũ trụ — hãy hỏi về hố đen, thiên hà, hành tinh, "
    "sao chổi hay bất kỳ điều gì về vũ trụ nhé!"
)

_DOCUMENT_SYSTEM = (
    "You are a content classifier for AstroMind, an astronomy assistant. "
    "Decide whether the following document excerpt is relevant to AstroMind's domain: "
    "astronomy, astrophysics, cosmology, space science, space missions, telescopes, "
    "observatories, or physics concepts relevant to space (gravity, light, radiation, "
    "dark matter, etc.).\n\n"
    "Reply with exactly one word: YES or NO."
)

_REJECT_DOCUMENT_MESSAGE = (
    "Tài liệu này không thuộc lĩnh vực thiên văn học. "
    "AstroMind hỗ trợ tài liệu về thiên văn học, vật lý thiên văn và khoa học vũ trụ."
)


def build_classify_content(
    text: str,
    image_data: str | None,
    history: list[dict] | None = None,
    doc_names: list[str] | None = None,
) -> list:
    """Build the Anthropic message content blocks for is_relevant() — the exact
    prompt-assembly logic the live guard uses, factored out so batch-eval code
    builds byte-identical requests instead of duplicating this logic."""
    content: list = []

    if image_data:
        media_type = "image/jpeg"
        raw_b64 = image_data
        if "base64," in image_data:
            header, raw_b64 = image_data.split(",", 1)
            if ":" in header and ";" in header:
                media_type = header.split(":")[1].split(";")[0]
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": raw_b64},
        })

    text_value = text.strip() or "(image only, no text)"
    if doc_names:
        docs_text = ", ".join(doc_names)
        text_value = f"[Attached documents: {docs_text}]\n\n{text_value}"
    if history:
        history_lines = [
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in history[-4:]
            if isinstance(m.get("content"), str) and m["content"].strip()
        ]
        if history_lines:
            history_text = "\n".join(history_lines)
            text_value = (
                f"[Previous conversation]\n{history_text}\n[End previous conversation]\n\n"
                f"New message: {text_value}"
            )

    content.append({"type": "text", "text": text_value})
    return content


def build_request(system: str, content, *, model: str) -> dict:
    """Build the Anthropic request params for a guard classification call —
    max_tokens=5, single user turn. Reusable by both the live path (_classify)
    and batch-eval code."""
    return {
        "model": model,
        "max_tokens": 5,
        "system": system,
        "messages": [{"role": "user", "content": content}],
    }


def parse_response(raw_text: str) -> bool:
    """True if the model answered YES. Takes raw text (not a Message object) —
    consistent with every other module's parse_response in this codebase, and
    works identically whether the text came from a live call, a batch result,
    or a cached replay file."""
    return raw_text.strip().upper().startswith("YES")


async def _classify(system: str, content, api_key: str, model: str) -> bool:
    """Call Claude with max_tokens=5 and return True if it answers YES.

    Fails open (returns True) on API errors to avoid blocking valid requests/uploads.
    """
    client = anthropic.Anthropic(api_key=api_key)
    try:
        response = await asyncio.to_thread(
            client.messages.create, **build_request(system, content, model=model),
        )
        return parse_response(response.content[0].text)
    except Exception:
        return True  # fail open — never block on guard errors


class InputGuard:
    async def is_relevant(
        self,
        text: str,
        image_data: str | None,
        api_key: str,
        model: str,
        history: list[dict] | None = None,
        doc_names: list[str] | None = None,
    ) -> bool:
        """Return True if input is astronomy-related or benign/conversational.

        `history` is the recent conversation (list of {"role", "content"} dicts) —
        used so follow-ups ("tổng hợp lại", "không, tôi không biết") are judged in
        context instead of as standalone, topic-less messages.

        `doc_names` are the names of documents attached to this request — requests
        operating on them are relevant regardless of topic, since they were already
        validated as astronomy-related at upload time.

        Fails open (returns True) on API errors to avoid blocking valid requests.
        """
        content = build_classify_content(text, image_data, history=history, doc_names=doc_names)
        return await _classify(_SYSTEM, content, api_key, model)

    async def is_document_relevant(self, text: str, api_key: str, model: str) -> bool:
        """Return True if a document excerpt is astronomy-related.

        Fails open (returns True) on API errors so uploads aren't blocked by guard issues.
        """
        return await _classify(_DOCUMENT_SYSTEM, text[:4000], api_key, model)
