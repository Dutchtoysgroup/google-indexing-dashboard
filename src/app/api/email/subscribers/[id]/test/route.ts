import { NextResponse } from "next/server";
import { buildReport } from "@/lib/email/report-data";
import { renderReportEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/sender";
import { logEmail } from "@/lib/email/schedules";
import { getSubscriberById } from "@/lib/email/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number.parseInt(id, 10);
  if (!Number.isFinite(numeric)) {
    return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const sub = await getSubscriberById(numeric);
  if (!sub) {
    return NextResponse.json({ error: "Abonnee niet gevonden" }, { status: 404 });
  }
  if (sub.unsubscribed_at) {
    return NextResponse.json(
      { error: "Deze abonnee is uitgeschreven — eerst opnieuw aanmelden." },
      { status: 400 }
    );
  }

  try {
    const report = await buildReport(null);
    const subject = `[EXIT Indexing] Testmail — ${report.totals.inspections_since} inspecties, ${report.totals.pushes_since} indexeringsverzoeken`;
    const unsubscribeUrl = `${baseUrl}/uitschrijven?token=${encodeURIComponent(sub.unsubscribe_token)}`;
    const { html, text } = await renderReportEmail({
      report,
      baseUrl,
      scheduleName: "Testmail",
      unsubscribeUrl,
      recipientEmail: sub.email,
    });
    await sendEmail({ to: sub.email, subject, html, text });
    await logEmail({
      schedule_id: null,
      recipient: sub.email,
      subject,
      status: "sent",
    });
    return NextResponse.json({ ok: true, email: sub.email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logEmail({
      schedule_id: null,
      recipient: sub.email,
      subject: "[EXIT Indexing] Testmail",
      status: "failed",
      error: msg,
    }).catch(() => {});
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
