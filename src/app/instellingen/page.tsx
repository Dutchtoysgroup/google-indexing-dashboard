import { listSchedules, recentLog } from "@/lib/email/schedules";
import { listAllSubscribers } from "@/lib/email/subscribers";
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
      listAllSubscribers(),
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

  const activeSubscriberCount = subscribers.filter((s) => !s.unsubscribed_at).length;

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

        <SubscribersManager initialSubscribers={subscribers} />

        <ScheduleManager
          initialSchedules={schedules}
          initialLog={logEntries}
          activeSubscriberCount={activeSubscriberCount}
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

        <QuickTrigger />
      </section>
    </div>
  );
}
