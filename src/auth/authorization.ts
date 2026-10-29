/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: CENTRALIZED AUTHORIZATION SERVICE & PREDICATES
 * ============================================================================
 * 
 * Authoritative Principles:
 * 1. Authenticated Practitioner -> Active Workspace Membership -> Role -> Clinical Authorization Capability -> Record Governance State -> Domain Operation
 * 2. Workspace ownership does NOT imply clinical authority.
 * 3. read_only_auditor is ALWAYS read-only (clinical_authorized = false).
 * 4. Current DB membership state is authoritative (dynamically verified, never trusting stale JWT claims).
 * 5. Session revocation immediately invalidates access regardless of unexpired JWT.
 */

import type { PGlite } from '@electric-sql/pglite';
import type {
  AuthContext,
  PractitionerIdentity,
  WorkspaceSummary,
  WorkspaceMembership,
  PractitionerSession,
} from '../types/auth';
import { verifyAccessToken } from './jwt';

// ============================================================================
// CENTRALIZED AUTHORIZATION PREDICATES
// ============================================================================

/**
 * Verifies that the context represents an authenticated, active practitioner in an active workspace.
 */
export function isAuthenticated(context: AuthContext): boolean {
  return (
    !!context &&
    !!context.practitioner &&
    context.practitioner.is_active &&
    !!context.workspace &&
    context.workspace.is_active &&
    !!context.membership
  );
}

/**
 * Verifies that the practitioner has an ACTIVE workspace membership.
 * Suspended or inactive memberships return false.
 */
export function hasActiveMembership(context: AuthContext): boolean {
  return (
    isAuthenticated(context) &&
    context.membership.status === 'active'
  );
}

/**
 * Verifies that the practitioner is an active workspace owner.
 */
export function isWorkspaceOwner(context: AuthContext): boolean {
  return (
    hasActiveMembership(context) &&
    context.membership.role === 'workspace_owner'
  );
}

/**
 * Verifies clinical authorization capability.
 * Invariants:
 * - Active workspace membership required.
 * - Role must be workspace_owner or clinical_practitioner.
 * - clinical_authorized must be TRUE.
 * - read_only_auditor is strictly excluded and NEVER clinically authorized.
 */
export function isClinicallyAuthorized(context: AuthContext): boolean {
  if (!context || !context.membership) {
    return false;
  }

  // Database-enforced rule: auditor is never clinically authorized
  if (context.membership.role === 'read_only_auditor') {
    return false;
  }

  return (
    hasActiveMembership(context) &&
    (context.membership.role === 'workspace_owner' ||
      context.membership.role === 'clinical_practitioner') &&
    context.membership.clinical_authorized === true
  );
}

/**
 * Predicate for clinical mutation capability.
 * Equates to clinical authorization under active membership.
 */
export function canPerformClinicalMutation(context: AuthContext): boolean {
  return isClinicallyAuthorized(context);
}

/**
 * Predicate for owner administration capability (membership & settings management).
 */
export function canPerformOwnerAdministration(context: AuthContext): boolean {
  return isWorkspaceOwner(context);
}

// ============================================================================
// DYNAMIC DATABASE-AUTHORITATIVE CONTEXT RESOLUTION
// ============================================================================

export type ResolveAuthResult =
  | { success: true; context: AuthContext }
  | { success: false; status: number; error: string };

/**
 * Resolves the authenticated context against live database state.
 * Strictly verifies:
 * 1. JWT signature and validity.
 * 2. Session exists, is not expired, and has NOT been revoked.
 * 3. Practitioner account is active.
 * 4. Workspace is active.
 * 5. Current database membership state (role, status, clinical_authorized).
 * Stale JWT claims are completely overridden by live DB state.
 */
export async function resolveAuthContext(
  db: PGlite,
  token: string
): Promise<ResolveAuthResult> {
  const claims = await verifyAccessToken(token);
  if (!claims) {
    return {
      success: false,
      status: 401,
      error: 'Invalid, malformed, or expired access token',
    };
  }

  // 1. Verify session in database (enforce dynamic revocation)
  const sessionRes = await db.query<PractitionerSession>(
    `SELECT * FROM practitioner_sessions WHERE id = $1`,
    [claims.sid]
  );

  if (sessionRes.rows.length === 0) {
    return {
      success: false,
      status: 401,
      error: 'Session not found',
    };
  }

  const session = sessionRes.rows[0];

  if (session.revoked_at !== null && session.revoked_at !== undefined) {
    return {
      success: false,
      status: 401,
      error: 'Session has been revoked',
    };
  }

  const now = new Date();
  if (now > new Date(session.expires_at)) {
    return {
      success: false,
      status: 401,
      error: 'Session has expired',
    };
  }

  // Verify session workspace matches token claims workspace
  if (session.workspace_id !== claims.ws || session.practitioner_id !== claims.sub) {
    return {
      success: false,
      status: 403,
      error: 'Session workspace binding mismatch',
    };
  }

  // 2. Verify practitioner in database
  const practitionerRes = await db.query<PractitionerIdentity>(
    `SELECT id, email, name, title, clinic_name, registration_number, initials, is_active, created_at, updated_at
     FROM practitioners WHERE id = $1`,
    [claims.sub]
  );

  if (practitionerRes.rows.length === 0 || !practitionerRes.rows[0].is_active) {
    return {
      success: false,
      status: 401,
      error: 'Practitioner account is deactivated or not found',
    };
  }

  const practitioner = practitionerRes.rows[0];

  // 3. Verify workspace in database
  const workspaceRes = await db.query<WorkspaceSummary>(
    `SELECT id, name, slug, is_active FROM workspaces WHERE id = $1`,
    [claims.ws]
  );

  if (workspaceRes.rows.length === 0 || !workspaceRes.rows[0].is_active) {
    return {
      success: false,
      status: 403,
      error: 'Workspace is deactivated or not found',
    };
  }

  const workspace = workspaceRes.rows[0];

  // 4. Verify live membership in database (LIVE DATABASE STATE IS AUTHORITATIVE)
  const membershipRes = await db.query<WorkspaceMembership>(
    `SELECT id, workspace_id, practitioner_id, role, status, clinical_authorized, created_at, updated_at
     FROM workspace_memberships
     WHERE workspace_id = $1 AND practitioner_id = $2`,
    [claims.ws, claims.sub]
  );

  if (membershipRes.rows.length === 0) {
    return {
      success: false,
      status: 403,
      error: 'Practitioner has no membership in this workspace',
    };
  }

  const liveMembership = membershipRes.rows[0];

  if (liveMembership.status !== 'active') {
    return {
      success: false,
      status: 403,
      error: `Workspace membership is ${liveMembership.status}`,
    };
  }

  return {
    success: true,
    context: {
      practitioner,
      workspace,
      membership: liveMembership,
      sessionId: session.id,
    },
  };
}
