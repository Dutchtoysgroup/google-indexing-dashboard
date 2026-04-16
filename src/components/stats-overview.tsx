"use client";

import { ShopSummary } from "@/lib/db";
import { StaggerContainer, StaggerItem } from "./motion";

type Props = {
  shops: ShopSummary[];
};

export function StatsOverview({ shops }: Props) {
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
    { label: "Totaal URLs", value: totals.total.toLocaleString("nl-NL"), color: "text-foreground" },
    { label: "Geindexeerd", value: totals.indexed.toLocaleString("nl-NL"), color: "text-green-600" },
    { label: "Niet geindexeerd", value: totals.notIndexed.toLocaleString("nl-NL"), color: "text-red-500" },
    { label: "Niet gecheckt", value: totals.unknown.toLocaleString("nl-NL"), color: "text-yellow-600" },
    { label: "Coverage", value: `${coverage}%`, color: "text-exit-green" },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <div className="rounded-xl border border-exit-border bg-white p-4 shadow-sm transition-all duration-200 hover:border-exit-green-200 hover:shadow-md">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
