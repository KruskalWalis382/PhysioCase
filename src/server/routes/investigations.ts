/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: CLINICAL INVESTIGATION API ROUTES
 * ============================================================================
 */

import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../app';
import type { InvestigationService } from '../../domain/investigations/investigation.service';
import {
  validateCreateInvestigation,
  validateUpdateInvestigation,
  validateArchiveInvestigation,
} from '../../domain/investigations/investigation.schema';

export function createInvestigationRouter(
  investigationService: InvestigationService,
  requireAuth: (req: any, res: any, next: any) => void
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  // 1. List investigations for case (Excludes archived by default)
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const list = await investigationService.listInvestigations(
        req.auth!,
        req.params.caseId,
        includeArchived
      );
      res.status(200).json(list);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to list investigations' });
    }
  });

  // 2. Create investigation (Requires clinical authorization)
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateCreateInvestigation(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const created = await investigationService.createInvestigation(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(201).json(created);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to create investigation' });
    }
  });

  // 3. Get single investigation by ID
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const inv = await investigationService.getInvestigationById(
        req.auth!,
        req.params.caseId,
        req.params.id
      );
      res.status(200).json(inv);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to get investigation' });
    }
  });

  // 4. Update investigation (Requires clinical authorization & optimistic concurrency)
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateUpdateInvestigation(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const updated = await investigationService.updateInvestigation(
        req.auth!,
        req.params.caseId,
        req.params.id,
        validation.data
      );
      res.status(200).json(updated);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to update investigation' });
    }
  });

  // 5. Archive investigation (Governed soft-deletion with mandatory reason)
  router.post('/:id/archive', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateArchiveInvestigation(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const archived = await investigationService.archiveInvestigation(
        req.auth!,
        req.params.caseId,
        req.params.id,
        validation.data
      );
      res.status(200).json(archived);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to archive investigation' });
    }
  });

  return router;
}
