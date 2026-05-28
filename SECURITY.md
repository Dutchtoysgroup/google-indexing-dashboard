# Beveiligingsbeleid

Dit dashboard monitort de Google indexeringsstatus van de webshops van Dutch Toys Group en bevat onder andere indexeringsdata uit Google Search Console, e-mailadressen van abonnees en serverside-credentials voor GitHub Actions en SMTP. Beveiligingsmeldingen worden serieus en met prioriteit behandeld.

## Een kwetsbaarheid melden

**Meld kwetsbaarheden privé** — open géén publieke issue.

Voorkeursroute:

1. Gebruik GitHub Private Vulnerability Reporting via [Security → Report a vulnerability](https://github.com/Dutchtoysgroup/google-indexing-dashboard/security/advisories/new).
2. Of stuur een e-mail naar **sdijk@dutchtoysgroup.com** met onderwerp `[SECURITY] google-indexing-dashboard`. Een Teams-bericht mag ook.

Vermeld in je melding:

- Een korte beschrijving van het probleem en de potentiële impact.
- Een reproductiestap of proof-of-concept (URL, payload, request). Als de uitleg duidelijk genoeg is hoeft het niet, maar wel fijn.
- De versie / commit waarop je het hebt gevonden, indien bekend.
- Of je publicatie / coördinatie van disclosure wil bespreken.

## Wat je kunt verwachten

| Fase | Streeftijd |
|---|---|
| Eerste bevestiging van ontvangst | Binnen 1 werkdag |
| Triage en eerste inschatting | Binnen 2 werkdagen |
| Fix of mitigatie voor kritieke issues | Zo snel mogelijk, doorgaans binnen 2-3 dagen |
| Publieke disclosure (in overleg) | Pas nadat een fix is uitgerold |

Critical en High issues krijgen voorrang. Lagere severities worden ingepland samen met regulier onderhoud.

## Scope

**In scope** — production en preview-deploys:

- Web app op het productie-domein van het indexing dashboard.
- API-routes onder `/api/*`, in het bijzonder:
  - `/api/trigger/run` — start de indexeringspipeline via GitHub Actions workflow_dispatch.
  - `/api/cron/email-scheduler` — Vercel Cron endpoint voor periodieke rapportages.
  - `/api/email/subscribers/*` en `/api/email/schedules/*` — beheer van abonnees en rapport-schema's.
  - `/api/priority/upload` en `/api/priority/[id]` — handmatige URL-prioritering (incl. file upload).
- Unsubscribe-flow op `/uitschrijven` (token-gebaseerd).
- Server-side rendering / Server Actions.
- Behandeling van secrets in env-vars (`CRON_SECRET`, `GITHUB_PAT`, `DATABASE_URL`, SMTP-credentials).

**Buiten scope:**

- Aanvallen die social engineering, phishing of fysieke toegang vereisen.
- Volume-gebaseerde aanvallen (DDoS, brute force op publieke endpoints) — dit valt onder hosting/platform.
- Best-practice opmerkingen zonder demonstreerbare impact (bijv. ontbrekende security headers zonder exploitatieroute).
- Kwetsbaarheden in third-party dependencies waarvoor nog geen upstream patch beschikbaar is — meld die direct bij de maintainer.
- Het ontbreken van een login-/authenticatiescherm op het dashboard zelf: dit is een interne tool en wordt afgeschermd via deployment-controles, niet via een userland-loginflow.

## Verantwoorde disclosure

We werken volgens coordinated disclosure:

1. Meld eerst privé en wacht op bevestiging.
2. Geef ons redelijke tijd om te fixen voordat je publiceert (richtlijn: max 1 week, korter bij actief misbruik, langer bij complexe issues in overleg).
3. Vermijd toegang tot gegevens van anderen, dataverwijdering, en serviceverstoring tijdens je onderzoek.

Aan onderzoekers die zich aan deze richtlijn houden bieden we, indien gewenst, vermelding in de release notes of een bedankje in de commit history. Op dit moment is er **geen bug bounty programma**.

## Bestaande beveiligingsmaatregelen

- **Dependabot** alerts en automatische dependency-updates.
- **GitHub Secret Scanning** voor per ongeluk gepushte credentials.
- **Branch protection** op `main`.
- **CRON_SECRET** op cron-endpoints (Vercel Cron stuurt `Authorization: Bearer ${CRON_SECRET}`); requests zonder geldig token worden geweigerd.
- **Token-gebaseerde unsubscribe-links** zodat e-mailontvangers zich kunnen uitschrijven zonder authenticatie.
- **Encrypted-at-rest** data in Postgres (Neon).
- **HTTPS only** via Vercel, met HSTS.
- **Secrets in env-vars** (Vercel + lokale `.env.local`), nooit in git.

## Geschiedenis

Significante beveiligingsupdates worden bijgehouden in de [commit history](https://github.com/Dutchtoysgroup/google-indexing-dashboard/commits/main). Recente highlights:

- 2026-05-28 — 16 Dependabot alerts verholpen: Next.js 16.2.3 → 16.2.6 (13 CVE's), xlsx 0.18.5 vervangen door `@e965/xlsx` 0.20.3 (2 high CVE's), postcss gepinned op ≥ 8.5.10 via `overrides` (CVE-2026-41305).

---

Vragen over dit beleid? Mail of Teams [sdijk@dutchtoysgroup.com](mailto:sdijk@dutchtoysgroup.com).
