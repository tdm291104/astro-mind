"""Kiểm thử ConversationMemory và generate_title."""
from unittest.mock import patch, MagicMock

import pytest

from agents.conversation import ConversationMemory, generate_title, memory_from_messages


# ── ConversationMemory ─────────────────────────────────────────────────────────

def test_add_user_and_assistant():
    mem = ConversationMemory()
    mem.add_user("Hố đen là gì?")
    mem.add_assistant("Hố đen là vùng không-thời gian có lực hút cực mạnh.")
    msgs = mem.messages()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "Hố đen là gì?"
    assert msgs[1]["role"] == "assistant"
    assert msgs[1]["content"] == "Hố đen là vùng không-thời gian có lực hút cực mạnh."


def test_sliding_window_trims_old_messages():
    mem = ConversationMemory(max_turns=20)
    for i in range(25):
        mem.add_user(f"user {i}")
        mem.add_assistant(f"assistant {i}")
    msgs = mem.messages()
    assert len(msgs) == 40  # 20 turns * 2


def test_messages_returns_copy():
    mem = ConversationMemory()
    mem.add_user("test")
    mem.add_assistant("reply")
    copy1 = mem.messages()
    copy1.clear()
    assert len(mem.messages()) == 2


def test_image_url_stored_in_user_message():
    mem = ConversationMemory()
    mem.add_user("What is this?", image_url="/images/galaxy.jpg")
    msgs = mem.messages()
    assert msgs[0].get("image_url") == "/images/galaxy.jpg"


# ── generate_title ─────────────────────────────────────────────────────────────

def test_generate_title_dry_run():
    title = generate_title(
        "Hố đen Sagittarius A*",
        api_key=None,
        model="any-model",
        dry_run=True,
    )
    assert title == "Hố đen Sagittarius A*"


def test_generate_title_dry_run_truncates():
    long_msg = "A" * 100
    title = generate_title(long_msg, api_key=None, model="any", dry_run=True)
    assert len(title) <= 60


def test_generate_title_empty_fallback():
    title = generate_title("", api_key=None, model="any", dry_run=True)
    assert title == "Hội thoại mới"


# ── memory_from_messages ───────────────────────────────────────────────────────

def test_memory_from_messages_rebuilds():
    raw = [
        {"role": "user", "content": "x"},
        {"role": "assistant", "content": "y"},
    ]
    mem = memory_from_messages(raw)
    msgs = mem.messages()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"


def test_memory_from_messages_image_url():
    raw = [
        {"role": "user", "content": "What is in this image?", "image_url": "/images/nebula.jpg"},
        {"role": "assistant", "content": "It is a nebula."},
    ]
    mem = memory_from_messages(raw)
    msgs = mem.messages()
    assert msgs[0].get("image_url") == "/images/nebula.jpg"
