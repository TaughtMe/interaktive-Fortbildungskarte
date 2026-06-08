import { NextResponse } from 'next/server';
import {
  resolveAuthenticatedUser,
  resolveProfileFromRequest,
  enforcePasswordChangeGate,
  passwordChangeBlockResponse,
} from '@/lib/auth/serverAuth';
import { AuthProviderError } from '@/lib/auth/authProvider';
import { supabaseAuthProvider } from '@/lib/auth/providers/supabaseAuthProvider';
import { canListUsers, canViewProfile } from '@/lib/auth/userManagementAccess';
import {
  getAllProfiles,
  getExpiredSoftDeletedProfiles,
  getProfilesByDistrictId,
  getProfilesBySchoolId,
  insertProfile,
} from '@/lib/db/adminUserRepository';
import type { InsertProfileInput } from '@/lib/db/adminUserRepository';
import { getProfileByUsername } from '@/lib/db/profileRepository';
import type { ProductionRole, ProfileRow } from '@/lib/db/schema.types';
import { normalizeRole } from '@/types/auth';
import { generateTemporaryPassword } from '@/lib/auth/generatePassword';

// ── Types ─────────────────────────────────────────────────────────────────────

type AccountType        = 'email_account' | 'local_account';
type CredentialDelivery = 'invite_link' | 'generated_password_show_admin' | 'manual_password';

/**
 * Valid accountType + credentialDelivery combinations.
 *
 * local_account + invite_link is not permitted (no real e-mail to send to).
 * generated_password_send_email is reserved for a future mail-delivery feature.
 */
const VALID_COMBINATIONS = new Set<string>([
  'email_account+invite_link',
  'email_account+generated_password_show_admin',
  'email_account+manual_password',
  'local_account+generated_password_show_admin',
  'local_account+manual_password',
]);

const VALID_ROLES = new Set<ProductionRole>([
  'superadmin', 'district_admin', 'coordinator', 'school_user', 'viewer',
]);

// ── Validation helpers ────────────────────────────────────────────────────────

function validateRoleAndScope(
  role: ProductionRole,
  districtId: string | null,
  schoolId:   string | null,
): { error: string } | null {
  if ((role === 'district_admin' || role === 'coordinator') && !districtId) {
    return { error: 'Bezirk ist für diese Rolle erforderlich.' };
  }
  if (role === 'school_user' && !schoolId) {
    return { error: 'Schule ist für diese Rolle erforderlich.' };
  }
  return null;
}

const USERNAME_RE = /^[a-z0-9._-]+$/;

function normalizeUsername(raw: string): { username: string } | { error: string } {
  const t = raw.trim().toLowerCase();
  if (!t) return { error: 'Benutzerkennung ist erforderlich.' };
  if (t.length < 3)  return { error: 'Benutzerkennung muss mindestens 3 Zeichen lang sein.' };
  if (t.length > 64) return { error: 'Benutzerkennung darf maximal 64 Zeichen lang sein.' };
  if (!USERNAME_RE.test(t)) {
    return {
      error:
        'Benutzerkennung darf nur Kleinbuchstaben (a–z), Ziffern (0–9), ' +
        'Punkt (.), Bindestrich (-) und Unterstrich (_) enthalten.',
    };
  }
  return { username: t };
}

function validateManualPassword(raw: unknown): { password: string } | { error: string } {
  if (typeof raw !== 'string' || !raw) return { error: 'Passwort ist erforderlich.' };
  if (raw.length < 8) return { error: 'Passwort muss mindestens 8 Zeichen lang sein.' };
  return { password: raw };
}

// ── Unique-constraint detection ───────────────────────────────────────────────

function isUniqueViolation(err: unknown, constraintName?: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  if (e['code'] !== '23505') return false;
  if (constraintName && e['constraint_name'] !== constraintName) return false;
  return true;
}

// ── Shared two-step creation helper ──────────────────────────────────────────

type CreateOutcome =
  | { success: true;  profile: ProfileRow }
  | { success: false; error: string; status: number };

/**
 * Step 1: createUserWithPassword (Supabase Admin, email_confirm=true).
 * Step 2: insertProfile.
 * On profile failure: deleteAuthUser + return appropriate error response.
 *
 * Never logs passwords.
 */
async function createWithPasswordAndProfile(
  authEmail:    string,
  password:     string,
  profileData:  Omit<InsertProfileInput, 'id'>,
): Promise<CreateOutcome> {
  let userId: string;
  try {
    const r = await supabaseAuthProvider.createUserWithPassword({ email: authEmail, password });
    userId = r.userId;
  } catch (err) {
    if (err instanceof AuthProviderError && err.code === 'DUPLICATE_EMAIL') {
      return { success: false, error: 'E-Mail-Adresse wird bereits verwendet.', status: 409 };
    }
    throw err;
  }

  try {
    const profile = await insertProfile({ id: userId, ...profileData });
    return { success: true, profile };
  } catch (profileErr) {
    await supabaseAuthProvider.deleteAuthUser(userId).catch(() => { /* intentional */ });

    if (isUniqueViolation(profileErr, 'profiles_username_unique')) {
      return { success: false, error: 'Benutzerkennung ist bereits vergeben.', status: 409 };
    }

    throw profileErr;
  }
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
 * Response: { data: ProfileRow[] }
 * Errors:   { error: string }  with status 401 / 403 / 500
 */
export async function GET(request: Request) {
  try {
    const gate = await enforcePasswordChangeGate(request);
    if (gate) return gate;

    const actor = await resolveAuthenticatedUser(request);

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canListUsers(actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = normalizeRole(actor.role);

    // ── Lazy purge: hard-delete accounts past the 30-day grace period ─────────
    // Triggered on every superadmin list load — no separate cron job needed.
    // Errors are swallowed; a failed purge must never block the list response.
    if (role === 'superadmin') {
      try {
        const expired = await getExpiredSoftDeletedProfiles();
        for (const profile of expired) {
          try {
            await supabaseAuthProvider.deleteAuthUser(profile.id);
          } catch {
            // Ignore individual hard-delete failures — the account will be
            // retried on the next list load once the grace period check runs again.
          }
        }
      } catch {
        // Ignore purge errors entirely — list load must still succeed.
      }
    }

    let rawProfiles;

    if (role === 'superadmin') {
      rawProfiles = await getAllProfiles();
    } else if (role === 'district_admin' || role === 'coordinator') {
      if (!actor.districtId) {
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
 * Superadmin only. Request body:
 * {
 *   accountType:        "email_account" | "local_account",
 *   credentialDelivery: "invite_link" | "generated_password_show_admin" | "manual_password",
 *   email?:             string,       // required for email_account
 *   username?:          string,       // required for local_account
 *   displayName?:       string,
 *   role:               ProductionRole,
 *   districtId?:        string,
 *   schoolId?:          string,
 *   password?:          string,       // required for manual_password
 * }
 *
 * Valid combinations:
 *   email_account  + invite_link                 → inviteUserByEmail, must_change_password=false
 *   email_account  + generated_password_show_admin → createUserWithPassword, must_change_password=true
 *   email_account  + manual_password             → createUserWithPassword, must_change_password=true
 *   local_account  + generated_password_show_admin → createUserWithPassword, must_change_password=true
 *   local_account  + manual_password             → createUserWithPassword, must_change_password=true
 *
 * Response for invite_link:   201 { data: ProfileRow }
 * Response for password modes: 201 { data: ProfileRow, temporaryPassword: string, loginIdentifier: string }
 * Errors: { error: string }  with status 400 / 401 / 403 / 409 / 500
 */
export async function POST(request: Request) {
  try {
    // Require a real Supabase session — demo mode cannot create real accounts.
    // Using resolveProfileFromRequest gives us actorProfile.id for created_by.
    const actorProfile = await resolveProfileFromRequest(request);

    if (!actorProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pwBlock = passwordChangeBlockResponse(actorProfile);
    if (pwBlock) return pwBlock;

    if (normalizeRole(actorProfile.role) !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json({ error: 'Ungültiges Anforderungsformat.' }, { status: 400 });
    }
    const b = rawBody as Record<string, unknown>;

    // ── Parse and validate accountType + credentialDelivery ───────────────────
    const accountType        = typeof b.accountType        === 'string' ? b.accountType        as AccountType        : null;
    const credentialDelivery = typeof b.credentialDelivery === 'string' ? b.credentialDelivery as CredentialDelivery : null;

    if (!accountType || !credentialDelivery) {
      return NextResponse.json(
        { error: 'accountType und credentialDelivery sind erforderlich.' },
        { status: 400 },
      );
    }

    if (!VALID_COMBINATIONS.has(`${accountType}+${credentialDelivery}`)) {
      return NextResponse.json(
        { error: `Kombination „${accountType} + ${credentialDelivery}" ist nicht erlaubt.` },
        { status: 400 },
      );
    }

    // ── Parse common fields ────────────────────────────────────────────────────
    const role = typeof b.role === 'string' ? (b.role as ProductionRole) : null;
    if (!role || !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Ungültige Rolle.' }, { status: 400 });
    }

    const displayName =
      typeof b.displayName === 'string' && b.displayName.trim() ? b.displayName.trim() : null;
    const districtId =
      typeof b.districtId === 'string' && b.districtId.trim() ? b.districtId.trim() : null;
    const schoolId =
      typeof b.schoolId === 'string' && b.schoolId.trim() ? b.schoolId.trim() : null;

    const scopeError = validateRoleAndScope(role, districtId, schoolId);
    if (scopeError) return NextResponse.json(scopeError, { status: 400 });

    const actorId = actorProfile.id;

    // ── email_account + invite_link ────────────────────────────────────────────
    if (accountType === 'email_account' && credentialDelivery === 'invite_link') {
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      if (!email || !email.includes('@') || !email.includes('.')) {
        return NextResponse.json({ error: 'Gültige E-Mail-Adresse erforderlich.' }, { status: 400 });
      }

      let userId: string;
      try {
        const r = await supabaseAuthProvider.inviteUserByEmail(email);
        userId = r.userId;
      } catch (err) {
        if (err instanceof AuthProviderError && err.code === 'DUPLICATE_EMAIL') {
          return NextResponse.json({ error: 'E-Mail-Adresse wird bereits verwendet.' }, { status: 409 });
        }
        throw err;
      }

      try {
        const profile = await insertProfile({
          id:                  userId,
          email,
          role,
          districtId:          districtId ?? null,
          schoolId:            schoolId   ?? null,
          displayName:         displayName ?? null,
          realEmail:           email,
          isLocalAccount:      false,
          mustChangePassword:  false,
          createdBy:           actorId,
        });
        return NextResponse.json({ data: profile }, { status: 201 });
      } catch (profileErr) {
        await supabaseAuthProvider.deleteAuthUser(userId).catch(() => { /* intentional */ });
        throw profileErr;
      }
    }

    // ── Remaining combinations all involve password creation ──────────────────

    // Resolve password: generate or validate manual input
    let resolvedPassword: string;
    if (credentialDelivery === 'generated_password_show_admin') {
      resolvedPassword = generateTemporaryPassword();
    } else {
      // manual_password
      const v = validateManualPassword(b.password);
      if ('error' in v) return NextResponse.json(v, { status: 400 });
      resolvedPassword = v.password;
    }

    // ── email_account + (generated | manual) password ─────────────────────────
    if (accountType === 'email_account') {
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      if (!email || !email.includes('@') || !email.includes('.')) {
        return NextResponse.json({ error: 'Gültige E-Mail-Adresse erforderlich.' }, { status: 400 });
      }

      const outcome = await createWithPasswordAndProfile(email, resolvedPassword, {
        email,
        role,
        districtId:         districtId ?? null,
        schoolId:           schoolId   ?? null,
        displayName:        displayName ?? null,
        realEmail:          email,
        isLocalAccount:     false,
        mustChangePassword: true,
        createdBy:          actorId,
      });

      if (!outcome.success) {
        return NextResponse.json({ error: outcome.error }, { status: outcome.status });
      }

      return NextResponse.json(
        {
          data:              outcome.profile,
          temporaryPassword: resolvedPassword,
          loginIdentifier:   email,
        },
        { status: 201 },
      );
    }

    // ── local_account + (generated | manual) password ─────────────────────────
    // accountType === 'local_account' is guaranteed here by VALID_COMBINATIONS check
    const rawUsername = typeof b.username === 'string' ? b.username : '';
    const usernameResult = normalizeUsername(rawUsername);
    if ('error' in usernameResult) {
      return NextResponse.json({ error: usernameResult.error }, { status: 400 });
    }
    const username = usernameResult.username;

    // Best-effort early duplicate check (race condition handled by DB unique constraint)
    const existingByUsername = await getProfileByUsername(username);
    if (existingByUsername) {
      return NextResponse.json(
        { error: `Benutzerkennung „${username}" ist bereits vergeben.` },
        { status: 409 },
      );
    }

    const syntheticEmail = `${username}@local.schulamt.invalid`;

    const outcome = await createWithPasswordAndProfile(syntheticEmail, resolvedPassword, {
      email:              syntheticEmail,
      role,
      districtId:         districtId ?? null,
      schoolId:           schoolId   ?? null,
      displayName:        displayName ?? null,
      username,
      realEmail:          null,
      isLocalAccount:     true,
      mustChangePassword: true,
      createdBy:          actorId,
    });

    if (!outcome.success) {
      // Remap synthetic-email duplicate to a username-collision message
      const msg = outcome.status === 409
        ? `Benutzerkennung „${username}" ist bereits vergeben.`
        : outcome.error;
      return NextResponse.json({ error: msg }, { status: outcome.status });
    }

    return NextResponse.json(
      {
        data:              outcome.profile,
        temporaryPassword: resolvedPassword,
        loginIdentifier:   username,
      },
      { status: 201 },
    );

  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
