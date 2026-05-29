import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getPostgresDatabaseUrl } from './postgresClient';
import { profiles } from './schema.pg';
import type { ProductionRole, ProfileRow } from './schema.types';

type PostgresClient = ReturnType<typeof postgres>;

function requireDatabaseUrl(): string {
  const url = getPostgresDatabaseUrl();
  if (!url) throw new Error('[profileRepository] DATABASE_URL is not configured.');
  return url;
}

/**
 * Known production roles — mirrors the CHECK constraint in migration 0003.
 * Used for defensive validation in case a row bypassed the DB constraint
 * (e.g. schema drift, direct DB edit, or future migration error).
 */
const VALID_ROLES = new Set<string>([
  'superadmin',
  'district_admin',
  'coordinator',
  'school_user',
  'viewer',
]);

/**
 * Loads a profile row by Supabase Auth user ID (profiles.id = auth.users.id).
 *
 * Returns null for:
 *   - empty userId (no DB call)
 *   - no matching profile in the table
 *   - profile has an unrecognized role (defensive guard, should not happen
 *     given the DB CHECK constraint in migration 0003)
 *
 * Does NOT filter by `active`. Inactive-profile handling is an access-control
 * decision — it belongs in the auth resolver (resolveAuthenticatedUser, Schritt 2C).
 * Keeping this separation allows admin contexts to read suspended profiles
 * without needing a separate unchecked query.
 *
 * Throws on DB connection or query failure — callers must handle this.
 */
export async function getProfileByUserId(userId: string): Promise<ProfileRow | null> {
  if (!userId) return null;

  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);

  try {
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (!row) return null;

    // Defensive: reject profiles whose role is not a recognized ProductionRole.
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
      // Drizzle returns Date for timestamp columns; ProfileRow expects ISO-8601 strings.
      created_at:           row.created_at.toISOString(),
      updated_at:           row.updated_at.toISOString(),
    };
  } finally {
    await client.end();
  }
}

/**
 * Loads a profile row by username (Benutzerkennung).
 *
 * Normalizes input: trim + lowercase before querying.
 * Usernames are stored lowercase (enforced on insert), so this is an
 * exact equality match — no SQL LOWER() needed.
 *
 * Returns null for:
 *   - empty / whitespace-only username (no DB call)
 *   - no matching profile
 *   - unrecognized role (same defensive guard as getProfileByUserId)
 *
 * Does NOT filter by `active` — caller is responsible for that check.
 * Throws on DB connection or query failure.
 */
export async function getProfileByUsername(username: string): Promise<ProfileRow | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);

  try {
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.username, normalized))
      .limit(1);

    if (!row) return null;
    if (!VALID_ROLES.has(row.role)) return null;

    return {
      id:                   row.id,
      email:                row.email,
      role:                 row.role as ProductionRole,
      district_id:          row.district_id,
      school_id:            row.school_id,
      display_name:         row.display_name,
      active:               row.active,
      username:             row.username ?? null,
      real_email:           row.real_email ?? null,
      is_local_account:     row.is_local_account,
      must_change_password: row.must_change_password,
      last_login_at:        row.last_login_at?.toISOString() ?? null,
      created_by:           row.created_by ?? null,
      created_at:           row.created_at.toISOString(),
      updated_at:           row.updated_at.toISOString(),
    };
  } finally {
    await client.end();
  }
}

/**
 * Clears the `must_change_password` flag after a successful self-service
 * password change. Also updates `updated_at`.
 *
 * Errors are NOT swallowed — the caller must handle failures.
 * If this throws, the password was already changed in Supabase but the DB
 * flag was not cleared. The caller should surface this as a 500 so the user
 * can retry (the retry is idempotent on the Supabase side).
 *
 * @throws on DB connection or query failure.
 */
export async function clearMustChangePassword(userId: string): Promise<void> {
  if (!userId) return;
  const client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
  const db = drizzle(client);
  try {
    await db
      .update(profiles)
      .set({ must_change_password: false, updated_at: new Date() })
      .where(eq(profiles.id, userId));
  } finally {
    await client.end();
  }
}

/**
 * Updates `last_login_at` (and `updated_at`) to the current timestamp.
 *
 * Best-effort — errors are swallowed intentionally.
 * Call after a successful sign-in; the auth flow must never block on this.
 */
export async function updateLastLoginAt(userId: string): Promise<void> {
  if (!userId) return;
  let client: PostgresClient | null = null;
  try {
    client = postgres(requireDatabaseUrl(), { max: 1, ssl: 'require' });
    const db = drizzle(client);
    const now = new Date();
    await db
      .update(profiles)
      .set({ last_login_at: now, updated_at: now })
      .where(eq(profiles.id, userId));
  } catch {
    // Intentionally swallowed — last_login_at is informational, never auth-blocking.
  } finally {
    await client?.end();
  }
}
