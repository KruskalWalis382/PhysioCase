/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: SUBJECTIVE ASSESSMENT API ROUTES
 * ============================================================================
 */

import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../app';
import type { SubjectiveAssessmentService } from '../../domain/assessments/subjective.service';
import {
  validateSaveSubjective,
  validateFinalizeSubjective,
  validateAmendSubjective,
} from '../../domain/assessments/subjective.schema';

export function createSubjectiveRouter(
  subjectiveService: SubjectiveAssessmentService,
  requireAuth: (req: any, res: any, next: any) => void
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  // 1. Get subjective assessment (Returns null if not yet created; workspace-scoped)
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assessment = await subjectiveService.getSubjectiveAssessment(
        req.auth!,
        req.params.caseId
      );
      res.status(200).json(assessment);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to get subjective assessment' });
    }
  });

  // 2. Save or update subjective assessment draft (Requires clinical authorization)
  router.put('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateSaveSubjective(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const saved = await subjectiveService.saveSubjectiveAssessment(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(200).json(saved);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to save subjective assessment' });
    }
  });

  // 3. Finalize subjective assessment (Medical-legal sign-off; renders record immutable)
  router.post('/finalize', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateFinalizeSubjective(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const finalized = await subjectiveService.finalizeSubjectiveAssessment(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(200).json(finalized);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to finalize subjective assessment' });
    }
  });

  // 4. Record governed amendment to finalized assessment
  router.post('/amend', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateAmendSubjective(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const amended = await subjectiveService.amendSubjectiveAssessment(
        req.auth!,
        req.params.caseId,
        validation.data
      );
      res.status(200).json(amended);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to amend subjective assessment' });
    }
  });

  return router;
}
