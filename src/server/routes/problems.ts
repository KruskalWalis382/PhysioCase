/**
 * ============================================================================
 * PHYSIOCASE — PART B-5: CLINICAL PROBLEM API ROUTES
 * ============================================================================
 */

import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../app';
import type { ProblemService } from '../../domain/problems/problem.service';
import {
  validateCreateProblem,
  validateUpdateProblem,
  validateArchiveProblem,
} from '../../domain/problems/problem.schema';

export function createProblemRouter(
  problemService: ProblemService,
  requireAuth: (req: any, res: any, next: any) => void
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  // 1. List problems for case (Excludes archived by default, optional status filter)
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;
      const list = await problemService.listProblems(
        req.auth!,
        req.params.caseId,
        { includeArchived, status }
      );
      res.status(200).json(list);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to list clinical problems' });
    }
  });

  // 2. Create problem (Requires clinical authorization)
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateCreateProblem(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const created = await problemService.createProblem(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(201).json(created);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to create clinical problem' });
    }
  });

  // 3. Get single problem by ID
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const problem = await problemService.getProblemById(
        req.auth!,
        req.params.caseId,
        req.params.id
      );
      res.status(200).json(problem);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to get clinical problem' });
    }
  });

  // 4. Update problem (Requires clinical authorization & optimistic concurrency)
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateUpdateProblem(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const updated = await problemService.updateProblem(
        req.auth!,
        req.params.caseId,
        req.params.id,
        validation.data
      );
      res.status(200).json(updated);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to update clinical problem' });
    }
  });

  // 5. Archive problem (Governed soft-deletion with mandatory reason)
  router.post('/:id/archive', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateArchiveProblem(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const archived = await problemService.archiveProblem(
        req.auth!,
        req.params.caseId,
        req.params.id,
        validation.data
      );
      res.status(200).json(archived);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to archive clinical problem' });
    }
  });

  return router;
}
