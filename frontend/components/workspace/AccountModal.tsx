"use client";

import { useEffect, useState, useRef } from "react";
import {
  changePassword, getUsage, getUserUsageHistory,
  createPlanRequest,
  type UsageSummary, type UserUsageHistory,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const PLAN_LABEL: Record<string, string> = {
  free: "Free", pro: "Pro", team: "Team",
};

const PLAN_ORDER = ["free", "pro", "team"];

const PLAN_INFO: Record<string, { tokens: string; requests: string; docs: string; color: string }> = {
  free: { tokens: "50K tokens/tháng", requests: "50 req/ngày", docs: "3 tài liệu", color: "#8892a8" },
  pro:  { tokens: "500K tokens/tháng", requests: "200 req/ngày", docs: "20 tài liệu", color: "#5b8def" },
  team: { tokens: "Không giới hạn", requests: "Không giới hạn", docs: "Không giới hạn", color: "#22c55e" },
};

const FEATURE_META: Record<string, { label: string; color: string }> = {
  chat:     { label: "Chat Agent",     color: "#c9a55c" },
  notebook: { label: "Notebook Agent", color: "#22c55e" },
  search:   { label: "Search Agent",   color: "#5b8def" },
  report:   { label: "Report Agent",   color: "#a78bfa" },
  image:    { label: "Image Agent",    color: "#06b6d4" },
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AccountModal({
  onClose,
  docsCount = 0,
  histRefreshKey,
}: {
  onClose: () => void;
  docsCount?: number;
  histRefreshKey?: number;
}) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<"account" | "usage" | "plan">("account");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [history, setHistory] = useState<UserUsageHistory | null>(null);
  const [period, setPeriod] = useState<7 | 14>(14);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [contactPlan, setContactPlan] = useState<string | null>(null);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const contactDoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void getUsage().then(setUsage).catch(() => setUsage(null));
  }, [histRefreshKey]);

  useEffect(() => {
    if (tab === "usage") {
      void getUserUsageHistory(period).then(setHistory).catch(() => setHistory(null));
    }
  }, [tab, period]);

  useEffect(() => () => { if (contactDoneRef.current) clearTimeout(contactDoneRef.current); }, []);

  const initial = (user?.display_name ?? user?.email ?? "?")[0].toUpperCase();
  const totalTokens = history?.feature_usage.reduce((s, f) => s + f.tokens, 0) ?? 0;
  const estimatedCost = (totalTokens * 0.0015 / 1000).toFixed(4);
  const maxReq = Math.max(...(history?.volume.map((d) => d.requests) ?? [1]), 1);
  const maxTok = Math.max(...(history?.volume.map((d) => d.tokens) ?? [1]), 1);

  // suppress unused warning for docsCount — kept in props for API compat
  void docsCount;

  async function handleContactSubmit(planName: string) {
    setContactSending(true);
    setContactError(null);
    try {
      await createPlanRequest(planName, contactMsg);
      if (contactDoneRef.current) clearTimeout(contactDoneRef.current);
      setContactDone(true);
      setContactMsg("");
      setContactPlan(null);
      contactDoneRef.current = setTimeout(() => setContactDone(false), 3000);
    } catch {
      setContactError("Gửi thất bại. Vui lòng thử lại.");
    } finally {
      setContactSending(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0c1220",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 18,
          width: "100%", maxWidth: 700,
          maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "18px 22px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #c9a55c, #a67c42)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-space-grotesk)", fontSize: 16, fontWeight: 700,
            color: "#060a14",
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-space-grotesk)", fontSize: 15, fontWeight: 600,
              color: "#ede8df", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {user?.display_name ?? user?.email?.split("@")[0] ?? "User"}
            </div>
            <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "#c9a55c", letterSpacing: "0.05em" }}>
              {PLAN_LABEL[user?.plan ?? "free"] ?? "Free"} Plan
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#4a5568", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {(["account", "usage", "plan"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px 0",
              fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              color: tab === t ? "#c9a55c" : "#4a5568",
              background: "transparent", border: "none",
              borderBottom: tab === t ? "2px solid #c9a55c" : "2px solid transparent",
              cursor: "pointer", transition: "all 0.18s",
            }}>
              {t === "account" ? "Tài khoản" : t === "usage" ? "Usage" : "Plan"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>

          {/* ── ACCOUNT TAB ── */}
          {tab === "account" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Row label="Email" value={user?.email ?? "—"} />
                <Row label="Tên hiển thị" value={user?.display_name ?? "—"} />
                <Row label="Vai trò" value={user?.role === "admin" ? "Admin" : "User"} />
                <Row label="Trạng thái" value={user?.status === "active" ? "Hoạt động" : "Bị khoá"} />
              </div>
              <button type="button" onClick={() => void logout()} style={{
                width: "100%", padding: "10px 0", borderRadius: 9, marginTop: 4,
                background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                fontFamily: "var(--font-space-grotesk)", fontSize: 13,
                color: "#f87171", cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}>
                Đăng xuất
              </button>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12 }}>
                  Đổi mật khẩu
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["pwCurrent", "pwNew", "pwConfirm"] as const).map((field) => {
                    const labels = { pwCurrent: "Mật khẩu hiện tại", pwNew: "Mật khẩu mới", pwConfirm: "Xác nhận mới" };
                    const values = { pwCurrent, pwNew, pwConfirm };
                    const setters = { pwCurrent: setPwCurrent, pwNew: setPwNew, pwConfirm: setPwConfirm };
                    return (
                      <input key={field} type="password" placeholder={labels[field]} value={values[field]}
                        onChange={(e) => { setters[field](e.target.value); setPwStatus(null); }}
                        style={{
                          padding: "9px 11px", borderRadius: 8,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                          fontFamily: "var(--font-space-grotesk)", fontSize: 12,
                          color: "#ede8df", outline: "none",
                          gridColumn: field === "pwCurrent" ? "1 / -1" : undefined,
                        }}
                      />
                    );
                  })}
                </div>
                {pwStatus && (
                  <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 11, marginTop: 6, color: pwStatus.ok ? "#22c55e" : "#f87171" }}>
                    {pwStatus.msg}
                  </div>
                )}
                <button type="button" disabled={pwSaving} onClick={async () => {
                  if (!pwCurrent || !pwNew || !pwConfirm) { setPwStatus({ ok: false, msg: "Vui lòng điền đầy đủ." }); return; }
                  if (pwNew !== pwConfirm) { setPwStatus({ ok: false, msg: "Mật khẩu mới không khớp." }); return; }
                  if (pwNew.length < 8) { setPwStatus({ ok: false, msg: "Mật khẩu mới phải có ít nhất 8 ký tự." }); return; }
                  setPwSaving(true);
                  try {
                    await changePassword(pwCurrent, pwNew);
                    setPwStatus({ ok: true, msg: "Đổi mật khẩu thành công." });
                    setPwCurrent(""); setPwNew(""); setPwConfirm("");
                  } catch { setPwStatus({ ok: false, msg: "Mật khẩu hiện tại không đúng." }); }
                  finally { setPwSaving(false); }
                }} style={{
                  width: "100%", padding: "9px 0", borderRadius: 8, marginTop: 10,
                  background: pwSaving ? "rgba(201,165,92,0.3)" : "rgba(201,165,92,0.12)",
                  border: "1px solid rgba(201,165,92,0.25)",
                  fontFamily: "var(--font-space-grotesk)", fontSize: 12, fontWeight: 600,
                  color: "#c9a55c", cursor: pwSaving ? "not-allowed" : "pointer", transition: "all 0.15s",
                }}>
                  {pwSaving ? "Đang lưu..." : "Đổi mật khẩu"}
                </button>
              </div>
            </div>
          )}

          {/* ── USAGE TAB ── */}
          {tab === "usage" && (
            <div>
              {/* Period toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 14, fontWeight: 600, color: "#ede8df" }}>
                  Hoạt động của bạn
                </span>
                <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 3 }}>
                  {([7, 14] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setPeriod(p)} style={{
                      fontFamily: "var(--font-jetbrains-mono)", fontSize: 10,
                      color: period === p ? "#060a14" : "#4a5568",
                      background: period === p ? "#c9a55c" : "transparent",
                      border: "none", borderRadius: 6, padding: "4px 12px",
                      cursor: "pointer", transition: "all 0.2s",
                    }}>
                      {p}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily activity bar chart */}
              <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 600, color: "#ede8df" }}>Daily Activity</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[{ color: "#5b8def", label: "Requests" }, { color: "#c9a55c", label: "Tokens" }].map(({ color, label }) => (
                      <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#4a5568" }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: color, display: "inline-block" }} />{label}
                      </span>
                    ))}
                  </div>
                </div>
                {!history ? (
                  <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "#4a5568" }}>Đang tải...</div>
                ) : history.volume.every((d) => d.requests === 0) ? (
                  <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "#4a5568" }}>Chưa có hoạt động trong khoảng thời gian này</div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 130 }}>
                    {history.volume.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 110, width: "100%" }}>
                          <div style={{ flex: 1, borderRadius: "3px 3px 0 0", background: "linear-gradient(180deg,#5b8def,#5b8def60)", height: `${(d.requests / maxReq) * 100}%`, minHeight: d.requests > 0 ? 4 : 0, transition: "height 0.5s" }} />
                          <div style={{ flex: 1, borderRadius: "3px 3px 0 0", background: "linear-gradient(180deg,#c9a55c,#c9a55c60)", height: `${(d.tokens / maxTok) * 100}%`, minHeight: d.tokens > 0 ? 4 : 0, transition: "height 0.5s" }} />
                        </div>
                        <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 8, color: "#4a5568", whiteSpace: "nowrap" as const }}>
                          {fmtDay(d.day).split(" ")[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature distribution + cost */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Feature breakdown */}
                <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px" }}>
                  <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 600, color: "#ede8df", display: "block", marginBottom: 16 }}>Feature Usage</span>
                  {!history || history.feature_usage.length === 0 ? (
                    <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#4a5568" }}>Chưa có dữ liệu</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {history.feature_usage.map((f) => {
                        const meta = FEATURE_META[f.feature] ?? { label: f.feature, color: "#c9a55c" };
                        return (
                          <div key={f.feature}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#ede8df", display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, display: "inline-block" }} />{meta.label}
                              </span>
                              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: meta.color }}>{f.pct}%</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                              <div style={{ height: "100%", borderRadius: 2, background: meta.color, width: `${f.pct}%`, transition: "width 0.6s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cost estimate */}
                <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 600, color: "#ede8df", display: "block", marginBottom: 14 }}>Chi phí ước tính</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 32, color: "#c9a55c", marginBottom: 4 }}>
                      ~${estimatedCost}
                    </div>
                    <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#8892a8", marginBottom: 14 }}>
                      {fmtTokens(totalTokens)} tokens ({period}d)
                    </div>
                    <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#4a5568" }}>
                      Ước tính $1.50/1M tokens (blended rate)
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                    <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 11, color: "#8892a8", marginBottom: 3 }}>Tokens tháng này</div>
                    <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 13, color: "#ede8df" }}>
                      {usage ? fmtTokens(usage.tokens.used) : "—"}
                      {usage?.tokens.limit && <span style={{ color: "#4a5568" }}> / {fmtTokens(usage.tokens.limit)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PLAN TAB ── */}
          {tab === "plan" && (
            <div>
              {contactDone && (
                <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 10, fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "#22c55e" }}>
                  Đã gửi yêu cầu! Admin sẽ liên hệ với bạn sớm.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                {PLAN_ORDER.map((planKey) => {
                  const info = PLAN_INFO[planKey];
                  const isCurrent = user?.plan === planKey;
                  const isHigher = PLAN_ORDER.indexOf(planKey) > PLAN_ORDER.indexOf(user?.plan ?? "free");
                  const isContacting = contactPlan === planKey;
                  return (
                    <div key={planKey} style={{
                      background: isCurrent ? "rgba(201,165,92,0.06)" : "rgba(15,23,42,0.6)",
                      border: isCurrent ? "1px solid rgba(201,165,92,0.3)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14, padding: "18px 16px",
                      display: "flex", flexDirection: "column", gap: 10,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 15, fontWeight: 700, color: info.color }}>
                          {PLAN_LABEL[planKey]}
                        </div>
                        {isCurrent && (
                          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 8, color: "#c9a55c", background: "rgba(201,165,92,0.15)", borderRadius: 4, padding: "2px 6px", letterSpacing: "0.05em" }}>
                            ĐANG DÙNG
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {[info.tokens, info.requests, info.docs].map((line, i) => (
                          <div key={i} style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 11, color: "#8892a8", display: "flex", gap: 5, alignItems: "center" }}>
                            <span style={{ color: info.color, fontSize: 8 }}>◆</span>{line}
                          </div>
                        ))}
                      </div>

                      {isHigher && !isContacting && (
                        <button type="button" onClick={() => { setContactPlan(planKey); setContactMsg(""); }} style={{
                          marginTop: 4, padding: "8px 0", borderRadius: 8,
                          background: `${info.color}14`, border: `1px solid ${info.color}30`,
                          fontFamily: "var(--font-space-grotesk)", fontSize: 11, fontWeight: 600,
                          color: info.color, cursor: "pointer", transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `${info.color}22`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = `${info.color}14`; }}>
                          Liên hệ nâng cấp
                        </button>
                      )}

                      {isHigher && isContacting && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                          <textarea
                            rows={2} placeholder="Ghi chú (tùy chọn)"
                            value={contactMsg} onChange={(e) => setContactMsg(e.target.value)}
                            style={{
                              padding: "8px 10px", borderRadius: 7, resize: "none" as const,
                              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                              fontFamily: "var(--font-space-grotesk)", fontSize: 11,
                              color: "#ede8df", outline: "none",
                            }}
                          />
                          {contactError && (
                            <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 11, color: "#f87171", marginBottom: 4 }}>
                              {contactError}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" onClick={() => void handleContactSubmit(planKey)} disabled={contactSending} style={{
                              flex: 1, padding: "7px 0", borderRadius: 7,
                              background: contactSending ? "rgba(201,165,92,0.3)" : `${info.color}14`,
                              border: `1px solid ${info.color}30`,
                              fontFamily: "var(--font-space-grotesk)", fontSize: 11, fontWeight: 600,
                              color: info.color, cursor: contactSending ? "not-allowed" : "pointer",
                            }}>
                              {contactSending ? "Đang gửi..." : "Gửi"}
                            </button>
                            <button type="button" onClick={() => setContactPlan(null)} style={{
                              flex: 1, padding: "7px 0", borderRadius: 7,
                              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                              fontFamily: "var(--font-space-grotesk)", fontSize: 11,
                              color: "#4a5568", cursor: "pointer",
                            }}>
                              Huỷ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#8892a8" }}>
                Để nâng cấp gói, bấm &quot;Liên hệ nâng cấp&quot; và admin sẽ xem xét và xử lý yêu cầu của bạn thủ công.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "#ede8df" }}>{value}</span>
    </div>
  );
}
