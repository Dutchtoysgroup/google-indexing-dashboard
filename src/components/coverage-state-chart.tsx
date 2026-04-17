"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CoverageStateEntry } from "@/lib/db";
import { CHART_GRID, CHART_AXIS, TOOLTIP_STYLE } from "@/lib/chart-theme";

type Props = {
  data: CoverageStateEntry[];
};

function shortenState(state: string): string {
  return state
    .replace("Crawled - currently not indexed", "Crawled, niet geindexeerd")
    .replace("Discovered - currently not indexed", "Ontdekt, niet geindexeerd")
    .replace("URL is unknown to Google", "Onbekend bij Google")
    .replace("Page with redirect", "Redirect")
    .replace("Soft 404", "Soft 404")
    .replace("Blocked by robots.txt", "Geblokkeerd (robots.txt)")
    .replace("Not found (404)", "Niet gevonden (404)")
    .replace("Server error (5xx)", "Server error (5xx)")
    .replace("Duplicate without user-selected canonical", "Duplicaat")
    .replace("Duplicate, Google chose different canonical than user", "Dup. ander canonical")
    .replace("Alternate page with proper canonical tag", "Alternate + canonical");
}

export function CoverageStateChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Redenen Niet Geindexeerd</h3>
        <p className="text-sm text-muted">Geen data beschikbaar.</p>
      </div>
    );
  }

  const chartData = data.slice(0, 10).map((d) => ({
    reason: shortenState(d.coverage_state),
    count: d.count,
  }));

  return (
    <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Redenen Niet Geindexeerd</h3>
        <span className="text-xs text-muted">Top {chartData.length} coverage states</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 36)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke={CHART_AXIS} />
          <YAxis
            type="category"
            dataKey="reason"
            tick={{ fontSize: 11 }}
            stroke={CHART_AXIS}
            width={200}
          />
          <Tooltip
            formatter={(value) => Number(value).toLocaleString("nl-NL")}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
