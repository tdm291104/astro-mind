"use client";

import { useEffect, useState } from "react";

import { getAdminSources, setSourceEnabled, testSource, type AdminSource } from "@/lib/api";
import { cn } from "@/lib/utils";

function statusLabel(s: AdminSource): string {
  if (s.last_status === "ok") return "● OK";
  if (s.last_status === "error") return "● ERR";
  return "—";
}

export default function SourceManagement() {
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    void getAdminSources().then((d) => setSources(d.sources)).catch(() => setSources([]));
  }, []);

  async function toggle(key: string, enabled: boolean) {
    await setSourceEnabled(key, enabled);
    setSources((prev) => prev.map((s) => (s.key === key ? { ...s, enabled } : s)));
  }

  async function runTest(key: string) {
    setTesting(key);
    try {
      const r = await testSource(key);
      setSources((prev) =>
        prev.map((s) =>
          s.key === key
            ? { ...s, last_status: r.status, last_latency_ms: r.latency_ms, last_checked_at: r.checked_at }
            : s,
        ),
      );
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-bold">🌐 Source Management</h3>
        <button
          type="button"
          disabled
          className="font-mono text-[11.5px] text-ink-muted border border-line rounded-md px-2.5 py-1 opacity-60 cursor-not-allowed"
        >
          + Add Source
        </button>
      </div>

      {sources.map((src) => (
        <div
          key={src.key}
          className="flex items-center gap-3 rounded-lg border border-line bg-panel p-2.5 mb-1.5 last:mb-0"
        >
          <span className="text-lg w-6 text-center flex-shrink-0">{src.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold">{src.name}</div>
            <div className="font-mono text-[10.5px] text-ink-muted mt-0.5 truncate">
              {src.endpoint}
            </div>
          </div>
          <div className="flex gap-2.5 items-center flex-shrink-0">
            <span className="font-mono text-[11px] text-ink-soft">{statusLabel(src)}</span>
            <span className="font-mono text-[11px] text-ink-soft">
              {src.last_latency_ms != null ? `${src.last_latency_ms}ms` : "—"}
            </span>
            <button
              type="button"
              onClick={() => void runTest(src.key)}
              disabled={testing === src.key}
              className="font-mono text-[10.5px] text-cyan border border-cyan/20 rounded px-2 py-0.5 bg-cyan/[0.07] disabled:opacity-50"
            >
              {testing === src.key ? "…" : "Test"}
            </button>
          </div>
          <button
            type="button"
            aria-label={`toggle-${src.key}`}
            onClick={() => void toggle(src.key, !src.enabled)}
            className={cn(
              "h-5 w-9 rounded-full relative flex-shrink-0",
              src.enabled ? "bg-teal" : "bg-white/10",
            )}
          >
            <div
              className={cn(
                "absolute h-3.5 w-3.5 rounded-full bg-white top-[3px]",
                src.enabled ? "left-[19px]" : "left-[3px]",
              )}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
