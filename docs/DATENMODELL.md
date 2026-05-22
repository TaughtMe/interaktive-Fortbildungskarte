# Datenmodell – Schulamt Fortbildungskarte

Stand: 2026-05  
Status: **Vorbereitung** – noch keine echte D1-Verbindung; alle Daten sind Mock-/Staticdaten.

---

## Tabellenübersicht

| Tabelle            | Status            | Beschreibung                                    |
|--------------------|-------------------|-------------------------------------------------|
| `schools`          | Mock (statisch)   | Alle Schulen des Schulamts                      |
| `users`            | Noch nicht aktiv  | Angemeldete Nutzerinnen und Nutzer              |
| `sessions`         | Noch nicht aktiv  | Login-Sessions (nach Authentifizierung)         |
| `training_needs`   | Mock (React-State)| Gemeldeter Fortbildungsbedarf pro Schule        |
| `training_offers`  | Noch nicht aktiv  | Angebotene Fortbildungen als Antwort auf Bedarf |
| `audit_logs`       | Noch nicht aktiv  | Protokoll aller Änderungsoperationen            |

---

## Entities und wichtigste Felder

### schools

| Feld         | Typ          | Pflicht | Hinweis                              |
|--------------|--------------|---------|--------------------------------------|
| `id`         | TEXT (UUID)  | ja      | z. B. `"bb-gs"`, `"memmingen-ms-1"` |
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
| `role`         | TEXT         | ja      | `school` / `coordinator` / `admin` / `leadership` |
| `school_id`    | TEXT NULL    | nein    | FK → `schools.id`; nur für Rolle `school`   |
| `created_at`   | TEXT         | ja      |                                             |
| `updated_at`   | TEXT         | ja      |                                             |

> **Aktuell:** Kein echter User-Store. Die App verwendet `DemoUser` aus `src/types/auth.ts`  
> ausschließlich für die Demo-Rollenauswahl im UI. Kein Login, keine Passwörter, keine Sessions.

---

### sessions

| Feld         | Typ         | Pflicht | Hinweis                     |
|--------------|-------------|---------|------------------------------|
| `id`         | TEXT (UUID) | ja      |                              |
| `user_id`    | TEXT        | ja      | FK → `users.id`              |
| `expires_at` | TEXT        | ja      | ISO-8601                     |
| `created_at` | TEXT        | ja      |                              |

> **Aktuell:** Noch nicht implementiert. Wird nach Cloudflare Access / eigenem Login-Flow benötigt.

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
schools ──< training_needs     (1 Schule : n Bedarfe)
schools ──< users              (1 Schule : n Nutzer mit Rolle 'school')
users   ──< sessions           (1 User : n Sessions)
training_needs >──< training_offers  (1 Bedarf : 0-n Angebote; oder Angebot ohne Bedarf)
users   ──< audit_logs         (1 User : n Logeinträge, nullable)
```

---

## Rollenmodell

| Rolle          | Beschreibung                                 | `school_id` erforderlich |
|----------------|----------------------------------------------|--------------------------|
| `public`       | Anonymer Gast (kein DB-User)                 | —                        |
| `school`       | Lehrkraft / Schulleitung einer Schule        | ja                       |
| `coordinator`  | Schulamts-Koordination, sieht alle Schulen  | nein                     |
| `admin`        | Verwaltungszugriff, Nutzerverwaltung         | nein                     |
| `leadership`   | Schulamtsleitung, Gesamtüberblick            | nein                     |

> Die Rolle `public` existiert nur im UI-Layer (`DemoUser`) und wird kein DB-Eintrag.

---

## Was aktuell noch Mock-Daten sind

| Bereich              | Quelle                              | Ersatz durch D1                          |
|----------------------|-------------------------------------|------------------------------------------|
| Schulliste (52)      | `src/data/schools.ts → SCHULEN`     | `SELECT * FROM schools`                  |
| Fortbildungsbedarfe  | React-State, init aus `FORTBILDUNGEN_DEFAULT` | `SELECT * FROM training_needs WHERE school_id = ?` |
| Laufende Fortbildungen | React-State (kein DB-Pendant)     | Künftig `training_offers` mit `status = 'confirmed'` |
| Nutzer / Rollen      | `DEMO_USERS` in `src/types/auth.ts` | `SELECT * FROM users WHERE id = ?`       |
| Sessions             | Nicht vorhanden                     | `sessions`-Tabelle + Cloudflare KV       |

---

## Was D1/Drizzle übernimmt

1. **Schemafile:** `src/lib/db/schema.ts` mit Drizzle-`sqliteTable()`-Definitionen
2. **Migrations:** `drizzle/migrations/` — generiert via `drizzle-kit generate`
3. **Repositories:** `src/lib/repositories/*.ts` — `// TODO (D1)` Kommentare zeigen die Stellen
4. **State-Init:** `trainingNeedService.initializeDemoData()` fällt weg; ersetzt durch API-Route `/api/schools/[id]/training-needs`
5. **Auth:** Sessions via Cloudflare Access oder eigenes Login; `sessions`-Tabelle + Cookie-Handling

---

## Technische Umsetzung mit Drizzle/D1

Status: vorbereitet, aber noch nicht produktiv aktiv. Die App nutzt weiterhin Mock-/Staticdaten aus `src/data/schools.ts` und React-State. Es gibt noch keine echte D1-Verbindung, keine produktive Authentifizierung, keine Sessions im Betrieb und keine Cookies/Login-Logik.

| Tabelle | Drizzle-Datei | geplanter Repository-Anschluss |
|---------|---------------|--------------------------------|
| `schools` | `src/lib/db/schema.ts → schools` | `src/lib/repositories/schoolRepository.ts` liest später aus D1 und mappt über `mapSchoolRowToSchool()` |
| `users` | `src/lib/db/schema.ts → users` | Noch kein produktiver Anschluss; später User-Repository nach Auth-Entscheidung |
| `sessions` | `src/lib/db/schema.ts → sessions` | Noch kein produktiver Anschluss; erst nach Auth-/Session-Konzept |
| `training_needs` | `src/lib/db/schema.ts → trainingNeeds` | `src/lib/repositories/trainingNeedRepository.ts` liest/schreibt später D1-Rows und mappt über `mapTrainingNeedRowToTrainingNeed()` |
| `training_offers` | `src/lib/db/schema.ts → trainingOffers` | Später eigenes Repository bzw. Anschluss an Fortbildungsangebote/Dashboards |
| `audit_logs` | `src/lib/db/schema.ts → auditLogs` | Optionaler Write-Pfad nach Auth + Mutationen, aktuell ohne Nutzung |

Technische Dateien:

| Datei | Zweck |
|-------|-------|
| `src/lib/db/schema.ts` | D1/SQLite-kompatible Drizzle-Tabellen mit `TEXT`-IDs, ISO-Datumswerten als `TEXT`, numerischen Feldern als `INTEGER`/`REAL` |
| `src/lib/db/mappers/schoolMapper.ts` | Übersetzt nullable DB-Felder (`fax`, `web`, `leitung`) in UI-kompatible Strings |
| `src/lib/db/mappers/trainingNeedMapper.ts` | Übersetzt Snake-Case-DB-Rows in den bestehenden `TrainingNeed`-UI-Typ |
| `drizzle.config.ts` | Drizzle-Kit-Konfiguration für Schema/Migrations-Generierung; nutzt nur Platzhalter-Credentials |
| `wrangler.toml` | Lokale Cloudflare-D1-Vorbereitung mit Platzhalter-Database-ID |

Migrationen werden in diesem Schritt nicht produktiv angewendet. Falls später Migrationen generiert werden, liegen sie geplant unter `drizzle/migrations/` und werden zuerst lokal gegen D1 getestet.

---

## Stand nach Schritt 8

Drizzle-Schema (`src/lib/db/schema.ts`) und `wrangler.toml` sind für lokale D1-Entwicklung vorbereitet, ohne produktive Daten zu berühren. Der Anschluss der Repositories an D1 bleibt ein separater späterer Schritt.

---

## Lokale D1-Entwicklung

Status: lokal vorbereitet, aber weiterhin nicht produktiv aktiv. Die Anwendung startet und baut ohne D1-Verbindung und nutzt unverändert Mock-/Staticdaten.

### Migrationen

| Bereich | Datei / Kommando | Hinweis |
|---------|------------------|---------|
| Drizzle-Schema | `src/lib/db/schema.ts` | Quelle für die SQLite/D1-Tabellen |
| Erste Migration | `drizzle/migrations/0000_silly_energizer.sql` | Erstellt aus dem Drizzle-Schema; nicht produktiv angewendet |
| Migration-Metadaten | `drizzle/migrations/meta/` | Von Drizzle Kit erzeugte Snapshots/Journal-Dateien |
| Migration generieren | `npm run db:generate` | Erzeugt neue Migrationsdateien aus Schemaänderungen |
| Lokal anwenden | `npm run db:migrate:local` | Wendet Migrationen nur auf die lokale Wrangler-D1-Instanz an |

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

**Warnung:** Noch keine produktive Datenbank. Keine Authentifizierung, keine Sessions, keine Passwörter, keine Cookies und keine Login-Logik sind aktiv. D1 bleibt in diesem Stand ausschließlich vorbereitet beziehungsweise lokal testbar.
