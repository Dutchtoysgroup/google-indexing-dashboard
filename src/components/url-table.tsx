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
  let bg = "bg-exit-green-100 text-exit-green-dark";
  if (count >= 5) bg = "bg-orange-100 text-orange-700";
  else if (count >= 3) bg = "bg-exit-green-200 text-exit-green-dark";
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
    <div className="rounded-xl border border-exit-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-exit-border p-4">
        <h3 className="font-semibold text-foreground">
          URLs ({total.toLocaleString("nl-NL")})
        </h3>

        <select
          value={currentType}
          onChange={(e) => setFilter("type", e.target.value)}
          className="rounded-lg border border-exit-border px-3 py-1.5 text-sm focus:border-exit-green focus:outline-none focus:ring-1 focus:ring-exit-green"
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
          className="rounded-lg border border-exit-border px-3 py-1.5 text-sm focus:border-exit-green focus:outline-none focus:ring-1 focus:ring-exit-green"
        >
          <option value="">Alle statussen</option>
          <option value="PASS">Geindexeerd</option>
          <option value="FAIL">Niet geindexeerd</option>
          <option value="UNKNOWN">Niet gecheckt</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-exit-border/50 text-left text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Coverage</th>
              <th className="px-4 py-3 font-medium">Laatst gecheckt</th>
              <th className="px-4 py-3 font-medium">Laatst gepusht</th>
              <th className="px-4 py-3 font-medium">Pushes</th>
            </tr>
          </thead>
          <tbody>
            {urls.map((row) => (
              <tr
                key={row.id}
                className="border-b border-exit-border/30 transition-colors hover:bg-exit-green-50"
              >
                <td className="max-w-md truncate px-4 py-3">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-exit-green hover:underline"
                  >
                    {row.url.replace(/^https?:\/\/www\./, "")}
                  </a>
                </td>
                <td className="px-4 py-3 capitalize text-slate-500">
                  {row.url_type ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <VerdictBadge verdict={row.verdict} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500" title={row.coverage_state ?? undefined}>
                  {row.coverage_state
                    ? (COVERAGE_LABELS[row.coverage_state] ?? row.coverage_state)
                    : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {row.last_inspected
                    ? new Date(row.last_inspected).toLocaleDateString("nl-NL")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
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
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Geen URLs gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-exit-border px-4 py-3">
          <p className="text-sm text-slate-500">
            Pagina {page} van {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-exit-border px-3 py-1.5 text-sm transition-colors hover:border-exit-green-200 disabled:opacity-40"
            >
              Vorige
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-exit-border px-3 py-1.5 text-sm transition-colors hover:border-exit-green-200 disabled:opacity-40"
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
