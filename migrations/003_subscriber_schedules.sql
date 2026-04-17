-- Per-abonnee schedule-keuze: elke abonnee kiest zelf welke schedules (datum/tijd
-- combinaties) ze willen ontvangen. Zonder rij in deze tabel ontvangt de abonnee
-- de betreffende schedule niet.
--
-- Backfill: bestaande abonnees worden op élk bestaand schedule aangemeld, zodat
-- ze na de migratie hetzelfde blijven ontvangen als ervoor.

CREATE TABLE IF NOT EXISTS email_subscriber_schedules (
  subscriber_id INTEGER NOT NULL REFERENCES email_subscribers(id) ON DELETE CASCADE,
  schedule_id   INTEGER NOT NULL REFERENCES email_schedules(id)   ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subscriber_id, schedule_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriber_schedules_schedule
  ON email_subscriber_schedules (schedule_id);

INSERT INTO email_subscriber_schedules (subscriber_id, schedule_id)
SELECT s.id, sch.id
FROM email_subscribers s
CROSS JOIN email_schedules sch
WHERE s.unsubscribed_at IS NULL
ON CONFLICT DO NOTHING;
