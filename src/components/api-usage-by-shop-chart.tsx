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
import { ApiUsageByShop } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";
import { CHART_GRID, CHART_AXIS, TOOLTIP_STYLE } from "@/lib/chart-theme";

type Props = {
  data: ApiUsageByShop[];
};

export function ApiUsageByShopChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">API Gebruik per Shop</h3>
        <p className="text-sm text-muted">Geen data beschikbaar.</p>
      </div>
    );
  }

  const chartData = data.map((d) => {
    const info = SHOP_INFO[d.shop_id];
    return {
      shop: info ? info.name : d.shop_id,
      flag: info?.flag ?? "🌍",
      Indexeringsverzoeken: d.pushes,
      Inspections: d.inspections,
    };
  });

  return (
    <div className="rounded-xl border border-brand-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">API Gebruik per Shop</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis
            dataKey="flag"
            tick={{ fontSize: 14 }}
            stroke={CHART_AXIS}
            interval={0}
            height={30}
          />
          <YAxis tick={{ fontSize: 11 }} stroke={CHART_AXIS} />
          <Tooltip
            labelFormatter={(_, payload) => {
              if (payload && payload.length > 0) {
                const item = payload[0].payload;
                return `${item.flag} ${item.shop}`;
              }
              return "";
            }}
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend />
          <Bar dataKey="Inspections" stackId="a" fill="#f68d2e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Indexeringsverzoeken" stackId="a" fill="#6B8E23" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
