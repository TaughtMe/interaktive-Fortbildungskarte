# Supabase-Testanbindung

Stand: 2026-05-22  
Status: Planung fuer eine spaetere, bewusst freigegebene Testmigration. Diese Anleitung aktiviert keine Supabase-Verbindung und enthaelt keine echten Zugangsdaten.

Nicht im Rahmen dieses Dokuments automatisch ausfuehren: `npm run db:pg:migrate`, `npm run db:pg:seed`, `npm run db:migrate:local`.

## Ziel

Die vorbereitete PostgreSQL-Migration unter `drizzle-pg/migrations/` soll spaeter gegen eine isolierte Supabase-Testdatenbank angewendet werden. Die App bleibt bis dahin ohne aktive Supabase-Verbindung, ohne Supabase Auth und ohne produktive Datenbankpflicht.

## Voraussetzungen

- Supabase-Testprojekt, klar getrennt von Produktion und echten Schulamtsdaten
- Lokale Node-Abhaengigkeiten installiert
- PostgreSQL-Drizzle-Konfiguration in `drizzle.pg.config.ts`
- Versionierte Migrationen unter `drizzle-pg/migrations/`
- Keine echten personenbezogenen Daten im Testbetrieb

## 1. Supabase-Testprojekt anlegen

1. In Supabase ein neues Projekt nur fuer Tests anlegen.
2. Eine Region waehlen, die zur spaeteren Datenschutzbewertung passt.
3. Projekt eindeutig als Testumgebung benennen, zum Beispiel `fortbildungskarte-test`.
4. Keine produktiven Daten importieren.
5. Supabase Auth nicht konfigurieren, solange die App keine echte Authentifizierung nutzt.

## 2. DATABASE_URL sicher lokal speichern

Die Datenbank-Verbindungszeichenfolge wird ausschliesslich lokal gespeichert. Sie darf nicht in `.env.example`, Dokumentation, Quellcode, Commits, Tickets oder Chatprotokolle kopiert werden.

1. Lokal eine Datei `.env.local` im Projektwurzelverzeichnis anlegen.
2. Dort die Supabase-PostgreSQL-URL als `DATABASE_URL` eintragen.
3. Den Platzhalter durch die echte URL aus dem Supabase-Dashboard ersetzen.

Beispiel mit absichtlichem Platzhalter:

```env
DATABASE_URL="postgresql://postgres:<PASSWORT>@<HOST>:5432/postgres?sslmode=require"
```

Nicht committen:

- `.env`
- `.env.local`
- `.env.*.local`
- `.dev.vars`
- lokale DB-Dateien, Dumps und `.wrangler/`

Diese Dateien sind in `.gitignore` ausgeschlossen und muessen lokal bleiben.

## 3. Vor der Migration pruefen

Vor dem Anwenden der Migration:

1. Sicherstellen, dass das Zielprojekt wirklich die Supabase-Testdatenbank ist.
2. Pruefen, dass keine Produktions-URL in `.env.local` steht.
3. Pruefen, dass `drizzle.pg.config.ts` auf `./src/lib/db/schema.pg.ts` und `./drizzle-pg/migrations` zeigt.
4. Pruefen, dass `drizzle-pg/migrations/0000_secret_hitman.sql` die erwarteten Tabellen enthaelt:
   - `schools`
   - `users`
   - `sessions`
   - `training_needs`
   - `training_offers`
   - `audit_logs`
5. Optional vorbereitend ausfuehren:

```bash
npm run db:pg:check
```

## 4. Migration spaeter anwenden

Erst nach ausdruecklicher Freigabe und nur mit lokaler `.env.local`:

```bash
npm run db:pg:migrate
```

Dieser Befehl verwendet `drizzle.pg.config.ts` und erwartet `DATABASE_URL` aus der lokalen Umgebung. Er darf nicht ausgefuehrt werden, solange die Zielumgebung nicht eindeutig als Testdatenbank bestaetigt ist.

## 5. Testdaten danach seeden

Nach erfolgreicher Migration kann die Testdatenbank optional mit vorbereiteten Schul-Stammdaten und Demo-Bedarfsmeldungen befuellt werden. Die Reihenfolge ist immer:

1. Migration ausfuehren.
2. Tabellen pruefen.
3. Seed nur fuer die bestaetigte Testdatenbank ausfuehren.

Der Seed enthaelt Schul-Stammdaten aus dem bestehenden Mock-/Staticdatenbestand und synthetische Demo-Bedarfsmeldungen. Keine echten personenbezogenen Daten ergaenzen oder importieren.

Der Seed ist bewusst als gefaehrlicher Befehl markiert und verlangt eine lokale `DATABASE_URL` sowie eine zusaetzliche Bestaetigung:

```bash
SEED_PG_CONFIRM=seed-test-postgres npm run db:pg:seed
```

Vorher muss `DATABASE_URL` bewusst lokal gesetzt sein, zum Beispiel ueber `.env.local` oder die eigene Shell-Umgebung. Den Befehl nicht gegen Produktion ausfuehren.

## 6. Tabellen danach pruefen

Nach erfolgreicher Migration im Supabase-Dashboard oder per sicherem lokalen SQL-Client pruefen:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Erwartete Tabellen:

- `audit_logs`
- `schools`
- `sessions`
- `training_needs`
- `training_offers`
- `users`

Optional die Drizzle-Migrationstabelle pruefen, falls Drizzle sie angelegt hat:

```sql
select *
from drizzle.__drizzle_migrations
order by created_at;
```

Nach einem Seed-Lauf koennen die Datensaetze stichprobenartig geprueft werden:

```sql
select count(*) from schools;
select count(*) from training_needs;
```

## 7. Rollback und Reset fuer die Testdatenbank

Fuer diese erste Testmigration ist kein automatischer produktiver Rollback-Prozess definiert. Fuer eine reine Testdatenbank gibt es zwei sichere Wege:

1. Supabase-Testprojekt komplett loeschen und neu anlegen.
2. Testdatenbank manuell zuruecksetzen, nachdem bestaetigt wurde, dass keine echten Daten enthalten sind.

Ein manueller Reset darf nur in der Testdatenbank erfolgen. Vorher die Projekt-ID, den Projektnamen und die Verbindungs-URL nochmals pruefen.

Beispiel fuer einen vollstaendigen Tabellen-Reset in einer Testdatenbank:

```sql
drop table if exists audit_logs cascade;
drop table if exists sessions cascade;
drop table if exists training_offers cascade;
drop table if exists training_needs cascade;
drop table if exists users cascade;
drop table if exists schools cascade;
drop schema if exists drizzle cascade;
```

Danach kann die Migration erneut mit `npm run db:pg:migrate` angewendet werden, sofern die Testumgebung erneut bestaetigt wurde.

## 8. DSGVO-Hinweis

Im Testbetrieb duerfen keine echten personenbezogenen Daten verarbeitet werden. Das gilt insbesondere fuer Namen, E-Mail-Adressen, Telefonnummern, Rollenbeziehungen, Schulzuordnungen, Audit-Eintraege und Freitextfelder. Fuer Tests nur synthetische oder oeffentlich unkritische Beispieldaten verwenden.

## Sicherheitscheck vor jedem Commit

Vor einem Commit:

```bash
git status --short
```

Es duerfen keine lokalen Env-Dateien oder Zugangsdaten auftauchen. Falls versehentlich Secrets in eine versionierte Datei kopiert wurden, nicht committen und die Datei zuerst bereinigen.
