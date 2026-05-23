# Supabase-Testanbindung

Stand: 2026-05-22  
Status: Anleitung für den MVP-Testbetrieb mit bewusst freigegebener Supabase-Testdatenbank. Diese Datei enthält keine echten Zugangsdaten.

Nicht im Rahmen dieses Dokuments automatisch ausführen: `npm run db:pg:migrate`, `npm run db:pg:seed`, `npm run db:migrate:local`.

## Ziel

Die PostgreSQL-Migration unter `drizzle-pg/migrations/` wird gegen eine isolierte Supabase-Testdatenbank angewendet. Danach kann die App mit `DATA_SOURCE=postgres` und `NEXT_PUBLIC_USE_API=true` Schulen und Bedarfsmeldungen dauerhaft aus PostgreSQL lesen und neue Bedarfsmeldungen speichern. Supabase Auth bleibt deaktiviert.

## Voraussetzungen

- Supabase-Testprojekt, klar getrennt von Produktion und echten Schulamtsdaten
- Lokale Node-Abhängigkeiten installiert
- PostgreSQL-Drizzle-Konfiguration in `drizzle.pg.config.ts`
- Versionierte Migrationen unter `drizzle-pg/migrations/`
- Keine echten personenbezogenen Daten im Testbetrieb

## 1. Supabase-Testprojekt anlegen

1. In Supabase ein neues Projekt nur für Tests anlegen.
2. Eine Region wählen, die zur späteren Datenschutzbewertung passt.
3. Projekt eindeutig als Testumgebung benennen, zum Beispiel `fortbildungskarte-test`.
4. Keine produktiven Daten importieren.
5. Supabase Auth nicht konfigurieren, solange die App keine echte Authentifizierung nutzt.

## 2. DATABASE_URL sicher lokal speichern

Die Datenbank-Verbindungszeichenfolge wird ausschließlich lokal gespeichert. Sie darf nicht in `.env.example`, Dokumentation, Quellcode, Commits, Tickets oder Chatprotokolle kopiert werden.

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

Diese Dateien sind in `.gitignore` ausgeschlossen und müssen lokal bleiben.

## 3. Vor der Migration prüfen

Vor dem Anwenden der Migration:

1. Sicherstellen, dass das Zielprojekt wirklich die Supabase-Testdatenbank ist.
2. Prüfen, dass keine Produktions-URL in `.env.local` steht.
3. Prüfen, dass `drizzle.pg.config.ts` auf `./src/lib/db/schema.pg.ts` und `./drizzle-pg/migrations` zeigt.
4. Prüfen, dass `drizzle-pg/migrations/0000_secret_hitman.sql` die erwarteten Tabellen enthält:
   - `schools`
   - `users`
   - `sessions`
   - `training_needs`
   - `training_offers`
   - `audit_logs`
5. Optional vorbereitend ausführen:

```bash
npm run db:pg:check
```

## 4. Migration anwenden

Erst nach ausdrücklicher Freigabe und nur mit lokaler `.env.local`:

```bash
set -a && . ./.env.local && set +a
npm run db:pg:migrate
```

Dieser Befehl verwendet `drizzle.pg.config.ts` und erwartet `DATABASE_URL` aus der lokalen Umgebung. Er darf nicht ausgeführt werden, solange die Zielumgebung nicht eindeutig als Testdatenbank bestätigt ist.

## 5. Testdaten danach seeden

Nach erfolgreicher Migration kann die Testdatenbank optional mit vorbereiteten Schul-Stammdaten und Demo-Bedarfsmeldungen befüllt werden. Die Reihenfolge ist immer:

1. Migration ausführen.
2. Tabellen prüfen.
3. Seed nur für die bestätigte Testdatenbank ausführen.

Der Seed enthält Schul-Stammdaten aus dem bestehenden Mock-/Staticdatenbestand und synthetische Demo-Bedarfsmeldungen. Keine echten personenbezogenen Daten ergänzen oder importieren.

Der Seed ist bewusst als gefährlicher Befehl markiert und verlangt eine lokale `DATABASE_URL` sowie eine zusätzliche Bestätigung:

```bash
SEED_PG_CONFIRM=seed-test-postgres npm run db:pg:seed
```

Vorher muss `DATABASE_URL` bewusst lokal gesetzt sein, zum Beispiel über `.env.local` oder die eigene Shell-Umgebung. Den Befehl nicht gegen Produktion ausführen.

## 6. Tabellen danach prüfen

Nach erfolgreicher Migration im Supabase-Dashboard oder per sicherem lokalen SQL-Client prüfen:

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

Optional die Drizzle-Migrationstabelle prüfen, falls Drizzle sie angelegt hat:

```sql
select *
from drizzle.__drizzle_migrations
order by created_at;
```

Nach einem Seed-Lauf können die Datensätze stichprobenartig geprüft werden:

```sql
select count(*) from schools;
select count(*) from training_needs;
```

## 7. PostgreSQL als Datenquelle aktivieren

Nach Migration und Seed kann der MVP im PostgreSQL-Modus gestartet werden:

```bash
set -a && . ./.env.local && set +a
DATA_SOURCE=postgres NEXT_PUBLIC_USE_API=true npm run dev
```

In diesem Modus nutzt die UI die API-Routen. Die API liest `schools` und `training_needs` aus PostgreSQL und schreibt neue Bedarfsmeldungen in `training_needs`.

## 8. Rollback und Reset für die Testdatenbank

Für diese erste Testmigration ist kein automatischer produktiver Rollback-Prozess definiert. Für eine reine Testdatenbank gibt es zwei sichere Wege:

1. Supabase-Testprojekt komplett löschen und neu anlegen.
2. Testdatenbank manuell zurücksetzen, nachdem bestätigt wurde, dass keine echten Daten enthalten sind.

Ein manueller Reset darf nur in der Testdatenbank erfolgen. Vorher die Projekt-ID, den Projektnamen und die Verbindungs-URL nochmals prüfen.

Beispiel für einen vollständigen Tabellen-Reset in einer Testdatenbank:

```sql
drop table if exists audit_logs cascade;
drop table if exists sessions cascade;
drop table if exists training_offers cascade;
drop table if exists training_needs cascade;
drop table if exists users cascade;
drop table if exists schools cascade;
drop schema if exists drizzle cascade;
```

Danach kann die Migration erneut mit `npm run db:pg:migrate` angewendet werden, sofern die Testumgebung erneut bestätigt wurde.

## 9. DSGVO-Hinweis

Im Testbetrieb dürfen keine echten personenbezogenen Daten verarbeitet werden. Das gilt insbesondere für Namen, E-Mail-Adressen, Telefonnummern, Rollenbeziehungen, Schulzuordnungen, Audit-Einträge und Freitextfelder. Für Tests nur synthetische oder öffentlich unkritische Beispieldaten verwenden.

## Sicherheitscheck vor jedem Commit

Vor einem Commit:

```bash
git status --short
```

Es dürfen keine lokalen Env-Dateien oder Zugangsdaten auftauchen. Falls versehentlich Secrets in eine versionierte Datei kopiert wurden, nicht committen und die Datei zuerst bereinigen.
