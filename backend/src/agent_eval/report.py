from __future__ import annotations

import json
from pathlib import Path

_RESULTS_DIR = Path(__file__).parent / "results"

_SIMPLE_FILES = [
    ("Image Agent", "run_image_eval.json", [("classification_accuracy", "Classification Accuracy")]),
    ("Notebook Agent", "run_notebook_eval.json", [
        ("citation_precision", "Citation Precision"), ("citation_recall", "Citation Recall"),
    ]),
    ("Search Agent", "run_search_eval.json", [
        ("routing_accuracy", "Routing Accuracy"), ("hallucination_rate", "Hallucination Rate"),
    ]),
    ("Report Agent", "run_report_eval.json", [
        ("section_completeness", "Section Completeness"), ("hallucination_rate", "Hallucination Rate"),
    ]),
    ("Route tổng thể", "run_route_eval.json", [
        ("route_accuracy", "Route Accuracy"), ("compound_success_rate", "Compound Success Rate"),
    ]),
    ("Input Guard", "run_guard_eval.json", [
        ("false_reject_rate", "False Reject Rate"), ("false_accept_rate", "False Accept Rate"),
    ]),
]


def _judge_summary_row(data: dict) -> str | None:
    rows = data.get("rows", [])
    judged = [r["judge"] for r in rows if "judge" in r]
    if not judged:
        return None
    avg = {
        k: sum(j.get(k, 0) for j in judged) / len(judged)
        for k in ("mach_lac", "van_phong", "do_sau")
    }
    return (
        f"| Report Agent | Judge (mạch lạc/văn phong/độ sâu, thang 1-5, "
        f"**model tự chấm — xem giới hạn trong spec**) "
        f"| {avg['mach_lac']:.1f} / {avg['van_phong']:.1f} / {avg['do_sau']:.1f} |"
    )


def build_report() -> str:
    lines = ["# Kết quả đánh giá Agent\n", "| Agent | Metric | Giá trị |", "|---|---|---|"]
    for label, filename, keys in _SIMPLE_FILES:
        path = _RESULTS_DIR / filename
        if not path.exists():
            lines.append(f"| {label} | (chưa chạy) | - |")
            continue
        data = json.loads(path.read_text())
        for key, display_name in keys:
            value = data.get(key)
            if value is not None:
                lines.append(f"| {label} | {display_name} | {value:.2%} |")
        if label == "Report Agent":
            judge_row = _judge_summary_row(data)
            if judge_row:
                lines.append(judge_row)
    lines.append("\n## Giới hạn đã biết\n")
    lines.append(
        "- **Report Agent — Hallucination Rate**: luôn 0% về cấu trúc (báo cáo không "
        "chèn URL thô trong văn bản, chỉ trích dẫn qua tiêu đề), không phải bằng chứng "
        "chất lượng — xem `run_report_eval.py`."
    )
    lines.append(
        "- **Route tổng thể — Compound Success Rate**: yêu cầu khớp đúng thứ tự tuyệt đối "
        "chuỗi tool gọi; vòng lặp ReAct có thể không ổn định giữa các lần chạy cho cùng "
        "câu hỏi — xem `run_route_eval.py`."
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    report_text = build_report()
    out_path = _RESULTS_DIR / "summary.md"
    out_path.write_text(report_text)
    print(report_text)
    print(f"\nĐã lưu: {out_path}")


if __name__ == "__main__":
    main()
