import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { buildReport } from "@/lib/email/report-data";
import { renderReportEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/sender";
import {
  getDueSchedules,
  logEmail,
  markScheduleSent,
} from "@/lib/email/schedules";
import { getActiveSubscribersForSchedule } from "@/lib/email/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  // De scheduler stuurt Authorization: Bearer ${CRON_SECRET}.
  // Alleen expliciete development mag zonder secret werken. Elke andere
  // omgeving faalt gesloten vóór databasequeries of mailverwerking.
  const expected = process.env.CRON_SECRET;
  if (!expected?.trim()) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
    }
  } else {
    // Vaste digestlengtes voorkomen een lengtefout of vroege tokenvergelijking.
    const suppliedHash = createHash("sha256")
      .update(req.headers.get("authorization") ?? "")
      .digest();
    const expectedHash = createHash("sha256").update(`Bearer ${expected}`).digest();
    if (!timingSafeEqual(suppliedHash, expectedHash)) return unauthorized();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://google-indexing-dashboard.vercel.app";

  const due = await getDueSchedules();
  const results: Array<{ id: number; status: string; sent: number; failed: number; error?: string }> = [];

  for (const sched of due) {
    const since = sched.last_sent_at ? new Date(sched.last_sent_at) : null;
    let sentCount = 0;
    let failedCount = 0;
    try {
      const subscribers = await getActiveSubscribersForSchedule(sched.id);
      if (subscribers.length === 0) {
        results.push({ id: sched.id, status: "skipped", sent: 0, failed: 0, error: "geen abonnees voor dit schedule" });
        continue;
      }

      const report = await buildReport(since);
      const brandShort =
        process.env.NEXT_PUBLIC_BRAND_SHORT ||
        process.env.NEXT_PUBLIC_BRAND_NAME ||
        "Indexing";
      const subject = `[${brandShort} Indexing] ${sched.name} — ${report.totals.inspections_since} inspecties, ${report.totals.pushes_since} indexeringsverzoeken`;

      for (const sub of subscribers) {
        const unsubscribeUrl = `${baseUrl}/uitschrijven?token=${encodeURIComponent(sub.unsubscribe_token)}`;
        try {
          const { html, text } = await renderReportEmail({
            report,
            baseUrl,
            scheduleName: sched.name,
            unsubscribeUrl,
            recipientEmail: sub.email,
          });
          await sendEmail({ to: sub.email, subject, html, text });
          sentCount++;
          await logEmail({
            schedule_id: sched.id,
            recipient: sub.email,
            subject,
            status: "sent",
          });
        } catch (e) {
          failedCount++;
          const msg = e instanceof Error ? e.message : String(e);
          await logEmail({
            schedule_id: sched.id,
            recipient: sub.email,
            subject,
            status: "failed",
            error: msg,
          });
        }
      }

      if (sentCount > 0) {
        await markScheduleSent(sched.id);
      }
      results.push({
        id: sched.id,
        status: failedCount === 0 ? "sent" : "partial",
        sent: sentCount,
        failed: failedCount,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ id: sched.id, status: "failed", sent: sentCount, failed: failedCount, error: msg });
    }
  }

  return NextResponse.json({
    checked: due.length,
    results,
  });
}
