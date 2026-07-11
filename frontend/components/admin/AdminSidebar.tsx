"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Section } from "@/components/admin/admin-sections";
import { useAuth } from "@/lib/auth";

const T = {
  bg: { deep: "#060a14" },
  border: { subtle: "rgba(255,255,255,0.06)", card: "rgba(255,255,255,0.08)" },
  text: { primary: "#ede8df", secondary: "#8892a8", dim: "#4a5568", accent: "#c9a55c" },
  accent: "#c9a55c",
  font: { serif: "'Instrument Serif', Georgia, serif", sans: "'Space Grotesk', system-ui, sans-serif", mono: "'JetBrains Mono', monospace" },
  radius: { sm: 8, md: 12 },
};

function AstroLogoSvg({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="3.5" fill={T.accent} />
      <circle cx="16" cy="16" r="8" stroke={T.accent} strokeWidth="0.6" opacity="0.35" />
      <circle cx="16" cy="16" r="13" stroke={T.accent} strokeWidth="0.4" opacity="0.15" />
      <circle cx="7" cy="9" r="1.3" fill={T.text.primary} opacity="0.55" />
      <circle cx="25" cy="11" r="1" fill={T.text.primary} opacity="0.45" />
      <circle cx="9" cy="24" r="1.1" fill={T.text.primary} opacity="0.5" />
      <circle cx="24" cy="22" r="0.9" fill={T.text.primary} opacity="0.4" />
      <line x1="7" y1="9" x2="16" y2="16" stroke={T.text.primary} strokeWidth="0.4" opacity="0.25" />
      <line x1="25" y1="11" x2="16" y2="16" stroke={T.text.primary} strokeWidth="0.4" opacity="0.25" />
      <line x1="9" y1="24" x2="16" y2="16" stroke={T.text.primary} strokeWidth="0.4" opacity="0.25" />
      <line x1="24" y1="22" x2="16" y2="16" stroke={T.text.primary} strokeWidth="0.4" opacity="0.25" />
      <line x1="7" y1="9" x2="9" y2="24" stroke={T.text.primary} strokeWidth="0.3" opacity="0.15" />
      <line x1="25" y1="11" x2="24" y2="22" stroke={T.text.primary} strokeWidth="0.3" opacity="0.15" />
    </svg>
  );
}

const NAV_SECTIONS = [
  {
    id: "overview", label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/>
        <rect x="1.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    id: "users", label: "Users",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx="6" cy="5" r="2.5"/><path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5"/>
        <circle cx="11.5" cy="5.5" r="1.8" opacity="0.5"/><path d="M11.5 9c1.8 0 3.2 1.4 3.2 3.2" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: "usage", label: "Usage",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <polyline points="1.5,12 5,7 8,9 11,4 14.5,1.5"/>
        <polyline points="11,1.5 14.5,1.5 14.5,5" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: "sources", label: "Data Sources",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <ellipse cx="8" cy="4" rx="5.5" ry="2"/>
        <path d="M2.5 4v4c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V4"/>
        <path d="M2.5 8v4c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V8" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: "quotas", label: "Quotas",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx="8" cy="8" r="6"/><path d="M8 4v4l2.5 2.5"/>
      </svg>
    ),
  },
];

const BOTTOM_ITEMS = [
  {
    id: "back", label: "Back to App",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M10 2L4 8l6 6"/>
      </svg>
    ),
  },
];

function NavItem({
  item,
  active,
  onClick,
  dimColor,
}: {
  item: { id: string; label: string; icon: React.ReactNode };
  active: boolean;
  onClick: () => void;
  dimColor?: boolean;
}) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 14px", margin: "1px 8px",
        borderRadius: T.radius.sm, cursor: "pointer",
        background: active ? "rgba(201,165,92,0.08)" : hov ? "rgba(255,255,255,0.03)" : "transparent",
        color: active ? T.accent : dimColor ? T.text.dim : T.text.secondary,
        fontFamily: T.font.sans, fontSize: 13, fontWeight: active ? 600 : 400,
        border: "none", width: "calc(100% - 16px)", textAlign: "left" as const,
        transition: "all 0.15s",
        borderLeft: active ? `2px solid ${T.accent}` : "2px solid transparent",
      }}
    >
      {item.icon} {item.label}
    </button>
  );
}

export default function AdminSidebar({
  section,
  onSelect,
}: {
  section: Section;
  onSelect: (s: Section) => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const initial = user?.display_name?.charAt(0).toUpperCase() ?? "A";

  return (
    <div style={{
      width: 220, height: "100vh", display: "flex", flexDirection: "column",
      background: "rgba(8,12,22,0.97)",
      borderRight: `1px solid ${T.border.subtle}`,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 18px 20px" }}>
        <AstroLogoSvg size={22} />
        <div>
          <div style={{ fontFamily: T.font.serif, fontSize: 16, color: T.text.primary, lineHeight: 1.2 }}>Astro Mind</div>
          <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.accent, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Admin</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: "0 0 8px" }}>
        <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.dim, letterSpacing: "0.08em", textTransform: "uppercase" as const, padding: "8px 20px 6px" }}>Dashboard</div>
        {NAV_SECTIONS.map((s) => (
          <NavItem
            key={s.id}
            item={s}
            active={section === s.id}
            onClick={() => onSelect(s.id as Section)}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Bottom items */}
      <div style={{ borderTop: `1px solid ${T.border.subtle}`, padding: "10px 0 12px" }}>
        {BOTTOM_ITEMS.map((s) => (
          <NavItem
            key={s.id}
            item={s}
            active={false}
            dimColor={s.id === "back"}
            onClick={() => {
              if (s.id === "back") router.push("/");
            }}
          />
        ))}
      </div>

      {/* User footer */}
      <div style={{
        padding: "12px 16px 14px",
        display: "flex", alignItems: "center", gap: 10,
        borderTop: `1px solid ${T.border.subtle}`,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #ef4444, #c9a55c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: T.font.sans, fontSize: 11, fontWeight: 600, color: T.bg.deep,
          flexShrink: 0,
        }}>
          {initial}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.text.primary }}>{user?.display_name ?? "Admin"}</div>
          <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.dim }}>Super Admin</div>
        </div>
      </div>
    </div>
  );
}
