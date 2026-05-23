import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import type { ScryptOptions } from 'crypto';

const HASH_VERSION = 'scrypt';
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1 };

function deriveKey(code: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(code, salt, keyLength, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

function deriveKeyWithOptions(
  code: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(code, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export function normalizeSchoolCode(code: string): string {
  return code.trim().replace(/[\s-]+/g, '').toUpperCase();
}

export async function hashSchoolCode(code: string): Promise<string> {
  const normalizedCode = normalizeSchoolCode(code);
  if (!normalizedCode) {
    throw new Error('School access code must not be empty.');
  }

  const salt = randomBytes(16);
  const derivedKey = await deriveKey(normalizedCode, salt, KEY_LENGTH);

  return [
    HASH_VERSION,
    String(SCRYPT_OPTIONS.N),
    String(SCRYPT_OPTIONS.r),
    String(SCRYPT_OPTIONS.p),
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifySchoolCode(code: string, hash: string): Promise<boolean> {
  const normalizedCode = normalizeSchoolCode(code);
  if (!normalizedCode) return false;

  const [version, nValue, rValue, pValue, saltValue, keyValue] = hash.split('$');
  if (version !== HASH_VERSION || !nValue || !rValue || !pValue || !saltValue || !keyValue) {
    return false;
  }

  try {
    const salt = Buffer.from(saltValue, 'base64url');
    const expectedKey = Buffer.from(keyValue, 'base64url');
    const derivedKey = await deriveKeyWithOptions(normalizedCode, salt, expectedKey.length, {
      N: Number(nValue),
      r: Number(rValue),
      p: Number(pValue),
    });

    if (derivedKey.length !== expectedKey.length) return false;
    return timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}
