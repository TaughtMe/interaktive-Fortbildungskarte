/**
 * DB schema types — row shapes for prepared Drizzle tables.
 *
 * Naming convention: <Entity>Row = what a SQLite/D1-style SELECT returns.
 * Repositories map *Row → UI type; UI types live in src/types/.
 *
 * All IDs are string (UUID). Timestamps are ISO-8601 strings (D1 TEXT).
 * Nullable columns are typed as `string | null` (not `undefined`).
 *
 * PostgreSQL Select/Insert types live in schema.pg.ts. The app still maps DB
 * rows to UI types explicitly and stays on mock/static data by default.
 */

import type { SchoolTypKey } from '@/types';
import type { TrainingNeedFormat, TrainingNeedPriority, TrainingNeedStatus } from '@/types/trainingNeed';
import type { DatabaseRole } from '@/types/auth';

// ── profiles ──────────────────────────────────────────────────────────────────
// Produktionsrollen für echte Supabase Auth Nutzer.
// public / admin / leadership / school sind reine Demo-/Legacy-Rollen
// und dürfen nie in die profiles-Tabelle eingetragen werden.
export type ProductionRole =
  | 'superadmin'
  | 'district_admin'
  | 'coordinator'
  | 'school_user'
  | 'viewer';

// profiles.id = auth.users.id (uuid)
// FK auf auth.users(id) ON DELETE CASCADE — nur in SQL-Migration, nicht in Drizzle-Schema.
//
// email:      immer gesetzt — spiegelt auth.users.email (echt oder synthetisch).
// real_email: optional — echte Kontakt-/Reset-E-Mail (nur bei Lokalkonten relevant).
// username:   Benutzerkennung für Login ohne E-Mail (z. B. 'schule-babenhausen').
// Phase 1 (Migration 0004): username, real_email, is_local_account,
// must_change_password, last_login_at, created_by hinzugefügt.
export interface ProfileRow {
  id:                   string;         // uuid — entspricht auth.users.id
  email:                string;         // Auth-E-Mail (real oder synthetisch)
  role:                 ProductionRole;
  district_id:          string | null;  // Pflicht für district_admin, coordinator
  school_id:            string | null;  // Pflicht für school_user
  display_name:         string | null;
  active:               boolean;
  // ── Phase 1: Benutzerverwaltung v1 ──────────────────────────
  username:             string | null;  // Benutzerkennung, eindeutig falls gesetzt
  real_email:           string | null;  // echte Kontakt-/Reset-E-Mail, optional
  is_local_account:     boolean;        // true = Lokalkonto ohne echte E-Mail
  must_change_password: boolean;        // erzwingt Passwortwechsel beim nächsten Login
  last_login_at:        string | null;  // ISO-8601 oder null
  created_by:           string | null;  // uuid des erstellenden Superadmins, oder null
  // ────────────────────────────────────────────────────────────
  created_at:           string;
  updated_at:           string;
}

export interface DistrictRow {
  id:               string;
  name:             string;
  slug:             string;
  description:      string | null;
  color:            string | null;
  boundary_geojson: unknown | null;
  created_at:       string;
  updated_at:       string;
}

// ── schools ──────────────────────────────────────────────────────────────────
// Future table: CREATE TABLE schools (id TEXT PRIMARY KEY, ...)
export interface SchoolRow {
  id:         string;
  district_id: string | null;
  name:       string;
  ort:        string;
  typ:        SchoolTypKey;
  lat:        number;
  lng:        number;
  adresse:    string;
  tel:        string;
  fax:        string | null;   // UI uses '' as fallback; DB stores NULL
  mail:       string;
  web:        string | null;
  leitung:    string | null;
  created_at: string;
  updated_at: string;
}

// ── users ─────────────────────────────────────────────────────────────────────
// Future table: CREATE TABLE users (id TEXT PRIMARY KEY, ...)
// Relationships: users.district_id -> districts.id, users.school_id -> schools.id
export interface UserRow {
  id:           string;
  email:        string;
  display_name: string;
  role:         DatabaseRole;  // 'public' is anonymous, not a DB user
  district_id:  string | null;
  school_id:    string | null;
  created_at:   string;
  updated_at:   string;
}

// ── sessions ──────────────────────────────────────────────────────────────────
// Future table: CREATE TABLE sessions (id TEXT PRIMARY KEY, ...)
// Relationship: sessions.user_id → users.id
// TODO (auth): Populate only after a separate auth/session concept is approved.
export interface SessionRow {
  id:         string;
  user_id:    string;
  expires_at: string;
  created_at: string;
}

// ── school_access_codes ───────────────────────────────────────────────────────
// PostgreSQL pilot table only. Stores hashes, never plaintext access codes.
export interface SchoolAccessCodeRow {
  id:           string;
  school_id:    string;
  code_hash:    string;
  label:        string | null;
  active:       number;
  expires_at:   string | null;
  last_used_at: string | null;
  created_at:   string;
  updated_at:   string;
}

// ── training_needs ────────────────────────────────────────────────────────────
// Future table: CREATE TABLE training_needs (id TEXT PRIMARY KEY, ...)
// Relationships:
//   training_needs.school_id   → schools.id
//   training_needs.created_by  → users.id (nullable until auth exists)
export interface TrainingNeedRow {
  id:               string;
  school_id:        string;
  created_by:       string | null;       // user_id; NULL until auth is wired
  topic:            string;
  description:      string;
  priority:         TrainingNeedPriority;
  target_group:     string;
  preferred_format: TrainingNeedFormat;
  status:           TrainingNeedStatus;
  created_at:       string;
  updated_at:       string;
}

// ── training_offers ───────────────────────────────────────────────────────────
// Future table: CREATE TABLE training_offers (id TEXT PRIMARY KEY, ...)
// Relationship: training_offers.training_need_id → training_needs.id (nullable;
//               an offer may be created proactively without a specific need)
export type TrainingOfferStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled';

export interface TrainingOfferRow {
  id:                 string;
  training_need_id:   string | null;
  title:              string;
  description:        string;
  date:               string | null;  // ISO-8601 date string
  location:           string | null;
  max_participants:   number | null;
  format:             TrainingNeedFormat;
  status:             TrainingOfferStatus;
  created_at:         string;
  updated_at:         string;
}

// ── audit_logs ────────────────────────────────────────────────────────────────
// Relationship: audit_logs.user_id → profiles.id ON DELETE SET NULL (Migration 0004)
// Typ user_id: uuid (nach Migration 0004, vorher text → users.id)
// TODO (DB): Implement write path once auth + mutations are in place.
export type AuditAction =
  | 'training_need.created'
  | 'training_need.updated'
  | 'training_need.deleted'
  | 'training_offer.created'
  | 'training_offer.updated'
  | 'user.created'
  | 'user.role_changed';

export interface AuditLogRow {
  id:          string;
  user_id:     string | null;  // uuid als string; FK → profiles.id ON DELETE SET NULL
  action:      AuditAction;
  entity_type: string;
  entity_id:   string;
  details:     string | null;  // JSON string; parse with JSON.parse() at read time
  created_at:  string;
}

// ── user_deletion_logs ────────────────────────────────────────────────────────
// Löschprotokoll (Migration 0004). Keine FKs — Einträge bleiben nach User-Löschung erhalten.
// auto_purge_at: für späteren Cleanup-Job nach 12 Monaten.
export interface UserDeletionLogRow {
  id:               string;         // uuid
  deleted_user_id:  string;         // uuid des gelöschten Profils
  username:         string | null;
  email:            string | null;  // Auth-E-Mail zum Zeitpunkt der Löschung
  real_email:       string | null;  // echte E-Mail zum Zeitpunkt der Löschung
  display_name:     string | null;
  role:             string;
  deleted_by_id:    string;         // uuid des ausführenden Superadmins
  deleted_by_email: string;
  deleted_at:       string;         // ISO-8601
  reason:           string | null;
  auto_purge_at:    string;         // ISO-8601 — 12 Monate nach deleted_at
}
