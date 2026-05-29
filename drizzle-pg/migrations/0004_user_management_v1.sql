-- ============================================================
-- Migration 0004: Benutzerverwaltung v1
-- ============================================================
-- Vorabprüfung ergab: training_needs.created_by = 0 Werte,
-- audit_logs.user_id = 0 Werte. Migration unkritisch.
--
-- NICHT über drizzle-kit push ausführen — manuell only.
-- ============================================================

BEGIN;

-- ── Schritt 0: Datenvorbereitung ─────────────────────────────
-- Idempotent. Werte zeigen auf Alttabelle users, nicht profiles.
-- Vorabprüfung ergab 0 betroffene Zeilen — diese Statements
-- sind trotzdem Pflicht für die Typmigration in Schritt 2.

UPDATE training_needs
  SET created_by = NULL
  WHERE created_by IS NOT NULL;

UPDATE audit_logs
  SET user_id = NULL
  WHERE user_id IS NOT NULL;

-- ── Schritt 1: Alte FKs auf Alttabelle users entfernen ───────

ALTER TABLE training_needs
  DROP CONSTRAINT IF EXISTS training_needs_created_by_users_id_fk;

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_users_id_fk;

-- ── Schritt 2: Spaltentypen text → uuid ──────────────────────
-- Sicher: alle Werte nach Schritt 0 NULL. NULL::uuid = NULL.

ALTER TABLE training_needs
  ALTER COLUMN created_by TYPE uuid USING created_by::uuid;

ALTER TABLE audit_logs
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- ── Schritt 3: Neue FKs auf profiles ─────────────────────────

ALTER TABLE training_needs
  ADD CONSTRAINT training_needs_created_by_profiles_fk
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_user_id_profiles_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ── Schritt 4: Neue Spalten in profiles ──────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username             text,
  ADD COLUMN IF NOT EXISTS real_email           text,
  ADD COLUMN IF NOT EXISTS is_local_account     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at        timestamptz,
  ADD COLUMN IF NOT EXISTS created_by           uuid;

-- ── Schritt 5: Constraints auf neuen Spalten ─────────────────

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_unique
  UNIQUE (username);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_real_email_unique
  UNIQUE (real_email);

-- Lokale Konten brauchen zwingend eine Benutzerkennung
ALTER TABLE profiles
  ADD CONSTRAINT profiles_local_requires_username
  CHECK (is_local_account = false OR username IS NOT NULL);

-- Self-Reference: wer hat das Konto erstellt?
-- SET NULL wenn erstellender Superadmin später gelöscht wird.
ALTER TABLE profiles
  ADD CONSTRAINT profiles_created_by_fk
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ── Schritt 6: Indizes ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS pg_profiles_username_idx
  ON profiles (username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS pg_profiles_is_local_account_idx
  ON profiles (is_local_account);

CREATE INDEX IF NOT EXISTS pg_profiles_must_change_password_idx
  ON profiles (must_change_password)
  WHERE must_change_password = true;

-- ── Schritt 7: Neue Tabelle user_deletion_logs ────────────────
-- Keine FKs auf deleted_user_id / deleted_by_id —
-- Einträge müssen nach User-Löschung lesbar bleiben.

CREATE TABLE IF NOT EXISTS user_deletion_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id   uuid        NOT NULL,
  username          text,
  email             text,
  real_email        text,
  display_name      text,
  role              text        NOT NULL,
  deleted_by_id     uuid        NOT NULL,
  deleted_by_email  text        NOT NULL,
  deleted_at        timestamptz NOT NULL DEFAULT now(),
  reason            text,
  auto_purge_at     timestamptz NOT NULL DEFAULT (now() + interval '12 months')
);

CREATE INDEX IF NOT EXISTS user_deletion_logs_deleted_at_idx
  ON user_deletion_logs (deleted_at);

CREATE INDEX IF NOT EXISTS user_deletion_logs_auto_purge_at_idx
  ON user_deletion_logs (auto_purge_at);

CREATE INDEX IF NOT EXISTS user_deletion_logs_deleted_by_id_idx
  ON user_deletion_logs (deleted_by_id);

COMMIT;
