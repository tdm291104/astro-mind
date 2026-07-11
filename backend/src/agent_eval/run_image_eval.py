from __future__ import annotations

import argparse
import asyncio
import base64
import json
import time
from pathlib import Path

import httpx

from agent_eval.batch_runner import run_batch_sync
from agent_eval.harness import build_eval_resources, sample_per_group
from agent_eval.metrics import classification_accuracy
from agent_eval.schema import load_image_eval

_RESULTS_PATH = Path(__file__).parent / "results" / "run_image_eval.json"
_RESULTS_DIR = Path(__file__).parent / "results"


def _download_images(items) -> dict[str, str]:
    """Download each item's image and return item_id -> base64 data URL."""
    data_urls: dict[str, str] = {}
    for item in items:
        resp = httpx.get(item.image_url, timeout=20.0, follow_redirects=True)
        resp.raise_for_status()
        data_urls[item.id] = "data:image/jpeg;base64," + base64.b64encode(resp.content).decode()
    return data_urls


def _stage1_requests(items, data_urls: dict[str, str], model: str) -> list[dict]:
    from agents.image_agent import build_stage1_request

    return [
        {"custom_id": item.id, "params": build_stage1_request(data_urls[item.id], "", model=model)}
        for item in items
    ]


def _stage2_requests(items, data_urls: dict[str, str], morph_by_id: dict, model: str) -> list[dict]:
    from agents.image_agent import build_stage2_request

    return [
        {
            "custom_id": item.id,
            "params": build_stage2_request(
                data_urls[item.id], "", morph_by_id[item.id].grouped_context, model=model,
            ),
        }
        for item in items
        if item.id in morph_by_id
    ]


def _extract_raw_texts(batch_results: dict) -> dict[str, str | None]:
    from agents.llm import extract_text

    return {
        custom_id: (extract_text(message) if message is not None else None)
        for custom_id, message in batch_results.items()
    }


def _save_raw_results(stage1_texts: dict, stage2_texts: dict) -> Path:
    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _RESULTS_DIR / f"run_image_eval_raw_combined_{int(time.time())}.json"
    path.write_text(json.dumps(
        {"stage1": stage1_texts, "stage2": stage2_texts}, ensure_ascii=False, indent=2,
    ))
    return path


def _save_usage(stage1_results: dict, stage2_results: dict, model: str) -> Path:
    from agent_eval.instrumentation import extract_usage, usage_record

    stage1_usage = {cid: extract_usage(m) for cid, m in stage1_results.items()}
    calls = [usage_record(call_type="stage1", model=model, is_batch=True, usage=stage1_usage)]
    if stage2_results:
        stage2_usage = {cid: extract_usage(m) for cid, m in stage2_results.items()}
        calls.append(usage_record(call_type="stage2", model=model, is_batch=True, usage=stage2_usage))
    path = _RESULTS_DIR / f"usage_image_{int(time.time())}.json"
    path.write_text(json.dumps({"calls": calls}, ensure_ascii=False, indent=2))
    return path


async def _run_morphology(items, stage1_texts: dict, data_urls: dict[str, str]) -> dict:
    """For items whose stage-1 result detected a galaxy, run the local CNN
    predictor (no API call) and return item_id -> MorphologyResult (only for
    items that needed it and got a non-None prediction)."""
    from agents.image_agent import _get_predictor, parse_response

    morph_by_id: dict = {}
    predictor = _get_predictor()
    for item in items:
        raw_text = stage1_texts.get(item.id)
        if raw_text is None:
            continue
        result = parse_response(raw_text)
        is_galaxy = any(obj.class_name.lower() == "galaxy" for obj in result.detected_objects)
        if not is_galaxy:
            continue
        morph = await predictor.predict(data_urls[item.id])
        if morph is not None:
            morph_by_id[item.id] = morph
    return morph_by_id


def _build_rows(items, stage1_texts: dict, stage2_texts: dict) -> list[dict]:
    from agents.image_agent import parse_response

    rows = []
    for item in items:
        stage2_text = stage2_texts.get(item.id)
        raw_text = stage2_text if stage2_text is not None else stage1_texts.get(item.id)
        result = parse_response(raw_text) if raw_text is not None else None
        if result and result.detected_objects:
            top = result.detected_objects[0]
            actual_class, actual_sub = top.class_name, top.sub_type
        else:
            actual_class, actual_sub = "", ""
        rows.append({
            "id": item.id, "nasa_id": item.nasa_id,
            "expected_class_name": item.expected_class_name, "expected_sub_type": item.expected_sub_type,
            "actual_class_name": actual_class, "actual_sub_type": actual_sub,
            "correct": actual_class == item.expected_class_name
            and (not item.expected_sub_type or actual_sub == item.expected_sub_type),
        })
    return rows


def _run(limit: int | None, use_cached_results: str | None) -> None:
    items = load_image_eval()
    items = sample_per_group(items, lambda it: it.expected_class_name, limit)

    if use_cached_results:
        cached = json.loads(Path(use_cached_results).read_text())
        stage1_texts, stage2_texts = cached["stage1"], cached["stage2"]
    else:
        resources = build_eval_resources()
        model = resources.settings.anthropic_model_light
        data_urls = _download_images(items)

        stage1_reqs = _stage1_requests(items, data_urls, model)
        stage1_results = run_batch_sync(stage1_reqs, api_key=resources.settings.anthropic_api_key)
        stage1_texts = _extract_raw_texts(stage1_results)

        morph_by_id = asyncio.run(_run_morphology(items, stage1_texts, data_urls))
        print(f"{len(morph_by_id)} item(s) need stage-2 morphology analysis.")

        stage2_texts: dict = {}
        stage2_results: dict = {}
        if morph_by_id:
            stage2_reqs = _stage2_requests(items, data_urls, morph_by_id, model)
            stage2_results = run_batch_sync(stage2_reqs, api_key=resources.settings.anthropic_api_key)
            stage2_texts = _extract_raw_texts(stage2_results)

        saved_path = _save_raw_results(stage1_texts, stage2_texts)
        print(f"Raw batch results saved to: {saved_path}")
        usage_path = _save_usage(stage1_results, stage2_results, model)
        print(f"Usage saved to: {usage_path}")

    rows = _build_rows(items, stage1_texts, stage2_texts)
    for row in rows:
        print(
            f"{row['id']}: expected={row['expected_class_name']}/{row['expected_sub_type']} "
            f"actual={row['actual_class_name']}/{row['actual_sub_type']} "
            f"{'OK' if row['correct'] else 'MISS'}"
        )

    expected = [(r["expected_class_name"], r["expected_sub_type"]) for r in rows]
    actual = [(r["actual_class_name"], r["actual_sub_type"]) for r in rows]
    accuracy = classification_accuracy(expected, actual)

    _RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _RESULTS_PATH.write_text(
        json.dumps({"rows": rows, "classification_accuracy": accuracy}, ensure_ascii=False, indent=2)
    )
    print(f"\nClassification Accuracy: {accuracy:.2%} ({sum(r['correct'] for r in rows)}/{len(rows)})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max items per class_name category")
    parser.add_argument(
        "--use-cached-results", type=str, default=None,
        help="Path to a previously-saved run_image_eval_raw_combined_*.json — recompute metrics without calling the API",
    )
    args = parser.parse_args()
    _run(args.limit, args.use_cached_results)


if __name__ == "__main__":
    main()
