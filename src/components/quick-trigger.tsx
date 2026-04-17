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
  if (run.status === "in_progress") return { text: "Bezig", color: "text-exit-green" };
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
      <div className="rounded-xl border border-exit-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Nog niet geconfigureerd</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Zet de env vars <code className="rounded bg-exit-green-50 px-1 py-0.5 font-mono text-[11px]">GITHUB_PAT</code> en{" "}
              <code className="rounded bg-exit-green-50 px-1 py-0.5 font-mono text-[11px]">GITHUB_TRIGGER_REPO</code>{" "}
              (bijv. <code className="font-mono">svendijk2408/google-indexing-tool</code>) op Vercel en redeploy.
              Zie de handleiding in CLAUDE.md of vraag Claude om de stappen.
            </p>
            <button
              type="button"
              disabled
              className="mt-3 rounded-lg bg-exit-green px-4 py-2 text-sm font-medium text-white shadow-sm opacity-50 cursor-not-allowed"
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
      <div className="rounded-xl border border-exit-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Handmatige pipeline-run</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Start nu een pipeline-run via GitHub Actions. Duurt max 40 min. Gebruikt de
              huidige defaults uit <code className="font-mono">config/settings.py</code>{" "}
              (15 inspecties per shop). Je kan deze knop gebruiken als smoke-test.
            </p>
          </div>
          <button
            type="button"
            onClick={onTrigger}
            disabled={pending || Boolean(isActive)}
            className="shrink-0 rounded-lg bg-exit-green px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-exit-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Starten…" : isActive ? "Al bezig…" : "Start nu"}
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-green-600">{status}</p>}
        {error && <p className="mt-3 text-sm text-red-500">✗ {error}</p>}
      </div>

      {run && (
        <div className="rounded-xl border border-exit-border bg-card p-5 shadow-sm">
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
            className="mt-3 inline-block text-xs text-exit-green hover:underline"
          >
            Bekijk logs op GitHub →
          </a>
        </div>
      )}
    </div>
  );
}
