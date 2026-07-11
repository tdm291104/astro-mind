"use client";

import { useEffect, useState } from "react";
import { getAdminPlans, updatePlan, type AdminPlan } from "@/lib/api";

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

function fmtTokens(v: number | null): string {
  if (v === null) return "Unlimited";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(0) + "K";
  return String(v);
}

type FieldKey = "tokens_per_month" | "requests_per_day" | "docs_per_notebook";

const QUOTA_FIELDS: { key: FieldKey; label: string; fmt: (v: number | null) => string }[] = [
  { key: "tokens_per_month",  label: "Tokens / month",       fmt: fmtTokens },
  { key: "requests_per_day",  label: "Requests / day",        fmt: (v) => v === null ? "Unlimited" : v.toLocaleString() },
  { key: "docs_per_notebook", label: "Docs / notebook",       fmt: (v) => v === null ? "Unlimited" : v.toLocaleString() },
];

export default function AdminQuotasPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<AdminPlan>>>({});

  useEffect(() => {
    getAdminPlans()
      .then((r) => setPlans(r.plans))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function getPlanValue(plan: AdminPlan, key: FieldKey): number | null {
    const pending = pendingChanges[plan.name];
    if (pending && key in pending) return pending[key] as number | null;
    return plan[key];
  }

  function startEdit(plan: AdminPlan, key: FieldKey) {
    const val = getPlanValue(plan, key);
    setEditingCell(`${plan.name}-${key}`);
    setTempVal(val === null ? "unlimited" : String(val));
  }

  function commitEdit(planName: string, key: FieldKey) {
    const parsed = tempVal.toLowerCase() === "unlimited"
      ? null
      : parseInt(tempVal.replace(/,/g, ""), 10);
    if (parsed === null || !isNaN(parsed)) {
      setPendingChanges((prev) => ({
        ...prev,
        [planName]: { ...prev[planName], [key]: parsed },
      }));
    }
    setEditingCell(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        plans.map(async (plan) => {
          const changes = pendingChanges[plan.name];
          if (!changes) return;
          await updatePlan(plan.name, {
            tokens_per_month: getPlanValue(plan, "tokens_per_month"),
            requests_per_day: getPlanValue(plan, "requests_per_day"),
            docs_per_notebook: getPlanValue(plan, "docs_per_notebook"),
          });
        })
      );
      // Re-fetch to confirm
      const updated = await getAdminPlans();
      setPlans(updated.plans);
      setPendingChanges({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const thStyle: React.CSSProperties = {
    fontFamily: T.font.mono, fontSize: 10, fontWeight: 500,
    color: T.text.dim, letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "10px 16px", textAlign: "left",
    borderBottom: `1px solid ${T.border.subtle}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13,
    borderBottom: `1px solid ${T.border.subtle}`,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: T.font.serif, fontSize: 28, color: T.text.primary, marginBottom: 4 }}>Quota Configuration</h2>
          <p style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim }}>Set resource limits per plan — click any value to edit</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(pendingChanges).length === 0}
          style={{
            fontFamily: T.font.sans, fontSize: 12, fontWeight: 600,
            borderRadius: T.radius.md, padding: "8px 22px",
            cursor: saving || Object.keys(pendingChanges).length === 0 ? "not-allowed" : "pointer",
            border: "none",
            background: T.accent, color: "#060a14",
            display: "flex", alignItems: "center", gap: 6,
            opacity: saving || Object.keys(pendingChanges).length === 0 ? 0.6 : 1,
          }}
        >
          {saved ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3,7 6,10 11,4"/>
              </svg>
              Saved
            </>
          ) : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {loading ? (
        <div style={{ fontFamily: T.font.sans, fontSize: 13, color: T.text.dim, padding: 40, textAlign: "center" as const }}>
          Đang tải quota config...
        </div>
      ) : (
        <>
          {/* Quota table */}
          <div style={{ background: T.bg.card, border: `1px solid ${T.border.card}`, borderRadius: T.radius.lg, overflow: "hidden", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Resource</th>
                  {plans.map((plan) => (
                    <th key={plan.name} style={thStyle}>
                      <span style={{ color: PLAN_COLORS[plan.name] ?? T.text.dim }}>
                        {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {QUOTA_FIELDS.map((field) => (
                  <tr key={field.key}>
                    <td style={{ ...tdStyle, fontFamily: T.font.sans, fontWeight: 500, color: T.text.primary }}>
                      {field.label}
                    </td>
                    {plans.map((plan) => {
                      const val = getPlanValue(plan, field.key);
                      const isEditing = editingCell === `${plan.name}-${field.key}`;
                      const hasPending = !!pendingChanges[plan.name]?.[field.key] !== undefined && pendingChanges[plan.name]?.[field.key] !== plan[field.key];
                      return (
                        <td key={plan.name} style={tdStyle}>
                          {isEditing ? (
                            <input
                              autoFocus
                              value={tempVal}
                              onChange={(e) => setTempVal(e.target.value)}
                              onBlur={() => commitEdit(plan.name, field.key)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(plan.name, field.key);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              style={{
                                width: 100, fontFamily: T.font.mono, fontSize: 13,
                                color: T.text.primary, background: "rgba(201,165,92,0.08)",
                                border: `1px solid ${T.accent}40`, borderRadius: 6,
                                padding: "4px 8px", outline: "none",
                              }}
                            />
                          ) : (
                            <EditableValue
                              value={field.fmt(val)}
                              color={val === null ? "#22c55e" : T.text.primary}
                              pending={hasPending}
                              onClick={() => startEdit(plan, field.key)}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note about missing fields */}
          <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, marginBottom: 24, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={T.text.dim} strokeWidth="1.3" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="7" cy="7" r="5.5"/><line x1="7" y1="5" x2="7" y2="7.5"/><circle cx="7" cy="9.5" r="0.5" fill={T.text.dim}/>
            </svg>
            <span style={{ fontFamily: T.font.sans, fontSize: 12, color: T.text.dim }}>
              <strong style={{ color: T.text.secondary }}>Chưa có trong DB:</strong> storage limit, report generation limit, và user count per plan — cần thêm columns vào bảng <code style={{ fontFamily: T.font.mono, fontSize: 11, color: T.accent }}>plans</code> nếu muốn tracking.
            </span>
          </div>

          {/* Rate limits — static reference (not in DB) */}
          <div style={{ background: T.bg.card, border: `1px solid ${T.border.card}`, borderRadius: T.radius.lg, overflow: "hidden" }}>
            <div style={{ padding: "18px 24px 0" }}>
              <span style={{ fontFamily: T.font.sans, fontSize: 14, fontWeight: 600, color: T.text.primary }}>Rate Limits</span>
              <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.dim, marginLeft: 10 }}>(derived from quota config)</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Constraint</th>
                  {plans.map((plan) => (
                    <th key={plan.name} style={{ ...thStyle, color: PLAN_COLORS[plan.name] ?? T.text.dim }}>
                      {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, fontFamily: T.font.sans, fontWeight: 500, color: T.text.primary }}>Tokens / month</td>
                  {plans.map((p) => (
                    <td key={p.name} style={{ ...tdStyle, fontFamily: T.font.mono, fontSize: 12, color: T.text.secondary }}>
                      {fmtTokens(p.tokens_per_month)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontFamily: T.font.sans, fontWeight: 500, color: T.text.primary }}>Requests / day</td>
                  {plans.map((p) => (
                    <td key={p.name} style={{ ...tdStyle, fontFamily: T.font.mono, fontSize: 12, color: T.text.secondary }}>
                      {p.requests_per_day === null ? "Unlimited" : p.requests_per_day.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontFamily: T.font.sans, fontWeight: 500, color: T.text.primary, border: "none" }}>Docs / notebook</td>
                  {plans.map((p) => (
                    <td key={p.name} style={{ ...tdStyle, fontFamily: T.font.mono, fontSize: 12, color: T.text.secondary, border: "none" }}>
                      {p.docs_per_notebook === null ? "Unlimited" : p.docs_per_notebook.toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function EditableValue({
  value, color, pending, onClick,
}: {
  value: string; color: string; pending: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: T.font.mono, fontSize: 13, color,
        cursor: "pointer", padding: "4px 8px", borderRadius: 6,
        border: hov ? `1px solid ${T.border.card}` : `1px solid ${pending ? T.accent + "40" : "transparent"}`,
        background: hov ? "rgba(255,255,255,0.04)" : pending ? "rgba(201,165,92,0.05)" : "transparent",
        transition: "all 0.15s", display: "inline-block",
      }}
    >
      {value}
    </span>
  );
}
