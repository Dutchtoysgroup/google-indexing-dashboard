"use client";

export function QuickTrigger() {
  return (
    <div className="rounded-xl border border-exit-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Nog niet geconfigureerd
          </p>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Hier komt een knop waarmee je handmatig een beperkte pipeline-run
            kunt starten via GitHub Actions (workflow_dispatch). Dat vereist een
            workflow in de repo plus een GitHub personal access token in een env
            var — vraag dit door te ontwikkelen wanneer je klaar bent om die
            setup te doen.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 rounded-lg bg-exit-green px-4 py-2 text-sm font-medium text-white shadow-sm opacity-50 cursor-not-allowed"
          >
            Start beperkte run (binnenkort)
          </button>
        </div>
      </div>
    </div>
  );
}
