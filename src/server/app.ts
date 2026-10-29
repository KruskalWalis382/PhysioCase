/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: EXPRESS APPLICATION & AUTHENTICATION/AUTHORIZATION APIS
 * ============================================================================
 */

import express, { Request, Response, NextFunction } from 'express';
import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../types/auth';
import { AuthService } from '../auth/service';
import { PatientService } from '../domain/patients/patient.service';
import { CaseService } from '../domain/cases/case.service';
import { createPatientRouter } from './routes/patients';
import { createCaseRouter } from './routes/cases';
import {
  resolveAuthContext,
  hasActiveMembership,
  isWorkspaceOwner,
  isClinicallyAuthorized,
} from '../auth/authorization';

// Extend Express Request type with authenticated context
export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

/**
 * Creates and configures the Express application with B-2 authentication & authorization routes.
 */
export function createApp(db: PGlite) {
  const app = express();
  const authService = new AuthService(db);
  const patientService = new PatientService(db);
  const caseService = new CaseService(db);

  app.use(express.json());

  // --------------------------------------------------------------------------
  // AUTHENTICATION & AUTHORIZATION MIDDLEWARES
  // --------------------------------------------------------------------------

  /**
   * Validates access token and resolves live database context.
   * Never relies solely on stale JWT claims.
   */
  const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed Authorization header' });
      return;
    }

    const token = authHeader.substring(7).trim();
    const resolved = await resolveAuthContext(db, token);

    if (resolved.success === false) {
      res.status(resolved.status).json({ error: resolved.error });
      return;
    }

    req.auth = resolved.context;
    next();
  };

  /**
   * Requires active membership in the current workspace.
   */
  const requireActiveMembership = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !hasActiveMembership(req.auth)) {
      res.status(403).json({ error: 'Active workspace membership required' });
      return;
    }
    next();
  };

  /**
   * Requires workspace_owner role with active membership.
   */
  const requireOwner = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !isWorkspaceOwner(req.auth)) {
      res.status(403).json({ error: 'Workspace owner administrative privilege required' });
      return;
    }
    next();
  };

  /**
   * Requires clinical authorization capability.
   * Invariant: role IN (workspace_owner, clinical_practitioner) AND clinical_authorized = true.
   * read_only_auditor is ALWAYS denied.
   */
  const requireClinical = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !isClinicallyAuthorized(req.auth)) {
      res.status(403).json({
        error: 'Clinical authorization capability required for this operation',
      });
      return;
    }
    next();
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATION ROUTES (Section 22)
  // --------------------------------------------------------------------------

  // 1. Initial workspace owner registration
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const {
        email,
        password,
        name,
        title,
        clinicName,
        registrationNumber,
        initials,
        workspaceName,
        workspaceSlug,
        clinicalAuthorized,
      } = req.body;

      if (!email || !password || !name || !workspaceName || !workspaceSlug) {
        res.status(400).json({ error: 'Missing required registration fields' });
        return;
      }

      const result = await authService.registerOwner(
        {
          email,
          password,
          name,
          title,
          clinicName,
          registrationNumber,
          initials,
          workspaceName,
          workspaceSlug,
          clinicalAuthorized: Boolean(clinicalAuthorized),
        },
        {
          userAgent: req.headers['user-agent'] as string,
          ipAddress: req.ip,
        }
      );

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  // 2. Login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password, workspaceId } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await authService.login(
        { email, password, workspaceId },
        {
          userAgent: req.headers['user-agent'] as string,
          ipAddress: req.ip,
        }
      );

      res.status(200).json(result);
    } catch (err: any) {
      // Generic failure response (Section 7)
      res.status(401).json({ error: err.message || 'Invalid email or password' });
    }
  });

  // 3. Refresh access token
  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required' });
        return;
      }

      const tokens = await authService.refresh(refreshToken, {
        userAgent: req.headers['user-agent'] as string,
        ipAddress: req.ip,
      });

      res.status(200).json(tokens);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Failed to refresh token' });
    }
  });

  // 4. Logout / Session revocation
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const { refreshToken, sessionId } = req.body;
      await authService.logout({ rawRefreshToken: refreshToken, sessionId });
      res.status(200).json({ success: true, message: 'Session logged out successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Logout failed' });
    }
  });

  // 5. Current context (/api/auth/me)
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const auth = req.auth!;
    res.status(200).json({
      practitioner: auth.practitioner,
      workspace: auth.workspace,
      membership: auth.membership,
      capabilities: {
        isOwner: isWorkspaceOwner(auth),
        isClinicallyAuthorized: isClinicallyAuthorized(auth),
        canMutateClinical: isClinicallyAuthorized(auth),
        canAdministerWorkspace: isWorkspaceOwner(auth),
      },
    });
  });

  // 6. Workspaces listing for practitioner
  app.get('/api/workspaces', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workspaces = await authService.listPractitionerWorkspaces(req.auth!.practitioner.id);
      res.status(200).json({ workspaces });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list workspaces' });
    }
  });

  // 7. Workspace switching
  app.post('/api/workspaces/switch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetWorkspaceId } = req.body;
      if (!targetWorkspaceId) {
        res.status(400).json({ error: 'targetWorkspaceId is required' });
        return;
      }

      const result = await authService.switchWorkspace(
        req.auth!.practitioner.id,
        targetWorkspaceId,
        {
          userAgent: req.headers['user-agent'] as string,
          ipAddress: req.ip,
        }
      );

      res.status(200).json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Failed to switch workspace' });
    }
  });

  // 8. Workspace member administration
  app.get(
    '/api/workspace/members',
    requireAuth,
    requireActiveMembership,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const members = await authService.listWorkspaceMembers(req.auth!);
        res.status(200).json({ members });
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to list members' });
      }
    }
  );

  app.post(
    '/api/workspace/members',
    requireAuth,
    requireOwner,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { email, name, role, clinicalAuthorized, title, registrationNumber, initials } =
          req.body;

        if (!email || !name || !role) {
          res.status(400).json({ error: 'email, name, and role are required' });
          return;
        }

        const result = await authService.addWorkspaceMember(req.auth!, {
          email,
          name,
          role,
          clinicalAuthorized: Boolean(clinicalAuthorized),
          title,
          registrationNumber,
          initials,
        });

        res.status(201).json(result);
      } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to add workspace member' });
      }
    }
  );

  app.patch(
    '/api/workspace/members/:id',
    requireAuth,
    requireOwner,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const membershipId = req.params.id;
        const { role, status, clinicalAuthorized } = req.body;

        const updated = await authService.updateWorkspaceMember(req.auth!, membershipId, {
          role,
          status,
          clinicalAuthorized,
        });

        res.status(200).json({ membership: updated });
      } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to update membership' });
      }
    }
  );

  // --------------------------------------------------------------------------
  // CLINICAL MUTATION PROBE ENDPOINT (Verification of Clinical Authority)
  // --------------------------------------------------------------------------
  app.post(
    '/api/clinical/probe-mutation',
    requireAuth,
    requireClinical,
    (req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({
        allowed: true,
        message: 'Clinical mutation authorized',
        practitioner: req.auth!.practitioner.id,
        workspace: req.auth!.workspace.id,
      });
    }
  );

  // --------------------------------------------------------------------------
  // B-3 DOMAIN ROUTES: PATIENTS & CASES
  // --------------------------------------------------------------------------
  app.use('/api/patients', createPatientRouter(patientService, requireAuth));
  app.use('/api/cases', createCaseRouter(caseService, requireAuth));

  return app;
}
