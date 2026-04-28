"use client";

import { useEffect, useState, useTransition } from "react";
import type { WorkflowRun } from "@/lib/github-trigger";

type Props = {
  initialRun: WorkflowRun | null;
  initialError: string | null;
  configured: boolean;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(run: WorkflowRun): { text: string; color: string } {
  if (run.status === "completed") {
    if (run.conclusion === "success") return { text: "Geslaagd", color: "text-green-600" };
    if (run.conclusion === "failure") return { text: "Mislukt", color: "text-red-500" };
    if (run.conclusion === "cancelled") return { text: "Geannuleerd", color: "text-muted" };
    return { text: run.conclusion ?? "Voltooid", color: "text-muted" };
  }
  if (run.status === "in_progress") return { text: "Bezig", color: "text-brand-green" };
  if (run.status === "queued") return { text: "In de wachtrij", color: "text-yellow-600" };
  return { text: run.status, color: "text-muted" };
}

export function QuickTrigger({ initialRun, initialError, configured }: Props) {
  const [run, setRun] = useState<WorkflowRun | null>(initialRun);
  const [error, setError] = useState<string | null>(initialError);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isActive = run && (run.status === "queued" || run.status === "in_progress");

  // Poll status every 15s while a run is active
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch("/api/trigger/run");
        if (r.ok) {
          const j = await r.json();
          setRun(j.run);
        }
      } catch {
        // Ignore; next tick will retry
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [isActive]);

  function onTrigger() {
    setStatus(null);
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/trigger/run", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || "Starten mislukt");
        return;
      }
      setStatus("✓ Run gestart");
      if (j.run) setRun(j.run);
    });
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-brand-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Nog niet geconfigureerd</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Zet de env vars <code className="rounded bg-brand-green-50 px-1 py-0.5 font-mono text-[11px]">GITHUB_PAT</code> en{" "}
              <code className="rounded bg-brand-green-50 px-1 py-0.5 font-mono text-[11px]">GITHUB_TRIGGER_REPO</code>{" "}
              (formaat <code className="font-mono">eigenaar/repo-naam</code>) op Vercel en redeploy.
              Zie de README voor de volledige handleiding.
            </p>
            <button
              type="button"
              disabled
              className="mt-3 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white shadow-sm opacity-50 cursor-not-allowed"
            >
              Start beperkte run
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Uitleg: alleen voor noodgevallen */}
      <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-yellow-700"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-yellow-900">Alleen voor noodgevallen</p>
            <p className="mt-1 text-xs text-yellow-900/80 leading-relaxed">
              De pipeline draait normaal automatisch dagelijks om 04:00 (NL tijd) op de
              Mac Mini. Deze knop start een extra run op GitHub Actions — gebruik het
              alleen als er iets echt mis is gegaan met de dagelijkse run, bij een
              urgente her-indexering, of als smoke-test na een grote code-wijziging.
              Het vreet GitHub Actions-minuten en deelt Google&apos;s dagelijkse
              push-quota met de gewone run.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Handmatige pipeline-run</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Start een run via GitHub Actions. Op Actions geldt een tijdsbudget van
              30 min voor crawl + inspect; push en snapshot lopen daarna altijd door
              tot Google&apos;s dagelijkse limiet (200 verzoeken) is bereikt. Job
              timeout: 40 min.
            </p>
          </div>
          <button
            type="button"
            onClick={onTrigger}
            disabled={pending || Boolean(isActive)}
            className="shrink-0 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Starten…" : isActive ? "Al bezig…" : "Start nu"}
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-green-600">{status}</p>}
        {error && <p className="mt-3 text-sm text-red-500">✗ {error}</p>}
      </div>

      {run && (
        <div className="rounded-xl border border-brand-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Laatste run #{run.run_number}</p>
              <p className="mt-1 text-xs text-muted">
                {run.event === "workflow_dispatch" ? "Handmatig" : run.event} ·{" "}
                Gestart {formatDateTime(run.created_at)}
                {run.status === "completed" && (
                  <> · voltooid {formatDateTime(run.updated_at)}</>
                )}
              </p>
            </div>
            <span className={`shrink-0 text-sm font-medium ${statusLabel(run).color}`}>
              {statusLabel(run).text}
            </span>
          </div>
          <a
            href={run.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-brand-green hover:underline"
          >
            Bekijk logs op GitHub →
          </a>
        </div>
      )}
    </div>
  );
}
