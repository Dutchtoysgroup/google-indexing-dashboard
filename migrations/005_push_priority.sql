-- Push-volgorde per url_type: bepaalt welke URLs als eerste naar de Indexing
-- API gaan. Lager getal = eerder aan de beurt. Instelbaar via het dashboard
-- (Prioriteit → Push-volgorde); de Python tool leest deze tabel bij elke run.
--
-- Wordt ook door de Python tool aangemaakt en geseed via init_db(); deze
-- migration is voor handmatige toepassing op bestaande databases.

CREATE TABLE IF NOT EXISTS push_priority (
    url_type TEXT PRIMARY KEY,
    priority INT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO push_priority (url_type, priority) VALUES
    ('page', 1),
    ('product', 2),
    ('collection', 3),
    ('blog', 4),
    ('faq', 5),
    ('other', 6)
ON CONFLICT (url_type) DO NOTHING;
