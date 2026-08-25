// Push-volgorde per url_type. Bepaalt welke URLs de Python tool als eerste naar
// de Google Indexing API stuurt: lager getal = eerder aan de beurt. De tool
// leest tabel `push_priority` bij elke run, dus een wijziging hier werkt vanaf
// de eerstvolgende run door — voor alle shops/landen tegelijk.

import { getDb } from "@/lib/db";

export type PriorityRow = {
  url_type: string;
  priority: number;
  updated_at: string | null;
  /** Aantal URLs van dit type dat nu op de push-wachtrij staat. */
  pending: number;
  /** Totaal aantal URLs van dit type in de sitemaps. */
  total: number;
};

// De url_types die de sitemap-collector kan toekennen. `other` is de
// restcategorie en vangt ook URLs zonder type af (spareparts, manuals).
export const KNOWN_TYPES = [
  "page",
  "product",
  "collection",
  "blog",
  "faq",
  "other",
] as const;

export const TYPE_LABELS: Record<string, { label: string; hint: string }> = {
  page: { label: "Pages", hint: "sitemap-pages.xml" },
  product: { label: "Products", hint: "sitemap-products.xml" },
  collection: { label: "Collections", hint: "categoriepagina's" },
  blog: { label: "Blog", hint: "sitemap-blog.xml" },
  faq: { label: "FAQs", hint: "sitemap-faqs.xml" },
  other: { label: "Overig", hint: "spareparts, manuals, onbekend type" },
};

/** Alleen simpele slugs toestaan — de waarde gaat in de tool in een SQL CASE. */
export function isValidType(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,32}$/.test(value);
}

export async function getPriorityRows(): Promise<PriorityRow[]> {
  const sql = getDb();

  const [priorities, counts] = await Promise.all([
    sql`SELECT url_type, priority, updated_at FROM push_priority ORDER BY priority ASC, url_type ASC`,
    sql`
      SELECT
        COALESCE(url_type, 'other') AS url_type,
        COUNT(*) FILTER (
          WHERE verdict IS NOT NULL AND verdict != 'PASS'
            AND (last_pushed IS NULL OR last_pushed < NOW() - INTERVAL '3 days')
        )::int AS pending,
        COUNT(*)::int AS total
      FROM urls
      WHERE removed_from_sitemap = FALSE
      GROUP BY 1
    `,
  ]);

  const countByType = new Map<string, { pending: number; total: number }>();
  for (const row of counts as Array<{ url_type: string; pending: number; total: number }>) {
    // url_types die de tool niet kent tellen mee onder 'other'.
    const key = (KNOWN_TYPES as readonly string[]).includes(row.url_type)
      ? row.url_type
      : "other";
    const current = countByType.get(key) ?? { pending: 0, total: 0 };
    countByType.set(key, {
      pending: current.pending + row.pending,
      total: current.total + row.total,
    });
  }

  const rows = priorities as Array<{
    url_type: string;
    priority: number;
    updated_at: string | null;
  }>;

  // Types die nog niet in de tabel staan (bijv. na een nieuwe collector-versie)
  // achteraan toevoegen, zodat ze wel zichtbaar en sorteerbaar zijn.
  const seen = new Set(rows.map((r) => r.url_type));
  const missing = KNOWN_TYPES.filter((t) => !seen.has(t)).map((url_type, i) => ({
    url_type,
    priority: rows.length + i + 1,
    updated_at: null,
  }));

  return [...rows, ...missing].map((row) => ({
    ...row,
    pending: countByType.get(row.url_type)?.pending ?? 0,
    total: countByType.get(row.url_type)?.total ?? 0,
  }));
}

/**
 * Sla een nieuwe volgorde op. `order` is een lijst url_types, eerst = hoogste
 * prioriteit. Types die ontbreken in de lijst schuiven erachter.
 */
export async function savePriorityOrder(order: string[]): Promise<void> {
  const clean = order.filter(isValidType);
  if (clean.length === 0) throw new Error("Lege of ongeldige volgorde");
  if (new Set(clean).size !== clean.length) throw new Error("Dubbele url_types in de volgorde");

  const sql = getDb();
  for (const [index, urlType] of clean.entries()) {
    await sql`
      INSERT INTO push_priority (url_type, priority, updated_at)
      VALUES (${urlType}, ${index + 1}, NOW())
      ON CONFLICT (url_type)
      DO UPDATE SET priority = EXCLUDED.priority, updated_at = NOW()
    `;
  }
  // Niet-genoemde types belanden achter de opgegeven volgorde.
  await sql`
    UPDATE push_priority
    SET priority = ${clean.length + 1}, updated_at = NOW()
    WHERE url_type <> ALL(${clean}) AND priority <= ${clean.length}
  `;
}
