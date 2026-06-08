import { NextResponse } from 'next/server';
import type { AccessUser } from '@/lib/auth/accessControl';
import { resolveDemoAccessUserFromRequest } from '@/lib/auth/accessControl';
import { createSupabaseServerClient } from '@/lib/auth/supabaseServer';
import { getProfileByUserId } from '@/lib/db/profileRepository';
import type { ProfileRow } from '@/lib/db/schema.types';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Resolves the authenticated user for an incoming server-side request.
 *
 * Flow:
 *   1. Extract Bearer token from Authorization header.
 *   2. No token → dev: demo fallback; prod: null.
 *   3. Verify token via supabase.auth.getUser(token).
 *   4. Supabase error or no user → dev: demo fallback; prod: null.
 *   5. Load profile from `profiles` table via getProfileByUserId.
 *   6. No profile → null.
 *   7. profile.active === false → null.
 *   8. Return { role, districtId, schoolId } as AccessUser.
 *
 * Missing Supabase ENV in development:
 *   createSupabaseServerClient() throws → caught → demo fallback.
 *   Developers without Supabase ENV configured can still use x-demo-role.
 *
 * Missing Supabase ENV in production:
 *   The caught error is rethrown → surfaces as 500 (configuration error).
 *
 * DB errors from getProfileByUserId are NOT caught — they propagate to
 * the API route handler and surface as 500 (data layer failure).
 *
 * Tokens and user IDs are never logged.
 */
export async function resolveAuthenticatedUser(request: Request): Promise<AccessUser> {
  const token = extractBearerToken(request.headers.get('Authorization'));

  // No token: dev gets demo fallback, prod gets null.
  if (!token) {
    return isDev ? resolveDemoAccessUserFromRequest(request) : null;
  }

  // Verify token with Supabase Auth.
  let userId: string;
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      // Supabase rejected the token or returned no user.
      return isDev ? resolveDemoAccessUserFromRequest(request) : null;
    }

    userId = data.user.id;
  } catch (err) {
    // ENV not configured or network-level failure.
    if (isDev) {
      // Fall back to demo auth — Supabase may not be set up yet in this environment.
      return resolveDemoAccessUserFromRequest(request);
    }
    // Production: configuration error — propagate as 500.
    throw err;
  }

  // Load profile from the database.
  // DB errors propagate intentionally — callers must handle as 500.
  const profile = await getProfileByUserId(userId);

  if (!profile) return null;

  // Inactive profiles are rejected here (access-control concern, not data concern).
  if (!profile.active) return null;

  return {
    role:       profile.role,
    districtId: profile.district_id ?? undefined,
    schoolId:   profile.school_id   ?? undefined,
  };
}

/**
 * Resolves the full ProfileRow for an incoming server-side request.
 *
 * Like resolveAuthenticatedUser, but returns the complete ProfileRow
 * instead of the minimal AccessUser shape. Useful where extra profile
 * fields (username, mustChangePassword, realEmail, etc.) are needed.
 *
 * No dev demo fallback — demo mode carries no database profile.
 * Returns null if:
 *   - no Bearer token
 *   - token invalid / Supabase ENV missing
 *   - no matching profile row
 *   - profile.active === false
 *
 * Throws on DB connection or query failure.
 */
export async function resolveProfileFromRequest(request: Request): Promise<ProfileRow | null> {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) return null;

  let userId: string;
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    userId = data.user.id;
  } catch {
    // ENV not configured or network failure — no profile available.
    return null;
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) return null;
  if (!profile.active) return null;
  return profile;
}

/**
 * Defense-in-depth gate for the must_change_password flag.
 *
 * The flag is set whenever an admin creates an account or resets a password.
 * The frontend shows a blocking modal, but that alone is bypassable: a user
 * holding the temporary password can obtain a valid JWT via /api/auth/signin
 * and call API routes directly. This gate enforces the flag on the server so a
 * pending password change cannot be skipped.
 *
 * Returns a 403 { error: 'PASSWORD_CHANGE_REQUIRED' } response when the resolved
 * profile still requires a password change, otherwise null.
 *
 * MUST NOT be applied to:
 *   - GET  /api/me                 (frontend needs it to detect the flag)
 *   - POST /api/me/change-password (the route that clears the flag)
 */
export function passwordChangeBlockResponse(profile: ProfileRow | null): NextResponse | null {
  if (profile?.must_change_password === true) {
    return NextResponse.json({ error: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 });
  }
  return null;
}

/**
 * Convenience wrapper: resolves the profile from the request and returns a
 * 403 PASSWORD_CHANGE_REQUIRED response if a password change is pending.
 *
 * Use in routes that resolve auth via resolveAuthenticatedUser (which does not
 * carry the flag). Routes that already hold a ProfileRow should call
 * passwordChangeBlockResponse(actor) directly to avoid a second resolution.
 *
 * Fail-open by design: requests without a real profile (no token, dev demo
 * mode, or the unauthenticated school-code flow) are never blocked here — their
 * own route auth decides. There is no flag without a profile, so this is safe.
 */
export async function enforcePasswordChangeGate(request: Request): Promise<NextResponse | null> {
  const profile = await resolveProfileFromRequest(request);
  return passwordChangeBlockResponse(profile);
}

/**
 * Extracts the Bearer token from an Authorization header value.
 * Returns null for missing, malformed, or non-Bearer headers.
 * Only "Bearer <token>" with a single space and non-empty token is accepted.
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const spaceIndex = authHeader.indexOf(' ');
  if (spaceIndex === -1) return null;
  const scheme = authHeader.slice(0, spaceIndex);
  const token  = authHeader.slice(spaceIndex + 1).trim();
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}
