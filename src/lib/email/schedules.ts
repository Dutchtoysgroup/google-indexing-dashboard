import { getDb } from "@/lib/db";

export type EmailSchedule = {
  id: number;
  name: string;
  enabled: boolean;
  time_of_day: string;        // "HH:MM:SS" uit Postgres TIME
  days_of_week: number[];     // 1=ma..7=zo
  last_sent_at: string | null;
  created_at: string;
};

export type EmailLogEntry = {
  id: number;
  schedule_id: number | null;
  sent_at: string;
  recipient: string;
  subject: string;
  status: "sent" | "failed";
  error: string | null;
};

export async function listSchedules(): Promise<EmailSchedule[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, enabled, time_of_day::text, days_of_week,
           last_sent_at::text, created_at::text
    FROM email_schedules
    ORDER BY created_at ASC
  `;
  return rows as EmailSchedule[];
}

export async function createSchedule(input: {
  name: string;
  time_of_day: string;   // "HH:MM"
  days_of_week: number[];
  enabled?: boolean;
}): Promise<EmailSchedule> {
  const sql = getDb();
  const enabled = input.enabled ?? true;
  const rows = await sql`
    INSERT INTO email_schedules (name, enabled, time_of_day, days_of_week)
    VALUES (${input.name}, ${enabled}, ${input.time_of_day}, ${input.days_of_week})
    RETURNING id, name, enabled, time_of_day::text, days_of_week,
              last_sent_at::text, created_at::text
  `;
  return rows[0] as EmailSchedule;
}

export async function updateSchedule(
  id: number,
  patch: Partial<{
    name: string;
    enabled: boolean;
    time_of_day: string;
    days_of_week: number[];
  }>
): Promise<EmailSchedule | null> {
  const sql = getDb();
  // Eenvoudige implementatie: haal, merge, schrijf. Bij deze schaal prima.
  const existing = (await sql`
    SELECT id, name, enabled, time_of_day::text, days_of_week
    FROM email_schedules WHERE id = ${id}
  `) as EmailSchedule[];
  if (!existing.length) return null;
  const cur = existing[0];
  const name = patch.name ?? cur.name;
  const enabled = patch.enabled ?? cur.enabled;
  const time_of_day = patch.time_of_day ?? cur.time_of_day;
  const days_of_week = patch.days_of_week ?? cur.days_of_week;
  const rows = await sql`
    UPDATE email_schedules
    SET name = ${name},
        enabled = ${enabled},
        time_of_day = ${time_of_day},
        days_of_week = ${days_of_week}
    WHERE id = ${id}
    RETURNING id, name, enabled, time_of_day::text, days_of_week,
              last_sent_at::text, created_at::text
  `;
  return (rows[0] as EmailSchedule) ?? null;
}

export async function deleteSchedule(id: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`DELETE FROM email_schedules WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function logEmail(entry: {
  schedule_id: number | null;
  recipient: string;
  subject: string;
  status: "sent" | "failed";
  error?: string | null;
}): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO email_log (schedule_id, recipient, subject, status, error)
    VALUES (${entry.schedule_id}, ${entry.recipient}, ${entry.subject},
            ${entry.status}, ${entry.error ?? null})
  `;
}

export async function recentLog(limit = 20): Promise<EmailLogEntry[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, schedule_id, sent_at::text, recipient, subject, status, error
    FROM email_log
    ORDER BY sent_at DESC
    LIMIT ${limit}
  `;
  return rows as EmailLogEntry[];
}
