"use client";

import { useReveal } from "./useReveal";

const STEPS = [
  {
    num: "01",
    title: "Hỏi hoặc Tải lên",
    desc: "Nhập câu hỏi nghiên cứu hoặc tải lên tài liệu — bài báo, nhật ký quan sát, header FITS, bất cứ thứ gì.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        stroke="var(--ld-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M14 4v12M9 11l5 5 5-5" />
        <rect x="4" y="18" width="20" height="6" rx="2" opacity="0.3" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Các Tác Tử Phối Hợp",
    desc: "Search Agent tìm bài báo, Notebook Agent trích xuất dữ liệu, Chat Agent tổng hợp kiến thức — tất cả hoạt động song song.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        stroke="var(--ld-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="14" cy="14" r="4" />
        <circle cx="6" cy="8" r="2.5" opacity="0.5" />
        <circle cx="22" cy="8" r="2.5" opacity="0.5" />
        <circle cx="14" cy="24" r="2.5" opacity="0.5" />
        <line x1="9" y1="10" x2="11" y2="12" />
        <line x1="19" y1="10" x2="17" y2="12" />
        <line x1="14" y1="18" x2="14" y2="21" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Nhận Kết Quả",
    desc: "Nhận câu trả lời có cấu trúc, so sánh dữ liệu và báo cáo sẵn sàng xuất bản — kèm trích dẫn đầy đủ.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        stroke="var(--ld-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M6 4h16a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
        <polyline points="9,14 12,17 19,10" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  const [ref, vis] = useReveal(0.1);

  return (
    <section id="how-it-works" style={{ padding: "var(--ld-section-pad) 0" }}>
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
        <div style={{ textAlign: "center", marginBottom: 64 }}>
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
            Cách Hoạt Động
          </p>
          <h2
            style={{
              fontSize: "clamp(32px, 4.5vw, 52px)",
              fontFamily: "var(--ld-font-serif)",
              color: "var(--ld-text-primary)",
            }}
          >
            Từ Câu Hỏi đến Khám Phá
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 32,
            position: "relative",
          }}
        >
          {/* Connector line */}
          <div
            style={{
              position: "absolute",
              top: 48,
              left: "20%",
              right: "20%",
              height: 1,
              background:
                "linear-gradient(to right, transparent, rgba(201,165,92,0.2), rgba(201,165,92,0.2), transparent)",
            }}
          />

          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{ textAlign: "center", position: "relative", zIndex: 1 }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: "var(--ld-card-bg)",
                  backdropFilter: "blur(var(--ld-card-blur))",
                  WebkitBackdropFilter: "blur(var(--ld-card-blur))",
                  border: "1px solid var(--ld-card-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                {s.icon}
              </div>
              <div
                style={{
                  fontFamily: "var(--ld-font-mono)",
                  fontSize: 11,
                  color: "var(--ld-accent)",
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}
              >
                {s.num}
              </div>
              <h3
                style={{
                  fontSize: 22,
                  fontFamily: "var(--ld-font-serif)",
                  color: "var(--ld-text-primary)",
                  marginBottom: 10,
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--ld-text-secondary)",
                  lineHeight: 1.65,
                  maxWidth: 280,
                  margin: "0 auto",
                }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
