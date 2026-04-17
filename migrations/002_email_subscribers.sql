-- E-mail abonnees: wie ontvangt de geplande rapporten.
-- Vervangt de EMAIL_TO env var. Elk adres krijgt een eigen unsubscribe token.
-- Eenmalig uitvoeren op Neon: psql $DATABASE_URL -f migrations/002_email_subscribers.sql

CREATE TABLE IF NOT EXISTS email_subscribers (
  id                 SERIAL PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE,
  unsubscribe_token  TEXT NOT NULL UNIQUE,
  subscribed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_active
  ON email_subscribers (email)
  WHERE unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_subscribers_token
  ON email_subscribers (unsubscribe_token);
