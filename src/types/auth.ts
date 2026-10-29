/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: AUTHENTICATION & AUTHORIZATION TYPE DEFINITIONS
 * ============================================================================
 */

export type WorkspaceRole = 'workspace_owner' | 'clinical_practitioner' | 'read_only_auditor';

export type MembershipStatus = 'active' | 'suspended' | 'inactive';

export interface PractitionerIdentity {
  id: string;
  email: string;
  name: string;
  title?: string | null;
  clinic_name?: string | null;
  registration_number?: string | null;
  initials?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  practitioner_id: string;
  role: WorkspaceRole;
  status: MembershipStatus;
  clinical_authorized: boolean;
  created_at: string;
  updated_at: string;
}

export interface PractitionerSession {
  id: string;
  practitioner_id: string;
  workspace_id: string;
  token_hash: string;
  issued_at: string;
  expires_at: string;
  revoked_at?: string | null;
  last_used_at: string;
  user_agent?: string | null;
  ip_address?: string | null;
  created_at: string;
}

/**
 * Access token claims.
 * STRICTLY NO PHI IN JWT CLAIMS.
 */
export interface JwtAccessClaims {
  sub: string;       // Practitioner ID
  sid: string;       // Session ID
  ws: string;        // Workspace ID
  role: WorkspaceRole; // Role in workspace
  iat: number;       // Issued at (unix seconds)
  exp: number;       // Expiry timestamp (unix seconds)
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface AuthContext {
  practitioner: PractitionerIdentity;
  workspace: WorkspaceSummary;
  membership: WorkspaceMembership;
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Seconds (900 for 15 minutes)
}

export interface AuthResult {
  tokens: AuthTokens;
  practitioner: PractitionerIdentity;
  workspace: WorkspaceSummary;
  membership: WorkspaceMembership;
}

export interface RegisterOwnerRequest {
  email: string;
  password: string;
  name: string;
  title?: string;
  clinicName?: string;
  registrationNumber?: string;
  initials?: string;
  workspaceName: string;
  workspaceSlug: string;
  /**
   * Explicit clinical authorization flag.
   * Distinguishes practicing clinician-owner (true) from administrative-only owner (false).
   */
  clinicalAuthorized: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  workspaceId?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface SwitchWorkspaceRequest {
  targetWorkspaceId: string;
}

export interface CreateMemberRequest {
  email: string;
  name: string;
  role: WorkspaceRole;
  clinicalAuthorized: boolean;
  title?: string;
  registrationNumber?: string;
  initials?: string;
  temporaryPassword?: string;
}

export interface UpdateMemberRequest {
  role?: WorkspaceRole;
  status?: MembershipStatus;
  clinicalAuthorized?: boolean;
}
