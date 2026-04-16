import {
  getAllShopsSummary,
  getAllSnapshots,
  getTodayApiUsage,
  getApiDailySummary,
  getApiLog,
  getCoverageStateBreakdown,
  getApiUsageByShop,
} from "@/lib/db";
import { StatsOverview } from "@/components/stats-overview";
import { ShopCard } from "@/components/shop-card";
import { TrendChart } from "@/components/trend-chart";
import { PushStats } from "@/components/push-stats";
import { ActivityChart } from "@/components/activity-chart";
import { ActivityFeed } from "@/components/activity-feed";
import { CoverageOverviewChart } from "@/components/coverage-overview-chart";
import { ShopComparisonChart } from "@/components/shop-comparison-chart";
import { IndexingVelocityChart } from "@/components/indexing-velocity-chart";
import { CoverageStateChart } from "@/components/coverage-state-chart";
import { ApiUsageByShopChart } from "@/components/api-usage-by-shop-chart";
import { FadeInUp } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let shops;
  let snapshots;
  let todayUsage;
  let apiDailySummary;
  let recentActivity;
  let coverageStates;
  let apiUsageByShop;

  try {
    [shops, snapshots, todayUsage, apiDailySummary, recentActivity, coverageStates, apiUsageByShop] =
      await Promise.all([
        getAllShopsSummary(),
        getAllSnapshots(30),
        getTodayApiUsage(),
        getApiDailySummary(30),
        getApiLog(14),
        getCoverageStateBreakdown(),
        getApiUsageByShop(30),
      ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Database niet beschikbaar
        </h2>
        <p className="mt-2 text-slate-500">
          Controleer de DATABASE_URL environment variable.
        </p>
        <p className="mt-4 text-xs text-red-400 font-mono max-w-xl mx-auto">
          {msg}
        </p>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">Nog geen data</h2>
        <p className="mt-2 text-slate-500">
          Voer eerst{" "}
          <code className="rounded bg-exit-green-50 px-2 py-0.5 text-sm">
            python cli.py scan
          </code>{" "}
          uit om URLs te verzamelen.
        </p>
      </div>
    );
  }

  // Calculate totals for coverage donut
  const totals = shops.reduce(
    (acc, s) => ({
      indexed: acc.indexed + s.indexed,
      notIndexed: acc.notIndexed + s.not_indexed,
      notChecked: acc.notChecked + s.not_checked,
    }),
    { indexed: 0, notIndexed: 0, notChecked: 0 }
  );

  return (
    <div className="space-y-8">
      {/* Section 1: Overview stats */}
      <StatsOverview shops={shops} snapshots={snapshots} />

      {/* Section 2: Trend + Coverage donut */}
      <FadeInUp delay={0.1}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendChart data={snapshots} title="Indexering trend (30 dagen)" />
          </div>
          <CoverageOverviewChart
            indexed={totals.indexed}
            notIndexed={totals.notIndexed}
            notChecked={totals.notChecked}
          />
        </div>
      </FadeInUp>

      {/* Section 3: Indexing velocity */}
      <FadeInUp delay={0.15}>
        <IndexingVelocityChart data={snapshots} />
      </FadeInUp>

      {/* Section 4: API Activity */}
      <FadeInUp delay={0.2}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">API Activiteit</h2>
          <PushStats usage={todayUsage} />
          <div className="grid gap-6 lg:grid-cols-3">
            <ActivityChart data={apiDailySummary} />
            <ApiUsageByShopChart data={apiUsageByShop} />
            <ActivityFeed entries={recentActivity.slice(0, 30)} />
          </div>
        </div>
      </FadeInUp>

      {/* Section 5: Coverage state breakdown */}
      <FadeInUp delay={0.25}>
        <CoverageStateChart data={coverageStates} />
      </FadeInUp>

      {/* Section 6: Shop comparison */}
      <FadeInUp delay={0.3}>
        <ShopComparisonChart shops={shops} />
      </FadeInUp>

      {/* Section 7: Webshops grid */}
      <FadeInUp delay={0.35}>
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Webshops ({shops.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <ShopCard key={shop.shop_id} shop={shop} />
            ))}
          </div>
        </div>
      </FadeInUp>
    </div>
  );
}
