import { neon } from "@neondatabase/serverless";

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}

export type ShopSummary = {
  shop_id: string;
  total_urls: number;
  indexed: number;
  not_indexed: number;
  not_checked: number;
};

export type DailySnapshot = {
  date: string;
  shop_id: string;
  total_urls: number;
  indexed_count: number;
  not_indexed_count: number;
  unknown_count: number;
};

export type UrlRow = {
  id: number;
  shop_id: string;
  url: string;
  url_type: string | null;
  coverage_state: string | null;
  verdict: string | null;
  last_inspected: string | null;
  last_pushed: string | null;
  push_count: number;
};

export async function getAllShopsSummary(): Promise<ShopSummary[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      shop_id,
      COUNT(*)::int as total_urls,
      COUNT(*) FILTER (WHERE verdict = 'PASS')::int as indexed,
      COUNT(*) FILTER (WHERE verdict IS NOT NULL AND verdict != 'PASS')::int as not_indexed,
      COUNT(*) FILTER (WHERE verdict IS NULL)::int as not_checked
    FROM urls
    WHERE removed_from_sitemap = FALSE
    GROUP BY shop_id
    ORDER BY shop_id
  `;
  return rows as ShopSummary[];
}

export async function getShopSummary(shopId: string): Promise<ShopSummary | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      shop_id,
      COUNT(*)::int as total_urls,
      COUNT(*) FILTER (WHERE verdict = 'PASS')::int as indexed,
      COUNT(*) FILTER (WHERE verdict IS NOT NULL AND verdict != 'PASS')::int as not_indexed,
      COUNT(*) FILTER (WHERE verdict IS NULL)::int as not_checked
    FROM urls
    WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE
    GROUP BY shop_id
  `;
  return (rows[0] as ShopSummary) ?? null;
}

export async function getShopSnapshots(
  shopId: string,
  days: number = 30
): Promise<DailySnapshot[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT date::text, shop_id, total_urls, indexed_count, not_indexed_count, unknown_count
    FROM daily_snapshots
    WHERE shop_id = ${shopId}
      AND date >= CURRENT_DATE - make_interval(days => ${days})
    ORDER BY date ASC
  `;
  return rows as DailySnapshot[];
}

export async function getAllSnapshots(days: number = 30): Promise<DailySnapshot[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      date::text,
      'all' as shop_id,
      SUM(total_urls)::int as total_urls,
      SUM(indexed_count)::int as indexed_count,
      SUM(not_indexed_count)::int as not_indexed_count,
      SUM(unknown_count)::int as unknown_count
    FROM daily_snapshots
    WHERE date >= CURRENT_DATE - make_interval(days => ${days})
    GROUP BY date
    ORDER BY date ASC
  `;
  return rows as DailySnapshot[];
}

// ─── API Log types & queries ───────────────────────────────────

export type ApiLogEntry = {
  id: number;
  date: string;
  shop_id: string;
  api_type: string;
  url_count: number;
  created_at: string;
};

export type ApiDailySummary = {
  date: string;
  indexing: number;
  inspection: number;
};

export type TodayUsage = {
  indexing_today: number;
  inspection_today: number;
  indexing_week: number;
  indexing_month: number;
};

export type ShopExtraStats = {
  total_pushes: number;
  never_pushed: number;
  never_inspected: number;
  last_pushed: string | null;
  last_inspected: string | null;
};

export async function getApiLog(days: number = 30): Promise<ApiLogEntry[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, date::text, shop_id, api_type, url_count, created_at::text
    FROM api_log
    WHERE date >= CURRENT_DATE - make_interval(days => ${days})
    ORDER BY date DESC, created_at DESC
  `;
  return rows as ApiLogEntry[];
}

export async function getApiLogByShop(shopId: string, days: number = 30): Promise<ApiLogEntry[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, date::text, shop_id, api_type, url_count, created_at::text
    FROM api_log
    WHERE shop_id = ${shopId} AND date >= CURRENT_DATE - make_interval(days => ${days})
    ORDER BY date DESC, created_at DESC
  `;
  return rows as ApiLogEntry[];
}

export async function getApiDailySummary(days: number = 30): Promise<ApiDailySummary[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      date::text,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'indexing'), 0)::int as indexing,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'inspection'), 0)::int as inspection
    FROM api_log
    WHERE date >= CURRENT_DATE - make_interval(days => ${days})
    GROUP BY date
    ORDER BY date ASC
  `;
  return rows as ApiDailySummary[];
}

export async function getApiDailySummaryByShop(shopId: string, days: number = 30): Promise<ApiDailySummary[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      date::text,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'indexing'), 0)::int as indexing,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'inspection'), 0)::int as inspection
    FROM api_log
    WHERE shop_id = ${shopId} AND date >= CURRENT_DATE - make_interval(days => ${days})
    GROUP BY date
    ORDER BY date ASC
  `;
  return rows as ApiDailySummary[];
}

export async function getTodayApiUsage(): Promise<TodayUsage> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'indexing' AND date = CURRENT_DATE), 0)::int as indexing_today,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'inspection' AND date = CURRENT_DATE), 0)::int as inspection_today,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'indexing' AND date >= CURRENT_DATE - INTERVAL '7 days'), 0)::int as indexing_week,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'indexing' AND date >= CURRENT_DATE - INTERVAL '30 days'), 0)::int as indexing_month
    FROM api_log
  `;
  return (rows[0] as TodayUsage) ?? { indexing_today: 0, inspection_today: 0, indexing_week: 0, indexing_month: 0 };
}

export async function getRecentlyPushedUrls(shopId: string, limit: number = 10): Promise<UrlRow[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
    FROM urls
    WHERE shop_id = ${shopId} AND last_pushed IS NOT NULL AND removed_from_sitemap = FALSE
    ORDER BY last_pushed DESC
    LIMIT ${limit}
  `;
  return rows as UrlRow[];
}

export async function getShopExtraStats(shopId: string): Promise<ShopExtraStats> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      COALESCE(SUM(push_count), 0)::int as total_pushes,
      COUNT(*) FILTER (WHERE push_count = 0 AND verdict IS NOT NULL AND verdict != 'PASS')::int as never_pushed,
      COUNT(*) FILTER (WHERE last_inspected IS NULL)::int as never_inspected,
      MAX(last_pushed)::text as last_pushed,
      MAX(last_inspected)::text as last_inspected
    FROM urls
    WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE
  `;
  return (rows[0] as ShopExtraStats) ?? { total_pushes: 0, never_pushed: 0, never_inspected: 0, last_pushed: null, last_inspected: null };
}

// ─── New queries for dashboard charts ─────────────────────────

export type CoverageStateEntry = {
  coverage_state: string;
  count: number;
};

export type ApiUsageByShop = {
  shop_id: string;
  pushes: number;
  inspections: number;
};

export async function getCoverageStateBreakdown(): Promise<CoverageStateEntry[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      COALESCE(coverage_state, 'Onbekend') as coverage_state,
      COUNT(*)::int as count
    FROM urls
    WHERE verdict IS NOT NULL AND verdict != 'PASS' AND removed_from_sitemap = FALSE
    GROUP BY coverage_state
    ORDER BY count DESC
  `;
  return rows as CoverageStateEntry[];
}

export async function getApiUsageByShop(days: number = 30): Promise<ApiUsageByShop[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      shop_id,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'indexing'), 0)::int as pushes,
      COALESCE(SUM(url_count) FILTER (WHERE api_type = 'inspection'), 0)::int as inspections
    FROM api_log
    WHERE date >= CURRENT_DATE - make_interval(days => ${days})
    GROUP BY shop_id
    ORDER BY pushes DESC
  `;
  return rows as ApiUsageByShop[];
}

export async function getShopUrls(
  shopId: string,
  filters: {
    type?: string;
    verdict?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ urls: UrlRow[]; total: number }> {
  const sql = getDb();
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  // Build conditions
  const conditions: string[] = ["shop_id = $shopId", "removed_from_sitemap = FALSE"];
  if (filters.type) conditions.push("url_type = $type");
  if (filters.verdict === "PASS") conditions.push("verdict = 'PASS'");
  else if (filters.verdict === "FAIL") conditions.push("verdict IS NOT NULL AND verdict != 'PASS'");
  else if (filters.verdict === "UNKNOWN") conditions.push("verdict IS NULL");

  // Use parameterized queries
  let urls: UrlRow[];
  let countResult: { count: number }[];

  if (filters.type && filters.verdict === "PASS") {
    urls = (await sql`
      SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
      FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND url_type = ${filters.type} AND verdict = 'PASS'
      ORDER BY last_inspected DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}
    `) as UrlRow[];
    countResult = (await sql`
      SELECT COUNT(*)::int as count FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND url_type = ${filters.type} AND verdict = 'PASS'
    `) as { count: number }[];
  } else if (filters.type && filters.verdict === "FAIL") {
    urls = (await sql`
      SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
      FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND url_type = ${filters.type} AND verdict IS NOT NULL AND verdict != 'PASS'
      ORDER BY last_inspected DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}
    `) as UrlRow[];
    countResult = (await sql`
      SELECT COUNT(*)::int as count FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND url_type = ${filters.type} AND verdict IS NOT NULL AND verdict != 'PASS'
    `) as { count: number }[];
  } else if (filters.type && filters.verdict === "UNKNOWN") {
    urls = (await sql`
      SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
      FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND url_type = ${filters.type} AND verdict IS NULL
      ORDER BY last_inspected DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}
    `) as UrlRow[];
    countResult = (await sql`
      SELECT COUNT(*)::int as count FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND url_type = ${filters.type} AND verdict IS NULL
    `) as { count: number }[];
  } else if (filters.type) {
    urls = (await sql`
      SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
      FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND url_type = ${filters.type}
      ORDER BY last_inspected DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}
    `) as UrlRow[];
    countResult = (await sql`
      SELECT COUNT(*)::int as count FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND url_type = ${filters.type}
    `) as { count: number }[];
  } else if (filters.verdict === "PASS") {
    urls = (await sql`
      SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
      FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND verdict = 'PASS'
      ORDER BY last_inspected DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}
    `) as UrlRow[];
    countResult = (await sql`
      SELECT COUNT(*)::int as count FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND verdict = 'PASS'
    `) as { count: number }[];
  } else if (filters.verdict === "FAIL") {
    urls = (await sql`
      SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
      FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND verdict IS NOT NULL AND verdict != 'PASS'
      ORDER BY last_inspected DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}
    `) as UrlRow[];
    countResult = (await sql`
      SELECT COUNT(*)::int as count FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND verdict IS NOT NULL AND verdict != 'PASS'
    `) as { count: number }[];
  } else if (filters.verdict === "UNKNOWN") {
    urls = (await sql`
      SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
      FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND verdict IS NULL
      ORDER BY last_inspected DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}
    `) as UrlRow[];
    countResult = (await sql`
      SELECT COUNT(*)::int as count FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE AND verdict IS NULL
    `) as { count: number }[];
  } else {
    urls = (await sql`
      SELECT id, shop_id, url, url_type, coverage_state, verdict, last_inspected::text, last_pushed::text, push_count
      FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE
      ORDER BY last_inspected DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}
    `) as UrlRow[];
    countResult = (await sql`
      SELECT COUNT(*)::int as count FROM urls WHERE shop_id = ${shopId} AND removed_from_sitemap = FALSE
    `) as { count: number }[];
  }

  return { urls, total: countResult[0]?.count ?? 0 };
}
