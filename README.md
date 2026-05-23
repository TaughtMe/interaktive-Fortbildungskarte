# Interaktive Fortbildungskarte

Interaktive Next.js-App zur Sichtung von Schulen und Fortbildungsbedarfen im Schulamtskontext. Der aktuelle Stand ist eine technisch vorbereitete Demo: Die App laeuft standardmaessig mit Mock-/Staticdaten, ohne produktive Datenbankverbindung und ohne echte Authentifizierung.

## Aktueller Stand

- Aktive App: Next.js unter `src/`
- Standard-Datenquelle: Mock-/Staticdaten aus `src/data/schools.ts`
- PostgreSQL/Supabase: bevorzugte Zielrichtung, Schema und Migrationen vorbereitet
- Cloudflare D1: vorbereitete Alternative, nicht priorisierte Zielarchitektur
- Legacy-Demo: nur Referenz unter `legacy/`
- Keine produktive Authentifizierung, keine Sessions, keine Cookies, keine Passwoerter

Im Testbetrieb duerfen keine echten Schueler-, Lehrkraft- oder sonstigen personenbezogenen Daten eingetragen werden.

## Lokale Installation

```bash
npm install
```

## App starten

```bash
npm run dev
```

Die App bleibt ohne weitere Konfiguration im Mock-Betrieb. Keine `DATABASE_URL` setzen, solange nicht bewusst an einer isolierten PostgreSQL-/Supabase-Testdatenbank gearbeitet wird.

## Pruefen

```bash
npx tsc --noEmit
npm run build
npm run db:pg:check
```

Oder gesammelt:

```bash
npm run verify
```

## NPM Scripts

| Script | Zweck | Sicherheitshinweis |
|---|---|---|
| `npm run dev` | Startet die lokale Next.js-Entwicklung. | Ungefaehrlich, nutzt standardmaessig Mockdaten. |
| `npm run build` | Erstellt den Produktionsbuild. | Ungefaehrlich, aktiviert keine DB-Verbindung. |
| `npm run start` | Startet einen gebauten Next.js-Server. | Nur nach `npm run build`. |
| `npm run lint` | Vorhandener Lint-Befehl. | Kann je nach Next-Version Anpassung brauchen. |
| `npm run typecheck` | Fuehrt `tsc --noEmit` aus. | Ungefaehrlich. |
| `npm run verify:db` | Fuehrt `npm run db:pg:check` aus. | Prueft nur PostgreSQL-Migrationen. |
| `npm run verify:build` | Fuehrt Typecheck und Build aus. | Ungefaehrlich. |
| `npm run verify` | Fuehrt Typecheck, PostgreSQL-Migrationscheck und Build aus. | Fuehrt keine Migration aus. |
| `npm run db:pg:generate` | Generiert PostgreSQL-Migrationen aus `schema.pg.ts`. | Nur nach Schemaaenderungen nutzen. |
| `npm run db:pg:check` | Prueft PostgreSQL-Migrationen. | Sicherer Pruefbefehl ohne Migration. |
| `npm run db:generate` | Generiert D1/SQLite-Migrationen. | D1 ist nur Alternative. |
| `npm run db:pg:migrate` | Wendet PostgreSQL-Migrationen gegen `DATABASE_URL` an. | Nicht automatisch ausfuehren. |
| `npm run db:migrate:local` | Wendet D1-Migrationen lokal ueber Wrangler an. | Nicht automatisch ausfuehren. |
| `npm run db:pg:seed` | Schreibt Demo-Daten in eine PostgreSQL-Testdatenbank. | Gefaehrlich; nur nach bewusster Freigabe und nie mit echten personenbezogenen Daten. |

## Datenbankstrategie

Supabase/PostgreSQL ist die bevorzugte naechste Richtung. Dafuer liegen `src/lib/db/schema.pg.ts`, `drizzle.pg.config.ts` und `drizzle-pg/migrations/` als Vorbereitung vor. Ohne lokal gesetzte `DATABASE_URL` wird keine echte Verbindung erwartet.

D1 bleibt als vorbereitete Alternative im Projekt: `src/lib/db/schema.ts`, `drizzle.config.ts`, `drizzle/migrations/` und `wrangler.toml`. Diese Richtung ist dokumentiert, aber aktuell nicht bevorzugt.

Migrationen und Seeds werden nicht automatisch ausgefuehrt. Besonders diese Befehle nur nach ausdruecklicher Freigabe nutzen:

```bash
npm run db:pg:migrate
npm run db:migrate:local
```

## Dokumentation

Der Einstieg in die Projektdokumentation liegt unter `docs/README.md`.

Wichtige Dateien fuer eine spaetere Supabase/PostgreSQL-Anbindung:

- `src/lib/db/schema.pg.ts`
- `drizzle.pg.config.ts`
- `drizzle-pg/migrations/`
- `docs/ARCHITEKTUR_DATENBANK.md`
- `docs/SUPABASE_SETUP.md`

Keine Zugangsdaten committen. Eine echte Supabase-`DATABASE_URL` gehoert nur lokal in `.env.local`.
