# Changelog

## 2026-11-18 — Onuitgebracht

### Gewijzigd
- Mailrapporten gaan niet meer via Gmail. De verzender gebruikt nu een SMTP-server naar keuze via `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` en `EMAIL_FROM`. `GMAIL_USER` en `GMAIL_APP_PASSWORD` worden niet meer gelezen.

## 2026-10-31 — v0.1.1

### Beveiliging
- Beveiligingsupdates voor `@azure/msal-node`.
- Nieuwere beschikbare beveiligingspatches meegenomen, waaronder Next.js 16.4.3.

