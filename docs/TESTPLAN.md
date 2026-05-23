# Testplan

Stand: 2026-05

Dieser Testplan beschreibt manuelle Smoke-Tests fuer den aktuellen Mock-Betrieb und den optionalen API-Modus. Keine echten personenbezogenen Daten verwenden. Keine Migrationen oder Seeds im normalen Test ausfuehren.

## Vorbereitung

```bash
npm install
npm run dev
```

Standardtest im Mock-Modus: keine Umgebungsvariable setzen.

Optionaler API-Modus:

```bash
NEXT_PUBLIC_USE_API=true npm run dev
```

## Karte und Liste

1. App im Browser oeffnen.
2. Pruefen, dass Schulliste und Karte sichtbar sind.
3. Suche nach Ort, Schulname und Leitung testen.
4. Schultypfilter setzen und wieder entfernen.
5. Zwischen Liste und Karte wechseln.
6. Eine Schule auf Karte oder Liste auswaehlen.

Erwartung: Keine weisse Seite, keine blockierenden Runtime-Fehler, Karte und Sidebar bleiben bedienbar.

## Schule Auswaehlen

1. Eine Schule aus der Liste waehlen.
2. Detailansicht oeffnen.
3. Kontaktfelder und Schultypanzeige pruefen.
4. Vergleich fuer zwei Schulen aktivieren und wieder entfernen.

Erwartung: Detailansicht, Vergleichsleiste und Modal bleiben stabil.

## Bedarf Melden

1. Detailansicht einer Schule oeffnen.
2. "Bedarf melden" oeffnen.
3. Thema, Beschreibung, Zielgruppe, Prioritaet und Format ausfuellen.
4. Meldung absenden.
5. Bedarf in der Detailansicht pruefen.
6. Bedarf wieder entfernen.

Erwartung: Im Mock-Modus wird lokal ein Bedarf angelegt. Im API-Modus wird zuerst `POST /api/training-needs` genutzt; bei Fehler bleibt der lokale Mock-Fallback aktiv.

## Rollenwechsel

1. Demo-Rolle `public` pruefen.
2. Auf `school` wechseln und "Meine Schule" pruefen.
3. Auf `coordinator` wechseln und Koordinationsansicht pruefen.
4. Auf `admin` wechseln und Verwaltungsansicht pruefen.
5. Auf `leadership` wechseln und Gesamtueberblick pruefen.
6. Neue Demo-Rollen `school_user`, `district_admin`, `viewer` und `superadmin` pruefen.

Erwartung: Tabs passen zur Rolle. Es gibt keine echte Authentifizierung, keine Sessions, keine Cookies und keine Passwoerter.

## Dashboards

1. Schul-Dashboard mit Demo-Bedarf pruefen.
2. Koordinationsdashboard mit mehreren Schulen pruefen.
3. Anzahl der sichtbaren Bedarfsmeldungen und Gesamtzahl pruefen.
4. Filter nach Thema, Prioritaet, Schulart und Ort einzeln setzen und wieder entfernen.
5. Sortierung nach Datum und Prioritaet pruefen.
6. CSV-Export im Koordinationsdashboard ausloesen.
7. Admin-Dashboard oeffnen.
8. Leadership-Dashboard oeffnen.
9. Anzahl Schulen, Anzahl Bedarfsmeldungen, haeufigste Themen und Prioritaetsverteilung pruefen.

Erwartung: Dashboards verwenden dieselben Mock-/Service-Daten beziehungsweise im API-Modus die API-geladenen Schulen und Bedarfsmeldungen. Der CSV-Export enthaelt Schule, Ort, Schulart, Thema, Beschreibung, Prioritaet, Zielgruppe, Format und Datum, aber keine personenbezogenen Zusatzdaten.

## API-Endpunkte

Bei laufendem Dev-Server:

```bash
curl http://localhost:3000/api/schools
curl "http://localhost:3000/api/schools?districtId=district-unterallgaeu"
curl http://localhost:3000/api/training-needs
curl "http://localhost:3000/api/training-needs?districtId=district-unterallgaeu"
curl http://localhost:3000/api/training-needs/export
curl "http://localhost:3000/api/training-needs/export?districtId=district-unterallgaeu"
curl "http://localhost:3000/api/training-needs/export?priority=hoch&sort=priority-desc"
curl http://localhost:3000/api/schools/unbekannte-schule
```

POST-Beispiel:

```bash
curl -X POST http://localhost:3000/api/training-needs \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId": "bb-gs",
    "topic": "Digitale Unterrichtsgestaltung",
    "description": "Synthetischer Testbedarf ohne personenbezogene Daten.",
    "priority": "mittel",
    "targetGroup": "Lehrkraefte",
    "preferredFormat": "schilf"
  }'
```

Negativtests:

```bash
curl -X POST http://localhost:3000/api/training-needs \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"","topic":"","description":"","priority":"falsch","targetGroup":"","preferredFormat":"falsch"}'
```

Erwartung: Erfolgsantworten haben `{ "data": ... }`, Fehlerantworten `{ "error": "..." }`. Der Export liefert `text/csv` mit den dokumentierten Spalten. Unbekannte Schule bei `GET /api/schools/{id}` liefert 404; ungueltige Bedarfsmeldungen liefern 400.

## Pruefbefehle

```bash
npm run typecheck
npm run db:pg:check
npm run build
npm run verify
```

`npm run verify` fuehrt Typecheck, PostgreSQL-Migrationscheck und Build aus. Es fuehrt keine Migration und keinen Seed aus.

## Nicht im normalen Test ausfuehren

```bash
npm run db:pg:migrate
npm run db:pg:seed
npm run db:migrate:local
npm run db:generate
```

`db:pg:migrate` und `db:pg:seed` nur nach ausdruecklicher Freigabe und nur gegen eine bestaetigte Testdatenbank verwenden. Keine `DATABASE_URL` fuer normale UI- und Smoke-Tests setzen.
