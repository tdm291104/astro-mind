"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { InterestLines, TimelineArea, TopicsBubble } from "@/components/trends/charts";
import { getReport, type DiscoveryImage, type ReportDetail } from "@/lib/api";

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

function DiscoveryImagesCard({ images }: { images: DiscoveryImage[] }) {
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
          fontSize: 10,
          color: "#c9a55c",
          opacity: 0.75,
          letterSpacing: "0.15em",
          marginBottom: 8,
        }}
      >
        ◈ PHÂN TÍCH CHI TIẾT
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
        Phân tích Chi tiết Thiên thể
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {images.map((img, i) => (
          <div key={i} style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {img.image_url && (
              <img
                src={`/api${img.image_url}`}
                alt=""
                style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
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
                  ✓ Đã phân tích hình thái chi tiết bằng mô hình CNN (Galaxy Zoo) để xác định cấu trúc thiên hà.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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

export default function ReportViewer({ id }: { id: string }) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getReport(id)
      .then(setReport)
      .catch(() => setError("Không thể tải báo cáo"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-12 text-ink-muted">Đang tải…</div>
    );
  if (error || !report)
    return <p className="text-center text-ink-muted">{error ?? "Không thể tải báo cáo"}</p>;

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

  const formattedDate = new Date(report.created_at).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const reportTypeLabel =
    payload.report_type === "discovery"
      ? "Báo cáo khám phá"
      : payload.report_type === "trending"
        ? "Báo cáo xu hướng"
        : payload.report_type === "research"
          ? "Nghiên cứu chuyên sâu"
          : hasQuantData
            ? "Báo cáo xu hướng"
            : "Nghiên cứu chuyên sâu";

  const sections =
    payload.research_text
      ? (() => {
          const parsed = parseSections(payload.research_text);
          return parsed.length > 0
            ? parsed
            : [{ title: "Nội dung", body: payload.research_text }];
        })()
      : [];

  const isDiscovery = payload.report_type === "discovery";
  const firstSection = isDiscovery ? sections[0] : undefined;
  const restSections = isDiscovery ? sections.slice(1) : sections;
  const discoveryImages = payload.discovery?.images ?? [];

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
            ◈ ASTRO MIND · BÁO CÁO NGHIÊN CỨU
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
            Xuất PDF
          </button>
        </div>

        {/* ── Section cards ─────────────────────────────────────────── */}
        {firstSection && <SectionCard key="sec-0" title={firstSection.title} body={firstSection.body} index={0} />}

        {/* ── Discovery image analysis ────────────────────────────────── */}
        {isDiscovery && discoveryImages.length > 0 && <DiscoveryImagesCard images={discoveryImages} />}

        {restSections.map((sec, i) => (
          <SectionCard
            key={`sec-${isDiscovery ? i + 1 : i}`}
            title={sec.title}
            body={sec.body}
            index={isDiscovery ? i + 1 : i}
          />
        ))}

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
              ◈ DỮ LIỆU ĐỊNH LƯỢNG
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
                    Chủ đề nghiên cứu (arXiv)
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
                    Dòng thời gian phát hiện
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
                    Mức độ quan tâm công chúng
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
                    Tác giả xuất hiện nhiều
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
              ◈ TÀI LIỆU THAM KHẢO
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
              Tài liệu tham khảo
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
            Generated by AstroMind AI — Dữ liệu cập nhật đến{" "}
            {new Date(payload.generated_at).toLocaleString("vi-VN")}
            {dataSources.length > 0 && <> · Nguồn dữ liệu: {dataSources.join(", ")}</>}
          </p>
        )}
      </div>
    </div>
  );
}
