import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase client for server-side use.
 *
 * Uses the public Anon Key — sufficient for `supabase.auth.getUser(token)`.
 * No Service Role Key; no elevated permissions.
 *
 * Stateless: autoRefreshToken and persistSession are disabled.
 * Call once per request — do not share instances across requests.
 *
 * Requires ENV:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[supabaseServer] Missing ENV: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.',
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Server-side clients are stateless — no token caching, no session persistence.
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
