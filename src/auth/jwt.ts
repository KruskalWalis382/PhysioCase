/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: ACCESS TOKEN SERVICE (JWT)
 * ============================================================================
 * 
 * Token Lifetime: 15 minutes
 * Claims: sub, sid, ws, role, iat, exp
 * Invariant: Strictly ZERO PHI in JWT claims.
 */

import { SignJWT, jwtVerify } from 'jose';
import type { JwtAccessClaims, WorkspaceRole } from '../types/auth';

const DEFAULT_SECRET = 'physiocase-b2-secure-internal-access-token-secret-key-32b!';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || DEFAULT_SECRET);

export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes (900 seconds)

export interface CreateAccessTokenParams {
  sub: string;       // Practitioner ID
  sid: string;       // Session ID
  ws: string;        // Current Workspace ID
  role: WorkspaceRole; // Current Workspace Role
}

/**
 * Signs a short-lived, workspace-bound JWT access token.
 * Contains only authorized identification and routing claims. ZERO PHI.
 */
export async function signAccessToken(params: CreateAccessTokenParams): Promise<string> {
  return new SignJWT({
    sub: params.sub,
    sid: params.sid,
    ws: params.ws,
    role: params.role,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY_SECONDS}s`)
    .sign(JWT_SECRET);
}

/**
 * Verifies and decodes an access token.
 * Validates algorithm, signature, expiration, and claim structure.
 */
export async function verifyAccessToken(token: string): Promise<JwtAccessClaims | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.ws !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      sid: payload.sid,
      ws: payload.ws,
      role: payload.role as WorkspaceRole,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
