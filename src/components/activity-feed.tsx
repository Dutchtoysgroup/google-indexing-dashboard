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
      <span className="inline-flex items-center rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-dark">
        Verzoek
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
      Inspection
    </span>
  );
}

export function ActivityFeed({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recente activiteit</h3>
        <p className="text-sm text-muted">Nog geen API activiteit gelogd.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Recente activiteit</h3>
      <div className="max-h-[380px] space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
        {entries.map((entry) => {
          const info = SHOP_INFO[entry.shop_id];
          return (
            <div
              key={entry.id}
              className="flex items-center gap-2 rounded-lg border border-brand-border/50 px-3 py-2 transition-colors duration-150 hover:bg-brand-green-50"
            >
              <span className="shrink-0 text-xs text-muted tabular-nums">
                {formatDate(entry.date)}
              </span>
              <span className="shrink-0 text-sm">{info?.flag ?? "🌍"}</span>
              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                {info?.name ?? entry.shop_id}
              </span>
              <ApiTypeBadge type={entry.api_type} />
              <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {entry.url_count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
