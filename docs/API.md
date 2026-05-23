# API

Die API ist aktuell eine vorbereitete Server-Grenze im Mock-Betrieb. Sie nutzt die bestehenden Services und Repositories, aktiviert keine Supabase-/PostgreSQL-Verbindung und speichert neue Bedarfsmeldungen noch nicht dauerhaft.

Später soll diese Grenze an Supabase/PostgreSQL angebunden werden. D1 bleibt nur eine Alternative.

## UI-Datenmodus

Die Oberfläche verwendet standardmäßig weiterhin den bisherigen direkten Service-/Mock-Zugriff. Dadurch bleibt das bekannte Verhalten ohne zusätzliche Konfiguration vollständig erhalten.

Optional kann die UI schrittweise gegen die API-Routen lesen und schreiben:

```bash
NEXT_PUBLIC_USE_API=true npm run dev
```

In diesem Modus lädt die UI Schulen über `GET /api/schools`, Fortbildungsbedarfe über `GET /api/training-needs` und sendet neue Bedarfsmeldungen über `POST /api/training-needs`.

Wenn ein API-Fetch fehlschlägt oder eine unerwartete Antwort liefert, fällt die UI automatisch auf die bestehenden Mock-/Service-Daten zurück. Die API-Clients werfen keine unkontrollierten Fehler in die App, sondern liefern `{ ok: true, data }` oder `{ ok: false, error }`.

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
- `NEXT_PUBLIC_USE_API=true` aktiviert nur den API-Fetch der UI; die API selbst nutzt aktuell weiterhin Mock-/Service-Daten.
- PostgreSQL/Supabase ist vorbereitet, aber nicht aktiv angebunden.
- Es gibt noch keine Authentifizierung.
- Die API ist deshalb nicht produktiv geschuetzt.
- Keine Sessions, Cookies oder Passwoerter werden verwendet.
- Keine echte Datenbankverbindung, keine Migration und kein Seed sind Teil dieses Stands.
