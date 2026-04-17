import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export type EmailSubscriber = {
  id: number;
  email: string;
  unsubscribe_token: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
};

export type SubscriberWithSchedules = EmailSubscriber & {
  schedule_ids: number[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254;
}

export async function listActiveSubscribers(): Promise<EmailSubscriber[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
    FROM email_subscribers
    WHERE unsubscribed_at IS NULL
    ORDER BY subscribed_at ASC
  `;
  return rows as EmailSubscriber[];
}

export async function listAllSubscribersWithSchedules(): Promise<SubscriberWithSchedules[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT
      s.id,
      s.email,
      s.unsubscribe_token,
      s.subscribed_at::text,
      s.unsubscribed_at::text,
      COALESCE(
        ARRAY_AGG(ss.schedule_id ORDER BY ss.schedule_id) FILTER (WHERE ss.schedule_id IS NOT NULL),
        ARRAY[]::int[]
      ) AS schedule_ids
    FROM email_subscribers s
    LEFT JOIN email_subscriber_schedules ss ON ss.subscriber_id = s.id
    GROUP BY s.id
    ORDER BY s.subscribed_at DESC
  `) as SubscriberWithSchedules[];
  return rows;
}

export async function getSubscriberById(id: number): Promise<EmailSubscriber | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
    FROM email_subscribers
    WHERE id = ${id}
    LIMIT 1
  `) as EmailSubscriber[];
  return rows[0] ?? null;
}

export async function getActiveSubscribersForSchedule(
  scheduleId: number
): Promise<EmailSubscriber[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT s.id, s.email, s.unsubscribe_token, s.subscribed_at::text, s.unsubscribed_at::text
    FROM email_subscribers s
    INNER JOIN email_subscriber_schedules ss ON ss.subscriber_id = s.id
    WHERE s.unsubscribed_at IS NULL
      AND ss.schedule_id = ${scheduleId}
    ORDER BY s.subscribed_at ASC
  `) as EmailSubscriber[];
  return rows;
}

async function setScheduleLinks(
  subscriberId: number,
  scheduleIds: number[]
): Promise<void> {
  const sql = getDb();
  // Replace the set of links for this subscriber.
  await sql`DELETE FROM email_subscriber_schedules WHERE subscriber_id = ${subscriberId}`;
  if (scheduleIds.length === 0) return;
  // Insert one row per schedule. neon-http doesn't support parametrised unnest
  // cleanly, so loop — count is tiny (handful of schedules).
  for (const sid of scheduleIds) {
    await sql`
      INSERT INTO email_subscriber_schedules (subscriber_id, schedule_id)
      VALUES (${subscriberId}, ${sid})
      ON CONFLICT DO NOTHING
    `;
  }
}

export async function subscribe(
  emailInput: string,
  scheduleIds: number[]
): Promise<{
  subscriber: EmailSubscriber;
  created: boolean;
  reactivated: boolean;
}> {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    throw new Error("Ongeldig e-mailadres");
  }
  const sql = getDb();
  const existing = (await sql`
    SELECT id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
    FROM email_subscribers
    WHERE email = ${email}
  `) as EmailSubscriber[];

  if (existing.length > 0) {
    const row = existing[0];
    let reactivated = false;
    if (row.unsubscribed_at !== null) {
      const updated = (await sql`
        UPDATE email_subscribers
        SET unsubscribed_at = NULL, subscribed_at = NOW()
        WHERE id = ${row.id}
        RETURNING id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
      `) as EmailSubscriber[];
      reactivated = true;
      Object.assign(row, updated[0]);
    }
    await setScheduleLinks(row.id, scheduleIds);
    return { subscriber: row, created: false, reactivated };
  }

  const token = generateToken();
  const rows = (await sql`
    INSERT INTO email_subscribers (email, unsubscribe_token)
    VALUES (${email}, ${token})
    RETURNING id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
  `) as EmailSubscriber[];
  await setScheduleLinks(rows[0].id, scheduleIds);
  return { subscriber: rows[0], created: true, reactivated: false };
}

export async function updateSubscriberSchedules(
  subscriberId: number,
  scheduleIds: number[]
): Promise<void> {
  await setScheduleLinks(subscriberId, scheduleIds);
}

export async function unsubscribeByToken(token: string): Promise<EmailSubscriber | null> {
  const sql = getDb();
  const rows = (await sql`
    UPDATE email_subscribers
    SET unsubscribed_at = NOW()
    WHERE unsubscribe_token = ${token} AND unsubscribed_at IS NULL
    RETURNING id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
  `) as EmailSubscriber[];
  return rows[0] ?? null;
}

export async function findByToken(token: string): Promise<EmailSubscriber | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
    FROM email_subscribers
    WHERE unsubscribe_token = ${token}
    LIMIT 1
  `) as EmailSubscriber[];
  return rows[0] ?? null;
}

export async function deleteSubscriber(id: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`DELETE FROM email_subscribers WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
