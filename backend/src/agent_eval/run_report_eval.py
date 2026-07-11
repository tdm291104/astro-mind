from __future__ import annotations

import argparse
import json
import re
import time
from datetime import UTC, datetime
from pathlib import Path

from agent_eval.harness import build_eval_resources, ensure_eval_user, sample_per_group
from agent_eval.metrics import hallucination_rate, section_completeness
from agent_eval.schema import load_report_eval

_RESULTS_PATH = Path(__file__).parent / "results" / "run_report_eval.json"
_RESULTS_DIR = Path(__file__).parent / "results"
# NOTE: report_agent.py's generated prose never embeds raw URLs (cites by title
# only; real URLs live in `references`), so this regex always matches []. The
# resulting hallucination_rate is structurally pinned to 0.0 — not earned.
_URL_RE = re.compile(r"https?://\S+")


def _make_agent(resources, user_id: str):
    from agents.report_agent import ReportAgent

    return ReportAgent(
        api_key=resources.settings.anthropic_api_key,
        model=resources.settings.anthropic_model,
        model_light=resources.settings.anthropic_model_light,
        tavily_key=resources.settings.tavily_api_key,
        serpapi_api_key=resources.settings.serpapi_api_key,
        store=resources.store, user_id=user_id,
        vector=resources.vector, embedder=resources.embedder, reranker=resources.reranker,
    )


def _extract_texts(batch_results: dict) -> dict[str, str | None]:
    from agents.llm import extract_text

    return {
        custom_id: (extract_text(message) if message is not None else None)
        for custom_id, message in batch_results.items()
    }


def _save_usage(
    keyword_results: dict, report_results: dict, judge_results: dict,
    *, model_light: str, model: str, trend_prompt_total: int, trend_completion_total: int,
) -> Path:
    from agent_eval.instrumentation import extract_usage, usage_record

    calls = [
        usage_record(
            call_type="keyword", model=model_light, is_batch=True,
            usage={cid: extract_usage(m) for cid, m in keyword_results.items()},
        ),
        usage_record(
            call_type="write", model=model, is_batch=True,
            usage={cid: extract_usage(m) for cid, m in report_results.items()},
        ),
        usage_record(
            call_type="judge", model=model, is_batch=True,
            usage={cid: extract_usage(m) for cid, m in judge_results.items()},
        ),
        # Trend analysis (analyze_trends/analyze_interest) là live, không batch —
        # đo qua core.metering.meter(), KHÔNG tách được theo từng item (meter()
        # gộp toàn bộ _collect_trending's live calls trong 1 lần đo).
        usage_record(
            call_type="trend_analysis_live", model=model, is_batch=False,
            usage={"_all_trending_items": {
                "input_tokens": trend_prompt_total, "output_tokens": trend_completion_total,
            }},
        ),
    ]
    path = _RESULTS_DIR / f"usage_report_{int(time.time())}.json"
    path.write_text(json.dumps({"calls": calls}, ensure_ascii=False, indent=2))
    return path


# NOTE: not called by _run() anymore (it calls report_eval_batches.run_*_batch_raw
# directly to keep raw Message objects for usage capture) — kept as a public reuse
# surface for run_ablation_eval.py's haiku_writer/no_trend_data variants.
def _run_keyword_batch(items, agent, api_key: str) -> dict[str, str | None]:
    from agent_eval.report_eval_batches import run_keyword_batch_raw
    return _extract_texts(run_keyword_batch_raw(items, agent, api_key))


def _parse_keywords(items, keyword_texts: dict) -> dict[str, list[str]]:
    from agents.report_agent import parse_keyword_response

    keywords_by_id = {}
    for item in items:
        raw_text = keyword_texts.get(item.id)
        keywords_by_id[item.id] = (
            parse_keyword_response(raw_text, item.topic) if raw_text is not None else [item.topic]
        )
    return keywords_by_id


def _fetch_context(items, agent, keywords_by_id: dict) -> dict[str, dict]:
    """Live, no-Anthropic-cost fetch (Tavily/arXiv REST calls) for each item,
    then build the deterministic references list. doc_ids is never passed by
    this eval script, so notebook context is always empty — matches the
    original script's behavior exactly."""
    from agents.report_agent import _build_references

    context_by_id: dict[str, dict] = {}
    for item in items:
        keywords = keywords_by_id[item.id]
        web_context = agent._fetch_web_context(item.topic)
        papers = agent._fetch_arxiv_papers(keywords)
        context_by_id[item.id] = {
            "keywords": keywords, "web_context": web_context, "papers": papers,
            "notebook_text": "", "session_text": "", "top_authors": None,
            "references": _build_references(web_context, papers, notebook_citations=[]),
        }
    return context_by_id


def _collect_trending(items, agent, context_by_id: dict) -> None:
    """Live Sonnet calls (not batched, per design decision — only 0-8 calls
    per full run across analyze_trends/analyze_interest combined, not worth a
    batch round). Mutates context_by_id in place with top_authors for
    trending items. Only called on the live (non-cached) path — cached-replay
    already has the final report text and doesn't need to re-derive this."""
    from agents.report_agent import _compute_author_frequency

    for item in items:
        if item.report_type != "trending":
            continue
        ctx = context_by_id[item.id]
        prev_year = datetime.now(UTC).year - 2
        recent_year = datetime.now(UTC).year - 1
        agent._collect_trending_data(ctx["keywords"], prev_year, recent_year)
        ctx["top_authors"] = _compute_author_frequency(ctx["papers"])


# NOTE: not called by _run() anymore (it calls report_eval_batches.run_*_batch_raw
# directly to keep raw Message objects for usage capture) — kept as a public reuse
# surface for run_ablation_eval.py's haiku_writer/no_trend_data variants.
def _run_report_batch(items, context_by_id: dict, agent, api_key: str) -> dict[str, str | None]:
    from agent_eval.report_eval_batches import run_report_batch_raw
    return _extract_texts(run_report_batch_raw(items, context_by_id, agent, api_key))


# NOTE: not called by _run() anymore (it calls report_eval_batches.run_*_batch_raw
# directly to keep raw Message objects for usage capture) — kept as a public reuse
# surface for run_ablation_eval.py's haiku_writer/no_trend_data variants.
def _run_judge_batch(items, report_texts: dict, api_key: str, model: str) -> dict[str, str | None]:
    from agent_eval.report_eval_batches import run_judge_batch_raw
    return _extract_texts(run_judge_batch_raw(items, report_texts, api_key, model))


def _persist_reports(items, resources, user_id: str, context_by_id: dict, report_texts: dict) -> dict[str, str]:
    from agents.report_agent import _EMPTY_PAYLOAD

    report_ids = {}
    for item in items:
        ctx = context_by_id[item.id]
        text = report_texts.get(item.id) or ""
        # NOTE: topics/interest stay empty (from _EMPTY_PAYLOAD) even for trending
        # items — _collect_trending discards _collect_trending_data's full return,
        # keeping only top_authors. This eval-generated report is for research_text/
        # judge metrics, not for rendering report-UI trend charts.
        payload = {
            **_EMPTY_PAYLOAD,
            "generating": False,
            "report_type": item.report_type,
            "research_text": text,
            "keywords": ctx["keywords"],
            # top_authors is None on cached-replay or non-trending items.
            "top_authors": ctx["top_authors"] or [],
            "references": ctx["references"],
            "generated_at": datetime.now(UTC).isoformat(),
        }
        title = f"Báo cáo: {item.topic[:60].strip()}"
        report_ids[item.id] = resources.store.create_report(user_id, title, payload)
    return report_ids


def _build_rows(items, context_by_id: dict, report_texts: dict, judge_texts: dict, report_ids: dict) -> list[dict]:
    from agent_eval.judges import parse_response as parse_judge_response

    rows = []
    for item in items:
        ctx = context_by_id[item.id]
        text = report_texts.get(item.id) or ""
        urls_in_text = sorted(set(_URL_RE.findall(text)))
        real_urls = sorted({r["url"] for r in ctx["references"] if r.get("url")})
        judge_raw = judge_texts.get(item.id)
        judge = (
            parse_judge_response(judge_raw) if judge_raw is not None
            else {"mach_lac": 0, "van_phong": 0, "do_sau": 0, "error": "batch item failed"}
        )
        rows.append({
            "id": item.id, "topic": item.topic, "report_type": item.report_type,
            "report_id": report_ids.get(item.id),
            "required_sections": item.required_sections, "text": text,
            "urls_in_text": urls_in_text, "real_urls": real_urls, "judge": judge,
        })
    return rows


def _save_combined_raw(keyword_texts: dict, report_texts: dict, judge_texts: dict) -> Path:
    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _RESULTS_DIR / f"run_report_eval_raw_combined_{int(time.time())}.json"
    path.write_text(json.dumps(
        {"keywords": keyword_texts, "reports": report_texts, "judge": judge_texts},
        ensure_ascii=False, indent=2,
    ))
    return path


def _run(limit: int | None, use_cached_results: str | None) -> None:
    items = load_report_eval()
    items = sample_per_group(items, lambda it: it.report_type, limit)

    resources = build_eval_resources()
    user_id = ensure_eval_user(resources.store)
    agent = _make_agent(resources, user_id)
    api_key = resources.settings.anthropic_api_key

    if use_cached_results:
        cached = json.loads(Path(use_cached_results).read_text())
        keyword_texts, report_texts, judge_texts = cached["keywords"], cached["reports"], cached["judge"]
        keywords_by_id = _parse_keywords(items, keyword_texts)
        context_by_id = _fetch_context(items, agent, keywords_by_id)
    else:
        from agent_eval.report_eval_batches import run_keyword_batch_raw, run_report_batch_raw, run_judge_batch_raw
        from core.metering import meter

        keyword_results = run_keyword_batch_raw(items, agent, api_key)
        keyword_texts = _extract_texts(keyword_results)
        keywords_by_id = _parse_keywords(items, keyword_texts)

        context_by_id = _fetch_context(items, agent, keywords_by_id)
        with meter() as trend_meter:
            _collect_trending(items, agent, context_by_id)

        report_results = run_report_batch_raw(items, context_by_id, agent, api_key)
        report_texts = _extract_texts(report_results)
        judge_results = run_judge_batch_raw(items, report_texts, api_key, resources.settings.anthropic_model)
        judge_texts = _extract_texts(judge_results)

        saved = _save_combined_raw(keyword_texts, report_texts, judge_texts)
        print(f"Raw batch results (3 rounds) saved to: {saved}")
        usage_path = _save_usage(
            keyword_results, report_results, judge_results,
            model_light=agent.model_light, model=agent.model,
            trend_prompt_total=trend_meter.prompt_total, trend_completion_total=trend_meter.completion_total,
        )
        print(f"Usage saved to: {usage_path}")

    report_ids = _persist_reports(items, resources, user_id, context_by_id, report_texts)
    rows = _build_rows(items, context_by_id, report_texts, judge_texts, report_ids)

    for row in rows:
        present = sum(1 for s in row["required_sections"] if f"## {s}" in row["text"])
        print(f"{row['id']}: sections {present}/{len(row['required_sections'])}, judge={row['judge']}")

    # NOTE: report_agent.py's LLM calls omit max_tokens (defaults to 4096), which
    # can truncate long multi-section reports mid-sentence in the final sections.
    # A low completeness score here may reflect truncation, not the model
    # genuinely choosing to skip a section.
    completeness = section_completeness(
        [set(r["required_sections"]) for r in rows], [r["text"] for r in rows],
    )
    hallu = hallucination_rate(
        [r["urls_in_text"] for r in rows], [set(r["real_urls"]) for r in rows],
    )

    _RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _RESULTS_PATH.write_text(json.dumps(
        {"rows": rows, "section_completeness": completeness, "hallucination_rate": hallu},
        ensure_ascii=False, indent=2,
    ))
    print(f"\nSection Completeness: {completeness:.2%}  Hallucination Rate: {hallu:.2%}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max topics per report_type")
    parser.add_argument(
        "--use-cached-results", type=str, default=None,
        help="Path to a previously-saved run_report_eval_raw_combined_*.json — recompute metrics without calling the API",
    )
    args = parser.parse_args()
    _run(args.limit, args.use_cached_results)


if __name__ == "__main__":
    main()
