"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ShopSummary } from "@/lib/db";

type Props = {
  shop: ShopSummary;
};

const COLORS = {
  Geindexeerd: "#22c55e",
  "Niet geindexeerd": "#ef4444",
  "Niet gecheckt": "#eab308",
};

export function CoverageChart({ shop }: Props) {
  const data = [
    { name: "Geindexeerd", value: shop.indexed },
    { name: "Niet geindexeerd", value: shop.not_indexed },
    { name: "Niet gecheckt", value: shop.not_checked },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Coverage</h3>
        <p className="text-sm text-slate-400">Geen data beschikbaar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Coverage</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name as keyof typeof COLORS]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => Number(value).toLocaleString("nl-NL")}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
