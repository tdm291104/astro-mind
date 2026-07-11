"use client";

import { AstroLogo } from "./AstroLogo";

const COLS = [
  { title: "Sản phẩm", links: ["Tính năng", "Bảng giá", "Demo", "Nhật ký thay đổi", "Tài liệu API"] },
  { title: "Tài nguyên", links: ["Tài liệu", "Hướng dẫn", "Blog", "Bài báo nghiên cứu", "Trạng thái"] },
  { title: "Công ty", links: ["Giới thiệu", "Tuyển dụng", "Liên hệ", "Quyền riêng tư", "Điều khoản"] },
];

export function FooterSection() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "56px 0 40px",
      }}
    >
      <div
        style={{
          maxWidth: "var(--ld-content-max)",
          margin: "0 auto",
          padding: "0 clamp(20px, 4vw, 40px)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr repeat(3, 1fr)",
            gap: 48,
            marginBottom: 48,
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <AstroLogo size={22} />
              <span
                style={{
                  fontFamily: "var(--ld-font-serif)",
                  fontSize: 18,
                  color: "var(--ld-text-primary)",
                }}
              >
                Astro Mind
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--ld-text-dim)",
                lineHeight: 1.65,
                maxWidth: 240,
              }}
            >
              Công cụ nghiên cứu thiên văn học được hỗ trợ bởi AI. Dành cho những
              tâm hồn tò mò khám phá vũ trụ.
            </p>
          </div>

          {/* Link columns */}
          {COLS.map((col, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: "var(--ld-font-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ld-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 16,
                }}
              >
                {col.title}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {col.links.map((l, j) => (
                  <a
                    key={j}
                    href="#"
                    style={{
                      fontSize: 13.5,
                      color: "var(--ld-text-dim)",
                      transition: "color 0.2s",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) =>
                      ((e.target as HTMLElement).style.color =
                        "var(--ld-text-primary)")
                    }
                    onMouseLeave={(e) =>
                      ((e.target as HTMLElement).style.color =
                        "var(--ld-text-dim)")
                    }
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.04)",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--ld-text-dim)",
              fontFamily: "var(--ld-font-mono)",
            }}
          >
            © 2026 Astro Mind. Bảo lưu mọi quyền.
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            {["Twitter", "GitHub", "Discord"].map((s) => (
              <a
                key={s}
                href="#"
                style={{
                  fontSize: 12,
                  color: "var(--ld-text-dim)",
                  transition: "color 0.2s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color =
                    "var(--ld-text-primary)")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color = "var(--ld-text-dim)")
                }
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
