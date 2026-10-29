/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: REFRESH SESSIONS & TOKEN ROTATION SERVICE
 * ============================================================================
 * 
 * Rules:
 * - Raw refresh tokens are NEVER stored in the database.
 * - Only SHA-256 hashes of refresh tokens are stored.
 * - Sessions are bound to practitioner AND workspace.
 * - Rotation invalidates previous session state, preventing token reuse.
 * - Revoked or expired sessions are strictly rejected.
 */

import crypto from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import type { PractitionerSession } from '../types/auth';

export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface GeneratedRefreshToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Generates a cryptographically strong raw refresh token and its SHA-256 hash.
 */
export function generateRefreshToken(expiryDays = REFRESH_TOKEN_EXPIRY_DAYS): GeneratedRefreshToken {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}

/**
 * Computes the SHA-256 hash of a raw refresh token.
 */
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

/**
 * Database client or transaction context supporting parameterized queries.
 */
export type DbOrTx = {
  query: <T = any>(query: string, params?: any[]) => Promise<{ rows: T[] }>;
};

/**
 * Creates a new refresh session in the database.
 */
export async function createSession(
  db: DbOrTx,
  practitionerId: string,
  workspaceId: string,
  options?: {
    userAgent?: string | null;
    ipAddress?: string | null;
    expiryDays?: number;
  }
): Promise<{ session: PractitionerSession; rawRefreshToken: string }> {
  const { rawToken, tokenHash, expiresAt } = generateRefreshToken(options?.expiryDays);

  const res = await db.query<PractitionerSession>(
    `
    INSERT INTO practitioner_sessions (
      practitioner_id,
      workspace_id,
      token_hash,
      expires_at,
      user_agent,
      ip_address
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      practitionerId,
      workspaceId,
      tokenHash,
      expiresAt.toISOString(),
      options?.userAgent ?? null,
      options?.ipAddress ?? null,
    ]
  );

  return {
    session: res.rows[0],
    rawRefreshToken: rawToken,
  };
}

/**
 * Validates a raw refresh token and retrieves the corresponding session (for read-only status checks).
 */
export async function validateRefreshToken(
  db: DbOrTx,
  rawRefreshToken: string
): Promise<{ session: PractitionerSession; isValid: boolean; reason?: string }> {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    return { session: null as any, isValid: false, reason: 'Invalid refresh token format' };
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  const res = await db.query<PractitionerSession>(
    `SELECT * FROM practitioner_sessions WHERE token_hash = $1`,
    [tokenHash]
  );

  if (res.rows.length === 0) {
    return { session: null as any, isValid: false, reason: 'Session not found' };
  }

  const session = res.rows[0];

  if (session.revoked_at !== null && session.revoked_at !== undefined) {
    return { session, isValid: false, reason: 'Session has been revoked' };
  }

  const now = new Date();
  const expiry = new Date(session.expires_at);
  if (now > expiry) {
    return { session, isValid: false, reason: 'Session has expired' };
  }

  return { session, isValid: true };
}

/**
 * Rotates a refresh session atomically:
 * 
 * Required Transactional Model:
 * 1. BEGIN transaction
 * 2. Conditionally consume existing session with atomic database CAS update
 * 3. Verify exactly one row was consumed (if 0 rows -> throw and rollback)
 * 4. Create replacement session inside the same transaction
 * 5. COMMIT transaction
 * 
 * If any step fails: ROLLBACK (old session remains valid and unrevoked).
 */
export async function rotateSession(
  db: PGlite,
  rawRefreshToken: string,
  options?: {
    userAgent?: string | null;
    ipAddress?: string | null;
  }
): Promise<{
  newSession: PractitionerSession;
  newRawRefreshToken: string;
  previousSessionId: string;
}> {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    throw new Error('Invalid refresh token format');
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  return await db.transaction(async (tx) => {
    // 1. Atomically consume existing refresh session via conditional CAS update
    const consumeRes = await tx.query<PractitionerSession>(
      `
      UPDATE practitioner_sessions
      SET
        revoked_at = clock_timestamp(),
        last_used_at = clock_timestamp()
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > clock_timestamp()
      RETURNING *
      `,
      [tokenHash]
    );

    if (consumeRes.rows.length === 0) {
      throw new Error('Refresh token is invalid, expired, or has already been used');
    }

    const oldSession = consumeRes.rows[0];

    // 2. Create replacement session inside the exact same database transaction
    const { session: newSession, rawRefreshToken: newRawRefreshToken } = await createSession(
      tx,
      oldSession.practitioner_id,
      oldSession.workspace_id,
      {
        userAgent: options?.userAgent ?? oldSession.user_agent,
        ipAddress: options?.ipAddress ?? oldSession.ip_address,
      }
    );

    return {
      newSession,
      newRawRefreshToken,
      previousSessionId: oldSession.id,
    };
  });
}

/**
 * Revokes an active session by session ID or raw refresh token.
 */
export async function revokeSession(
  db: PGlite,
  identifier: { sessionId?: string; rawRefreshToken?: string }
): Promise<boolean> {
  if (identifier.sessionId) {
    const res = await db.query(
      `
      UPDATE practitioner_sessions
      SET revoked_at = clock_timestamp(),
          last_used_at = clock_timestamp()
      WHERE id = $1 AND revoked_at IS NULL
      `,
      [identifier.sessionId]
    );
    return (res.rows.length ?? 0) > 0;
  }

  if (identifier.rawRefreshToken) {
    const tokenHash = hashRefreshToken(identifier.rawRefreshToken);
    const res = await db.query(
      `
      UPDATE practitioner_sessions
      SET revoked_at = clock_timestamp(),
          last_used_at = clock_timestamp()
      WHERE token_hash = $1 AND revoked_at IS NULL
      `,
      [tokenHash]
    );
    return (res.rows.length ?? 0) > 0;
  }

  return false;
}

/**
 * Revokes all sessions for a practitioner across all workspaces (e.g. on credential reset).
 */
export async function revokeAllPractitionerSessions(
  db: PGlite,
  practitionerId: string
): Promise<number> {
  const res = await db.query(
    `
    UPDATE practitioner_sessions
    SET revoked_at = clock_timestamp(),
        last_used_at = clock_timestamp()
    WHERE practitioner_id = $1 AND revoked_at IS NULL
    `,
    [practitionerId]
  );
  return res.rows.length ?? 0;
}
