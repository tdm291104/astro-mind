from agent_eval.schema import load_report_eval


def test_report_eval_loads_minimum_items():
    items = load_report_eval()
    assert len(items) >= 10


def test_report_eval_has_both_types():
    items = load_report_eval()
    types = {it.report_type for it in items}
    assert types == {"research", "trending"}


def test_report_eval_sections_match_real_template():
    research_sections = {
        "Tổng quan", "Các hướng nghiên cứu chính", "Thành tựu và phát hiện tiêu biểu",
        "Bảng tóm tắt thành tựu", "Phương pháp quan sát và nghiên cứu",
        "Thách thức và câu hỏi mở", "Triển vọng tương lai", "Kết luận",
    }
    trending_sections = {
        "Tóm tắt Xu hướng", "Tổng quan", "Các hướng nghiên cứu chính",
        "Thành tựu và phát hiện tiêu biểu", "Phương pháp quan sát và nghiên cứu",
        "Thách thức và câu hỏi mở", "Dự báo Xu hướng Tương lai", "Kết luận và Gợi ý",
    }
    for it in load_report_eval():
        expected = research_sections if it.report_type == "research" else trending_sections
        assert set(it.required_sections) == expected, it.id


def test_report_eval_no_duplicate_ids():
    items = load_report_eval()
    ids = [it.id for it in items]
    assert len(ids) == len(set(ids))
