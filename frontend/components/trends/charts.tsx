"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { areaData, lineData } from "@/components/trends/transforms";
import type { TimelineByMethod, TopicRow } from "@/lib/api";

// Accent palette (cyan, violet, amber) leading, then harmonious extras.
const COLORS = ["#38d9f5", "#8b5cf6", "#f59e0b", "#00c9a7", "#f15bb5", "#4cc9f0"];

const GRID = "rgba(255,255,255,0.05)";
const AXIS_TICK = { fill: "rgba(245,240,232,0.5)", fontSize: 12 };
const AXIS_LINE = { stroke: "rgba(255,255,255,0.08)" };
const LEGEND_STYLE = { color: "rgba(245,240,232,0.7)", fontSize: 12 };

function GlassTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs text-ivory shadow-lift">
      {label != null && <p className="mb-1 font-mono text-ivory/60">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-ivory/70">{p.name}:</span>
          <span className="font-mono">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TopicsBubble({ rows }: { rows: TopicRow[] }) {
  const data = rows.map((r) => ({ ...r, growth: r.growth ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis type="number" dataKey="prev" name="trước" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
        <YAxis type="number" dataKey="recent" name="gần đây" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
        <ZAxis type="number" dataKey="growth" range={[60, 400]} name="tăng %" />
        <Tooltip cursor={{ stroke: "rgba(255,255,255,0.15)", strokeDasharray: "3 3" }} content={<GlassTooltip />} />
        <Scatter data={data} fill="#38d9f5" fillOpacity={0.7} animationDuration={900} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function TimelineArea({ byMethod }: { byMethod: TimelineByMethod }) {
  const { data, methods } = areaData(byMethod);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis dataKey="year" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
        <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={LEGEND_STYLE} />
        {methods.map((m, i) => (
          <Area
            key={m}
            type="monotone"
            dataKey={m}
            stackId="1"
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.3}
            animationDuration={900}
            animationEasing="ease-out"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function InterestLines({ series }: { series: Record<string, number[]> }) {
  const { data, keywords } = lineData(series);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis dataKey="week" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
        <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={LEGEND_STYLE} />
        {keywords.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            dot={false}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            animationDuration={900}
            animationEasing="ease-out"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
