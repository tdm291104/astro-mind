"use client";

import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";

import type { AdminOverview } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "requests", label: "Requests" },
  { key: "tokens", label: "Tokens" },
  { key: "cost", label: "Cost" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function RequestVolumeChart({ data }: { data: AdminOverview["request_volume"] }) {
  const [tab, setTab] = useState<TabKey>("requests");
  const chartData = data.map((d) => ({ day: d.day.slice(5), value: d[tab] }));
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-sm font-bold text-ink">📈 Request Volume — Last 14 Days</div>
        <div className="flex gap-0.5 rounded-lg border border-line bg-white/[0.04] p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-current={tab === t.key ? "true" : undefined}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1 font-mono text-xs transition",
                tab === t.key ? "bg-cardhover text-cyan" : "text-ink-soft hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="day"
            tick={{ fill: "rgba(122,154,197,0.6)", fontSize: 10 }}
            interval="preserveStartEnd"
            axisLine={{ stroke: "rgba(64,120,220,0.15)" }}
            tickLine={false}
          />
          <Bar dataKey="value" fill="#38d9f5" radius={[4, 4, 0, 0]} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
