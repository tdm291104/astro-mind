from __future__ import annotations

import time
from typing import Any

import anthropic


def submit_batch(requests: list[dict], *, api_key: str) -> str:
    """Submit a list of {"custom_id": str, "params": dict} requests as one
    Anthropic Message Batch. `params` is a standard Messages API request body
    (model/system/messages/...), exactly what build_request()-style helpers in
    agents/*.py produce. Returns the batch_id."""
    client = anthropic.Anthropic(api_key=api_key)
    batch = client.messages.batches.create(requests=requests)
    return batch.id


def wait_for_batch(
    batch_id: str, *, api_key: str, poll_interval_s: int = 20, timeout_s: int = 3600,
) -> None:
    """Poll until the batch's processing_status is 'ended'. Raises TimeoutError
    if it doesn't finish within timeout_s (default 1 hour, matching Anthropic's
    typical completion window — most batches finish well under this)."""
    client = anthropic.Anthropic(api_key=api_key)
    elapsed = 0
    while True:
        batch = client.messages.batches.retrieve(batch_id)
        if batch.processing_status == "ended":
            return
        if elapsed >= timeout_s:
            raise TimeoutError(f"Batch {batch_id} did not finish within {timeout_s}s")
        time.sleep(poll_interval_s)
        elapsed += poll_interval_s


def fetch_batch_results(batch_id: str, *, api_key: str) -> dict[str, Any]:
    """Stream batch results, keyed by custom_id. Each value is the raw Message
    object on success (has .content like a live response, so
    agents.llm.extract_text() and every module's parse_response() work on it
    unchanged), or None if that item's request failed/expired/was canceled.

    Results may arrive in a different order than submitted — always match by
    custom_id, never by position (per Anthropic's documented behavior)."""
    client = anthropic.Anthropic(api_key=api_key)
    results: dict[str, Any] = {}
    for entry in client.messages.batches.results(batch_id):
        if entry.result.type == "succeeded":
            results[entry.custom_id] = entry.result.message
        else:
            results[entry.custom_id] = None
    return results


def run_batch_sync(
    requests: list[dict], *, api_key: str, poll_interval_s: int = 20, timeout_s: int = 3600,
) -> dict[str, Any]:
    """Submit, wait, and fetch results in one call — the common case for eval
    run-scripts. Returns custom_id -> Message (or None on failure)."""
    batch_id = submit_batch(requests, api_key=api_key)
    wait_for_batch(batch_id, api_key=api_key, poll_interval_s=poll_interval_s, timeout_s=timeout_s)
    return fetch_batch_results(batch_id, api_key=api_key)
