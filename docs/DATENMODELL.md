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

1. **Schemafile:** `src/lib/db/schema.ts` (noch nicht erstellt) mit Drizzle-`sqliteTable()`-Definitionen
2. **Migrations:** `drizzle/migrations/` — generiert via `drizzle-kit generate`
3. **Repositories:** `src/lib/repositories/*.ts` — `// TODO (D1)` Kommentare zeigen die Stellen
4. **State-Init:** `trainingNeedService.initializeDemoData()` fällt weg; ersetzt durch API-Route `/api/schools/[id]/training-needs`
5. **Auth:** Sessions via Cloudflare Access oder eigenes Login; `sessions`-Tabelle + Cookie-Handling

---

## Nächster sinnvoller Schritt (Schritt 8)

Drizzle-Schema schreiben (`src/lib/db/schema.ts`) + `wrangler.toml` für lokale D1-Entwicklung vorbereiten, ohne produktive Daten zu berühren.
