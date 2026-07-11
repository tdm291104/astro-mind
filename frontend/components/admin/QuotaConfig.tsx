"use client";

import { useEffect, useState } from "react";

import { getAdminPlans, updatePlan, type AdminPlan } from "@/lib/api";
import { cn } from "@/lib/utils";

const tierBadge: Record<string, string> = {
  free: "text-ink-soft border-line",
  pro: "text-cyan border-cyan/25 bg-cyan/[0.08]",
  team: "text-violet border-violet/25 bg-violet/[0.08]",
};
const FIELDS = [
  { key: "tokens_per_month", lbl: "tokens / mo" },
  { key: "requests_per_day", lbl: "requests / day" },
  { key: "docs_per_notebook", lbl: "docs / notebook" },
] as const;

function show(v: number | null): string {
  return v === null ? "∞" : String(v);
}

export default function QuotaConfig() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    void getAdminPlans().then((d) => setPlans(d.plans)).catch(() => setPlans([]));
  }, []);

  function startEdit(p: AdminPlan) {
    setEditing(p.name);
    setDraft({
      tokens_per_month: p.tokens_per_month?.toString() ?? "",
      requests_per_day: p.requests_per_day?.toString() ?? "",
      docs_per_notebook: p.docs_per_notebook?.toString() ?? "",
    });
  }

  async function save(name: string) {
    const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));
    const updated = await updatePlan(name, {
      tokens_per_month: num(draft.tokens_per_month),
      requests_per_day: num(draft.requests_per_day),
      docs_per_notebook: num(draft.docs_per_notebook),
    });
    setPlans((prev) => prev.map((p) => (p.name === name ? updated : p)));
    setEditing(null);
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-bold">📊 Quota Configuration</h3>
      </div>
      {plans.map((p) => (
        <div key={p.name} className="rounded-xl border border-line bg-panel p-4 mb-2 last:mb-0">
          <div className="flex items-center justify-between mb-2.5">
            <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase", tierBadge[p.name])}>
              {p.name}
            </span>
            {editing === p.name ? (
              <button type="button" onClick={() => void save(p.name)} className="font-mono text-[11px] text-cyan border border-cyan/25 rounded-[5px] px-2 py-[3px]">
                Lưu
              </button>
            ) : (
              <button type="button" onClick={() => startEdit(p)} className="font-mono text-[11px] text-ink-muted border border-line rounded-[5px] px-2 py-[3px]">
                ✏ Edit
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="text-center">
                {editing === p.name ? (
                  <input
                    aria-label={`${f.key}-${p.name}`}
                    value={draft[f.key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    placeholder="∞"
                    className="w-full bg-card border border-line rounded px-1 py-0.5 text-center font-display text-[15px] font-bold text-ink"
                  />
                ) : (
                  <div className="font-display text-[15px] font-bold text-ink">{show(p[f.key])}</div>
                )}
                <div className="font-mono text-[10px] text-ink-muted mt-0.5">{f.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
