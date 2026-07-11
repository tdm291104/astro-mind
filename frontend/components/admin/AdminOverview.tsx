"use client";

import { useEffect, useState } from "react";
import { getAdminOverview, getAdminPlanRequests, dismissPlanRequest, updateUser, type AdminOverview, type PlanRequest } from "@/lib/api";

const T = {
  bg: { card: "rgba(15,23,42,0.6)" },
  border: { card: "rgba(255,255,255,0.08)" },
  text: { primary: "#ede8df", dim: "#4a5568" },
  accent: "#c9a55c",
  font: { serif: "'Instrument Serif', Georgia, serif", sans: "'Space Grotesk', system-ui, sans-serif", mono: "'JetBrains Mono', monospace" },
  radius: { sm: 8, lg: 16 },
};

function Spark({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * height;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} opacity="0.8" />
    </svg>
  );
}

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function pctChange(current: number, previous: number): { label: string; up: boolean } | null {
  if (previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  return { label: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`, up: delta >= 0 };
}

export default function AdminOverview() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [planRequests, setPlanRequests] = useState<PlanRequest[]>([]);

  useEffect(() => {
    getAdminOverview()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
    void getAdminPlanRequests().then((d) => setPlanRequests(d.requests)).catch(() => {});
  }, []);

  async function handleDismiss(id: string) {
    await dismissPlanRequest(id);
    setPlanRequests((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleUpgrade(r: PlanRequest) {
    await updateUser(r.user_id, { plan: r.requested_plan as "free" | "pro" | "team" });
    await dismissPlanRequest(r.id);
    setPlanRequests((prev) => prev.filter((req) => req.id !== r.id));
  }

  if (loading) return <LoadingState />;
  if (!data) return <ErrorState />;

  const { kpis, request_volume, feature_usage } = data;

  // Sparkline series from request_volume (last 14 days)
  const reqSeries = request_volume.map((d) => d.requests);
  const tokSeries = request_volume.map((d) => d.tokens);

  // Change vs previous period
  const reqChange = pctChange(kpis.requests.today, kpis.requests.avg_7d);
  const tokChange = pctChange(kpis.tokens.this_month, kpis.tokens.last_month);
  const userPct = kpis.total_users > 0
    ? { label: `+${kpis.new_users_7d} tuần này`, up: true }
    : null;

  // Top feature from feature_usage
  const topFeature = feature_usage[0];
  const FEATURE_COLORS: Record<string, string> = {
    chat: "#c9a55c", notebook: "#a78bfa", search: "#5b8def", report: "#22c55e",
  };

  const CARDS = [
    {
      label: "Total Users",
      value: fmtNumber(kpis.total_users),
      change: userPct,
      color: "#c9a55c",
      spark: reqSeries.map(() => kpis.total_users), // flat line, no historical user count
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#c9a55c" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="7" cy="6" r="2.5"/><path d="M2 16c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
          <circle cx="13" cy="6.5" r="1.8" opacity="0.4"/>
        </svg>
      ),
    },
    {
      label: "New Users (7d)",
      value: String(kpis.new_users_7d),
      change: kpis.new_users_7d > 0 ? { label: "tuần này", up: true } : null,
      color: "#22c55e",
      spark: reqSeries.map(() => kpis.new_users_7d),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="9" cy="7" r="3"/><path d="M3 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
          <line x1="13" y1="4" x2="17" y2="4" opacity="0.5"/><line x1="15" y1="2" x2="15" y2="6" opacity="0.5"/>
        </svg>
      ),
    },
    {
      label: "Requests Today",
      value: fmtNumber(kpis.requests.today),
      change: reqChange,
      color: "#5b8def",
      spark: reqSeries,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#5b8def" strokeWidth="1.3" strokeLinecap="round">
          <polyline points="2,13 6,8 9,10 13,5 16,3"/>
          <polyline points="12,3 16,3 16,7" opacity="0.5"/>
        </svg>
      ),
    },
    {
      label: "Tokens This Month",
      value: fmtTokens(kpis.tokens.this_month),
      change: tokChange,
      color: "#a78bfa",
      spark: tokSeries,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round">
          <rect x="2" y="2" width="14" height="14" rx="3"/>
          <line x1="6" y1="7" x2="12" y2="7" opacity="0.4"/>
          <line x1="6" y1="11" x2="10" y2="11" opacity="0.4"/>
        </svg>
      ),
    },
    {
      label: "Est. Cost (month)",
      value: `$${kpis.cost.this_month.toFixed(4)}`,
      change: null,
      color: "#f59e0b",
      spark: reqSeries,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="9" cy="9" r="7"/><path d="M9 5v8M6 7h4.5a1.5 1.5 0 010 3H6" opacity="0.6"/>
        </svg>
      ),
    },
    {
      label: "Top Feature",
      value: topFeature ? topFeature.feature.charAt(0).toUpperCase() + topFeature.feature.slice(1) : "—",
      change: topFeature ? { label: `${topFeature.pct}% tokens`, up: true } : null,
      color: topFeature ? (FEATURE_COLORS[topFeature.feature] ?? "#c9a55c") : "#c9a55c",
      spark: tokSeries,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ec4899" strokeWidth="1.3" strokeLinecap="round">
          <rect x="2" y="3" width="14" height="12" rx="2"/>
          <line x1="6" y1="7" x2="12" y2="7" opacity="0.4"/>
          <line x1="6" y1="10" x2="10" y2="10" opacity="0.4"/>
          <polyline points="10,12 12,14 16,9" opacity="0.6"/>
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: T.font.serif, fontSize: 28, color: T.text.primary, marginBottom: 4 }}>Overview</h2>
        <p style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim }}>Platform metrics — last 30 days</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {CARDS.map((card, i) => (
          <StatCard key={i} stat={card} />
        ))}
      </div>

      {planRequests.length > 0 && (
        <div style={{ marginTop: 24, background: T.bg.card, border: `1px solid ${T.border.card}`, borderRadius: T.radius.lg, padding: "24px 28px" }}>
          <div style={{ fontFamily: T.font.sans, fontSize: 14, fontWeight: 600, color: T.text.primary, marginBottom: 18 }}>
            Yêu cầu nâng cấp gói ({planRequests.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {planRequests.map((r) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
                padding: "14px 16px", borderRadius: T.radius.sm,
                background: "rgba(201,165,92,0.05)", border: "1px solid rgba(201,165,92,0.15)",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.font.sans, fontSize: 13, fontWeight: 600, color: T.text.primary }}>
                    {r.user_name} <span style={{ color: T.text.dim, fontWeight: 400 }}>({r.user_email})</span>
                  </div>
                  <div style={{ fontFamily: T.font.mono, fontSize: 11, color: T.accent, marginTop: 3 }}>
                    → Nâng cấp lên <strong>{r.requested_plan.toUpperCase()}</strong>
                  </div>
                  {r.message && (
                    <div style={{ fontFamily: T.font.sans, fontSize: 12, color: "#8892a8", marginTop: 4, fontStyle: "italic" as const }}>
                      &ldquo;{r.message}&rdquo;
                    </div>
                  )}
                  <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.dim, marginTop: 6 }}>
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => void handleUpgrade(r)}
                    style={{
                      padding: "6px 14px", borderRadius: T.radius.sm,
                      background: "rgba(201,165,92,0.12)", border: "1px solid rgba(201,165,92,0.3)",
                      fontFamily: T.font.sans, fontSize: 11, fontWeight: 600, color: T.accent,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,165,92,0.22)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(201,165,92,0.12)"; }}
                  >
                    Nâng cấp
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDismiss(r.id)}
                    style={{
                      padding: "6px 14px", borderRadius: T.radius.sm,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      fontFamily: T.font.sans, fontSize: 11, color: T.text.dim,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = T.text.primary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = T.text.dim; }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ stat }: {
  stat: {
    label: string; value: string; change: { label: string; up: boolean } | null;
    color: string; spark: number[]; icon: React.ReactNode;
  };
}) {
  return (
    <div
      style={{
        background: T.bg.card, border: `1px solid ${T.border.card}`,
        borderRadius: T.radius.lg, padding: "20px 22px",
        display: "flex", flexDirection: "column", gap: 12,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = stat.color + "30")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border.card)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.dim, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 6 }}>
            {stat.label}
          </div>
          <div style={{ fontFamily: T.font.serif, fontSize: 30, color: T.text.primary, lineHeight: 1 }}>
            {stat.value}
          </div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: T.radius.sm, background: stat.color + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {stat.icon}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {stat.change ? (
          <span style={{ fontFamily: T.font.mono, fontSize: 11, color: stat.change.up ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", gap: 3 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill={stat.change.up ? "#22c55e" : "#ef4444"}>
              {stat.change.up ? <polygon points="5,1 9,7 1,7" /> : <polygon points="5,9 9,3 1,3" />}
            </svg>
            {stat.change.label}
          </span>
        ) : <span />}
        <Spark data={stat.spark} color={stat.color} />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: T.font.serif, fontSize: 28, color: T.text.primary, marginBottom: 4 }}>Overview</h2>
        <p style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim }}>Đang tải dữ liệu...</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: T.bg.card, border: `1px solid ${T.border.card}`, borderRadius: T.radius.lg, padding: "20px 22px", height: 120, opacity: 0.4 }} />
        ))}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div style={{ fontFamily: T.font.sans, fontSize: 14, color: "#ef4444", padding: 24 }}>
      Không thể tải dữ liệu overview. Kiểm tra lại kết nối backend.
    </div>
  );
}
