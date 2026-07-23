"use client";

import { useState } from "react";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useReveal } from "./useReveal";

const AGENT_ICONS = [
  (
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
  (
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
  (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ld-accent)"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="var(--ld-accent)" opacity="0.5" />
      <polyline points="21,15 16,10 11,15" opacity="0.5" />
      <polyline points="13,15 9,11 3,15" opacity="0.5" />
      <line x1="8" y1="21" x2="16" y2="21" opacity="0.4" />
      <line x1="12" y1="17" x2="12" y2="21" opacity="0.4" />
    </svg>
  ),
  (
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
];

const AGENT_KEYS = ["search", "notebook", "image", "report"] as const;

const LINE_COLOR: Record<string, string> = {
  query: "var(--ld-accent)",
  result: "var(--ld-text-primary)",
  upload: "#5b8def",
  status: "#4ade80",
};

export function FeatureShowcase() {
  const [ref, vis] = useReveal(0.1);
  const [active, setActive] = useState(0);
  const { t } = useTranslation();
  const landing = t("landing");
  const features = landing.features;
  const agents = landing.agents;

  const AGENTS = AGENT_KEYS.map((key, i) => ({
    key,
    icon: AGENT_ICONS[i],
    ...agents[key],
  }));

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
            {features.eyebrow}
          </p>
          <h2
            style={{
              fontSize: "clamp(32px, 4.5vw, 52px)",
              fontFamily: "var(--ld-font-serif)",
              color: "var(--ld-text-primary)",
              marginBottom: 16,
            }}
          >
            {features.title}
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "var(--ld-text-secondary)",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            {features.subtitle}
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
              key={a.key}
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
          key={agent.key}
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
              {features.learnMore}
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
                key={`${agent.key}-${i}`}
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
