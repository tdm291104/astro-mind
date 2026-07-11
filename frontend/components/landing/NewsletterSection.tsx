"use client";

import { useState } from "react";

import { subscribeNewsletter } from "@/lib/api";
import { useReveal } from "./useReveal";

export function NewsletterSection() {
  const [ref, vis] = useReveal(0.1);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!email.includes("@")) return;
    try {
      await subscribeNewsletter(email);
    } catch {
      // fail silently — don't disrupt UX for newsletter errors
    }
    setSubmitted(true);
  }

  return (
    <section style={{ padding: "var(--ld-section-pad) 0" }}>
      <div
        ref={ref}
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "clamp(40px, 6vw, 72px) clamp(24px, 5vw, 56px)",
          background:
            "linear-gradient(135deg, rgba(201,165,92,0.08), rgba(201,165,92,0.02))",
          border: "1px solid rgba(201,165,92,0.15)",
          borderRadius: 24,
          textAlign: "center",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(30px)",
          transition: "all 0.8s ease",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontFamily: "var(--ld-font-serif)",
            color: "var(--ld-text-primary)",
            marginBottom: 12,
          }}
        >
          Tham Gia Đài Quan Sát
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "var(--ld-text-secondary)",
            marginBottom: 32,
            maxWidth: 420,
            margin: "0 auto 32px",
          }}
        >
          Là người đầu tiên biết về tính năng mới, công cụ nghiên cứu và những
          khám phá thiên văn học.
        </p>

        {!submitted ? (
          <div
            style={{
              display: "flex",
              gap: 10,
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
              placeholder="you@university.edu"
              type="email"
              style={{
                flex: 1,
                fontFamily: "var(--ld-font-sans)",
                fontSize: 14,
                color: "var(--ld-text-primary)",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "12px 16px",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(201,165,92,0.3)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
              }
            />
            <button
              onClick={() => { void handleSubmit(); }}
              style={{
                fontFamily: "var(--ld-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ld-bg-deep)",
                background: "var(--ld-accent)",
                border: "none",
                borderRadius: 10,
                padding: "12px 24px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Đăng ký
            </button>
          </div>
        ) : (
          <p
            style={{
              fontFamily: "var(--ld-font-mono)",
              fontSize: 14,
              color: "var(--ld-accent)",
            }}
          >
            ✓ Đăng ký thành công. Chào mừng bạn!
          </p>
        )}

        <p
          style={{
            fontSize: 11,
            color: "var(--ld-text-dim)",
            marginTop: 16,
          }}
        >
          Không có thư rác. Hủy đăng ký bất kỳ lúc nào.
        </p>
      </div>
    </section>
  );
}
