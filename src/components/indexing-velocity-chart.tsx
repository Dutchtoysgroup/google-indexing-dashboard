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
      <div className="rounded-xl border border-exit-border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Indexering Snelheid</h3>
        <p className="text-sm text-slate-400">Minimaal 2 dagen data nodig.</p>
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
    <div className="rounded-xl border border-exit-border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Indexering Snelheid</h3>
        <span className="text-xs text-slate-400">Dagelijkse verandering in geindexeerde URLs</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B8E23" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6B8E23" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8D4" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip
            formatter={(value) => [`${Number(value) > 0 ? "+" : ""}${value}`, "URLs"]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #E2E8D4",
              fontSize: "13px",
            }}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
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
