/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: PASSWORD HASHING SERVICE (ARGON2ID)
 * ============================================================================
 * 
 * Locked Architecture Parameters:
 * - Algorithm: Argon2id
 * - Memory: 64 MB (65,536 KiB)
 * - Iterations: 3
 * - Parallelism: 4
 * - Salt: 16 bytes
 */

import crypto from 'node:crypto';
import argon2 from 'argon2';

export const ARGON2_CONFIG: argon2.HashOptions & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 threads
  raw: false,
};

/**
 * Hashes a plaintext password using the locked Argon2id parameters.
 * Never logs or stores plaintext passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  // Generate explicit 16-byte cryptographically secure salt
  const salt = crypto.randomBytes(16);
  return argon2.hash(password, {
    ...ARGON2_CONFIG,
    salt,
  });
}

/**
 * Securely verifies a plaintext password against an Argon2id hash.
 * Returns false on any mismatch or verification failure without revealing error details.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
