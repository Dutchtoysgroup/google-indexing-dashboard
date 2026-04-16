-- Email schedules en log voor periodieke rapporten.
-- Eenmalig uitvoeren op Neon: psql $DATABASE_URL -f migrations/001_email_tables.sql

CREATE TABLE IF NOT EXISTS email_schedules (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  time_of_day   TIME NOT NULL,
  days_of_week  SMALLINT[] NOT NULL,        -- ISO: 1=ma .. 7=zo
  last_sent_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_log (
  id           SERIAL PRIMARY KEY,
  schedule_id  INTEGER REFERENCES email_schedules(id) ON DELETE SET NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient    TEXT NOT NULL,
  subject      TEXT NOT NULL,
  status       TEXT NOT NULL,               -- 'sent' | 'failed'
  error        TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_schedules_enabled ON email_schedules (enabled) WHERE enabled = TRUE;
