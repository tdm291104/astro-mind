from agent_eval.schema import load_image_eval


def test_image_eval_loads_minimum_items():
    items = load_image_eval()
    assert len(items) >= 12


def test_image_eval_covers_required_classes():
    items = load_image_eval()
    pairs = {(it.expected_class_name, it.expected_sub_type) for it in items}
    classes_only = {c for c, _ in pairs}
    required_with_sub = {
        ("galaxy", "spiral"), ("galaxy", "elliptical"),
        ("nebula", "emission nebula"), ("nebula", "planetary nebula"),
        ("star_cluster", "globular cluster"), ("star_cluster", "open cluster"),
    }
    required_class_only = {"comet", "asteroid", "moon", "planet", "star"}
    for pair in required_with_sub:
        assert pair in pairs, f"missing {pair}"
    for cls in required_class_only:
        assert cls in classes_only, f"missing class {cls}"


def test_image_eval_no_duplicate_ids():
    items = load_image_eval()
    ids = [it.id for it in items]
    assert len(ids) == len(set(ids))


def test_image_eval_urls_are_https():
    items = load_image_eval()
    for it in items:
        assert it.image_url.startswith("https://"), it.id
