# Google Indexing Dashboard

Een dashboard om de Google-indexeringsstatus van één of meerdere webshops in de gaten te houden. Het laat per webshop en per dag zien welke URLs in Google staan, welke (nog) niet, hoeveel indexeringsverzoeken er zijn verstuurd en hoe de coverage zich over de tijd ontwikkelt. Ook kan het dashboard automatisch e-mailrapporten versturen.

Dit is **alleen het dashboard** — het visualiseert data die door een aparte pipeline wordt verzameld. De pipeline scant je sitemaps, controleert de indexeringsstatus via de Google URL Inspection API en stuurt indexeringsverzoeken via de Google Indexing API.

---

## Inhoudsopgave

1. [Wat heb je nodig?](#1-wat-heb-je-nodig)
2. [Hoe werkt het globaal?](#2-hoe-werkt-het-globaal)
3. [Stap-voor-stap installatie](#3-stap-voor-stap-installatie)
4. [Webshops configureren](#4-webshops-configureren)
5. [Branding (logo, naam, kleuren)](#5-branding-logo-naam-kleuren)
6. [E-mailrapporten instellen](#6-e-mailrapporten-instellen)
7. [Pipeline koppelen (handmatige trigger)](#7-pipeline-koppelen-handmatige-trigger)
8. [Deployen op Vercel](#8-deployen-op-vercel)
9. [Database-migraties](#9-database-migraties)
10. [Veelvoorkomende problemen](#10-veelvoorkomende-problemen)
11. [Lokaal ontwikkelen](#11-lokaal-ontwikkelen)

---

## 1. Wat heb je nodig?

Voor je begint, regel je deze accounts en gegevens. Alles is gratis te beginnen:

| Wat | Waarvoor | Waar |
|---|---|---|
| **Google Cloud project** | Om de Google Indexing API en URL Inspection API te kunnen gebruiken (deze hoort bij de pipeline, niet het dashboard zelf) | https://console.cloud.google.com |
| **Google Search Console** | Je webshop(s) moeten geverifieerde properties zijn | https://search.google.com/search-console |
| **Neon Postgres database** | Hier slaat het dashboard alle data op | https://neon.tech |
| **Vercel account** | Om het dashboard te hosten | https://vercel.com |
| **GitHub account** | Om de code op te slaan en (optioneel) de pipeline-workflow vanuit het dashboard te triggeren | https://github.com |
| **Gmail account met App Password** *(optioneel)* | Om e-mailrapporten te versturen | https://myaccount.google.com/apppasswords |

Daarnaast heb je op je computer nodig:

- **Node.js 20 of nieuwer** — download via https://nodejs.org
- **Git** — meestal al geïnstalleerd op Mac/Linux; voor Windows: https://git-scm.com
- Een editor zoals **VS Code** (https://code.visualstudio.com)

---

## 2. Hoe werkt het globaal?

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Pipeline      │     │   Database   │     │   Dashboard     │
│ (apart project) │ ──▶ │   (Neon)     │ ◀── │ (dit project)   │
│                 │     │              │     │                 │
│ Scant sitemaps  │     │ Slaat URLs,  │     │ Toont grafieken │
│ → Google APIs   │     │ snapshots en │     │ Stuurt mails    │
│ → schrijft DB   │     │ logs op      │     │ Triggert runs   │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

- De **pipeline** is een los Python-project dat dagelijks draait. Die schrijft naar dezelfde Neon-database.
- Het **dashboard** (dit project) is een Next.js website die uit dezelfde database leest en alles overzichtelijk presenteert.
- Beide werken alleen samen als ze met dezelfde database verbonden zijn.

---

## 3. Stap-voor-stap installatie

### 3.1 Code naar je computer halen

1. Open een terminal.
2. Maak een lege map aan op een plek waar je projecten staan, bijvoorbeeld in je Documenten-map.
3. Clone de repository naar die map:
   ```bash
   git clone <URL-van-de-repo> google-indexing-dashboard
   cd google-indexing-dashboard
   ```
4. Installeer de afhankelijkheden:
   ```bash
   npm install
   ```
   Dit kan een paar minuten duren. Klaar als de prompt weer terug is.

### 3.2 Database aanmaken (Neon)

1. Ga naar https://neon.tech en maak een gratis account.
2. Klik op **Create Project**. Kies een regio dichtbij (bijv. *Europe (Frankfurt)*) en een naam zoals `indexing-dashboard`.
3. Na het aanmaken zie je een **Connection string**. Die ziet er ongeveer zo uit:
   ```
   postgresql://neondb_owner:wachtwoord@ep-iets-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Kopieer die string — die heb je zo nodig.

### 3.3 Env-bestand invullen

1. Kopieer het voorbeeldbestand:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` in je editor. Vul minstens deze velden in:
   - `DATABASE_URL` → de Neon connection string uit stap 3.2.
   - `NEXT_PUBLIC_BRAND_NAME` → de naam van je merk (bijv. `"Acme"`).
   - `NEXT_PUBLIC_BRAND_SHORT` → een kortere versie voor labels (bijv. `"Acme"`).
   - `NEXT_PUBLIC_SHOPS_CONFIG` → de webshop-lijst, zie [§4](#4-webshops-configureren).
   - `NEXT_PUBLIC_BASE_URL` → laat lokaal staan op `http://localhost:3000`.
3. Sla het bestand op.

### 3.4 Database-tabellen aanmaken

Het dashboard heeft een paar tabellen nodig. Voer alle SQL-bestanden uit de `migrations/`-map in volgorde uit op je Neon-database. Zie [§9](#9-database-migraties) voor twee manieren om dat te doen.

> **Let op:** de pipeline maakt zelf nog meer tabellen aan (zoals `urls`, `snapshots`, `api_log`). Pas wanneer de pipeline minimaal één keer heeft gedraaid, zie je echte data op het dashboard.

### 3.5 Dashboard starten

```bash
npm run dev
```

Open https://localhost:3000 in je browser. Als alles klopt zie je het dashboard. Bij een nieuwe database zie je de melding *"Nog geen data"* — dat is correct, totdat de pipeline data heeft geschreven.

---

## 4. Webshops configureren

Het dashboard moet weten welke webshops er zijn en hoe ze heten. Dat regel je via de env-variabele `NEXT_PUBLIC_SHOPS_CONFIG`. De waarde is een JSON-array — één regel, op één lijn:

```bash
NEXT_PUBLIC_SHOPS_CONFIG='[{"id":"acme_nl","name":"Nederland","flag":"🇳🇱","domain":"acme.nl"},{"id":"acme_de","name":"Deutschland","flag":"🇩🇪","domain":"acme.de"}]'
```

Per webshop vul je vier velden in:

| Veld | Wat | Voorbeeld |
|---|---|---|
| `id` | Unieke interne naam. **Moet exact gelijk zijn aan de `shop_id` die de pipeline in de database schrijft.** | `acme_nl` |
| `name` | Hoe de shop op het dashboard verschijnt | `Nederland` |
| `flag` | Een emoji-vlag (of ander icoon) | `🇳🇱` |
| `domain` | Het domein (zonder `https://`) | `acme.nl` |

> **Tip:** zet exact dezelfde waarde lokaal in `.env.local` én op Vercel (Settings → Environment Variables → voor zowel Production als Preview én Development). Anders zie je in productie geen shops.

Na een wijziging moet je het dashboard opnieuw starten (`Ctrl+C`, dan `npm run dev`) of op Vercel een nieuwe deploy triggeren. De waarde wordt namelijk bij het bouwen ingebakken.

---

## 5. Branding (logo, naam, kleuren)

### Naam aanpassen

Verander `NEXT_PUBLIC_BRAND_NAME` en `NEXT_PUBLIC_BRAND_SHORT` in je env-bestand. Deze namen verschijnen in:

- de paginatitel in de browser
- de naam van de PWA op je telefoon
- de afzender en de footer van de e-mailrapporten
- het onderwerp van de mailrapporten (gebruikt `BRAND_SHORT`)

### Logo vervangen

Vervang deze bestanden in de map `public/` door je eigen versies (zelfde bestandsnamen aanhouden):

| Bestand | Waar gebruikt | Aanbevolen formaat |
|---|---|---|
| `public/logo.svg` | Het hoofdlogo bovenin het dashboard | SVG, ongeveer 70 × 52 px |
| `public/logo-email.png` | Het logo bovenin de e-mailrapporten | PNG, 70 × 52 px (transparante achtergrond) |
| `public/favicon.png` | Het tabblad-icoontje | PNG, 192 × 192 px |
| `public/icon-192.png` | PWA-icoontje (klein) | PNG, 192 × 192 px |
| `public/icon-512.png` | PWA-icoontje (groot) | PNG, 512 × 512 px |
| `public/apple-icon.png` | Icoon voor iPhone home-screen | PNG, 180 × 180 px |

### Kleuren aanpassen

De huisstijlkleuren staan in [`src/app/globals.css`](src/app/globals.css). Helemaal bovenaan zie je dit blokje:

```css
:root {
  --brand-green: #6B8E23;
  --brand-green-light: #8AAD3A;
  --brand-green-dark: #4A6318;
  --brand-green-50: #F4F7EC;
  --brand-green-100: #E3ECCC;
  --brand-green-200: #C8D99A;
  /* ... */
  --header-bg: #1A2E05;
}
```

Pas deze hex-waarden aan naar de kleuren van je eigen merk. Onder `[data-theme="dark"]` staat dezelfde set voor dark mode — die kun je apart afstemmen. De variabele-namen (`--brand-green`, `--brand-green-dark`, etc.) hoef je niet te veranderen; ze beschrijven gewoon welke rol de kleur heeft (primair, donker, accent), niet welke kleur het móét zijn.

---

## 6. E-mailrapporten instellen

Het dashboard kan dagelijks of wekelijks een rapport-e-mail versturen met de belangrijkste cijfers. Dit verloopt via Gmail SMTP.

### 6.1 App Password aanmaken

1. Zet 2-staps-verificatie aan op je Google-account: https://myaccount.google.com/security.
2. Ga daarna naar https://myaccount.google.com/apppasswords.
3. Maak een nieuwe app password aan met een logische naam zoals "Indexing Dashboard".
4. Kopieer het 16-tekens wachtwoord — dat zie je maar één keer.

### 6.2 Env-vars invullen

In `.env.local` (en op Vercel):

```bash
GMAIL_USER="jouw.adres@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
CRON_SECRET="een-willekeurige-lange-string"
```

`CRON_SECRET` is een wachtwoord dat het dashboard gebruikt om te controleren of een binnenkomend mail-verzoek echt van Vercel komt. Genereer een willekeurige string, bijv. via:

```bash
openssl rand -hex 32
```

### 6.3 Schedule en abonnees aanmaken

1. Open het dashboard in je browser.
2. Ga naar **Instellingen**.
3. Voeg onder *E-mail* één of meerdere abonnees toe (e-mailadressen).
4. Maak een schedule (bijv. dagelijks om 07:00, of wekelijks op maandag).
5. Klik op *Testmail versturen* om te kijken of alles werkt.

### 6.4 Cron werkt al automatisch

Het bestand [`vercel.json`](vercel.json) bevat al een Vercel Cron-instelling:

```json
{
  "crons": [
    { "path": "/api/cron/email-scheduler", "schedule": "0 * * * *" }
  ]
}
```

Dat betekent: elk uur controleert Vercel of er een schedule is dat verstuurd moet worden. Je hoeft hier niets voor in te stellen — het werkt zodra je deployt op Vercel.

---

## 7. Pipeline koppelen (handmatige trigger)

Op de pagina **Instellingen** zit een knop *"Start nu"* waarmee je de pipeline-workflow op GitHub Actions handmatig kunt starten. Dit is optioneel — als je deze niet invult is de knop simpelweg uitgeschakeld.

Wat je nodig hebt:

1. Een GitHub repo waarin je pipeline staat met een GitHub Actions workflow (bijv. `.github/workflows/daily-indexing.yml`) die `workflow_dispatch` als trigger heeft.
2. Een **fine-grained personal access token**:
   - Ga naar https://github.com/settings/personal-access-tokens.
   - *Generate new token*, geef toegang tot alleen die ene repo.
   - Onder *Repository permissions* → *Actions* → **Read and write**.
   - Onder *Repository permissions* → *Metadata* → **Read-only** (verplicht voor toegang).
3. Vul deze env vars in:
   ```bash
   GITHUB_PAT="ghp_xxxxxxxxxxxx"
   GITHUB_TRIGGER_REPO="eigenaar/repo-naam"
   GITHUB_TRIGGER_WORKFLOW="daily-indexing.yml"
   GITHUB_TRIGGER_REF="main"
   ```

Na een redeploy verschijnt de knop op de Instellingen-pagina.

---

## 8. Deployen op Vercel

### 8.1 Eerste deploy

1. Push de code naar een GitHub repo.
2. Ga naar https://vercel.com en log in.
3. Klik op **Add New… → Project** en kies de repo.
4. Bij *Configure Project* hoef je niets aan te passen — Vercel herkent Next.js automatisch.
5. Voeg de environment variabelen toe via **Settings → Environment Variables**. Minimum:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_BRAND_NAME`
   - `NEXT_PUBLIC_BRAND_SHORT`
   - `NEXT_PUBLIC_SHOPS_CONFIG`
   - `NEXT_PUBLIC_BASE_URL` (zet dit op je Vercel-URL, bijv. `https://jouw-project.vercel.app`)
   - `CRON_SECRET`
   - en optioneel de Gmail- en GitHub-vars uit §6 en §7.

   Zorg dat elk variabele bij **Production**, **Preview** én **Development** wordt aangevinkt (tenzij je expliciet onderscheid wilt).
6. Klik op **Deploy**.

### 8.2 Eigen domein

1. Onder **Settings → Domains** voeg je je eigen domein toe (bijv. `indexing.mijnmerk.nl`).
2. Volg de DNS-instructies die Vercel toont.
3. Update `NEXT_PUBLIC_BASE_URL` in de env-vars naar het nieuwe domein, en redeploy.

### 8.3 Latere wijzigingen

Iedere `git push` naar de hoofdbranch (meestal `main`) triggert automatisch een nieuwe deploy. Voor preview-deploys gebruik je een feature branch.

---

## 9. Database-migraties

De map `migrations/` bevat SQL-bestanden die in volgorde uitgevoerd moeten worden:

```
migrations/
├── 001_email_tables.sql
├── 002_email_subscribers.sql
└── 003_subscriber_schedules.sql
```

### Optie A: via de Neon SQL Editor (eenvoudigste)

1. Ga naar je Neon-project op https://console.neon.tech.
2. Open links **SQL Editor**.
3. Open `migrations/001_email_tables.sql` in je editor, kopieer de inhoud, plak in de SQL editor en klik op **Run**.
4. Herhaal voor `002_…` en `003_…`.

### Optie B: via de command line

Met `psql` (Postgres command line tool):

```bash
# Vervang $DATABASE_URL door je echte Neon connection string
psql "$DATABASE_URL" -f migrations/001_email_tables.sql
psql "$DATABASE_URL" -f migrations/002_email_subscribers.sql
psql "$DATABASE_URL" -f migrations/003_subscriber_schedules.sql
```

Of in één commando:

```bash
for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

---

## 10. Veelvoorkomende problemen

### "Database niet beschikbaar"

- Controleer of `DATABASE_URL` is ingevuld én correct.
- Controleer of de Neon-database aanstaat (gratis databases gaan in slaap maar starten automatisch weer op).
- Test je connection string op de command line: `psql "$DATABASE_URL" -c "SELECT 1;"`

### "Nog geen data"

Het dashboard ziet wel een database, maar nog geen records. Twee oorzaken:

1. De pipeline heeft nog niet gedraaid → laat 'm minstens één keer draaien.
2. De `NEXT_PUBLIC_SHOPS_CONFIG`-IDs komen niet overeen met wat de pipeline schrijft. Open de Neon SQL editor en run:
   ```sql
   SELECT DISTINCT shop_id FROM urls;
   ```
   en check of die `shop_id`'s exact overeenkomen met de `id`-velden in je config.

### Logo verschijnt niet

- Heb je de bestanden in `public/` echt vervangen? (Niet in een submap.)
- Bestandsnaam moet exact `logo.svg` resp. `logo-email.png` zijn.
- Hard refresh in de browser (Cmd+Shift+R / Ctrl+Shift+R) — service workers cachen oude versies.

### E-mail wordt niet verstuurd

- Klopt het Gmail App Password? (Niet het echte wachtwoord van je Gmail-account, maar het 16-tekens app password.)
- Is 2-staps-verificatie aan op het Gmail-account?
- Bekijk de logs op Vercel onder **Deployments → Functions → email-scheduler**.

### "GITHUB_PAT env var ontbreekt"

Je hebt de quick-trigger pagina geopend zonder dat de GitHub-vars zijn ingevuld. Vul ze in (§7) of negeer de melding — de rest van het dashboard werkt gewoon.

---

## 11. Lokaal ontwikkelen

```bash
npm run dev      # start de dev server op http://localhost:3000
npm run build    # productie-build (handig om te checken of alles compileert)
npm run start    # serveert de productie-build lokaal
npm run lint     # ESLint
```

De dev server herlaadt automatisch zodra je een bestand opslaat. Wijzigingen in env-variabelen vragen een herstart.

### Tech stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS 4** met CSS-variabelen voor theming
- **Neon Postgres** met de `@neondatabase/serverless` driver
- **React Email** voor de mailtemplates, **Nodemailer** voor de verzending
- **Recharts** voor de grafieken
- **Framer Motion** voor de animaties

### Belangrijke mappen

```
src/
├── app/                 # Pages (App Router) en API routes
│   ├── api/             # Endpoints (cron, e-mail, trigger)
│   ├── instellingen/    # Beheerpagina (abonnees, schedules, trigger)
│   ├── shop/[shopId]/   # Detailpagina per webshop
│   ├── uitleg/          # Help-pagina
│   └── uitschrijven/    # Unsubscribe-pagina voor mailrapporten
├── components/          # Charts, kaarten, formulieren
└── lib/
    ├── db.ts            # Database queries
    ├── email/           # Mail-rendering, scheduling, abonnees
    ├── github-trigger.ts
    └── shops.ts         # Webshop-config (leest NEXT_PUBLIC_SHOPS_CONFIG)
```
