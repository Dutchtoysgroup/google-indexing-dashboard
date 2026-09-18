"use client";

import { useState } from "react";
import { TYPE_LABELS, type PriorityRow } from "@/lib/push-priority-shared";

type Props = { initialRows: PriorityRow[] };

function labelFor(urlType: string) {
  return TYPE_LABELS[urlType] ?? { label: urlType, hint: "" };
}

export function PushOrderManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [saved, setSaved] = useState(initialRows.map((r) => r.url_type).join(","));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const dirty = rows.map((r) => r.url_type).join(",") !== saved;

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    setRows((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setMessage(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/push-volgorde", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: rows.map((r) => r.url_type) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Opslaan mislukt");
      if (body.rows) setRows(body.rows as PriorityRow[]);
      setSaved((body.rows as PriorityRow[] | undefined)?.map((r) => r.url_type).join(",") ??
        rows.map((r) => r.url_type).join(","));
      setMessage("Opgeslagen. De volgorde geldt vanaf de eerstvolgende run, voor alle landen.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setRows(initialRows);
    setSaved(initialRows.map((r) => r.url_type).join(","));
    setError(null);
    setMessage(null);
  }

  return (
    <div className="rounded-xl border border-brand-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Push-volgorde</h2>
        <span className="text-sm text-muted">Bovenste type gaat als eerste</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Bepaalt welke soort URLs het dagelijkse quotum van 200 pushes als eerste
        opmaken. Sleep de rijen of gebruik de pijltjes. Geldt voor alle landen;
        binnen een type verdeelt de tool het quotum gelijk over de shops.
      </p>

      <ul className="mt-4 space-y-2">
        {rows.map((row, index) => {
          const { label, hint } = labelFor(row.url_type);
          return (
            <li
              key={row.url_type}
              draggable
              onDragStart={() => setDragging(index)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging !== null) move(dragging, index);
                setDragging(null);
              }}
              className={`flex items-center gap-3 rounded-lg border border-brand-border bg-background px-3 py-2.5 ${
                dragging === index ? "opacity-50" : ""
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted">
                {index + 1}
              </span>
              <span className="shrink-0 cursor-grab text-muted" aria-hidden="true">
                ⋮⋮
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {label}
                  <span className="ml-2 font-mono text-xs font-normal text-muted">
                    {row.url_type}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {hint}
                  {hint && " · "}
                  {row.pending.toLocaleString("nl-NL")} in wachtrij van{" "}
                  {row.total.toLocaleString("nl-NL")} URLs
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`${label} omhoog`}
                  className="rounded-md px-2 py-1 text-sm text-muted hover:bg-brand-green-50 hover:text-brand-green-dark disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === rows.length - 1}
                  aria-label={`${label} omlaag`}
                  className="rounded-md px-2 py-1 text-sm text-muted hover:bg-brand-green-50 hover:text-brand-green-dark disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Opslaan…" : "Volgorde opslaan"}
        </button>
        {dirty && !busy && (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            Annuleren
          </button>
        )}
        {message && <span className="text-sm text-green-700">{message}</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  );
}
