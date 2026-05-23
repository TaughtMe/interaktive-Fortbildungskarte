# API

Die API ist aktuell eine vorbereitete Server-Grenze im Mock-Betrieb. Sie nutzt die bestehenden Services und Repositories, aktiviert keine Supabase-/PostgreSQL-Verbindung und speichert neue Bedarfsmeldungen noch nicht dauerhaft.

Später soll diese Grenze an Supabase/PostgreSQL angebunden werden. D1 bleibt nur eine Alternative.

## Endpunkte

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/schools` | Gibt alle Schulen aus den aktuellen Mock-/Staticdaten zurueck. |
| `GET` | `/api/schools/{id}` | Gibt eine einzelne Schule aus den aktuellen Mock-/Staticdaten zurueck. |
| `GET` | `/api/training-needs` | Gibt alle Demo-/Mock-Bedarfsmeldungen zurueck. |
| `POST` | `/api/training-needs` | Nimmt eine Bedarfsmeldung entgegen und erzeugt im aktuellen Mock-Modell ein Objekt ohne dauerhafte Persistenz. |

## Beispiel: Bedarfsmeldung erstellen

```http
POST /api/training-needs
Content-Type: application/json
```

```json
{
  "schoolId": "schule-1",
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

## Sicherheit und Betrieb

- Mock-/Staticdaten bleiben Standard.
- Es gibt noch keine Authentifizierung.
- Die API ist deshalb nicht produktiv geschuetzt.
- Keine Sessions, Cookies oder Passwoerter werden verwendet.
- Keine echte Datenbankverbindung, keine Migration und kein Seed sind Teil dieses Stands.
