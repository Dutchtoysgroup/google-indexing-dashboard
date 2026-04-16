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
    Pushes: d.indexing,
    Inspections: d.inspection,
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-400">Nog geen API activiteit gelogd.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
            }}
          />
          <Legend />
          <Bar dataKey="Pushes" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Inspections" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
