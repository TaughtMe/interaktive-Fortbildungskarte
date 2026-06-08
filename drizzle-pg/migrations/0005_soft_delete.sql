-- ============================================================
-- Migration 0005: Soft-Delete mit 30-Tage-Wiederherstellungsfenster
-- ============================================================
-- Fügt scheduled_deletion_at zu profiles hinzu.
-- Solange != NULL ist das Konto deaktiviert und wartet auf
-- endgültige Löschung (30 Tage nach Initiierung).
--
-- NICHT über drizzle-kit push ausführen — manuell only.
-- ============================================================

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index: nur Zeilen mit gesetztem Wert indexieren.
CREATE INDEX IF NOT EXISTS pg_profiles_scheduled_deletion_idx
  ON profiles(scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;

COMMIT;
