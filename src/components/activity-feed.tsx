import { ApiLogEntry } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";

type Props = {
  entries: ApiLogEntry[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function ApiTypeBadge({ type }: { type: string }) {
  if (type === "indexing") {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
        Push
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">
      Inspection
    </span>
  );
}

export function ActivityFeed({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Recente activiteit</h3>
        <p className="text-sm text-slate-400">Nog geen API activiteit gelogd.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Recente activiteit</h3>
      <div className="space-y-2">
        {entries.map((entry) => {
          const info = SHOP_INFO[entry.shop_id];
          return (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 tabular-nums w-14">
                  {formatDate(entry.date)}
                </span>
                <span className="text-base">{info?.flag ?? "🌍"}</span>
                <span className="text-sm font-medium text-slate-700">
                  {info?.name ?? entry.shop_id}
                </span>
                <ApiTypeBadge type={entry.api_type} />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {entry.url_count} URL{entry.url_count !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
