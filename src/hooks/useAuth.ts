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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

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

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  async function signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  }

  return {
    session,
    accessToken: session?.access_token ?? null,
    email: session?.user?.email ?? null,
    loading,
    signIn,
    signOut,
  };
}
