from agent_eval.repro_stats import modal_agreement_rate, score_stddev


def test_modal_agreement_rate_all_same():
    assert modal_agreement_rate([True, True, True]) == 1.0


def test_modal_agreement_rate_majority():
    assert modal_agreement_rate([True, True, False]) == 2 / 3


def test_modal_agreement_rate_empty():
    assert modal_agreement_rate([]) == 0.0


def test_modal_agreement_rate_works_with_tuples():
    results = [("arxiv", "web"), ("arxiv", "web"), ("arxiv",)]
    assert modal_agreement_rate(results) == 2 / 3


def test_score_stddev_zero_when_all_equal():
    assert score_stddev([4, 4, 4]) == 0.0


def test_score_stddev_single_value():
    assert score_stddev([4]) == 0.0


def test_score_stddev_empty():
    assert score_stddev([]) == 0.0


def test_score_stddev_known_value():
    # population stddev of [1, 2, 3] = sqrt(((1-2)^2+(2-2)^2+(3-2)^2)/3) = sqrt(2/3)
    result = score_stddev([1, 2, 3])
    assert abs(result - (2 / 3) ** 0.5) < 1e-9
