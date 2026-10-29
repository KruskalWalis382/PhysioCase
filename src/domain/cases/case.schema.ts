/**
 * ============================================================================
 * PHYSIOCASE — PART B-3: CASE DOMAIN SCHEMAS & VALIDATION
 * ============================================================================
 */

import type { CaseStatus, CaseStage, CaseArchiveReason } from '../../types';

export const VALID_CASE_STATUSES: CaseStatus[] = [
  'Assessment',
  'Treatment',
  'Reassessment',
  'Discharged',
];

export const VALID_CASE_STAGES: CaseStage[] = [
  'assessment',
  'treatment',
  'reassessment',
  'discharged',
];

export const VALID_ARCHIVE_REASONS: CaseArchiveReason[] = [
  'created_in_error',
  'duplicate_entry',
  'wrong_patient',
  'test_or_demo',
  'care_discontinued_uncontactable',
  'care_transferred_external',
  'administrative_closure',
  'clinical_hold_inactive',
];

export interface CreateCaseInput {
  patientId: string;
  caseName: string;
  presentingProblem?: string;
  dateOfOnset?: string;
  referralSource?: string;
  startDate?: string;
  status?: CaseStatus;
  bodyRegion?: string;
}

export interface UpdateCaseInput {
  caseName?: string;
  presentingProblem?: string;
  dateOfOnset?: string;
  referralSource?: string;
  startDate?: string;
  status?: CaseStatus;
  stage?: CaseStage;
  lastSessionDate?: string;
  nextReviewDate?: string;
  title?: string;
  patientName?: string;
  bodyRegion?: string;
  version?: number;
}

export interface ArchiveCaseInput {
  reason: CaseArchiveReason;
  notes?: string;
}

export interface UnarchiveCaseInput {
  reason: string;
}

export interface ListCasesQuery {
  patientId?: string;
  status?: CaseStatus;
  isArchived?: boolean;
  limit?: number;
  offset?: number;
}

const DISALLOWED_CASE_CREATE_FIELDS = [
  'id',
  'workspaceId',
  'workspace_id',
  'caseId',
  'case_id',
  'isArchived',
  'is_archived',
  'archivedAt',
  'archived_at',
  'archivedBy',
  'archived_by',
  'archiveReason',
  'archive_reason',
  'archiveNotes',
  'archive_notes',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
  'version',
];

const DISALLOWED_CASE_UPDATE_FIELDS = [
  ...DISALLOWED_CASE_CREATE_FIELDS,
  'patientId',
  'patient_id', // Reassignment prohibited
];

export function validateCreateCase(body: unknown): { valid: true; data: CreateCaseInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  for (const field of DISALLOWED_CASE_CREATE_FIELDS) {
    if (raw[field] !== undefined) {
      return { valid: false, error: `Field '${field}' cannot be provided by client` };
    }
  }

  const patientId = typeof raw.patientId === 'string' ? raw.patientId.trim() : '';
  const caseName = typeof raw.caseName === 'string' ? raw.caseName.trim() : '';

  if (!patientId) {
    return { valid: false, error: 'patientId is required and must not be empty' };
  }
  if (!caseName) {
    return { valid: false, error: 'caseName is required and must not be empty' };
  }

  let status: CaseStatus = 'Assessment';
  if (raw.status !== undefined) {
    if (!VALID_CASE_STATUSES.includes(raw.status as CaseStatus)) {
      return { valid: false, error: `Invalid status '${raw.status}'. Allowed: ${VALID_CASE_STATUSES.join(', ')}` };
    }
    status = raw.status as CaseStatus;
  }

  return {
    valid: true,
    data: {
      patientId,
      caseName,
      presentingProblem: typeof raw.presentingProblem === 'string' ? raw.presentingProblem.trim() : undefined,
      dateOfOnset: typeof raw.dateOfOnset === 'string' ? raw.dateOfOnset.trim() : undefined,
      referralSource: typeof raw.referralSource === 'string' ? raw.referralSource.trim() : undefined,
      startDate: typeof raw.startDate === 'string' ? raw.startDate.trim() : undefined,
      status,
      bodyRegion: typeof raw.bodyRegion === 'string' ? raw.bodyRegion.trim() : undefined,
    },
  };
}

export function validateUpdateCase(body: unknown): { valid: true; data: UpdateCaseInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  for (const field of DISALLOWED_CASE_UPDATE_FIELDS) {
    if (raw[field] !== undefined) {
      return { valid: false, error: `Field '${field}' cannot be updated by client` };
    }
  }

  const data: UpdateCaseInput = {};

  if (raw.caseName !== undefined) {
    if (typeof raw.caseName !== 'string' || !raw.caseName.trim()) {
      return { valid: false, error: 'caseName must be a non-empty string' };
    }
    data.caseName = raw.caseName.trim();
  }

  if (raw.presentingProblem !== undefined) {
    data.presentingProblem = typeof raw.presentingProblem === 'string' ? raw.presentingProblem.trim() : '';
  }

  if (raw.dateOfOnset !== undefined) {
    data.dateOfOnset = typeof raw.dateOfOnset === 'string' ? raw.dateOfOnset.trim() : '';
  }

  if (raw.referralSource !== undefined) {
    data.referralSource = typeof raw.referralSource === 'string' ? raw.referralSource.trim() : '';
  }

  if (raw.startDate !== undefined) {
    if (typeof raw.startDate !== 'string' || !raw.startDate.trim()) {
      return { valid: false, error: 'startDate must be a non-empty string' };
    }
    data.startDate = raw.startDate.trim();
  }

  if (raw.status !== undefined) {
    if (!VALID_CASE_STATUSES.includes(raw.status as CaseStatus)) {
      return { valid: false, error: `Invalid status '${raw.status}'. Allowed: ${VALID_CASE_STATUSES.join(', ')}` };
    }
    data.status = raw.status as CaseStatus;
  }

  if (raw.stage !== undefined) {
    if (!VALID_CASE_STAGES.includes(raw.stage as CaseStage)) {
      return { valid: false, error: `Invalid stage '${raw.stage}'. Allowed: ${VALID_CASE_STAGES.join(', ')}` };
    }
    data.stage = raw.stage as CaseStage;
  }

  // Verify status and stage do not diverge if both are provided
  if (data.status && data.stage) {
    if (data.stage.toLowerCase() !== data.status.toLowerCase()) {
      return { valid: false, error: `status ('${data.status}') and stage ('${data.stage}') cannot diverge` };
    }
  }

  if (raw.lastSessionDate !== undefined) {
    data.lastSessionDate = typeof raw.lastSessionDate === 'string' ? raw.lastSessionDate.trim() : '';
  }

  if (raw.nextReviewDate !== undefined) {
    data.nextReviewDate = typeof raw.nextReviewDate === 'string' ? raw.nextReviewDate.trim() : '';
  }

  if (raw.title !== undefined) {
    data.title = typeof raw.title === 'string' ? raw.title.trim() : '';
  }

  if (raw.patientName !== undefined) {
    data.patientName = typeof raw.patientName === 'string' ? raw.patientName.trim() : '';
  }

  if (raw.bodyRegion !== undefined) {
    data.bodyRegion = typeof raw.bodyRegion === 'string' ? raw.bodyRegion.trim() : '';
  }

  if (raw.version !== undefined) {
    if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
      return { valid: false, error: 'version must be a positive integer' };
    }
    data.version = raw.version;
  }

  return { valid: true, data };
}

export function validateArchiveCase(body: unknown): { valid: true; data: ArchiveCaseInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  if (!raw.reason || typeof raw.reason !== 'string') {
    return { valid: false, error: 'reason is required' };
  }

  if (!VALID_ARCHIVE_REASONS.includes(raw.reason as CaseArchiveReason)) {
    return {
      valid: false,
      error: `Invalid archive reason '${raw.reason}'. Allowed: ${VALID_ARCHIVE_REASONS.join(', ')}`,
    };
  }

  return {
    valid: true,
    data: {
      reason: raw.reason as CaseArchiveReason,
      notes: typeof raw.notes === 'string' ? raw.notes.trim() : undefined,
    },
  };
}

export function validateUnarchiveCase(body: unknown): { valid: true; data: UnarchiveCaseInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  if (!raw.reason || typeof raw.reason !== 'string' || !raw.reason.trim()) {
    return { valid: false, error: 'Unarchive explanation reason is required and must not be empty' };
  }

  return {
    valid: true,
    data: {
      reason: raw.reason.trim(),
    },
  };
}
