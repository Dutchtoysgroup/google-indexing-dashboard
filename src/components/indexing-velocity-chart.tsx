"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DailySnapshot } from "@/lib/db";

type Props = {
  data: DailySnapshot[];
};

export function IndexingVelocityChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Indexering Snelheid</h3>
        <p className="text-sm text-muted">Minimaal 2 dagen data nodig.</p>
      </div>
    );
  }

  const chartData = data.slice(1).map((d, i) => ({
    date: new Date(d.date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
    }),
    delta: d.indexed_count - data[i].indexed_count,
  }));

  const maxDelta = Math.max(...chartData.map((d) => d.delta));
  const minDelta = Math.min(...chartData.map((d) => d.delta));

  return (
    <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Indexering Snelheid</h3>
        <span className="text-xs text-muted">Dagelijkse verandering in geindexeerde URLs</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B8E23" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6B8E23" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--chart-axis)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--chart-axis)" />
          <Tooltip
            formatter={(value) => [`${Number(value) > 0 ? "+" : ""}${value}`, "URLs"]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid var(--chart-grid)",
              fontSize: "13px",
              background: "var(--card)",
              color: "var(--foreground)",
            }}
          />
          <ReferenceLine y={0} stroke="var(--chart-axis)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="delta"
            stroke="#6B8E23"
            strokeWidth={2}
            fill="url(#velocityGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
