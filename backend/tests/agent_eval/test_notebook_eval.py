from agent_eval.schema import load_notebook_eval


def test_notebook_eval_loads_minimum_items():
    items = load_notebook_eval()
    assert len(items) >= 24


def test_notebook_eval_covers_all_three_docs_evenly():
    items = load_notebook_eval()
    by_doc: dict[str, int] = {}
    for it in items:
        by_doc[it.doc_label] = by_doc.get(it.doc_label, 0) + 1
    assert set(by_doc) == {"gravitational_waves", "galaxy_morphology", "exoplanet_detection"}
    for doc_label, count in by_doc.items():
        assert count >= 8, f"{doc_label} has only {count} questions"


def test_notebook_eval_pages_are_valid():
    items = load_notebook_eval()
    for it in items:
        assert it.expected_page >= 1, it.id
        assert it.expected_keyword.strip(), it.id


def test_notebook_eval_no_duplicate_ids():
    items = load_notebook_eval()
    ids = [it.id for it in items]
    assert len(ids) == len(set(ids))
