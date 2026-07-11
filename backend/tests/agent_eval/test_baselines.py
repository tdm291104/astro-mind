from types import SimpleNamespace

from agent_eval.baselines import (
    baseline_guard, baseline_image, baseline_notebook_from_retrieval,
    baseline_report_template, baseline_route_compound, baseline_route_single,
    baseline_search,
)


def test_baseline_guard_always_accepts():
    items = [SimpleNamespace(expected_accept=True), SimpleNamespace(expected_accept=False)]
    assert baseline_guard(items) == [True, True]


def test_baseline_image_picks_majority_class():
    items = [
        SimpleNamespace(expected_class_name="galaxy"),
        SimpleNamespace(expected_class_name="galaxy"),
        SimpleNamespace(expected_class_name="planet"),
    ]
    assert baseline_image(items) == [("galaxy", ""), ("galaxy", ""), ("galaxy", "")]


def test_baseline_notebook_from_retrieval_none_returns_empty():
    assert baseline_notebook_from_retrieval(None) == ("", [])


def test_baseline_notebook_from_retrieval_takes_top1_chunk():
    chunk = SimpleNamespace(content="đoạn văn gốc", page_number=7)
    doc = SimpleNamespace(name="paper.pdf")
    retrieval = ([(chunk, doc)], {"chunk-id": 0.9})
    assert baseline_notebook_from_retrieval(retrieval) == ("đoạn văn gốc", [7])


def test_baseline_notebook_from_retrieval_empty_chunks():
    assert baseline_notebook_from_retrieval(([], {})) == ("", [])


def test_baseline_report_template_fills_empty_sections():
    text = baseline_report_template(["Tổng quan", "Thách thức"])
    assert "## Tổng quan\n(chưa có nội dung)" in text
    assert "## Thách thức\n(chưa có nội dung)" in text


def test_baseline_search_always_picks_all_sources():
    items = [SimpleNamespace(query="q1"), SimpleNamespace(query="q2")]
    result = baseline_search(items)
    assert result == [{"arxiv", "apod", "images", "web"}, {"arxiv", "apod", "images", "web"}]


def test_baseline_route_single_always_direct_chat():
    items = [SimpleNamespace(expected_action="search"), SimpleNamespace(expected_action="image")]
    assert baseline_route_single(items) == ["direct_chat", "direct_chat"]


def test_baseline_route_compound_always_single_direct_chat_step():
    items = [SimpleNamespace(expected_actions=["image", "search"])]
    assert baseline_route_compound(items) == [["direct_chat"]]
