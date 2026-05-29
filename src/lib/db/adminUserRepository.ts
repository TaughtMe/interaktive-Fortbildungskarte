import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getPostgresDatabaseUrl } from './postgresClient';
import { districts, profiles, schools } from './schema.pg';
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
    id:                   row.id,
    email:                row.email,
    role:                 row.role as ProductionRole,
    district_id:          row.district_id,
    school_id:            row.school_id,
    display_name:         row.display_name,
    active:               row.active,
    // Phase 1: neue Felder
    username:             row.username ?? null,
    real_email:           row.real_email ?? null,
    is_local_account:     row.is_local_account,
    must_change_password: row.must_change_password,
    last_login_at:        row.last_login_at?.toISOString() ?? null,
    created_by:           row.created_by ?? null,
    created_at:           row.created_at.toISOString(),
    updated_at:           row.updated_at.toISOString(),
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
  /** auth.users UUID — must match the ID returned by inviteUserByEmail. */
  id:          string;
  email:       string;
  role:        ProductionRole;
  districtId:  string | null;
  schoolId:    string | null;
  displayName: string | null;
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
        id:           input.id,
        email:        input.email,
        role:         input.role,
        district_id:  input.districtId,
        school_id:    input.schoolId,
        display_name: input.displayName,
        active:       true,
        created_at:   now,
        updated_at:   now,
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
