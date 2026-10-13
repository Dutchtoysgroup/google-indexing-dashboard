-- Database: dtg_data. Een rapport per planning/Nederlandse kalenderdag,
-- met duurzame, afzonderlijke verzending per ontvanger. Een sessielock op
-- (20261013, schedule_id) serialiseert de scheduler; claims worden vóór SMTP
-- gecommit. Onzekere SMTP-uitkomsten worden nooit automatisch herhaald.

CREATE TABLE app_indexing.email_runs (
    schedule_id integer NOT NULL REFERENCES app_indexing.email_schedules(id) ON DELETE CASCADE,
    period date NOT NULL,
    report_generated_at timestamptz NOT NULL,
    completed_at timestamptz,
    PRIMARY KEY (schedule_id, period)
);

CREATE TABLE app_indexing.email_deliveries (
    schedule_id integer NOT NULL,
    period date NOT NULL,
    recipient text NOT NULL CHECK (recipient = lower(recipient)),
    subscriber_id integer REFERENCES app_indexing.email_subscribers(id) ON DELETE SET NULL,
    subject text NOT NULL,
    html text NOT NULL,
    plain_text text NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'uncertain', 'cancelled')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    attempted_at timestamptz,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    error text,
    PRIMARY KEY (schedule_id, period, recipient),
    FOREIGN KEY (schedule_id, period) REFERENCES app_indexing.email_runs(schedule_id, period) ON DELETE CASCADE,
    CHECK (status <> 'sent' OR sent_at IS NOT NULL),
    CHECK (status NOT IN ('sending', 'uncertain') OR attempted_at IS NOT NULL)
);
CREATE INDEX email_deliveries_retry_idx ON app_indexing.email_deliveries(schedule_id, next_attempt_at)
    WHERE status IN ('pending', 'failed');
COMMENT ON TABLE app_indexing.email_deliveries IS
    'Bewaarde rapportinhoud per ontvanger. Sending/uncertain vereist controle van SMTP-acceptatie vóór handmatig herstel; nooit blind herhalen.';
GRANT SELECT, INSERT, UPDATE, DELETE ON app_indexing.email_runs, app_indexing.email_deliveries
    TO "dtg-google-indexing-dashboard-weu";
