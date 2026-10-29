/**
 * ============================================================================
 * PHYSIOCASE — PART B-3: PATIENT DOMAIN API ROUTES
 * ============================================================================
 */

import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../app';
import type { PatientService } from '../../domain/patients/patient.service';
import {
  validateCreatePatient,
  validateUpdatePatient,
} from '../../domain/patients/patient.schema';

export function createPatientRouter(
  patientService: PatientService,
  requireAuth: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  // All patient routes require authenticated session
  router.use(requireAuth);

  // 1. Create patient (Requires clinical mutation authority)
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateCreatePatient(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const patient = await patientService.createPatient(req.auth!, validation.data);
      res.status(201).json(patient);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to create patient' });
    }
  });

  // 2. List patients in workspace (All active members including auditors)
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, status, limit, offset } = req.query;
      const patients = await patientService.listPatients(req.auth!, {
        search: typeof search === 'string' ? search : undefined,
        status: status === 'active' || status === 'discharged' ? status : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      res.status(200).json(patients);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to list patients' });
    }
  });

  // 3. Get single patient by ID (Workspace scoped; foreign tenant IDs return 404)
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patient = await patientService.getPatientById(req.auth!, req.params.id);
      res.status(200).json(patient);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to get patient' });
    }
  });

  // 4. Update patient demographics or safety profile (Requires clinical mutation authority)
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateUpdatePatient(req.body);
      if (validation.valid === false) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const updated = await patientService.updatePatient(
        req.auth!,
        req.params.id,
        validation.data
      );
      res.status(200).json(updated);
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message || 'Failed to update patient' });
    }
  });

  return router;
}
