import { TodayUsage } from "@/lib/db";

type Props = {
  usage: TodayUsage;
  dailyLimit?: number;
};

export function PushStats({ usage, dailyLimit = 200 }: Props) {
  const usagePercent = dailyLimit > 0
    ? Math.min(100, (usage.indexing_today / dailyLimit) * 100)
    : 0;

  let barColor = "bg-purple-500";
  if (usagePercent >= 90) barColor = "bg-red-500";
  else if (usagePercent >= 70) barColor = "bg-yellow-500";

  const stats = [
    {
      label: "Pushes vandaag",
      value: `${usage.indexing_today} / ${dailyLimit}`,
      color: "text-purple-600",
      sub: (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barColor} transition-all`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      ),
    },
    {
      label: "Inspections vandaag",
      value: usage.inspection_today.toLocaleString("nl-NL"),
      color: "text-cyan-600",
    },
    {
      label: "Pushes deze week",
      value: usage.indexing_week.toLocaleString("nl-NL"),
      color: "text-purple-600",
    },
    {
      label: "Pushes deze maand",
      value: usage.indexing_month.toLocaleString("nl-NL"),
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-sm text-slate-500">{stat.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>
            {stat.value}
          </p>
          {"sub" in stat && stat.sub}
        </div>
      ))}
    </div>
  );
}
