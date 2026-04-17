import { NextResponse } from "next/server";
import { buildReport } from "@/lib/email/report-data";
import { renderReportEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/sender";
import { logEmail } from "@/lib/email/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const to = process.env.EMAIL_TO;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  if (!to) {
    return NextResponse.json({ error: "EMAIL_TO env var ontbreekt" }, { status: 500 });
  }
  try {
    const report = await buildReport(null); // laatste 24u
    const { html, text } = await renderReportEmail({
      report,
      baseUrl,
      scheduleName: "Testmail",
    });
    const subject = `[EXIT Indexing] Testmail — ${report.totals.inspections_since} inspecties, ${report.totals.pushes_since} indexeringsverzoeken`;
    await sendEmail({ to, subject, html, text });
    await logEmail({
      schedule_id: null,
      recipient: to,
      subject,
      status: "sent",
    });
    return NextResponse.json({ ok: true, recipient: to, subject });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logEmail({
      schedule_id: null,
      recipient: to,
      subject: "[EXIT Indexing] Testmail",
      status: "failed",
      error: msg,
    }).catch(() => {});
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
