"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ShopSummary } from "@/lib/db";
import { TOOLTIP_STYLE } from "@/lib/chart-theme";

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
      <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Coverage</h3>
        <p className="text-sm text-muted">Geen data beschikbaar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Coverage</h3>
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
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
