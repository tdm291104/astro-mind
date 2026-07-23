"use client";

import { useState, useEffect } from "react";
import CitationPanel from "@/components/chat/CitationPanel";
import type { ArxivPaper, Citation, WebSource } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export interface ExtractedImage {
  src: string;
  alt: string;
}

export function extractImages(content: string): { text: string; images: ExtractedImage[] } {
  const images: ExtractedImage[] = [];
  const text = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, src: string) => {
    images.push({ alt, src: src.replace(/ /g, "%20") });
    return "";
  });
  return { text, images };
}

export function AssistantAvatar() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
      background: "rgba(201,165,92,0.1)",
      border: "1px solid rgba(201,165,92,0.22)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-instrument-serif)", fontSize: 14, color: "#c9a55c",
    }}>
      ✦
    </div>
  );
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw", maxHeight: "88vh",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          objectFit: "contain",
          cursor: "default",
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: "fixed", top: 20, right: 24,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8, color: "#fff",
          fontSize: 18, width: 36, height: 36,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ✕
      </button>
      <div style={{
        position: "fixed", bottom: 20,
        fontFamily: "var(--font-jetbrains-mono)", fontSize: 11,
        color: "rgba(255,255,255,0.5)",
        maxWidth: "80vw", textAlign: "center",
      }}>
        {alt}
      </div>
    </div>
  );
}

export function ImageStrip({ images }: { images: ExtractedImage[] }) {
  const { t } = useTranslation();
  const mb = t("messageBody");
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  if (images.length === 0) return null;
  return (
    <>
      <div style={{ marginTop: 4 }}>
        <div style={{
          fontFamily: "var(--font-jetbrains-mono)", fontSize: 10,
          color: "#6b7a99", marginBottom: 8, letterSpacing: "0.06em",
        }}>
          {mb.images}
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {images.slice(0, 6).map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img.src}
              alt={img.alt}
              onClick={() => setLightbox({ src: img.src, alt: img.alt })}
              style={{
                height: 110, width: "auto", maxWidth: 180,
                borderRadius: 8, objectFit: "cover",
                flexShrink: 0, border: "1px solid rgba(255,255,255,0.07)",
                cursor: "zoom-in",
              }}
            />
          ))}
        </div>
      </div>
      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

type PanelType = "citations" | "papers" | "web";

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 12px", borderRadius: 999,
    fontFamily: "var(--font-jetbrains-mono)", fontSize: 11,
    cursor: "pointer", border: "1px solid",
    transition: "all 0.15s", background: "none",
    borderColor: active ? "rgba(201,165,92,0.5)" : "rgba(255,255,255,0.12)",
    color: active ? "#c9a55c" : "#6b7a99",
    ...(active ? { background: "rgba(201,165,92,0.08)" } : {}),
  };
}

export function MessagePills({ citations, arxivPapers, webSources }: {
  citations?: Citation[];
  arxivPapers?: ArxivPaper[];
  webSources?: WebSource[];
}) {
  const { t } = useTranslation();
  const mb = t("messageBody");
  const [open, setOpen] = useState<PanelType | null>(null);

  const toggle = (panel: PanelType) =>
    setOpen((prev) => (prev === panel ? null : panel));

  const hasCitations = !!citations?.length;
  const hasPapers = !!arxivPapers?.length;
  const hasWeb = !!webSources?.length;

  if (!hasCitations && !hasPapers && !hasWeb) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
      {/* Pill row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {hasCitations && (
          <button type="button" onClick={() => toggle("citations")} style={pillStyle(open === "citations")}>
            {mb.citations} [{citations!.length}]
          </button>
        )}
        {hasPapers && (
          <button type="button" onClick={() => toggle("papers")} style={pillStyle(open === "papers")}>
            {mb.papers} [{arxivPapers!.length}]
          </button>
        )}
        {hasWeb && (
          <button type="button" onClick={() => toggle("web")} style={pillStyle(open === "web")}>
            {mb.webSources} [{webSources!.length}]
          </button>
        )}
      </div>

      {/* Citations panel */}
      {open === "citations" && hasCitations && (
        <div style={{
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8, overflow: "hidden",
        }}>
          {citations!.map((c) => (
            <div
              key={c.citation_id}
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div style={{
                fontFamily: "var(--font-jetbrains-mono)", fontSize: 11,
                color: "#c9a55c", marginBottom: 3,
              }}>
                [{c.citation_id}] {c.doc_name}
                {c.page != null ? ` — ${mb.page} ${c.page}` : ""}
                {c.source === "analysis" && (
                  <span style={{ marginLeft: 6, color: "#a78bfa" }}>· {mb.fromAnalysis}</span>
                )}
              </div>
              {c.excerpt && (
                <div style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: 12,
                  color: "#6b7a99", lineHeight: 1.55, fontStyle: "italic",
                }}>
                  &ldquo;{c.excerpt}&rdquo;
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Papers panel */}
      {open === "papers" && hasPapers && (
        <CitationPanel papers={arxivPapers!} />
      )}

      {/* Web sources panel */}
      {open === "web" && hasWeb && (
        <div style={{
          border: "1px solid rgba(91,141,239,0.18)",
          borderRadius: 8, overflow: "hidden",
          background: "rgba(91,141,239,0.03)",
        }}>
          {webSources!.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                borderBottom: i < webSources!.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 500,
                  color: "#5b8def", textDecoration: "none", display: "block", marginBottom: 3,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
              >
                [{i + 1}] {s.title || s.url}
              </a>
              <div style={{
                fontFamily: "var(--font-jetbrains-mono)", fontSize: 10,
                color: "#4a5568", marginBottom: s.content ? 5 : 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {s.url}
              </div>
              {s.content && (
                <div style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: 12,
                  color: "#6b7a99", lineHeight: 1.55,
                }}>
                  {s.content.slice(0, 180)}{s.content.length > 180 ? "…" : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActionsSection({
  route, reportId, generating, suggestedAction, isLast, isStreaming, onOpenViewer, onDiscoveryReport,
}: {
  route?: string;
  reportId?: string;
  generating?: boolean;
  suggestedAction?: { type: string } | null;
  isLast: boolean;
  isStreaming: boolean;
  onOpenViewer?: (v: { type: "report" | "doc"; id: string }) => void;
  onDiscoveryReport: () => void;
}) {
  const { t } = useTranslation();
  const mb = t("messageBody");
  const showReport = route === "report" && !!reportId;
  const showDiscovery = isLast && !isStreaming && suggestedAction?.type === "discovery_report";
  if (!showReport && !showDiscovery) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
      {showReport && (
        generating ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "var(--font-jetbrains-mono)", fontSize: 11,
            color: "rgba(201,165,92,0.6)",
          }}>
            <span style={{
              display: "inline-block", width: 7, height: 7, borderRadius: "50%",
              background: "#c9a55c", animation: "pulse 1.2s infinite",
            }} />
            {mb.generatingReport}
          </div>
        ) : onOpenViewer ? (
          <button
            type="button"
            onClick={() => onOpenViewer({ type: "report", id: reportId! })}
            style={{
              borderRadius: 8, border: "1px solid rgba(201,165,92,0.35)",
              padding: "6px 13px",
              fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "#c9a55c",
              background: "none", cursor: "pointer", transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,165,92,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            {mb.openReport}
          </button>
        ) : null
      )}
      {showDiscovery && (
        <button
          type="button"
          onClick={onDiscoveryReport}
          style={{
            borderRadius: 999, border: "1px solid rgba(201,165,92,0.35)",
            padding: "6px 14px",
            fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "#c9a55c",
            background: "rgba(201,165,92,0.06)", cursor: "pointer", transition: "background 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,165,92,0.14)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(201,165,92,0.06)"; }}
        >
          {mb.createDiscovery}
        </button>
      )}
    </div>
  );
}
