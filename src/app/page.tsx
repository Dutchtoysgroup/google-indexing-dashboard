import { getAllShopsSummary, getAllSnapshots } from "@/lib/db";
import { StatsOverview } from "@/components/stats-overview";
import { ShopCard } from "@/components/shop-card";
import { TrendChart } from "@/components/trend-chart";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let shops;
  let snapshots;

  try {
    [shops, snapshots] = await Promise.all([
      getAllShopsSummary(),
      getAllSnapshots(30),
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
