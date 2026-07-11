import type { AdminOverview } from "@/lib/api";
import { formatTokens } from "@/lib/format";
import { cn } from "@/lib/utils";

const FEATURE_META: Record<string, { icon: string; color: string }> = {
  chat: { icon: "💬", color: "bg-cyan" },
  search: { icon: "🔍", color: "bg-violet" },
  notebook: { icon: "📚", color: "bg-teal" },
  report: { icon: "📊", color: "bg-amber" },
};

export default function FeatureUsage({ items }: { items: AdminOverview["feature_usage"] }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-bold">⚙️ Usage by Feature</h3>
      </div>
      {items.length === 0 && <p className="text-xs text-ink-muted">Chưa có dữ liệu sử dụng.</p>}
      {items.map((row) => {
        const meta = FEATURE_META[row.feature] ?? { icon: "•", color: "bg-cyan" };
        return (
          <div key={row.feature} className="flex items-center gap-3 py-2.5 border-b border-line/50 last:border-0">
            <span className="text-base w-5 text-center flex-shrink-0">{meta.icon}</span>
            <span className="flex-1 text-[13px] capitalize">{row.feature}</span>
            <div className="flex-[2] h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className={cn("h-full rounded-full", meta.color)} style={{ width: `${row.pct}%` }} />
            </div>
            <span className="w-9 text-right font-mono text-xs text-ink-soft">{row.pct}%</span>
            <span className="w-12 text-right font-mono text-xs text-ink-muted">{formatTokens(row.tokens)}</span>
          </div>
        );
      })}
    </div>
  );
}
