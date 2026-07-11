from anthropic import Anthropic, AsyncAnthropic

from core.metering import record_usage

Message = dict  # {"role": "user"|"assistant"|"system", "content": str | list}


def build_request(
    messages: list[Message],
    *,
    model: str,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> dict:
    """Build Anthropic Messages API request params from a messages list with an
    embedded system role. Shared by complete() (live call) and any batch-eval
    code path — keeps both producing byte-identical requests so eval scripts
    test the exact same prompt the live app would send.

    Strips system-role messages from the list and passes them via system=.
    """
    system = ""
    filtered: list[Message] = []
    for m in messages:
        if m["role"] == "system":
            system = m["content"]
        else:
            filtered.append(m)

    return {
        "model": model,
        "max_tokens": max_tokens,
        "system": system or "You are a helpful astronomy expert.",
        "messages": filtered,
        "temperature": temperature,
    }


def extract_text(resp) -> str:
    """Extract the text content from a Messages API response object (works for
    both a live response and a batch result's reconstructed message)."""
    for block in resp.content:
        if hasattr(block, "text"):
            return block.text
    return ""


def call(params: dict, *, api_key: str) -> str:
    """Execute a pre-built request params dict against the live API, record
    usage, and return the extracted text. Shared by complete() and any caller
    that built its own request via build_request()."""
    client = Anthropic(api_key=api_key)
    resp = client.messages.create(**params)
    usage = getattr(resp, "usage", None)
    if usage is not None:
        record_usage(
            getattr(usage, "input_tokens", 0) or 0,
            getattr(usage, "output_tokens", 0) or 0,
        )
    return extract_text(resp)


def complete(
    messages: list[Message],
    *,
    api_key: str,
    model: str,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    """Synchronous single-turn completion via Anthropic.
    Strips system messages from the list and passes them via system= parameter."""
    params = build_request(messages, model=model, temperature=temperature, max_tokens=max_tokens)
    return call(params, api_key=api_key)


def _supports_extended_thinking(model: str) -> bool:
    """Check if model supports extended thinking."""
    name = model.lower()
    return "haiku" not in name


async def stream_react_step(
    messages: list[Message],
    *,
    api_key: str,
    model: str,
    tools: list[dict],
    system: str = "",
    budget_tokens: int = 5000,
) -> tuple[list, str]:
    """Single async ReAct step with tool use.

    Uses extended thinking (interleaved-thinking beta) when the model supports it
    (Sonnet/Opus). Falls back to standard tool use for Haiku.

    `system` may be a plain string or a list of content blocks (e.g. with
    cache_control) — passed through unchanged to the API, which accepts both.

    Returns (content_blocks, stop_reason). Content blocks are Anthropic SDK
    objects with .type in: 'thinking' | 'tool_use' | 'text'.
    """
    client = AsyncAnthropic(api_key=api_key)
    common = dict(
        model=model,
        system=system or "You are a helpful astronomy expert.",
        messages=messages,
        tools=tools,
    )
    if _supports_extended_thinking(model):
        resp = await client.beta.messages.create(
            **common,
            max_tokens=16000,
            thinking={"type": "enabled", "budget_tokens": budget_tokens},
            betas=["interleaved-thinking-2025-05-14"],
        )
    else:
        resp = await client.messages.create(**common, max_tokens=4096)
    usage = getattr(resp, "usage", None)
    if usage is not None:
        record_usage(
            getattr(usage, "input_tokens", 0) or 0,
            getattr(usage, "output_tokens", 0) or 0,
        )
    return resp.content, resp.stop_reason
