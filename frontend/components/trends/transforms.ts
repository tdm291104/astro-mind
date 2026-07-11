import type { TimelineByMethod } from "@/lib/api";

export function areaData(byMethod: TimelineByMethod): {
  data: Record<string, number>[];
  methods: string[];
} {
  const methods = Object.keys(byMethod.series);
  const data = byMethod.years.map((year, i) => {
    const row: Record<string, number> = { year };
    for (const m of methods) {
      row[m] = byMethod.series[m][i] ?? 0;
    }
    return row;
  });
  return { data, methods };
}

export function lineData(series: Record<string, number[]>): {
  data: Record<string, number>[];
  keywords: string[];
} {
  const keywords = Object.keys(series);
  const weeks = Math.max(0, ...keywords.map((k) => series[k].length));
  const data = Array.from({ length: weeks }, (_, i) => {
    const row: Record<string, number> = { week: i };
    for (const k of keywords) {
      row[k] = series[k][i] ?? 0;
    }
    return row;
  });
  return { data, keywords };
}
