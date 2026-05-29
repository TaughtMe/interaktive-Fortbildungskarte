/**
 * AuthProvider — abstraction layer for auth-level user management operations.
 *
 * API routes MUST use this interface instead of calling Supabase admin SDK directly.
 * Keeping this layer swappable means the auth backend can change without touching
 * route handlers.
 *
 * Current implementations:
 *   - src/lib/auth/providers/supabaseAuthProvider.ts
 *
 * Security rules:
 *   - Implementations are server-only (never imported client-side).
 *   - SUPABASE_SERVICE_ROLE_KEY is never exposed through this interface.
 *   - Error messages MUST NOT include tokens, IDs, or sensitive provider details
 *     when surfaced to API responses — catch AuthProviderError and return a generic
 *     message to the caller.
 */

export interface AuthProviderInviteResult {
  /** Supabase Auth user ID (UUID). */
  userId: string;
}

/** Machine-readable error code for routing decisions in API handlers. */
export type AuthProviderErrorCode =
  | 'DUPLICATE_EMAIL'  // e-mail already exists in auth.users
  | 'NOT_FOUND'        // user not found (e.g. deleteAuthUser for unknown ID)
  | 'UNKNOWN';         // any other provider error

export class AuthProviderError extends Error {
  constructor(
    message: string,
    /** Underlying cause — internal only, never forwarded to API responses. */
    public readonly cause?: unknown,
    public readonly code: AuthProviderErrorCode = 'UNKNOWN',
  ) {
    super(message);
    this.name = 'AuthProviderError';
  }
}

export interface AuthProvider {
  /**
   * Creates a new auth user via email invite.
   * Sends an invite email and returns the new user's ID.
   *
   * Does NOT create a profiles row. The caller must call insertProfile()
   * immediately after and use deleteAuthUser() for cleanup on failure.
   *
   * @throws {AuthProviderError} with code DUPLICATE_EMAIL if email exists.
   * @throws {AuthProviderError} on other failures.
   */
  inviteUserByEmail(email: string): Promise<AuthProviderInviteResult>;

  /**
   * Creates an auth user with an explicit password (no invite email).
   * Sets email_confirm = true — the account is immediately active.
   *
   * Used for:
   *   - email_account with generated or manual password (no invite email flow)
   *   - local_account (synthetic email: username@local.schulamt.invalid)
   *
   * Does NOT create a profiles row. The caller must call insertProfile()
   * immediately after and use deleteAuthUser() for cleanup on failure.
   *
   * @throws {AuthProviderError} with code DUPLICATE_EMAIL if email exists.
   * @throws {AuthProviderError} on other failures.
   */
  createUserWithPassword(params: { email: string; password: string }): Promise<AuthProviderInviteResult>;

  /**
   * Updates the password for an existing auth user.
   *
   * SECURITY: Only call after the caller has verified the request originates
   * from the user themselves (e.g. via resolveProfileFromRequest + JWT verification).
   * The Service Role is the technical mechanism — authorization is enforced by
   * the caller, not this method.
   *
   * Never logs the password value.
   *
   * @throws {AuthProviderError} on failure.
   */
  updateUserPassword(userId: string, newPassword: string): Promise<void>;

  /**
   * Permanently deletes an auth user by ID.
   * Only call in the two-step creation cleanup path when profile insert fails.
   *
   * WARNING: Irreversible. Never expose this as a standalone API endpoint.
   *
   * @throws {AuthProviderError} on failure.
   */
  deleteAuthUser(userId: string): Promise<void>;
}
