import { randomBytes } from 'crypto';

/**
 * Generates a 20-character cryptographically random password.
 *
 * Uses an unambiguous 58-character alphabet that avoids visually similar
 * characters (0/O, 1/I/l confusion).
 *
 * SECURITY: Never log the return value.
 * Only surface once in an API response, never in persistent storage.
 */
export function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#%';
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
