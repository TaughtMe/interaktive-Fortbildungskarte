# Datenmodell – Schulamt Fortbildungskarte

Stand: 2026-05  
Status: **Vorbereitung** - noch keine echte Datenbankverbindung; alle Daten sind Mock-/Staticdaten. PostgreSQL/Supabase ist die bevorzugte Zielrichtung, D1 bleibt eine vorbereitete Alternative.

---

## Tabellenübersicht

| Tabelle            | Status            | Beschreibung                                    |
|--------------------|-------------------|-------------------------------------------------|
| `districts`        | Vorbereitung      | Schulamtsbezirke fuer Mandantentrennung und spaetere GeoJSON-Grenzen |
| `schools`          | Mock (statisch)   | Alle Schulen des Schulamts                      |
| `users`            | Noch nicht aktiv  | Angemeldete Nutzerinnen und Nutzer              |
| `sessions`         | Noch nicht aktiv  | Nur Schema-Vorbereitung für spätere Sessions  |
| `training_needs`   | Mock (React-State)| Gemeldeter Fortbildungsbedarf pro Schule        |
| `training_offers`  | Noch nicht aktiv  | Angebotene Fortbildungen als Antwort auf Bedarf |
| `audit_logs`       | Noch nicht aktiv  | Protokoll aller Änderungsoperationen            |

---

## Entities und wichtigste Felder

### schools

| Feld         | Typ          | Pflicht | Hinweis                              |
|--------------|--------------|---------|--------------------------------------|
| `id`         | TEXT (UUID)  | ja      | z. B. `"bb-gs"`, `"memmingen-ms-1"` |
| `district_id`| TEXT NULL    | nein    | FK -> `districts.id`; nullable als Uebergangsstrategie |
| `name`       | TEXT         | ja      |                                      |
| `ort`        | TEXT         | ja      |                                      |
| `typ`        | TEXT         | ja      | `G` / `M` / `GM`                    |
| `lat`, `lng` | REAL         | ja      | WGS-84-Koordinaten                   |
| `adresse`    | TEXT         | ja      |                                      |
| `tel`        | TEXT         | ja      |                                      |
| `fax`        | TEXT NULL    | nein    |                                      |
| `mail`       | TEXT         | ja      |                                      |
| `web`        | TEXT NULL    | nein    |                                      |
| `leitung`    | TEXT NULL    | nein    | NULL = nicht hinterlegt              |
| `created_at` | TEXT (ISO-8601) | ja   |                                      |
| `updated_at` | TEXT (ISO-8601) | ja   |                                      |

> **Aktuell:** Die UI verwendet `src/data/schools.ts` (statisches Array, 52 Schulen).  
> `fax`, `web`, `leitung` sind im UI-Layer als `string` typisiert (Leerstring / `'—'` als Fallback).  
> Der `SchoolRow`-Typ in `src/lib/db/schema.types.ts` verwendet bereits `string | null`.

---

### users

| Feld           | Typ          | Pflicht | Hinweis                                    |
|----------------|--------------|---------|---------------------------------------------|
| `id`           | TEXT (UUID)  | ja      |                                             |
| `email`        | TEXT         | ja      | UNIQUE                                      |
| `display_name` | TEXT         | ja      |                                             |
| `role`         | TEXT         | ja      | neue Rollen plus Legacy-Demo-Rollen |
| `district_id`  | TEXT NULL    | nein    | FK -> `districts.id`; fuer Bezirksrollen |
| `school_id`    | TEXT NULL    | nein    | FK -> `schools.id`; fuer `school_user`/Legacy `school` |
| `created_at`   | TEXT         | ja      |                                             |
| `updated_at`   | TEXT         | ja      |                                             |

> **Aktuell:** Kein echter User-Store. Die App verwendet `DemoUser` aus `src/types/auth.ts`
> ausschließlich für die Demo-Rollenauswahl im UI. Kein Login, keine Passwörter, keine Sessions.

### districts

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `id` | TEXT | ja | z. B. `district-unterallgaeu` |
| `name` | TEXT | ja | Anzeigename |
| `slug` | TEXT | ja | UNIQUE, URL-/Admin-tauglicher Kurzname |
| `description` | TEXT NULL | nein | Freitext |
| `color` | TEXT NULL | nein | Karten-/UI-Farbe |
| `boundary_geojson` | JSONB NULL | nein | Spaetere GeoJSON-Grenze fuer Leaflet |
| `created_at` | TIMESTAMP | ja | PostgreSQL: timestamp with time zone |
| `updated_at` | TIMESTAMP | ja | PostgreSQL: timestamp with time zone |

---

### sessions

| Feld         | Typ         | Pflicht | Hinweis                     |
|--------------|-------------|---------|------------------------------|
| `id`         | TEXT (UUID) | ja      |                              |
| `user_id`    | TEXT        | ja      | FK → `users.id`              |
| `expires_at` | TEXT        | ja      | ISO-8601                     |
| `created_at` | TEXT        | ja      |                              |

> **Aktuell:** Noch nicht implementiert. Es gibt keine produktive Authentifizierung, keine Sessions und keine Cookies.

---

### training_needs

| Feld               | Typ         | Pflicht | Hinweis                                           |
|--------------------|-------------|---------|---------------------------------------------------|
| `id`               | TEXT (UUID) | ja      |                                                   |
| `school_id`        | TEXT        | ja      | FK → `schools.id`                                 |
| `created_by`       | TEXT NULL   | nein    | FK → `users.id`; NULL bis Auth vorhanden ist      |
| `topic`            | TEXT        | ja      |                                                   |
| `description`      | TEXT        | ja      |                                                   |
| `priority`         | TEXT        | ja      | `hoch` / `mittel` / `niedrig`                     |
| `target_group`     | TEXT        | ja      |                                                   |
| `preferred_format` | TEXT        | ja      | `praesenz` / `online` / `schilf` / `beratung`     |
| `status`           | TEXT        | ja      | `open` / `acknowledged` / `fulfilled` / `closed`  |
| `created_at`       | TEXT        | ja      |                                                   |
| `updated_at`       | TEXT        | ja      |                                                   |

> **Aktuell:** Im React-State in `page.tsx` gehalten (`Record<schoolId, SchoolFortbildungen>`).  
> Demo-Daten aus `src/data/schools.ts → FORTBILDUNGEN_DEFAULT`.  
> `status` und `createdBy` sind im UI-Typ `TrainingNeed` als optional definiert  
> (fehlen in Demo-Daten, werden in DB-Rows Pflichtfelder sein).

---

### training_offers

| Feld                | Typ         | Pflicht | Hinweis                                          |
|---------------------|-------------|---------|--------------------------------------------------|
| `id`                | TEXT (UUID) | ja      |                                                  |
| `training_need_id`  | TEXT NULL   | nein    | FK → `training_needs.id`; NULL = proaktives Angebot |
| `title`             | TEXT        | ja      |                                                  |
| `description`       | TEXT        | ja      |                                                  |
| `date`              | TEXT NULL   | nein    | ISO-8601                                         |
| `location`          | TEXT NULL   | nein    |                                                  |
| `max_participants`  | INTEGER NULL| nein    |                                                  |
| `format`            | TEXT        | ja      | wie `training_needs.preferred_format`            |
| `status`            | TEXT        | ja      | `planned` / `confirmed` / `completed` / `cancelled` |
| `created_at`        | TEXT        | ja      |                                                  |
| `updated_at`        | TEXT        | ja      |                                                  |

> **Aktuell:** Noch kein UI, noch keine Daten. Typ in `schema.types.ts` definiert.

---

### audit_logs

| Feld          | Typ         | Pflicht | Hinweis                                 |
|---------------|-------------|---------|------------------------------------------|
| `id`          | TEXT (UUID) | ja      |                                          |
| `user_id`     | TEXT NULL   | nein    | FK → `users.id`; NULL bei anonymen Aktionen |
| `action`      | TEXT        | ja      | z. B. `training_need.created`            |
| `entity_type` | TEXT        | ja      | z. B. `training_need`                    |
| `entity_id`   | TEXT        | ja      |                                          |
| `details`     | TEXT NULL   | nein    | JSON-String mit zusätzlichem Kontext     |
| `created_at`  | TEXT        | ja      |                                          |

> **Aktuell:** Typ in `schema.types.ts` definiert, kein Write-Pfad vorhanden.

---

## Beziehungen

```
districts ──< schools          (1 Bezirk : n Schulen, nullable in der Uebergangsphase)
districts ──< users            (1 Bezirk : n Bezirksnutzer, nullable fuer Superadmin)
schools   ──< training_needs   (1 Schule : n Bedarfe)
schools   ──< users            (1 Schule : n Nutzer mit Rolle 'school_user')
users   ──< sessions           (1 User : n Sessions)
training_needs >──< training_offers  (1 Bedarf : 0-n Angebote; oder Angebot ohne Bedarf)
users   ──< audit_logs         (1 User : n Logeinträge, nullable)
```

---

## Rollenmodell

| Rolle | Sichtbarkeit | Aktionen |
|---|---|---|
| `superadmin` | Alle Bezirke, Schulen und Bedarfsmeldungen | Bezirke/Schulen/Nutzer spaeter verwalten, Exporte fuer alle Bezirke |
| `district_admin` | Eigener Schulamtsbezirk | Bezirk fachlich verwalten, Bedarfsmeldungen im Bezirk exportieren |
| `coordinator` | Eigener Schulamtsbezirk | Bedarfsmeldungen koordinieren und exportieren |
| `school_user` | Eigene Schule | Bedarf fuer eigene Schule melden und eigene Daten sehen |
| `viewer` | Eigener Schulamtsbezirk | Lesender Zugriff, Export vorbereitet, keine Schreibrechte |
| `public` | Oeffentliche Demo-Ansichten | Keine Schreibrechte; kein DB-User |

Legacy-Demo-Rollen bleiben kompatibel: `admin` und `leadership` werden fachlich wie `superadmin` behandelt, `school` wie `school_user`. Diese Abbildung erfolgt in `src/types/auth.ts` ueber `normalizeRole()`. Eine echte Login- oder Session-Logik ist nicht eingebaut.

---

## Was aktuell noch Mock-Daten sind

| Bereich              | Quelle                              | Späterer DB-Ersatz                      |
|----------------------|-------------------------------------|------------------------------------------|
| Schulliste (52)      | `src/data/schools.ts → SCHULEN`     | `SELECT * FROM schools` über PostgreSQL/Supabase |
| Fortbildungsbedarfe  | React-State, init aus `FORTBILDUNGEN_DEFAULT` | `SELECT * FROM training_needs WHERE school_id = ?` |
| Laufende Fortbildungen | React-State (kein DB-Pendant)     | Künftig `training_offers` mit `status = 'confirmed'` |
| Nutzer / Rollen      | `DEMO_USERS` in `src/types/auth.ts` | Späteres User-/Rollenmodell nach Auth-Entscheidung |
| Bezirke              | `DEMO_DISTRICTS` in `src/lib/districts/districtAssignments.ts` | `districts` |
| Sessions             | Nicht vorhanden                     | Erst nach separatem Auth-/Session-Konzept |

---

## Was Drizzle vorbereitet

1. **PostgreSQL-Schema:** `src/lib/db/schema.pg.ts` mit Drizzle-`pgTable()`-Definitionen als bevorzugte Zielrichtung
2. **PostgreSQL-Migrationen:** `drizzle-pg/migrations/` - generiert via `npm run db:pg:generate`, geprüft via `npm run db:pg:check`
3. **D1-Alternative:** `src/lib/db/schema.ts` und `drizzle/migrations/` bleiben vorbereitet, aber nicht priorisiert
4. **Repositories:** `src/lib/repositories/*.ts` markieren die späteren Server/API-Grenzen für echte DB-Zugriffe
5. **State-Init:** Demo-Initialisierung bleibt aktiv, bis ein separater Server/API-Pfad bewusst gebaut wird
6. **Auth:** Noch nicht produktiv umgesetzt; keine Sessions, Cookies, Passwörter oder Login-Logik

## Aktueller Datenfluss und Mandantenstellen

Der Standardpfad bleibt Mock-first: UI-Komponenten lesen statische Schulen aus `src/data/schools.ts` und Demo-Bedarfe aus dem lokalen State. Optionaler API-Modus (`NEXT_PUBLIC_USE_API=true`) liest `GET /api/schools` und `GET /api/training-needs`; mit `DATA_SOURCE=postgres` nutzt diese API `src/lib/db/postgresClient.ts`.

Fuer Mandantenfaehigkeit vorbereitet wurden diese Stellen:

- PostgreSQL-Schema: `districts`, `schools.district_id`, `users.district_id`, `users.school_id`
- Repositories: `getSchoolsByDistrict()` und `getTrainingNeedsByDistrict()`
- API: optionale Query `districtId` fuer Schulen, Bedarfsmeldungen und CSV-Export
- Access-Control: reine Funktionen in `src/lib/auth/accessControl.ts`
- Karte: `DistrictBoundaryLayer` fuer spaetere GeoJSON-Grenzen
- Dashboard: `SuperAdminDashboard` als Platzhalter fuer bezirksuebergreifende Sicht

Ohne `districtId` verhalten sich API und Mock-Modus wie bisher.

---

## Technische Umsetzung mit Drizzle

Status: vorbereitet, aber noch nicht produktiv aktiv. Die App nutzt weiterhin Mock-/Staticdaten aus `src/data/schools.ts` und React-State. Es gibt keine echte PostgreSQL-/Supabase- oder D1-Verbindung, keine produktive Authentifizierung, keine Sessions im Betrieb und keine Cookies/Login-Logik.

| Tabelle | Drizzle-Datei | geplanter Repository-Anschluss |
|---------|---------------|--------------------------------|
| `schools` | `src/lib/db/schema.pg.ts -> schools`, alternativ `src/lib/db/schema.ts -> schools` | `src/lib/repositories/schoolRepository.ts` liest später über eine Server/API-Grenze und mappt Rows auf UI-Typen |
| `users` | `src/lib/db/schema.pg.ts -> users`, alternativ `src/lib/db/schema.ts -> users` | Noch kein produktiver Anschluss; später User-Repository nach Auth-Entscheidung |
| `sessions` | `src/lib/db/schema.pg.ts -> sessions`, alternativ `src/lib/db/schema.ts -> sessions` | Noch kein produktiver Anschluss; erst nach Auth-/Session-Konzept |
| `training_needs` | `src/lib/db/schema.pg.ts -> trainingNeeds`, alternativ `src/lib/db/schema.ts -> trainingNeeds` | `src/lib/repositories/trainingNeedRepository.ts` liest/schreibt später über eine Server/API-Grenze |
| `training_offers` | `src/lib/db/schema.pg.ts -> trainingOffers`, alternativ `src/lib/db/schema.ts -> trainingOffers` | Später eigenes Repository bzw. Anschluss an Fortbildungsangebote/Dashboards |
| `audit_logs` | `src/lib/db/schema.pg.ts -> auditLogs`, alternativ `src/lib/db/schema.ts -> auditLogs` | Optionaler Write-Pfad nach Auth + Mutationen, aktuell ohne Nutzung |

Technische Dateien:

| Datei | Zweck |
|-------|-------|
| `src/lib/db/schema.pg.ts` | PostgreSQL-kompatible Drizzle-Tabellen mit `timestamp with time zone` und `doublePrecision`; bevorzugte Zielrichtung für Supabase/PostgreSQL |
| `drizzle.pg.config.ts` | PostgreSQL-Drizzle-Konfiguration; nutzt ohne `DATABASE_URL` einen absichtlich ungültigen Platzhalter |
| `drizzle-pg/migrations/` | Versionierte PostgreSQL-Migrationen; werden nur geprüft, nicht automatisch angewendet |
| `src/lib/db/schema.ts` | D1/SQLite-kompatible Drizzle-Tabellen mit `TEXT`-IDs, ISO-Datumswerten als `TEXT`, numerischen Feldern als `INTEGER`/`REAL` |
| `src/lib/db/mappers/schoolMapper.ts` | Übersetzt nullable DB-Felder (`fax`, `web`, `leitung`) in UI-kompatible Strings |
| `src/lib/db/mappers/trainingNeedMapper.ts` | Übersetzt Snake-Case-DB-Rows in den bestehenden `TrainingNeed`-UI-Typ |
| `drizzle.config.ts` | Drizzle-Kit-Konfiguration für Schema/Migrations-Generierung; nutzt nur Platzhalter-Credentials |
| `wrangler.toml` | Lokale Cloudflare-D1-Vorbereitung mit Platzhalter-Database-ID |

Migrationen werden in diesem Schritt nicht produktiv angewendet. PostgreSQL-Migrationen werden mit `npm run db:pg:check` nur geprüft. D1-Migrationen bleiben als Alternative versioniert.

---

## Stand

PostgreSQL-Schema (`src/lib/db/schema.pg.ts`) und Migrationen unter `drizzle-pg/migrations/` sind vorbereitet, ohne produktive Daten zu berühren. D1-Schema (`src/lib/db/schema.ts`) und `wrangler.toml` bleiben als Alternative erhalten. Der Anschluss der Repositories an eine echte Datenbank bleibt ein separater späterer Schritt.

---

## Lokale D1-Entwicklung als Alternative

Status: lokal vorbereitet, aber weiterhin nicht produktiv aktiv. Die Anwendung startet und baut ohne D1-Verbindung und nutzt unverändert Mock-/Staticdaten.

### Migrationen

| Bereich | Datei / Kommando | Hinweis |
|---------|------------------|---------|
| Drizzle-Schema | `src/lib/db/schema.ts` | Quelle für die SQLite/D1-Tabellen |
| Erste Migration | `drizzle/migrations/0000_silly_energizer.sql` | Erstellt aus dem Drizzle-Schema; nicht produktiv angewendet |
| Migration-Metadaten | `drizzle/migrations/meta/` | Von Drizzle Kit erzeugte Snapshots/Journal-Dateien |
| Migration generieren | `npm run db:generate` | Erzeugt neue Migrationsdateien aus Schemaänderungen |
| Lokal anwenden | `npm run db:migrate:local` | Wendet Migrationen auf eine lokale Wrangler-D1-Instanz an; nicht automatisch ausführen |

Es gibt absichtlich kein Deploy- oder Remote-Migrationsskript. Produktive D1-Datenbanken werden in diesem Stand nicht angesprochen.

### Seed-Daten

| Seed-Datei | Quelle | Ziel-Tabelle | Status |
|------------|--------|--------------|--------|
| `src/lib/db/seed/schoolsSeed.ts` | `src/data/schools.ts → SCHULEN` | `schools` | Vorbereitet als typisierte Insert-Rows |
| `src/lib/db/seed/trainingNeedsSeed.ts` | `src/data/schools.ts → FORTBILDUNGEN_DEFAULT` | `training_needs` | Vorbereitet als typisierte Demo-Bedarfe |

Die Seeds sind aktuell ein Konzept in TypeScript: Sie normalisieren Mock-Daten in D1-kompatible Insert-Formate, schreiben aber noch nicht selbst in eine Datenbank. Eine spätere lokale Seed-Ausführung kann daraus SQL- oder Drizzle-Insert-Kommandos ableiten.

### Mock-Fallback

| Bereich | Aktueller Runtime-Pfad | D1-Vorbereitung |
|---------|------------------------|-----------------|
| Schulliste | `src/data/schools.ts` über `schoolRepository.ts` | `schools`-Tabelle + `schoolsSeed` + `mapSchoolRowToSchool()` |
| Bedarfsmeldungen | React-State/Demo-Daten über `trainingNeedRepository.ts` | `training_needs`-Tabelle + `trainingNeedsSeed` + `mapTrainingNeedRowToTrainingNeed()` |
| Rollen | `DEMO_USERS` im UI-Layer | `users`-Tabelle vorbereitet, aber ohne Auth-Anschluss |
| Sessions | Nicht vorhanden | `sessions`-Tabelle vorbereitet, aber ohne Nutzung |
| Audit Logs | Nicht vorhanden | `audit_logs`-Tabelle vorbereitet, aber ohne Nutzung |

**Warnung:** Noch keine produktive Datenbank. Keine Authentifizierung, keine Sessions, keine Passwörter, keine Cookies und keine Login-Logik sind aktiv. PostgreSQL/Supabase ist bevorzugt vorbereitet; D1 bleibt in diesem Stand ausschließlich Alternative beziehungsweise lokal testbar.
