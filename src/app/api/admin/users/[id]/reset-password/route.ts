import { NextResponse } from 'next/server';
import { resolveProfileFromRequest, passwordChangeBlockResponse } from '@/lib/auth/serverAuth';
import { generateTemporaryPassword } from '@/lib/auth/generatePassword';
import { supabaseAuthProvider } from '@/lib/auth/providers/supabaseAuthProvider';
import { getProfileById, setMustChangePassword } from '@/lib/db/adminUserRepository';
import { normalizeRole } from '@/types/auth';

const MIN_PASSWORD_LENGTH = 12;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/users/:id/reset-password
 *
 * Superadmin only. Resets the password of the target user.
 *
 * Body:
 *   { "mode": "generate" }                        — generate a secure random password
 *   { "mode": "manual", "password": "..." }       — set an explicit password (≥ 12 chars)
 *
 * Flow:
 *   1. Verify actor is superadmin.
 *   2. Resolve/validate new password.
 *   3. Load target profile.
 *   4. Update password via Supabase Service Role (admin.updateUserById).
 *   5. Set profiles.must_change_password = true.
 *   6. Return { data: ProfileRow, temporaryPassword, loginIdentifier }.
 *
 * Security:
 *   - Password is NEVER logged anywhere.
 *   - temporaryPassword is returned once in the response body only.
 *   - must_change_password = true forces a self-service change on next login.
 *
 * Response 200: { data: ProfileRow, temporaryPassword: string, loginIdentifier: string }
 * Response 400: validation error
 * Response 401: no valid session
 * Response 403: insufficient role
 * Response 404: target user not found
 * Response 500: Supabase or DB failure
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: targetId } = await params;

    // ── 1. Auth — real session required ──────────────────────────────────────
    const actor = await resolveProfileFromRequest(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const pwBlock = passwordChangeBlockResponse(actor);
    if (pwBlock) return pwBlock;
    if (normalizeRole(actor.role) !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 2. Parse and validate body ────────────────────────────────────────────
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
    const mode = typeof b.mode === 'string' ? b.mode : null;

    if (mode !== 'generate' && mode !== 'manual') {
      return NextResponse.json(
        { error: '"mode" muss "generate" oder "manual" sein.' },
        { status: 400 },
      );
    }

    // ── 3. Resolve password ───────────────────────────────────────────────────
    let newPassword: string;

    if (mode === 'generate') {
      newPassword = generateTemporaryPassword();
    } else {
      // manual
      const raw = b.password;
      if (typeof raw !== 'string' || !raw) {
        return NextResponse.json({ error: 'Passwort ist erforderlich.' }, { status: 400 });
      }
      if (raw.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `Das neue Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.` },
          { status: 400 },
        );
      }
      newPassword = raw;
    }

    // ── 4. Load target profile ────────────────────────────────────────────────
    const target = await getProfileById(targetId);
    if (!target) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    // ── 5. Update password via Service Role ───────────────────────────────────
    // Authorization: verified by JWT in step 1.
    // Password value is not logged anywhere in this call.
    await supabaseAuthProvider.updateUserPassword(targetId, newPassword);

    // ── 6. Set must_change_password = true ────────────────────────────────────
    // If this throws, the password was already changed. Caller should retry.
    const updatedProfile = await setMustChangePassword(targetId, true);

    // ── 7. Build login identifier ─────────────────────────────────────────────
    // For local accounts: use the username; for email accounts: real_email or email.
    const loginIdentifier = target.is_local_account
      ? (target.username ?? target.email)
      : (target.real_email ?? target.email);

    // ── 8. Return — password is surfaced exactly once ─────────────────────────
    return NextResponse.json({
      data:              updatedProfile,
      temporaryPassword: newPassword,
      loginIdentifier,
    });

  } catch {
    return NextResponse.json(
      { error: 'Passwort konnte nicht zurückgesetzt werden. Bitte erneut versuchen.' },
      { status: 500 },
    );
  }
}
