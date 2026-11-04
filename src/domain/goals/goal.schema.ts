/**
 * ============================================================================
 * PHYSIOCASE — PART B-6: CLINICAL GOAL SCHEMAS & VALIDATION
 * ============================================================================
 */

import type { ClinicalGoalStatus, ClinicalGoalType } from '../../types';

export const VALID_GOAL_STATUSES: ClinicalGoalStatus[] = [
  'active',
  'met',
  'partially_met',
  'not_met',
  'discontinued',
];

export const VALID_GOAL_TYPES: ClinicalGoalType[] = [
  'short_term',
  'long_term',
];

export interface CreateGoalInput {
  title: string;
  type: ClinicalGoalType;
  description?: string;
  linkedProblemIds?: string[];
  targetValue?: string;
  targetDate?: string;
  status?: ClinicalGoalStatus;
  therapistNotes?: string;
}

export interface UpdateGoalInput {
  version: number;
  title?: string;
  type?: ClinicalGoalType;
  description?: string | null;
  linkedProblemIds?: string[];
  targetValue?: string | null;
  targetDate?: string | null;
  status?: ClinicalGoalStatus;
  therapistNotes?: string | null;
}

export interface ArchiveGoalInput {
  reason: string;
}

export interface ListGoalsQuery {
  status?: ClinicalGoalStatus;
  type?: ClinicalGoalType;
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
  'achievedAt',
  'achieved_at',
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

export function validateCreateGoal(body: unknown):
  | { valid: true; data: CreateGoalInput }
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

  // type: optional on create? Defaults to 'short_term' if omitted, or required if provided
  let validatedType: ClinicalGoalType = 'short_term';
  if (raw.type !== undefined) {
    if (typeof raw.type !== 'string' || !VALID_GOAL_TYPES.includes(raw.type as ClinicalGoalType)) {
      return {
        valid: false,
        error: `type must be one of: ${VALID_GOAL_TYPES.join(', ')}`,
      };
    }
    validatedType = raw.type as ClinicalGoalType;
  }

  // description: optional string
  if (raw.description !== undefined && raw.description !== null && typeof raw.description !== 'string') {
    return { valid: false, error: 'description must be a string' };
  }

  // status: optional, defaults to 'active', but if provided must be valid
  if (raw.status !== undefined) {
    if (typeof raw.status !== 'string' || !VALID_GOAL_STATUSES.includes(raw.status as ClinicalGoalStatus)) {
      return {
        valid: false,
        error: `status must be one of: ${VALID_GOAL_STATUSES.join(', ')}`,
      };
    }
  }

  // linkedProblemIds: optional string[]
  if (raw.linkedProblemIds !== undefined) {
    if (!Array.isArray(raw.linkedProblemIds) || raw.linkedProblemIds.some((id) => typeof id !== 'string' || !id.trim())) {
      return { valid: false, error: 'linkedProblemIds must be an array of non-empty string UUIDs' };
    }
  }

  // targetValue: optional string
  if (raw.targetValue !== undefined && raw.targetValue !== null && typeof raw.targetValue !== 'string') {
    return { valid: false, error: 'targetValue must be a string' };
  }

  // targetDate: optional string
  if (raw.targetDate !== undefined && raw.targetDate !== null && typeof raw.targetDate !== 'string') {
    return { valid: false, error: 'targetDate must be a string' };
  }

  // therapistNotes: optional string
  if (raw.therapistNotes !== undefined && raw.therapistNotes !== null && typeof raw.therapistNotes !== 'string') {
    return { valid: false, error: 'therapistNotes must be a string' };
  }

  return {
    valid: true,
    data: {
      title: raw.title.trim(),
      type: validatedType,
      description: typeof raw.description === 'string' ? raw.description.trim() || undefined : undefined,
      status: (raw.status as ClinicalGoalStatus) || 'active',
      linkedProblemIds: Array.isArray(raw.linkedProblemIds)
        ? Array.from(new Set(raw.linkedProblemIds.map((id) => String(id).trim())))
        : undefined,
      targetValue: typeof raw.targetValue === 'string' ? raw.targetValue.trim() || undefined : undefined,
      targetDate: typeof raw.targetDate === 'string' ? raw.targetDate.trim() || undefined : undefined,
      therapistNotes: typeof raw.therapistNotes === 'string' ? raw.therapistNotes.trim() || undefined : undefined,
    },
  };
}

export function validateUpdateGoal(body: unknown):
  | { valid: true; data: UpdateGoalInput }
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

  // type: optional valid type
  if (raw.type !== undefined) {
    if (typeof raw.type !== 'string' || !VALID_GOAL_TYPES.includes(raw.type as ClinicalGoalType)) {
      return {
        valid: false,
        error: `type must be one of: ${VALID_GOAL_TYPES.join(', ')}`,
      };
    }
  }

  // description: optional string or null (null or empty string clears)
  if (raw.description !== undefined && raw.description !== null && typeof raw.description !== 'string') {
    return { valid: false, error: 'description must be a string or null' };
  }

  // status: optional valid status
  if (raw.status !== undefined) {
    if (typeof raw.status !== 'string' || !VALID_GOAL_STATUSES.includes(raw.status as ClinicalGoalStatus)) {
      return {
        valid: false,
        error: `status must be one of: ${VALID_GOAL_STATUSES.join(', ')}`,
      };
    }
  }

  // linkedProblemIds: optional string[]
  if (raw.linkedProblemIds !== undefined) {
    if (!Array.isArray(raw.linkedProblemIds) || raw.linkedProblemIds.some((id) => typeof id !== 'string' || !id.trim())) {
      return { valid: false, error: 'linkedProblemIds must be an array of non-empty string UUIDs' };
    }
  }

  // targetValue: optional string or null
  if (raw.targetValue !== undefined && raw.targetValue !== null && typeof raw.targetValue !== 'string') {
    return { valid: false, error: 'targetValue must be a string or null' };
  }

  // targetDate: optional string or null
  if (raw.targetDate !== undefined && raw.targetDate !== null && typeof raw.targetDate !== 'string') {
    return { valid: false, error: 'targetDate must be a string or null' };
  }

  // therapistNotes: optional string or null
  if (raw.therapistNotes !== undefined && raw.therapistNotes !== null && typeof raw.therapistNotes !== 'string') {
    return { valid: false, error: 'therapistNotes must be a string or null' };
  }

  const result: UpdateGoalInput = {
    version: raw.version,
  };

  if (raw.title !== undefined) {
    result.title = (raw.title as string).trim();
  }
  if (raw.type !== undefined) {
    result.type = raw.type as ClinicalGoalType;
  }
  if (raw.description !== undefined) {
    result.description = raw.description === null || (raw.description as string).trim() === ''
      ? null
      : (raw.description as string).trim();
  }
  if (raw.status !== undefined) {
    result.status = raw.status as ClinicalGoalStatus;
  }
  if (raw.linkedProblemIds !== undefined) {
    result.linkedProblemIds = Array.from(new Set((raw.linkedProblemIds as string[]).map((id) => String(id).trim())));
  }
  if (raw.targetValue !== undefined) {
    result.targetValue = raw.targetValue === null || (raw.targetValue as string).trim() === ''
      ? null
      : (raw.targetValue as string).trim();
  }
  if (raw.targetDate !== undefined) {
    result.targetDate = raw.targetDate === null || (raw.targetDate as string).trim() === ''
      ? null
      : (raw.targetDate as string).trim();
  }
  if (raw.therapistNotes !== undefined) {
    result.therapistNotes = raw.therapistNotes === null || (raw.therapistNotes as string).trim() === ''
      ? null
      : (raw.therapistNotes as string).trim();
  }

  return { valid: true, data: result };
}

export function validateArchiveGoal(body: unknown):
  | { valid: true; data: ArchiveGoalInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.reason !== 'string' || raw.reason.trim().length === 0) {
    return { valid: false, error: 'reason is required for archival and cannot be empty' };
  }

  return {
    valid: true,
    data: {
      reason: raw.reason.trim(),
    },
  };
}

export function validateListGoalsQuery(query: Record<string, unknown>):
  | { valid: true; data: ListGoalsQuery }
  | { valid: false; error: string } {
  const result: ListGoalsQuery = {};

  if (query.status !== undefined) {
    if (typeof query.status !== 'string' || !VALID_GOAL_STATUSES.includes(query.status as ClinicalGoalStatus)) {
      return {
        valid: false,
        error: `status filter must be one of: ${VALID_GOAL_STATUSES.join(', ')}`,
      };
    }
    result.status = query.status as ClinicalGoalStatus;
  }

  if (query.type !== undefined) {
    if (typeof query.type !== 'string' || !VALID_GOAL_TYPES.includes(query.type as ClinicalGoalType)) {
      return {
        valid: false,
        error: `type filter must be one of: ${VALID_GOAL_TYPES.join(', ')}`,
      };
    }
    result.type = query.type as ClinicalGoalType;
  }

  if (query.includeArchived !== undefined) {
    result.includeArchived = query.includeArchived === 'true' || query.includeArchived === true;
  }

  return { valid: true, data: result };
}
