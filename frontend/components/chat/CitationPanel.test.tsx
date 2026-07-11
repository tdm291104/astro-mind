import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CitationPanel from "@/components/chat/CitationPanel";
import type { ArxivPaper } from "@/lib/api";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const paper1: ArxivPaper = {
  title: "Detection of Gravitational Waves from Binary Black Hole Mergers",
  authors: "Abbott, B.P., Abernathy, M.R., Acernese, F.",
  summary:
    "We report the first direct observation of gravitational waves and the first direct observation of the merger of two black holes. The signal, GW150914, was observed by both LIGO detectors.",
  published: "2016-02-11",
  link: "https://arxiv.org/abs/1602.03837",
};

const paper2: ArxivPaper = {
  title: "Event Horizon Telescope: First Image of a Black Hole",
  authors: "Event Horizon Telescope Collaboration",
  summary:
    "We present the first image of a black hole, captured at the center of galaxy M87 using the Event Horizon Telescope.",
  published: "2019-04-10",
  link: "https://arxiv.org/abs/1906.11238",
};

// ─── CitationPanel ────────────────────────────────────────────────────────────

describe("CitationPanel", () => {
  it("renders paper title", () => {
    render(<CitationPanel papers={[paper1]} />);
    expect(
      screen.getByText("Detection of Gravitational Waves from Binary Black Hole Mergers"),
    ).toBeInTheDocument();
  });

  it("renders author and year in collapsed row", () => {
    render(<CitationPanel papers={[paper1]} />);
    // Displays first author + "et al." + year
    expect(screen.getByText(/Abbott.*et al.*2016/)).toBeInTheDocument();
  });

  it("renders arxiv link when paper is expanded", async () => {
    const user = userEvent.setup();
    render(<CitationPanel papers={[paper1]} />);
    // Click on the paper row button to expand
    const rowBtn = screen.getByRole("button", { name: /Detection of Gravitational/ });
    await user.click(rowBtn);
    // arXiv link appears
    const links = screen.getAllByRole("link", { name: /arXiv/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", paper1.link);
  });

  it("shows paper count header", () => {
    render(<CitationPanel papers={[paper1, paper2]} />);
    expect(screen.getByText(/2 PAPERS/)).toBeInTheDocument();
  });

  it("shows singular PAPER header for one paper", () => {
    render(<CitationPanel papers={[paper1]} />);
    // Should say "1 PAPER" not "1 PAPERS"
    const header = screen.getByText(/1 PAPER/);
    expect(header.textContent).toMatch(/^1 PAPER\b/);
    expect(header.textContent).not.toMatch(/1 PAPERS/);
  });

  it("numberOffset shifts citation numbering", () => {
    // numberOffset=2 + index 0 + 1 = [3]
    render(<CitationPanel papers={[paper1]} numberOffset={2} />);
    expect(screen.getByText("[3]")).toBeInTheDocument();
  });

  it("default numberOffset=0 shows [1] for first paper", () => {
    render(<CitationPanel papers={[paper1]} />);
    expect(screen.getByText("[1]")).toBeInTheDocument();
  });

  it("renders format tabs: APA, IEEE, BibTeX", () => {
    render(<CitationPanel papers={[paper1]} />);
    expect(screen.getByRole("button", { name: "APA" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "IEEE" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "BibTeX" })).toBeInTheDocument();
  });

  it("collapses and hides format tabs on collapse toggle", async () => {
    const user = userEvent.setup();
    render(<CitationPanel papers={[paper1]} />);
    // Initially expanded — format tabs visible
    expect(screen.getByRole("button", { name: "APA" })).toBeInTheDocument();
    // Click the collapse toggle (▼)
    const collapseBtn = screen.getByTitle("Collapse");
    await user.click(collapseBtn);
    // Format tabs should be hidden
    expect(screen.queryByRole("button", { name: "APA" })).not.toBeInTheDocument();
  });
});
