"use client";

import { useState } from "react";

import type { ArxivPaper } from "@/lib/api";

type Format = "apa" | "ieee" | "bibtex";

function getArxivId(link: string): string {
  const m = link.match(/arxiv\.org\/abs\/(.+)/);
  return m ? m[1].trim() : link;
}

function getYear(published: string): string {
  return published.slice(0, 4);
}

function formatAPA(p: ArxivPaper): string {
  const year = getYear(p.published);
  const id = getArxivId(p.link);
  return `${p.authors} (${year}). ${p.title}. *arXiv preprint* arXiv:${id}. ${p.link}`;
}

function formatIEEE(p: ArxivPaper, idx: number): string {
  const year = getYear(p.published);
  const id = getArxivId(p.link);
  return `[${idx}] ${p.authors}, "${p.title}," arXiv:${id}, ${year}.`;
}

function formatBibTeX(p: ArxivPaper): string {
  const id = getArxivId(p.link);
  const key = id.replace(".", "");
  const year = getYear(p.published);
  return (
    `@misc{${key},\n` +
    `  title={${p.title}},\n` +
    `  author={${p.authors}},\n` +
    `  year={${year}},\n` +
    `  eprint={${id}},\n` +
    `  archivePrefix={arXiv},\n` +
    `  url={${p.link}}\n` +
    `}`
  );
}

function renderFormatted(paper: ArxivPaper, fmt: Format, idx: number): string {
  if (fmt === "apa") return formatAPA(paper);
  if (fmt === "ieee") return formatIEEE(paper, idx);
  return formatBibTeX(paper);
}

function allFormatted(papers: ArxivPaper[], fmt: Format): string {
  return papers.map((p, i) => renderFormatted(p, fmt, i + 1)).join("\n\n");
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const FMT_LABELS: { key: Format; label: string }[] = [
  { key: "apa",    label: "APA" },
  { key: "ieee",   label: "IEEE" },
  { key: "bibtex", label: "BibTeX" },
];

const BTN: React.CSSProperties = {
  padding: "2px 7px", borderRadius: 5,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "none", cursor: "pointer",
  fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
  color: "#6b7a99", lineHeight: 1,
};

export default function CitationPanel({ papers, numberOffset = 0 }: { papers: ArxivPaper[]; numberOffset?: number }) {
  const [fmt, setFmt] = useState<Format>("apa");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  function copyAll() {
    void navigator.clipboard.writeText(allFormatted(papers, fmt)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div style={{
      marginTop: 8,
      border: "1px solid rgba(91,141,239,0.18)",
      borderRadius: 8,
      background: "rgba(91,141,239,0.03)",
      overflow: "hidden",
    }}>
      {/* Header — always visible */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 10px",
        borderBottom: collapsed ? "none" : "1px solid rgba(91,141,239,0.1)",
      }}>
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#4a5568", fontSize: 9, padding: "0 2px", lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#5b8def"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; }}
        >
          {collapsed ? "▶" : "▼"}
        </button>

        <span style={{
          fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
          color: "#5b8def", letterSpacing: "0.05em",
        }}>
          {papers.length} PAPER{papers.length > 1 ? "S" : ""} · CITATIONS
        </span>

        {/* Format tabs — hide when collapsed */}
        {!collapsed && (
          <div style={{ display: "flex", gap: 1, marginLeft: 2 }}>
            {FMT_LABELS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFmt(key)}
                style={{
                  padding: "1px 6px", borderRadius: 4, border: "none",
                  fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                  cursor: "pointer", transition: "all 0.15s",
                  background: fmt === key ? "rgba(91,141,239,0.18)" : "transparent",
                  color: fmt === key ? "#5b8def" : "#4a5568",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Action buttons — hide when collapsed */}
        {!collapsed && (
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={copyAll} style={{ ...BTN, color: copied ? "#22c55e" : "#6b7a99" }}>
              {copied ? "✓" : "copy"}
            </button>
            <button
              type="button"
              onClick={() => downloadText(allFormatted(papers, fmt), `citations-${fmt}.txt`)}
              title={`Export ${fmt.toUpperCase()} .txt`}
              style={BTN}
            >
              .txt
            </button>
            <button
              type="button"
              onClick={() => downloadText(allFormatted(papers, "bibtex"), "citations.bib")}
              title="Export .bib"
              style={BTN}
            >
              .bib
            </button>
          </div>
        )}
      </div>

      {/* Paper list — collapsible */}
      {!collapsed && (
        <div>
          {papers.map((p, i) => {
            const isOpen = expanded === i;
            const formatted = renderFormatted(p, fmt, numberOffset + i + 1);
            return (
              <div
                key={p.link}
                style={{
                  borderBottom: i < papers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    padding: "7px 10px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  <span style={{
                    fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                    color: "#5b8def", flexShrink: 0,
                  }}>
                    [{numberOffset + i + 1}]
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-space-grotesk)", fontSize: 12, fontWeight: 500,
                      color: "#ede8df", lineHeight: 1.35,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {p.title}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                      color: "#6b7a99", marginTop: 2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {p.authors.split(",")[0]}{p.authors.includes(",") ? " et al." : ""} · {getYear(p.published)}
                    </div>
                  </div>
                  <span style={{ color: "#4a5568", fontSize: 9, flexShrink: 0 }}>
                    {isOpen ? "▴" : "▾"}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 10px 10px 28px" }}>
                    <p style={{
                      fontFamily: "var(--font-space-grotesk)", fontSize: 11,
                      color: "#6b7a99", lineHeight: 1.55, marginBottom: 8,
                    }}>
                      {p.summary.slice(0, 240)}{p.summary.length > 240 ? "…" : ""}
                    </p>

                    <div style={{
                      background: "rgba(0,0,0,0.2)", borderRadius: 6,
                      padding: "7px 9px",
                      fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                      color: "#c9a55c", lineHeight: 1.65,
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      marginBottom: 7,
                    }}>
                      {formatted}
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <a href={p.link} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#5b8def", textDecoration: "none" }}>
                        arXiv →
                      </a>
                      <a href={p.link.replace("abs", "pdf")} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#5b8def", textDecoration: "none" }}>
                        PDF →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
