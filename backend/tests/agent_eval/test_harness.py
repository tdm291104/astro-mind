from pathlib import Path


def test_build_eval_resources_isolates_data_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-used")
    monkeypatch.delenv("DATA_DIR", raising=False)
    monkeypatch.chdir(tmp_path)

    from agent_eval.harness import build_eval_resources
    resources = build_eval_resources()

    assert resources.settings.data_dir == Path("data/eval_run")
    assert (tmp_path / "data" / "eval_run" / "docs").is_dir()
    assert (tmp_path / "data" / "eval_run" / "chroma").is_dir()


def test_ensure_eval_user_is_idempotent(monkeypatch, tmp_path):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-used")
    monkeypatch.delenv("DATA_DIR", raising=False)
    monkeypatch.chdir(tmp_path)

    from agent_eval.harness import build_eval_resources, ensure_eval_user
    resources = build_eval_resources()

    user_id_1 = ensure_eval_user(resources.store)
    user_id_2 = ensure_eval_user(resources.store)
    assert user_id_1 == user_id_2
    assert resources.store.get_user_by_id(user_id_1) is not None


def test_sample_per_group_caps_per_category():
    from agent_eval.harness import sample_per_group

    items = ["a1", "a2", "a3", "b1", "b2"]
    result = sample_per_group(items, lambda x: x[0], limit=1)
    assert result == ["a1", "b1"]


def test_sample_per_group_none_limit_returns_all():
    from agent_eval.harness import sample_per_group

    items = ["a1", "a2", "b1"]
    assert sample_per_group(items, lambda x: x[0], limit=None) == items
