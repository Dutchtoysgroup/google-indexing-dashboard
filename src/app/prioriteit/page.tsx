import { getScheduleSummary, getRecentPriorityUrls } from "@/lib/priority";
import { PriorityManager } from "@/components/priority-manager";

export const dynamic = "force-dynamic";

export default async function PrioriteitPage() {
  let summary;
  let recent;
  try {
    [summary, recent] = await Promise.all([
      getScheduleSummary(30),
      getRecentPriorityUrls(50),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Database niet beschikbaar
        </h2>
        <p className="mt-4 text-xs text-red-400 font-mono max-w-xl mx-auto">
          {msg}
        </p>
        <p className="mt-4 text-sm text-muted">
          Vergeet niet migration <code className="font-mono">004_priority_urls.sql</code> toe te passen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Prioriteit</h1>
        <p className="mt-1 text-sm text-muted">
          Voeg URLs of een Excel toe om versneld door de eerstvolgende run
          gepusht te worden. URLs &gt; 200 worden automatisch over opeenvolgende
          dagen verdeeld; priority URLs gaan voor in de wachtrij maar verbruiken
          hetzelfde dagelijkse push-quotum.
        </p>
      </div>
      <PriorityManager initialSummary={summary} initialRecent={recent} />
    </div>
  );
}
