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
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-400">
          Nog geen trend data beschikbaar. Data verschijnt na de eerste scan.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
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
