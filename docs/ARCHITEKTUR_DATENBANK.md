# Architektur-Entscheidung Datenbank

Stand: 2026-05-22  
Status: **Entscheidungsvorbereitung** - bevorzugte Richtung ist Supabase PostgreSQL, aber noch ohne produktive Verbindung.

## Kurzentscheidung

Für die Fortbildungsbedarfskarte ist **Supabase PostgreSQL + Drizzle** die bevorzugte nächste Richtung. Cloudflare D1 bleibt vorerst als nachvollziehbarer Alternativstand im Projekt, wird aber nicht weiter als Zielarchitektur priorisiert. Ein später eigener PostgreSQL-Server bleibt eine realistische Ausbauoption, wenn Betrieb, Hosting und Datenschutz organisatorisch vollständig geklärt sind.

Wichtig: Die App läuft weiterhin mit Mock-/Staticdaten. Es gibt keine echte Authentifizierung, keine Supabase Auth, keine Passwörter, keine Sessions, keine Cookies und keine erzwungene produktive Datenbankverbindung.

## Bewertungsmatrix

| Kriterium | Cloudflare D1 | Supabase PostgreSQL | Später eigener PostgreSQL-Server |
|---|---|---|---|
| Aufwand | Niedrig bis mittel: Schema und erste Migration liegen bereits vor. | Mittel: PostgreSQL-Schema ist vorzubereiten, echte Verbindung und Migration folgen später. | Hoch: Betrieb, Updates, Backups, Monitoring und Sicherheit müssen selbst organisiert werden. |
| Migration | Von SQLite/D1 zu PostgreSQL braucht Typanpassungen, vor allem Zeitstempel und numerische Felder. | Gute Zielbasis: Standard-SQL, Drizzle-Unterstützung und spätere Portabilität zu eigenem PostgreSQL. | Von Supabase PostgreSQL am einfachsten, sofern keine Supabase-spezifischen Funktionen hart verdrahtet werden. |
| DSGVO-Risiko | Cloudflare-Hosting und Edge-Kontext müssen für Schulamtsdaten genau geprüft werden. | Supabase kann passend sein, wenn Region, AVV, Rollen und Datenminimierung sauber geklärt sind. | Potenziell am besten kontrollierbar, aber nur mit belastbarem Betriebskonzept. |
| Wartung | Wenig Infrastrukturaufwand, aber D1 ist fachlich weniger flexibel als PostgreSQL. | Moderater Aufwand: Managed PostgreSQL, Backups und Admin-Werkzeuge sind verfügbar. | Hoher Aufwand: eigene Verantwortung für Verfügbarkeit, Patches, Backups und Incident-Prozesse. |
| Zukunftsfähigkeit | Gut für einfache Edge-nahe Daten, begrenzt bei komplexeren Auswertungen und Portabilität. | Sehr gut für relationale Daten, Auswertungen, spätere Schnittstellen und mögliche Eigenhosting-Migration. | Sehr gut technisch, aber organisatorisch anspruchsvoll. |
| Eignung Schulamt/Fortbildungsbedarfskarte | Für einen schlanken Prototyp brauchbar. | Beste Balance aus Standarddatenbank, Entwicklungsproduktivität und späterer Portabilität. | Geeignet als spätere Betriebsstufe, nicht als schnellster nächster Schritt. |

## Aktueller D1/Drizzle-Stand

| Bereich | Stand |
|---|---|
| `src/lib/db/schema.ts` | D1/SQLite-Schema mit `sqliteTable`, `text`, `integer`, `real`; IDs und Zeitstempel als `TEXT`. |
| `drizzle.config.ts` | Drizzle-Kit ist auf `dialect: 'sqlite'` und `driver: 'd1-http'` konfiguriert. Credentials sind Platzhalter. |
| `wrangler.toml` | Lokale D1-Bindung `DB` mit Platzhalter-Database-ID. |
| `drizzle/migrations/` | Erste D1/SQLite-Migration für `schools`, `users`, `sessions`, `training_needs`, `training_offers`, `audit_logs`. |
| `src/lib/db/seed/` | Seeds für Schulen und Trainingsbedarfe aus den bestehenden Mock-/Staticdaten. |
| `src/lib/db/mappers/` | Mapper von DB-Rows auf bestehende UI-Typen, noch ohne produktiven Datenbankzwang. |

Dieser D1-Stand bleibt als Alternative erhalten und wird nicht blind gelöscht. Dokumentarisch ist er ab jetzt die **nicht bevorzugte Richtung**.

## PostgreSQL-Vorbereitung

Neu vorbereitet ist `src/lib/db/schema.pg.ts` als PostgreSQL-Drizzle-Schema mit `pgTable`, `text`, `timestamp`, `integer` und `doublePrecision`.

Zusätzlich gibt es eine separate PostgreSQL-Drizzle-Konfiguration in `drizzle.pg.config.ts`. Sie zeigt auf `./src/lib/db/schema.pg.ts`, schreibt künftige PostgreSQL-Migrationen nach `./drizzle-pg/migrations` und nutzt `process.env.DATABASE_URL` nur als vorbereiteten Anschlusswert. Wenn `DATABASE_URL` fehlt, wird eine absichtlich ungültige Platzhalter-URL verwendet, damit keine versehentliche produktive Verbindung entsteht.

Die vorhandenen Fach-Tabellen wurden übertragen:

| Tabelle | PostgreSQL-Abbildung |
|---|---|
| `schools` | Schulstammdaten mit Koordinaten als `doublePrecision` und Zeitstempeln als `timestamp with time zone`. |
| `users` | Fachliche Nutzerrollen ohne echte Auth-Implementierung. |
| `sessions` | Nur Schema-Vorbereitung; keine Session-Logik aktiv. |
| `training_needs` | Fortbildungsbedarfe pro Schule. |
| `training_offers` | Fortbildungsangebote, optional an Bedarf gekoppelt. |
| `audit_logs` | Audit-Schema, noch ohne Write-Pfad. |

IDs bleiben zunächst `text`, weil vorhandene Schul-IDs stabile sprechende Slugs sind und die Seed-/Mockdaten ohne künstliche UUID-Migration weiter nutzbar bleiben. Für neu entstehende produktive Entitäten kann später entschieden werden, ob UUIDs eingeführt werden.

Die erste PostgreSQL-Migration wurde lokal vorbereitet und liegt versionierbar unter `drizzle-pg/migrations`. Sie wurde noch nicht gegen eine echte Datenbank angewendet. Die Anwendung läuft weiterhin standardmäßig mit Mock-/Staticdaten und ohne aktive PostgreSQL- oder Supabase-Verbindung.

## Nicht umgesetzt

- Keine produktive Supabase-Verbindung
- Keine Supabase-Migration
- Keine echten Supabase-Credentials
- Keine Supabase Auth
- Keine Passwörter, Sessions oder Cookies
- Keine Änderung der laufenden Mock-/Staticdaten-Strategie

## Drizzle-Befehle

| Befehl | Zweck | Nutzung |
|---|---|---|
| `npm run db:pg:generate` | Erzeugt PostgreSQL-Migrationen aus `schema.pg.ts`. | Sicher vorbereitend, solange keine Migration angewendet wird. |
| `npm run db:pg:check` | Prüft die PostgreSQL-Migrationsdateien. | Sicher vorbereitend. |
| `npm run db:pg:migrate` | Wendet PostgreSQL-Migrationen gegen `DATABASE_URL` an. | Erst nach bewusster Freigabe und mit geprüfter Zielumgebung nutzen. |

Echte Migrationen gegen Supabase erfolgen erst nach ausdrücklicher Freigabe. D1 bleibt bis dahin als Alternative dokumentiert und technisch vorhanden.

## Empfehlung

Der nächste sinnvolle Schritt ist eine bewusst freigegebene lokale PostgreSQL-Testmigration, nicht direkt Supabase-Produktion. Dafür sollte zuerst geklärt werden, ob gegen eine lokale PostgreSQL-Instanz oder eine isolierte Supabase-Testinstanz gearbeitet wird.
