from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

DATASETS_DIR = Path(__file__).parent / "datasets"


def _load(filename: str) -> list[dict]:
    return json.loads((DATASETS_DIR / filename).read_text())


@dataclass
class ImageEvalItem:
    id: str
    nasa_id: str
    image_url: str
    expected_class_name: str
    expected_sub_type: str
    notes: str = ""


def load_image_eval() -> list[ImageEvalItem]:
    return [ImageEvalItem(**d) for d in _load("image_eval.json")]


@dataclass
class NotebookEvalItem:
    # Ground truth (expected_page / expected_keyword) for every item in
    # datasets/notebook_eval.json was derived empirically: by running
    # ingestion.parser.parse_pdf() against the real source PDFs and
    # grep-matching the exact extracted text, not by guessing from the
    # rendered PDF or reading the paper.
    #
    # Some expected_keyword values are intentionally truncated/partial
    # because PyMuPDF's raw text extraction can split accented characters
    # or wrap words mid-line. Example: nb_gw_04 uses "Poincar" rather than
    # "Poincaré" because the PDF renders the name as "Poincar´e" with the
    # accent as a separate combining-accent glyph after the "r", so a
    # normal "Poincaré" substring never appears in parse_pdf()'s output.
    # Do NOT "fix" a keyword that looks like a typo without first
    # re-running parse_pdf() on the source PDF to confirm what the parser
    # actually extracts at that page.
    id: str
    doc_label: str  # "gravitational_waves" | "galaxy_morphology" | "exoplanet_detection"
    question: str
    expected_page: int
    expected_keyword: str  # a distinctive word/phrase the correct answer must contain


def load_notebook_eval() -> list[NotebookEvalItem]:
    return [NotebookEvalItem(**d) for d in _load("notebook_eval.json")]


@dataclass
class SearchEvalItem:
    id: str
    query: str
    expected_sources: list[str]


def load_search_eval() -> list[SearchEvalItem]:
    return [SearchEvalItem(**d) for d in _load("search_eval.json")]


@dataclass
class ReportEvalItem:
    id: str
    topic: str
    report_type: str  # "research" | "trending"
    required_sections: list[str]


def load_report_eval() -> list[ReportEvalItem]:
    return [ReportEvalItem(**d) for d in _load("report_eval.json")]


@dataclass
class RouteEvalItem:
    id: str
    message: str
    expected_action: str  # "direct_chat" | "image" | "notebook" | "search" | "report"


@dataclass
class CompoundEvalItem:
    id: str
    message: str
    expected_actions: list[str]  # ordered sequence of tool categories


def load_route_eval() -> tuple[list[RouteEvalItem], list[CompoundEvalItem]]:
    raw = _load("route_eval.json")
    singles = [RouteEvalItem(**d) for d in raw["single_intent"]]
    compounds = [CompoundEvalItem(**d) for d in raw["compound"]]
    return singles, compounds


@dataclass
class GuardEvalItem:
    id: str
    text: str
    expected_accept: bool


def load_guard_eval() -> list[GuardEvalItem]:
    return [GuardEvalItem(**d) for d in _load("guard_eval.json")]
