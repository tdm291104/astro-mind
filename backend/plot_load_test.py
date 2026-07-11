"""Plot load_test_results.json into charts for the report. Run: uv run python plot_load_test.py"""
import json

import matplotlib.pyplot as plt

with open("load_test_results.json") as f:
    data = json.load(f)

results = data["results"]
concurrency = [r["concurrency"] for r in results]
median = [r["latency_median_s"] * 1000 for r in results]
p95 = [r["latency_p95_s"] * 1000 for r in results]
rps = [r["rps"] for r in results]

fig, axes = plt.subplots(1, 2, figsize=(11, 4.2))

ax = axes[0]
ax.plot(concurrency, median, marker="o", label="Trung vị (p50)")
ax.plot(concurrency, p95, marker="s", label="P95")
ax.set_xscale("log")
ax.set_xticks(concurrency)
ax.set_xticklabels(concurrency)
ax.set_xlabel("Số kết nối đồng thời")
ax.set_ylabel("Độ trễ (ms)")
ax.set_title("Độ trễ theo số kết nối đồng thời")
ax.legend()
ax.grid(True, alpha=0.3)

ax = axes[1]
ax.plot(concurrency, rps, marker="o", color="tab:green")
ax.set_xscale("log")
ax.set_xticks(concurrency)
ax.set_xticklabels(concurrency)
ax.set_xlabel("Số kết nối đồng thời")
ax.set_ylabel("Thông lượng (request/giây)")
ax.set_title("Thông lượng theo số kết nối đồng thời")
ax.grid(True, alpha=0.3)

fig.suptitle("Hiệu năng endpoint /converse ở chế độ dry_run, 30 request mỗi mức")
fig.tight_layout()
fig.savefig("../docs/images/hinh-4-2-load-test.png", dpi=150)
print("saved ../docs/images/hinh-4-2-load-test.png")
