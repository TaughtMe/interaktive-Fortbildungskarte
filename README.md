# Interaktive Fortbildungskarte

Interaktive Next.js-App zur Sichtung von Schulen und Fortbildungsbedarfen im Schulamtskontext. Die App läuft standardmäßig mit Mock-/Staticdaten. Für den MVP-Testbetrieb kann Supabase/PostgreSQL explizit als Datenquelle aktiviert werden, ohne Supabase Auth, Sessions, Cookies oder Passwörter.

## Aktueller Stand

- Aktive App: Next.js unter `src/`
- Standard-Datenquelle: Mock-/Staticdaten aus `src/data/schools.ts`
- PostgreSQL/Supabase: bevorzugte Zielrichtung; API-Routen können dauerhaft aus PostgreSQL lesen und Bedarfsmeldungen schreiben
- Cloudflare D1: vorbereitete Alternative, nicht priorisierte Zielarchitektur
- Legacy-Demo: nur Referenz unter `legacy/`
- Keine produktive Authentifizierung, keine Sessions, keine Cookies, keine Passwörter

Im Testbetrieb dürfen keine echten Schüler-, Lehrkraft- oder sonstigen personenbezogenen Daten eingetragen werden.

## Lokale Installation

```bash
npm install
```

## App starten

```bash
npm run dev
```

Die App bleibt ohne weitere Konfiguration im Mock-Betrieb. Keine `DATABASE_URL` setzen, solange nicht bewusst an einer isolierten PostgreSQL-/Supabase-Testdatenbank gearbeitet wird.

Optional kann die UI gegen die vorbereiteten API-Routen lesen und schreiben:

```bash
NEXT_PUBLIC_USE_API=true npm run dev
```

## Nutzbaren MVP mit Supabase/PostgreSQL starten

Voraussetzung ist eine lokale, nicht versionierte `.env.local` mit der isolierten Testdatenbank:

```env
DATABASE_URL="postgresql://<USER>:<PASSWORT>@<HOST>:5432/<DB>?sslmode=require"
```

Migration und Seed nur bewusst gegen diese Testdatenbank ausführen:

```bash
set -a && . ./.env.local && set +a
npm run db:pg:migrate
SEED_PG_CONFIRM=seed-test-postgres npm run db:pg:seed
```

Danach den MVP mit API und PostgreSQL-Datenquelle starten:

```bash
DATA_SOURCE=postgres NEXT_PUBLIC_USE_API=true npm run dev
```

In diesem Modus laden `GET /api/schools` und `GET /api/training-needs` aus PostgreSQL. `POST /api/training-needs` speichert neue Bedarfsmeldungen dauerhaft.

## Prüfen

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
| `npm run dev` | Startet die lokale Next.js-Entwicklung. | Ungefährlich, nutzt standardmäßig Mockdaten. |
| `npm run build` | Erstellt den Produktionsbuild. | Ungefährlich, aktiviert keine DB-Verbindung. |
| `npm run start` | Startet einen gebauten Next.js-Server. | Nur nach `npm run build`. |
| `npm run lint` | Vorhandener Lint-Befehl. | Kann je nach Next-Version Anpassung brauchen. |
| `npm run typecheck` | Führt `tsc --noEmit` aus. | Ungefährlich. |
| `npm run verify:db` | Führt `npm run db:pg:check` aus. | Prüft nur PostgreSQL-Migrationen. |
| `npm run verify:build` | Führt Typecheck und Build aus. | Ungefährlich. |
| `npm run verify` | Führt Typecheck, PostgreSQL-Migrationscheck und Build aus. | Führt keine Migration aus. |
| `npm run db:pg:generate` | Generiert PostgreSQL-Migrationen aus `schema.pg.ts`. | Nur nach Schemaänderungen nutzen. |
| `npm run db:pg:check` | Prüft PostgreSQL-Migrationen. | Sicherer Prüfbefehl ohne Migration. |
| `npm run db:generate` | Generiert D1/SQLite-Migrationen. | D1 ist nur Alternative. |
| `npm run db:pg:migrate` | Wendet PostgreSQL-Migrationen gegen `DATABASE_URL` an. | Nicht automatisch ausführen. |
| `npm run db:migrate:local` | Wendet D1-Migrationen lokal über Wrangler an. | Nicht automatisch ausführen. |
| `npm run db:pg:seed` | Schreibt Demo-Daten in eine PostgreSQL-Testdatenbank. | Gefährlich; nur nach bewusster Freigabe und nie mit echten personenbezogenen Daten. |

## Datenbankstrategie

Supabase/PostgreSQL ist die bevorzugte Richtung. Dafür liegen `src/lib/db/schema.pg.ts`, `src/lib/db/postgresClient.ts`, `drizzle.pg.config.ts` und `drizzle-pg/migrations/` vor. Ohne lokal gesetzte `DATABASE_URL` und ohne `DATA_SOURCE=postgres` wird keine echte Verbindung für die API erwartet.

D1 bleibt als vorbereitete Alternative im Projekt: `src/lib/db/schema.ts`, `drizzle.config.ts`, `drizzle/migrations/` und `wrangler.toml`. Diese Richtung ist dokumentiert, aber aktuell nicht bevorzugt.

Migrationen und Seeds werden nicht automatisch ausgeführt. Besonders diese Befehle nur nach ausdrücklicher Freigabe nutzen:

```bash
npm run db:pg:migrate
npm run db:migrate:local
```

## Dokumentation

Der Einstieg in die Projektdokumentation liegt unter `docs/README.md`.

Wichtige Dateien für eine spätere Supabase/PostgreSQL-Anbindung:

- `src/lib/db/schema.pg.ts`
- `src/lib/db/postgresClient.ts`
- `drizzle.pg.config.ts`
- `drizzle-pg/migrations/`
- `docs/ARCHITEKTUR_DATENBANK.md`
- `docs/SUPABASE_SETUP.md`
- `docs/TESTPLAN.md`

Keine Zugangsdaten committen. Eine echte Supabase-`DATABASE_URL` gehört nur lokal in `.env.local`.
