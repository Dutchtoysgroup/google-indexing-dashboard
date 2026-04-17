import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export type EmailSubscriber = {
  id: number;
  email: string;
  unsubscribe_token: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isValidEmail(email: string): boolean {
  // Simple check: one @, dot in domain, no whitespace.
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

export async function listAllSubscribers(): Promise<EmailSubscriber[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
    FROM email_subscribers
    ORDER BY subscribed_at DESC
  `;
  return rows as EmailSubscriber[];
}

export async function subscribe(emailInput: string): Promise<{
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
    if (row.unsubscribed_at === null) {
      return { subscriber: row, created: false, reactivated: false };
    }
    // Reactivate
    const updated = (await sql`
      UPDATE email_subscribers
      SET unsubscribed_at = NULL, subscribed_at = NOW()
      WHERE id = ${row.id}
      RETURNING id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
    `) as EmailSubscriber[];
    return { subscriber: updated[0], created: false, reactivated: true };
  }

  const token = generateToken();
  const rows = (await sql`
    INSERT INTO email_subscribers (email, unsubscribe_token)
    VALUES (${email}, ${token})
    RETURNING id, email, unsubscribe_token, subscribed_at::text, unsubscribed_at::text
  `) as EmailSubscriber[];
  return { subscriber: rows[0], created: true, reactivated: false };
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
