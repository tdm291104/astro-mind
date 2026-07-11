"use client";

import { useEffect, useState } from "react";

import { AstroLogo } from "./AstroLogo";

const LINKS = [
  { label: "Tính năng", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "Bảng giá", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(20px, 4vw, 40px)",
        background: scrolled ? "rgba(6,10,20,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid transparent",
        transition: "all 0.35s ease",
      }}
    >
      <a
        href="#"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
        }}
      >
        <AstroLogo size={26} />
        <span
          style={{
            fontFamily: "var(--ld-font-serif)",
            fontSize: 20,
            color: "var(--ld-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Astro Mind
        </span>
      </a>

      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <div style={{ display: "flex", gap: 28 }}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                fontFamily: "var(--ld-font-sans)",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--ld-text-secondary)",
                letterSpacing: "0.01em",
                transition: "color 0.2s",
                textDecoration: "none",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = "var(--ld-text-primary)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color = "var(--ld-text-secondary)")
              }
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="/login"
          style={{
            fontFamily: "var(--ld-font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ld-bg-deep)",
            background: "var(--ld-accent)",
            border: "none",
            borderRadius: 8,
            padding: "8px 20px",
            cursor: "pointer",
            letterSpacing: "0.02em",
            transition: "transform 0.2s, box-shadow 0.2s",
            display: "inline-block",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translateY(-1px)";
            el.style.boxShadow = "0 4px 20px var(--ld-accent-glow)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "";
            el.style.boxShadow = "";
          }}
        >
          Bắt đầu ngay
        </a>
      </div>
    </nav>
  );
}
