/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: SUBJECTIVE ASSESSMENT SCHEMAS & VALIDATION
 * ============================================================================
 */

import type {
  SubjectiveAssessment,
  AssessmentStatus,
  ClinicalNoteAmendment,
} from '../../types';

export type SubjectiveAssessmentStatus = AssessmentStatus;
export type AmendmentReason = 'correction' | 'late_entry' | 'clinical_update';

export const VALID_SUBJECTIVE_STATUSES: SubjectiveAssessmentStatus[] = [
  'not_started',
  'in_progress',
  'completed',
];

export const VALID_AMENDMENT_REASONS: AmendmentReason[] = [
  'correction',
  'late_entry',
  'clinical_update',
];

export interface SaveSubjectiveInput {
  patientStory?: string;
  symptomLocations?: any[];
  symptomDescriptions?: string[];
  symptomDescriptionOther?: string;
  onset?: string;
  dateOfOnset?: string;
  howDidItStart?: string;
  aggravatingFactors?: string[];
  aggravatingFactorsNotes?: string;
  easingFactors?: string[];
  easingFactorsNotes?: string;
  frequency?: string;
  painSeverity?: {
    current: number;
    best: number;
    worst: number;
  };
  durationAfterAggravation?: string;
  functionalDifficulties?: string[];
  functionalDifficultiesNotes?: string;
  mostImportantActivity?: string;
  previousSimilarEpisode?: string;
  previousSurgery?: string;
  previousInjury?: string;
  currentMedication?: string;
  relevantConditions?: string;
  previousPhysiotherapy?: string;
  safetyScreening?: string;
  safetyScreeningDetails?: string;
  patientGoals?: string;
  therapistInitialNotes?: string;
  markCompleted?: boolean;
  version?: number;
}

export interface FinalizeSubjectiveInput {
  version: number;
}

export interface AmendSubjectiveInput {
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

export function validateSaveSubjective(body: unknown): 
  | { valid: true; data: SaveSubjectiveInput }
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

  // Validate pain severity if provided
  if (raw.painSeverity !== undefined) {
    if (typeof raw.painSeverity !== 'object' || raw.painSeverity === null) {
      return { valid: false, error: 'painSeverity must be an object with current, best, and worst ratings' };
    }
    const ps = raw.painSeverity as any;
    for (const key of ['current', 'best', 'worst'] as const) {
      const val = ps[key];
      if (typeof val !== 'number' || val < 0 || val > 10) {
        return { valid: false, error: `painSeverity.${key} must be a number between 0 and 10` };
      }
    }
  }

  // Validate version if provided
  if (raw.version !== undefined) {
    if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
      return { valid: false, error: 'version must be a positive integer' };
    }
  }

  return {
    valid: true,
    data: {
      patientStory: typeof raw.patientStory === 'string' ? raw.patientStory : undefined,
      symptomLocations: Array.isArray(raw.symptomLocations) ? raw.symptomLocations : undefined,
      symptomDescriptions: Array.isArray(raw.symptomDescriptions) ? raw.symptomDescriptions.map(String) : undefined,
      symptomDescriptionOther: typeof raw.symptomDescriptionOther === 'string' ? raw.symptomDescriptionOther : undefined,
      onset: typeof raw.onset === 'string' ? raw.onset : undefined,
      dateOfOnset: typeof raw.dateOfOnset === 'string' ? raw.dateOfOnset : undefined,
      howDidItStart: typeof raw.howDidItStart === 'string' ? raw.howDidItStart : undefined,
      aggravatingFactors: Array.isArray(raw.aggravatingFactors) ? raw.aggravatingFactors.map(String) : undefined,
      aggravatingFactorsNotes: typeof raw.aggravatingFactorsNotes === 'string' ? raw.aggravatingFactorsNotes : undefined,
      easingFactors: Array.isArray(raw.easingFactors) ? raw.easingFactors.map(String) : undefined,
      easingFactorsNotes: typeof raw.easingFactorsNotes === 'string' ? raw.easingFactorsNotes : undefined,
      frequency: typeof raw.frequency === 'string' ? raw.frequency : undefined,
      painSeverity: raw.painSeverity ? (raw.painSeverity as any) : undefined,
      durationAfterAggravation: typeof raw.durationAfterAggravation === 'string' ? raw.durationAfterAggravation : undefined,
      functionalDifficulties: Array.isArray(raw.functionalDifficulties) ? raw.functionalDifficulties.map(String) : undefined,
      functionalDifficultiesNotes: typeof raw.functionalDifficultiesNotes === 'string' ? raw.functionalDifficultiesNotes : undefined,
      mostImportantActivity: typeof raw.mostImportantActivity === 'string' ? raw.mostImportantActivity : undefined,
      previousSimilarEpisode: typeof raw.previousSimilarEpisode === 'string' ? raw.previousSimilarEpisode : undefined,
      previousSurgery: typeof raw.previousSurgery === 'string' ? raw.previousSurgery : undefined,
      previousInjury: typeof raw.previousInjury === 'string' ? raw.previousInjury : undefined,
      currentMedication: typeof raw.currentMedication === 'string' ? raw.currentMedication : undefined,
      relevantConditions: typeof raw.relevantConditions === 'string' ? raw.relevantConditions : undefined,
      previousPhysiotherapy: typeof raw.previousPhysiotherapy === 'string' ? raw.previousPhysiotherapy : undefined,
      safetyScreening: typeof raw.safetyScreening === 'string' ? raw.safetyScreening : undefined,
      safetyScreeningDetails: typeof raw.safetyScreeningDetails === 'string' ? raw.safetyScreeningDetails : undefined,
      patientGoals: typeof raw.patientGoals === 'string' ? raw.patientGoals : undefined,
      therapistInitialNotes: typeof raw.therapistInitialNotes === 'string' ? raw.therapistInitialNotes : undefined,
      markCompleted: typeof raw.markCompleted === 'boolean' ? raw.markCompleted : undefined,
      version: raw.version as number | undefined,
    },
  };
}

export function validateFinalizeSubjective(body: unknown):
  | { valid: true; data: FinalizeSubjectiveInput }
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

export function validateAmendSubjective(body: unknown):
  | { valid: true; data: AmendSubjectiveInput }
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
