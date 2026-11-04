/**
 * ============================================================================
 * PHYSIOCASE — PART B-5: CLINICAL PROBLEM SCHEMAS & VALIDATION
 * ============================================================================
 */

import type { ClinicalProblemStatus } from '../../types';

export const VALID_PROBLEM_STATUSES: ClinicalProblemStatus[] = [
  'active',
  'addressed',
  'resolved',
  'inactive',
];

export interface CreateProblemInput {
  title: string;
  description?: string;
  linkedFindingIds?: string[];
  linkedInvestigationIds?: string[];
  status?: ClinicalProblemStatus;
  therapistNotes?: string;
}

export interface UpdateProblemInput {
  version: number;
  title?: string;
  description?: string;
  linkedFindingIds?: string[];
  linkedInvestigationIds?: string[];
  status?: ClinicalProblemStatus;
  therapistNotes?: string;
}

export interface ArchiveProblemInput {
  reason: string;
}

export interface ListProblemsQuery {
  status?: ClinicalProblemStatus;
  includeArchived?: boolean;
}

const DISALLOWED_CLIENT_OVERRIDE_FIELDS = [
  'id',
  'workspaceId',
  'workspace_id',
  'caseId',
  'case_id',
  'patientId',
  'patient_id',
  'resolvedAt',
  'resolved_at',
  'isArchived',
  'is_archived',
  'archivedAt',
  'archived_at',
  'archivedBy',
  'archived_by',
  'archiveReason',
  'archive_reason',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
];

export function validateCreateProblem(body: unknown):
  | { valid: true; data: CreateProblemInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  for (const field of DISALLOWED_CLIENT_OVERRIDE_FIELDS) {
    if (raw[field] !== undefined) {
      return { valid: false, error: `Disallowed client-supplied field: '${field}' cannot be directly provided by client` };
    }
  }

  // version is server-managed on create
  if (raw.version !== undefined) {
    return { valid: false, error: "Field 'version' cannot be directly provided during creation" };
  }

  // title: required non-empty string
  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    return { valid: false, error: 'title is required and cannot be empty' };
  }
  if (raw.title.trim().length > 500) {
    return { valid: false, error: 'title exceeds maximum length of 500 characters' };
  }

  // description: optional string
  if (raw.description !== undefined && typeof raw.description !== 'string') {
    return { valid: false, error: 'description must be a string' };
  }

  // status: optional, defaults to 'active', but if provided must be valid
  if (raw.status !== undefined) {
    if (typeof raw.status !== 'string' || !VALID_PROBLEM_STATUSES.includes(raw.status as ClinicalProblemStatus)) {
      return {
        valid: false,
        error: `status must be one of: ${VALID_PROBLEM_STATUSES.join(', ')}`,
      };
    }
  }

  // linkedFindingIds: optional string[]
  if (raw.linkedFindingIds !== undefined) {
    if (!Array.isArray(raw.linkedFindingIds) || raw.linkedFindingIds.some((id) => typeof id !== 'string' || !id.trim())) {
      return { valid: false, error: 'linkedFindingIds must be an array of non-empty string UUIDs' };
    }
  }

  // linkedInvestigationIds: optional string[]
  if (raw.linkedInvestigationIds !== undefined) {
    if (!Array.isArray(raw.linkedInvestigationIds) || raw.linkedInvestigationIds.some((id) => typeof id !== 'string' || !id.trim())) {
      return { valid: false, error: 'linkedInvestigationIds must be an array of non-empty string UUIDs' };
    }
  }

  // therapistNotes: optional string
  if (raw.therapistNotes !== undefined && typeof raw.therapistNotes !== 'string') {
    return { valid: false, error: 'therapistNotes must be a string' };
  }

  return {
    valid: true,
    data: {
      title: raw.title.trim(),
      description: typeof raw.description === 'string' ? raw.description.trim() : undefined,
      status: (raw.status as ClinicalProblemStatus) || 'active',
      linkedFindingIds: Array.isArray(raw.linkedFindingIds) ? raw.linkedFindingIds.map((id) => String(id).trim()) : undefined,
      linkedInvestigationIds: Array.isArray(raw.linkedInvestigationIds) ? raw.linkedInvestigationIds.map((id) => String(id).trim()) : undefined,
      therapistNotes: typeof raw.therapistNotes === 'string' ? raw.therapistNotes.trim() : undefined,
    },
  };
}

export function validateUpdateProblem(body: unknown):
  | { valid: true; data: UpdateProblemInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  for (const field of DISALLOWED_CLIENT_OVERRIDE_FIELDS) {
    if (raw[field] !== undefined) {
      return { valid: false, error: `Disallowed client-supplied field: '${field}' cannot be directly provided by client` };
    }
  }

  // version: required positive integer
  if (raw.version === undefined) {
    return { valid: false, error: 'version is required for optimistic concurrency' };
  }
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return { valid: false, error: 'version must be a positive integer' };
  }

  // title: optional string, but cannot be empty if provided
  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
      return { valid: false, error: 'title cannot be empty' };
    }
    if (raw.title.trim().length > 500) {
      return { valid: false, error: 'title exceeds maximum length of 500 characters' };
    }
  }

  // description: optional string
  if (raw.description !== undefined && typeof raw.description !== 'string') {
    return { valid: false, error: 'description must be a string' };
  }

  // status: optional valid status
  if (raw.status !== undefined) {
    if (typeof raw.status !== 'string' || !VALID_PROBLEM_STATUSES.includes(raw.status as ClinicalProblemStatus)) {
      return {
        valid: false,
        error: `status must be one of: ${VALID_PROBLEM_STATUSES.join(', ')}`,
      };
    }
  }

  // linkedFindingIds: optional string[]
  if (raw.linkedFindingIds !== undefined) {
    if (!Array.isArray(raw.linkedFindingIds) || raw.linkedFindingIds.some((id) => typeof id !== 'string' || !id.trim())) {
      return { valid: false, error: 'linkedFindingIds must be an array of non-empty string UUIDs' };
    }
  }

  // linkedInvestigationIds: optional string[]
  if (raw.linkedInvestigationIds !== undefined) {
    if (!Array.isArray(raw.linkedInvestigationIds) || raw.linkedInvestigationIds.some((id) => typeof id !== 'string' || !id.trim())) {
      return { valid: false, error: 'linkedInvestigationIds must be an array of non-empty string UUIDs' };
    }
  }

  // therapistNotes: optional string
  if (raw.therapistNotes !== undefined && typeof raw.therapistNotes !== 'string') {
    return { valid: false, error: 'therapistNotes must be a string' };
  }

  return {
    valid: true,
    data: {
      version: raw.version,
      title: typeof raw.title === 'string' ? raw.title.trim() : undefined,
      description: typeof raw.description === 'string' ? raw.description.trim() : undefined,
      status: raw.status as ClinicalProblemStatus | undefined,
      linkedFindingIds: Array.isArray(raw.linkedFindingIds) ? raw.linkedFindingIds.map((id) => String(id).trim()) : undefined,
      linkedInvestigationIds: Array.isArray(raw.linkedInvestigationIds) ? raw.linkedInvestigationIds.map((id) => String(id).trim()) : undefined,
      therapistNotes: typeof raw.therapistNotes === 'string' ? raw.therapistNotes.trim() : undefined,
    },
  };
}

export function validateArchiveProblem(body: unknown):
  | { valid: true; data: ArchiveProblemInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.reason !== 'string' || raw.reason.trim().length === 0) {
    return { valid: false, error: 'reason is required and cannot be empty when archiving a problem' };
  }

  if (raw.reason.trim().length > 1000) {
    return { valid: false, error: 'reason exceeds maximum length of 1000 characters' };
  }

  return {
    valid: true,
    data: {
      reason: raw.reason.trim(),
    },
  };
}
