from __future__ import annotations

from agent_eval.batch_runner import run_batch_sync


def run_keyword_batch_raw(items, agent, api_key: str) -> dict:
    from agents.report_agent import build_keyword_request

    requests = [
        {"custom_id": item.id, "params": build_keyword_request(item.topic, model=agent.model_light)}
        for item in items
    ]
    return run_batch_sync(requests, api_key=api_key)


def run_report_batch_raw(items, context_by_id: dict, agent, api_key: str) -> dict:
    from agents.report_agent import build_research_report_request, build_trending_report_request

    requests = []
    for item in items:
        ctx = context_by_id[item.id]
        if item.report_type == "trending":
            params = build_trending_report_request(
                item.topic, ctx["keywords"], ctx["web_context"], ctx["papers"], ctx["top_authors"],
                model=agent.model, notebook_text=ctx["notebook_text"], session_text=ctx["session_text"],
            )
        else:
            params = build_research_report_request(
                item.topic, ctx["keywords"], ctx["web_context"], ctx["papers"], model=agent.model,
                notebook_text=ctx["notebook_text"], session_text=ctx["session_text"],
            )
        requests.append({"custom_id": item.id, "params": params})
    return run_batch_sync(requests, api_key=api_key)


def run_judge_batch_raw(items, report_texts: dict, api_key: str, model: str) -> dict:
    from agent_eval.judges import build_request as build_judge_request

    requests = [
        {
            "custom_id": item.id,
            "params": build_judge_request(report_texts.get(item.id) or "", item.topic, model=model),
        }
        for item in items
    ]
    return run_batch_sync(requests, api_key=api_key)
