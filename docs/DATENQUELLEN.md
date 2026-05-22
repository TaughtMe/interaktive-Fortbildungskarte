# Datenquellen

Stand: 2026-05  
Status: Vorbereitung fuer optionales D1; produktiv bleibt der Mock-Pfad.

## Modi

Die App kennt zwei Datenquellen:

| Modus | Bedeutung |
|-------|-----------|
| `mock` | Verwendet die bestehenden Static-/Mockdaten aus `src/data/schools.ts` und den Demo-Initialzustand fuer Fortbildungsbedarfe. |
| `d1` | Aktiviert den vorbereiteten D1-Pfad in der Repository-Schicht. Echte produktive Queries sind noch nicht verpflichtend verdrahtet. |

## Standardverhalten

Ohne Umgebungsvariable laeuft die App immer mit `mock`.

Optional kann D1 explizit aktiviert werden:

```bash
NEXT_PUBLIC_DATA_SOURCE=d1 npm run dev
```

Serverseitig werden ausserdem `DATA_SOURCE` und `APP_DATA_SOURCE` akzeptiert. Da die aktuelle App Services noch direkt aus Client-Komponenten importiert, ist fuer den bestehenden UI-Pfad vor allem `NEXT_PUBLIC_DATA_SOURCE` relevant.

## Fallback-Logik

Die Konfiguration liegt in `src/lib/config/dataSource.ts`.

Der vorbereitete DB-Client liegt in `src/lib/db/client.ts` und gibt `null` zurueck, wenn keine D1-Bindings vorhanden sind oder Code im Browser laeuft. Dadurch startet die App auch ohne Cloudflare-/D1-Umgebung weiter.

Wenn `dataSource = mock` ist:

- `getAllSchools()` liest weiterhin `SCHULEN`.
- `getSchoolById()` sucht weiterhin in `SCHULEN`.
- `getTrainingNeeds()` liefert weiterhin den Demo-Zustand.
- `createTrainingNeed()` erzeugt weiterhin ein lokales Mock-Objekt.

Wenn `dataSource = d1` ist:

- Die Repositories pruefen, ob ein D1-Client vorhanden ist.
- Falls kein Client vorhanden ist, fallen sie kontrolliert auf Mockdaten zurueck.
- Falls ein Client vorhanden ist, sind die Stellen fuer spaetere echte Queries markiert; aktuell bleibt der Mock-Fallback aktiv, damit kein synchroner Client-UI-Pfad auf async D1 umgebaut werden muss.

## Was fuer produktives D1 noch fehlt

- Server/API-Grenze fuer echte D1-Reads und Writes.
- Asynchrone Repository-/Service-Methoden oder API-Routen fuer `schools` und `training_needs`.
- Nutzung der Mapper aus `src/lib/db/mappers/` fuer echte D1-Row-Shapes.
- Persistenter Write-Pfad fuer `createTrainingNeed()`.
- Deployment-spezifische Bereitstellung des D1-Bindings `DB`.
- Keine Authentifizierung in diesem Schritt: keine Sessions, Cookies, Passwoerter oder Login-Logik.
