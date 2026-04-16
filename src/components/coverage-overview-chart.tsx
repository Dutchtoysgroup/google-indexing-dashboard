"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type Props = {
  indexed: number;
  notIndexed: number;
  notChecked: number;
};

const COLORS = {
  Geindexeerd: "#22c55e",
  "Niet geindexeerd": "#ef4444",
  "Niet gecheckt": "#eab308",
};

export function CoverageOverviewChart({ indexed, notIndexed, notChecked }: Props) {
  const total = indexed + notIndexed + notChecked;
  const coverage = total > 0 ? ((indexed / total) * 100).toFixed(1) : "0";

  const data = [
    { name: "Geindexeerd", value: indexed },
    { name: "Niet geindexeerd", value: notIndexed },
    { name: "Niet gecheckt", value: notChecked },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-exit-border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Coverage Overzicht</h3>
        <p className="text-sm text-slate-400">Geen data beschikbaar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-exit-border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Coverage Overzicht</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
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
              border: "1px solid #E2E8D4",
              fontSize: "13px",
            }}
          />
          <Legend />
          <text x="50%" y="42%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-3xl font-bold">
            {coverage}%
          </text>
          <text x="50%" y="52%" textAnchor="middle" dominantBaseline="central" className="fill-slate-400 text-xs">
            coverage
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
