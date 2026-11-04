/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: OBJECTIVE ASSESSMENT SCHEMAS & VALIDATION
 * ============================================================================
 */

import type {
  ObjectiveAssessmentStatus,
  ObjectiveFinding,
} from '../../types';
import { VALID_AMENDMENT_REASONS, type AmendmentReason } from './subjective.schema';

export const VALID_OBJECTIVE_STATUSES: ObjectiveAssessmentStatus[] = [
  'not_started',
  'in_progress',
  'completed',
];

export interface SaveObjectiveFindingInput {
  id?: string;
  examinationArea: string;
  finding: string;
}

export interface SaveObjectiveInput {
  selectedAreas?: string[];
  findings?: SaveObjectiveFindingInput[];
  therapistNotes?: string;
  markCompleted?: boolean;
  version?: number;
}

export interface FinalizeObjectiveInput {
  version: number;
}

export interface AmendObjectiveInput {
  reason: AmendmentReason;
  text: string;
  version: number;
}

const DISALLOWED_CLIENT_OVERRIDE_FIELDS = [
  'id',
  'workspaceId',
  'workspace_id',
  'caseId',
  'case_id',
  'patientId',
  'patient_id',
  'isFinalized',
  'is_finalized',
  'finalizedAt',
  'finalized_at',
  'finalizedBy',
  'finalized_by',
  'amendments',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
];

export function validateSaveObjective(body: unknown):
  | { valid: true; data: SaveObjectiveInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  for (const field of DISALLOWED_CLIENT_OVERRIDE_FIELDS) {
    if (raw[field] !== undefined) {
      return { valid: false, error: `Field '${field}' cannot be directly provided by client` };
    }
  }

  // Validate version if provided
  if (raw.version !== undefined) {
    if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
      return { valid: false, error: 'version must be a positive integer' };
    }
  }

  // Validate findings if provided
  let findings: SaveObjectiveFindingInput[] | undefined;
  if (raw.findings !== undefined) {
    if (!Array.isArray(raw.findings)) {
      return { valid: false, error: 'findings must be an array' };
    }
    findings = [];
    for (let i = 0; i < raw.findings.length; i++) {
      const f = raw.findings[i];
      if (!f || typeof f !== 'object') {
        return { valid: false, error: `findings[${i}] must be an object` };
      }
      if (typeof f.examinationArea !== 'string' || !f.examinationArea.trim()) {
        return { valid: false, error: `findings[${i}].examinationArea is required and must not be empty` };
      }
      if (typeof f.finding !== 'string' || !f.finding.trim()) {
        return { valid: false, error: `findings[${i}].finding is required and must not be empty` };
      }
      findings.push({
        id: typeof f.id === 'string' && f.id.trim() ? f.id.trim() : undefined,
        examinationArea: f.examinationArea.trim(),
        finding: f.finding.trim(),
      });
    }
  }

  return {
    valid: true,
    data: {
      selectedAreas: Array.isArray(raw.selectedAreas) ? raw.selectedAreas.map(String) : undefined,
      findings,
      therapistNotes: typeof raw.therapistNotes === 'string' ? raw.therapistNotes : undefined,
      markCompleted: typeof raw.markCompleted === 'boolean' ? raw.markCompleted : undefined,
      version: raw.version as number | undefined,
    },
  };
}

export function validateFinalizeObjective(body: unknown):
  | { valid: true; data: FinalizeObjectiveInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  if (raw.version === undefined) {
    return { valid: false, error: 'version is required to finalize an assessment' };
  }

  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return { valid: false, error: 'version must be a positive integer' };
  }

  return {
    valid: true,
    data: { version: raw.version },
  };
}

export function validateAmendObjective(body: unknown):
  | { valid: true; data: AmendObjectiveInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  if (!raw.reason || typeof raw.reason !== 'string') {
    return { valid: false, error: 'reason is required' };
  }

  if (!VALID_AMENDMENT_REASONS.includes(raw.reason as AmendmentReason)) {
    return {
      valid: false,
      error: `Invalid amendment reason '${raw.reason}'. Allowed: ${VALID_AMENDMENT_REASONS.join(', ')}`,
    };
  }

  if (!raw.text || typeof raw.text !== 'string' || !raw.text.trim()) {
    return { valid: false, error: 'text is required and must not be empty' };
  }

  if (raw.version === undefined) {
    return { valid: false, error: 'version is required to amend a finalized assessment' };
  }

  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return { valid: false, error: 'version must be a positive integer' };
  }

  return {
    valid: true,
    data: {
      reason: raw.reason as AmendmentReason,
      text: raw.text.trim(),
      version: raw.version,
    },
  };
}
