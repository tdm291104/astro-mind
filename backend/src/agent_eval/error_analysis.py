from __future__ import annotations

# judges.py's rubric is 1-5; below the midpoint counts as "low". The fail-open
# error sentinel score of 0 (judges.parse_response's error path) also falls under
# this — that's intentional, judge errors should surface here too.
_LOW_JUDGE_THRESHOLD = 3


def categorize_guard(rows: list[dict]) -> dict:
    """rows: field từ results/run_guard_eval.json's "rows"
    (id, text, expected_accept, actual_accept, correct)."""
    false_reject = [
        {"id": r["id"], "text": r["text"]}
        for r in rows if r["expected_accept"] and not r["actual_accept"]
    ]
    false_accept = [
        {"id": r["id"], "text": r["text"]}
        for r in rows if not r["expected_accept"] and r["actual_accept"]
    ]
    return {"false_reject": false_reject, "false_accept": false_accept}


def categorize_image(rows: list[dict]) -> dict:
    """rows fields: id, expected_class_name, expected_sub_type,
    actual_class_name, actual_sub_type, correct."""
    wrong_class, wrong_sub_type, no_detection = [], [], []
    for r in rows:
        if r["correct"]:
            continue
        if not r["actual_class_name"]:
            no_detection.append({"id": r["id"], "expected_class_name": r["expected_class_name"]})
        elif r["actual_class_name"] != r["expected_class_name"]:
            wrong_class.append({
                "id": r["id"], "expected_class_name": r["expected_class_name"],
                "actual_class_name": r["actual_class_name"],
            })
        else:
            wrong_sub_type.append({
                "id": r["id"], "expected_sub_type": r["expected_sub_type"],
                "actual_sub_type": r["actual_sub_type"],
            })
    return {
        "wrong_class": wrong_class, "wrong_sub_type": wrong_sub_type, "no_detection": no_detection,
    }


def categorize_notebook(rows: list[dict]) -> dict:
    """rows fields: id, question, expected_page, returned_pages,
    expected_keyword, keyword_hit."""
    zero_citations, wrong_page, keyword_miss = [], [], []
    for r in rows:
        if not r["returned_pages"]:
            zero_citations.append({"id": r["id"], "question": r["question"]})
        elif r["expected_page"] not in r["returned_pages"]:
            wrong_page.append({
                "id": r["id"],
                "expected_page": r["expected_page"],
                "returned_pages": r["returned_pages"],
            })
        if not r["keyword_hit"]:
            keyword_miss.append({"id": r["id"], "expected_keyword": r["expected_keyword"]})
    return {
        "zero_citations": zero_citations, "wrong_page": wrong_page, "keyword_miss": keyword_miss,
    }


def categorize_report(rows: list[dict]) -> dict:
    """rows fields: id, required_sections, text, urls_in_text, real_urls, judge."""
    missing_sections, hallucinated_urls, low_judge_score = [], [], []
    for r in rows:
        missing = [s for s in r["required_sections"] if f"## {s}" not in r["text"]]
        if missing:
            missing_sections.append({"id": r["id"], "missing": missing})
        extra_urls = [u for u in r["urls_in_text"] if u not in r["real_urls"]]
        if extra_urls:
            hallucinated_urls.append({"id": r["id"], "urls": extra_urls})
        judge = r["judge"]
        low_dims = [
            k for k in ("mach_lac", "van_phong", "do_sau")
            if judge.get(k, 0) < _LOW_JUDGE_THRESHOLD
        ]
        if low_dims:
            low_judge_score.append({"id": r["id"], "dimensions": low_dims, "judge": judge})
    return {
        "missing_sections": missing_sections, "hallucinated_urls": hallucinated_urls,
        "low_judge_score": low_judge_score,
    }


def categorize_search(rows: list[dict]) -> dict:
    """rows fields: id, expected_sources, actual_sources, routing_correct,
    returned_titles, real_titles."""
    under_route, over_route, wrong_route, hallucinated_titles = [], [], [], []
    for r in rows:
        expected, actual = set(r["expected_sources"]), set(r["actual_sources"])
        if not r["routing_correct"]:
            if actual < expected:
                under_route.append({"id": r["id"], "missing": sorted(expected - actual)})
            elif actual > expected:
                over_route.append({"id": r["id"], "extra": sorted(actual - expected)})
            else:
                wrong_route.append({
                    "id": r["id"], "expected": sorted(expected), "actual": sorted(actual),
                })
        extra_titles = [t for t in r["returned_titles"] if t not in r["real_titles"]]
        if extra_titles:
            hallucinated_titles.append({"id": r["id"], "titles": extra_titles})
    return {
        "under_route": under_route, "over_route": over_route, "wrong_route": wrong_route,
        "hallucinated_titles": hallucinated_titles,
    }


def categorize_route(single_rows: list[dict], compound_rows: list[dict]) -> dict:
    """single_rows fields: id, expected_action, actual_actions, correct.
    compound_rows fields: id, expected_actions, actual_actions, correct."""
    wrong_tool, no_tool_called = [], []
    for r in single_rows:
        if r["correct"]:
            continue
        # ["direct_chat"] is the exact sentinel run_route_eval.py's _actions_for substitutes
        # when zero tool-call actions occurred (see `actions or ["direct_chat"]` there).
        if r["actual_actions"] == ["direct_chat"] and r["expected_action"] != "direct_chat":
            no_tool_called.append({"id": r["id"], "expected_action": r["expected_action"]})
        else:
            wrong_tool.append({
                "id": r["id"],
                "expected_action": r["expected_action"],
                "actual_actions": r["actual_actions"],
            })

    missing_step, extra_step, wrong_order = [], [], []
    for r in compound_rows:
        if r["correct"]:
            continue
        expected, actual = r["expected_actions"], r["actual_actions"]
        entry = {"id": r["id"], "expected": expected, "actual": actual}
        if len(actual) < len(expected):
            missing_step.append(entry)
        elif len(actual) > len(expected):
            extra_step.append(entry)
        else:
            wrong_order.append(entry)

    return {
        "wrong_tool": wrong_tool, "no_tool_called": no_tool_called,
        "missing_step": missing_step, "extra_step": extra_step, "wrong_order": wrong_order,
    }
