import matplotlib

matplotlib.use("Agg")  # headless PNG backend; must precede the pyplot import

import matplotlib.pyplot as plt  # noqa: E402


def bubble_chart(topic_rows: list[dict], path) -> None:
    """Bubble chart of arXiv topics: x=prev count, y=recent count, size ~ |growth|."""
    fig, ax = plt.subplots(figsize=(8, 6))
    for r in topic_rows:
        size = abs(r["growth"]) * 5 if r["growth"] is not None else 50
        ax.scatter(r["prev"], r["recent"], s=max(size, 20), alpha=0.6)
        ax.annotate(r["keyword"], (r["prev"], r["recent"]))
    ax.set_xlabel("Paper năm trước")
    ax.set_ylabel("Paper năm gần nhất")
    ax.set_title("Chủ đề nóng arXiv")
    fig.savefig(path)
    plt.close(fig)


def stacked_area_chart(by_method: dict, path) -> None:
    """Stacked area: exoplanet discoveries per year, layered by method."""
    years = by_method["years"]
    series = by_method["series"]
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.stackplot(years, *series.values(), labels=list(series.keys()), alpha=0.7)
    ax.set_xlabel("Năm")
    ax.set_ylabel("Số phát hiện")
    ax.set_title("Phát hiện exoplanet theo phương pháp")
    ax.legend(loc="upper left")
    fig.savefig(path)
    plt.close(fig)


def line_chart(series: dict, path) -> None:
    """Multi-line chart: one line per keyword over the weeks."""
    fig, ax = plt.subplots(figsize=(8, 6))
    for keyword, values in series.items():
        ax.plot(range(len(values)), values, label=keyword)
    ax.set_xlabel("Tuần (12 tháng gần nhất)")
    ax.set_ylabel("Mức quan tâm (0-100)")
    ax.set_title("Mức quan tâm công chúng (Google Trends)")
    ax.legend()
    fig.savefig(path)
    plt.close(fig)
