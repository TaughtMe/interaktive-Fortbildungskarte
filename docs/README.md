# Dokumentation

Diese Dokumente beschreiben den aktuellen Vorbereitungsstand der Fortbildungskarte. Die App laeuft weiterhin standardmaessig mit Mock-/Staticdaten; PostgreSQL/Supabase ist vorbereitet, aber nicht aktiv. Authentifizierung ist noch nicht produktiv umgesetzt.

## Empfohlene Reihenfolge

1. `README.md` im Projektwurzelverzeichnis fuer Installation, Start und sichere Pruefbefehle.
2. `docs/API.md` fuer die vorbereitete Server-/API-Grenze im Mock-Betrieb.
3. `docs/DATENQUELLEN.md` fuer den aktuellen Mock-Betrieb und die vorbereitete D1-Alternative.
4. `docs/DATENMODELL.md` fuer Entitaeten, UI-Typen und vorbereitete DB-Tabellen.
5. `docs/ARCHITEKTUR_DATENBANK.md` fuer die Datenbankentscheidung: Supabase/PostgreSQL bevorzugt, D1 nur Alternative.
6. `docs/TESTPLAN.md` fuer manuelle Smoke-Tests im Mock- und optionalen API-Modus.
7. `docs/SUPABASE_SETUP.md` erst lesen, wenn eine isolierte Supabase-Testmigration bewusst freigegeben wird.

## Dokumente

| Datei | Zweck |
|---|---|
| `API.md` | Beschreibt die vorbereiteten API-Endpunkte im aktuellen Mock-Betrieb. |
| `DATENMODELL.md` | Beschreibt Fachentitaeten, Rollen, UI-Typen und vorbereitete DB-Tabellen. |
| `DATENQUELLEN.md` | Erklaert den Standard-Mockbetrieb und den nicht aktiven D1-Pfad. |
| `ARCHITEKTUR_DATENBANK.md` | Begruendet PostgreSQL/Supabase als bevorzugte Zielrichtung. |
| `TESTPLAN.md` | Beschreibt manuelle Pruefungen fuer UI, API-Endpunkte und sichere Build-/Typecheck-Kommandos. |
| `SUPABASE_SETUP.md` | Sicherheitsanleitung fuer eine spaetere, freigegebene Supabase-Testanbindung. |

## Status

- Mock-/Staticdaten sind aktiv und bleiben Standard.
- Optionaler UI-API-Modus ist ueber `NEXT_PUBLIC_USE_API=true` verfuegbar und nutzt weiterhin Mock-/Service-Daten hinter den API-Routen.
- PostgreSQL/Supabase ist die bevorzugte Zielrichtung, aber ohne aktive Verbindung.
- D1 ist technisch vorbereitet, bleibt aber eine Alternative.
- Keine Supabase Auth, keine produktive Authentifizierung, keine Sessions, keine Cookies, keine Passwoerter.
- Keine echten Schueler- oder sonstigen personenbezogenen Daten im Testbetrieb verwenden.

Migrationen werden nicht automatisch ausgefuehrt. `npm run db:pg:migrate` und `npm run db:migrate:local` nur nach ausdruecklicher Freigabe verwenden.
