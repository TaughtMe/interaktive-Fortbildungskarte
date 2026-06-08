import { NextResponse } from 'next/server';
import { resolveProfileFromRequest } from '@/lib/auth/serverAuth';
import { supabaseAuthProvider } from '@/lib/auth/providers/supabaseAuthProvider';
import {
  getProfileById,
  getProfileByRealEmail,
  insertUserDeletionLog,
  updateProfileAdmin,
  type UpdateProfileAdminInput,
} from '@/lib/db/adminUserRepository';
import { getProfileByUsername } from '@/lib/db/profileRepository';
import type { ProductionRole } from '@/lib/db/schema.types';
import { normalizeRole } from '@/types/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_ROLES = new Set<ProductionRole>([
  'superadmin', 'district_admin', 'coordinator', 'school_user', 'viewer',
]);

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

function isUniqueViolation(err: unknown, constraintName?: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  if (e['code'] !== '23505') return false;
  if (constraintName && e['constraint_name'] !== constraintName) return false;
  return true;
}

// ── PATCH /api/admin/users/[id] ───────────────────────────────────────────────

/**
 * PATCH /api/admin/users/:id
 *
 * Superadmin only. Accepts any subset of the following editable fields:
 *   - active:       boolean
 *   - displayName:  string | null
 *   - role:         ProductionRole
 *   - districtId:   string | null
 *   - schoolId:     string | null
 *   - realEmail:    string | null
 *   - username:     string | null
 *
 * NOTE: profiles.email is NEVER editable (mirrors auth.users.email).
 *
 * Guards:
 *   - Actor must be superadmin (resolved from Bearer JWT).
 *   - Actor cannot change their own role or active status.
 *   - Role/scope consistency enforced (district_admin/coordinator need districtId,
 *     school_user needs schoolId — evaluated against effective values).
 *   - username and realEmail uniqueness enforced (pre-check + DB constraint).
 *
 * Response 200: { data: ProfileRow }
 * Response 400: validation error
 * Response 401: no valid session
 * Response 403: insufficient role or self-protection violation
 * Response 404: target user not found
 * Response 409: username or realEmail already in use
 * Response 500: DB or Supabase failure
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: targetId } = await params;

    // ── 1. Auth — real session required ──────────────────────────────────────
    const actor = await resolveProfileFromRequest(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (normalizeRole(actor.role) !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const b = rawBody as Record<string, unknown>;

    // ── 3. Collect and validate editable fields ───────────────────────────────
    const updateInput: UpdateProfileAdminInput = {};
    let hasAnyField = false;

    // active
    if ('active' in b) {
      if (typeof b.active !== 'boolean') {
        return NextResponse.json({ error: '"active" muss true oder false sein.' }, { status: 400 });
      }
      updateInput.active = b.active;
      hasAnyField = true;
    }

    // displayName
    if ('displayName' in b) {
      updateInput.displayName =
        typeof b.displayName === 'string' && b.displayName.trim()
          ? b.displayName.trim()
          : null;
      hasAnyField = true;
    }

    // role
    if ('role' in b) {
      if (typeof b.role !== 'string' || !VALID_ROLES.has(b.role as ProductionRole)) {
        return NextResponse.json({ error: 'Ungültige Rolle.' }, { status: 400 });
      }
      updateInput.role = b.role as ProductionRole;
      hasAnyField = true;
    }

    // districtId
    if ('districtId' in b) {
      updateInput.districtId =
        typeof b.districtId === 'string' && b.districtId.trim()
          ? b.districtId.trim()
          : null;
      hasAnyField = true;
    }

    // schoolId
    if ('schoolId' in b) {
      updateInput.schoolId =
        typeof b.schoolId === 'string' && b.schoolId.trim()
          ? b.schoolId.trim()
          : null;
      hasAnyField = true;
    }

    // realEmail
    if ('realEmail' in b) {
      const raw = typeof b.realEmail === 'string' ? b.realEmail.trim().toLowerCase() : '';
      if (raw) {
        if (!raw.includes('@') || !raw.includes('.')) {
          return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
        }
        updateInput.realEmail = raw;
      } else {
        updateInput.realEmail = null;
      }
      hasAnyField = true;
    }

    // username
    if ('username' in b) {
      const raw = typeof b.username === 'string' ? b.username.trim() : '';
      if (raw) {
        const v = normalizeUsername(raw);
        if ('error' in v) {
          return NextResponse.json({ error: v.error }, { status: 400 });
        }
        updateInput.username = v.username;
      } else {
        updateInput.username = null;
      }
      hasAnyField = true;
    }

    if (!hasAnyField) {
      return NextResponse.json({ error: 'Keine bearbeitbaren Felder angegeben.' }, { status: 400 });
    }

    // ── 4. Load target profile ────────────────────────────────────────────────
    const target = await getProfileById(targetId);
    if (!target) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    // ── 5. Self-protection ────────────────────────────────────────────────────
    if (target.id === actor.id) {
      if ('active' in updateInput) {
        return NextResponse.json(
          { error: 'Sie können Ihr eigenes Konto nicht deaktivieren.' },
          { status: 403 },
        );
      }
      if ('role' in updateInput) {
        return NextResponse.json(
          { error: 'Sie können Ihre eigene Rolle nicht ändern.' },
          { status: 403 },
        );
      }
    }

    // ── 6. Role / scope consistency ───────────────────────────────────────────
    // Compute effective values: use updated value if provided, else target's current value.
    const effectiveRole       = updateInput.role      ?? target.role;
    const effectiveDistrictId = 'districtId' in updateInput ? (updateInput.districtId ?? null) : target.district_id;
    const effectiveSchoolId   = 'schoolId'   in updateInput ? (updateInput.schoolId   ?? null) : target.school_id;

    const scopeError = validateRoleAndScope(effectiveRole, effectiveDistrictId, effectiveSchoolId);
    if (scopeError) {
      return NextResponse.json({ error: scopeError.error }, { status: 400 });
    }

    // ── 7. Uniqueness pre-checks ──────────────────────────────────────────────

    // username uniqueness (skip if clearing to null)
    if (updateInput.username) {
      const existingByUsername = await getProfileByUsername(updateInput.username);
      if (existingByUsername && existingByUsername.id !== targetId) {
        return NextResponse.json(
          { error: `Benutzerkennung „${updateInput.username}" ist bereits vergeben.` },
          { status: 409 },
        );
      }
    }

    // realEmail uniqueness (skip if clearing to null)
    if (updateInput.realEmail) {
      const existingByRealEmail = await getProfileByRealEmail(updateInput.realEmail, targetId);
      if (existingByRealEmail) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.' },
          { status: 409 },
        );
      }
    }

    // ── 8. Apply update ───────────────────────────────────────────────────────
    let updated;
    try {
      updated = await updateProfileAdmin(targetId, updateInput);
    } catch (err) {
      if (isUniqueViolation(err, 'profiles_username_unique')) {
        return NextResponse.json(
          { error: 'Benutzerkennung ist bereits vergeben.' },
          { status: 409 },
        );
      }
      if (isUniqueViolation(err, 'profiles_real_email_unique')) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.' },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({ data: updated });

  } catch {
    return NextResponse.json(
      { error: 'Aktion konnte nicht ausgeführt werden. Bitte erneut versuchen.' },
      { status: 500 },
    );
  }
}

// ── DELETE /api/admin/users/[id] ──────────────────────────────────────────────

/**
 * DELETE /api/admin/users/:id
 *
 * Superadmin only. Permanently deletes a user account.
 *
 * Flow:
 *   1. Verify actor is superadmin.
 *   2. Load target profile.
 *   3. Self-protection: actor cannot delete their own account.
 *   4. Write deletion log (fail-first — abort if log insert fails).
 *   5. Delete Supabase Auth user via Service Role → FK CASCADE removes profile.
 *   6. training_needs.created_by is preserved via ON DELETE SET NULL.
 *
 * IMPORTANT: Step 4 must succeed before step 5. A failed log write
 * stops the deletion — never delete without a log entry.
 *
 * Response 200: { success: true }
 * Response 401: no valid session
 * Response 403: insufficient role
 * Response 404: target user not found
 * Response 500: DB or Supabase failure
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id: targetId } = await params;

    // ── 1. Auth — real session required ──────────────────────────────────────
    const actor = await resolveProfileFromRequest(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (normalizeRole(actor.role) !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 2. Load target profile ────────────────────────────────────────────────
    const target = await getProfileById(targetId);
    if (!target) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    // ── 3. Self-protection ────────────────────────────────────────────────────
    if (target.id === actor.id) {
      return NextResponse.json(
        { error: 'Sie können Ihr eigenes Konto nicht löschen.' },
        { status: 400 },
      );
    }

    // ── 4. Write deletion log FIRST ───────────────────────────────────────────
    // If this throws, the deletion is aborted — never delete without a log entry.
    await insertUserDeletionLog({
      deletedUserId:  target.id,
      username:       target.username,
      email:          target.email,
      realEmail:      target.real_email,
      displayName:    target.display_name,
      role:           target.role,
      deletedById:    actor.id,
      deletedByEmail: actor.email,
      reason:         null,
    });

    // ── 5. Delete auth user (FK CASCADE removes the profile row) ──────────────
    await supabaseAuthProvider.deleteAuthUser(targetId);

    return NextResponse.json({ success: true });

  } catch {
    return NextResponse.json(
      { error: 'Konto konnte nicht gelöscht werden. Bitte erneut versuchen.' },
      { status: 500 },
    );
  }
}
