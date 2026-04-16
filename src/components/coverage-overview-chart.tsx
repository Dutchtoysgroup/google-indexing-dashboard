"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  indexed: number;
  notIndexed: number;
  notChecked: number;
};

const ITEMS = [
  { key: "Geindexeerd", color: "#22c55e" },
  { key: "Niet geindexeerd", color: "#ef4444" },
  { key: "Niet gecheckt", color: "#eab308" },
] as const;

export function CoverageOverviewChart({ indexed, notIndexed, notChecked }: Props) {
  const total = indexed + notIndexed + notChecked;
  const coverage = total > 0 ? ((indexed / total) * 100).toFixed(1) : "0";

  const data = [
    { name: "Geindexeerd", value: indexed, color: "#22c55e" },
    { name: "Niet geindexeerd", value: notIndexed, color: "#ef4444" },
    { name: "Niet gecheckt", value: notChecked, color: "#eab308" },
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
    <div className="rounded-xl border border-exit-border bg-white p-6 shadow-sm flex flex-col">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Coverage Overzicht</h3>

      {/* Donut with centered percentage */}
      <div className="relative flex-1 flex items-center justify-center">
        <div className="w-full" style={{ maxWidth: 220 }}>
          <ResponsiveContainer width="100%" aspect={1}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
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
            </PieChart>
          </ResponsiveContainer>
          {/* Centered text overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <span className="text-3xl font-bold text-foreground">{coverage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-slate-500">{item.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
