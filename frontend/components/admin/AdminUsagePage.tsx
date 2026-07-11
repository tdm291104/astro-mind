"use client";

import { useEffect, useState } from "react";
import { getAdminOverview, type AdminOverview } from "@/lib/api";

const T = {
  bg: { deep: "#060a14", card: "rgba(15,23,42,0.6)" },
  border: { subtle: "rgba(255,255,255,0.06)", card: "rgba(255,255,255,0.08)" },
  text: { primary: "#ede8df", secondary: "#8892a8", dim: "#4a5568", accent: "#c9a55c" },
  accent: "#c9a55c",
  font: { serif: "'Instrument Serif', Georgia, serif", sans: "'Space Grotesk', system-ui, sans-serif", mono: "'JetBrains Mono', monospace" },
  radius: { sm: 8, md: 12, lg: 16 },
};

// Feature label + color mapping
const FEATURE_META: Record<string, { label: string; color: string }> = {
  chat:     { label: "Chat",     color: "#c9a55c" },
  notebook: { label: "Notebook", color: "#a78bfa" },
  search:   { label: "Search",   color: "#5b8def" },
  report:   { label: "Trends",   color: "#22c55e" },
};

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function AdminUsagePage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "14d">("14d");

  useEffect(() => {
    getAdminOverview()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim, padding: 40 }}>
      Đang tải dữ liệu usage...
    </div>
  );
  if (!data) return (
    <div style={{ fontFamily: T.font.sans, fontSize: 13, color: "#ef4444", padding: 24 }}>
      Không thể tải dữ liệu. Kiểm tra kết nối backend.
    </div>
  );

  const volume = period === "7d" ? data.request_volume.slice(-7) : data.request_volume;
  const maxReq = Math.max(...volume.map((d) => d.requests), 1);
  const maxTok = Math.max(...volume.map((d) => d.tokens), 1);

  const totalTokens = data.feature_usage.reduce((s, f) => s + f.tokens, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: T.font.serif, fontSize: 28, color: T.text.primary, marginBottom: 4 }}>Usage Analytics</h2>
          <p style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim }}>Token và request consumption theo thời gian</p>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: 3 }}>
          {(["7d", "14d"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              fontFamily: T.font.mono, fontSize: 11,
              color: period === p ? T.bg.deep : T.text.dim,
              background: period === p ? T.accent : "transparent",
              border: "none", borderRadius: 6, padding: "5px 14px",
              cursor: "pointer", transition: "all 0.2s",
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart — requests */}
      <div style={{ background: T.bg.card, border: `1px solid ${T.border.card}`, borderRadius: T.radius.lg, padding: "24px 28px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: T.font.sans, fontSize: 14, fontWeight: 600, color: T.text.primary }}>Daily Activity</span>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { color: "#5b8def", label: "Requests" },
              { color: T.accent, label: "Tokens" },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: T.font.mono, fontSize: 10, color: T.text.dim }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {volume.every((d) => d.requests === 0) ? (
          <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font.sans, fontSize: 13, color: T.text.dim }}>
            Chưa có dữ liệu usage trong khoảng thời gian này
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
            {volume.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
                <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 140, width: "100%" }}>
                  <div style={{
                    flex: 1, borderRadius: "3px 3px 0 0",
                    background: "linear-gradient(180deg, #5b8def, #5b8def60)",
                    height: `${(d.requests / maxReq) * 100}%`,
                    transition: "height 0.5s ease", minHeight: d.requests > 0 ? 4 : 0,
                  }} />
                  <div style={{
                    flex: 1, borderRadius: "3px 3px 0 0",
                    background: `linear-gradient(180deg, ${T.accent}, ${T.accent}60)`,
                    height: `${(d.tokens / maxTok) * 100}%`,
                    transition: "height 0.5s ease", minHeight: d.tokens > 0 ? 4 : 0,
                  }} />
                </div>
                <span style={{ fontFamily: T.font.mono, fontSize: 8, color: T.text.dim, whiteSpace: "nowrap" as const }}>
                  {fmtDay(d.day).split(" ")[1]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Feature token distribution */}
        <div style={{ background: T.bg.card, border: `1px solid ${T.border.card}`, borderRadius: T.radius.lg, padding: "24px 28px" }}>
          <span style={{ fontFamily: T.font.sans, fontSize: 14, fontWeight: 600, color: T.text.primary, display: "block", marginBottom: 20 }}>
            Feature Token Distribution
          </span>

          {data.feature_usage.length === 0 ? (
            <div style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim, paddingTop: 8 }}>
              Chưa có dữ liệu usage tháng này
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.feature_usage.map((f) => {
                const meta = FEATURE_META[f.feature] ?? { label: f.feature, color: T.accent };
                return (
                  <div key={f.feature}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.primary, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
                        {meta.label}
                      </span>
                      <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.text.dim }}>
                        {fmtTokens(f.tokens)} <span style={{ color: meta.color }}>({f.pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: meta.color, width: `${f.pct}%`, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: T.radius.sm, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: T.font.sans, fontSize: 12, fontWeight: 600, color: T.text.primary }}>Total</span>
            <span style={{ fontFamily: T.font.mono, fontSize: 12, color: T.accent }}>{fmtTokens(totalTokens)} tokens</span>
          </div>
        </div>

        {/* Daily summary */}
        <div style={{ background: T.bg.card, border: `1px solid ${T.border.card}`, borderRadius: T.radius.lg, padding: "24px 28px" }}>
          <span style={{ fontFamily: T.font.sans, fontSize: 14, fontWeight: 600, color: T.text.primary, display: "block", marginBottom: 20 }}>
            Daily Summary ({period})
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {volume.slice(-8).reverse().map((d, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr", gap: 8,
                padding: "10px 0",
                borderBottom: i < Math.min(volume.length, 8) - 1 ? `1px solid ${T.border.subtle}` : "none",
                alignItems: "center",
              }}>
                <span style={{ fontFamily: T.font.mono, fontSize: 12, color: T.text.primary }}>{fmtDay(d.day)}</span>
                <span style={{ fontFamily: T.font.mono, fontSize: 11, color: "#5b8def" }}>{d.requests.toLocaleString()} req</span>
                <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.accent }}>{fmtTokens(d.tokens)} tok</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr", gap: 8, padding: "8px 0 0", marginTop: 4 }}>
            {["Date", "Requests", "Tokens"].map((h) => (
              <span key={h} style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.dim, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{h}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Note: Top Endpoints not available */}
      <div style={{ marginTop: 18, padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={T.text.dim} strokeWidth="1.3" strokeLinecap="round">
          <circle cx="7" cy="7" r="5.5"/><line x1="7" y1="5" x2="7" y2="7.5"/><circle cx="7" cy="9.5" r="0.5" fill={T.text.dim}/>
        </svg>
        <span style={{ fontFamily: T.font.sans, fontSize: 12, color: T.text.dim }}>
          Per-endpoint metrics chưa được tracking — chỉ có aggregate theo feature (chat/notebook/search/report).
        </span>
      </div>
    </div>
  );
}
