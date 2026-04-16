import { listSchedules, recentLog } from "@/lib/email/schedules";
import { ScheduleManager } from "@/components/schedule-manager";

export const dynamic = "force-dynamic";

export default async function InstellingenPage() {
  let schedules;
  let logEntries;
  try {
    [schedules, logEntries] = await Promise.all([
      listSchedules(),
      recentLog(15),
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

  const recipient = process.env.EMAIL_TO ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Instellingen</h1>
        <p className="mt-1 text-sm text-slate-500">
          Beheer wanneer en hoe vaak je een e-mailrapport ontvangt over de indexing pipeline.
        </p>
      </div>

      <ScheduleManager
        initialSchedules={schedules}
        initialLog={logEntries}
        recipient={recipient}
      />
    </div>
  );
}
