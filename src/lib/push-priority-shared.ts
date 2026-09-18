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

