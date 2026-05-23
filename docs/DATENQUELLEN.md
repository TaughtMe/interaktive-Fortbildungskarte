# Datenquellen

Stand: 2026-05  
Status: Mock-Pfad aktiv. PostgreSQL/Supabase ist die bevorzugte Zielrichtung, D1 bleibt nur als vorbereitete Alternative im Repository.

## UI-Datenmodus

Der Standard bleibt Mock/Service direkt in der UI. Ohne `NEXT_PUBLIC_USE_API` wird das bisherige Verhalten beibehalten:

- Schulen kommen direkt aus dem bestehenden Service-/Mock-Pfad.
- Fortbildungsbedarfe starten aus den bestehenden Demo-Daten.
- Neue Bedarfsmeldungen werden lokal als Mock-Objekte erzeugt.

Optional kann die UI gegen die vorbereiteten API-Routen lesen und schreiben:

```bash
NEXT_PUBLIC_USE_API=true npm run dev
```

Dann gilt:

- `GET /api/schools` lädt Schulen.
- `GET /api/training-needs` lädt Fortbildungsbedarfe.
- `POST /api/training-needs` erstellt neue Bedarfsmeldungen über die API-Grenze.

Die API nutzt in diesem Stand weiterhin die bestehenden Mock-/Service-Daten. Es gibt dadurch noch keine echte Datenbankverbindung, keine Supabase-Anbindung, keine Authentifizierung, keine Sessions, keine Cookies und keine Passwörter.

Falls API-Fetches fehlschlagen, bleibt der Mock-/Service-Fallback aktiv. Die UI soll dadurch keine weiße Seite oder unkontrollierte Runtime-Fehler erzeugen.

Die zentrale Runtime-Konfiguration fuer den UI-Schalter liegt in `src/lib/config/runtimeMode.ts`. Die API-Clients liegen unter `src/lib/api/`.

## Repository-Datenquellen

Die App kennt zwei Datenquellen:

| Modus | Bedeutung |
|-------|-----------|
| `mock` | Verwendet die bestehenden Static-/Mockdaten aus `src/data/schools.ts` und den Demo-Initialzustand für Fortbildungsbedarfe. |
| `d1` | Aktiviert den vorbereiteten D1-Pfad in der Repository-Schicht. D1 ist eine Alternative; echte produktive Queries sind nicht verdrahtet. |

## Standardverhalten der Repository-Schicht

Ohne Umgebungsvariable läuft die App immer mit `mock`.

Optional kann der vorbereitete D1-Pfad explizit getestet werden:

```bash
NEXT_PUBLIC_DATA_SOURCE=d1 npm run dev
```

Serverseitig werden außerdem `DATA_SOURCE` und `APP_DATA_SOURCE` akzeptiert. Da die aktuelle App Services noch direkt aus Client-Komponenten importiert, ist für den bestehenden UI-Pfad vor allem `NEXT_PUBLIC_DATA_SOURCE` relevant.

## Fallback-Logik

Die Konfiguration liegt in `src/lib/config/dataSource.ts`.

Der vorbereitete DB-Client liegt in `src/lib/db/client.ts` und gibt `null` zurück, wenn keine D1-Bindings vorhanden sind oder Code im Browser läuft. Dadurch startet die App auch ohne Cloudflare-/D1-Umgebung weiter.

Wenn `dataSource = mock` ist:

- `getAllSchools()` liest weiterhin `SCHULEN`.
- `getSchoolById()` sucht weiterhin in `SCHULEN`.
- `getTrainingNeeds()` liefert weiterhin den Demo-Zustand.
- `createTrainingNeed()` erzeugt weiterhin ein lokales Mock-Objekt.

Wenn `dataSource = d1` ist:

- Die Repositories prüfen, ob ein D1-Client vorhanden ist.
- Falls kein Client vorhanden ist, fallen sie kontrolliert auf Mockdaten zurück.
- Falls ein Client vorhanden ist, sind die Stellen für spätere echte Queries markiert; aktuell bleibt der Mock-Fallback aktiv, damit kein synchroner Client-UI-Pfad auf async D1 umgebaut werden muss.

## Was für echte DB-Zugriffe noch fehlt

- Server/API-Grenze für echte Datenbank-Reads und Writes.
- Asynchrone Repository-/Service-Methoden oder API-Routen für `schools` und `training_needs`.
- Nutzung der Mapper aus `src/lib/db/mappers/` für echte Row-Shapes.
- Persistenter Write-Pfad für `createTrainingNeed()`.
- Deployment-spezifische Bereitstellung des D1-Bindings `DB`.
- Keine Authentifizierung in diesem Schritt: keine Sessions, Cookies, Passwörter oder Login-Logik.

PostgreSQL/Supabase wird für die nächste echte Datenbankanbindung bevorzugt. D1 bleibt technisch vorbereitet, aber nicht als aktive Zielarchitektur markiert.

Ein inaktiver PostgreSQL-Adapter ist unter `src/lib/db/postgresClient.ts` vorbereitet. Er oeffnet keine Verbindung beim Import, setzt keine `DATABASE_URL` voraus und wird aktuell von der App nicht produktiv genutzt.
