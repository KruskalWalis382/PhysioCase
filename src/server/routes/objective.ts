/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: OBJECTIVE ASSESSMENT API ROUTES
 * ============================================================================
 */

import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../app';
import type { ObjectiveAssessmentService } from '../../domain/assessments/objective.service';
import {
  validateSaveObjective,
  validateFinalizeObjective,
  validateAmendObjective,
} from '../../domain/assessments/objective.schema';

export function createObjectiveRouter(
  objectiveService: ObjectiveAssessmentService,
  requireAuth: (req: any, res: any, next: any) => void
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  // 1. Get objective assessment (Returns null if not yet created; workspace-scoped)
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assessment = await objectiveService.getObjectiveAssessment(
        req.auth!,
        req.params.caseId
      );
      res.status(200).json(assessment);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to get objective assessment' });
    }
  });

  // 2. Save or update objective assessment draft (Requires clinical authorization)
  router.put('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateSaveObjective(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const saved = await objectiveService.saveObjectiveAssessment(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(200).json(saved);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to save objective assessment' });
    }
  });

  // 3. Finalize objective assessment (Medical-legal sign-off; renders record immutable)
  router.post('/finalize', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateFinalizeObjective(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const finalized = await objectiveService.finalizeObjectiveAssessment(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(200).json(finalized);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to finalize objective assessment' });
    }
  });

  // 4. Record governed amendment to finalized assessment
  router.post('/amend', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateAmendObjective(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const amended = await objectiveService.amendObjectiveAssessment(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(200).json(amended);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to amend objective assessment' });
    }
  });

  return router;
}
