"""Kiểm thử batch_runner.py — submit/poll/fetch Anthropic Message Batches (mocked)."""
from unittest.mock import MagicMock, patch

from agent_eval.batch_runner import (
    fetch_batch_results,
    run_batch_sync,
    submit_batch,
    wait_for_batch,
)


def test_submit_batch_returns_id():
    mock_batch = MagicMock()
    mock_batch.id = "batch_123"
    with patch("agent_eval.batch_runner.anthropic.Anthropic") as mock_client_cls:
        mock_client_cls.return_value.messages.batches.create.return_value = mock_batch
        batch_id = submit_batch([{"custom_id": "a", "params": {}}], api_key="key")
    assert batch_id == "batch_123"
    mock_client_cls.return_value.messages.batches.create.assert_called_once_with(
        requests=[{"custom_id": "a", "params": {}}],
    )


def test_wait_for_batch_polls_until_ended(monkeypatch):
    batch_in_progress = MagicMock(processing_status="in_progress")
    batch_ended = MagicMock(processing_status="ended")
    monkeypatch.setattr("agent_eval.batch_runner.time.sleep", lambda _: None)
    with patch("agent_eval.batch_runner.anthropic.Anthropic") as mock_client_cls:
        mock_client_cls.return_value.messages.batches.retrieve.side_effect = [
            batch_in_progress, batch_in_progress, batch_ended,
        ]
        wait_for_batch("batch_123", api_key="key", poll_interval_s=0)
    assert mock_client_cls.return_value.messages.batches.retrieve.call_count == 3


def test_wait_for_batch_raises_on_timeout(monkeypatch):
    batch_in_progress = MagicMock(processing_status="in_progress")
    monkeypatch.setattr("agent_eval.batch_runner.time.sleep", lambda _: None)
    with patch("agent_eval.batch_runner.anthropic.Anthropic") as mock_client_cls:
        mock_client_cls.return_value.messages.batches.retrieve.return_value = batch_in_progress
        try:
            wait_for_batch("batch_123", api_key="key", poll_interval_s=10, timeout_s=15)
            raised = False
        except TimeoutError:
            raised = True
    assert raised


def test_fetch_batch_results_keys_by_custom_id_succeeded_and_errored():
    succeeded = MagicMock(type="succeeded", message="MSG_A")
    errored = MagicMock(type="errored")
    entry_a = MagicMock(custom_id="a", result=succeeded)
    entry_b = MagicMock(custom_id="b", result=errored)
    with patch("agent_eval.batch_runner.anthropic.Anthropic") as mock_client_cls:
        mock_client_cls.return_value.messages.batches.results.return_value = [entry_a, entry_b]
        results = fetch_batch_results("batch_123", api_key="key")
    assert results == {"a": "MSG_A", "b": None}


def test_run_batch_sync_submits_waits_and_fetches(monkeypatch):
    mock_batch = MagicMock()
    mock_batch.id = "batch_456"
    mock_batch.processing_status = "ended"
    succeeded = MagicMock(type="succeeded", message="MSG")
    entry = MagicMock(custom_id="x", result=succeeded)
    monkeypatch.setattr("agent_eval.batch_runner.time.sleep", lambda _: None)
    with patch("agent_eval.batch_runner.anthropic.Anthropic") as mock_client_cls:
        client = mock_client_cls.return_value
        client.messages.batches.create.return_value = mock_batch
        client.messages.batches.retrieve.return_value = mock_batch
        client.messages.batches.results.return_value = [entry]
        result = run_batch_sync([{"custom_id": "x", "params": {}}], api_key="key", poll_interval_s=0)
    assert result == {"x": "MSG"}
