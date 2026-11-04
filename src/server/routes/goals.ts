/**
 * ============================================================================
 * PHYSIOCASE — PART B-6: CLINICAL GOAL API ROUTES
 * ============================================================================
 */

import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../app';
import type { GoalService } from '../../domain/goals/goal.service';
import {
  validateCreateGoal,
  validateUpdateGoal,
  validateArchiveGoal,
  validateListGoalsQuery,
} from '../../domain/goals/goal.schema';

export function createGoalRouter(
  goalService: GoalService,
  requireAuth: (req: any, res: any, next: any) => void
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  // 1. List goals for case (Excludes archived by default, optional status and type filters)
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const queryValidation = validateListGoalsQuery(req.query as Record<string, unknown>);
      if (queryValidation.valid === false) {
        res.status(400).json({ error: queryValidation.error });
        return;
      }

      const list = await goalService.listGoals(
        req.auth!,
        req.params.caseId,
        queryValidation.data
      );
      res.status(200).json(list);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to list clinical goals' });
    }
  });

  // 2. Create goal (Requires clinical authorization)
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateCreateGoal(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const created = await goalService.createGoal(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(201).json(created);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to create clinical goal' });
    }
  });

  // 3. Get single goal by ID
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const goal = await goalService.getGoalById(
        req.auth!,
        req.params.caseId,
        req.params.id
      );
      res.status(200).json(goal);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to get clinical goal' });
    }
  });

  // 4. Update goal (Requires clinical authorization & optimistic concurrency)
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateUpdateGoal(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const updated = await goalService.updateGoal(
        req.auth!,
        req.params.caseId,
        req.params.id,
        validation.data
      );
      res.status(200).json(updated);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to update clinical goal' });
    }
  });

  // 5. Archive goal (Governed soft-deletion with mandatory reason)
  router.post('/:id/archive', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateArchiveGoal(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const archived = await goalService.archiveGoal(
        req.auth!,
        req.params.caseId,
        req.params.id,
        validation.data
      );
      res.status(200).json(archived);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to archive clinical goal' });
    }
  });

  return router;
}
