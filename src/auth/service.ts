/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: AUTHENTICATION & MEMBERSHIP APPLICATION SERVICE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type {
  RegisterOwnerRequest,
  LoginRequest,
  AuthResult,
  AuthTokens,
  WorkspaceSummary,
  WorkspaceMembership,
  PractitionerIdentity,
  CreateMemberRequest,
  UpdateMemberRequest,
  AuthContext,
} from '../types/auth';
import { hashPassword, verifyPassword } from './password';
import { signAccessToken, ACCESS_TOKEN_EXPIRY_SECONDS } from './jwt';
import {
  createSession,
  rotateSession,
  revokeSession,
} from './session';
import { globalAuthRateLimiter } from './rateLimit';
import {
  isWorkspaceOwner,
} from './authorization';

export class AuthService {
  constructor(private db: PGlite) {}

  /**
   * Registers a new workspace owner and their workspace.
   * Explicitly distinguishes practicing clinician-owner from administrative-only owner.
   */
  async registerOwner(
    req: RegisterOwnerRequest,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthResult> {
    const email = req.email.trim().toLowerCase();

    // Check global email uniqueness
    const existingPractitioner = await this.db.query(
      `SELECT id FROM practitioners WHERE LOWER(email) = $1`,
      [email]
    );
    if (existingPractitioner.rows.length > 0) {
      throw new Error('A practitioner account with this email already exists');
    }

    // Check workspace slug uniqueness
    const existingSlug = await this.db.query(
      `SELECT id FROM workspaces WHERE slug = $1`,
      [req.workspaceSlug.trim().toLowerCase()]
    );
    if (existingSlug.rows.length > 0) {
      throw new Error('A workspace with this slug already exists');
    }

    const passwordHash = await hashPassword(req.password);

    // Create Workspace
    const wsRes = await this.db.query<WorkspaceSummary>(
      `
      INSERT INTO workspaces (name, slug)
      VALUES ($1, $2)
      RETURNING id, name, slug, is_active
      `,
      [req.workspaceName.trim(), req.workspaceSlug.trim().toLowerCase()]
    );
    const workspace = wsRes.rows[0];

    // Create Global Practitioner Identity
    const practitionerRes = await this.db.query<PractitionerIdentity>(
      `
      INSERT INTO practitioners (
        email,
        password_hash,
        name,
        title,
        clinic_name,
        registration_number,
        initials
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, name, title, clinic_name, registration_number, initials, is_active, created_at, updated_at
      `,
      [
        email,
        passwordHash,
        req.name.trim(),
        req.title?.trim() ?? null,
        req.clinicName?.trim() ?? null,
        req.registrationNumber?.trim() ?? null,
        req.initials?.trim() ?? null,
      ]
    );
    const practitioner = practitionerRes.rows[0];

    // Create Explicit Workspace Membership
    // clinical_authorized is explicitly provided, NOT inferred from title or registration
    const membershipRes = await this.db.query<WorkspaceMembership>(
      `
      INSERT INTO workspace_memberships (
        workspace_id,
        practitioner_id,
        role,
        status,
        clinical_authorized
      )
      VALUES ($1, $2, 'workspace_owner', 'active', $3)
      RETURNING id, workspace_id, practitioner_id, role, status, clinical_authorized, created_at, updated_at
      `,
      [workspace.id, practitioner.id, Boolean(req.clinicalAuthorized)]
    );
    const membership = membershipRes.rows[0];

    // Create Initial Session
    const { session, rawRefreshToken } = await createSession(
      this.db,
      practitioner.id,
      workspace.id,
      {
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      }
    );

    // Issue 15m Access Token
    const accessToken = await signAccessToken({
      sub: practitioner.id,
      sid: session.id,
      ws: workspace.id,
      role: membership.role,
    });

    return {
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      },
      practitioner,
      workspace,
      membership,
    };
  }

  /**
   * Authenticates practitioner via global email and password.
   * Generic failure message to prevent enumeration attacks.
   */
  async login(
    req: LoginRequest,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthResult> {
    const email = req.email.trim().toLowerCase();
    const rateKey = `login:${email}`;

    // Abuse / Rate Limiting check
    const rateCheck = globalAuthRateLimiter.check(rateKey);
    if (!rateCheck.allowed) {
      throw new Error(
        `Too many failed attempts. Please retry after ${rateCheck.retryAfterSeconds} seconds.`
      );
    }

    // Lookup practitioner
    const practitionerRes = await this.db.query<PractitionerIdentity & { password_hash: string }>(
      `
      SELECT id, email, password_hash, name, title, clinic_name, registration_number, initials, is_active, created_at, updated_at
      FROM practitioners
      WHERE LOWER(email) = $1
      `,
      [email]
    );

    if (practitionerRes.rows.length === 0) {
      globalAuthRateLimiter.recordFailure(rateKey);
      throw new Error('Invalid email or password');
    }

    const practitionerRow = practitionerRes.rows[0];

    // Password verification via Argon2id
    const isValidPassword = await verifyPassword(req.password, practitionerRow.password_hash);
    if (!isValidPassword) {
      globalAuthRateLimiter.recordFailure(rateKey);
      throw new Error('Invalid email or password');
    }

    if (!practitionerRow.is_active) {
      throw new Error('Practitioner account is deactivated');
    }

    globalAuthRateLimiter.recordSuccess(rateKey);

    // Select workspace & membership
    let membershipQuery = `
      SELECT m.id, m.workspace_id, m.practitioner_id, m.role, m.status, m.clinical_authorized, m.created_at, m.updated_at,
             w.id AS ws_id, w.name AS ws_name, w.slug AS ws_slug, w.is_active AS ws_is_active
      FROM workspace_memberships m
      JOIN workspaces w ON w.id = m.workspace_id
      WHERE m.practitioner_id = $1 AND m.status = 'active' AND w.is_active = true
    `;
    const queryParams: any[] = [practitionerRow.id];

    if (req.workspaceId) {
      membershipQuery += ` AND m.workspace_id = $2`;
      queryParams.push(req.workspaceId);
    } else {
      membershipQuery += ` ORDER BY m.created_at ASC LIMIT 1`;
    }

    const membershipsRes = await this.db.query<any>(membershipQuery, queryParams);
    if (membershipsRes.rows.length === 0) {
      throw new Error('No active workspace membership found for this practitioner');
    }

    const row = membershipsRes.rows[0];
    const workspace: WorkspaceSummary = {
      id: row.ws_id,
      name: row.ws_name,
      slug: row.ws_slug,
      is_active: row.ws_is_active,
    };
    const membership: WorkspaceMembership = {
      id: row.id,
      workspace_id: row.workspace_id,
      practitioner_id: row.practitioner_id,
      role: row.role,
      status: row.status,
      clinical_authorized: row.clinical_authorized,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    const practitioner: PractitionerIdentity = {
      id: practitionerRow.id,
      email: practitionerRow.email,
      name: practitionerRow.name,
      title: practitionerRow.title,
      clinic_name: practitionerRow.clinic_name,
      registration_number: practitionerRow.registration_number,
      initials: practitionerRow.initials,
      is_active: practitionerRow.is_active,
      created_at: practitionerRow.created_at,
      updated_at: practitionerRow.updated_at,
    };

    // Create Session
    const { session, rawRefreshToken } = await createSession(
      this.db,
      practitioner.id,
      workspace.id,
      {
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      }
    );

    // Issue 15m Access Token
    const accessToken = await signAccessToken({
      sub: practitioner.id,
      sid: session.id,
      ws: workspace.id,
      role: membership.role,
    });

    return {
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      },
      practitioner,
      workspace,
      membership,
    };
  }

  /**
   * Rotates a refresh token and issues a new access token.
   * Invalidates the previous session to prevent token reuse.
   */
  async refresh(
    rawRefreshToken: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthTokens> {
    const { newSession, newRawRefreshToken } = await rotateSession(
      this.db,
      rawRefreshToken,
      meta
    );

    // Fetch live membership to guarantee up-to-date role
    const membershipRes = await this.db.query<WorkspaceMembership>(
      `
      SELECT * FROM workspace_memberships
      WHERE workspace_id = $1 AND practitioner_id = $2
      `,
      [newSession.workspace_id, newSession.practitioner_id]
    );

    if (membershipRes.rows.length === 0 || membershipRes.rows[0].status !== 'active') {
      throw new Error('Workspace membership is inactive or no longer exists');
    }

    const membership = membershipRes.rows[0];

    const accessToken = await signAccessToken({
      sub: newSession.practitioner_id,
      sid: newSession.id,
      ws: newSession.workspace_id,
      role: membership.role,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  /**
   * Logs out / revokes a session.
   */
  async logout(identifier: { sessionId?: string; rawRefreshToken?: string }): Promise<void> {
    await revokeSession(this.db, identifier);
  }

  /**
   * Lists all workspaces for the authenticated practitioner.
   */
  async listPractitionerWorkspaces(practitionerId: string): Promise<
    Array<{
      workspace: WorkspaceSummary;
      membership: WorkspaceMembership;
    }>
  > {
    const res = await this.db.query<any>(
      `
      SELECT
        w.id AS ws_id, w.name AS ws_name, w.slug AS ws_slug, w.is_active AS ws_is_active,
        m.id AS m_id, m.workspace_id, m.practitioner_id, m.role, m.status, m.clinical_authorized,
        m.created_at AS m_created_at, m.updated_at AS m_updated_at
      FROM workspace_memberships m
      JOIN workspaces w ON w.id = m.workspace_id
      WHERE m.practitioner_id = $1
      ORDER BY m.created_at ASC
      `,
      [practitionerId]
    );

    return res.rows.map((r) => ({
      workspace: {
        id: r.ws_id,
        name: r.ws_name,
        slug: r.ws_slug,
        is_active: r.ws_is_active,
      },
      membership: {
        id: r.m_id,
        workspace_id: r.workspace_id,
        practitioner_id: r.practitioner_id,
        role: r.role,
        status: r.status,
        clinical_authorized: r.clinical_authorized,
        created_at: r.m_created_at,
        updated_at: r.m_updated_at,
      },
    }));
  }

  /**
   * Switches workspace context for an authenticated practitioner.
   * Strictly verifies active membership in target workspace before issuing a new token.
   */
  async switchWorkspace(
    practitionerId: string,
    targetWorkspaceId: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthResult> {
    // 1. Verify target workspace exists and is active
    const wsRes = await this.db.query<WorkspaceSummary>(
      `SELECT id, name, slug, is_active FROM workspaces WHERE id = $1`,
      [targetWorkspaceId]
    );
    if (wsRes.rows.length === 0 || !wsRes.rows[0].is_active) {
      throw new Error('Target workspace does not exist or is inactive');
    }
    const workspace = wsRes.rows[0];

    // 2. Verify active membership in target workspace
    const memRes = await this.db.query<WorkspaceMembership>(
      `
      SELECT id, workspace_id, practitioner_id, role, status, clinical_authorized, created_at, updated_at
      FROM workspace_memberships
      WHERE workspace_id = $1 AND practitioner_id = $2
      `,
      [targetWorkspaceId, practitionerId]
    );
    if (memRes.rows.length === 0 || memRes.rows[0].status !== 'active') {
      throw new Error('Practitioner has no active membership in target workspace');
    }
    const membership = memRes.rows[0];

    // 3. Load practitioner
    const practitionerRes = await this.db.query<PractitionerIdentity>(
      `
      SELECT id, email, name, title, clinic_name, registration_number, initials, is_active, created_at, updated_at
      FROM practitioners
      WHERE id = $1
      `,
      [practitionerId]
    );
    const practitioner = practitionerRes.rows[0];

    // 4. Create new workspace-bound session
    const { session, rawRefreshToken } = await createSession(
      this.db,
      practitionerId,
      targetWorkspaceId,
      {
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      }
    );

    // 5. Sign new workspace-bound token
    const accessToken = await signAccessToken({
      sub: practitionerId,
      sid: session.id,
      ws: targetWorkspaceId,
      role: membership.role,
    });

    return {
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      },
      practitioner,
      workspace,
      membership,
    };
  }

  /**
   * Lists members of a workspace. Requires active membership.
   */
  async listWorkspaceMembers(context: AuthContext): Promise<
    Array<{
      membership: WorkspaceMembership;
      practitioner: PractitionerIdentity;
    }>
  > {
    const res = await this.db.query<any>(
      `
      SELECT
        m.id AS m_id, m.workspace_id, m.practitioner_id, m.role, m.status, m.clinical_authorized,
        m.created_at AS m_created_at, m.updated_at AS m_updated_at,
        p.id AS p_id, p.email, p.name, p.title, p.clinic_name, p.registration_number, p.initials,
        p.is_active, p.created_at AS p_created_at, p.updated_at AS p_updated_at
      FROM workspace_memberships m
      JOIN practitioners p ON p.id = m.practitioner_id
      WHERE m.workspace_id = $1
      ORDER BY m.created_at ASC
      `,
      [context.workspace.id]
    );

    return res.rows.map((r) => ({
      membership: {
        id: r.m_id,
        workspace_id: r.workspace_id,
        practitioner_id: r.practitioner_id,
        role: r.role,
        status: r.status,
        clinical_authorized: r.clinical_authorized,
        created_at: r.m_created_at,
        updated_at: r.m_updated_at,
      },
      practitioner: {
        id: r.p_id,
        email: r.email,
        name: r.name,
        title: r.title,
        clinic_name: r.clinic_name,
        registration_number: r.registration_number,
        initials: r.initials,
        is_active: r.is_active,
        created_at: r.p_created_at,
        updated_at: r.p_updated_at,
      },
    }));
  }

  /**
   * Adds a new member to a workspace.
   * Requires workspace_owner role.
   * Enforces: read_only_auditor CANNOT be clinically authorized.
   */
  async addWorkspaceMember(
    context: AuthContext,
    req: CreateMemberRequest
  ): Promise<{ membership: WorkspaceMembership; practitioner: PractitionerIdentity }> {
    if (!isWorkspaceOwner(context)) {
      throw new Error('Only workspace owners can add or invite members');
    }

    if (req.role === 'read_only_auditor' && req.clinicalAuthorized) {
      throw new Error('read_only_auditor cannot be clinically authorized');
    }

    const email = req.email.trim().toLowerCase();

    // Find or create global practitioner
    let practitioner: PractitionerIdentity;
    const existing = await this.db.query<PractitionerIdentity>(
      `SELECT id, email, name, title, clinic_name, registration_number, initials, is_active, created_at, updated_at
       FROM practitioners WHERE LOWER(email) = $1`,
      [email]
    );

    if (existing.rows.length > 0) {
      practitioner = existing.rows[0];
    } else {
      const defaultPassword = req.temporaryPassword || 'PhysioCaseTempPass2026!';
      const hash = await hashPassword(defaultPassword);
      const newPractitioner = await this.db.query<PractitionerIdentity>(
        `
        INSERT INTO practitioners (email, password_hash, name, title, registration_number, initials)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, title, clinic_name, registration_number, initials, is_active, created_at, updated_at
        `,
        [
          email,
          hash,
          req.name.trim(),
          req.title?.trim() ?? null,
          req.registrationNumber?.trim() ?? null,
          req.initials?.trim() ?? null,
        ]
      );
      practitioner = newPractitioner.rows[0];
    }

    // Check if membership already exists in this workspace
    const existingMember = await this.db.query(
      `SELECT id FROM workspace_memberships WHERE workspace_id = $1 AND practitioner_id = $2`,
      [context.workspace.id, practitioner.id]
    );
    if (existingMember.rows.length > 0) {
      throw new Error('Practitioner is already a member of this workspace');
    }

    const clinicalAuth = req.role === 'read_only_auditor' ? false : Boolean(req.clinicalAuthorized);

    const memRes = await this.db.query<WorkspaceMembership>(
      `
      INSERT INTO workspace_memberships (
        workspace_id,
        practitioner_id,
        role,
        status,
        clinical_authorized
      )
      VALUES ($1, $2, $3, 'active', $4)
      RETURNING id, workspace_id, practitioner_id, role, status, clinical_authorized, created_at, updated_at
      `,
      [context.workspace.id, practitioner.id, req.role, clinicalAuth]
    );

    return {
      membership: memRes.rows[0],
      practitioner,
    };
  }

  /**
   * Updates an existing workspace membership.
   * Requires workspace_owner role.
   * Enforces self-authorization protections:
   * - A non-owner cannot call this route.
   * - A practitioner cannot self-elevate clinical authorization.
   * - read_only_auditor cannot be clinically authorized.
   */
  async updateWorkspaceMember(
    context: AuthContext,
    membershipId: string,
    req: UpdateMemberRequest
  ): Promise<WorkspaceMembership> {
    if (!isWorkspaceOwner(context)) {
      throw new Error('Only workspace owners can modify workspace memberships');
    }

    // Load existing membership within the current workspace (strictly workspace-scoped)
    const existingRes = await this.db.query<WorkspaceMembership>(
      `SELECT * FROM workspace_memberships WHERE id = $1 AND workspace_id = $2`,
      [membershipId, context.workspace.id]
    );

    if (existingRes.rows.length === 0) {
      throw new Error('Membership not found in this workspace');
    }

    const current = existingRes.rows[0];

    // Self-elevation protection: A practitioner cannot elevate their own clinical_authorized
    if (
      current.practitioner_id === context.practitioner.id &&
      req.clinicalAuthorized !== undefined &&
      req.clinicalAuthorized !== current.clinical_authorized
    ) {
      throw new Error('Practitioners cannot modify their own clinical authorization capability');
    }

    const newRole = req.role ?? current.role;
    let newClinicalAuth = req.clinicalAuthorized ?? current.clinical_authorized;
    const newStatus = req.status ?? current.status;

    // Database check constraint enforcement
    if (newRole === 'read_only_auditor') {
      newClinicalAuth = false;
    }

    const updateRes = await this.db.query<WorkspaceMembership>(
      `
      UPDATE workspace_memberships
      SET role = $1,
          status = $2,
          clinical_authorized = $3,
          updated_at = clock_timestamp()
      WHERE id = $4 AND workspace_id = $5
      RETURNING id, workspace_id, practitioner_id, role, status, clinical_authorized, created_at, updated_at
      `,
      [newRole, newStatus, newClinicalAuth, membershipId, context.workspace.id]
    );

    return updateRes.rows[0];
  }
}
