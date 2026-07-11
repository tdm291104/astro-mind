from agent_eval.metrics import (
    citation_precision_recall, classification_accuracy, compound_success_rate,
    guard_false_rates, hallucination_rate, routing_accuracy, section_completeness,
)


def test_classification_accuracy_full_match():
    assert classification_accuracy([("galaxy", "spiral")], [("galaxy", "spiral")]) == 1.0


def test_classification_accuracy_wrong_class():
    assert classification_accuracy([("galaxy", "spiral")], [("planet", "jupiter")]) == 0.0


def test_classification_accuracy_empty_expected_subtype_ignores_actual_subtype():
    assert classification_accuracy([("comet", "")], [("comet", "anything")]) == 1.0


def test_classification_accuracy_empty_input():
    assert classification_accuracy([], []) == 0.0


def test_citation_precision_recall_perfect():
    precision, recall = citation_precision_recall([5], [[5]])
    assert precision == 1.0
    assert recall == 1.0


def test_citation_precision_recall_partial():
    precision, recall = citation_precision_recall([5, 10], [[5, 6], [3]])
    assert precision == 1 / 3
    assert recall == 0.5


def test_citation_precision_recall_no_citations_returned():
    precision, recall = citation_precision_recall([5], [[]])
    assert precision == 0.0
    assert recall == 0.0


def test_routing_accuracy_exact_match():
    assert routing_accuracy([{"arxiv"}], [{"arxiv"}]) == 1.0


def test_routing_accuracy_extra_source_counts_wrong():
    assert routing_accuracy([{"arxiv"}], [{"arxiv", "web"}]) == 0.0


def test_compound_success_rate_order_matters():
    assert compound_success_rate([["image", "search"]], [["search", "image"]]) == 0.0
    assert compound_success_rate([["image", "search"]], [["image", "search"]]) == 1.0


def test_guard_false_rates():
    expected = [True, True, False, False]
    actual = [True, False, False, True]
    false_reject, false_accept = guard_false_rates(expected, actual)
    assert false_reject == 0.5
    assert false_accept == 0.5


def test_section_completeness_partial():
    ratio = section_completeness([{"A", "B"}], ["## A\ncontent"])
    assert ratio == 0.5


def test_section_completeness_empty_required():
    assert section_completeness([set()], ["anything"]) == 1.0


def test_hallucination_rate_per_item_isolation():
    returned = [["Real Title A"], ["Real Title A"]]
    real = [{"Real Title A"}, {"Different Title B"}]
    rate = hallucination_rate(returned, real)
    assert rate == 0.5


def test_hallucination_rate_no_returned_items():
    assert hallucination_rate([[]], [set()]) == 0.0
