import Link from "next/link";
import { Suspense } from "react";
import { getShopSummary, getShopSnapshots, getShopUrls } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";
import { CoverageChart } from "@/components/coverage-chart";
import { TrendChart } from "@/components/trend-chart";
import { UrlTable } from "@/components/url-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ page?: string; type?: string; verdict?: string }>;
};

export default async function ShopPage({ params, searchParams }: Props) {
  const { shopId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const info = SHOP_INFO[shopId];

  let summary;
  let snapshots;
  let urlData;

  try {
    [summary, snapshots, urlData] = await Promise.all([
      getShopSummary(shopId),
      getShopSnapshots(shopId, 30),
      getShopUrls(shopId, {
        type: sp.type,
        verdict: sp.verdict,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
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

      {/* Stats */}
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

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CoverageChart shop={summary} />
        <TrendChart data={snapshots} title="Trend (30 dagen)" />
      </div>

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
