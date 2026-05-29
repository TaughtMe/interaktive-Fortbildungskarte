import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Browser-side Supabase client singleton.
 *
 * Manages user sessions in localStorage (Supabase default).
 * Do not use on the server — use createSupabaseServerClient() instead.
 *
 * Requires ENV:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[supabaseClient] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.',
    );
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Do NOT process URL hash fragments automatically.
        // This app uses explicit setSession() after /api/auth/signin —
        // no magic-link or OAuth callback flows run in the browser.
        // Without this flag, a stale #error=access_denied&error_code=otp_expired
        // hash in the URL would cause Supabase to fire SIGNED_OUT on every reload,
        // clearing the valid localStorage session.
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}
