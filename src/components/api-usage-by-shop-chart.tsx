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

type Props = {
  data: ApiUsageByShop[];
};

export function ApiUsageByShopChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-exit-border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">API Gebruik per Shop</h3>
        <p className="text-sm text-slate-400">Geen data beschikbaar.</p>
      </div>
    );
  }

  const chartData = data.map((d) => {
    const info = SHOP_INFO[d.shop_id];
    return {
      shop: info ? `${info.flag} ${info.name}` : d.shop_id,
      Pushes: d.pushes,
      Inspections: d.inspections,
    };
  });

  return (
    <div className="rounded-xl border border-exit-border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">API Gebruik per Shop</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8D4" />
          <XAxis
            dataKey="shop"
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #E2E8D4",
              fontSize: "13px",
            }}
          />
          <Legend />
          <Bar dataKey="Pushes" stackId="a" fill="#6B8E23" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Inspections" stackId="a" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
