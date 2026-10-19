import type { Pool, PoolClient } from "pg";
import { getPool } from "@/lib/db";
import { buildReport } from "./report-data";
import { renderReportEmail } from "./render";
import { sendEmail } from "./sender";

type Dependencies = {
  pool: Pool;
  buildReport: typeof buildReport;
  renderReportEmail: typeof renderReportEmail;
  sendEmail: typeof sendEmail;
};
type Result = { id: number; status: string; sent: number; failed: number; uncertain: number; error?: string };
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

// An explicit SMTP rejection is safe to retry. A lost response after DATA is
// ambiguous: the server may already have accepted the message.
function retryable(error: unknown) {
  const smtp = error as { code?: string; responseCode?: number; command?: string } | null;
  return !!smtp && (smtp.code === "ESENDCONFIG"
    || (Number(smtp.responseCode) >= 400 && Number(smtp.responseCode) <= 599)
    || ["CONN", "EHLO", "HELO", "AUTH", "AUTH PLAIN", "AUTH LOGIN", "MAIL FROM", "RCPT TO"].includes(smtp.command ?? ""));
}

async function transaction<T>(client: PoolClient, work: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    const result = await work();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function prepare(client: PoolClient, id: number, now: Date, deps: Dependencies) {
  // Recheck after obtaining the lock; never trust a candidate read before it.
  const { rows: [schedule] } = await client.query(`
    SELECT s.*, ($2::timestamptz AT TIME ZONE 'Europe/Amsterdam')::date::text AS period
    FROM email_schedules s
    WHERE id = $1 AND enabled
      AND EXTRACT(ISODOW FROM $2::timestamptz AT TIME ZONE 'Europe/Amsterdam')::int = ANY(days_of_week)
      -- Send window: from the planned local time until one hour later. The
      -- WebJob runs every 15 minutes in UTC, so any HH:MM is reached in both
      -- summer and winter time without depending on the job's own clock.
      AND ($2::timestamptz AT TIME ZONE 'Europe/Amsterdam') >= ($2::timestamptz AT TIME ZONE 'Europe/Amsterdam')::date + time_of_day
      AND ($2::timestamptz AT TIME ZONE 'Europe/Amsterdam') < ($2::timestamptz AT TIME ZONE 'Europe/Amsterdam')::date + time_of_day + interval '1 hour'
      AND (last_sent_at IS NULL OR last_sent_at <
        (($2::timestamptz AT TIME ZONE 'Europe/Amsterdam')::date + time_of_day) AT TIME ZONE 'Europe/Amsterdam')
      AND NOT EXISTS (SELECT 1 FROM email_runs r WHERE r.schedule_id = s.id
        AND r.period = ($2::timestamptz AT TIME ZONE 'Europe/Amsterdam')::date)
  `, [id, now]);
  if (!schedule) return;

  const { rows: subscribers } = await client.query(`
    SELECT s.id, lower(s.email) AS email, s.unsubscribe_token
    FROM email_subscribers s JOIN email_subscriber_schedules link ON link.subscriber_id = s.id
    WHERE link.schedule_id = $1 AND s.unsubscribed_at IS NULL
    ORDER BY s.id
  `, [id]);
  if (!subscribers.length) return;
  const { rows: [previous] } = await client.query(`
    SELECT max(report_generated_at) AS generated_at FROM email_runs WHERE schedule_id = $1
  `, [id]);
  const since = previous.generated_at ?? schedule.last_sent_at;
  const report = await deps.buildReport(since ? new Date(since) : null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://google-indexing-dashboard.vercel.app";
  const brand = process.env.NEXT_PUBLIC_BRAND_SHORT || process.env.NEXT_PUBLIC_BRAND_NAME || "Indexing";
  const subject = `[${brand} Indexing] ${schedule.name} — ${report.totals.inspections_since} inspecties, ${report.totals.pushes_since} indexeringsverzoeken`;
  const deliveries: Array<{ id: number; email: string; html: string; text: string }> = [];
  for (const sub of subscribers) {
    const content = await deps.renderReportEmail({ report, baseUrl, scheduleName: schedule.name,
      unsubscribeUrl: `${baseUrl}/uitschrijven?token=${encodeURIComponent(sub.unsubscribe_token)}`,
      recipientEmail: sub.email });
    deliveries.push({ ...sub, ...content });
  }
  // Snapshot the whole recipient set and rendered report atomically, before SMTP.
  await transaction(client, async () => {
    await client.query(`INSERT INTO email_runs (schedule_id, period, report_generated_at)
      VALUES ($1, $2, $3)`, [id, schedule.period, report.generatedAt]);
    for (const delivery of deliveries) {
      await client.query(`INSERT INTO email_deliveries
        (schedule_id, period, recipient, subscriber_id, subject, html, plain_text, next_attempt_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, schedule.period, delivery.email, delivery.id, subject, delivery.html, delivery.text ?? "", now]);
    }
  });
}

async function deliver(client: PoolClient, id: number, now: Date, deps: Dependencies, result: Result) {
  // A previous worker no longer holds the session lock. Its committed claim may
  // have reached SMTP, so recovery must not blindly resend it.
  await client.query(`UPDATE email_deliveries SET status = 'uncertain',
    error = 'Verzendproces onderbroken; controleer SMTP-acceptatie vóór herstel'
    WHERE schedule_id = $1 AND status = 'sending'`, [id]);

  await client.query(`UPDATE email_deliveries d SET status = 'cancelled', error = 'Abonnement beëindigd'
    WHERE schedule_id = $1 AND status IN ('pending', 'failed') AND NOT EXISTS (
      SELECT 1 FROM email_subscribers s JOIN email_subscriber_schedules link ON link.subscriber_id = s.id
      WHERE s.id = d.subscriber_id AND lower(s.email) = d.recipient AND s.unsubscribed_at IS NULL
        AND link.schedule_id = d.schedule_id)`, [id]);
  const { rows: deliveries } = await client.query(`SELECT period::text, recipient, subject, html, plain_text
    FROM email_deliveries WHERE schedule_id = $1 AND status IN ('pending', 'failed') AND next_attempt_at <= $2
    ORDER BY period, recipient`, [id, now]);

  for (const delivery of deliveries) {
    const key = [id, delivery.period, delivery.recipient];
    // A durable claim plus the session lock protects even against connection
    // loss: another worker sees 'sending', never a retryable pending delivery.
    const claim = await client.query(`UPDATE email_deliveries d
      SET status = 'sending', attempts = attempts + 1, attempted_at = now(), error = NULL
      WHERE schedule_id = $1 AND period = $2 AND recipient = $3 AND status IN ('pending', 'failed')
        AND EXISTS (SELECT 1 FROM email_schedules WHERE id = d.schedule_id AND enabled)
        AND EXISTS (SELECT 1 FROM email_subscribers s JOIN email_subscriber_schedules link ON link.subscriber_id = s.id
          WHERE s.id = d.subscriber_id AND lower(s.email) = d.recipient AND s.unsubscribed_at IS NULL
            AND link.schedule_id = d.schedule_id)
      RETURNING recipient`, key);
    if (!claim.rowCount) continue;

    let status: "sent" | "failed" | "uncertain" = "sent";
    let error: string | null = null;
    try {
      await deps.sendEmail({ to: delivery.recipient, subject: delivery.subject, html: delivery.html, text: delivery.plain_text });
    } catch (failure) {
      status = retryable(failure) ? "failed" : "uncertain";
      error = message(failure);
    }
    // This DB write is deliberately outside the SMTP catch. If persistence
    // fails after acceptance, keep the durable claim; never mark it retryable.
    await transaction(client, async () => {
      await client.query(`UPDATE email_deliveries SET status = $4, error = $5,
        sent_at = CASE WHEN $4 = 'sent' THEN now() ELSE NULL END,
        next_attempt_at = $6::timestamptz + interval '5 minutes'
        WHERE schedule_id = $1 AND period = $2 AND recipient = $3`, [...key, status, error, now]);
      await client.query(`INSERT INTO email_log (schedule_id, recipient, subject, status, error)
        VALUES ($1, $2, $3, $4, $5)`,
      [id, delivery.recipient, delivery.subject, status === "sent" ? "sent" : "failed",
        status === "uncertain" ? `Onzekere verzending; geen automatische retry: ${error}` : error]);
    });
    if (status === "sent") result.sent++;
  }

  await transaction(client, async () => {
    const completed = await client.query(`UPDATE email_runs r SET completed_at = now()
      WHERE schedule_id = $1 AND completed_at IS NULL AND NOT EXISTS (
        SELECT 1 FROM email_deliveries d WHERE d.schedule_id = r.schedule_id AND d.period = r.period
          AND d.status NOT IN ('sent', 'cancelled')) RETURNING report_generated_at`, [id]);
    for (const run of completed.rows) {
      await client.query(`UPDATE email_schedules SET last_sent_at = GREATEST(last_sent_at, $2::timestamptz)
        WHERE id = $1`, [id, run.report_generated_at]);
    }
  });
  const { rows: [counts] } = await client.query(`SELECT
    count(*) FILTER (WHERE status IN ('pending', 'failed'))::int AS failed,
    count(*) FILTER (WHERE status IN ('sending', 'uncertain'))::int AS uncertain
    FROM email_deliveries WHERE schedule_id = $1`, [id]);
  result.failed = counts.failed;
  result.uncertain = counts.uncertain;
  result.status = result.uncertain ? "uncertain" : result.failed ? "partial" : result.sent ? "sent" : "skipped";
}

/** Each schedule owns a dedicated PostgreSQL connection until all sends finish. */
export async function runEmailScheduler(
  dependencies?: Dependencies,
  now = new Date(),
) {
  const deps = dependencies ?? { pool: getPool(), buildReport, renderReportEmail, sendEmail };
  const { rows: schedules } = await deps.pool.query("SELECT id FROM email_schedules WHERE enabled ORDER BY id");
  const results: Result[] = [];
  for (const schedule of schedules) {
    const result: Result = { id: schedule.id, status: "skipped", sent: 0, failed: 0, uncertain: 0 };
    const client = await deps.pool.connect();
    // A disconnected client can emit errors while SMTP is in flight. Subsequent
    // queries then fail and leave the durable claim for recovery.
    client.on("error", () => {});
    try {
      const { rows: [lock] } = await client.query("SELECT pg_try_advisory_lock(20261013, $1) AS acquired", [schedule.id]);
      if (!lock.acquired) {
        result.status = "busy";
      } else {
        // Failure to build today's report must not starve older queued mail.
        try {
          await prepare(client, schedule.id, now, deps);
        } catch (error) {
          result.error = message(error);
        }
        await deliver(client, schedule.id, now, deps, result);
        if (result.error) result.status = "failed";
      }
    } catch (error) {
      result.status = "failed";
      result.error = message(error);
    } finally {
      // Destroy rather than return a possibly locked/broken connection to pool.
      client.release(true);
    }
    results.push(result);
  }
  return { checked: schedules.length, results };
}
