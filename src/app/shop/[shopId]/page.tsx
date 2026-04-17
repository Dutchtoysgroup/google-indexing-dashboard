import Link from "next/link";
import { Suspense } from "react";
import { getShopSummary, getShopSnapshots, getShopUrls, getShopExtraStats, getApiDailySummaryByShop, getRecentlyPushedUrls } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";
import { CoverageChart } from "@/components/coverage-chart";
import { TrendChart } from "@/components/trend-chart";
import { UrlTable } from "@/components/url-table";
import { ActivityChart } from "@/components/activity-chart";
import { ShopStatsOverview } from "@/components/shop-stats-overview";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ page?: string; type?: string; verdict?: string }>;
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { shopId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const info = SHOP_INFO[shopId];

  let summary;
  let snapshots;
  let urlData;
  let extraStats;
  let shopApiActivity;
  let recentPushes;

  try {
    [summary, snapshots, urlData, extraStats, shopApiActivity, recentPushes] = await Promise.all([
      getShopSummary(shopId),
      getShopSnapshots(shopId, 30),
      getShopUrls(shopId, {
        type: sp.type,
        verdict: sp.verdict,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
      getShopExtraStats(shopId),
      getApiDailySummaryByShop(shopId, 30),
      getRecentlyPushedUrls(shopId, 10),
    ]);
  } catch {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">Fout bij ophalen data.</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">Shop niet gevonden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-exit-border text-muted transition-colors hover:text-exit-green hover:border-exit-green-200"
        >
          &larr;
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{info?.flag ?? "🌍"}</span>
            <h2 className="text-xl font-semibold text-foreground">
              {info?.name ?? shopId}
            </h2>
          </div>
          <p className="text-sm text-muted">{info?.domain ?? shopId}</p>
        </div>
      </div>

      {/* Klikbare stat cards met grafieken */}
      <ShopStatsOverview
        summary={summary}
        extraStats={extraStats}
        snapshots={snapshots}
        apiActivity={shopApiActivity}
      />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CoverageChart shop={summary} />
        <TrendChart data={snapshots} title="Trend (30 dagen)" />
      </div>

      {/* API Activity Chart */}
      <ActivityChart data={shopApiActivity} title="Verzoeken & inspecties activiteit (30 dagen)" />

      {/* Recent Pushed URLs */}
      {recentPushes.length > 0 && (
        <div className="rounded-xl border border-exit-border bg-card shadow-sm">
          <div className="border-b border-exit-border p-4">
            <h3 className="font-semibold text-foreground">Recent ingediende URLs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-exit-border/50 text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ingediend op</th>
                  <th className="px-4 py-3 font-medium">Verzoeken</th>
                </tr>
              </thead>
              <tbody>
                {recentPushes.map((row) => (
                  <tr key={row.id} className="border-b border-exit-border/30 hover:bg-exit-green-50 transition-colors">
                    <td className="max-w-md truncate px-4 py-3">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-exit-green hover:underline"
                      >
                        {row.url.replace(/^https?:\/\/www\./, "")}
                      </a>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted">{row.url_type ?? "-"}</td>
                    <td className="px-4 py-3">
                      {row.verdict === "PASS" ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Indexed</span>
                      ) : row.verdict ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{row.verdict}</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDateTime(row.last_pushed)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-exit-green-100 px-2 py-0.5 text-xs font-medium text-exit-green-dark">
                        {row.push_count}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* URL Table */}
      <Suspense fallback={<div className="py-8 text-center text-muted">Laden...</div>}>
        <UrlTable
          urls={urlData.urls}
          total={urlData.total}
          page={page}
          pageSize={PAGE_SIZE}
        />
      </Suspense>
    </div>
  );
}
