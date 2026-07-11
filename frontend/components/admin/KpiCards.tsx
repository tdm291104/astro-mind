import type { AdminOverview } from "@/lib/api";
import { formatTokens } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = { ok: "text-ok", amber: "text-amber", danger: "text-danger" };

function momLabel(thisMonth: number, lastMonth: number): string {
  if (lastMonth === 0) return "tháng đầu";
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  return `${pct >= 0 ? "↑ +" : "↓ "}${pct}% so với tháng trước`;
}

export default function KpiCards({ kpis }: { kpis: AdminOverview["kpis"] }) {
  const cards = [
    { icon: "👥", value: kpis.total_users.toLocaleString("en-US"), label: "Total Users",
      sub: `+${kpis.new_users_7d} tuần này`, tone: "ok" },
    { icon: "⚡", value: formatTokens(kpis.tokens.this_month), label: "Tokens This Month",
      sub: momLabel(kpis.tokens.this_month, kpis.tokens.last_month), tone: "ok" },
    { icon: "📡", value: kpis.requests.today.toLocaleString("en-US"), label: "Requests Today",
      sub: `TB ${kpis.requests.avg_7d}/ngày`, tone: "amber" },
    { icon: "💰", value: `$${kpis.cost.this_month.toFixed(2)}`, label: "API Cost (ước tính)",
      sub: `ước tính · $${kpis.cost.rate_per_1k}/1k tok`, tone: "danger" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((kpi) => (
        <div key={kpi.label} className="rounded-2xl border border-line bg-card p-5 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-8 -right-8 w-20 h-20 rounded-full opacity-[0.06] bg-cyan" />
          <div className="kpi-icon text-xl mb-2.5">{kpi.icon}</div>
          <div className="font-display text-[28px] font-extrabold text-ink leading-none mb-1">{kpi.value}</div>
          <div className="text-xs text-ink-soft mb-1.5">{kpi.label}</div>
          <div className={cn("font-mono text-[11px]", toneClass[kpi.tone])}>{kpi.sub}</div>
        </div>
      ))}
    </div>
  );
}
