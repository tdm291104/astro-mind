"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useReveal } from "./useReveal";

export function PricingSection() {
  const [ref, vis] = useReveal(0.1);
  const { t } = useTranslation();
  const landing = t("landing");
  const pricing = landing.pricing;
  const plans = landing.plans;

  return (
    <section id="pricing" style={{ padding: "var(--ld-section-pad) 0" }}>
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
            {pricing.eyebrow}
          </p>
          <h2
            style={{
              fontSize: "clamp(32px, 4.5vw, 52px)",
              fontFamily: "var(--ld-font-serif)",
              color: "var(--ld-text-primary)",
              marginBottom: 16,
            }}
          >
            {pricing.title}
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "var(--ld-text-secondary)",
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            {pricing.subtitle}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          {plans.map((p, i) => (
            <div
              key={i}
              style={{
                background: p.highlight
                  ? "linear-gradient(135deg, rgba(201,165,92,0.12), rgba(201,165,92,0.04))"
                  : "var(--ld-card-bg)",
                backdropFilter: "blur(var(--ld-card-blur))",
                WebkitBackdropFilter: "blur(var(--ld-card-blur))",
                border: p.highlight
                  ? "1px solid rgba(201,165,92,0.3)"
                  : "1px solid var(--ld-card-border)",
                borderRadius: 20,
                padding: "36px 32px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                transition: "transform 0.3s, box-shadow 0.3s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = p.highlight
                  ? "0 16px 48px rgba(201,165,92,0.15)"
                  : "0 16px 48px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = "";
                el.style.boxShadow = "";
              }}
            >
              {p.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    fontFamily: "var(--ld-font-mono)",
                    fontSize: 10,
                    color: "var(--ld-accent)",
                    background: "rgba(201,165,92,0.12)",
                    border: "1px solid rgba(201,165,92,0.25)",
                    borderRadius: 20,
                    padding: "3px 12px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {pricing.popular}
                </div>
              )}

              <div
                style={{
                  fontFamily: "var(--ld-font-sans)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ld-text-secondary)",
                  marginBottom: 8,
                }}
              >
                {p.name}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--ld-font-serif)",
                    fontSize: 44,
                    color: "var(--ld-text-primary)",
                  }}
                >
                  {p.price}
                </span>
                {p.period && (
                  <span style={{ fontSize: 14, color: "var(--ld-text-dim)" }}>
                    {p.period}
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: 13,
                  color: "var(--ld-text-dim)",
                  marginBottom: 28,
                }}
              >
                {p.desc}
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 32,
                  flex: 1,
                }}
              >
                {p.features.map((f, j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13.5,
                      color: "var(--ld-text-secondary)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                      <polyline
                        points="3,7 6,10 11,4"
                        fill="none"
                        stroke="var(--ld-accent)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>

              <a
                href="/register"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 10,
                  fontFamily: "var(--ld-font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: p.highlight ? "var(--ld-accent)" : "transparent",
                  color: p.highlight ? "var(--ld-bg-deep)" : "var(--ld-text-primary)",
                  border: p.highlight ? "none" : "1px solid rgba(255,255,255,0.12)",
                  textAlign: "center",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  if (!p.highlight) {
                    el.style.background = "rgba(255,255,255,0.06)";
                    el.style.borderColor = "rgba(255,255,255,0.2)";
                  } else {
                    el.style.boxShadow = "0 4px 24px var(--ld-accent-glow)";
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  if (!p.highlight) {
                    el.style.background = "transparent";
                    el.style.borderColor = "rgba(255,255,255,0.12)";
                  } else {
                    el.style.boxShadow = "";
                  }
                }}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
