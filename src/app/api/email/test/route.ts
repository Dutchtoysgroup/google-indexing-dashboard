import { NextResponse } from "next/server";
import { buildReport } from "@/lib/email/report-data";
import { renderReportEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/sender";
import { logEmail } from "@/lib/email/schedules";
import { listActiveSubscribers } from "@/lib/email/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const subscribers = await listActiveSubscribers();
  if (subscribers.length === 0) {
    return NextResponse.json(
      { error: "Geen actieve abonnees — voeg er eerst een toe." },
      { status: 400 }
    );
  }

  try {
    const report = await buildReport(null); // laatste 24u
    const subject = `[EXIT Indexing] Testmail — ${report.totals.inspections_since} inspecties, ${report.totals.pushes_since} indexeringsverzoeken`;

    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const unsubscribeUrl = `${baseUrl}/uitschrijven?token=${encodeURIComponent(sub.unsubscribe_token)}`;
      try {
        const { html, text } = await renderReportEmail({
          report,
          baseUrl,
          scheduleName: "Testmail",
          unsubscribeUrl,
          recipientEmail: sub.email,
        });
        await sendEmail({ to: sub.email, subject, html, text });
        sent++;
        await logEmail({
          schedule_id: null,
          recipient: sub.email,
          subject,
          status: "sent",
        });
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        await logEmail({
          schedule_id: null,
          recipient: sub.email,
          subject,
          status: "failed",
          error: msg,
        });
      }
    }

    return NextResponse.json({ ok: true, recipientCount: sent, failed, subject });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
