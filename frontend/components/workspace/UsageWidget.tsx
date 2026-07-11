"use client";

import { useEffect, useState } from "react";

import { getUsage, type UsageSummary } from "@/lib/api";

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function BarRow({ label, used, limit, format = String }: {
  label: string; used: number; limit: number | null; format?: (n: number) => string;
}) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-[10px] text-ink-muted">
        <span>{label}</span>
        <span>{format(used)} / {limit === null ? "∞" : format(limit)}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-panel">
        <div className={`h-full rounded-full transition-all ${limit === null ? "bg-ink-muted/40" : "bg-gradient-to-r from-cyan to-violet"}`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UsageWidget({ refreshKey }: { refreshKey: number }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  useEffect(() => {
    void getUsage().then(setUsage).catch(() => setUsage(null));
  }, [refreshKey]);

  return (
    <div className="border-t border-line p-3">
      <div className="space-y-3 rounded-xl border border-line bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {usage?.period ?? "USAGE"}
          </span>
          <span className="rounded-md bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber">
            {usage?.plan ?? "—"}
          </span>
        </div>
        {usage && (
          <>
            <BarRow label="Tokens" used={usage.tokens.used} limit={usage.tokens.limit} format={formatTokens} />
            <BarRow label="Requests" used={usage.requests.used} limit={usage.requests.limit} />
          </>
        )}
        <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan/20 to-violet/20 px-3 py-2 text-xs font-semibold text-ink transition hover:from-cyan/30 hover:to-violet/30">
          <span>⚡</span><span>Upgrade</span>
        </button>
      </div>
    </div>
  );
}
