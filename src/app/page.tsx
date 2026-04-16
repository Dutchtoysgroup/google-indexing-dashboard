import { getAllShopsSummary, getAllSnapshots, getTodayApiUsage, getApiDailySummary, getApiLog } from "@/lib/db";
import { StatsOverview } from "@/components/stats-overview";
import { ShopCard } from "@/components/shop-card";
import { TrendChart } from "@/components/trend-chart";
import { PushStats } from "@/components/push-stats";
import { ActivityChart } from "@/components/activity-chart";
import { ActivityFeed } from "@/components/activity-feed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let shops;
  let snapshots;
  let todayUsage;
  let apiDailySummary;
  let recentActivity;

  try {
    [shops, snapshots, todayUsage, apiDailySummary, recentActivity] = await Promise.all([
      getAllShopsSummary(),
      getAllSnapshots(30),
      getTodayApiUsage(),
      getApiDailySummary(30),
      getApiLog(14),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-slate-900">
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
        <h2 className="text-xl font-semibold text-slate-900">
          Nog geen data
        </h2>
        <p className="mt-2 text-slate-500">
          Voer eerst <code className="rounded bg-slate-100 px-2 py-0.5 text-sm">python cli.py scan</code> uit
          om URLs te verzamelen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StatsOverview shops={shops} />
      <TrendChart data={snapshots} title="Totale indexering trend (30 dagen)" />

      {/* Push Activiteit sectie */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">API Activiteit</h2>
        <PushStats usage={todayUsage} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ActivityChart data={apiDailySummary} />
          <ActivityFeed entries={recentActivity.slice(0, 20)} />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Webshops ({shops.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <ShopCard key={shop.shop_id} shop={shop} />
          ))}
        </div>
      </div>
    </div>
  );
}
