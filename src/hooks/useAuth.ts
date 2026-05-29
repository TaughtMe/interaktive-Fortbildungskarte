import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/auth/supabaseClient';

export interface AuthState {
  session: Session | null;
  /** Supabase JWT access token, or null when not logged in. */
  accessToken: string | null;
  /** Email of the logged-in user, or null. */
  email: string | null;
  /** True while the initial session is being loaded from localStorage. */
  loading: boolean;
  /**
   * Signs in with an email address or a username (Benutzerkennung).
   *
   * Routing:
   *   - Calls POST /api/auth/signin with { identifier, password }.
   *   - The server resolves usernames → email and calls Supabase signInWithPassword.
   *   - On success, the returned session is stored in the browser via setSession().
   */
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

type SigninResponseData = {
  session?: {
    access_token:  string;
    refresh_token: string;
    expires_at?:   number;
    expires_in?:   number;
    token_type?:   string;
  };
  user?: { id: string; email?: string };
  error?: string;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Remove stale Supabase auth error fragments from the URL (e.g.
    // #error=access_denied&error_code=otp_expired from an expired invite link).
    // This is purely cosmetic — the session is not affected here because
    // detectSessionInUrl: false prevents the SDK from acting on these hashes.
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (
        hash.includes('error=') ||
        hash.includes('error_code=') ||
        hash.includes('access_token=')
      ) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        );
      }
    }

    // Restore session from localStorage on mount.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Keep session state in sync on login / logout / token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(identifier: string, password: string): Promise<{ error: string | null }> {
    try {
      const res = await fetch('/api/auth/signin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier, password }),
      });

      const data = await res.json() as SigninResponseData;

      if (!res.ok || data.error) {
        return { error: data.error ?? 'Anmeldung fehlgeschlagen.' };
      }

      if (!data.session) {
        return { error: 'Anmeldung fehlgeschlagen.' };
      }

      // Store the session in the browser Supabase client (localStorage).
      const supabase = getSupabaseClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token:  data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        return { error: sessionError.message };
      }

      return { error: null };
    } catch {
      return { error: 'Verbindungsfehler. Bitte erneut versuchen.' };
    }
  }

  async function signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  }

  return {
    session,
    accessToken: session?.access_token ?? null,
    email:       session?.user?.email  ?? null,
    loading,
    signIn,
    signOut,
  };
}
