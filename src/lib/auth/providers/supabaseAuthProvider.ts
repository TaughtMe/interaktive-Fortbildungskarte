import { createClient } from '@supabase/supabase-js';
import type { AuthProvider, AuthProviderInviteResult } from '@/lib/auth/authProvider';
import { AuthProviderError } from '@/lib/auth/authProvider';

/**
 * Supabase implementation of AuthProvider.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY for admin operations.
 * MUST only be imported in server-side code (API routes, server actions).
 * NEVER import this file from client components or pages with 'use client'.
 *
 * Security:
 *   - Service role key is read from process.env at call time — never cached in
 *     module scope, never logged.
 *   - A fresh admin client is created per call (no shared state).
 *   - Key must always be SUPABASE_SERVICE_ROLE_KEY, never NEXT_PUBLIC_*.
 */
export class SupabaseAuthProvider implements AuthProvider {
  private createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new AuthProviderError(
        '[SupabaseAuthProvider] Missing ENV: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.',
        undefined,
        'UNKNOWN',
      );
    }

    return createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    });
  }

  /**
   * Sends an invitation email and creates the auth.users entry.
   * Returns the new user's UUID immediately — before the user accepts the invite.
   *
   * @throws {AuthProviderError} with code DUPLICATE_EMAIL if e-mail exists.
   * @throws {AuthProviderError} with code UNKNOWN for all other failures.
   */
  async inviteUserByEmail(email: string): Promise<AuthProviderInviteResult> {
    const adminClient = this.createAdminClient();
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email);

    if (error) {
      const isDuplicate =
        error.status === 422 ||
        error.status === 409 ||
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already in use') ||
        error.message?.toLowerCase().includes('unique constraint');

      throw new AuthProviderError(
        isDuplicate
          ? 'E-Mail-Adresse wird bereits verwendet.'
          : 'Einladung konnte nicht gesendet werden.',
        error,
        isDuplicate ? 'DUPLICATE_EMAIL' : 'UNKNOWN',
      );
    }

    if (!data?.user?.id) {
      throw new AuthProviderError(
        'Einladung gesendet, aber Benutzer-ID konnte nicht ermittelt werden.',
        undefined,
        'UNKNOWN',
      );
    }

    return { userId: data.user.id };
  }

  /**
   * Creates an auth user with an explicit password (no invite email).
   * email_confirm is set to true — the account is immediately active.
   *
   * Used for email_account with generated/manual password and for local_account.
   *
   * @throws {AuthProviderError} with code DUPLICATE_EMAIL if the email exists.
   * @throws {AuthProviderError} with code UNKNOWN for all other failures.
   */
  async createUserWithPassword({ email, password }: { email: string; password: string }): Promise<AuthProviderInviteResult> {
    const adminClient = this.createAdminClient();
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      const isDuplicate =
        error.status === 422 ||
        error.status === 409 ||
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already in use') ||
        error.message?.toLowerCase().includes('unique constraint');

      throw new AuthProviderError(
        isDuplicate
          ? 'E-Mail-Adresse wird bereits verwendet.'
          : 'Konto konnte nicht erstellt werden.',
        error,
        isDuplicate ? 'DUPLICATE_EMAIL' : 'UNKNOWN',
      );
    }

    if (!data?.user?.id) {
      throw new AuthProviderError(
        'Konto erstellt, aber Benutzer-ID konnte nicht ermittelt werden.',
        undefined,
        'UNKNOWN',
      );
    }

    return { userId: data.user.id };
  }

  /**
   * Updates the password of an existing auth user by UUID.
   *
   * Uses adminClient.auth.admin.updateUserById — requires SUPABASE_SERVICE_ROLE_KEY.
   * This is correct for server-side password changes where the user's own session
   * is not available as a cookie (we only have the Bearer token, not the refresh token).
   *
   * Never logs the password.
   *
   * @throws {AuthProviderError} on failure.
   */
  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    const adminClient = this.createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new AuthProviderError(
        'Passwort konnte nicht geändert werden.',
        error,
        'UNKNOWN',
      );
    }
  }

  /**
   * Permanently deletes an auth.users entry.
   * Used exclusively in the two-step creation cleanup path.
   *
   * @throws {AuthProviderError} on failure.
   */
  async deleteAuthUser(userId: string): Promise<void> {
    const adminClient = this.createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      throw new AuthProviderError(
        'Auth-Benutzer konnte nicht gelöscht werden.',
        error,
        'UNKNOWN',
      );
    }
  }
}

/**
 * Singleton for server-side use.
 * Import this in API routes — never in client components.
 */
export const supabaseAuthProvider = new SupabaseAuthProvider();
