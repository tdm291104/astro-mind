from __future__ import annotations

from collections import Counter


def modal_agreement_rate(results: list) -> float:
    """Tỷ lệ kết quả trong list trùng với giá trị xuất hiện nhiều nhất (mode).
    results: list giá trị categorical hashable (str, bool, tuple...) từ N lần
    lặp lại cùng 1 item. Trả 0.0 nếu list rỗng."""
    if not results:
        return 0.0
    _, count = Counter(results).most_common(1)[0]
    return count / len(results)


def score_stddev(scores: list[float]) -> float:
    """Độ lệch chuẩn (population, chia N không phải N-1) của list điểm số từ
    N lần lặp lại. Trả 0.0 nếu rỗng hoặc chỉ có 1 giá trị."""
    if len(scores) < 2:
        return 0.0
    mean = sum(scores) / len(scores)
    variance = sum((s - mean) ** 2 for s in scores) / len(scores)
    return variance ** 0.5
