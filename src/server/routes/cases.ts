/**
 * ============================================================================
 * PHYSIOCASE — PART B-3: CASE DOMAIN API ROUTES
 * ============================================================================
 */

import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../app';
import type { CaseService } from '../../domain/cases/case.service';
import {
  validateCreateCase,
  validateUpdateCase,
  validateArchiveCase,
  validateUnarchiveCase,
} from '../../domain/cases/case.schema';

export function createCaseRouter(
  caseService: CaseService,
  requireAuth: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  // All case routes require authenticated session
  router.use(requireAuth);

  // 1. Create case (Requires clinical mutation authority)
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateCreateCase(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const created = await caseService.createCase(req.auth!, validation.data);
      res.status(201).json(created);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to create case' });
    }
  });

  // 2. List cases in workspace
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patientId, status, isArchived, limit, offset } = req.query;
      const cases = await caseService.listCases(req.auth!, {
        patientId: typeof patientId === 'string' ? patientId : undefined,
        status: typeof status === 'string' ? (status as any) : undefined,
        isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      res.status(200).json(cases);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to list cases' });
    }
  });

  // 3. Get single case by ID (Workspace scoped; foreign tenant IDs return 404)
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const caseItem = await caseService.getCaseById(req.auth!, req.params.id);
      res.status(200).json(caseItem);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to get case' });
    }
  });

  // 4. Update case fields / status transition (Prohibits modification of archived cases)
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateUpdateCase(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const updated = await caseService.updateCase(
        req.auth!,
        req.params.id,
        validation.data
      );
      res.status(200).json(updated);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to update case' });
    }
  });

  // 5. Archive case (Administrative or clinical reason rules enforced)
  router.post('/:id/archive', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateArchiveCase(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const archived = await caseService.archiveCase(
        req.auth!,
        req.params.id,
        validation.data
      );
      res.status(200).json(archived);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to archive case' });
    }
  });

  // 6. Unarchive case (Restores case and clears archive metadata)
  router.post('/:id/unarchive', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateUnarchiveCase(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const unarchived = await caseService.unarchiveCase(
        req.auth!,
        req.params.id,
        validation.data
      );
      res.status(200).json(unarchived);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to unarchive case' });
    }
  });

  return router;
}
