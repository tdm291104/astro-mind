from __future__ import annotations

import argparse
import asyncio
import base64
import json
import time
from pathlib import Path

import httpx

from agent_eval.harness import build_eval_resources, ensure_eval_user, sample_per_group
from agent_eval.metrics import compound_success_rate, routing_accuracy
from agent_eval.schema import load_route_eval

_RESULTS_PATH = Path(__file__).parent / "results" / "run_route_eval.json"
_RESULTS_DIR = Path(__file__).parent / "results"

_TOOL_TO_ACTION = {
    "analyze_astronomy_image": "image",
    "call_notebook_agent": "notebook",
    "call_search_agent": "search",
    "call_report_agent": "report",
}

# Real spiral galaxy photo, already verified working in run_image_eval.py's pilot run.
_SAMPLE_IMAGE_URL = (
    "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000158/"
    "GSFC_20171208_Archive_e000158~medium.jpg"
)

# Shortest of the 3 papers used by run_notebook_eval.py — fastest to ingest.
_SAMPLE_DOC_URL = "https://arxiv.org/pdf/2509.20310"


def _load_sample_image_data() -> str:
    """Download (if not cached) the sample galaxy image and return it as a
    base64 data URL, the same shape OrchestratorAgent.image_data expects."""
    img_path = Path(__file__).parent / "results" / "_route_sample.jpg"
    img_path.parent.mkdir(parents=True, exist_ok=True)
    if not img_path.exists():
        resp = httpx.get(_SAMPLE_IMAGE_URL, timeout=20.0, follow_redirects=True)
        resp.raise_for_status()
        img_path.write_bytes(resp.content)
    return "data:image/jpeg;base64," + base64.b64encode(img_path.read_bytes()).decode()


def _ingest_sample_doc(resources, user_id: str) -> str:
    """Download (if not cached) + ingest the sample arXiv PDF through the real
    pipeline. Returns the doc_id. Uses its own filename (route_sample.pdf) so
    this script's fixture stays independent of run_notebook_eval.py's cache."""
    from core.models import Document
    from ingestion import pipeline as ingestion

    tmp_dir = Path(__file__).parent / "results" / "_pdfs"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = tmp_dir / "route_sample.pdf"
    if not pdf_path.exists():
        resp = httpx.get(_SAMPLE_DOC_URL, timeout=30.0, follow_redirects=True)
        resp.raise_for_status()
        pdf_path.write_bytes(resp.content)

    blocks = ingestion.parse_file(pdf_path)
    doc = Document(
        name=pdf_path.name, type="pdf", file_path=str(pdf_path), page_count=0, user_id=user_id,
    )
    result = ingestion.persist_document(
        doc, blocks, store=resources.store, vector=resources.vector, embedder=resources.embedder,
    )
    print(f"Ingested route sample doc -> doc_id={result.doc_id}")
    return result.doc_id


async def _actions_for(
    message: str, resources, user_id: str,
    *, image_data: str | None = None, doc_ids: list[str] | None = None,
) -> list[str]:
    from agents.base import collect_events
    from agents.conversation import ConversationMemory
    from agents.orchestrator import OrchestratorAgent

    agent = OrchestratorAgent(
        api_key=resources.settings.anthropic_api_key,
        model=resources.settings.anthropic_model,
        model_light=resources.settings.anthropic_model_light,
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


async def _timed_actions_for(
    message: str, resources, user_id: str,
    *, image_data: str | None = None, doc_ids: list[str] | None = None,
) -> tuple[list[str], dict]:
    """Giống _actions_for nhưng đo thêm usage thật (qua core.metering.meter())
    + latency (time.monotonic()) — dùng cho instrumentation #10."""
    from core.metering import meter

    start = time.monotonic()
    with meter() as m:
        actions = await _actions_for(message, resources, user_id, image_data=image_data, doc_ids=doc_ids)
    latency_ms = (time.monotonic() - start) * 1000
    usage = {
        "input_tokens": m.prompt_total, "output_tokens": m.completion_total,
        "latency_ms": round(latency_ms, 1),
    }
    return actions, usage


def _save_raw_results(single_actions: dict, compound_actions: dict) -> Path:
    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _RESULTS_DIR / f"run_route_eval_raw_{int(time.time())}.json"
    path.write_text(json.dumps(
        {"singles": single_actions, "compounds": compound_actions}, ensure_ascii=False, indent=2,
    ))
    return path


async def _run(limit: int | None, use_cached_results: str | None) -> None:
    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)

    singles, compounds = load_route_eval()
    singles = sample_per_group(singles, lambda it: it.expected_action, limit)
    compounds = compounds[:limit] if limit else compounds

    if use_cached_results:
        cached = json.loads(Path(use_cached_results).read_text())
        single_actions, compound_actions = cached["singles"], cached["compounds"]
    else:
        sample_image_data = _load_sample_image_data()
        sample_doc_id = _ingest_sample_doc(resources, user_id)

        usage_by_id: dict[str, dict] = {}

        single_actions: dict[str, list[str]] = {}
        for item in singles:
            image_data = sample_image_data if item.expected_action == "image" else None
            doc_ids = [sample_doc_id] if item.expected_action == "notebook" else None
            actions, usage = await _timed_actions_for(
                item.message, resources, user_id, image_data=image_data, doc_ids=doc_ids,
            )
            single_actions[item.id] = actions
            usage_by_id[item.id] = usage

        compound_actions: dict[str, list[str]] = {}
        for item in compounds:
            image_data = sample_image_data if "image" in item.expected_actions else None
            doc_ids = [sample_doc_id] if "notebook" in item.expected_actions else None
            actions, usage = await _timed_actions_for(
                item.message, resources, user_id, image_data=image_data, doc_ids=doc_ids,
            )
            compound_actions[item.id] = actions
            usage_by_id[item.id] = usage

        saved = _save_raw_results(single_actions, compound_actions)
        print(f"Raw results saved to: {saved}")

        from agent_eval.instrumentation import usage_record
        usage_path = _RESULTS_DIR / f"usage_route_{int(time.time())}.json"
        usage_record_entry = usage_record(
            call_type="routing_and_dispatch_live", model=resources.settings.anthropic_model,
            is_batch=False, usage=usage_by_id,
        )
        usage_path.write_text(json.dumps({"calls": [usage_record_entry]}, ensure_ascii=False, indent=2))
        print(f"Usage saved to: {usage_path}")

    single_rows = []
    for item in singles:
        if item.id not in single_actions:
            print(f"WARNING: {item.id} missing from cached results (--limit mismatch?) — defaulting to direct_chat")
        actions = single_actions.get(item.id, ["direct_chat"])
        single_rows.append({
            "id": item.id, "message": item.message, "expected_action": item.expected_action,
            "actual_actions": actions, "correct": actions == [item.expected_action],
        })
        print(f"{item.id}: expected={item.expected_action} actual={actions}")

    compound_rows = []
    for item in compounds:
        if item.id not in compound_actions:
            print(f"WARNING: {item.id} missing from cached results (--limit mismatch?) — defaulting to direct_chat")
        actions = compound_actions.get(item.id, ["direct_chat"])
        compound_rows.append({
            "id": item.id, "message": item.message, "expected_actions": item.expected_actions,
            "actual_actions": actions, "correct": actions == item.expected_actions,
        })
        print(f"{item.id}: expected={item.expected_actions} actual={actions}")

    route_acc = routing_accuracy(
        [{r["expected_action"]} for r in single_rows],
        [set(r["actual_actions"]) for r in single_rows],
    )
    # NOTE: compound_success_rate requires an EXACT ordered sequence match. Live
    # ReAct-loop tool-call counts can vary run-to-run for the same test item (e.g.
    # cp01 produced ["image","search","search"] in one run and
    # ["image","search","search","search","search"] in another) since the
    # orchestrator genuinely re-invokes search across iterations sometimes, which
    # this strict metric always penalizes even if the behavior is reasonable.
    compound_acc = compound_success_rate(
        [r["expected_actions"] for r in compound_rows],
        [r["actual_actions"] for r in compound_rows],
    )

    _RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _RESULTS_PATH.write_text(json.dumps(
        {
            "single_rows": single_rows, "compound_rows": compound_rows,
            "route_accuracy": route_acc, "compound_success_rate": compound_acc,
        },
        ensure_ascii=False, indent=2,
    ))
    print(f"\nRoute Accuracy: {route_acc:.2%}  Compound Success Rate: {compound_acc:.2%}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max single-intent items per action; max N compounds")
    parser.add_argument(
        "--use-cached-results", type=str, default=None,
        help=(
            "Path to a previously-saved run_route_eval_raw_*.json — recompute metrics "
            "without calling the API. NOTE: unlike the other 5 scripts, this flag is for "
            "CLI consistency only — the live path here makes no Anthropic calls more "
            "expensive than necessary in the first place (entirely unbatchable ReAct "
            "loop), so the savings are smaller, but re-running metrics.py changes is "
            "still free with this flag."
        ),
    )
    args = parser.parse_args()
    asyncio.run(_run(args.limit, args.use_cached_results))


if __name__ == "__main__":
    main()
