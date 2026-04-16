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
      <span className="inline-flex items-center rounded-full bg-exit-green-100 px-2 py-0.5 text-xs font-medium text-exit-green-dark">
        Push
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      Inspection
    </span>
  );
}

export function ActivityFeed({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-exit-border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recente activiteit</h3>
        <p className="text-sm text-slate-400">Nog geen API activiteit gelogd.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-exit-border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Recente activiteit</h3>
      <div className="max-h-[380px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
        {entries.map((entry) => {
          const info = SHOP_INFO[entry.shop_id];
          return (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-exit-border/50 px-3 py-2 transition-colors duration-150 hover:bg-exit-green-50"
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
              <span className="text-sm font-semibold text-foreground">
                {entry.url_count} URL{entry.url_count !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
