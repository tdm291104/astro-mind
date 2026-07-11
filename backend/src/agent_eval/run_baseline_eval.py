from __future__ import annotations

import argparse
import json
from pathlib import Path

from agent_eval.baselines import (
    baseline_guard, baseline_image, baseline_notebook_from_retrieval,
    baseline_report_template, baseline_route_compound, baseline_route_single,
    baseline_search,
)
from agent_eval.harness import build_eval_resources, ensure_eval_user, sample_per_group
from agent_eval.metrics import (
    citation_precision_recall, classification_accuracy, compound_success_rate,
    guard_false_rates, routing_accuracy, section_completeness,
)
from agent_eval.schema import (
    load_guard_eval, load_image_eval, load_notebook_eval, load_report_eval,
    load_route_eval, load_search_eval,
)

_RESULTS_DIR = Path(__file__).parent / "results"
_SCRIPTS = ["guard", "image", "notebook", "report", "search", "route"]


def _run_guard(limit: int | None) -> dict:
    items = sample_per_group(load_guard_eval(), lambda it: str(it.expected_accept), limit)
    actual = baseline_guard(items)
    expected = [it.expected_accept for it in items]
    false_reject, false_accept = guard_false_rates(expected, actual)
    return {"false_reject_rate": false_reject, "false_accept_rate": false_accept, "n": len(items)}


def _run_image(limit: int | None) -> dict:
    items = sample_per_group(load_image_eval(), lambda it: it.expected_class_name, limit)
    actual = baseline_image(items)
    expected = [(it.expected_class_name, it.expected_sub_type) for it in items]
    accuracy = classification_accuracy(expected, actual)
    return {"classification_accuracy": accuracy, "n": len(items)}


def _run_notebook(limit: int | None) -> dict:
    from agent_eval.run_notebook_eval import _ingest_papers, _retrieve_for_items

    items = sample_per_group(load_notebook_eval(), lambda it: it.doc_label, limit)
    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    doc_ids = _ingest_papers(resources, user_id)
    retrieval_by_id = _retrieve_for_items(items, resources, doc_ids, user_id)

    expected_pages, returned_pages = [], []
    for item in items:
        _, pages = baseline_notebook_from_retrieval(retrieval_by_id.get(item.id))
        expected_pages.append(item.expected_page)
        returned_pages.append(pages)
    precision, recall = citation_precision_recall(expected_pages, returned_pages)
    return {"citation_precision": precision, "citation_recall": recall, "n": len(items)}


def _run_report(limit: int | None) -> dict:
    from agent_eval.batch_runner import run_batch_sync
    from agent_eval.judges import build_request as build_judge_request, parse_response as parse_judge_response
    from agents.llm import extract_text

    items = sample_per_group(load_report_eval(), lambda it: it.report_type, limit)
    texts_by_id = {item.id: baseline_report_template(item.required_sections) for item in items}

    resources = build_eval_resources()
    requests = [
        {
            "custom_id": item.id,
            "params": build_judge_request(texts_by_id[item.id], item.topic, model=resources.settings.anthropic_model),
        }
        for item in items
    ]
    batch_results = run_batch_sync(requests, api_key=resources.settings.anthropic_api_key)
    judge_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in batch_results.items()}

    rows = []
    for item in items:
        judge_raw = judge_texts.get(item.id)
        judge = (
            parse_judge_response(judge_raw) if judge_raw is not None
            else {"mach_lac": 0, "van_phong": 0, "do_sau": 0, "error": "batch item failed"}
        )
        rows.append({"id": item.id, "topic": item.topic, "judge": judge})

    completeness = section_completeness(
        [set(it.required_sections) for it in items], [texts_by_id[it.id] for it in items],
    )
    return {"section_completeness": completeness, "rows": rows, "n": len(items)}


def _run_search(limit: int | None) -> dict:
    items = sample_per_group(load_search_eval(), lambda it: ",".join(sorted(it.expected_sources)), limit)
    actual = baseline_search(items)
    expected = [set(it.expected_sources) for it in items]
    accuracy = routing_accuracy(expected, actual)
    return {"routing_accuracy": accuracy, "n": len(items)}


def _run_route(limit: int | None) -> dict:
    singles, compounds = load_route_eval()
    singles = sample_per_group(singles, lambda it: it.expected_action, limit)
    compounds = compounds[:limit] if limit else compounds

    actual_single = baseline_route_single(singles)
    expected_single = [{it.expected_action} for it in singles]
    actual_single_sets = [{a} for a in actual_single]
    route_acc = routing_accuracy(expected_single, actual_single_sets)

    actual_compound = baseline_route_compound(compounds)
    expected_compound = [it.expected_actions for it in compounds]
    compound_acc = compound_success_rate(expected_compound, actual_compound)

    return {
        "route_accuracy": route_acc, "compound_success_rate": compound_acc,
        "n_single": len(singles), "n_compound": len(compounds),
    }


_HANDLERS = {
    "guard": _run_guard, "image": _run_image, "notebook": _run_notebook,
    "report": _run_report, "search": _run_search, "route": _run_route,
}


def _run(script: str, limit: int | None) -> None:
    targets = _SCRIPTS if script == "all" else [script]
    if "report" in targets and limit is None:
        print(
            "CẢNH BÁO: --script report (hoặc 'all') không có --limit sẽ gọi judge "
            "thật (Sonnet) cho TOÀN BỘ dataset report_eval — tốn tiền thật theo quy "
            "mô đầy đủ. Dùng --limit nhỏ nếu chỉ muốn kiểm tra."
        )
    for name in targets:
        result = _HANDLERS[name](limit)
        _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        out_path = _RESULTS_DIR / f"baseline_{name}_eval.json"
        out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print(f"{name} baseline: {result}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", choices=[*_SCRIPTS, "all"], default="all")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    _run(args.script, args.limit)


if __name__ == "__main__":
    main()
