from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from agent_eval.batch_runner import run_batch_sync
from agent_eval.harness import build_eval_resources, sample_per_group
from agent_eval.metrics import guard_false_rates
from agent_eval.schema import load_guard_eval

_RESULTS_PATH = Path(__file__).parent / "results" / "run_guard_eval.json"
_RESULTS_DIR = Path(__file__).parent / "results"


def _build_requests(items, model: str) -> list[dict]:
    from agents.guard import _SYSTEM, build_classify_content, build_request

    requests = []
    for item in items:
        content = build_classify_content(item.text, None)
        params = build_request(_SYSTEM, content, model=model)
        requests.append({"custom_id": item.id, "params": params})
    return requests


def _extract_raw_texts(batch_results: dict) -> dict[str, str | None]:
    from agents.llm import extract_text

    return {
        custom_id: (extract_text(message) if message is not None else None)
        for custom_id, message in batch_results.items()
    }


def _save_raw_results(raw_texts: dict[str, str | None]) -> Path:
    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _RESULTS_DIR / f"run_guard_eval_raw_{int(time.time())}.json"
    path.write_text(json.dumps(raw_texts, ensure_ascii=False, indent=2))
    return path


def _save_usage(batch_results: dict, model: str) -> Path:
    from agent_eval.instrumentation import extract_usage, usage_record

    usage_by_id = {cid: extract_usage(m) for cid, m in batch_results.items()}
    record = usage_record(call_type="classify", model=model, is_batch=True, usage=usage_by_id)
    path = _RESULTS_DIR / f"usage_guard_{int(time.time())}.json"
    path.write_text(json.dumps({"calls": [record]}, ensure_ascii=False, indent=2))
    return path


def _build_rows(items, raw_texts: dict[str, str | None]) -> list[dict]:
    from agents.guard import parse_response

    rows = []
    for item in items:
        raw_text = raw_texts.get(item.id)
        # NOTE: InputGuard fails open on API errors (see InputGuard._classify);
        # the same convention applies here — a missing/failed batch item
        # (raw_text is None) is treated as accepted (True) rather than
        # crashing the run. A nonzero false_accept_rate can reflect a
        # transient batch failure rather than a genuine classifier miss —
        # spot-check actual_accept=True rows on expected_accept=False items
        # before citing them as a real classifier weakness.
        accepted = parse_response(raw_text) if raw_text is not None else True
        rows.append({
            "id": item.id, "text": item.text,
            "expected_accept": item.expected_accept, "actual_accept": accepted,
            "correct": accepted == item.expected_accept,
        })
    return rows


def _run(limit: int | None, use_cached_results: str | None) -> None:
    items = load_guard_eval()
    items = sample_per_group(items, lambda it: str(it.expected_accept), limit)

    if use_cached_results:
        raw_texts = json.loads(Path(use_cached_results).read_text())
    else:
        resources = build_eval_resources()
        requests = _build_requests(items, resources.settings.anthropic_model_light)
        batch_results = run_batch_sync(requests, api_key=resources.settings.anthropic_api_key)
        raw_texts = _extract_raw_texts(batch_results)
        saved_path = _save_raw_results(raw_texts)
        print(f"Raw batch results saved to: {saved_path}")
        usage_path = _save_usage(batch_results, resources.settings.anthropic_model_light)
        print(f"Usage saved to: {usage_path}")

    rows = _build_rows(items, raw_texts)
    for row in rows:
        print(
            f"{row['id']}: expected_accept={row['expected_accept']} actual={row['actual_accept']} "
            f"{'OK' if row['correct'] else 'MISS'}"
        )

    false_reject, false_accept = guard_false_rates(
        [r["expected_accept"] for r in rows], [r["actual_accept"] for r in rows],
    )

    _RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _RESULTS_PATH.write_text(json.dumps(
        {"rows": rows, "false_reject_rate": false_reject, "false_accept_rate": false_accept},
        ensure_ascii=False, indent=2,
    ))
    print(f"\nFalse Reject Rate: {false_reject:.2%}  False Accept Rate: {false_accept:.2%}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max items per expected_accept group")
    parser.add_argument(
        "--use-cached-results", type=str, default=None,
        help="Path to a previously-saved run_guard_eval_raw_*.json — recompute metrics without calling the API",
    )
    args = parser.parse_args()
    _run(args.limit, args.use_cached_results)


if __name__ == "__main__":
    main()
