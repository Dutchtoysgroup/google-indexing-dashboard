"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { PrioritySummary, PriorityUrl } from "@/lib/priority";

type Props = {
  initialSummary: PrioritySummary[];
  initialRecent: PriorityUrl[];
};

type UploadResult = {
  received: number;
  deduped: number;
  inserted: number;
  skipped_duplicate: number;
  unmapped: number;
  unmapped_sample: string[];
  schedule: Record<string, number>;
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function statusBadge(status: string): { text: string; classes: string } {
  if (status === "pushed")
    return { text: "Gepusht", classes: "bg-green-100 text-green-800" };
  if (status === "failed")
    return { text: "Mislukt", classes: "bg-red-100 text-red-700" };
  return { text: "In wachtrij", classes: "bg-brand-green-50 text-brand-green-dark" };
}

export function PriorityManager({ initialSummary, initialRecent }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!text.trim() && !file) {
      setError("Plak URLs of selecteer een bestand.");
      return;
    }

    startTransition(async () => {
      const form = new FormData();
      if (text.trim()) form.append("text", text);
      if (file) form.append("file", file);
      form.append("source", "dashboard");

      const r = await fetch("/api/priority/upload", {
        method: "POST",
        body: form,
      });
      const j = (await r.json().catch(() => ({}))) as Partial<UploadResult> & {
        error?: string;
      };
      if (!r.ok) {
        setError(j.error || "Upload mislukt");
        return;
      }
      setResult(j as UploadResult);
      reset();
      router.refresh();
    });
  }

  async function onDelete(id: number) {
    const r = await fetch(`/api/priority/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setError(j.error || "Verwijderen mislukt");
      return;
    }
    router.refresh();
  }

  const totalPending = initialSummary.reduce((sum, r) => sum + r.pending, 0);

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="rounded-xl border border-brand-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">URLs toevoegen</h2>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          Plak URLs (één per regel) of upload een .txt, .csv of .xlsx bestand.
          De eerstvolgende run pusht ze met voorrang naar GSC. Meer dan 200 URLs
          worden automatisch over opeenvolgende dagen verdeeld.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="https://www.exittoys.nl/...&#10;https://www.exittoys.de/..."
            className="w-full rounded-lg border border-brand-border bg-background p-3 font-mono text-xs text-foreground outline-none focus:border-brand-green"
            disabled={pending}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,.xlsx,.xlsm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-green-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-green-dark"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending}
              className="shrink-0 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Bezig…" : "Toevoegen aan wachtrij"}
            </button>
          </div>
        </form>

        {error && <p className="mt-3 text-sm text-red-500">✗ {error}</p>}

        {result && (
          <div className="mt-4 rounded-lg bg-brand-green-50 p-4 text-sm">
            <p className="font-medium text-brand-green-dark">
              ✓ {result.inserted} URLs ingepland
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-brand-green-dark/80">
              <li>Aangeboden: {result.received}</li>
              <li>Na dedup: {result.deduped}</li>
              {result.skipped_duplicate > 0 && (
                <li>Al in wachtrij: {result.skipped_duplicate}</li>
              )}
              {result.unmapped > 0 && (
                <li>Zonder shop-match: {result.unmapped}</li>
              )}
            </ul>
            {Object.keys(result.schedule).length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-brand-green-dark">
                  Verdeling:
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-brand-green-dark/80">
                  {Object.entries(result.schedule)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([day, count]) => (
                      <li key={day}>
                        {formatDate(day)}: {count}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule overview */}
      <div className="rounded-xl border border-brand-border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-foreground">Geplande pushes</h2>
          <span className="text-sm text-muted">
            {totalPending} URLs in wachtrij
          </span>
        </div>
        {initialSummary.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nog geen priority URLs gepland.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2 pr-4 text-right">In wachtrij</th>
                  <th className="py-2 pr-4 text-right">Gepusht</th>
                  <th className="py-2 text-right">Mislukt</th>
                </tr>
              </thead>
              <tbody>
                {initialSummary.map((row) => (
                  <tr key={row.scheduled_date} className="border-t border-brand-border">
                    <td className="py-2 pr-4 font-medium text-foreground">
                      {formatDate(row.scheduled_date)}
                    </td>
                    <td className="py-2 pr-4 text-right text-brand-green-dark">
                      {row.pending || "—"}
                    </td>
                    <td className="py-2 pr-4 text-right text-green-700">
                      {row.pushed || "—"}
                    </td>
                    <td className="py-2 text-right text-red-500">
                      {row.failed || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent entries */}
      <div className="rounded-xl border border-brand-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          Recente entries
        </h2>
        {initialRecent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nog geen entries.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-border">
            {initialRecent.map((row) => {
              const badge = statusBadge(row.status);
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-foreground">
                      {row.url}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(row.scheduled_date)}
                      {row.shop_id && ` · ${row.shop_id}`}
                      {row.source && ` · ${row.source}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}
                  >
                    {badge.text}
                  </span>
                  {row.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs text-muted hover:bg-red-50 hover:text-red-600"
                      aria-label="Verwijder uit wachtrij"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
