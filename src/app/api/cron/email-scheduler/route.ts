import { NextResponse } from "next/server";
import { buildReport } from "@/lib/email/report-data";
import { renderReportEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/sender";
import {
  getDueSchedules,
  logEmail,
  markScheduleSent,
} from "@/lib/email/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  // Vercel Cron stuurt altijd Authorization: Bearer ${CRON_SECRET}.
  // Lokaal mag het ook werken zonder als CRON_SECRET niet gezet is.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) return unauthorized();
  }

  const to = process.env.EMAIL_TO;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://google-indexing-dashboard.vercel.app";
  if (!to) {
    return NextResponse.json(
      { error: "EMAIL_TO env var ontbreekt" },
      { status: 500 }
    );
  }

  const due = await getDueSchedules();
  const results: Array<{ id: number; status: string; error?: string }> = [];

  for (const sched of due) {
    const since = sched.last_sent_at ? new Date(sched.last_sent_at) : null;
    try {
      const report = await buildReport(since);
      const { html, text } = await renderReportEmail({
        report,
        baseUrl,
        scheduleName: sched.name,
      });
      const subject = `[EXIT Indexing] ${sched.name} — ${report.totals.inspections_since} inspecties, ${report.totals.pushes_since} pushes`;
      await sendEmail({ to, subject, html, text });
      await markScheduleSent(sched.id);
      await logEmail({
        schedule_id: sched.id,
        recipient: to,
        subject,
        status: "sent",
      });
      results.push({ id: sched.id, status: "sent" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logEmail({
        schedule_id: sched.id,
        recipient: to,
        subject: `[EXIT Indexing] ${sched.name}`,
        status: "failed",
        error: msg,
      });
      results.push({ id: sched.id, status: "failed", error: msg });
    }
  }

  return NextResponse.json({
    checked: due.length,
    sent: results.filter((r) => r.status === "sent").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}
