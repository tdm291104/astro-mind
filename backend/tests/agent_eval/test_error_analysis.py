from agent_eval.error_analysis import (
    categorize_guard, categorize_image, categorize_notebook,
    categorize_report, categorize_route, categorize_search,
)


def test_categorize_guard_splits_false_reject_and_false_accept():
    rows = [
        {"id": "g01", "text": "hố đen", "expected_accept": True, "actual_accept": False, "correct": False},
        {"id": "g02", "text": "nấu ăn", "expected_accept": False, "actual_accept": True, "correct": False},
        {"id": "g03", "text": "sao chổi", "expected_accept": True, "actual_accept": True, "correct": True},
    ]
    result = categorize_guard(rows)
    assert result["false_reject"] == [{"id": "g01", "text": "hố đen"}]
    assert result["false_accept"] == [{"id": "g02", "text": "nấu ăn"}]


def test_categorize_image_buckets_no_detection_wrong_class_wrong_subtype():
    rows = [
        {"id": "i1", "expected_class_name": "galaxy", "expected_sub_type": "spiral",
         "actual_class_name": "", "actual_sub_type": "", "correct": False},
        {"id": "i2", "expected_class_name": "galaxy", "expected_sub_type": "spiral",
         "actual_class_name": "planet", "actual_sub_type": "", "correct": False},
        {"id": "i3", "expected_class_name": "galaxy", "expected_sub_type": "spiral",
         "actual_class_name": "galaxy", "actual_sub_type": "elliptical", "correct": False},
    ]
    result = categorize_image(rows)
    assert [r["id"] for r in result["no_detection"]] == ["i1"]
    assert [r["id"] for r in result["wrong_class"]] == ["i2"]
    assert [r["id"] for r in result["wrong_sub_type"]] == ["i3"]


def test_categorize_notebook_buckets_zero_citations_wrong_page_keyword_miss():
    rows = [
        {"id": "n1", "question": "q1", "expected_page": 5, "returned_pages": [],
         "expected_keyword": "GW150914", "keyword_hit": False},
        {"id": "n2", "question": "q2", "expected_page": 5, "returned_pages": [7],
         "expected_keyword": "GW150914", "keyword_hit": False},
        {"id": "n3", "question": "q3", "expected_page": 5, "returned_pages": [5],
         "expected_keyword": "GW150914", "keyword_hit": True},
    ]
    result = categorize_notebook(rows)
    assert [r["id"] for r in result["zero_citations"]] == ["n1"]
    assert [r["id"] for r in result["wrong_page"]] == ["n2"]
    assert [r["id"] for r in result["keyword_miss"]] == ["n1", "n2"]


def test_categorize_report_buckets_missing_sections_hallucinated_urls_low_judge():
    rows = [{
        "id": "r1", "required_sections": ["Tổng quan", "Thách thức"],
        "text": "## Tổng quan\nnoi dung",
        "urls_in_text": ["https://fake.example"], "real_urls": [],
        "judge": {"mach_lac": 2, "van_phong": 4, "do_sau": 4},
    }]
    result = categorize_report(rows)
    assert result["missing_sections"] == [{"id": "r1", "missing": ["Thách thức"]}]
    assert result["hallucinated_urls"] == [{"id": "r1", "urls": ["https://fake.example"]}]
    assert result["low_judge_score"] == [{"id": "r1", "dimensions": ["mach_lac"], "judge": rows[0]["judge"]}]


def test_categorize_search_buckets_under_over_wrong_route_and_hallucination():
    rows = [
        {"id": "s1", "query": "q", "expected_sources": ["arxiv", "web"], "actual_sources": ["arxiv"],
         "routing_correct": False, "returned_titles": [], "real_titles": []},
        {"id": "s2", "query": "q", "expected_sources": ["arxiv"], "actual_sources": ["arxiv", "web"],
         "routing_correct": False, "returned_titles": [], "real_titles": []},
        {"id": "s3", "query": "q", "expected_sources": ["arxiv"], "actual_sources": ["web"],
         "routing_correct": False, "returned_titles": ["Fake Paper"], "real_titles": ["Real Paper"]},
    ]
    result = categorize_search(rows)
    assert [r["id"] for r in result["under_route"]] == ["s1"]
    assert [r["id"] for r in result["over_route"]] == ["s2"]
    assert [r["id"] for r in result["wrong_route"]] == ["s3"]
    assert result["hallucinated_titles"] == [{"id": "s3", "titles": ["Fake Paper"]}]


def test_categorize_route_buckets_single_and_compound_failures():
    singles = [
        {"id": "rt1", "expected_action": "search", "actual_actions": ["direct_chat"], "correct": False},
        {"id": "rt2", "expected_action": "search", "actual_actions": ["notebook"], "correct": False},
        {"id": "rt3", "expected_action": "search", "actual_actions": ["search"], "correct": True},
    ]
    compounds = [
        {"id": "cp1", "expected_actions": ["image", "search"], "actual_actions": ["image"], "correct": False},
        {"id": "cp2", "expected_actions": ["image", "search"], "actual_actions": ["image", "search", "search"], "correct": False},
        {"id": "cp3", "expected_actions": ["image", "search"], "actual_actions": ["search", "image"], "correct": False},
    ]
    result = categorize_route(singles, compounds)
    assert [r["id"] for r in result["no_tool_called"]] == ["rt1"]
    assert [r["id"] for r in result["wrong_tool"]] == ["rt2"]
    assert [r["id"] for r in result["missing_step"]] == ["cp1"]
    assert [r["id"] for r in result["extra_step"]] == ["cp2"]
    assert [r["id"] for r in result["wrong_order"]] == ["cp3"]
