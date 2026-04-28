"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DailySnapshot } from "@/lib/db";
import { CHART_GRID, CHART_AXIS, TOOLTIP_STYLE } from "@/lib/chart-theme";

type Props = {
  data: DailySnapshot[];
  title?: string;
};

export function TrendChart({ data, title = "Indexering trend" }: Props) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
    }),
    Geindexeerd: d.indexed_count,
    "Niet geindexeerd": d.not_indexed_count,
    Onbekend: d.unknown_count,
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted">
          Nog geen trend data beschikbaar. Data verschijnt na de eerste scan.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={CHART_AXIS} />
          <YAxis tick={{ fontSize: 12 }} stroke={CHART_AXIS} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend />
          <Area
            type="monotone"
            dataKey="Geindexeerd"
            stackId="1"
            stroke="#22c55e"
            fill="#bbf7d0"
          />
          <Area
            type="monotone"
            dataKey="Niet geindexeerd"
            stackId="1"
            stroke="#ef4444"
            fill="#fecaca"
          />
          <Area
            type="monotone"
            dataKey="Onbekend"
            stackId="1"
            stroke="#eab308"
            fill="#fef08a"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
