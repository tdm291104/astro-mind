"""Generate tests/fixtures/sample.pdf with known content per page.

Run once from the repo root: `uv run python tests/fixtures/make_sample.py`.
The output is committed to git so tests do not need to regenerate it.
"""
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

HERE = Path(__file__).parent
OUT = HERE / "sample.pdf"

PAGES = [
    {
        "title": "AstroMind Test Fixture",
        "body": [
            "This document is a synthetic fixture used by the AstroMind test",
            "suite. It is not based on any external source. Each page below",
            "asserts a single fact that tests can verify by citation.",
        ],
    },
    {
        "title": "The Sun",
        "body": [
            "The Sun is the star at the center of the Solar System.",
            "Its core temperature is approximately 15 million kelvin.",
            "It is classified as a G-type main-sequence star (G2V).",
        ],
    },
    {
        "title": "Jupiter",
        "body": [
            "Jupiter is the largest planet in the Solar System.",
            "Its mass is approximately 318 Earth masses.",
            "Jupiter has at least 95 known moons, the four largest being",
            "Io, Europa, Ganymede, and Callisto.",
        ],
    },
    {
        "title": "Saturn",
        "body": [
            "Saturn is the second-largest planet in the Solar System.",
            "It is best known for its prominent ring system, made mostly",
            "of water ice with traces of rocky material.",
        ],
    },
    {
        "title": "Exoplanets",
        "body": [
            "An exoplanet is a planet outside our Solar System.",
            "TRAPPIST-1e is a confirmed exoplanet in the habitable zone of",
            "TRAPPIST-1, announced in February 2017.",
            "The most productive detection method has been transit photometry.",
        ],
    },
    {
        "title": "References",
        "body": [
            "This is a self-contained fixture. Facts above are drawn from",
            "general astronomy knowledge as of 2024.",
        ],
    },
]


def main() -> None:
    c = canvas.Canvas(str(OUT), pagesize=LETTER)
    width, height = LETTER
    for page in PAGES:
        c.setFont("Helvetica-Bold", 18)
        c.drawString(72, height - 90, page["title"])
        c.setFont("Helvetica", 12)
        y = height - 130
        for line in page["body"]:
            c.drawString(72, y, line)
            y -= 18
        c.showPage()
    c.save()
    print(f"Wrote {OUT} ({len(PAGES)} pages)")


if __name__ == "__main__":
    main()
