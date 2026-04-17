"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { StaggerContainer, StaggerItem } from "./motion";
import {
  ShopSummary,
  ShopExtraStats,
  DailySnapshot,
  ApiDailySummary,
} from "@/lib/db";
import { CHART_AXIS, CHART_GRID, TOOLTIP_STYLE_SM } from "@/lib/chart-theme";

type Props = {
  summary: ShopSummary;
  extraStats: ShopExtraStats;
  snapshots: DailySnapshot[];
  apiActivity: ApiDailySummary[];
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ShopStatsOverview({
  summary,
  extraStats,
  snapshots,
  apiActivity,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const coverage =
    summary.total_urls > 0
      ? ((summary.indexed / summary.total_urls) * 100).toFixed(1)
      : "0";

  const indexStats = [
    { label: "Totaal", value: summary.total_urls, color: "text-foreground", key: "total" },
    { label: "Geindexeerd", value: summary.indexed, color: "text-green-600", key: "indexed" },
    { label: "Niet geindexeerd", value: summary.not_indexed, color: "text-red-500", key: "notIndexed" },
    { label: "Niet gecheckt", value: summary.not_checked, color: "text-yellow-600", key: "unknown" },
    { label: "Coverage", value: `${coverage}%`, color: "text-exit-green", key: "coverage" },
  ] as const;

  const requestStats = [
    { label: "Totale verzoeken", value: extraStats.total_pushes, color: "text-exit-green", key: "totalPushes", isText: false },
    { label: "Nooit verzoek", value: extraStats.never_pushed, color: "text-orange-500", key: "neverPushed", isText: false },
    { label: "Nooit gecheckt", value: extraStats.never_inspected, color: "text-yellow-600", key: "neverInspected", isText: false },
    { label: "Laatste verzoek", value: formatDateTime(extraStats.last_pushed), color: "text-foreground", key: "lastPushed", isText: true },
    { label: "Laatst gecheckt", value: formatDateTime(extraStats.last_inspected), color: "text-foreground", key: "lastInspected", isText: true },
  ] as const;

  const trendData = snapshots.map((d) => ({
    date: new Date(d.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    total: d.indexed_count + d.not_indexed_count + d.unknown_count,
    indexed: d.indexed_count,
    notIndexed: d.not_indexed_count,
    unknown: d.unknown_count,
    coverage:
      d.indexed_count + d.not_indexed_count + d.unknown_count > 0
        ? Math.round((d.indexed_count / (d.indexed_count + d.not_indexed_count + d.unknown_count)) * 1000) / 10
        : 0,
  }));

  const apiData = apiActivity.map((d) => ({
    date: new Date(d.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    Indexeringsverzoeken: d.indexing,
    Inspections: d.inspection,
  }));

  const pieData = [
    { name: "Geindexeerd", value: summary.indexed, color: "#22c55e" },
    { name: "Niet geindexeerd", value: summary.not_indexed, color: "#ef4444" },
    { name: "Niet gecheckt", value: summary.not_checked, color: "#eab308" },
  ].filter((d) => d.value > 0);

  function getChart(key: string) {
    const snapshotConfig: Record<string, { dataKey: string; color: string }> = {
      total: { dataKey: "total", color: "#1a2e05" },
      indexed: { dataKey: "indexed", color: "#22c55e" },
      notIndexed: { dataKey: "notIndexed", color: "#ef4444" },
      unknown: { dataKey: "unknown", color: "#eab308" },
      coverage: { dataKey: "coverage", color: "#6B8E23" },
    };

    if (snapshotConfig[key]) {
      if (trendData.length < 2) {
        return <p className="text-xs text-muted p-4">Minimaal 2 dagen data nodig.</p>;
      }
      const cfg = snapshotConfig[key];
      if (key === "coverage") {
        return (
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={CHART_AXIS} />
                  <YAxis tick={{ fontSize: 10 }} stroke={CHART_AXIS} domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={TOOLTIP_STYLE_SM} />
                  <Area type="monotone" dataKey={cfg.dataKey} stroke={cfg.color} fill={cfg.color} fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {pieData.length > 0 && (
              <div className="w-[140px] shrink-0">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => Number(v).toLocaleString("nl-NL")} contentStyle={{ ...TOOLTIP_STYLE_SM, fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={trendData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={CHART_AXIS} />
            <YAxis tick={{ fontSize: 10 }} stroke={CHART_AXIS} />
            <Tooltip contentStyle={TOOLTIP_STYLE_SM} />
            <Area type="monotone" dataKey={cfg.dataKey} stroke={cfg.color} fill={cfg.color} fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (key === "totalPushes") {
      if (apiData.length === 0) {
        return <p className="text-xs text-muted p-4">Nog geen API-activiteit gelogd.</p>;
      }
      return (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={apiData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={CHART_AXIS} />
            <YAxis tick={{ fontSize: 10 }} stroke={CHART_AXIS} />
            <Tooltip contentStyle={TOOLTIP_STYLE_SM} />
            <Bar dataKey="Indexeringsverzoeken" fill="#6B8E23" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (key === "neverPushed" || key === "neverInspected") {
      const neverCount = key === "neverPushed" ? extraStats.never_pushed : extraStats.never_inspected;
      const remaining = Math.max(0, summary.total_urls - neverCount);
      const data = [
        { name: key === "neverPushed" ? "Nog niet ingediend" : "Nog niet gecheckt", value: neverCount, color: key === "neverPushed" ? "#fb923c" : "#eab308" },
        { name: key === "neverPushed" ? "Wel ingediend" : "Wel gecheckt", value: remaining, color: "#6B8E23" },
      ].filter((d) => d.value > 0);
      if (data.length === 0) {
        return <p className="text-xs text-muted p-4">Geen data beschikbaar.</p>;
      }
      return (
        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" strokeWidth={0}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => Number(v).toLocaleString("nl-NL")} contentStyle={TOOLTIP_STYLE_SM} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (key === "lastPushed" || key === "lastInspected") {
      const dateStr = key === "lastPushed" ? extraStats.last_pushed : extraStats.last_inspected;
      if (!dateStr) return <p className="text-xs text-muted p-4">Nog nooit uitgevoerd.</p>;
      const d = new Date(dateStr);
      const daysAgo = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
      const hoursAgo = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60)));
      const label = daysAgo === 0 ? `${hoursAgo}u geleden` : `${daysAgo}d geleden`;
      return (
        <div className="flex items-center gap-4 p-2">
          <div>
            <p className="text-xs text-muted">Exact tijdstip</p>
            <p className="text-sm font-medium text-foreground">{formatDateTime(dateStr)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Relatief</p>
            <p className="text-sm font-medium text-foreground">{label}</p>
          </div>
        </div>
      );
    }

    return null;
  }

  const allStats = [...indexStats, ...requestStats];

  return (
    <div className="space-y-6">
      {/* Indexering Stats */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-foreground">Indexering</h3>
        <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {indexStats.map((stat) => (
            <StaggerItem key={stat.key}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === stat.key ? null : stat.key)}
                className={`w-full text-left cursor-pointer rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                  expanded === stat.key
                    ? "border-exit-green ring-1 ring-exit-green/30"
                    : "border-exit-border hover:border-exit-green-200"
                }`}
              >
                <p className="text-sm text-muted">{stat.label}</p>
                <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>
                  {typeof stat.value === "number" ? stat.value.toLocaleString("nl-NL") : stat.value}
                </p>
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* Indexeringsverzoeken activiteit */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-foreground">Indexeringsverzoeken activiteit</h3>
        <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {requestStats.map((stat) => (
            <StaggerItem key={stat.key}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === stat.key ? null : stat.key)}
                className={`w-full text-left cursor-pointer rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                  expanded === stat.key
                    ? "border-exit-green ring-1 ring-exit-green/30"
                    : "border-exit-border hover:border-exit-green-200"
                }`}
              >
                <p className="text-sm text-muted">{stat.label}</p>
                <p className={`mt-1 font-semibold ${stat.color} ${stat.isText ? "text-sm" : "text-2xl"}`}>
                  {typeof stat.value === "number" ? stat.value.toLocaleString("nl-NL") : stat.value}
                </p>
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-exit-border bg-card p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-muted">
                {allStats.find((s) => s.key === expanded)?.label} — detail
              </p>
              {getChart(expanded)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
