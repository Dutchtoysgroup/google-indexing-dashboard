import Link from "next/link";
import { ShopSummary } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";

type Props = {
  shop: ShopSummary;
};

export function ShopCard({ shop }: Props) {
  const info = SHOP_INFO[shop.shop_id];
  const coverage =
    shop.total_urls > 0
      ? ((shop.indexed / shop.total_urls) * 100).toFixed(1)
      : "0";
  const coverageNum = parseFloat(coverage);

  let barColor = "bg-green-500";
  if (coverageNum < 50) barColor = "bg-red-500";
  else if (coverageNum < 80) barColor = "bg-yellow-500";

  return (
    <Link
      href={`/shop/${shop.shop_id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{info?.flag ?? "🌍"}</span>
          <div>
            <h3 className="font-semibold text-slate-900">
              {info?.name ?? shop.shop_id}
            </h3>
            <p className="text-xs text-slate-400">{info?.domain ?? ""}</p>
          </div>
        </div>
        <span className="text-lg font-bold text-slate-900">{coverage}%</span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${coverage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>{shop.total_urls.toLocaleString("nl-NL")} URLs</span>
        <span className="text-green-600">{shop.indexed} indexed</span>
        <span className="text-red-500">{shop.not_indexed} failed</span>
      </div>
    </Link>
  );
}
