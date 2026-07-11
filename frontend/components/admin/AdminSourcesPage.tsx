"use client";

import { useEffect, useState } from "react";
import { getAdminSources, setSourceEnabled, testSource, type AdminSource } from "@/lib/api";

const T = {
  bg: { deep: "#060a14", card: "rgba(15,23,42,0.6)" },
  border: { subtle: "rgba(255,255,255,0.06)", card: "rgba(255,255,255,0.08)" },
  text: { primary: "#ede8df", secondary: "#8892a8", dim: "#4a5568", accent: "#c9a55c" },
  accent: "#c9a55c",
  font: { serif: "'Instrument Serif', Georgia, serif", sans: "'Space Grotesk', system-ui, sans-serif", mono: "'JetBrains Mono', monospace" },
  radius: { sm: 8, md: 12, lg: 16 },
};

// Static descriptions not in DB
const SOURCE_DESCS: Record<string, string> = {
  apod: "Astronomy Picture of the Day — daily curated imagery and explanations from NASA",
  arxiv: "Pre-print server — astrophysics papers, updated daily from all subcategories",
  images: "Official NASA media — images, video, and audio from missions and observations",
  web: "General web search — astronomy blogs, Wikipedia, educational resources, news",
};

// Static colors not in DB
const SOURCE_COLORS: Record<string, string> = {
  apod: "#5b8def", arxiv: "#22c55e", images: "#f59e0b", web: "#a78bfa",
};

function resolveStatus(src: AdminSource): "active" | "degraded" | "inactive" {
  if (!src.enabled) return "inactive";
  if (src.last_status === "error") return "degraded";
  return "active";
}

function statusStyle(s: "active" | "degraded" | "inactive"): React.CSSProperties {
  const color = s === "active" ? "#22c55e" : s === "degraded" ? "#f59e0b" : "#4a5568";
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontFamily: T.font.mono, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase" as const,
    color, background: color + "12", padding: "3px 10px", borderRadius: 20,
  };
}

function fmtTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SourceIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round">
      <circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="3" opacity="0.3"/>
      <path d="M10 2v3M10 15v3M2 10h3M15 10h3" opacity="0.4"/>
    </svg>
  );
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    getAdminSources()
      .then((r) => setSources(r.sources))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleTest(key: string) {
    setTesting(key);
    try {
      const result = await testSource(key);
      setSources((prev) =>
        prev.map((s) =>
          s.key === key
            ? { ...s, last_status: result.status, last_latency_ms: result.latency_ms, last_checked_at: result.checked_at }
            : s
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setTesting(null);
    }
  }

  async function handleToggle(key: string, enabled: boolean) {
    setToggling(key);
    try {
      await setSourceEnabled(key, enabled);
      setSources((prev) => prev.map((s) => (s.key === key ? { ...s, enabled } : s)));
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: T.font.serif, fontSize: 28, color: T.text.primary, marginBottom: 4 }}>Data Sources</h2>
          <p style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim }}>Manage external APIs and data connections</p>
        </div>
      </div>

      {loading ? (
        <div style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim, padding: 40, textAlign: "center" as const }}>
          Đang tải data sources...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sources.map((src) => {
            const status = resolveStatus(src);
            const expanded = expandedKey === src.key;
            const color = SOURCE_COLORS[src.key] ?? T.accent;
            const desc = SOURCE_DESCS[src.key] ?? `Source: ${src.name}`;

            return (
              <div key={src.key} style={{
                background: T.bg.card,
                border: `1px solid ${expanded ? color + "30" : T.border.card}`,
                borderRadius: T.radius.lg, overflow: "hidden",
                transition: "border-color 0.2s",
              }}>
                {/* Header row */}
                <button
                  onClick={() => setExpandedKey(expanded ? null : src.key)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 16,
                    padding: "18px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const,
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: T.radius.md,
                    background: color + "10", border: `1px solid ${color}20`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <SourceIcon color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                      <span style={{ fontFamily: T.font.sans, fontSize: 15, fontWeight: 600, color: T.text.primary }}>{src.name}</span>
                      <span style={statusStyle(status)}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                        {status}
                      </span>
                    </div>
                    <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.text.dim }}>{src.endpoint}</span>
                  </div>
                  <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.dim, marginBottom: 2 }}>LATENCY</div>
                      <div style={{ fontFamily: T.font.mono, fontSize: 13, color: T.text.primary }}>
                        {src.last_latency_ms != null ? `${src.last_latency_ms}ms` : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.dim, marginBottom: 2 }}>LAST CHECK</div>
                      <div style={{ fontFamily: T.font.mono, fontSize: 13, color: T.text.primary }}>
                        {fmtTime(src.last_checked_at)}
                      </div>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={T.text.dim} strokeWidth="1.5" strokeLinecap="round"
                    style={{ flexShrink: 0, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
                    <polyline points="4,6 8,10 12,6"/>
                  </svg>
                </button>

                {/* Expanded panel */}
                {expanded && (
                  <div style={{ borderTop: `1px solid ${T.border.subtle}`, padding: "20px 24px" }}>
                    <p style={{ fontSize: 13, color: T.text.secondary, marginBottom: 18, lineHeight: 1.6 }}>{desc}</p>

                    {/* Metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                      {[
                        {
                          label: "Status",
                          value: src.last_status ?? "Unknown",
                          color: src.last_status === "ok" ? "#22c55e" : src.last_status === "error" ? "#ef4444" : T.text.dim,
                        },
                        {
                          label: "Latency",
                          value: src.last_latency_ms != null ? `${src.last_latency_ms}ms` : "—",
                          color: src.last_latency_ms != null && src.last_latency_ms < 500 ? "#22c55e" : src.last_latency_ms != null && src.last_latency_ms > 1000 ? "#f59e0b" : T.text.primary,
                        },
                        {
                          label: "Enabled",
                          value: src.enabled ? "Yes" : "No",
                          color: src.enabled ? "#22c55e" : T.text.dim,
                        },
                      ].map((m, i) => (
                        <div key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: T.radius.sm, padding: "12px 14px", border: `1px solid ${T.border.subtle}` }}>
                          <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.dim, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 6 }}>{m.label}</div>
                          <div style={{ fontFamily: T.font.mono, fontSize: 18, fontWeight: 500, color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Note: request/error counts not available */}
                    <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={T.text.dim} strokeWidth="1.3" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="7" cy="7" r="5.5"/><line x1="7" y1="5" x2="7" y2="7.5"/><circle cx="7" cy="9.5" r="0.5" fill={T.text.dim}/>
                      </svg>
                      <span style={{ fontFamily: T.font.sans, fontSize: 11, color: T.text.dim }}>
                        Per-source request/error counts và record count chưa được tracking trong DB.
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <GhostBtn
                        onClick={() => handleTest(src.key)}
                        disabled={testing === src.key}
                      >
                        {testing === src.key ? "Testing..." : "Test Now"}
                      </GhostBtn>
                      <GhostBtn
                        onClick={() => handleToggle(src.key, !src.enabled)}
                        disabled={toggling === src.key}
                        warn={src.enabled}
                      >
                        {toggling === src.key ? "Saving..." : src.enabled ? "Disable" : "Enable"}
                      </GhostBtn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GhostBtn({
  children, onClick, disabled, warn,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  warn?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: T.font.sans, fontSize: 12, fontWeight: 600,
        borderRadius: T.radius.sm, padding: "7px 16px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s",
        background: hov && !disabled ? "rgba(255,255,255,0.06)" : "transparent",
        color: warn ? "#f59e0b" : T.text.primary,
        border: `1px solid ${warn ? "#f59e0b30" : hov && !disabled ? "rgba(255,255,255,0.18)" : T.border.card}`,
        display: "flex", alignItems: "center", gap: 6,
      }}
    >
      {children}
    </button>
  );
}
