import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabaseServer';
import { getProfileByUsername, updateLastLoginAt } from '@/lib/db/profileRepository';

/**
 * POST /api/auth/signin
 *
 * Body: { identifier: string; password: string }
 *
 * `identifier` may be an email address or a username (Benutzerkennung):
 *   - Contains "@"  → treated as email, passed directly to signInWithPassword.
 *   - No "@"        → looked up as username in profiles (normalized: trim + lowercase).
 *                     profiles.email (real or synthetic) is then used for signInWithPassword.
 *
 * Authentication uses the Supabase Anon Key client — no Service Role involved.
 *
 * On success, returns the Supabase session so the client can call setSession().
 * On any auth failure, returns a generic 401 — never distinguishes "unknown user"
 * from "wrong password" to avoid leaking account existence.
 *
 * Response 200: { session: { access_token, refresh_token, expires_at, expires_in, token_type }, user: { id, email } }
 * Response 400: { error: string }  — malformed request body
 * Response 401: { error: string }  — invalid credentials (any reason)
 * Response 500: { error: string }  — unexpected server error
 */
export async function POST(request: Request) {
  // ── 1. Parse and validate body ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).identifier !== 'string' ||
    typeof (body as Record<string, unknown>).password !== 'string'
  ) {
    return NextResponse.json(
      { error: 'identifier und password sind erforderlich.' },
      { status: 400 },
    );
  }

  const rawIdentifier = ((body as Record<string, string>).identifier).trim();
  const password      = (body as Record<string, string>).password;

  if (!rawIdentifier || !password) {
    return NextResponse.json(
      { error: 'identifier und password sind erforderlich.' },
      { status: 400 },
    );
  }

  // ── 2. Resolve auth email from identifier ──────────────────────────────────
  let authEmail: string;

  if (rawIdentifier.includes('@')) {
    // Treat as email address.
    authEmail = rawIdentifier.toLowerCase();
  } else {
    // Treat as username — resolve via profiles table.
    const normalized = rawIdentifier.toLowerCase();

    let profile;
    try {
      profile = await getProfileByUsername(normalized);
    } catch {
      // DB error during lookup — surface as 500.
      return NextResponse.json(
        { error: 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.' },
        { status: 500 },
      );
    }

    if (!profile) {
      // Unknown username — return generic 401 (do not leak existence).
      return NextResponse.json({ error: 'Anmeldedaten ungültig.' }, { status: 401 });
    }

    if (!profile.active) {
      // Inactive account — same generic 401.
      return NextResponse.json({ error: 'Anmeldedaten ungültig.' }, { status: 401 });
    }

    authEmail = profile.email;
  }

  // ── 3. Authenticate via Supabase (Anon Key — no Service Role) ──────────────
  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return NextResponse.json(
      { error: 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.' },
      { status: 500 },
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: 'Anmeldedaten ungültig.' }, { status: 401 });
  }

  // ── 4. Best-effort: update last_login_at ───────────────────────────────────
  // Never await — fire and forget. Auth response is never blocked by this.
  void updateLastLoginAt(data.user.id).catch(() => { /* swallowed */ });

  // ── 5. Return session to client ────────────────────────────────────────────
  return NextResponse.json({
    session: {
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at:    data.session.expires_at,
      expires_in:    data.session.expires_in,
      token_type:    data.session.token_type,
    },
    user: {
      id:    data.user.id,
      email: data.user.email,
    },
  });
}
