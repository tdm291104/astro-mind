from __future__ import annotations

import argparse
import asyncio
import json
from contextlib import contextmanager
from pathlib import Path

from agent_eval.batch_runner import run_batch_sync
from agent_eval.harness import build_eval_resources, ensure_eval_user, sample_per_group
from agent_eval.metrics import citation_precision_recall, routing_accuracy

_RESULTS_DIR = Path(__file__).parent / "results"


def _load_baseline(script: str) -> dict:
    path = _RESULTS_DIR / f"run_{script}_eval.json"
    if not path.exists():
        raise SystemExit(
            f"Chưa có results/run_{script}_eval.json — chạy "
            f"`python -m agent_eval.run_{script}_eval --limit 1` trước để có baseline so sánh."
        )
    return json.loads(path.read_text())


# ---- variant: no_reranker (notebook, #5) ----

def _variant_no_reranker(limit: int) -> dict:
    """reranker=None khi retrieve — so với baseline (có reranker thật)."""
    from agent_eval.run_notebook_eval import _ingest_papers
    from agent_eval.schema import load_notebook_eval
    from agents.llm import extract_text
    from agents.notebook import _format_citations, retrieve_chunks
    from agents.synth import build_request, parse_response

    baseline = _load_baseline("notebook")
    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    items = sample_per_group(load_notebook_eval(), lambda it: it.doc_label, limit)
    doc_ids = _ingest_papers(resources, user_id)

    retrieval_by_id = {}
    for item in items:
        retrieval_by_id[item.id] = retrieve_chunks(
            item.question, store=resources.store, vector=resources.vector, embedder=resources.embedder,
            doc_ids=[doc_ids[item.doc_label]], user_id=user_id, reranker=None,  # <-- ablated
        )

    model = resources.settings.anthropic_model_light
    params_by_id = {
        item.id: build_request(item.question, retrieval_by_id[item.id][0], model=model)
        for item in items if retrieval_by_id.get(item.id) is not None
    }
    requests = [{"custom_id": iid, "params": p} for iid, p in params_by_id.items()]
    batch_results = run_batch_sync(requests, api_key=resources.settings.anthropic_api_key) if requests else {}
    raw_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in batch_results.items()}

    rows = []
    for item in items:
        retrieval = retrieval_by_id.get(item.id)
        raw_text = raw_texts.get(item.id)
        if retrieval is None or raw_text is None:
            pages = []
        else:
            chunks_with_doc, score_by_id = retrieval
            answer_text, used = parse_response(raw_text)
            citations = _format_citations(answer_text, used, chunks_with_doc, score_by_id)
            pages = [c.page for c in citations if c.page is not None]
        rows.append({"id": item.id, "expected_page": item.expected_page, "returned_pages": pages})

    precision, recall = citation_precision_recall(
        [r["expected_page"] for r in rows], [r["returned_pages"] for r in rows],
    )
    return {
        "variant": "no_reranker", "n": len(rows),
        "ablated": {"citation_precision": precision, "citation_recall": recall},
        "baseline": {
            "citation_precision": baseline.get("citation_precision"),
            "citation_recall": baseline.get("citation_recall"),
        },
    }


# ---- variant: no_rephrase_retry (notebook, #5) ----

def _variant_no_rephrase_retry(limit: int) -> dict:
    """Giống pipeline thật nhưng KHÔNG retry rephrase khi retrieval đầu tiên
    rỗng — so với baseline (có retry, từ NotebookAgent.run()'s mini-ReAct)."""
    from agent_eval.run_notebook_eval import _ingest_papers
    from agent_eval.schema import load_notebook_eval
    from agents.llm import extract_text
    from agents.notebook import _format_citations, retrieve_chunks
    from agents.synth import build_request, parse_response

    baseline = _load_baseline("notebook")
    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    items = sample_per_group(load_notebook_eval(), lambda it: it.doc_label, limit)
    doc_ids = _ingest_papers(resources, user_id)

    retrieval_by_id = {
        item.id: retrieve_chunks(
            item.question, store=resources.store, vector=resources.vector, embedder=resources.embedder,
            doc_ids=[doc_ids[item.doc_label]], user_id=user_id, reranker=resources.reranker,
        )
        for item in items
    }  # KHÔNG retry — khác _retrieve_for_items thật (đây chính là phần bị ablate)

    model = resources.settings.anthropic_model_light
    params_by_id = {
        item.id: build_request(item.question, retrieval_by_id[item.id][0], model=model)
        for item in items if retrieval_by_id.get(item.id) is not None
    }
    requests = [{"custom_id": iid, "params": p} for iid, p in params_by_id.items()]
    batch_results = run_batch_sync(requests, api_key=resources.settings.anthropic_api_key) if requests else {}
    raw_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in batch_results.items()}

    rows = []
    for item in items:
        retrieval = retrieval_by_id.get(item.id)
        raw_text = raw_texts.get(item.id)
        if retrieval is None or raw_text is None:
            pages = []
        else:
            chunks_with_doc, score_by_id = retrieval
            answer_text, used = parse_response(raw_text)
            citations = _format_citations(answer_text, used, chunks_with_doc, score_by_id)
            pages = [c.page for c in citations if c.page is not None]
        rows.append({"id": item.id, "expected_page": item.expected_page, "returned_pages": pages})

    precision, recall = citation_precision_recall(
        [r["expected_page"] for r in rows], [r["returned_pages"] for r in rows],
    )
    return {
        "variant": "no_rephrase_retry", "n": len(rows),
        "ablated": {"citation_precision": precision, "citation_recall": recall},
        "baseline": {
            "citation_precision": baseline.get("citation_precision"),
            "citation_recall": baseline.get("citation_recall"),
        },
    }


# ---- variant: no_galaxy_cnn (image, #5) ----

@contextmanager
def _patch_predictor_returns_none():
    """Monkeypatch agents.image_agent._get_predictor để predict() luôn trả
    None trong suốt block — mô phỏng fail-open path đã có sẵn (khi model file
    không tồn tại), KHÔNG sửa file production. Tự restore khi exit block."""
    import agents.image_agent as image_agent_module

    original = image_agent_module._get_predictor

    class _NullPredictor:
        async def predict(self, image_data: str):
            return None

    image_agent_module._get_predictor = lambda: _NullPredictor()
    try:
        yield
    finally:
        image_agent_module._get_predictor = original


def _variant_no_galaxy_cnn(limit: int) -> dict:
    """Patch predictor trả None — đo classification_accuracy thay đổi bao
    nhiêu khi không có Galaxy CNN (so với baseline có CNN thật)."""
    from agent_eval.run_image_eval import (
        _build_rows, _download_images, _extract_raw_texts, _run_morphology, _stage1_requests,
    )
    from agent_eval.schema import load_image_eval
    from agent_eval.metrics import classification_accuracy

    baseline = _load_baseline("image")
    resources = build_eval_resources()
    items = sample_per_group(load_image_eval(), lambda it: it.expected_class_name, limit)
    model = resources.settings.anthropic_model_light

    data_urls = _download_images(items)
    stage1_reqs = _stage1_requests(items, data_urls, model)
    stage1_results = run_batch_sync(stage1_reqs, api_key=resources.settings.anthropic_api_key)
    stage1_texts = _extract_raw_texts(stage1_results)

    with _patch_predictor_returns_none():
        morph_by_id = asyncio.run(_run_morphology(items, stage1_texts, data_urls))
    if morph_by_id:
        raise RuntimeError("Predictor đã patch nhưng vẫn trả morphology — patch không có hiệu lực.")

    rows = _build_rows(items, stage1_texts, {})  # stage2_texts rỗng — không item nào qua được CNN gate
    expected = [(r["expected_class_name"], r["expected_sub_type"]) for r in rows]
    actual = [(r["actual_class_name"], r["actual_sub_type"]) for r in rows]
    accuracy = classification_accuracy(expected, actual)

    return {
        "variant": "no_galaxy_cnn", "n": len(rows),
        "ablated": {"classification_accuracy": accuracy},
        "baseline": {"classification_accuracy": baseline.get("classification_accuracy")},
    }


# ---- variant: haiku_writer (report, #4 model) ----

def _variant_haiku_writer(limit: int) -> dict:
    """Viết report bằng model_light (Haiku) thay vì model (Sonnet) — tái dùng
    context thật (keyword+web+arxiv+trend) từ run_report_eval, chỉ đổi model
    ở bước viết. So judge score với baseline (viết bằng Sonnet)."""
    from agent_eval.judges import build_request as build_judge_request, parse_response as parse_judge_response
    from agent_eval.run_report_eval import (
        _collect_trending, _fetch_context, _make_agent, _parse_keywords, _run_keyword_batch,
    )
    from agent_eval.schema import load_report_eval
    from agents.llm import extract_text
    from agents.report_agent import build_research_report_request, build_trending_report_request

    baseline = _load_baseline("report")
    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    items = sample_per_group(load_report_eval(), lambda it: it.report_type, limit)

    agent = _make_agent(resources, user_id)
    api_key = resources.settings.anthropic_api_key
    haiku = resources.settings.anthropic_model_light

    keyword_texts = _run_keyword_batch(items, agent, api_key)
    keywords_by_id = _parse_keywords(items, keyword_texts)
    context_by_id = _fetch_context(items, agent, keywords_by_id)
    _collect_trending(items, agent, context_by_id)

    requests = []
    for item in items:
        ctx = context_by_id[item.id]
        if item.report_type == "trending":
            params = build_trending_report_request(
                item.topic, ctx["keywords"], ctx["web_context"], ctx["papers"], ctx["top_authors"],
                model=haiku, notebook_text="", session_text="",
            )
        else:
            params = build_research_report_request(
                item.topic, ctx["keywords"], ctx["web_context"], ctx["papers"], model=haiku,
                notebook_text="", session_text="",
            )
        requests.append({"custom_id": item.id, "params": params})
    batch_results = run_batch_sync(requests, api_key=api_key)
    report_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in batch_results.items()}

    judge_requests = [
        {
            "custom_id": item.id,
            "params": build_judge_request(
                report_texts.get(item.id) or "", item.topic, model=resources.settings.anthropic_model,
            ),
        }
        for item in items
    ]
    judge_results = run_batch_sync(judge_requests, api_key=api_key)
    judge_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in judge_results.items()}

    rows = []
    for item in items:
        judge_raw = judge_texts.get(item.id)
        judge = (
            parse_judge_response(judge_raw) if judge_raw is not None
            else {"mach_lac": 0, "van_phong": 0, "do_sau": 0}
        )
        rows.append({"id": item.id, "judge": judge})

    return {
        "variant": "haiku_writer", "n": len(rows), "ablated_rows": rows,
        "baseline_rows": [{"id": r["id"], "judge": r["judge"]} for r in baseline["rows"]],
    }


# ---- variant: no_trend_data (report, #5, chỉ áp dụng item trending) ----

def _variant_no_trend_data(limit: int) -> dict:
    """Bỏ qua _collect_trending — report trending viết không có top_authors,
    so judge score với baseline (có trend data thật)."""
    from agent_eval.judges import build_request as build_judge_request, parse_response as parse_judge_response
    from agent_eval.run_report_eval import _fetch_context, _make_agent, _parse_keywords, _run_keyword_batch
    from agent_eval.schema import load_report_eval
    from agents.llm import extract_text
    from agents.report_agent import build_trending_report_request

    baseline = _load_baseline("report")
    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    all_items = sample_per_group(load_report_eval(), lambda it: it.report_type, limit)
    items = [it for it in all_items if it.report_type == "trending"]
    if not items:
        raise SystemExit("Variant no_trend_data chỉ áp dụng cho item report_type=trending — không có item nào trong sample (tăng --limit).")

    agent = _make_agent(resources, user_id)
    api_key = resources.settings.anthropic_api_key

    keyword_texts = _run_keyword_batch(items, agent, api_key)
    keywords_by_id = _parse_keywords(items, keyword_texts)
    context_by_id = _fetch_context(items, agent, keywords_by_id)
    # KHÔNG gọi _collect_trending — top_authors giữ None như _fetch_context đặt sẵn (đây là phần bị ablate)

    requests = [
        {
            "custom_id": item.id,
            "params": build_trending_report_request(
                item.topic, context_by_id[item.id]["keywords"], context_by_id[item.id]["web_context"],
                context_by_id[item.id]["papers"], None, model=agent.model, notebook_text="", session_text="",
            ),
        }
        for item in items
    ]
    batch_results = run_batch_sync(requests, api_key=api_key)
    report_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in batch_results.items()}

    judge_requests = [
        {
            "custom_id": item.id,
            "params": build_judge_request(
                report_texts.get(item.id) or "", item.topic, model=resources.settings.anthropic_model,
            ),
        }
        for item in items
    ]
    judge_results = run_batch_sync(judge_requests, api_key=api_key)
    judge_texts = {cid: (extract_text(m) if m is not None else None) for cid, m in judge_results.items()}

    rows = []
    for item in items:
        judge_raw = judge_texts.get(item.id)
        judge = (
            parse_judge_response(judge_raw) if judge_raw is not None
            else {"mach_lac": 0, "van_phong": 0, "do_sau": 0}
        )
        rows.append({"id": item.id, "judge": judge})

    baseline_trending = [r for r in baseline["rows"] if r.get("report_type") == "trending"]
    return {
        "variant": "no_trend_data", "n": len(rows), "ablated_rows": rows,
        "baseline_rows": [{"id": r["id"], "judge": r["judge"]} for r in baseline_trending],
    }


# ---- variant: haiku_orchestrator (route, #4 model, LIVE — không batch được) ----

async def _variant_haiku_orchestrator(limit: int) -> dict:
    """OrchestratorAgent(model=model_light) thay Sonnet — so route_accuracy/
    compound_success_rate với baseline (Sonnet thật)."""
    from agent_eval.metrics import compound_success_rate
    from agent_eval.run_route_eval import _TOOL_TO_ACTION, _ingest_sample_doc, _load_sample_image_data
    from agent_eval.schema import load_route_eval
    from agents.base import collect_events
    from agents.conversation import ConversationMemory
    from agents.orchestrator import OrchestratorAgent

    baseline = _load_baseline("route")
    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    singles, compounds = load_route_eval()
    singles = sample_per_group(singles, lambda it: it.expected_action, limit)
    compounds = compounds[:limit] if limit else compounds

    sample_image_data = _load_sample_image_data()
    sample_doc_id = _ingest_sample_doc(resources, user_id)
    haiku = resources.settings.anthropic_model_light

    async def actions_for(message: str, *, image_data=None, doc_ids=None) -> list[str]:
        agent = OrchestratorAgent(
            api_key=resources.settings.anthropic_api_key,
            model=haiku,  # <-- ablated: Haiku thay Sonnet
            model_light=haiku,
            nasa_api_key=resources.settings.nasa_api_key,
            tavily_key=resources.settings.tavily_api_key,
            serpapi_api_key=resources.settings.serpapi_api_key,
            store=resources.store, vector=resources.vector, embedder=resources.embedder,
            reranker=resources.reranker, user_id=user_id,
            image_data=image_data, doc_ids=doc_ids,
        )
        events = await collect_events(agent.run(message, ConversationMemory()))
        actions = [_TOOL_TO_ACTION[e.tool] for e in events if e.type == "action" and e.tool in _TOOL_TO_ACTION]
        return actions or ["direct_chat"]

    single_rows = []
    for item in singles:
        image_data = sample_image_data if item.expected_action == "image" else None
        doc_ids = [sample_doc_id] if item.expected_action == "notebook" else None
        actions = await actions_for(item.message, image_data=image_data, doc_ids=doc_ids)
        single_rows.append({"id": item.id, "expected_action": item.expected_action, "actual_actions": actions})

    compound_rows = []
    for item in compounds:
        image_data = sample_image_data if "image" in item.expected_actions else None
        doc_ids = [sample_doc_id] if "notebook" in item.expected_actions else None
        actions = await actions_for(item.message, image_data=image_data, doc_ids=doc_ids)
        compound_rows.append({"id": item.id, "expected_actions": item.expected_actions, "actual_actions": actions})

    route_acc = routing_accuracy(
        [{r["expected_action"]} for r in single_rows], [set(r["actual_actions"]) for r in single_rows],
    )
    compound_acc = compound_success_rate(
        [r["expected_actions"] for r in compound_rows], [r["actual_actions"] for r in compound_rows],
    )
    return {
        "variant": "haiku_orchestrator", "n_single": len(single_rows), "n_compound": len(compound_rows),
        "ablated": {"route_accuracy": route_acc, "compound_success_rate": compound_acc},
        "baseline": {
            "route_accuracy": baseline.get("route_accuracy"),
            "compound_success_rate": baseline.get("compound_success_rate"),
        },
    }


_VARIANTS = {
    "no_reranker": _variant_no_reranker,
    "no_rephrase_retry": _variant_no_rephrase_retry,
    "haiku_writer": _variant_haiku_writer,
    "no_trend_data": _variant_no_trend_data,
    "no_galaxy_cnn": _variant_no_galaxy_cnn,
}
_LIVE_VARIANTS = {"haiku_orchestrator": _variant_haiku_orchestrator}


def _run(variant: str, limit: int) -> None:
    if variant in _LIVE_VARIANTS:
        print(f"CẢNH BÁO: variant='{variant}' chạy live ReAct, không batch được.")
        result = asyncio.run(_LIVE_VARIANTS[variant](limit))
    else:
        result = _VARIANTS[variant](limit)

    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = _RESULTS_DIR / f"ablation_{variant}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--variant", required=True,
        choices=[
            "no_reranker", "no_rephrase_retry", "haiku_writer",
            "no_trend_data", "no_galaxy_cnn", "haiku_orchestrator",
        ],
    )
    parser.add_argument("--limit", type=int, required=True, help="Bắt buộc — dùng CÙNG giá trị với baseline để so sánh công bằng")
    args = parser.parse_args()
    _run(args.variant, args.limit)


if __name__ == "__main__":
    main()
