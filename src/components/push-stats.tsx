"use client";

import { TodayUsage } from "@/lib/db";
import { StaggerContainer, StaggerItem } from "./motion";

type Props = {
  usage: TodayUsage;
  dailyLimit?: number;
};

export function PushStats({ usage, dailyLimit = 200 }: Props) {
  const usagePercent = dailyLimit > 0
    ? Math.min(100, (usage.indexing_today / dailyLimit) * 100)
    : 0;

  let barColor = "bg-exit-green";
  if (usagePercent >= 90) barColor = "bg-red-500";
  else if (usagePercent >= 70) barColor = "bg-yellow-500";

  const stats = [
    {
      label: "Pushes vandaag",
      value: `${usage.indexing_today} / ${dailyLimit}`,
      color: "text-exit-green",
      sub: (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-exit-green-50">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      ),
    },
    {
      label: "Inspections vandaag",
      value: usage.inspection_today.toLocaleString("nl-NL"),
      color: "text-blue-600",
    },
    {
      label: "Pushes deze week",
      value: usage.indexing_week.toLocaleString("nl-NL"),
      color: "text-exit-green",
    },
    {
      label: "Pushes deze maand",
      value: usage.indexing_month.toLocaleString("nl-NL"),
      color: "text-exit-green",
    },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <div className="rounded-xl border border-exit-border bg-white p-4 shadow-sm transition-all duration-200 hover:border-exit-green-200">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>
              {stat.value}
            </p>
            {"sub" in stat && stat.sub}
          </div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
