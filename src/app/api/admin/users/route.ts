import { NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/serverAuth';
import { AuthProviderError } from '@/lib/auth/authProvider';
import { supabaseAuthProvider } from '@/lib/auth/providers/supabaseAuthProvider';
import { canListUsers, canViewProfile } from '@/lib/auth/userManagementAccess';
import {
  getAllProfiles,
  getProfilesByDistrictId,
  getProfilesBySchoolId,
  insertProfile,
} from '@/lib/db/adminUserRepository';
import type { ProductionRole } from '@/lib/db/schema.types';
import { normalizeRole } from '@/types/auth';

// ── Shared validation ─────────────────────────────────────────────────────────

const VALID_ROLES = new Set<ProductionRole>([
  'superadmin', 'district_admin', 'coordinator', 'school_user', 'viewer',
]);

interface ValidatedCreateBody {
  email:       string;
  displayName: string | null;
  role:        ProductionRole;
  districtId:  string | null;
  schoolId:    string | null;
}

function parseCreateBody(raw: unknown): ValidatedCreateBody | { error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { error: 'Ungültiges Anforderungsformat.' };
  }

  const b = raw as Record<string, unknown>;

  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@') || !email.includes('.')) {
    return { error: 'Gültige E-Mail-Adresse erforderlich.' };
  }

  const role = typeof b.role === 'string' ? (b.role as ProductionRole) : null;
  if (!role || !VALID_ROLES.has(role)) {
    return { error: 'Ungültige Rolle.' };
  }

  const displayName =
    typeof b.displayName === 'string' && b.displayName.trim()
      ? b.displayName.trim()
      : null;

  const districtId =
    typeof b.districtId === 'string' && b.districtId.trim()
      ? b.districtId.trim()
      : null;

  const schoolId =
    typeof b.schoolId === 'string' && b.schoolId.trim()
      ? b.schoolId.trim()
      : null;

  // Enforce role-specific required fields
  if ((role === 'district_admin' || role === 'coordinator') && !districtId) {
    return { error: 'Bezirk ist für diese Rolle erforderlich.' };
  }
  if (role === 'school_user' && !schoolId) {
    return { error: 'Schule ist für diese Rolle erforderlich.' };
  }

  return { email, displayName, role, districtId, schoolId };
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 *
 * Returns profiles scoped to the authenticated actor's role:
 *   superadmin     — all profiles
 *   district_admin — profiles in actor's district
 *   coordinator    — profiles in actor's district
 *   school_user    — profiles in actor's school
 *   viewer / public — 403
 *
 * A secondary canViewProfile() check is applied as defense-in-depth after the
 * repository query to ensure scope invariants hold even under edge cases.
 *
 * Response: { data: ProfileRow[] }
 * Errors:   { error: string }  with status 401 / 403 / 500
 */
export async function GET(request: Request) {
  try {
    const actor = await resolveAuthenticatedUser(request);

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canListUsers(actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = normalizeRole(actor.role);
    let rawProfiles;

    if (role === 'superadmin') {
      rawProfiles = await getAllProfiles();
    } else if (role === 'district_admin' || role === 'coordinator') {
      if (!actor.districtId) {
        // district_admin / coordinator without a districtId is a data-integrity issue
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      rawProfiles = await getProfilesByDistrictId(actor.districtId);
    } else if (role === 'school_user') {
      if (!actor.schoolId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      rawProfiles = await getProfilesBySchoolId(actor.schoolId);
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Defense-in-depth: secondary per-row canViewProfile check
    const data = rawProfiles.filter((p) => canViewProfile(actor, p));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ── POST /api/admin/users ─────────────────────────────────────────────────────

/**
 * POST /api/admin/users
 *
 * V–VI light pilot: only superadmin may create users.
 *
 * Two-step creation with cleanup:
 *   1. inviteUserByEmail(email) — creates auth.users entry, sends invite email.
 *   2. insertProfile(...)       — creates profiles row with returned UUID.
 *   If step 2 fails → deleteAuthUser(userId) cleanup, return 500.
 *
 * Request body: { email, displayName?, role, districtId?, schoolId? }
 * Response:     { data: ProfileRow }                with status 201
 * Errors:       { error: string }  with status 400 / 401 / 403 / 409 / 500
 */
export async function POST(request: Request) {
  try {
    const actor = await resolveAuthenticatedUser(request);

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // V–VI light: only superadmin may create users.
    // The request body must never influence the actor's permissions.
    if (normalizeRole(actor.role) !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = parseCreateBody(rawBody);

    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email, displayName, role, districtId, schoolId } = parsed;

    // ── Step 1: create auth user ──────────────────────────────────────────────
    let userId: string;
    try {
      const result = await supabaseAuthProvider.inviteUserByEmail(email);
      userId = result.userId;
    } catch (err) {
      if (err instanceof AuthProviderError && err.code === 'DUPLICATE_EMAIL') {
        return NextResponse.json(
          { error: 'E-Mail-Adresse wird bereits verwendet.' },
          { status: 409 },
        );
      }
      // Any other provider error → 500
      throw err;
    }

    // ── Step 2: create profiles row ───────────────────────────────────────────
    // If this fails, the auth user must be deleted (cleanup).
    try {
      const profile = await insertProfile({
        id:          userId,
        email,
        role,
        districtId:  districtId ?? null,
        schoolId:    schoolId  ?? null,
        displayName: displayName ?? null,
      });

      return NextResponse.json({ data: profile }, { status: 201 });
    } catch (profileErr) {
      // Cleanup: remove the auth user we just created to avoid orphaned accounts.
      // Cleanup errors are swallowed — the original profileErr is propagated.
      await supabaseAuthProvider.deleteAuthUser(userId).catch(() => { /* intentional */ });
      throw profileErr;
    }
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
