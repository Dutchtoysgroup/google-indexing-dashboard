import Link from "next/link";
import { Suspense } from "react";
import { getShopSummary, getShopSnapshots, getShopUrls, getShopExtraStats, getApiDailySummaryByShop, getRecentlyPushedUrls } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";
import { CoverageChart } from "@/components/coverage-chart";
import { TrendChart } from "@/components/trend-chart";
import { UrlTable } from "@/components/url-table";
import { ActivityChart } from "@/components/activity-chart";

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
        <p className="text-slate-500">Fout bij ophalen data.</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Shop niet gevonden.</p>
      </div>
    );
  }

  const coverage =
    summary.total_urls > 0
      ? ((summary.indexed / summary.total_urls) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600"
        >
          &larr;
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{info?.flag ?? "🌍"}</span>
            <h2 className="text-xl font-semibold text-slate-900">
              {info?.name ?? shopId}
            </h2>
          </div>
          <p className="text-sm text-slate-400">{info?.domain ?? shopId}</p>
        </div>
      </div>

      {/* Indexering Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Totaal", value: summary.total_urls, color: "text-slate-900" },
          { label: "Geindexeerd", value: summary.indexed, color: "text-green-600" },
          { label: "Niet geindexeerd", value: summary.not_indexed, color: "text-red-500" },
          { label: "Niet gecheckt", value: summary.not_checked, color: "text-yellow-600" },
          { label: "Coverage", value: `${coverage}%`, color: "text-blue-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${s.color}`}>
              {typeof s.value === "number"
                ? s.value.toLocaleString("nl-NL")
                : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Push Activiteit Stats */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Push activiteit</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: "Totale pushes", value: extraStats.total_pushes, color: "text-purple-600" },
            { label: "Nooit gepusht", value: extraStats.never_pushed, color: "text-orange-500" },
            { label: "Nooit gecheckt", value: extraStats.never_inspected, color: "text-yellow-600" },
            { label: "Laatst gepusht", value: formatDateTime(extraStats.last_pushed), color: "text-slate-700", isText: true },
            { label: "Laatst gecheckt", value: formatDateTime(extraStats.last_inspected), color: "text-slate-700", isText: true },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`mt-1 font-semibold ${s.color} ${"isText" in s && s.isText ? "text-sm" : "text-2xl"}`}>
                {typeof s.value === "number"
                  ? s.value.toLocaleString("nl-NL")
                  : s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CoverageChart shop={summary} />
        <TrendChart data={snapshots} title="Trend (30 dagen)" />
      </div>

      {/* API Activity Chart */}
      <ActivityChart data={shopApiActivity} title="Push & inspection activiteit (30 dagen)" />

      {/* Recent Pushed URLs */}
      {recentPushes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Recent gepushte URLs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Gepusht op</th>
                  <th className="px-4 py-3 font-medium">Pushes</th>
                </tr>
              </thead>
              <tbody>
                {recentPushes.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="max-w-md truncate px-4 py-3">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {row.url.replace(/^https?:\/\/www\./, "")}
                      </a>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-500">{row.url_type ?? "-"}</td>
                    <td className="px-4 py-3">
                      {row.verdict === "PASS" ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Indexed</span>
                      ) : row.verdict ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{row.verdict}</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDateTime(row.last_pushed)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
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
      <Suspense fallback={<div className="py-8 text-center text-slate-400">Laden...</div>}>
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
