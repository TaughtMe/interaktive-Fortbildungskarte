import { and, asc, eq, isNotNull, lt, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getPostgresDatabaseUrl } from './postgresClient';
import { districts, profiles, schools, userDeletionLogs } from './schema.pg';
import type { ProductionRole, ProfileRow } from './schema.types';

/**
 * Admin-level profile queries for the Benutzerverwaltung API.
 *
 * Read-only in this version (Schritt II). Write functions (insertProfile,
 * updateProfile) are added in Schritt V–VII after explicit approval.
 *
 * Pattern: each function opens a fresh single-connection Postgres client,
 * queries, and closes. Errors propagate to the caller (API route handles 500).
 *
 * Scope enforcement:
 *   - getAllProfiles()          — superadmin only; no WHERE filter
 *   - getProfilesByDistrictId() — district_admin / coordinator scope
 *   - getProfilesBySchoolId()   — school_user scope
 *
 * Access-control responsibility lies with the API route (canListUsers /
 * canViewProfile). These functions are intentionally scope-naive.
 */

const VALID_ROLES = new Set<string>([
  'superadmin',
  'district_admin',
  'coordinator',
  'school_user',
  'viewer',
]);

type ProfileSelectRow = typeof profiles.$inferSelect;

/**
 * Maps a Drizzle select row to ProfileRow.
 * Returns null for rows with unrecognized roles (should not happen given
 * the DB CHECK constraint, but defended here for schema-drift safety).
 */
function mapRow(row: ProfileSelectRow): ProfileRow | null {
  if (!VALID_ROLES.has(row.role)) return null;
  return {
    id:                    row.id,
    email:                 row.email,
    role:                  row.role as ProductionRole,
    district_id:           row.district_id,
    school_id:             row.school_id,
    display_name:          row.display_name,
    active:                row.active,
    // Phase 1: neue Felder
    username:              row.username ?? null,
    real_email:            row.real_email ?? null,
    is_local_account:      row.is_local_account,
    must_change_password:  row.must_change_password,
    last_login_at:         row.last_login_at?.toISOString() ?? null,
    created_by:            row.created_by ?? null,
    // Phase 2: Soft-Delete
    scheduled_deletion_at: row.scheduled_deletion_at?.toISOString() ?? null,
    created_at:            row.created_at.toISOString(),
    updated_at:            row.updated_at.toISOString(),
  };
}

function requireDatabaseUrl(): string {
  const url = getPostgresDatabaseUrl();
  if (!url) throw new Error('[adminUserRepository] DATABASE_URL is not configured.');
  return url;
}

/**
 * Returns all profiles ordered by email.
 * Superadmin use only — no scope filter is applied here.
 *
 * @throws on DB connection or query failure.
 */
export async function getAllProfiles(): Promise<ProfileRow[]> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const rows = await db
      .select()
      .from(profiles)
      .orderBy(asc(profiles.email));
    return rows.map(mapRow).filter((r): r is ProfileRow => r !== null);
  } finally {
    await client.end();
  }
}

/**
 * Returns all profiles in a district, ordered by role then email.
 * For district_admin and coordinator scope.
 *
 * @throws on DB connection or query failure.
 */
export async function getProfilesByDistrictId(districtId: string): Promise<ProfileRow[]> {
  if (!districtId) return [];
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.district_id, districtId))
      .orderBy(asc(profiles.role), asc(profiles.email));
    return rows.map(mapRow).filter((r): r is ProfileRow => r !== null);
  } finally {
    await client.end();
  }
}

/**
 * Returns all profiles belonging to a school, ordered by email.
 * For school_user scope.
 *
 * @throws on DB connection or query failure.
 */
export async function getProfilesBySchoolId(schoolId: string): Promise<ProfileRow[]> {
  if (!schoolId) return [];
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.school_id, schoolId))
      .orderBy(asc(profiles.email));
    return rows.map(mapRow).filter((r): r is ProfileRow => r !== null);
  } finally {
    await client.end();
  }
}

// ── Write (Schritt V) ─────────────────────────────────────────────────────────

export interface InsertProfileInput {
  /** auth.users UUID — must match the ID returned by inviteUserByEmail / createLocalUser. */
  id:                  string;
  email:               string;        // Auth email (real or synthetic for local accounts)
  role:                ProductionRole;
  districtId:          string | null;
  schoolId:            string | null;
  displayName:         string | null;
  // Phase 4: local account fields (optional — defaults to email_invite behavior when omitted)
  username?:           string | null; // Benutzerkennung (lowercase, unique)
  realEmail?:          string | null; // Echte Kontakt-E-Mail (= email for email_invite, null for local)
  isLocalAccount?:     boolean;       // true for username-based local accounts
  mustChangePassword?: boolean;       // true forces password change on first login
  createdBy?:          string | null; // UUID of the creating superadmin
}

/**
 * Inserts a new profile row. Called immediately after inviteUserByEmail.
 *
 * Throws on failure — callers must catch and run deleteAuthUser cleanup.
 * Does NOT catch duplicate-key errors; that is the caller's responsibility.
 */
export async function insertProfile(input: InsertProfileInput): Promise<ProfileRow> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  const now = new Date();

  try {
    const [row] = await db
      .insert(profiles)
      .values({
        id:                   input.id,
        email:                input.email,
        role:                 input.role,
        district_id:          input.districtId,
        school_id:            input.schoolId,
        display_name:         input.displayName,
        active:               true,
        // Phase 4: local account fields
        username:             input.username           ?? null,
        real_email:           input.realEmail          ?? null,
        is_local_account:     input.isLocalAccount     ?? false,
        must_change_password: input.mustChangePassword ?? false,
        created_by:           input.createdBy          ?? null,
        created_at:           now,
        updated_at:           now,
      })
      .returning();

    if (!row) {
      throw new Error('[adminUserRepository] insertProfile returned no row.');
    }

    const mapped = mapRow(row);
    if (!mapped) {
      throw new Error('[adminUserRepository] insertProfile returned an unrecognized role.');
    }

    return mapped;
  } finally {
    await client.end();
  }
}

/**
 * Returns the number of active (active = true) profiles with role = 'superadmin'.
 *
 * Used by the Multi-Superadmin-Schutz guards (P1) to enforce the
 * "the system must never end up without an active superadmin" rule before
 * destructive actions (delete, deactivate, role change away from superadmin).
 *
 * @throws on DB connection or query failure.
 */
export async function countActiveSuperadmins(): Promise<number> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.role, 'superadmin'), eq(profiles.active, true)));
    return rows.length;
  } finally {
    await client.end();
  }
}

// ── Single-profile lookup ─────────────────────────────────────────────────────

/**
 * Loads a single profile by UUID.
 * Returns null if the profile does not exist or has an unrecognized role.
 *
 * @throws on DB connection or query failure.
 */
export async function getProfileById(id: string): Promise<ProfileRow | null> {
  if (!id) return null;
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    if (!row) return null;
    return mapRow(row);
  } finally {
    await client.end();
  }
}

// ── Profile mutations (superadmin) ────────────────────────────────────────────

/**
 * Sets profiles.active for a user and updates updated_at.
 * Returns the updated ProfileRow.
 *
 * @throws if the profile does not exist or on DB failure.
 */
export async function updateProfileActive(id: string, active: boolean): Promise<ProfileRow> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const [row] = await db
      .update(profiles)
      .set({ active, updated_at: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!row) throw new Error(`[adminUserRepository] updateProfileActive: profile ${id} not found.`);
    const mapped = mapRow(row);
    if (!mapped) throw new Error(`[adminUserRepository] updateProfileActive: unrecognized role for profile ${id}.`);
    return mapped;
  } finally {
    await client.end();
  }
}

/**
 * Sets profiles.must_change_password for a user and updates updated_at.
 * Returns the updated ProfileRow.
 *
 * @throws if the profile does not exist or on DB failure.
 */
export async function setMustChangePassword(id: string, value: boolean): Promise<ProfileRow> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const [row] = await db
      .update(profiles)
      .set({ must_change_password: value, updated_at: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!row) throw new Error(`[adminUserRepository] setMustChangePassword: profile ${id} not found.`);
    const mapped = mapRow(row);
    if (!mapped) throw new Error(`[adminUserRepository] setMustChangePassword: unrecognized role for profile ${id}.`);
    return mapped;
  } finally {
    await client.end();
  }
}

/**
 * Admin update for all editable profile fields.
 *
 * Only the fields present in `input` are updated; others are left unchanged.
 * `profiles.email` is intentionally NEVER touched — it mirrors auth.users.email.
 *
 * @throws if the profile does not exist or on DB failure.
 */
export interface UpdateProfileAdminInput {
  displayName?: string | null;
  role?:        ProductionRole;
  districtId?:  string | null;
  schoolId?:    string | null;
  realEmail?:   string | null;
  username?:    string | null;
  active?:      boolean;
}

export async function updateProfileAdmin(
  id: string,
  input: UpdateProfileAdminInput,
): Promise<ProfileRow> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);

  // Build the partial update object; only include fields that were explicitly provided.
  const setValues: {
    display_name?: string | null;
    role?:         ProductionRole;
    district_id?:  string | null;
    school_id?:    string | null;
    real_email?:   string | null;
    username?:     string | null;
    active?:       boolean;
    updated_at:    Date;
  } = { updated_at: new Date() };

  if ('displayName' in input) setValues.display_name = input.displayName ?? null;
  if ('role'        in input) setValues.role         = input.role!;
  if ('districtId'  in input) setValues.district_id  = input.districtId  ?? null;
  if ('schoolId'    in input) setValues.school_id    = input.schoolId    ?? null;
  if ('realEmail'   in input) setValues.real_email   = input.realEmail   ?? null;
  if ('username'    in input) setValues.username     = input.username    ?? null;
  if ('active'      in input) setValues.active       = input.active!;

  try {
    const [row] = await db
      .update(profiles)
      .set(setValues)
      .where(eq(profiles.id, id))
      .returning();

    if (!row) {
      throw new Error(`[adminUserRepository] updateProfileAdmin: profile ${id} not found.`);
    }
    const mapped = mapRow(row);
    if (!mapped) {
      throw new Error(`[adminUserRepository] updateProfileAdmin: unrecognized role for profile ${id}.`);
    }
    return mapped;
  } finally {
    await client.end();
  }
}

/**
 * Returns the profile whose real_email matches, excluding a given ID.
 *
 * Used for uniqueness pre-check before updating real_email in the admin edit flow.
 * Excludes `excludeId` so an unchanged email doesn't trigger a self-collision.
 *
 * Returns null if no other profile uses that real_email.
 *
 * @throws on DB connection or query failure.
 */
export async function getProfileByRealEmail(
  realEmail: string,
  excludeId: string,
): Promise<ProfileRow | null> {
  if (!realEmail) return null;
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const [row] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.real_email, realEmail), ne(profiles.id, excludeId)))
      .limit(1);

    if (!row) return null;
    return mapRow(row);
  } finally {
    await client.end();
  }
}

// ── Deletion log ──────────────────────────────────────────────────────────────

export interface InsertUserDeletionLogInput {
  deletedUserId:  string;          // UUID of the deleted profile
  username:       string | null;
  email:          string | null;   // Auth e-mail at deletion time
  realEmail:      string | null;   // Contact e-mail at deletion time
  displayName:    string | null;
  role:           string;
  deletedById:    string;          // UUID of the superadmin performing the deletion
  deletedByEmail: string;          // E-mail of the superadmin (denormalized for audit)
  reason?:        string | null;
}

/**
 * Writes a deletion log entry BEFORE the auth user is deleted.
 *
 * auto_purge_at is set to 12 months from now (cleanup is manual or via cron).
 *
 * IMPORTANT: If this throws, the caller MUST abort the deletion — no auth user
 * should be removed without a corresponding log entry.
 *
 * @throws on DB connection or query failure.
 */
export async function insertUserDeletionLog(input: InsertUserDeletionLogInput): Promise<void> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  const now = new Date();
  const autoPurgeAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // +12 months

  try {
    await db.insert(userDeletionLogs).values({
      deleted_user_id:  input.deletedUserId,
      username:         input.username         ?? null,
      email:            input.email            ?? null,
      real_email:       input.realEmail        ?? null,
      display_name:     input.displayName      ?? null,
      role:             input.role,
      deleted_by_id:    input.deletedById,
      deleted_by_email: input.deletedByEmail,
      reason:           input.reason           ?? null,
      auto_purge_at:    autoPurgeAt,
    });
  } finally {
    await client.end();
  }
}

// ── Soft-Delete / Restore (Phase 2) ──────────────────────────────────────────

/** Grace period in milliseconds (30 days). */
const SOFT_DELETE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Marks a profile for soft-deletion:
 *   - sets active = false
 *   - sets scheduled_deletion_at = now + 30 days
 *   - updates updated_at
 *
 * Does NOT write to user_deletion_logs — the caller (route) is responsible
 * for calling insertUserDeletionLog BEFORE this function (fail-fast pattern).
 *
 * @throws if the profile does not exist or on DB failure.
 */
export async function softDeleteProfile(id: string): Promise<ProfileRow> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  const now = new Date();
  const scheduledDeletionAt = new Date(now.getTime() + SOFT_DELETE_GRACE_MS);
  try {
    const [row] = await db
      .update(profiles)
      .set({ active: false, scheduled_deletion_at: scheduledDeletionAt, updated_at: now })
      .where(eq(profiles.id, id))
      .returning();
    if (!row) throw new Error(`[adminUserRepository] softDeleteProfile: profile ${id} not found.`);
    const mapped = mapRow(row);
    if (!mapped) throw new Error(`[adminUserRepository] softDeleteProfile: unrecognized role for profile ${id}.`);
    return mapped;
  } finally {
    await client.end();
  }
}

/**
 * Restores a soft-deleted profile:
 *   - clears scheduled_deletion_at (sets to NULL)
 *   - sets active = true
 *   - updates updated_at
 *
 * @throws if the profile does not exist or on DB failure.
 */
export async function restoreProfile(id: string): Promise<ProfileRow> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const [row] = await db
      .update(profiles)
      .set({ active: true, scheduled_deletion_at: null, updated_at: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    if (!row) throw new Error(`[adminUserRepository] restoreProfile: profile ${id} not found.`);
    const mapped = mapRow(row);
    if (!mapped) throw new Error(`[adminUserRepository] restoreProfile: unrecognized role for profile ${id}.`);
    return mapped;
  } finally {
    await client.end();
  }
}

/**
 * Returns all profiles whose scheduled_deletion_at is in the past (< now).
 * These accounts have exceeded the 30-day grace period and should be hard-deleted.
 *
 * @throws on DB connection or query failure.
 */
export async function getExpiredSoftDeletedProfiles(): Promise<ProfileRow[]> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    const rows = await db
      .select()
      .from(profiles)
      .where(and(isNotNull(profiles.scheduled_deletion_at), lt(profiles.scheduled_deletion_at, new Date())));
    return rows.map(mapRow).filter((r): r is ProfileRow => r !== null);
  } finally {
    await client.end();
  }
}

// ── Lookup options (for CreateUserModal dropdowns) ────────────────────────────

export interface DistrictOption {
  id:   string;
  name: string;
}

/**
 * Returns all districts sorted by name.
 * Used to populate the district dropdown in CreateUserModal.
 *
 * @throws on DB connection or query failure.
 */
export async function getAllDistricts(): Promise<DistrictOption[]> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    return await db
      .select({ id: districts.id, name: districts.name })
      .from(districts)
      .orderBy(asc(districts.name));
  } finally {
    await client.end();
  }
}

export interface SchoolOption {
  id:         string;
  name:       string;
  ort:        string;
  districtId: string | null;
}

/**
 * Returns all schools sorted by ort, then name.
 * Used to populate the school dropdown in CreateUserModal.
 *
 * @throws on DB connection or query failure.
 */
export async function getAllSchoolOptions(): Promise<SchoolOption[]> {
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    return await db
      .select({
        id:         schools.id,
        name:       schools.name,
        ort:        schools.ort,
        districtId: schools.district_id,
      })
      .from(schools)
      .orderBy(asc(schools.ort), asc(schools.name));
  } finally {
    await client.end();
  }
}
