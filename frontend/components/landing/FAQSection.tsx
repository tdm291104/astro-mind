"use client";

import { useState } from "react";

import { useReveal } from "./useReveal";

const ITEMS = [
  {
    q: "Astro Mind có thể hỗ trợ những loại nghiên cứu thiên văn nào?",
    a: "Từ vật lý thiên văn sao và phát hiện ngoại hành tinh đến vũ trụ học và khoa học hệ mặt trời. Các tác tử của chúng tôi truy cập các cơ sở dữ liệu bao gồm NASA ADS, arXiv, SIMBAD và Exoplanet Archive.",
  },
  {
    q: "Câu trả lời của AI có chính xác không?",
    a: "Mỗi câu trả lời đều kèm trích dẫn nguồn để bạn kiểm chứng. Các tác tử đối chiếu nhiều cơ sở dữ liệu và đánh dấu mức độ không chắc chắn. Chúng tôi khuyên dùng Astro Mind như công cụ hỗ trợ nghiên cứu, không thay thế quy trình bình duyệt.",
  },
  {
    q: "Tôi có thể tải lên dữ liệu quan sát của mình không?",
    a: "Có. Notebook Agent chấp nhận PDF, văn bản thuần, CSV, header FITS và các định dạng ảnh phổ biến. Nó trích xuất dữ liệu có cấu trúc và có thể so sánh quan sát của bạn với nghiên cứu đã xuất bản.",
  },
  {
    q: "Dữ liệu nghiên cứu của tôi có được bảo mật không?",
    a: "Hoàn toàn. Tất cả tệp tải lên đều được mã hóa khi truyền và lưu trữ. Chúng tôi không bao giờ dùng dữ liệu của bạn để huấn luyện mô hình. Người dùng gói Team có thêm kiểm soát truy cập và nhật ký kiểm tra.",
  },
  {
    q: "Tôi có cần kiến thức thiên văn để dùng Astro Mind không?",
    a: "Không cần. Chat Agent điều chỉnh giải thích theo trình độ của bạn — từ giới thiệu đại học đến chi tiết kỹ thuật cấp tiến sĩ. Chỉ cần hỏi tự nhiên.",
  },
  {
    q: "Tôi có thể xuất kết quả nghiên cứu không?",
    a: "Gói Pro và Team bao gồm xuất đầy đủ: báo cáo PDF, nguồn LaTeX, trích dẫn BibTeX và dữ liệu JSON có cấu trúc. Người dùng gói Starter có thể sao chép văn bản câu trả lời.",
  },
];

export function FAQSection() {
  const [ref, vis] = useReveal(0.1);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" style={{ padding: "var(--ld-section-pad) 0" }}>
      <div
        ref={ref}
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 clamp(20px, 4vw, 40px)",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(30px)",
          transition: "all 0.8s ease",
        }}
      >
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
            FAQ
          </p>
          <h2
            style={{
              fontSize: "clamp(32px, 4.5vw, 52px)",
              fontFamily: "var(--ld-font-serif)",
              color: "var(--ld-text-primary)",
            }}
          >
            Câu Hỏi Thường Gặp
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ITEMS.map((item, i) => {
            const open = openIdx === i;
            return (
              <div
                key={i}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 0",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--ld-font-sans)",
                      fontSize: 15.5,
                      fontWeight: 500,
                      color: "var(--ld-text-primary)",
                      paddingRight: 20,
                    }}
                  >
                    {item.q}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    style={{
                      flexShrink: 0,
                      transition: "transform 0.3s",
                      transform: open ? "rotate(45deg)" : "none",
                    }}
                  >
                    <line
                      x1="9"
                      y1="3"
                      x2="9"
                      y2="15"
                      stroke="var(--ld-accent)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="3"
                      y1="9"
                      x2="15"
                      y2="9"
                      stroke="var(--ld-accent)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <div
                  style={{
                    maxHeight: open ? 200 : 0,
                    overflow: "hidden",
                    transition: "max-height 0.4s ease",
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--ld-text-secondary)",
                      lineHeight: 1.7,
                      paddingBottom: 20,
                    }}
                  >
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
