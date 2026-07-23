"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { InterestLines, TimelineArea, TopicsBubble } from "@/components/trends/charts";
import { getReport, type DiscoveryImage, type ReportDetail, type SearchImage } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

function parseSections(md: string): { title: string; body: string }[] {
  const result: { title: string; body: string }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) {
      if (current) result.push({ title: current.title, body: current.lines.join("\n").trim() });
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) result.push({ title: current.title, body: current.lines.join("\n").trim() });
  return result;
}

function SectionCard({ title, body, index }: { title: string; body: string; index: number }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: "3px solid rgba(201,165,92,0.3)",
        borderRadius: 12,
        padding: "28px 32px",
      }}
    >
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: 11,
          color: "#c9a55c",
          marginBottom: 6,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <span
        style={{
          display: "block",
          fontFamily: "var(--font-space-grotesk)",
          fontSize: 12,
          fontWeight: 600,
          color: "#ede8df",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        {title}
      </span>

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, rgba(201,165,92,0.45) 0%, transparent 75%)",
          marginBottom: 18,
        }}
      />

      <div
        className="prose prose-invert prose-sm max-w-none"
        style={{ color: "rgba(237,232,223,0.82)", lineHeight: 1.78, fontSize: 15 }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </div>
  );
}

const _badgeStyle = {
  fontSize: 11,
  color: "#c9a55c",
  border: "1px solid rgba(201,165,92,0.3)",
  borderRadius: 999,
  padding: "2px 10px",
  fontFamily: "var(--font-jetbrains-mono)",
} as const;

function DiscoveryImagesCard({ images, discoveryBadge, discoveryTitle, morphologyNote }: {
  images: DiscoveryImage[];
  discoveryBadge: string;
  discoveryTitle: string;
  morphologyNote: string;
}) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);
  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc, closeLightbox]);

  return (
    <>
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: "3px solid rgba(201,165,92,0.3)",
        borderRadius: 12,
        padding: "28px 32px",
      }}
    >
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: 10,
          color: "#c9a55c",
          opacity: 0.75,
          letterSpacing: "0.15em",
          marginBottom: 8,
        }}
      >
        {discoveryBadge}
      </span>

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, rgba(201,165,92,0.45) 0%, transparent 75%)",
          marginBottom: 18,
        }}
      />

      <span
        style={{
          display: "block",
          fontFamily: "var(--font-space-grotesk)",
          fontSize: 12,
          fontWeight: 600,
          color: "#ede8df",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        {discoveryTitle}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {images.map((img, i) => (
          <div key={i} style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {img.image_url && (
              <img
                src={`/api${img.image_url}`}
                alt=""
                onClick={() => setLightboxSrc(`/api${img.image_url}`)}
                style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 8, flexShrink: 0, cursor: "zoom-in" }}
              />
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              {img.detected_objects.map((obj, j) => (
                <div key={j} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                    <span style={_badgeStyle}>{obj.class_name}</span>
                    <span style={_badgeStyle}>{obj.sub_type}</span>
                    <span style={_badgeStyle}>{obj.confidence}</span>
                  </div>
                  <p style={{ color: "rgba(237,232,223,0.82)", fontSize: 13, lineHeight: 1.6 }}>
                    {obj.description}
                  </p>
                </div>
              ))}
              {img.morphology_context && (
                <p style={{ color: "rgba(237,232,223,0.6)", fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
                  {morphologyNote}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    {lightboxSrc && (
      <div
        onClick={closeLightbox}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.88)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "zoom-out",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightboxSrc}
          alt=""
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "90vw", maxHeight: "88vh", borderRadius: 10, objectFit: "contain", cursor: "default" }}
        />
        <button
          onClick={closeLightbox}
          style={{
            position: "fixed", top: 20, right: 24,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, color: "#fff", fontSize: 18, width: 36, height: 36,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>
    )}
    </>
  );
}

async function downloadReportPdf(id: string, title: string) {
  const res = await fetch(`/api/reports/${id}/pdf`, { credentials: "include" });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SearchImagesCard({ images }: { images: SearchImage[] }) {
  const [lightbox, setLightbox] = useState<SearchImage | null>(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox]);

  if (!images.length) return null;
  return (
    <>
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "24px 28px",
      }}>
        <span style={{
          display: "block",
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: 10,
          color: "#c9a55c",
          opacity: 0.75,
          letterSpacing: "0.15em",
          marginBottom: 14,
        }}>
          NASA IMAGES
        </span>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
          {images.map((img, i) => (
            <div key={i} style={{ flexShrink: 0, width: 200 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.title}
                onClick={() => setLightbox(img)}
                style={{
                  width: 200, height: 130,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "block",
                  cursor: "zoom-in",
                }}
              />
              <div style={{
                marginTop: 6,
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 10,
                color: "#6b7a99",
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {img.title}
              </div>
            </div>
          ))}
        </div>
      </div>
      {lightbox && (
        <div
          onClick={closeLightbox}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.title}
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
            onClick={closeLightbox}
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
            {lightbox.title}
          </div>
        </div>
      )}
    </>
  );
}

export default function ReportViewer({ id }: { id: string }) {
  const { t } = useTranslation();
  const rv = t("reportViewer");

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getReport(id)
      .then(setReport)
      .catch(() => setError(rv.error))
      .finally(() => setLoading(false));
  }, [id, rv.error]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-12 text-ink-muted">{rv.loading}</div>
    );
  if (error || !report)
    return <p className="text-center text-ink-muted">{error ?? rv.error}</p>;

  const { payload } = report;
  const hasTopicRows = payload.topics.rows.length > 0;
  const hasTimelineData = payload.timeline.rows.length > 0;
  const hasInterestData = Object.keys(payload.interest.series).length > 0;
  const hasTopAuthors = (payload.top_authors?.length ?? 0) > 0;
  const hasQuantData = hasTopicRows || hasTimelineData || hasInterestData || hasTopAuthors;

  const dataSources: string[] = [];
  if (payload.references?.some((r) => r.source === "arxiv")) dataSources.push("arXiv");
  if (Object.keys(payload.interest.series).length > 0 || payload.interest.text) dataSources.push("Google Trends");
  if (payload.references?.some((r) => r.source === "web")) dataSources.push("Web");

  const formattedDate = new Date(report.created_at).toLocaleDateString(rv.dateLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const reportTypeLabel =
    payload.report_type === "discovery"
      ? rv.typeDiscovery
      : payload.report_type === "trending"
        ? rv.typeTrending
        : payload.report_type === "research"
          ? rv.typeResearch
          : hasQuantData
            ? rv.typeTrending
            : rv.typeResearch;

  const sections =
    payload.research_text
      ? (() => {
          const parsed = parseSections(payload.research_text);
          return parsed.length > 0
            ? parsed
            : [{ title: rv.sectionContent, body: payload.research_text }];
        })()
      : [];

  const isDiscovery = payload.report_type === "discovery";
  const firstSection = isDiscovery ? sections[0] : undefined;
  const restSections = isDiscovery ? sections.slice(1) : sections;
  const discoveryImages = payload.discovery?.images ?? [];
  const searchImages = (!isDiscovery && payload.search_images?.length) ? payload.search_images : [];

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 4px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Cover header ─────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(160deg, #0c1628 0%, #060a14 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            padding: "40px 40px 36px",
            overflow: "hidden",
          }}
        >
          {/* Dot pattern overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(237,232,223,0.06) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              pointerEvents: "none",
            }}
          />

          {/* Badge */}
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 10,
              color: "#c9a55c",
              opacity: 0.75,
              letterSpacing: "0.15em",
              marginBottom: 20,
              position: "relative",
            }}
          >
            {rv.headerBadge}
          </span>

          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: 28,
              fontWeight: 400,
              color: "#ede8df",
              lineHeight: 1.35,
              marginBottom: 20,
              position: "relative",
            }}
          >
            {report.title}
          </h1>

          {/* Metadata */}
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 11,
              color: "#8892a8",
              position: "relative",
            }}
          >
            {formattedDate} · {reportTypeLabel}
          </span>

          {/* Keyword tag pills */}
          {payload.keywords && payload.keywords.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, position: "relative" }}>
              {payload.keywords.map((kw) => (
                <span
                  key={kw}
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 10,
                    color: "#c9a55c",
                    background: "rgba(201,165,92,0.08)",
                    border: "1px solid rgba(201,165,92,0.25)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Export PDF */}
          <button
            type="button"
            onClick={() => void downloadReportPdf(report.id, report.title)}
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#c9a55c",
              background: "rgba(201,165,92,0.08)",
              border: "1px solid rgba(201,165,92,0.25)",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              zIndex: 1,
            }}
          >
            {rv.exportPdf}
          </button>
        </div>

        {/* ── Section cards ─────────────────────────────────────────── */}
        {firstSection && <SectionCard key="sec-0" title={firstSection.title} body={firstSection.body} index={0} />}

        {/* ── Discovery image analysis ────────────────────────────────── */}
        {isDiscovery && discoveryImages.length > 0 && (
          <DiscoveryImagesCard
            images={discoveryImages}
            discoveryBadge={rv.discoveryBadge}
            discoveryTitle={rv.discoveryTitle}
            morphologyNote={rv.morphologyNote}
          />
        )}

        {restSections.map((sec, i) => (
          <SectionCard
            key={`sec-${isDiscovery ? i + 1 : i}`}
            title={sec.title}
            body={sec.body}
            index={isDiscovery ? i + 1 : i}
          />
        ))}

        {/* ── NASA Images (research/trending) ───────────────────────── */}
        <SearchImagesCard images={searchImages} />

        {/* ── Quantitative data section ─────────────────────────────── */}
        {hasQuantData && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: "3px solid rgba(201,165,92,0.3)",
              borderRadius: 12,
              padding: "28px 32px",
            }}
          >
            {/* Section badge */}
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 10,
                color: "#c9a55c",
                opacity: 0.75,
                letterSpacing: "0.15em",
                marginBottom: 8,
              }}
            >
              {rv.quantBadge}
            </span>

            {/* Gold divider */}
            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(201,165,92,0.45) 0%, transparent 75%)",
                marginBottom: 24,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {hasTopicRows && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    borderRadius: 10,
                    padding: "20px 24px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-jetbrains-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#8892a8",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    {rv.topicsLabel}
                  </span>
                  <TopicsBubble rows={payload.topics.rows} />
                  {payload.topics.analysis && (
                    <div className="prose prose-invert prose-sm max-w-none text-ivory/70" style={{ marginTop: 12 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{payload.topics.analysis}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {hasTimelineData && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    borderRadius: 10,
                    padding: "20px 24px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-jetbrains-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#8892a8",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    {rv.timelineLabel}
                  </span>
                  <TimelineArea byMethod={payload.timeline.by_method} />
                  {payload.timeline.analysis && (
                    <div className="prose prose-invert prose-sm max-w-none text-ivory/70" style={{ marginTop: 12 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{payload.timeline.analysis}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {(hasInterestData || payload.interest.text) && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    borderRadius: 10,
                    padding: "20px 24px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-jetbrains-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#8892a8",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    {rv.interestLabel}
                  </span>
                  {hasInterestData ? (
                    <>
                      <InterestLines series={payload.interest.series} />
                      {payload.interest.text && (
                        <div className="prose prose-invert prose-sm max-w-none text-ivory/70" style={{ marginTop: 12 }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{payload.interest.text}</ReactMarkdown>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-ivory/40">{payload.interest.text}</p>
                  )}
                </div>
              )}

              {hasTopAuthors && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    borderRadius: 10,
                    padding: "20px 24px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-jetbrains-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#8892a8",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    {rv.authorsLabel}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {payload.top_authors!.map((author) => (
                      <div
                        key={author.name}
                        style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                      >
                        <span style={{ color: "rgba(237,232,223,0.82)" }}>{author.name}</span>
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains-mono)",
                            fontSize: 11,
                            color: "#c9a55c",
                          }}
                        >
                          {author.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── References ──────────────────────────────────────────── */}
        {payload.references && payload.references.length > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: "3px solid rgba(201,165,92,0.3)",
              borderRadius: 12,
              padding: "28px 32px",
            }}
          >
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 10,
                color: "#c9a55c",
                opacity: 0.75,
                letterSpacing: "0.15em",
                marginBottom: 8,
              }}
            >
              {rv.refBadge}
            </span>

            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(201,165,92,0.45) 0%, transparent 75%)",
                marginBottom: 18,
              }}
            />

            <span
              style={{
                display: "block",
                fontFamily: "var(--font-space-grotesk)",
                fontSize: 12,
                fontWeight: 600,
                color: "#ede8df",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              {rv.refTitle}
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {payload.references.map((ref, i) => (
                <div key={i} style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#c9a55c", textDecoration: "none" }}
                  >
                    {ref.title}
                  </a>
                  <span
                    style={{
                      marginLeft: 8,
                      fontFamily: "var(--font-jetbrains-mono)",
                      fontSize: 10,
                      color: "#8892a8",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {ref.source}
                  </span>
                  {ref.excerpt && (
                    <p style={{ color: "rgba(237,232,223,0.6)", marginTop: 4 }}>{ref.excerpt}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        {payload.generated_at && (
          <p
            style={{
              textAlign: "center",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 10,
              color: "#8892a8",
              letterSpacing: "0.08em",
              opacity: 0.6,
            }}
          >
            {rv.footerPrefix} — {rv.footerUpdated}{" "}
            {new Date(payload.generated_at).toLocaleString(rv.dateLocale)}
            {dataSources.length > 0 && <> · {rv.footerSources}: {dataSources.join(", ")}</>}
          </p>
        )}
      </div>
    </div>
  );
}
