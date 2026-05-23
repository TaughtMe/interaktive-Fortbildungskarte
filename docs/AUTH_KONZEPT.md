# Auth-Konzept fuer den Pilotbetrieb

Stand: 2026-05-23  
Status: Pilotloesung fuer Schul-Zugriffscodes vorbereitet. Keine produktive Benutzer-Authentifizierung aktiv.

## Zielbild

Der Pilotbetrieb braucht echte Logins fuer Rollen mit Verwaltungs- oder Koordinationsrechten und einen einfachen Zugang fuer Schulen, die nur Fortbildungsbedarf melden sollen. Die bestehende Demo-Rollenlogik in `src/lib/auth/accessControl.ts` bleibt fachlich massgeblich und wird spaeter nur durch eine echte User-Aufloesung ersetzt.

Nicht Teil dieses Schritts:

- Keine D1-Aenderungen.
- Keine Migration ausfuehren.
- Keine Secrets oder echte Zugangsdaten speichern.
- Keine echten personenbezogenen Daten anlegen.
- Keine produktive Authentifizierung aktivieren.
- Keine vollstaendige Benutzerverwaltung bauen.
- Keine Supabase Auth, Sessions, Cookies oder Nutzerpasswoerter einfuehren.

## Bestehender Stand

Die aktuelle App hat Rollen, aber noch keine echte Authentifizierung.

- Rollen werden in `src/types/auth.ts` definiert.
- Legacy-Rollen werden ueber `normalizeRole()` abgebildet:
  - `admin` und `leadership` -> `superadmin`
  - `school` -> `school_user`
- Die zentrale Berechtigungslogik liegt in `src/lib/auth/accessControl.ts`.
- API-Routen koennen im Entwicklungsmodus Demo-Rollen ueber `X-Demo-Role` oder `demoRole` auswerten.
- `resolveDemoAccessUserFromRequest()` gibt in `NODE_ENV=production` immer `null` zurueck.
- Ohne echten User sind die API-Routen derzeit kompatibel offen, damit Mock-/API-Modus weiter funktionieren.
- `POST /api/training-needs` verlangt jetzt zusaetzlich `schoolCode`. Im PostgreSQL-Modus wird dieser Code schulgebunden, aktiv und nicht abgelaufen gegen `school_access_codes.code_hash` geprueft.

Vorbereitete Rollen:

| Rolle | Zweck |
|---|---|
| `superadmin` | Mandantenuebergreifende Administration, alle Bezirke, alle Exporte |
| `district_admin` | Verwaltung eines eigenen Bezirks |
| `coordinator` | Sichtung und Koordination von Bedarfsmeldungen im eigenen Bezirk |
| `school_user` | Bedarfsmeldung fuer genau eine Schule |
| `viewer` | Lesender Bezirkszugriff ohne Schreibrechte und ohne Export |
| `public` | Oeffentliche Demo-Ansicht, kein DB-User |

## Bewertung der Auth-Optionen

### Supabase Auth

Vorteile:

- Passt zur bevorzugten PostgreSQL-/Supabase-Zielrichtung.
- Sichere Standardfunktionen fuer Login, Passwort-Reset, Session-Cookies/JWTs und Token-Rotation.
- Kein eigener Passwort-Hashing- oder Session-Sicherheitscode noetig.
- Rollen und Zuordnungen koennen in der bestehenden `users`-Tabelle gespiegelt werden.
- Spaeter gute Anschlussfaehigkeit fuer Row-Level Security, falls die App direkter mit Supabase arbeitet.

Nachteile:

- Braucht Supabase-Projektkonfiguration und lokale Secrets.
- Rollenmodell muss sauber zwischen `auth.users` und eigener `users`-Tabelle synchronisiert werden.
- Fuer Schulen waere ein vollstaendiger Login im Pilotbetrieb zu schwergewichtig.

Einschaetzung: Beste Option fuer Superadmin, Bezirksadmin und Koordination.

### Eigene Custom Sessions

Vorteile:

- Bestehende `sessions`-Tabelle ist vorbereitet.
- Vollstaendige Kontrolle ueber Cookie-Format, Laufzeiten und Serverlogik.
- Kein externer Auth-Anbieter noetig.

Nachteile:

- Hohe Sicherheitslast: Passwort-Hashing, Reset-Flows, Session-Rotation, CSRF, Brute-Force-Schutz, Cookie-Hardening, Audit.
- Mehr Implementierungsaufwand ohne fachlichen Mehrwert fuer den Pilot.
- Fehler in Eigenbau-Auth sind schwerer zu erkennen und riskanter als Standard-Auth.

Einschaetzung: Fuer den Pilot nicht empfohlen, ausser Supabase Auth faellt organisatorisch aus.

### Schul-Zugriffscode

Vorteile:

- Sehr niedrige Einstiegshuerde fuer Schulen.
- Keine personenbezogenen Schul-Accounts noetig.
- Passt zum Ziel: Schulen melden zunaechst nur Bedarf.
- Kann technisch strikt auf `POST /api/training-needs` fuer die jeweilige Schule begrenzt werden.

Nachteile:

- Zugangscode ist kein echter Benutzerlogin.
- Codes koennen weitergegeben werden.
- Es braucht Ablaufdatum, Rotation, Hashing und Rate-Limits.
- Ohne Zusatzangaben ist kein personenbezogenes Audit moeglich.

Einschaetzung: Empfohlen als begrenzter Pilot-Zugang fuer Schulen, aber nur fuer Bedarfsmeldungen und nicht fuer Dashboards, Exporte oder Verwaltungsfunktionen.

## Aktuelle Pilotentscheidung

Fuer diesen Schritt wird nur der Schul-Zugriffscode umgesetzt:

1. Schulen koennen Bedarfsmeldungen nur mit `schoolId` plus gueltigem `schoolCode` absenden.
2. Codes werden normalisiert, mit Node-crypto/scrypt plus Salt gehasht und nie im Klartext in PostgreSQL gespeichert.
3. Gueltige Codes sind an genau eine Schule gebunden und koennen deaktiviert oder mit `expires_at` befristet werden.
4. Bei erfolgreicher Bedarfsmeldung wird `last_used_at` aktualisiert.
5. Es entstehen keine Sessions, Cookies, Passwoerter oder Supabase-Auth-Abhaengigkeiten.
6. Koordination, Bezirksadmin und Superadmin bleiben Demo-/Vorbereitungsrollen.

Die scrypt-basierte Loesung ist fuer den Pilotbetrieb gedacht. Vor einem produktiven Rollout sollten Parameter, Rotation, Rate-Limits und ein Betriebskonzept erneut geprueft werden.

## Zielbild nach dem Pilotbetrieb

Empfohlen ist ein hybrides Minimalmodell:

1. Superadmin, Bezirksadmin und Koordination koennen spaeter eine echte Authentifizierung nutzen.
2. Die eigene `users`-Tabelle bleibt die fachliche Rollen- und Zuordnungstabelle.
3. Schulen melden Bedarf mit einem schulgebundenen Zugriffscode statt mit eigenem Login.
4. Die bestehende `accessControl`-Logik bleibt unveraendert die zentrale Autorisierungsquelle.
5. API-Routen bekommen spaeter eine echte Serverfunktion `resolveAccessUserFromRequest(request)`, die eine echte Login-Identitaet und danach optional Schulcode prueft.

Die Demo-Rollenlogik wird nicht geloescht. Sie bleibt nur fuer Entwicklung und Vorschau erhalten.

## Vorgeschlagenes Datenmodell

Fuer PostgreSQL gibt es eine separate Tabelle `school_access_codes` statt einer Erweiterung der `users`-Tabelle.

Begruendung:

- Schulcodes sind keine echten User.
- Keine E-Mail, kein Passwort, kein personenbezogenes Konto.
- Einfachere Rotation und Deaktivierung je Schule.
- `users` bleibt sauber fuer echte Login-Rollen.

Geplante Tabelle:

| Feld | Typ | Pflicht | Zweck |
|---|---|---|---|
| `id` | text | ja | Interne ID |
| `school_id` | text | ja | FK -> `schools.id` |
| `code_hash` | text | ja | Hash des Zugriffscodes, nie Klartext speichern |
| `label` | text | nein | Interne Bezeichnung, z. B. `Pilotcode Mai 2026` |
| `active` | integer | ja | `1` aktiv, `0` deaktiviert |
| `expires_at` | timestamptz | nein | Ablaufdatum fuer Rotation |
| `last_used_at` | timestamptz | nein | Missbrauchs- und Betriebsanalyse ohne PII |
| `created_at` | timestamptz | ja | Anlagezeitpunkt |
| `updated_at` | timestamptz | ja | Aenderungszeitpunkt |

Empfohlene Indizes:

- `school_access_codes_school_id_idx` auf `school_id`
- `school_access_codes_active_idx` auf `active`

Nicht speichern:

- Zugriffscodes im Klartext.
- Namen von meldenden Personen.
- Private E-Mail-Adressen.
- Freie Kontaktfelder, solange sie nicht fachlich und datenschutzrechtlich freigegeben sind.

Alternative Erweiterung von `users`:

Eine Erweiterung der `users`-Tabelle um Code-Felder wird nicht empfohlen. Sie vermischt echte Personen-Logins mit anonymen Schulzugriffen und macht spaetere Audit- und Sperrlogik unklarer.

## AccessUser-Aufloesung

Ziel fuer die spaetere technische Umsetzung:

```ts
resolveAccessUserFromRequest(request): Promise<AccessUser>
```

Reihenfolge:

1. Echte Login-Identitaet pruefen.
2. Login-ID auf eigene `users.id` oder eine spaetere Auth-ID mappen.
3. Rolle, `district_id` und `school_id` aus eigener `users`-Tabelle lesen.
4. Falls keine Login-Session vorhanden ist: Schulcode aus Request pruefen.
5. Gueltiger Schulcode wird als eingeschraenkter `school_user` fuer genau diese Schule behandelt.
6. Kein User und kein gueltiger Schulcode ergibt `null`.

Wichtig: Der Schulcode darf nur auf Routen akzeptiert werden, die ihn explizit brauchen. Er darf keine allgemeine Session fuer die App erzeugen.

## API-Schutzkonzept

Die folgende Matrix beschreibt die spaetere Zielregel. Heute wird sie noch nicht produktiv erzwungen.

| Route | Zugriff spaeter |
|---|---|
| `GET /api/schools` | `superadmin`: alle; `district_admin`/`coordinator`/`viewer`: eigener Bezirk; `school_user`: eigene Schule; `public`: nein oder nur explizit freigegebene oeffentliche Basisdaten |
| `GET /api/schools/{id}` | Wie `canViewSchool()`: Superadmin alle, Bezirksrollen eigener Bezirk, Schule nur eigene Schule |
| `GET /api/training-needs` | `superadmin`: alle; `district_admin`/`coordinator`/`viewer`: eigener Bezirk; `school_user`: eigene Schule; Schulcode: nicht empfohlen, ausser nur eigene frisch erstellte Meldung |
| `POST /api/training-needs` | `superadmin`: erlaubt; `school_user`: eigene Schule; gueltiger Schulcode: eigene Schule; `district_admin`/`coordinator`/`viewer` im Pilot: nicht erlaubt, ausser fachlich spaeter bewusst geoeffnet |
| `GET /api/training-needs/export` | `superadmin`: alle oder gefiltert; `district_admin`/`coordinator`: eigener Bezirk; `viewer`, `school_user`, Schulcode und `public`: nein |

Bestehende Funktionen als Zielanker:

- `canViewDistrict()`
- `canViewSchool()`
- `canCreateTrainingNeed()`
- `canExportTrainingNeeds()`
- `filterSchoolsForUser()`

## Technische Umsetzung spaeter

Minimaler Implementierungspfad ohne produktive Aktivierung in diesem Schritt:

1. Neue Auth-Resolver-Datei vorbereiten, z. B. `src/lib/auth/resolveAccessUser.ts`.
2. Supabase-Session serverseitig pruefen, ohne Service-Role-Key im Client.
3. Eigene User-Zuordnung aus PostgreSQL laden.
4. Schulcode-Pruefung nur fuer `POST /api/training-needs` zulassen.
5. API-Routen von Demo-Resolver auf echten Resolver umstellen, aber per Feature-Flag kontrolliert aktivieren.
6. Feature-Flag z. B. `AUTH_ENFORCEMENT=enabled`, Standard bleibt aus.
7. Erst nach Tests und Datenbankmigration produktiv einschalten.

Bis dahin bleibt `resolveDemoAccessUserFromRequest()` unveraendert fuer Entwicklung nutzbar.

## Sicherheitsanforderungen fuer Schulcodes

- Codes nur gehasht speichern, nie im Klartext.
- Ausreichend zufaellig generieren, nicht aus Schulnamen ableiten.
- Ablaufdatum setzen und Rotation vorsehen.
- Mehrere aktive Codes pro Schule nur bewusst erlauben.
- Rate-Limit auf Code-Pruefung und Bedarfsmeldung.
- Generische Fehlermeldung bei falschem Code, keine Schul-Enumeration.
- `Cache-Control: no-store` fuer geschuetzte Antworten.
- Audit ohne personenbezogene Daten: Schule, Zeitpunkt, Aktion, technische Request-ID.

## Offene Sicherheitsfragen

- Soll `viewer` wirklich nie exportieren duerfen? Aktuell erlaubt `accessControl` Export nur fuer `district_admin` und `coordinator`.
- Duerfen Bezirksadmin oder Koordination Bedarf stellvertretend fuer Schulen anlegen?
- Wie lange sollen Schulcodes gueltig sein?
- Soll es pro Schule einen Code oder getrennte Codes pro Ansprechperson geben?
- Welche Rate-Limit-Infrastruktur wird genutzt?
- Welche Supabase-Region und welche vertraglichen Datenschutzanforderungen gelten fuer den Pilot?
- Soll `users.id` direkt `auth.users.id` sein oder braucht es ein separates Feld `auth_user_id`?
- Welche Daten duerfen in `audit_logs.details` stehen?

## Abschlussstatus dieses Schritts

- Keine Migration ausgefuehrt.
- Keine D1-Dateien geaendert.
- Keine Secrets hinzugefuegt.
- Keine produktive Auth aktiviert.
- Keine echten personenbezogenen Daten angelegt.
- Nicht committen.
