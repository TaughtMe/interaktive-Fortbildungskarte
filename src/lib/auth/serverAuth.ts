import type { AccessUser } from '@/lib/auth/accessControl';
import { resolveDemoAccessUserFromRequest } from '@/lib/auth/accessControl';
import { createSupabaseServerClient } from '@/lib/auth/supabaseServer';
import { getProfileByUserId } from '@/lib/db/profileRepository';

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
