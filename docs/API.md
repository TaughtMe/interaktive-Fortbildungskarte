# API

Die API ist die Server-Grenze für Schulen und Fortbildungsbedarfe. Standardmäßig nutzt sie weiterhin Mock-/Staticdaten. Mit `DATA_SOURCE=postgres` oder `APP_DATA_SOURCE=postgres` liest und schreibt sie über Supabase/PostgreSQL.

## UI-Datenmodus

Die Oberfläche verwendet standardmäßig weiterhin den bisherigen direkten Service-/Mock-Zugriff. Dadurch bleibt das bekannte Verhalten ohne zusätzliche Konfiguration vollständig erhalten.

Optional kann die UI schrittweise gegen die API-Routen lesen und schreiben:

```bash
NEXT_PUBLIC_USE_API=true npm run dev
```

In diesem Modus lädt die UI Schulen über `GET /api/schools`, Fortbildungsbedarfe über `GET /api/training-needs` und sendet neue Bedarfsmeldungen über `POST /api/training-needs`.
Der CSV-Export im Koordinationsdashboard nutzt `GET /api/training-needs/export`.

Für dauerhafte PostgreSQL-Speicherung:

```bash
DATA_SOURCE=postgres NEXT_PUBLIC_USE_API=true npm run dev
```

Wenn ein API-Fetch fehlschlägt oder eine unerwartete Antwort liefert, fällt die UI beim initialen Laden auf bestehende Mock-/Service-Daten zurück. Beim Speichern einer Bedarfsmeldung zeigt die UI im Fehlerfall `Speichern fehlgeschlagen`.

`POST /api/training-needs` erwartet einen schulgebundenen `schoolCode`. Im PostgreSQL-Modus wird der Code gegen `school_access_codes` geprueft. Im Mock-Modus bleibt die lokale Demo-Bedarfsmeldung mit nichtleerem Code bedienbar, speichert aber keine Codes.

## Endpunkte

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/schools` | Gibt alle Schulen zurück. Optional `districtId`. Im PostgreSQL-Modus aus `schools`. |
| `GET` | `/api/schools/{id}` | Gibt eine einzelne Schule zurück. Im PostgreSQL-Modus aus `schools`. |
| `GET` | `/api/training-needs` | Gibt alle Bedarfsmeldungen zurück. Optional `districtId`. Im PostgreSQL-Modus aus `training_needs`. |
| `GET` | `/api/training-needs/export` | Gibt Bedarfsmeldungen als CSV zurück. Optional `districtId`. Im PostgreSQL-Modus aus `schools` und `training_needs`. |
| `POST` | `/api/training-needs` | Validiert und erstellt eine Bedarfsmeldung. Im PostgreSQL-Modus dauerhaft in `training_needs`. |

## CSV-Export

```http
GET /api/training-needs/export
```

Optionale Query-Parameter:

| Parameter | Werte |
|---|---|
| `districtId` | Exakte Bezirks-ID, z. B. `district-unterallgaeu` |
| `topic` | Exakter Themenname |
| `priority` | `hoch`, `mittel`, `niedrig` |
| `schoolType` | `G`, `M`, `GM` |
| `location` | Exakter Ort |
| `sort` | `date-desc`, `date-asc`, `priority-desc`, `priority-asc` |

Exportierte Spalten:

| Spalte | Inhalt |
|---|---|
| `Schule` | Schulname |
| `Ort` | Schulort |
| `Schulart` | Schulart-Label |
| `Thema` | Bedarfsthema |
| `Beschreibung` | Bedarfsbeschreibung |
| `Priorität` | Priorität als Label |
| `Zielgruppe` | Zielgruppe der Fortbildung |
| `Format` | Gewünschtes Format |
| `Datum` | Erstellungsdatum der Bedarfsmeldung |

Der Export enthält keine Kontaktdaten, keine Namen von Leitungen, keine Benutzerkennung und keine Auth-/Sessiondaten.

## Bezirksfilter

Die Mandantenfaehigkeit ist vorbereitend und erzwingt noch keine Authentifizierung. Folgende optionale Filter sind serverseitig vorbereitet:

```http
GET /api/schools?districtId=district-unterallgaeu
GET /api/training-needs?districtId=district-unterallgaeu
GET /api/training-needs/export?districtId=district-unterallgaeu
```

Ohne `districtId` bleibt das bisherige Verhalten unveraendert. Mit PostgreSQL werden Schulen direkt ueber `schools.district_id` und Bedarfsmeldungen ueber `training_needs -> schools.district_id` gefiltert.

## Demo-Zugriffskontrolle

Die API-Routen nutzen vorbereitend `src/lib/auth/accessControl.ts`. Es gibt weiterhin keine echte Authentifizierung, keine Sessions, keine Cookies und keine Passwoerter.

Nur im Entwicklungsmodus (`NODE_ENV !== production`) kann fuer manuelle API-Tests ein Demo-User uebergeben werden:

```http
X-Demo-Role: coordinator
```

Alternativ ist fuer GET/Export-Tests `?demoRole=coordinator` moeglich. Diese Demo-User-Ermittlung ist ausdruecklich nicht produktiv sicher und dient nur dazu, die spaeteren Server-Pruefpunkte sichtbar vorzubereiten.

Vorbereitete Rollenregeln:

| Rolle | API-Verhalten im Demo-Kontext |
|---|---|
| `superadmin` | Darf alle Schulen, Bedarfsmeldungen und Exporte nutzen. |
| `district_admin` | Darf Schulen und Bedarfsmeldungen im eigenen Bezirk lesen und exportieren. |
| `coordinator` | Darf Bedarfsmeldungen im eigenen Bezirk sichten und exportieren. |
| `school_user` | Darf nur die eigene Demo-Schule lesen und fuer diese Bedarf melden. |
| `viewer` | Darf im eigenen Bezirk lesen; keine Bedarfsmeldung, kein Export. |
| `public` | Keine geschuetzten API-Aktionen im Demo-Kontext. |

Wenn kein Demo-User uebergeben wird, bleibt das bisherige API-Verhalten fuer Mock- und PostgreSQL-Modus kompatibel. Spaetere echte Auth kann an denselben `accessControl`-Funktionen andocken und die Demo-User-Aufloesung ersetzen.

## Beispiel: Bedarfsmeldung erstellen

```http
POST /api/training-needs
Content-Type: application/json
```

```json
{
  "schoolId": "schule-1",
  "schoolCode": "<nicht-versionierter-testcode>",
  "topic": "Digitale Unterrichtsgestaltung",
  "description": "Fortbildungsbedarf fuer kollaborative Lernplattformen.",
  "priority": "mittel",
  "targetGroup": "Lehrkraefte der Jahrgangsstufen 5-7",
  "preferredFormat": "schilf"
}
```

Erlaubte Werte:

| Feld | Werte |
|---|---|
| `priority` | `hoch`, `mittel`, `niedrig` |
| `preferredFormat` | `praesenz`, `online`, `schilf`, `beratung` |

Alle Felder im Beispiel sind erforderlich.

Fehlerfaelle fuer `POST /api/training-needs`:

| Fall | Status |
|---|---|
| Fehlender `schoolCode` oder andere Pflichtfelder | `400` |
| Unbekannte Schule | `404` |
| Falscher, deaktivierter oder abgelaufener Zugriffscode | `403` |

Bei Erfolg wird der Bedarf gespeichert, der verwendete Code mit `last_used_at` aktualisiert und der gespeicherte Bedarf mit Status `201` zurueckgegeben.

## Sicherheit und Betrieb

- Mock-/Staticdaten bleiben Standard.
- PostgreSQL/Supabase wird nur mit `DATA_SOURCE=postgres` oder `APP_DATA_SOURCE=postgres` aktiv.
- Es gibt noch keine Authentifizierung.
- Es gibt ein vorbereitetes Rollen-/Access-Control-Modell, aber keine erzwungene produktive Auth.
- Bedarfsmeldungen sind im PostgreSQL-Modus durch schulgebundene Zugriffscodes als Pilotloesung geschuetzt.
- Zugriffscodes werden nur gehasht gespeichert; Klartext-Codes gehoeren nicht in Git, README oder Tickets.
- Keine Sessions, Cookies oder Passwoerter werden verwendet.
- Supabase Auth ist nicht eingebaut.
- Migration und Seed werden nur bewusst gegen eine isolierte Testdatenbank ausgefuehrt.
