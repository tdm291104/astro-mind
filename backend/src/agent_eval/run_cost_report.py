from __future__ import annotations

import argparse
import json
from pathlib import Path

from agent_eval.pricing import compute_cost

_RESULTS_DIR = Path(__file__).parent / "results"
_SCRIPTS = ["guard", "image", "notebook", "report", "search", "route"]


def _latest_usage_file(script: str) -> Path | None:
    candidates = sorted(_RESULTS_DIR.glob(f"usage_{script}_*.json"))
    return candidates[-1] if candidates else None


def _cost_for_file(path: Path) -> dict:
    data = json.loads(path.read_text())
    total = 0.0
    breakdown = []
    for call in data["calls"]:
        model, is_batch = call["model"], call["is_batch"]
        call_total = 0.0
        for usage in call["usage"].values():
            # "latency_ms" (chỉ có ở usage_route_*.json) không phải field giá —
            # loại khỏi dict trước khi đưa vào compute_cost.
            usage_for_cost = {k: v for k, v in usage.items() if k != "latency_ms"}
            call_total += compute_cost(usage_for_cost, model, is_batch=is_batch)
        breakdown.append({"type": call["type"], "model": model, "is_batch": is_batch, "cost": call_total})
        total += call_total
    return {"total": total, "breakdown": breakdown}


def _run(script: str) -> None:
    targets = _SCRIPTS if script == "all" else [script]
    grand_total = 0.0
    for name in targets:
        path = _latest_usage_file(name)
        if path is None:
            print(f"{name}: chưa có file usage_{name}_*.json — chạy run_{name}_eval.py trước.")
            continue
        result = _cost_for_file(path)
        print(f"\n=== {name} (từ {path.name}) ===")
        for entry in result["breakdown"]:
            print(f"  {entry['type']} ({entry['model']}, batch={entry['is_batch']}): ${entry['cost']:.6f}")
            if entry["type"] == "routing_and_dispatch_live":
                print("    (gồm cả routing + dispatch sub-agent, không tách riêng được)")
        print(f"  TOTAL: ${result['total']:.6f}")
        grand_total += result["total"]
    if script == "all":
        print(f"\n=== TỔNG (tất cả pilot đã chạy) ===\n  ${grand_total:.6f}")
        print(
            "\nLưu ý: đây là chi phí THẬT của các pilot --limit nhỏ đã chạy, không "
            "phải chi phí full run — so sánh tỉ lệ với cost_estimate.md theo số lệnh "
            "gọi thực tế trong mỗi pilot, không so trực tiếp con số tuyệt đối."
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", choices=[*_SCRIPTS, "all"], default="all")
    args = parser.parse_args()
    _run(args.script)


if __name__ == "__main__":
    main()
