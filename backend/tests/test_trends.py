"""Kiểm thử trends/report.py — phân tích xu hướng arXiv."""
import pytest

from trends.report import (
    format_topics,
    get_trends,
    topic_row,
    two_full_years,
)


# ── two_full_years ─────────────────────────────────────────────────────────────

def test_two_full_years():
    prev, recent = two_full_years(2026)
    assert prev == 2024
    assert recent == 2025


def test_two_full_years_2025():
    prev, recent = two_full_years(2025)
    assert prev == 2023
    assert recent == 2024


# ── topic_row ──────────────────────────────────────────────────────────────────

def test_topic_row_growth():
    row = topic_row("black holes", prev=100, recent=150)
    assert row["keyword"] == "black holes"
    assert row["prev"] == 100
    assert row["recent"] == 150
    assert row["growth"] == 50.0


def test_topic_row_negative_growth():
    row = topic_row("exoplanets", prev=200, recent=100)
    assert row["growth"] == -50.0


def test_topic_row_zero_prev():
    row = topic_row("fast radio bursts", prev=0, recent=50)
    assert row["growth"] is None


def test_topic_row_zero_both():
    row = topic_row("test", prev=0, recent=0)
    assert row["growth"] is None


# ── format_topics ──────────────────────────────────────────────────────────────

def test_format_topics_sorted():
    rows = [
        topic_row("A", 100, 50),
        topic_row("B", 100, 200),
        topic_row("C", 100, 150),
    ]
    output = format_topics(rows, prev_year=2024, recent_year=2025)
    lines = output.strip().splitlines()
    # First item (after header) should be B (highest recent=200)
    assert "B" in lines[1]
    assert "C" in lines[2]
    assert "A" in lines[3]


def test_format_topics_contains_years():
    rows = [topic_row("exoplanets", 100, 120)]
    output = format_topics(rows, prev_year=2023, recent_year=2024)
    assert "2023" in output
    assert "2024" in output


# ── get_trends ─────────────────────────────────────────────────────────────────

def test_get_trends_dry_run():
    result = get_trends(api_key=None, model="any", prev_year=2024, recent_year=2025, dry_run=True)
    assert "[dry-run trends]" in result
