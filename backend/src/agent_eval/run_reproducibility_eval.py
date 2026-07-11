from __future__ import annotations

import argparse
import asyncio
import json
import time
from pathlib import Path

from agent_eval.batch_runner import run_batch_sync
from agent_eval.harness import build_eval_resources, ensure_eval_user, sample_per_group
from agent_eval.repro_stats import modal_agreement_rate, score_stddev
from agent_eval.schema import load_guard_eval, load_notebook_eval, load_search_eval

_RESULTS_DIR = Path(__file__).parent / "results"


def _expand_requests(item_ids: list[str], params_by_id: dict[str, dict], n: int) -> list[dict]:
    """Tạo N bản custom_id `{item_id}_rep{i}` cho mỗi item, dùng cùng params
    đã build 1 lần — đo variance của model với CÙNG input, không phải input
    khác nhau."""
    return [
        {"custom_id": f"{item_id}_rep{i}", "params": params_by_id[item_id]}
        for item_id in item_ids for i in range(n)
    ]


def _group_by_item(raw_texts: dict, item_ids: list[str], n: int) -> dict[str, list]:
    return {item_id: [raw_texts.get(f"{item_id}_rep{i}") for i in range(n)] for item_id in item_ids}


# ---- target: classify (guard, batchable) ----

def _run_classify(limit: int, n: int) -> dict:
    from agents.guard import _SYSTEM, build_classify_content, build_request, parse_response
    from agents.llm import extract_text

    resources = build_eval_resources()
    items = sample_per_group(load_guard_eval(), lambda it: str(it.expected_accept), limit)
    model = resources.settings.anthropic_model_light

    params_by_id = {
        it.id: build_request(_SYSTEM, build_classify_content(it.text, None), model=model) for it in items
    }
    item_ids = [it.id for it in items]
    requests = _expand_requests(item_ids, params_by_id, n)
    batch_results = run_batch_sync(requests, api_key=resources.settings.anthropic_api_key)
    raw_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in batch_results.items()}
    grouped = _group_by_item(raw_texts, item_ids, n)

    rows = []
    for it in items:
        reps = [parse_response(t) if t is not None else None for t in grouped[it.id]]
        valid = [r for r in reps if r is not None]
        rows.append({"id": it.id, "repeats": reps, "agreement_rate": modal_agreement_rate(valid)})
    return {"target": "classify", "n_repeat": n, "rows": rows}


# ---- target: synthesize (notebook, batchable, cần bootstrap retrieval) ----

def _run_synthesize(limit: int, n: int) -> dict:
    from agent_eval.run_notebook_eval import _ingest_papers, _retrieve_for_items
    from agents.llm import extract_text
    from agents.synth import build_request, parse_response

    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    items = sample_per_group(load_notebook_eval(), lambda it: it.doc_label, limit)
    model = resources.settings.anthropic_model_light

    doc_ids = _ingest_papers(resources, user_id)
    retrieval_by_id = _retrieve_for_items(items, resources, doc_ids, user_id)
    valid_items = [it for it in items if retrieval_by_id.get(it.id) is not None]

    params_by_id = {}
    for it in valid_items:
        chunks_with_doc, _ = retrieval_by_id[it.id]
        params_by_id[it.id] = build_request(it.question, chunks_with_doc, model=model)

    item_ids = [it.id for it in valid_items]
    requests = _expand_requests(item_ids, params_by_id, n)
    batch_results = run_batch_sync(requests, api_key=resources.settings.anthropic_api_key)
    raw_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in batch_results.items()}
    grouped = _group_by_item(raw_texts, item_ids, n)

    rows = []
    for it in valid_items:
        answers = [parse_response(t)[0] if t is not None else None for t in grouped[it.id]]
        rows.append({"id": it.id, "answers": answers})
    return {"target": "synthesize", "n_repeat": n, "rows": rows}


# ---- target: judge (report, batchable, tái dùng report đã viết sẵn) ----

def _run_judge(limit: int, n: int) -> dict:
    from agent_eval.judges import build_request, parse_response
    from agents.llm import extract_text

    path = _RESULTS_DIR / "run_report_eval.json"
    if not path.exists():
        raise SystemExit(
            "Chưa có results/run_report_eval.json — chạy "
            "`python -m agent_eval.run_report_eval --limit 1` trước."
        )
    data = json.loads(path.read_text())
    rows_src = data["rows"][:limit] if limit else data["rows"]

    resources = build_eval_resources()
    model = resources.settings.anthropic_model

    params_by_id = {r["id"]: build_request(r["text"], r["topic"], model=model) for r in rows_src}
    item_ids = [r["id"] for r in rows_src]
    requests = _expand_requests(item_ids, params_by_id, n)
    batch_results = run_batch_sync(requests, api_key=resources.settings.anthropic_api_key)
    raw_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in batch_results.items()}
    grouped = _group_by_item(raw_texts, item_ids, n)

    rows = []
    for r in rows_src:
        judges = [parse_response(t) if t is not None else None for t in grouped[r["id"]]]
        for dim in ("mach_lac", "van_phong", "do_sau"):
            scores = [j[dim] for j in judges if j is not None]
            rows.append({"id": r["id"], "dimension": dim, "scores": scores, "stddev": score_stddev(scores)})
    return {"target": "judge", "n_repeat": n, "rows": rows}


# ---- target: routing (search, LIVE — không batch được) ----

async def _run_routing(limit: int, n: int) -> dict:
    from core.metering import meter

    from agent_eval.run_search_eval import _routing_for

    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    items = sample_per_group(load_search_eval(), lambda it: ",".join(sorted(it.expected_sources)), limit)

    rows = []
    for it in items:
        results = []
        total_tokens = 0
        for _ in range(n):
            with meter() as m:
                sources = await _routing_for(it, resources, user_id)
            results.append(tuple(sorted(sources)) if sources else ())
            total_tokens += m.prompt_total + m.completion_total
        rows.append({
            "id": it.id, "repeats": [list(r) for r in results],
            "agreement_rate": modal_agreement_rate(results),
            "total_tokens_used": total_tokens,
        })
    return {"target": "routing", "n_repeat": n, "rows": rows}


_TARGETS = {"classify": _run_classify, "synthesize": _run_synthesize, "judge": _run_judge}
_LIVE_TARGETS = {"routing": _run_routing}


def _run(target: str, limit: int, n: int) -> None:
    if target in _LIVE_TARGETS:
        print(f"CẢNH BÁO: target='{target}' là live ReAct, không batch được — tốn {n}x chi phí thật mỗi item.")
        result = asyncio.run(_LIVE_TARGETS[target](limit, n))
    else:
        result = _TARGETS[target](limit, n)

    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = _RESULTS_DIR / f"reproducibility_{target}_{int(time.time())}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    for row in result["rows"]:
        print(row)
    print(f"\nSaved: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True, choices=["classify", "synthesize", "judge", "routing"])
    parser.add_argument("--limit", type=int, required=True, help="Bắt buộc — số item tối đa (đo N lần/item, luôn cần giới hạn rõ)")
    parser.add_argument("--repeat", type=int, default=3, help="Số lần lặp lại mỗi item (mặc định 3)")
    args = parser.parse_args()
    _run(args.target, args.limit, args.repeat)


if __name__ == "__main__":
    main()
