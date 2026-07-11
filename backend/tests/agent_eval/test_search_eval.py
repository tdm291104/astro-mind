from agent_eval.schema import load_search_eval

_VALID_SOURCES = {"arxiv", "apod", "images", "web"}


def test_search_eval_loads_minimum_items():
    items = load_search_eval()
    assert len(items) >= 24


def test_search_eval_sources_are_valid():
    items = load_search_eval()
    for it in items:
        assert it.expected_sources, it.id
        assert set(it.expected_sources) <= _VALID_SOURCES, it.id


def test_search_eval_covers_every_single_source():
    items = load_search_eval()
    single_source_cases = {
        s for it in items if len(it.expected_sources) == 1 for s in it.expected_sources
    }
    assert single_source_cases == _VALID_SOURCES


def test_search_eval_no_duplicate_ids():
    items = load_search_eval()
    ids = [it.id for it in items]
    assert len(ids) == len(set(ids))
