"use client";

import { useState } from "react";
import { ShopSummary, DailySnapshot } from "@/lib/db";
import { StaggerContainer, StaggerItem } from "./motion";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  shops: ShopSummary[];
  snapshots?: DailySnapshot[];
};

export function StatsOverview({ shops, snapshots = [] }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totals = shops.reduce(
    (acc, s) => ({
      total: acc.total + s.total_urls,
      indexed: acc.indexed + s.indexed,
      notIndexed: acc.notIndexed + s.not_indexed,
      unknown: acc.unknown + s.not_checked,
    }),
    { total: 0, indexed: 0, notIndexed: 0, unknown: 0 }
  );

  const coverage =
    totals.total > 0
      ? ((totals.indexed / totals.total) * 100).toFixed(1)
      : "0";

  const stats = [
    { label: "Totaal URLs", value: totals.total.toLocaleString("nl-NL"), color: "text-foreground", key: "total" },
    { label: "Geindexeerd", value: totals.indexed.toLocaleString("nl-NL"), color: "text-green-600", key: "indexed" },
    { label: "Niet geindexeerd", value: totals.notIndexed.toLocaleString("nl-NL"), color: "text-red-500", key: "notIndexed" },
    { label: "Niet gecheckt", value: totals.unknown.toLocaleString("nl-NL"), color: "text-yellow-600", key: "unknown" },
    { label: "Coverage", value: `${coverage}%`, color: "text-exit-green", key: "coverage" },
  ];

  const trendData = snapshots.map((d) => ({
    date: new Date(d.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    total: d.indexed_count + d.not_indexed_count + d.unknown_count,
    indexed: d.indexed_count,
    notIndexed: d.not_indexed_count,
    unknown: d.unknown_count,
    coverage: (d.indexed_count + d.not_indexed_count + d.unknown_count) > 0
      ? Math.round((d.indexed_count / (d.indexed_count + d.not_indexed_count + d.unknown_count)) * 1000) / 10
      : 0,
  }));

  const pieData = [
    { name: "Geindexeerd", value: totals.indexed, color: "#22c55e" },
    { name: "Niet geindexeerd", value: totals.notIndexed, color: "#ef4444" },
    { name: "Niet gecheckt", value: totals.unknown, color: "#eab308" },
  ].filter((d) => d.value > 0);

  function getChartForKey(key: string) {
    if (trendData.length < 2) return <p className="text-xs text-slate-400 p-4">Minimaal 2 dagen data nodig.</p>;

    const chartConfig: Record<string, { dataKey: string; color: string; label: string }> = {
      total: { dataKey: "total", color: "#1a2e05", label: "Totaal URLs" },
      indexed: { dataKey: "indexed", color: "#22c55e", label: "Geindexeerd" },
      notIndexed: { dataKey: "notIndexed", color: "#ef4444", label: "Niet geindexeerd" },
      unknown: { dataKey: "unknown", color: "#eab308", label: "Niet gecheckt" },
      coverage: { dataKey: "coverage", color: "#6B8E23", label: "Coverage %" },
    };

    const cfg = chartConfig[key];
    if (!cfg) return null;

    if (key === "coverage") {
      return (
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={trendData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[0, 100]} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: "6px", border: "1px solid #E2E8D4", fontSize: "12px" }} />
                <Area type="monotone" dataKey={cfg.dataKey} stroke={cfg.color} fill={cfg.color} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => Number(v).toLocaleString("nl-NL")} contentStyle={{ borderRadius: "6px", border: "1px solid #E2E8D4", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={trendData}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid #E2E8D4", fontSize: "12px" }} />
          <Area type="monotone" dataKey={cfg.dataKey} stroke={cfg.color} fill={cfg.color} fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div>
      <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <StaggerItem key={stat.label}>
            <div
              onClick={() => setExpanded(expanded === stat.key ? null : stat.key)}
              className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                expanded === stat.key
                  ? "border-exit-green ring-1 ring-exit-green/30"
                  : "border-exit-border hover:border-exit-green-200"
              }`}
            >
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-exit-border bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-slate-500">
                {stats.find((s) => s.key === expanded)?.label} — 30 dagen trend
              </p>
              {getChartForKey(expanded)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
