"use client";

import { useState } from "react";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useReveal } from "./useReveal";

export function FAQSection() {
  const [ref, vis] = useReveal(0.1);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const { t } = useTranslation();
  const landing = t("landing");
  const faq = landing.faq;
  const items = landing.faqItems;

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
            {faq.eyebrow}
          </p>
          <h2
            style={{
              fontSize: "clamp(32px, 4.5vw, 52px)",
              fontFamily: "var(--ld-font-serif)",
              color: "var(--ld-text-primary)",
            }}
          >
            {faq.title}
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((item, i) => {
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
