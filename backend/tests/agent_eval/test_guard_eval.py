from agent_eval.schema import load_guard_eval


def test_guard_eval_loads_minimum_items():
    items = load_guard_eval()
    assert len(items) >= 30


def test_guard_eval_is_balanced():
    items = load_guard_eval()
    accept = sum(1 for it in items if it.expected_accept)
    reject = len(items) - accept
    assert accept >= 12, "need enough accept cases to measure false-reject rate"
    assert reject >= 12, "need enough reject cases to measure false-accept rate"


def test_guard_eval_no_duplicate_ids():
    items = load_guard_eval()
    ids = [it.id for it in items]
    assert len(ids) == len(set(ids))
