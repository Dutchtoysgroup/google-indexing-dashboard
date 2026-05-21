// Priority URL queue: handmatig versneld geïndexeerd. Verbruikt het reguliere
// 200/dag push-quotum maar gaat voor in de wachtrij; >200 URLs worden over
// opeenvolgende dagen verdeeld door de Python tool (insert_priority_urls).

import { getDb } from "@/lib/db";
import { SHOP_INFO } from "@/lib/shops";

export type PrioritySummary = {
  scheduled_date: string;
  pending: number;
  pushed: number;
  failed: number;
};

export type PriorityUrl = {
  id: number;
  url: string;
  shop_id: string | null;
  scheduled_date: string;
  status: string;
  pushed_at: string | null;
  push_error: string | null;
  source: string | null;
  created_at: string;
};

const DAILY_LIMIT = 200;
const URL_RE = /https?:\/\/[^\s,;"']+/gi;

export function parseUrlsFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_RE) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of matches) {
    const url = raw.replace(/[.,;:]+$/, "").trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

function shopIdForUrl(url: string): string | null {
  try {
    const host = new URL(url).host.toLowerCase();
    // SHOP_INFO is keyed on shop_id; we matchen op het ingevulde domein.
    for (const [id, info] of Object.entries(SHOP_INFO)) {
      if (!info.domain) continue;
      const domain = info.domain.toLowerCase();
      if (host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`)) {
        return id;
      }
    }
  } catch {
    // Ongeldige URL — laat shop_id leeg.
  }
  return null;
}

export async function scheduleUrls(
  urls: string[],
  source: string = "dashboard",
): Promise<{
  received: number;
  deduped: number;
  inserted: number;
  skipped_duplicate: number;
  unmapped: number;
  unmapped_sample: string[];
  schedule: Record<string, number>;
}> {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const u of urls) {
    if (u && !seen.has(u)) {
      seen.add(u);
      deduped.push(u);
    }
  }

  const sql = getDb();
  // Bepaal startbezetting van pending priority-URLs vanaf vandaag.
  const existingRows = (await sql`
    SELECT scheduled_date::text AS scheduled_date, COUNT(*)::int AS cnt
    FROM priority_urls
    WHERE scheduled_date >= CURRENT_DATE AND status = 'pending'
    GROUP BY scheduled_date
  `) as { scheduled_date: string; cnt: number }[];

  const existing = new Map<string, number>();
  for (const row of existingRows) existing.set(row.scheduled_date, row.cnt);

  // Begin bij vandaag (UTC datum die de db gebruikt; we vergelijken op string).
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  function addDays(d: Date, n: number): Date {
    const out = new Date(d);
    out.setUTCDate(out.getUTCDate() + n);
    return out;
  }
  function fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  let cursor = new Date(today);
  let inserted = 0;
  let skipped = 0;
  let unmapped = 0;
  const unmappedSample: string[] = [];
  const schedule: Record<string, number> = {};

  for (const url of deduped) {
    while ((existing.get(fmt(cursor)) ?? 0) >= DAILY_LIMIT) {
      cursor = addDays(cursor, 1);
    }
    const day = fmt(cursor);
    const shopId = shopIdForUrl(url);
    if (!shopId) {
      unmapped += 1;
      if (unmappedSample.length < 5) unmappedSample.push(url);
    }

    // shop_id mag null zijn — db kolom accepteert dat.
    const insertRows = (await sql`
      INSERT INTO priority_urls (url, shop_id, scheduled_date, source)
      VALUES (${url}, ${shopId}, ${day}, ${source})
      ON CONFLICT (url, scheduled_date) DO NOTHING
      RETURNING id
    `) as { id: number }[];

    if (insertRows.length > 0) {
      inserted += 1;
      existing.set(day, (existing.get(day) ?? 0) + 1);
      schedule[day] = (schedule[day] ?? 0) + 1;
    } else {
      skipped += 1;
    }
  }

  return {
    received: urls.length,
    deduped: deduped.length,
    inserted,
    skipped_duplicate: skipped,
    unmapped,
    unmapped_sample: unmappedSample,
    schedule,
  };
}

export async function getScheduleSummary(daysAhead: number = 30): Promise<PrioritySummary[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      scheduled_date::text AS scheduled_date,
      COUNT(*) FILTER (WHERE status = 'pending')::int  AS pending,
      COUNT(*) FILTER (WHERE status = 'pushed')::int   AS pushed,
      COUNT(*) FILTER (WHERE status = 'failed')::int   AS failed
    FROM priority_urls
    WHERE scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
      AND scheduled_date <= CURRENT_DATE + make_interval(days => ${daysAhead})
    GROUP BY scheduled_date
    ORDER BY scheduled_date ASC
  `;
  return rows as PrioritySummary[];
}

export async function getRecentPriorityUrls(limit: number = 50): Promise<PriorityUrl[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, url, shop_id, scheduled_date::text, status,
           pushed_at::text, push_error, source, created_at::text
    FROM priority_urls
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as PriorityUrl[];
}

export async function deletePriorityUrl(id: number): Promise<boolean> {
  const sql = getDb();
  const rows = (await sql`
    DELETE FROM priority_urls WHERE id = ${id} AND status = 'pending'
    RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}
