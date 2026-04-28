"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { UrlRow } from "@/lib/db";

type Props = {
  urls: UrlRow[];
  total: number;
  page: number;
  pageSize: number;
};

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (verdict === "PASS") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Indexed
      </span>
    );
  }
  if (verdict) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        {verdict}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      Unknown
    </span>
  );
}

function PushCountBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-slate-300">-</span>;
  let bg = "bg-brand-green-100 text-brand-green-dark";
  if (count >= 5) bg = "bg-orange-100 text-orange-700";
  else if (count >= 3) bg = "bg-brand-green-200 text-brand-green-dark";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}>
      {count}x
    </span>
  );
}

const COVERAGE_LABELS: Record<string, string> = {
  "Submitted and indexed": "Ingediend & geindexeerd",
  "Crawled - currently not indexed": "Gecrawled - niet geindexeerd",
  "Discovered - currently not indexed": "Ontdekt - niet geindexeerd",
  "URL is unknown to Google": "Onbekend bij Google",
  "Excluded by 'noindex' tag": "Uitgesloten door noindex",
  "Blocked by robots.txt": "Geblokkeerd door robots.txt",
  "Page with redirect": "Redirect",
  "Duplicate without user-selected canonical": "Duplicaat (geen canonical)",
  "Duplicate, Google chose different canonical than user": "Duplicaat (andere canonical)",
  "Not found (404)": "Niet gevonden (404)",
  "Soft 404": "Soft 404",
  "Server error (5xx)": "Serverfout (5xx)",
};

export function UrlTable({ urls, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  function setPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const currentType = searchParams.get("type") ?? "";
  const currentVerdict = searchParams.get("verdict") ?? "";

  return (
    <div className="rounded-xl border border-brand-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-brand-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <h3 className="font-semibold text-foreground">
          URLs ({total.toLocaleString("nl-NL")})
        </h3>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <select
            value={currentType}
            onChange={(e) => setFilter("type", e.target.value)}
            className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green sm:w-auto sm:py-1.5"
          >
            <option value="">Alle types</option>
            <option value="product">Product</option>
            <option value="collection">Collection</option>
            <option value="page">Page</option>
            <option value="blog">Blog</option>
            <option value="faq">FAQ</option>
          </select>

          <select
            value={currentVerdict}
            onChange={(e) => setFilter("verdict", e.target.value)}
            className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green sm:w-auto sm:py-1.5"
          >
            <option value="">Alle statussen</option>
            <option value="PASS">Geindexeerd</option>
            <option value="FAIL">Niet geindexeerd</option>
            <option value="UNKNOWN">Niet gecheckt</option>
          </select>
        </div>
      </div>

      {/* Mobile: card list */}
      <ul className="divide-y divide-brand-border/40 sm:hidden">
        {urls.map((row) => (
          <li key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 break-all text-sm text-brand-green hover:underline"
              >
                {row.url.replace(/^https?:\/\/www\./, "")}
              </a>
              <VerdictBadge verdict={row.verdict} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {row.url_type && (
                <span className="capitalize">{row.url_type}</span>
              )}
              {row.coverage_state && (
                <span className="text-muted">
                  {COVERAGE_LABELS[row.coverage_state] ?? row.coverage_state}
                </span>
              )}
              {row.last_inspected && (
                <span className="text-muted">
                  gecheckt{" "}
                  {new Date(row.last_inspected).toLocaleDateString("nl-NL")}
                </span>
              )}
              {row.last_pushed && (
                <span className="text-muted">
                  verzoek{" "}
                  {new Date(row.last_pushed).toLocaleDateString("nl-NL")}
                </span>
              )}
              {row.push_count > 0 && (
                <PushCountBadge count={row.push_count} />
              )}
            </div>
          </li>
        ))}
        {urls.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted">
            Geen URLs gevonden.
          </li>
        )}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border/50 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Coverage</th>
              <th className="px-4 py-3 font-medium">Laatst gecheckt</th>
              <th className="px-4 py-3 font-medium">Laatste verzoek</th>
              <th className="px-4 py-3 font-medium">Verzoeken</th>
            </tr>
          </thead>
          <tbody>
            {urls.map((row) => (
              <tr
                key={row.id}
                className="border-b border-brand-border/30 transition-colors hover:bg-brand-green-50"
              >
                <td className="max-w-md truncate px-4 py-3">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-green hover:underline"
                  >
                    {row.url.replace(/^https?:\/\/www\./, "")}
                  </a>
                </td>
                <td className="px-4 py-3 capitalize text-muted">
                  {row.url_type ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <VerdictBadge verdict={row.verdict} />
                </td>
                <td className="px-4 py-3 text-xs text-muted" title={row.coverage_state ?? undefined}>
                  {row.coverage_state
                    ? (COVERAGE_LABELS[row.coverage_state] ?? row.coverage_state)
                    : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {row.last_inspected
                    ? new Date(row.last_inspected).toLocaleDateString("nl-NL")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {row.last_pushed
                    ? new Date(row.last_pushed).toLocaleDateString("nl-NL")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <PushCountBadge count={row.push_count} />
                </td>
              </tr>
            ))}
            {urls.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Geen URLs gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-brand-border px-4 py-3">
          <p className="text-xs text-muted sm:text-sm">
            Pagina {page} van {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-brand-border px-3 py-1.5 text-sm transition-colors hover:border-brand-green-200 disabled:opacity-40"
            >
              Vorige
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-brand-border px-3 py-1.5 text-sm transition-colors hover:border-brand-green-200 disabled:opacity-40"
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
