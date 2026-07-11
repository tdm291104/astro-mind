"use client";

import { useEffect, useState } from "react";
import { adminResetPassword, getAdminUsers, updateUser, type AdminUser } from "@/lib/api";

const T = {
  bg: { deep: "#060a14", card: "rgba(15,23,42,0.6)" },
  border: { subtle: "rgba(255,255,255,0.06)", card: "rgba(255,255,255,0.08)" },
  text: { primary: "#ede8df", secondary: "#8892a8", dim: "#4a5568", accent: "#c9a55c" },
  accent: "#c9a55c",
  font: { serif: "'Instrument Serif', Georgia, serif", sans: "'Space Grotesk', system-ui, sans-serif", mono: "'JetBrains Mono', monospace" },
  radius: { sm: 8, md: 12, lg: 16 },
};

const PLAN_COLORS: Record<string, string> = {
  free: "#4a5568", pro: "#c9a55c", team: "#5b8def",
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function fmtRelTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  useEffect(() => {
    getAdminUsers()
      .then((r) => setUsers(r.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  const thStyle: React.CSSProperties = {
    fontFamily: T.font.mono, fontSize: 10, fontWeight: 500,
    color: T.text.dim, letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "10px 14px", textAlign: "left",
    borderBottom: `1px solid ${T.border.subtle}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 14px", fontSize: 13, color: T.text.secondary,
    borderBottom: `1px solid ${T.border.subtle}`,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: T.font.serif, fontSize: 28, color: T.text.primary, marginBottom: 4 }}>Users</h2>
          <p style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim }}>
            {loading ? "Đang tải..." : `${users.length} registered users`}
          </p>
        </div>
        <button style={{
          fontFamily: T.font.sans, fontSize: 12, fontWeight: 600,
          borderRadius: T.radius.md, padding: "8px 18px",
          cursor: "pointer", border: "none",
          background: T.accent, color: T.bg.deep,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="2" x2="6" y2="10"/><line x1="2" y1="6" x2="10" y2="6"/>
          </svg>
          Invite User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border.subtle}`,
          borderRadius: T.radius.sm, padding: "8px 12px",
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={T.text.dim} strokeWidth="1.5">
            <circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="14" y2="14"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: T.font.sans, fontSize: 13, color: T.text.primary }}
          />
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: 3 }}>
          {["all", "free", "pro", "team"].map((p) => (
            <button key={p} onClick={() => setFilterPlan(p)} style={{
              fontFamily: T.font.sans, fontSize: 11, fontWeight: 500,
              color: filterPlan === p ? T.bg.deep : T.text.dim,
              background: filterPlan === p ? T.accent : "transparent",
              border: "none", borderRadius: 6, padding: "5px 14px",
              cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize" as const,
            }}>
              {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: T.bg.card, border: `1px solid ${T.border.card}`, borderRadius: T.radius.lg, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" as const, fontFamily: T.font.sans, fontSize: 13, color: T.text.dim }}>
            Đang tải danh sách người dùng...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Tokens Used</th>
                <th style={thStyle}>Last Login</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  tdStyle={tdStyle}
                  onUpdate={(updated) =>
                    setUsers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                  }
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: "center" as const, color: T.text.dim, border: "none", padding: 32 }}>
                    Không tìm thấy user nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function UserRow({
  user,
  tdStyle,
  onUpdate,
}: {
  user: AdminUser;
  tdStyle: React.CSSProperties;
  onUpdate: (u: AdminUser) => void;
}) {
  const [hov, setHov] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPw, setResetPw] = useState("");
  const [resetStatus, setResetStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [resetSaving, setResetSaving] = useState(false);

  const planColor = PLAN_COLORS[user.plan] ?? T.text.dim;
  const statusColor = user.status === "active" ? "#22c55e" : "#ef4444";

  async function toggleBan() {
    setSaving(true);
    setMenuOpen(false);
    try {
      const updated = await updateUser(user.id, {
        status: user.status === "active" ? "banned" : "active",
      });
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr
      style={{ transition: "background 0.15s", background: hov ? "rgba(255,255,255,0.02)" : "transparent", position: "relative" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setMenuOpen(false); setResetOpen(false); }}
    >
      <td style={tdStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: `linear-gradient(135deg, ${planColor}, ${T.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: T.font.sans, fontSize: 11, fontWeight: 600, color: "#060a14", flexShrink: 0,
          }}>
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text.primary }}>{user.display_name}</div>
            <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.dim }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td style={tdStyle}>
        <span style={{ fontFamily: T.font.mono, fontSize: 10, color: planColor, background: planColor + "12", padding: "2px 8px", borderRadius: 4 }}>
          {user.plan.toUpperCase()}
        </span>
      </td>
      <td style={tdStyle}>
        <span style={{ fontFamily: T.font.mono, fontSize: 10, color: user.role === "admin" ? T.accent : T.text.dim }}>
          {user.role}
        </span>
      </td>
      <td style={{ ...tdStyle, fontFamily: T.font.mono, fontSize: 12 }}>
        {fmtTokens(user.tokens_used)}
        {user.token_limit !== null && (
          <span style={{ color: T.text.dim, fontSize: 10 }}>/{fmtTokens(user.token_limit)}</span>
        )}
      </td>
      <td style={{ ...tdStyle, fontFamily: T.font.mono, fontSize: 11, color: T.text.dim }}>
        {fmtRelTime(user.last_login_at)}
      </td>
      <td style={tdStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: statusColor,
            boxShadow: user.status === "active" ? `0 0 6px ${statusColor}` : "none",
          }} />
          <span style={{ fontSize: 11, color: T.text.dim }}>{user.status}</span>
        </div>
      </td>
      <td style={{ ...tdStyle, textAlign: "right" as const, position: "relative" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            disabled={saving}
            style={{ background: "none", border: "none", cursor: "pointer", color: hov ? T.text.primary : T.text.dim, padding: "4px 6px", borderRadius: 4, transition: "color 0.15s", opacity: saving ? 0.5 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <circle cx="7" cy="3" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="11" r="1"/>
            </svg>
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: "100%", zIndex: 50,
              background: "#0e1526", border: `1px solid ${T.border.card}`,
              borderRadius: T.radius.sm, padding: "4px 0", minWidth: 160,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>
              <button
                onClick={toggleBan}
                style={{
                  width: "100%", textAlign: "left" as const, padding: "8px 14px",
                  fontFamily: T.font.sans, fontSize: 12,
                  color: user.status === "active" ? "#ef4444" : "#22c55e",
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                {user.status === "active" ? "Ban user" : "Unban user"}
              </button>
              <button
                onClick={() => { setMenuOpen(false); setResetOpen(true); setResetPw(""); setResetStatus(null); }}
                style={{
                  width: "100%", textAlign: "left" as const, padding: "8px 14px",
                  fontFamily: T.font.sans, fontSize: 12,
                  color: T.text.secondary,
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                Reset mật khẩu
              </button>
            </div>
          )}
          {resetOpen && (
            <div style={{
              position: "absolute", right: 0, top: "100%", zIndex: 60,
              background: "#0e1526", border: `1px solid ${T.border.card}`,
              borderRadius: T.radius.sm, padding: "12px 14px", minWidth: 220,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}>
              <div style={{ fontFamily: T.font.sans, fontSize: 12, color: T.text.primary, marginBottom: 8, fontWeight: 600 }}>
                Reset mật khẩu — {user.display_name}
              </div>
              <input
                type="password"
                placeholder="Mật khẩu mới (≥8 ký tự)"
                value={resetPw}
                onChange={(e) => { setResetPw(e.target.value); setResetStatus(null); }}
                style={{
                  width: "100%", boxSizing: "border-box" as const,
                  padding: "7px 9px", borderRadius: 6, marginBottom: 6,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${T.border.subtle}`,
                  fontFamily: T.font.sans, fontSize: 12, color: T.text.primary, outline: "none",
                }}
              />
              {resetStatus && (
                <div style={{ fontFamily: T.font.sans, fontSize: 11, marginBottom: 6, color: resetStatus.ok ? "#22c55e" : "#f87171" }}>
                  {resetStatus.msg}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={resetSaving}
                  onClick={async () => {
                    if (resetPw.length < 8) {
                      setResetStatus({ ok: false, msg: "Mật khẩu phải có ít nhất 8 ký tự." });
                      return;
                    }
                    setResetSaving(true);
                    try {
                      await adminResetPassword(user.id, resetPw);
                      setResetStatus({ ok: true, msg: "Đã reset thành công." });
                      setResetPw("");
                      setTimeout(() => setResetOpen(false), 1200);
                    } catch {
                      setResetStatus({ ok: false, msg: "Reset thất bại." });
                    } finally {
                      setResetSaving(false);
                    }
                  }}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 6,
                    background: "rgba(201,165,92,0.15)",
                    border: `1px solid rgba(201,165,92,0.3)`,
                    fontFamily: T.font.sans, fontSize: 11, fontWeight: 600,
                    color: T.accent, cursor: resetSaving ? "not-allowed" : "pointer",
                    opacity: resetSaving ? 0.6 : 1,
                  }}
                >
                  {resetSaving ? "..." : "Xác nhận"}
                </button>
                <button
                  onClick={() => { setResetOpen(false); setResetStatus(null); setResetPw(""); }}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 6,
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${T.border.subtle}`,
                    fontFamily: T.font.sans, fontSize: 11, color: T.text.dim, cursor: "pointer",
                  }}
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
