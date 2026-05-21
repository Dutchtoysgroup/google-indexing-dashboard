-- Priority URL wachtrij: URLs die de gebruiker handmatig versneld geïndexeerd
-- wil zien. Verbruiken hetzelfde dagelijkse push-quotum als reguliere pushes
-- (200/dag), maar gaan voor in de wachtrij. Wanneer meer dan 200 URLs voor
-- dezelfde dag worden ingepland verdeelt de tool ze automatisch over
-- opeenvolgende dagen.
--
-- Wordt ook door de Python tool aangemaakt via init_db(); deze migration is
-- voor handmatige toepassing op bestaande databases.

CREATE TABLE IF NOT EXISTS priority_urls (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    shop_id TEXT,
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    push_error TEXT,
    pushed_at TIMESTAMP,
    source TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(url, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_priority_urls_date_status
    ON priority_urls(scheduled_date, status);
