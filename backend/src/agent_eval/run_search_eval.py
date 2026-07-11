from __future__ import annotations

import argparse
import asyncio
import json
import time
from pathlib import Path

from agent_eval.batch_runner import run_batch_sync
from agent_eval.harness import build_eval_resources, ensure_eval_user, sample_per_group
from agent_eval.metrics import hallucination_rate, routing_accuracy
from agent_eval.schema import load_search_eval

_RESULTS_PATH = Path(__file__).parent / "results" / "run_search_eval.json"
_RESULTS_DIR = Path(__file__).parent / "results"
_ALL_SOURCES = {"arxiv", "apod", "images", "web"}


async def _routing_for(item, resources, user_id: str) -> list[str] | None:
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
    )
    events = await collect_events(agent.run(item.query, ConversationMemory()))
    for e in events:
        if e.type == "action" and e.tool == "call_search_agent":
            return e.args.get("sources") or sorted(_ALL_SOURCES)
    return None


async def _fetch_candidates(item, actual_sources: list[str] | None, resources) -> tuple[list, list[str]]:
    """Live, no-Anthropic-cost fetch of search candidates — the same fetchers
    SearchAgent.run() uses internally, called directly so the translate+score
    steps can be batched separately across all items."""
    from agents.search import _apod_candidates, _arxiv_candidates, _images_candidates, _web_candidates

    sources = actual_sources or sorted(_ALL_SOURCES)
    coros = []
    if "arxiv" in sources:
        coros.append(_arxiv_candidates(item.query, dry_run=False))
    if "apod" in sources:
        coros.append(_apod_candidates(resources.settings.nasa_api_key, dry_run=False))
    if "images" in sources:
        coros.append(_images_candidates(item.query, dry_run=False))
    if "web" in sources and resources.settings.tavily_api_key:
        coros.append(_web_candidates(item.query, resources.settings.tavily_api_key, dry_run=False))

    results = await asyncio.gather(*coros, return_exceptions=True) if coros else []
    candidates = []
    for res in results:
        if not isinstance(res, Exception):
            candidates.extend(res)
    return candidates, sources


def _extract_texts(batch_results: dict) -> dict[str, str | None]:
    from agents.llm import extract_text

    return {
        custom_id: (extract_text(message) if message is not None else None)
        for custom_id, message in batch_results.items()
    }


def _save_combined_raw(translate_texts: dict, score_texts: dict) -> Path:
    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _RESULTS_DIR / f"run_search_eval_raw_combined_{int(time.time())}.json"
    path.write_text(json.dumps(
        {"translate": translate_texts, "score": score_texts}, ensure_ascii=False, indent=2,
    ))
    return path


def _save_usage(
    *, routing_prompt_total: int, routing_completion_total: int, model: str,
    translate_results: dict | None, score_results: dict | None, model_light: str,
) -> Path:
    from agent_eval.instrumentation import extract_usage, usage_record

    calls = [
        usage_record(
            call_type="routing_live", model=model, is_batch=False,
            usage={"_all_items": {
                "input_tokens": routing_prompt_total, "output_tokens": routing_completion_total,
            }},
        ),
    ]
    if translate_results is not None:
        calls.append(usage_record(
            call_type="translate", model=model_light, is_batch=True,
            usage={cid: extract_usage(m) for cid, m in translate_results.items()},
        ))
    if score_results is not None:
        calls.append(usage_record(
            call_type="score", model=model_light, is_batch=True,
            usage={cid: extract_usage(m) for cid, m in score_results.items()},
        ))
    path = _RESULTS_DIR / f"usage_search_{int(time.time())}.json"
    path.write_text(json.dumps({"calls": calls}, ensure_ascii=False, indent=2))
    return path


def _run_translate_batch(items, candidates_by_id: dict, api_key: str) -> tuple[dict[str, str | None], dict]:
    from agents.search import build_translate_request

    requests = [
        {"custom_id": item.id, "params": build_translate_request(item.query)}
        for item in items
        if candidates_by_id[item.id][0]  # only items with >=1 candidate need translation
    ]
    if not requests:
        return {}, {}
    batch_results = run_batch_sync(requests, api_key=api_key)
    return _extract_texts(batch_results), batch_results


def _run_score_batch(
    items, candidates_by_id: dict, translate_texts: dict, api_key: str,
) -> tuple[dict[str, str | None], dict]:
    from agents.search import build_score_request

    requests = []
    for item in items:
        candidates, _ = candidates_by_id[item.id]
        if not candidates:
            continue
        translated = translate_texts.get(item.id)
        query_en = translated.strip() if translated else item.query
        requests.append({
            "custom_id": item.id, "params": build_score_request(candidates, query_en or item.query),
        })
    if not requests:
        return {}, {}
    batch_results = run_batch_sync(requests, api_key=api_key)
    return _extract_texts(batch_results), batch_results


def _build_hallucination_data(item, candidates_by_id: dict, score_texts: dict) -> list[str]:
    """Filter/rank/format candidates using the parsed batch scores — mirrors
    SearchAgent.run()'s post-scoring logic exactly, reusing its real
    _format_surviving()."""
    from agents.search import _THRESHOLD, _format_surviving, parse_score_response

    candidates, _ = candidates_by_id[item.id]
    if not candidates:
        return []
    raw_score_text = score_texts.get(item.id)
    scores = (
        parse_score_response(raw_score_text, len(candidates)) if raw_score_text is not None
        else [5.0] * len(candidates)
    )
    for c, s in zip(candidates, scores):
        c.score = s
    filtered = [c for c in candidates if c.score >= _THRESHOLD]
    filtered.sort(key=lambda c: c.score, reverse=True)
    _, arxiv_papers, web_sources = _format_surviving(filtered, item.query)
    returned_titles = [p.get("title", "") for p in arxiv_papers]
    returned_titles += [w.get("title", "") for w in web_sources]
    return returned_titles


def _real_titles_for(item, sources: list[str], resources) -> set[str]:
    """Independent re-fetch of arxiv/web raw candidates for comparison — no
    Anthropic cost, unchanged from the original script."""
    from sources.arxiv import fetch_arxiv
    from sources.websearch import fetch_web

    real_titles: set[str] = set()
    if "arxiv" in sources:
        real_titles |= {p["title"] for p in fetch_arxiv(item.query, max_results=8) if p.get("title")}
    if "web" in sources and resources.settings.tavily_api_key:
        # NOTE: this re-fetch is unfiltered/all-time, while SearchAgent.run() defaults
        # web_days=90 internally. For time-sensitive queries real_titles can be broader
        # than anything SearchAgent could legitimately return, inflating hallucination_rate.
        real_titles |= {
            w["title"]
            for w in fetch_web(item.query, resources.settings.tavily_api_key, max_results=8)
            if w.get("title")
        }
    return real_titles


async def _run(limit: int | None, use_cached_results: str | None) -> None:
    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)

    items = load_search_eval()
    items = sample_per_group(items, lambda it: ",".join(sorted(it.expected_sources)), limit)

    from core.metering import meter

    actual_sources_by_id = {}
    routing_prompt_total = 0
    routing_completion_total = 0
    for item in items:
        with meter() as m:
            actual_sources_by_id[item.id] = await _routing_for(item, resources, user_id)
        routing_prompt_total += m.prompt_total
        routing_completion_total += m.completion_total

    candidates_by_id = {}
    for item in items:
        candidates_by_id[item.id] = await _fetch_candidates(item, actual_sources_by_id[item.id], resources)

    translate_results: dict | None = None
    score_results: dict | None = None
    if use_cached_results:
        cached = json.loads(Path(use_cached_results).read_text())
        translate_texts, score_texts = cached["translate"], cached["score"]
    else:
        translate_texts, translate_results = _run_translate_batch(
            items, candidates_by_id, resources.settings.anthropic_api_key,
        )
        score_texts, score_results = _run_score_batch(
            items, candidates_by_id, translate_texts, resources.settings.anthropic_api_key,
        )
        saved = _save_combined_raw(translate_texts, score_texts)
        print(f"Raw batch results (translate+score) saved to: {saved}")

    usage_path = _save_usage(
        routing_prompt_total=routing_prompt_total, routing_completion_total=routing_completion_total,
        model=resources.settings.anthropic_model, model_light=resources.settings.anthropic_model_light,
        translate_results=translate_results, score_results=score_results,
    )
    print(f"Usage saved to: {usage_path}")

    rows = []
    for item in items:
        actual_sources = actual_sources_by_id[item.id]
        returned_titles = _build_hallucination_data(item, candidates_by_id, score_texts)
        _, sources_used = candidates_by_id[item.id]
        real_titles = _real_titles_for(item, sources_used, resources)

        actual = set(actual_sources) if actual_sources else set()
        expected = set(item.expected_sources)
        rows.append({
            "id": item.id, "query": item.query,
            "expected_sources": sorted(expected), "actual_sources": sorted(actual),
            "routing_correct": actual == expected,
            "returned_titles": returned_titles, "real_titles": sorted(real_titles),
        })

    for row in rows:
        print(
            f"{row['id']}: expected={row['expected_sources']} actual={row['actual_sources']} "
            f"{'OK' if row['routing_correct'] else 'MISS'}"
        )

    expected = [set(r["expected_sources"]) for r in rows]
    actual = [set(r["actual_sources"]) for r in rows]
    accuracy = routing_accuracy(expected, actual)
    hallu = hallucination_rate(
        [r["returned_titles"] for r in rows], [set(r["real_titles"]) for r in rows],
    )

    _RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _RESULTS_PATH.write_text(json.dumps(
        {"rows": rows, "routing_accuracy": accuracy, "hallucination_rate": hallu},
        ensure_ascii=False, indent=2,
    ))
    print(f"\nRouting Accuracy: {accuracy:.2%}  Hallucination Rate: {hallu:.2%}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max queries per source-set group")
    parser.add_argument(
        "--use-cached-results", type=str, default=None,
        help=(
            "Path to a previously-saved run_search_eval_raw_combined_*.json — skips "
            "the translate+score Haiku batch. The routing call via Orchestrator (Sonnet, "
            "not batchable) still runs live either way."
        ),
    )
    args = parser.parse_args()
    asyncio.run(_run(args.limit, args.use_cached_results))


if __name__ == "__main__":
    main()
