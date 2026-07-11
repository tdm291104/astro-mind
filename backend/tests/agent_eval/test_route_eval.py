from agent_eval.schema import load_route_eval

_VALID_ACTIONS = {"direct_chat", "image", "notebook", "search", "report"}


def test_route_eval_loads_minimum_singles():
    singles, _ = load_route_eval()
    assert len(singles) >= 30


def test_route_eval_covers_every_action():
    singles, _ = load_route_eval()
    actions = {it.expected_action for it in singles}
    assert actions == _VALID_ACTIONS


def test_route_eval_compound_has_minimum_items():
    _, compounds = load_route_eval()
    assert len(compounds) >= 10


def test_route_eval_compound_actions_are_valid_and_ordered():
    _, compounds = load_route_eval()
    for c in compounds:
        assert len(c.expected_actions) >= 2, c.id
        assert set(c.expected_actions) <= _VALID_ACTIONS, c.id


def test_route_eval_no_duplicate_ids():
    singles, compounds = load_route_eval()
    ids = [it.id for it in singles] + [it.id for it in compounds]
    assert len(ids) == len(set(ids))
