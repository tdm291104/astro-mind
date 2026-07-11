from __future__ import annotations

import argparse
import json
from pathlib import Path

from agent_eval.error_analysis import (
    categorize_guard, categorize_image, categorize_notebook,
    categorize_report, categorize_route, categorize_search,
)

_RESULTS_DIR = Path(__file__).parent / "results"
_SCRIPTS = ["guard", "image", "notebook", "report", "search", "route"]

_CATEGORIZERS = {
    "guard": categorize_guard, "image": categorize_image, "notebook": categorize_notebook,
    "report": categorize_report, "search": categorize_search,
}


def _analyze_one(script: str) -> dict | None:
    path = _RESULTS_DIR / f"run_{script}_eval.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    if script == "route":
        return categorize_route(data["single_rows"], data["compound_rows"])
    return _CATEGORIZERS[script](data["rows"])


def _run(script: str) -> None:
    targets = _SCRIPTS if script == "all" else [script]
    for name in targets:
        breakdown = _analyze_one(name)
        if breakdown is None:
            print(f"{name}: chưa có results/run_{name}_eval.json — chạy `python -m agent_eval.run_{name}_eval` trước.")
            continue
        out_path = _RESULTS_DIR / f"error_analysis_{name}.json"
        out_path.write_text(json.dumps(breakdown, ensure_ascii=False, indent=2))
        print(f"\n=== {name} ===")
        for category, items in breakdown.items():
            print(f"  {category}: {len(items)}")
        print(f"  -> {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", choices=[*_SCRIPTS, "all"], default="all")
    args = parser.parse_args()
    _run(args.script)


if __name__ == "__main__":
    main()
