import { getDb } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";

export type ReportShopRow = {
  shop_id: string;
  inspections_since: number;
  pushes_since: number;
  indexed_delta: number;         // huidig - snapshot bij 'since' (0 als geen baseline)
  indexed_now: number;
  total_now: number;
};

export type ReportTopIssue = {
  coverage_state: string;
  count: number;
};

export type ReportPushedUrl = {
  shop_id: string;
  url: string;
  verdict: string | null;
  last_pushed: string | null;
};

export type Report = {
  generatedAt: string;           // ISO
  sinceIso: string;              // ISO - het venster begin
  humanSince: string;            // NL tekst voor in mail
  totals: {
    total_urls: number;
    indexed: number;
    coverage_pct: number;
    inspections_since: number;
    pushes_since: number;
    indexed_delta: number;
  };
  shops: ReportShopRow[];
  topIssues: ReportTopIssue[];
  recentPushes: ReportPushedUrl[];
};

export async function buildReport(since: Date | null): Promise<Report> {
  const sql = getDb();
  const now = new Date();
  // Default venster: laatste 24u
  const sinceDate = since ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sinceIso = sinceDate.toISOString();

  // ─── Totals nu ───
  const totalsRows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE verdict = 'PASS')::int AS indexed
    FROM urls
    WHERE removed_from_sitemap = FALSE
  `;
  const total_urls = (totalsRows[0]?.total as number) ?? 0;
  const indexed = (totalsRows[0]?.indexed as number) ?? 0;
  const coverage_pct = total_urls > 0 ? +((indexed / total_urls) * 100).toFixed(1) : 0;

  // ─── API activiteit sinds 'since' ───
  const apiRows = await sql`
    SELECT
      shop_id,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'inspection'), 0)::int AS inspections,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'indexing'),   0)::int AS pushes
    FROM api_log
    WHERE created_at >= ${sinceIso}
    GROUP BY shop_id
  `;
  const apiByShop = new Map<string, { inspections: number; pushes: number }>();
  let totalInspections = 0, totalPushes = 0;
  for (const r of apiRows as Array<{ shop_id: string; inspections: number; pushes: number }>) {
    apiByShop.set(r.shop_id, { inspections: r.inspections, pushes: r.pushes });
    totalInspections += r.inspections;
    totalPushes += r.pushes;
  }

  // ─── Huidige stand per shop ───
  const nowRows = await sql`
    SELECT shop_id,
           COUNT(*)::int AS total_now,
           COUNT(*) FILTER (WHERE verdict = 'PASS')::int AS indexed_now
    FROM urls
    WHERE removed_from_sitemap = FALSE
    GROUP BY shop_id
  `;
  const nowByShop = new Map<string, { total_now: number; indexed_now: number }>();
  for (const r of nowRows as Array<{ shop_id: string; total_now: number; indexed_now: number }>) {
    nowByShop.set(r.shop_id, { total_now: r.total_now, indexed_now: r.indexed_now });
  }

  // ─── Baseline indexed per shop: laatste snapshot voor 'since' ───
  const sinceDateOnly = sinceIso.slice(0, 10);
  const baselineRows = await sql`
    SELECT DISTINCT ON (shop_id)
      shop_id, indexed_count
    FROM daily_snapshots
    WHERE date <= ${sinceDateOnly}::date
    ORDER BY shop_id, date DESC
  `;
  const baselineByShop = new Map<string, number>();
  for (const r of baselineRows as Array<{ shop_id: string; indexed_count: number }>) {
    baselineByShop.set(r.shop_id, r.indexed_count);
  }
  let totalIndexedDelta = 0;
  const shopIds = Object.keys(SHOP_INFO);
  const shops: ReportShopRow[] = shopIds.map((shop_id) => {
    const api = apiByShop.get(shop_id) || { inspections: 0, pushes: 0 };
    const curr = nowByShop.get(shop_id) || { total_now: 0, indexed_now: 0 };
    const base = baselineByShop.get(shop_id);
    const delta = base !== undefined ? curr.indexed_now - base : 0;
    totalIndexedDelta += delta;
    return {
      shop_id,
      inspections_since: api.inspections,
      pushes_since: api.pushes,
      indexed_delta: delta,
      indexed_now: curr.indexed_now,
      total_now: curr.total_now,
    };
  }).sort((a, b) =>
    (b.inspections_since + b.pushes_since) - (a.inspections_since + a.pushes_since)
  );

  // ─── Top issues (coverage states bij FAIL) ───
  const issuesRows = await sql`
    SELECT
      COALESCE(coverage_state, 'Onbekend') AS coverage_state,
      COUNT(*)::int AS count
    FROM urls
    WHERE verdict IS NOT NULL AND verdict != 'PASS'
      AND removed_from_sitemap = FALSE
    GROUP BY coverage_state
    ORDER BY count DESC
    LIMIT 5
  `;
  const topIssues = issuesRows as ReportTopIssue[];

  // ─── Recent gepushte URLs (sinds venster) ───
  const pushedRows = await sql`
    SELECT shop_id, url, verdict, last_pushed::text
    FROM urls
    WHERE last_pushed IS NOT NULL
      AND last_pushed >= ${sinceIso}
      AND removed_from_sitemap = FALSE
    ORDER BY last_pushed DESC
    LIMIT 10
  `;
  const recentPushes = pushedRows as ReportPushedUrl[];

  // Human-readable "since" (NL tijd, relatief)
  const diffMs = now.getTime() - sinceDate.getTime();
  const diffH = Math.round(diffMs / 3_600_000);
  const humanSince =
    diffH < 36 ? `afgelopen ${diffH} uur` : `afgelopen ${Math.round(diffH / 24)} dagen`;

  return {
    generatedAt: now.toISOString(),
    sinceIso,
    humanSince,
    totals: {
      total_urls,
      indexed,
      coverage_pct,
      inspections_since: totalInspections,
      pushes_since: totalPushes,
      indexed_delta: totalIndexedDelta,
    },
    shops,
    topIssues,
    recentPushes,
  };
}
