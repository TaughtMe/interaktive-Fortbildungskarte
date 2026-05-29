import { NextResponse } from 'next/server';
import { resolveProfileFromRequest } from '@/lib/auth/serverAuth';
import { supabaseAuthProvider } from '@/lib/auth/providers/supabaseAuthProvider';
import { clearMustChangePassword } from '@/lib/db/profileRepository';

const MIN_PASSWORD_LENGTH = 12;

/**
 * POST /api/me/change-password
 *
 * Self-service password change for the authenticated user.
 * Required when must_change_password === true (enforced by the frontend).
 * Also works for voluntary password changes (no restriction to must_change_password=true).
 *
 * Body: { newPassword: string, confirmPassword: string }
 *
 * Flow:
 *   1. Validate body (presence, length >= 12, match).
 *   2. Resolve user via Bearer token (no demo mode).
 *   3. Change password via Supabase Admin (Service Role) — justified because the
 *      server only has the access token, not the refresh token needed for a
 *      session-scoped updateUser call. The JWT verification in step 2 is the
 *      authorization layer; Service Role is the technical execution mechanism.
 *   4. Clear profiles.must_change_password = false.
 *
 * Passwords are NEVER logged or included in error messages.
 *
 * Response 200: { success: true }
 * Response 400: { error: string }  — validation failure
 * Response 401: { error: string }  — no valid session
 * Response 500: { error: string }  — Supabase or DB failure
 */
export async function POST(request: Request) {
  try {
    // ── 1. Parse and validate body ──────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const newPassword     = typeof b.newPassword     === 'string' ? b.newPassword     : '';
    const confirmPassword = typeof b.confirmPassword === 'string' ? b.confirmPassword : '';

    if (!newPassword) {
      return NextResponse.json({ error: 'Neues Passwort ist erforderlich.' }, { status: 400 });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Das neue Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.` },
        { status: 400 },
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwörter stimmen nicht überein.' },
        { status: 400 },
      );
    }

    // ── 2. Resolve authenticated user ───────────────────────────────────────
    // resolveProfileFromRequest verifies the Bearer JWT via Supabase and loads
    // the profile. No demo-mode fallback — a real session is required.
    const profile = await resolveProfileFromRequest(request);
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 3. Change password via Service Role ─────────────────────────────────
    // Authorization: verified by JWT in step 2.
    // Password value is not logged anywhere in this call.
    await supabaseAuthProvider.updateUserPassword(profile.id, newPassword);

    // ── 4. Clear must_change_password flag ──────────────────────────────────
    // If this throws, the password was already changed. Caller should retry.
    await clearMustChangePassword(profile.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Passwort konnte nicht geändert werden. Bitte erneut versuchen.' },
      { status: 500 },
    );
  }
}
