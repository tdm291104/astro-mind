"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

export function HeroSection() {
  const { t } = useTranslation();
  const hero = t("landing").hero;

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "120px clamp(20px, 5vw, 60px) 80px",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: "clamp(300px, 50vw, 700px)",
          height: "clamp(300px, 50vw, 700px)",
          background:
            "radial-gradient(circle, var(--ld-accent-glow) 0%, transparent 70%)",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Tag pill */}
      <div
        className="ld-fade-up-1"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--ld-font-mono)",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--ld-accent)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "rgba(201,165,92,0.08)",
          border: "1px solid rgba(201,165,92,0.15)",
          borderRadius: 100,
          padding: "6px 18px",
          marginBottom: 28,
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--ld-accent)",
            display: "inline-block",
          }}
        />
        {hero.tag}
      </div>

      <h1
        className="ld-fade-up-2"
        style={{
          fontSize: "clamp(40px, 6.5vw, 80px)",
          fontFamily: "var(--ld-font-serif)",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          maxWidth: 800,
          marginBottom: 24,
          position: "relative",
          zIndex: 1,
          color: "var(--ld-text-primary)",
        }}
      >
        {hero.title}{" "}
        <span style={{ color: "var(--ld-accent)" }}>{hero.titleAccent}</span>
      </h1>

      <p
        className="ld-fade-up-3"
        style={{
          fontSize: "clamp(16px, 2vw, 20px)",
          color: "var(--ld-text-secondary)",
          lineHeight: 1.6,
          maxWidth: 560,
          marginBottom: 44,
          position: "relative",
          zIndex: 1,
        }}
      >
        {hero.subtitle}
      </p>

      <div
        className="ld-fade-up-4"
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <a
          href="/login"
          style={{
            fontFamily: "var(--ld-font-sans)",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ld-bg-deep)",
            background: "var(--ld-accent)",
            border: "none",
            borderRadius: 10,
            padding: "14px 32px",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
            display: "inline-block",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translateY(-2px)";
            el.style.boxShadow = "0 8px 32px var(--ld-accent-glow)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "";
            el.style.boxShadow = "";
          }}
        >
          {hero.cta1}
        </a>
        <a
          href="#how-it-works"
          style={{
            fontFamily: "var(--ld-font-sans)",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--ld-text-primary)",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 10,
            padding: "14px 32px",
            cursor: "pointer",
            transition: "border-color 0.2s, background 0.2s",
            display: "inline-block",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "rgba(255,255,255,0.3)";
            el.style.background = "rgba(255,255,255,0.03)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "rgba(255,255,255,0.15)";
            el.style.background = "transparent";
          }}
        >
          {hero.cta2}
        </a>
      </div>

      {/* Social proof */}
      <div
        className="ld-fade-up-4"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 48,
          fontSize: 13,
          color: "var(--ld-text-dim)",
          fontFamily: "var(--ld-font-mono)",
          letterSpacing: "0.03em",
          position: "relative",
          zIndex: 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16">
          <polygon
            points="8,1 10,6 15.5,6.5 11.5,10 12.5,15.5 8,12.5 3.5,15.5 4.5,10 0.5,6.5 6,6"
            fill="var(--ld-accent)"
            opacity="0.7"
          />
        </svg>
        {hero.socialProof}
      </div>
    </section>
  );
}
