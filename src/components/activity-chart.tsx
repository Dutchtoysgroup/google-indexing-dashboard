"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ApiDailySummary } from "@/lib/db";
import { CHART_GRID, CHART_AXIS, TOOLTIP_STYLE } from "@/lib/chart-theme";

type Props = {
  data: ApiDailySummary[];
  title?: string;
};

export function ActivityChart({ data, title = "API Activiteit (30 dagen)" }: Props) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
    }),
    Indexeringsverzoeken: d.indexing,
    Inspections: d.inspection,
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted">Nog geen API activiteit gelogd.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={CHART_AXIS} />
          <YAxis tick={{ fontSize: 12 }} stroke={CHART_AXIS} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend />
          <Bar dataKey="Inspections" stackId="a" fill="#f68d2e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Indexeringsverzoeken" stackId="a" fill="#6B8E23" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
