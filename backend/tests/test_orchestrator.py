"""Kiểm thử OrchestratorAgent — cache_control cho system prompt + tools."""
from agents.orchestrator import _build_system_prompt, _SYSTEM_PROMPT_BODY
from agents.tools import ORCHESTRATOR_TOOLS


def test_build_system_prompt_returns_list_of_blocks():
    blocks = _build_system_prompt()
    assert isinstance(blocks, list)
    assert len(blocks) == 2


def test_build_system_prompt_first_block_has_date_no_cache():
    blocks = _build_system_prompt()
    assert "Ngày hiện tại:" in blocks[0]["text"]
    assert "cache_control" not in blocks[0]


def test_build_system_prompt_second_block_is_cached_body():
    blocks = _build_system_prompt()
    assert blocks[1]["text"] == _SYSTEM_PROMPT_BODY
    assert blocks[1]["cache_control"] == {"type": "ephemeral"}


def test_orchestrator_tools_last_entry_has_cache_control():
    assert ORCHESTRATOR_TOOLS[-1]["cache_control"] == {"type": "ephemeral"}


def test_orchestrator_tools_other_entries_have_no_cache_control():
    for tool in ORCHESTRATOR_TOOLS[:-1]:
        assert "cache_control" not in tool
