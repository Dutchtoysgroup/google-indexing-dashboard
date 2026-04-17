"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ShopSummary } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";
import { CHART_GRID, CHART_AXIS, TOOLTIP_STYLE } from "@/lib/chart-theme";

type Props = {
  shops: ShopSummary[];
};

export function ShopComparisonChart({ shops }: Props) {
  const chartData = shops
    .map((s) => {
      const pct = s.total_urls > 0 ? (s.indexed / s.total_urls) * 100 : 0;
      const info = SHOP_INFO[s.shop_id];
      return {
        shop: info ? `${info.flag} ${info.name}` : s.shop_id,
        coverage: Math.round(pct * 10) / 10,
      };
    })
    .sort((a, b) => b.coverage - a.coverage);

  function getBarColor(value: number) {
    if (value >= 80) return "#22c55e";
    if (value >= 50) return "#eab308";
    return "#ef4444";
  }

  return (
    <div className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Coverage per Webshop</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke={CHART_AXIS} unit="%" />
          <YAxis
            type="category"
            dataKey="shop"
            tick={{ fontSize: 12 }}
            stroke={CHART_AXIS}
            width={130}
          />
          <Tooltip
            formatter={(value) => `${value}%`}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="coverage" radius={[0, 6, 6, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.coverage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
