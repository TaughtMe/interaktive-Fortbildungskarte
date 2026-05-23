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
3. Thema, Beschreibung, Zielgruppe, Prioritaet, Format und Schul-Zugriffscode ausfuellen.
4. Meldung absenden.
5. Bedarf in der Detailansicht pruefen.
6. Bedarf wieder entfernen.

Erwartung: Im Mock-Modus wird lokal ein Bedarf angelegt, solange ein nichtleerer Code eingegeben wurde. Im PostgreSQL-API-Modus wird `POST /api/training-needs` nur mit gueltigem schulgebundenem Code gespeichert. Falsche oder abgelaufene Codes zeigen "Der Zugriffscode ist ungültig oder abgelaufen."

## Rollenwechsel

1. Demo-Rolle `public` pruefen.
2. Auf `school_user` wechseln und "Meine Schule" pruefen.
3. Als `school_user` die eigene Demo-Schule `bb-gs` oeffnen und Bedarf melden.
4. Als `school_user` eine andere Schule anklicken.
5. Auf `viewer` wechseln und eine Schule im eigenen Bezirk oeffnen.
6. Als `viewer` pruefen, dass statt "Bedarf melden" ein Hinweis erscheint.
7. Auf `coordinator` wechseln und Koordinationsansicht inklusive CSV-Export pruefen.
8. Auf `district_admin` wechseln und Verwaltungsansicht fuer den eigenen Bezirk pruefen.
9. Auf `superadmin` wechseln und Superadmin-Funktionen pruefen.
10. Legacy-Rollen `school`, `admin` und `leadership` als Kompatibilitaetscheck pruefen.

Erwartung: Tabs und Funktionen passen zur Rolle. Rollen ohne Berechtigung sehen Hinweise statt Formularen oder gesperrte Aktionen. Es gibt keine echte Authentifizierung, keine Sessions, keine Cookies und keine Passwoerter.

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

Demo-Zugriffskontrolle im Entwicklungsmodus:

```bash
curl "http://localhost:3000/api/schools?districtId=district-memmingen&demoRole=coordinator"
curl "http://localhost:3000/api/training-needs/export?demoRole=viewer&districtId=district-unterallgaeu"
curl http://localhost:3000/api/schools/bb-gs -H "X-Demo-Role: school_user"
```

Erwartung: Koordinatoren duerfen nur den eigenen Demo-Bezirk lesen/exportieren, Viewer erhalten beim Export 403, `school_user` darf nur die eigene Demo-Schule abrufen.

POST-Beispiel:

```bash
curl -X POST http://localhost:3000/api/training-needs \
  -H "Content-Type: application/json" \
  -H "X-Demo-Role: school_user" \
  -d '{
    "schoolId": "bb-gs",
    "schoolCode": "<nicht-versionierter-testcode>",
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
  -d '{"schoolId":"","schoolCode":"","topic":"","description":"","priority":"falsch","targetGroup":"","preferredFormat":"falsch"}'

curl -X POST http://localhost:3000/api/training-needs \
  -H "Content-Type: application/json" \
  -H "X-Demo-Role: viewer" \
  -d '{
    "schoolId": "bb-gs",
    "schoolCode": "<nicht-versionierter-testcode>",
    "topic": "Nicht erlaubt",
    "description": "Synthetischer Negativtest.",
    "priority": "mittel",
    "targetGroup": "Lehrkraefte",
    "preferredFormat": "online"
  }'
```

Zusaetzliche PostgreSQL-Pilotpruefungen nach ausdruecklicher Freigabe fuer Migration und Testcode-Seed:

```bash
curl -X POST http://localhost:3000/api/training-needs \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"bb-gs","topic":"Test","description":"Ohne Code","priority":"mittel","targetGroup":"Lehrkraefte","preferredFormat":"online"}'

curl -X POST http://localhost:3000/api/training-needs \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"bb-gs","schoolCode":"FALSCH","topic":"Test","description":"Falscher Code","priority":"mittel","targetGroup":"Lehrkraefte","preferredFormat":"online"}'
```

Erwartung: Ohne Code `400`, falscher/deaktivierter/abgelaufener Code `403`, unbekannte Schule bei POST `404`, gueltiger Code `201`; danach zeigt `GET /api/training-needs` den neuen Bedarf. Erfolgsantworten haben `{ "data": ... }`, Fehlerantworten `{ "error": "..." }`. Der Export liefert `text/csv` mit den dokumentierten Spalten.

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
SEED_SCHOOL_CODES_CONFIRM=seed-school-codes npm run db:pg:seed:school-codes
npm run db:migrate:local
npm run db:generate
```

`db:pg:migrate`, `db:pg:seed` und `db:pg:seed:school-codes` nur nach ausdruecklicher Freigabe und nur gegen eine bestaetigte Testdatenbank verwenden. Keine `DATABASE_URL` fuer normale UI- und Smoke-Tests setzen. Zugriffscodes nicht in Git oder Doku uebernehmen.
