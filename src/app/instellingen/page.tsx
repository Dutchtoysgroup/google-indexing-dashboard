import { listSchedules, recentLog } from "@/lib/email/schedules";
import { listAllSubscribersWithSchedules } from "@/lib/email/subscribers";
import { getLatestRun, type WorkflowRun } from "@/lib/github-trigger";
import { ScheduleManager } from "@/components/schedule-manager";
import { SubscribersManager } from "@/components/subscribers-manager";
import { QuickTrigger } from "@/components/quick-trigger";

export const dynamic = "force-dynamic";

export default async function InstellingenPage() {
  let schedules;
  let logEntries;
  let subscribers;
  try {
    [schedules, logEntries, subscribers] = await Promise.all([
      listSchedules(),
      recentLog(15),
      listAllSubscribersWithSchedules(),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">Database niet beschikbaar</h2>
        <p className="mt-4 text-xs text-red-400 font-mono max-w-xl mx-auto">{msg}</p>
      </div>
    );
  }

  // GitHub trigger state (non-fatal: if PAT ontbreekt, renderen we een config-card)
  const githubConfigured = Boolean(process.env.GITHUB_PAT);
  let initialRun: WorkflowRun | null = null;
  let triggerError: string | null = null;
  if (githubConfigured) {
    try {
      initialRun = await getLatestRun();
    } catch (e) {
      triggerError = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Instellingen</h1>
        <p className="mt-1 text-sm text-muted">
          Beheer e-mailabonnees, rapport-schedules en pipeline-acties.
        </p>
      </div>

      {/* ─── E-mail ─── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">E-mail</h2>
          <p className="mt-1 text-sm text-muted">
            Wie ontvangt het indexing-rapport, wanneer, en een logboek van recente verzendingen.
          </p>
        </div>

        <SubscribersManager
          initialSubscribers={subscribers}
          schedules={schedules}
        />

        <ScheduleManager
          initialSchedules={schedules}
          initialLog={logEntries}
        />
      </section>

      {/* ─── Snelle trigger ─── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Snelle trigger</h2>
          <p className="mt-1 text-sm text-muted">
            Handmatig een beperkte pipeline-run starten via GitHub Actions zonder op de
            dagelijkse cron-job te wachten.
          </p>
        </div>

        <QuickTrigger
          initialRun={initialRun}
          initialError={triggerError}
          configured={githubConfigured}
        />
      </section>
    </div>
  );
}
