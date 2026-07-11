"use client";

import { useState } from "react";

import { useReveal } from "./useReveal";

interface MockLine {
  type: "query" | "result" | "upload" | "status";
  text: string;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  desc: string;
  icon: React.ReactNode;
  mockLines: MockLine[];
}

const AGENTS: Agent[] = [
  {
    id: "navigator",
    name: "Search Agent",
    role: "Tìm Kiếm & Nghiên Cứu",
    desc: "Tìm kiếm trên các cơ sở dữ liệu thiên văn, bài báo khoa học và danh mục sao để tìm đúng thứ bạn cần — trong vài giây, không phải vài giờ.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ld-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
        <circle cx="11" cy="11" r="3" opacity="0.4" />
      </svg>
    ),
    mockLines: [
      { type: "query", text: 'Tìm kiếm: "Betelgeuse mass loss rate 2024-2026"' },
      { type: "result", text: "→ Tìm thấy 47 bài báo trên arXiv, ADS và NASA ADS" },
      { type: "result", text: "→ Kết quả tốt nhất: Harper et al. (2025) — Ṁ ≈ 1.2×10⁻⁶ M☉/yr" },
      { type: "result", text: "→ Đối chiếu với dữ liệu hình ảnh VLT/SPHERE" },
      { type: "status", text: "✓ Kết quả xếp hạng theo độ liên quan và số trích dẫn" },
    ],
  },
  {
    id: "analyzer",
    name: "Notebook Agent",
    role: "Phân Tích Tài Liệu",
    desc: "Tải lên bài báo nghiên cứu, nhật ký quan sát hoặc metadata FITS. Tự động trích xuất dữ liệu, phân tích và so sánh.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ld-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="7" y1="9" x2="17" y2="9" opacity="0.5" />
        <line x1="7" y1="13" x2="14" y2="13" opacity="0.5" />
        <line x1="7" y1="17" x2="11" y2="17" opacity="0.5" />
        <rect x="14" y="14" width="5" height="5" rx="1" fill="var(--ld-accent)" opacity="0.2" />
      </svg>
    ),
    mockLines: [
      { type: "upload", text: "📄 Đã tải lên: europa_spectroscopy_2025.pdf" },
      { type: "result", text: "→ Trích xuất 14 bảng dữ liệu, 8 biểu đồ phổ" },
      { type: "result", text: "→ Kết quả chính: Xác nhận hấp thụ NaCl tại 2.07μm" },
      { type: "result", text: "→ So sánh với Trumbo et al. (2023) — tín hiệu mạnh hơn 34%" },
      { type: "status", text: "✓ Tóm tắt có cấu trúc sẵn sàng để xuất" },
    ],
  },
  {
    id: "oracle",
    name: "Chat Agent",
    role: "Kiến Thức & Trò Chuyện",
    desc: "Hỏi bất cứ điều gì về thiên văn học. Nhận câu trả lời chuyên sâu kèm trích dẫn, giải thích toán học và ngữ cảnh đầy đủ.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ld-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M21 12a9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 019-9 9 9 0 019 9z" />
        <circle cx="12" cy="12" r="3" fill="var(--ld-accent)" opacity="0.25" />
        <line x1="12" y1="2" x2="12" y2="5" opacity="0.4" />
        <line x1="12" y1="19" x2="12" y2="22" opacity="0.4" />
        <line x1="2" y1="12" x2="5" y2="12" opacity="0.4" />
        <line x1="19" y1="12" x2="22" y2="12" opacity="0.4" />
      </svg>
    ),
    mockLines: [
      { type: "query", text: 'Q: "Tại sao Io có nhiều hoạt động núi lửa hơn Europa?"' },
      { type: "result", text: "→ Nhiệt thủy triều: độ lệch tâm quỹ đạo của Io (e ≈ 0.0041)" },
      { type: "result", text: "→ Io tiêu tán ~10¹⁴ W qua uốn thủy triều — gấp 40× Europa" },
      { type: "result", text: "→ Cộng hưởng Laplace với Europa & Ganymede duy trì độ lệch tâm" },
      { type: "status", text: "✓ 6 trích dẫn đính kèm · Gợi ý câu hỏi tiếp theo" },
    ],
  },
  {
    id: "scribe",
    name: "Report Agent",
    role: "Tạo Báo Cáo",
    desc: "Tự động biên soạn nghiên cứu của bạn thành báo cáo có cấu trúc với định dạng chuẩn, trích dẫn và hình minh họa sẵn sàng xuất bản.",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ld-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V7l-6-4z" />
        <polyline points="14,3 14,7 20,7" opacity="0.5" />
        <line x1="8" y1="12" x2="16" y2="12" opacity="0.4" />
        <line x1="8" y1="16" x2="13" y2="16" opacity="0.4" />
      </svg>
    ),
    mockLines: [
      { type: "status", text: '⏳ Đang tạo báo cáo: "Đánh giá Khả năng Sống được của Europa"' },
      { type: "result", text: "→ §1 Giới thiệu — Đặc điểm đại dương & bối cảnh" },
      { type: "result", text: "→ §2 Mô hình nhiệt thủy triều — Phân tích ngân sách năng lượng" },
      { type: "result", text: "→ §3 Thành phần bề mặt — Bằng chứng quang phổ" },
      { type: "result", text: "→ Tài liệu tham khảo: 23 nguồn · Sẵn sàng xuất LaTeX + PDF" },
      { type: "status", text: "✓ Báo cáo hoàn thành — 4.200 từ" },
    ],
  },
];

const LINE_COLOR: Record<string, string> = {
  query: "var(--ld-accent)",
  result: "var(--ld-text-primary)",
  upload: "#5b8def",
  status: "#4ade80",
};

export function FeatureShowcase() {
  const [ref, vis] = useReveal(0.1);
  const [active, setActive] = useState(0);
  const agent = AGENTS[active];

  return (
    <section id="features" style={{ padding: "var(--ld-section-pad) 0", position: "relative" }}>
      <div
        ref={ref}
        style={{
          maxWidth: "var(--ld-content-max)",
          margin: "0 auto",
          padding: "0 clamp(20px, 4vw, 40px)",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(30px)",
          transition: "all 0.8s ease",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p
            style={{
              fontFamily: "var(--ld-font-mono)",
              fontSize: 12,
              color: "var(--ld-accent)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Trí Tuệ Chuyên Biệt
          </p>
          <h2
            style={{
              fontSize: "clamp(32px, 4.5vw, 52px)",
              fontFamily: "var(--ld-font-serif)",
              color: "var(--ld-text-primary)",
              marginBottom: 16,
            }}
          >
            Bốn Tác Tử. Một Sứ Mệnh.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "var(--ld-text-secondary)",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            Mỗi tác tử thành thạo một khía cạnh khác nhau của nghiên cứu thiên văn,
            phối hợp liền mạch với nhau.
          </p>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 4,
            marginBottom: 48,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14,
            padding: 4,
            maxWidth: 600,
            margin: "0 auto 48px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {AGENTS.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setActive(i)}
              style={{
                fontFamily: "var(--ld-font-sans)",
                fontSize: 14,
                fontWeight: 500,
                color: i === active ? "var(--ld-bg-deep)" : "var(--ld-text-secondary)",
                background: i === active ? "var(--ld-accent)" : "transparent",
                border: "none",
                borderRadius: 10,
                padding: "10px 22px",
                cursor: "pointer",
                transition: "all 0.25s ease",
                flex: 1,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (i !== active)
                  (e.target as HTMLElement).style.color = "var(--ld-text-primary)";
              }}
              onMouseLeave={(e) => {
                if (i !== active)
                  (e.target as HTMLElement).style.color = "var(--ld-text-secondary)";
              }}
            >
              {a.name}
            </button>
          ))}
        </div>

        {/* Card */}
        <div
          key={agent.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.3fr",
            gap: 32,
            background: "var(--ld-card-bg)",
            backdropFilter: "blur(var(--ld-card-blur))",
            WebkitBackdropFilter: "blur(var(--ld-card-blur))",
            border: "1px solid var(--ld-card-border)",
            borderRadius: 20,
            padding: 40,
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          {/* Left: info */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(201,165,92,0.08)",
                  border: "1px solid rgba(201,165,92,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {agent.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--ld-font-serif)",
                    fontSize: 24,
                    color: "var(--ld-text-primary)",
                  }}
                >
                  {agent.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--ld-font-mono)",
                    fontSize: 11,
                    color: "var(--ld-accent)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {agent.role}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 15, color: "var(--ld-text-secondary)", lineHeight: 1.7 }}>
              {agent.desc}
            </p>
            <button
              style={{
                alignSelf: "flex-start",
                fontFamily: "var(--ld-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ld-accent)",
                background: "none",
                border: "1px solid rgba(201,165,92,0.25)",
                borderRadius: 8,
                padding: "8px 18px",
                cursor: "pointer",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(201,165,92,0.08)";
                el.style.borderColor = "var(--ld-accent)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "none";
                el.style.borderColor = "rgba(201,165,92,0.25)";
              }}
            >
              Tìm hiểu thêm →
            </button>
          </div>

          {/* Right: mock terminal */}
          <div
            style={{
              background: "rgba(0,0,0,0.4)",
              borderRadius: 12,
              padding: "20px 24px",
              fontFamily: "var(--ld-font-mono)",
              fontSize: 12.5,
              lineHeight: 1.8,
              border: "1px solid rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            {/* Traffic lights */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <span
                style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "inline-block" }}
              />
              <span
                style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "inline-block" }}
              />
              <span
                style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "inline-block" }}
              />
            </div>
            {agent.mockLines.map((line, i) => (
              <div
                key={`${agent.id}-${i}`}
                style={{
                  color: LINE_COLOR[line.type] ?? "var(--ld-text-primary)",
                  opacity: 0,
                  animation: `ld-agent-line-in 0.4s ${i * 0.12}s ease forwards`,
                }}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
