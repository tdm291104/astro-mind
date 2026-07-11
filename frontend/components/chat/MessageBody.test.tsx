import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  extractImages,
  AssistantAvatar,
  ImageStrip,
  MessagePills,
  ActionsSection,
} from "@/components/chat/MessageBody";
import type { Citation, ArxivPaper, WebSource } from "@/lib/api";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockCitation: Citation = {
  citation_id: 1,
  doc_id: "doc-1",
  doc_name: "Hubble Deep Field",
  page: 5,
  excerpt: "The universe is approximately 13.8 billion years old.",
  relevance_score: 0.95,
  section: "Introduction",
  doc_type: "pdf",
  source: "chunk",
};

const mockPaper: ArxivPaper = {
  title: "Gravitational Waves from Binary Black Holes",
  authors: "Abbott, B.P., et al.",
  summary: "We report the observation of gravitational waves from a binary black hole merger.",
  published: "2016-02-11",
  link: "https://arxiv.org/abs/1602.03837",
};

const mockWebSource: WebSource = {
  title: "NASA News: James Webb Space Telescope",
  url: "https://www.nasa.gov/jwst",
  content: "The James Webb Space Telescope launched on December 25, 2021.",
};

// ─── extractImages ────────────────────────────────────────────────────────────

describe("extractImages", () => {
  it("removes markdown image syntax from text", () => {
    const result = extractImages("text ![alt text](http://example.com/img.jpg) more");
    expect(result.text).toBe("text  more");
    expect(result.images).toHaveLength(1);
    expect(result.images[0].alt).toBe("alt text");
    expect(result.images[0].src).toBe("http://example.com/img.jpg");
  });

  it("encodes spaces in URL", () => {
    const result = extractImages("![galaxy](http://images-api.nasa.gov/Some Image Name.jpg)");
    expect(result.images[0].src).toBe("http://images-api.nasa.gov/Some%20Image%20Name.jpg");
  });

  it("returns empty array when no images", () => {
    const result = extractImages("plain text without any images");
    expect(result.text).toBe("plain text without any images");
    expect(result.images).toHaveLength(0);
  });

  it("handles multiple images", () => {
    const content =
      "First ![img1](http://a.com/1.jpg) second ![img2](http://b.com/2.jpg) third ![img3](http://c.com/3.jpg)";
    const result = extractImages(content);
    expect(result.images).toHaveLength(3);
    expect(result.images[0].src).toBe("http://a.com/1.jpg");
    expect(result.images[1].src).toBe("http://b.com/2.jpg");
    expect(result.images[2].src).toBe("http://c.com/3.jpg");
  });
});

// ─── AssistantAvatar ──────────────────────────────────────────────────────────

describe("AssistantAvatar", () => {
  it("renders with gold color star character", () => {
    const { container } = render(<AssistantAvatar />);
    expect(container.textContent).toContain("✦");
  });
});

// ─── ImageStrip ───────────────────────────────────────────────────────────────

describe("ImageStrip", () => {
  it("renders nothing when images array is empty", () => {
    const { container } = render(<ImageStrip images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders img element when images provided", () => {
    render(<ImageStrip images={[{ src: "http://x.jpg", alt: "test image" }]} />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "http://x.jpg");
    expect(img).toHaveAttribute("alt", "test image");
  });

  it("renders at most 6 images even if more provided", () => {
    const images = Array.from({ length: 10 }, (_, i) => ({
      src: `http://img${i}.jpg`,
      alt: `image ${i}`,
    }));
    render(<ImageStrip images={images} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(6);
  });
});

// ─── MessagePills ─────────────────────────────────────────────────────────────

describe("MessagePills", () => {
  it("renders nothing when no citations, papers, or web sources", () => {
    const { container } = render(
      <MessagePills images={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows citation pill when citations exist", () => {
    render(
      <MessagePills citations={[mockCitation]} images={[]} />,
    );
    expect(screen.getByRole("button", { name: /Dẫn chứng \[1\]/ })).toBeInTheDocument();
  });

  it("shows papers pill when arxiv papers exist", () => {
    render(
      <MessagePills arxivPapers={[mockPaper]} images={[]} />,
    );
    expect(screen.getByRole("button", { name: /Papers \[1\]/ })).toBeInTheDocument();
  });

  it("shows web pill when web sources exist", () => {
    render(
      <MessagePills webSources={[mockWebSource]} images={[]} />,
    );
    expect(screen.getByRole("button", { name: /Nguồn web \[1\]/ })).toBeInTheDocument();
  });

  it("expands citations panel on click", async () => {
    const user = userEvent.setup();
    render(
      <MessagePills citations={[mockCitation]} images={[]} />,
    );
    const btn = screen.getByRole("button", { name: /Dẫn chứng/ });
    await user.click(btn);
    // Citations panel shows doc_name and excerpt
    expect(screen.getByText(/Hubble Deep Field/)).toBeInTheDocument();
    expect(screen.getByText(/13.8 billion years old/)).toBeInTheDocument();
  });

  it("expands papers panel on click", async () => {
    const user = userEvent.setup();
    render(
      <MessagePills arxivPapers={[mockPaper]} images={[]} />,
    );
    const btn = screen.getByRole("button", { name: /Papers \[1\]/ });
    await user.click(btn);
    // CitationPanel renders the paper title
    expect(screen.getByText("Gravitational Waves from Binary Black Holes")).toBeInTheDocument();
  });

  it("toggles citations panel closed on second click", async () => {
    const user = userEvent.setup();
    render(
      <MessagePills citations={[mockCitation]} images={[]} />,
    );
    const btn = screen.getByRole("button", { name: /Dẫn chứng/ });
    // Open
    await user.click(btn);
    expect(screen.getByText(/Hubble Deep Field/)).toBeInTheDocument();
    // Close
    await user.click(btn);
    expect(screen.queryByText(/Hubble Deep Field/)).not.toBeInTheDocument();
  });
});

// ─── ActionsSection ───────────────────────────────────────────────────────────

describe("ActionsSection", () => {
  const noop = vi.fn();

  it("renders nothing when no report and no suggestion", () => {
    const { container } = render(
      <ActionsSection
        isLast={true}
        isStreaming={false}
        onDiscoveryReport={noop}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows generating state when generating=true", () => {
    render(
      <ActionsSection
        route="report"
        reportId="r1"
        generating={true}
        isLast={true}
        isStreaming={false}
        onDiscoveryReport={noop}
      />,
    );
    expect(screen.getByText(/Đang tạo/)).toBeInTheDocument();
  });

  it("shows open report button when generating=false", () => {
    render(
      <ActionsSection
        route="report"
        reportId="r1"
        generating={false}
        isLast={true}
        isStreaming={false}
        onOpenViewer={noop}
        onDiscoveryReport={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Mở báo cáo/ })).toBeInTheDocument();
  });

  it("calls onOpenViewer with correct args when 'Mở báo cáo' clicked", async () => {
    const onOpenViewer = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionsSection
        route="report"
        reportId="r1"
        generating={false}
        isLast={true}
        isStreaming={false}
        onOpenViewer={onOpenViewer}
        onDiscoveryReport={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Mở báo cáo/ }));
    expect(onOpenViewer).toHaveBeenCalledOnce();
    expect(onOpenViewer).toHaveBeenCalledWith({ type: "report", id: "r1" });
  });

  it("shows discovery report pill when suggestedAction is discovery_report", () => {
    render(
      <ActionsSection
        isLast={true}
        isStreaming={false}
        suggestedAction={{ type: "discovery_report" }}
        onDiscoveryReport={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Tạo báo cáo/ })).toBeInTheDocument();
  });

  it("does not show discovery pill when isStreaming=true", () => {
    const { container } = render(
      <ActionsSection
        isLast={true}
        isStreaming={true}
        suggestedAction={{ type: "discovery_report" }}
        onDiscoveryReport={noop}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not show discovery pill when isLast=false", () => {
    const { container } = render(
      <ActionsSection
        isLast={false}
        isStreaming={false}
        suggestedAction={{ type: "discovery_report" }}
        onDiscoveryReport={noop}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
