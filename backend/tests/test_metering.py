from core.metering import meter, record_usage


def test_meter_total_unchanged_behavior():
    with meter() as m:
        record_usage(100, 20)
        record_usage(50, 10)
    assert m.total == 180


def test_meter_tracks_prompt_and_completion_separately():
    with meter() as m:
        record_usage(100, 20)
        record_usage(50, 10)
    assert m.prompt_total == 150
    assert m.completion_total == 30
    assert m.total == m.prompt_total + m.completion_total


def test_record_usage_outside_meter_is_noop():
    record_usage(100, 20)  # không raise, không có meter active


def test_meter_handles_none_tokens():
    with meter() as m:
        record_usage(None, None)
    assert m.total == 0
    assert m.prompt_total == 0
    assert m.completion_total == 0
