from __future__ import annotations


def classification_accuracy(
    expected: list[tuple[str, str]], actual: list[tuple[str, str]]
) -> float:
    """expected/actual: parallel lists of (class_name, sub_type). sub_type may be "".
    A pair counts as correct when class_name matches and, if expected sub_type is
    non-empty, sub_type also matches.
    """
    if not expected:
        return 0.0
    correct = 0
    for (e_class, e_sub), (a_class, a_sub) in zip(expected, actual):
        if e_class != a_class:
            continue
        if e_sub and e_sub != a_sub:
            continue
        correct += 1
    return correct / len(expected)


def citation_precision_recall(
    expected_pages: list[int], returned_pages: list[list[int]]
) -> tuple[float, float]:
    """expected_pages[i] is the expected page for question i; returned_pages[i]
    is the list of pages across all citations returned for question i.

    Precision = citations matching the expected page / total citations returned
    (across all questions). Recall = questions with >=1 matching citation /
    total questions.
    """
    if not expected_pages:
        return 0.0, 0.0
    total_citations = 0
    matching_citations = 0
    hit_questions = 0
    for expected_page, pages in zip(expected_pages, returned_pages):
        total_citations += len(pages)
        matches = sum(1 for p in pages if p == expected_page)
        matching_citations += matches
        if matches > 0:
            hit_questions += 1
    precision = matching_citations / total_citations if total_citations else 0.0
    recall = hit_questions / len(expected_pages)
    return precision, recall


def routing_accuracy(expected: list[set[str]], actual: list[set[str]]) -> float:
    """Fraction of items where the actual set of categories exactly equals the
    expected set. Used for both Search Agent source routing and overall Route
    Accuracy (wrap a single expected_action as {expected_action})."""
    if not expected:
        return 0.0
    correct = sum(1 for e, a in zip(expected, actual) if e == a)
    return correct / len(expected)


def compound_success_rate(expected: list[list[str]], actual: list[list[str]]) -> float:
    """Fraction of items where the actual ORDERED sequence of categories exactly
    matches the expected ordered sequence (order matters, unlike routing_accuracy)."""
    if not expected:
        return 0.0
    correct = sum(1 for e, a in zip(expected, actual) if e == a)
    return correct / len(expected)


def guard_false_rates(
    expected_accept: list[bool], actual_accept: list[bool]
) -> tuple[float, float]:
    """Returns (false_reject_rate, false_accept_rate).
    False reject: a valid (expected True) message was blocked (actual False).
    False accept: an invalid (expected False) message was let through (actual True).
    """
    valid = [a for e, a in zip(expected_accept, actual_accept) if e]
    invalid = [a for e, a in zip(expected_accept, actual_accept) if not e]
    false_reject = (sum(1 for a in valid if not a) / len(valid)) if valid else 0.0
    false_accept = (sum(1 for a in invalid if a) / len(invalid)) if invalid else 0.0
    return false_reject, false_accept


def section_completeness(expected_sections: list[set[str]], texts: list[str]) -> float:
    """For each report, the fraction of required '## heading' sections actually
    present in its text (as a literal substring), averaged across all reports
    (each report weighted equally)."""
    if not expected_sections:
        return 0.0
    ratios = []
    for sections, text in zip(expected_sections, texts):
        if not sections:
            ratios.append(1.0)
            continue
        present = sum(1 for s in sections if f"## {s}" in text)
        ratios.append(present / len(sections))
    return sum(ratios) / len(ratios)


def hallucination_rate(
    returned_per_item: list[list[str]], real_per_item: list[set[str]]
) -> float:
    """For each item, the fraction of returned identifiers (titles/URLs) that are
    NOT present in that item's OWN real/fetched identifier set, averaged across
    items (each item weighted equally, not by identifier count).

    Identifier sets are compared per-item, never pooled globally — a real
    identifier belonging to one item must never mask a hallucinated identifier
    in a different item.
    """
    if not returned_per_item:
        return 0.0
    ratios = []
    for returned, real in zip(returned_per_item, real_per_item):
        if not returned:
            ratios.append(0.0)
            continue
        bad = sum(1 for r in returned if r not in real)
        ratios.append(bad / len(returned))
    return sum(ratios) / len(ratios)
