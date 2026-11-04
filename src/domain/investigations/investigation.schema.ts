/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: CLINICAL INVESTIGATION SCHEMAS & VALIDATION
 * ============================================================================
 */

import type {
  InvestigationCategory,
  RadiologicalModality,
  InvestigationAttachment,
} from '../../types';

export const VALID_INVESTIGATION_CATEGORIES: InvestigationCategory[] = [
  'radiological',
];

export const VALID_RADIOLOGICAL_MODALITIES: RadiologicalModality[] = [
  'xray',
  'mri',
  'ct',
  'ultrasound',
  'other',
];

export interface CreateInvestigationInput {
  category?: InvestigationCategory;
  modality: RadiologicalModality;
  name: string;
  bodyRegion: string;
  investigationDate: string;
  indication?: string;
  findings?: string;
  impression?: string;
  sourceType?: string;
  sourceName?: string;
  clinicianRelevance?: string;
  attachment?: InvestigationAttachment;
}

export interface UpdateInvestigationInput {
  version: number;
  category?: InvestigationCategory;
  modality?: RadiologicalModality;
  name?: string;
  bodyRegion?: string;
  investigationDate?: string;
  indication?: string;
  findings?: string;
  impression?: string;
  sourceType?: string;
  sourceName?: string;
  clinicianRelevance?: string;
  attachment?: InvestigationAttachment;
}

export interface ArchiveInvestigationInput {
  reason: string;
}

const DISALLOWED_CLIENT_OVERRIDE_FIELDS = [
  'id',
  'workspaceId',
  'workspace_id',
  'caseId',
  'case_id',
  'patientId',
  'patient_id',
  'isArchived',
  'is_archived',
  'archivedAt',
  'archived_at',
  'archivedBy',
  'archived_by',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateCreateInvestigation(body: unknown):
  | { valid: true; data: CreateInvestigationInput }
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

  // category: optional, defaults to 'radiological', but if provided must be 'radiological'
  if (raw.category !== undefined && raw.category !== 'radiological') {
    return { valid: false, error: `category must be 'radiological'` };
  }

  // modality: required
  if (typeof raw.modality !== 'string' || !VALID_RADIOLOGICAL_MODALITIES.includes(raw.modality as RadiologicalModality)) {
    return {
      valid: false,
      error: `modality is required and must be one of: ${VALID_RADIOLOGICAL_MODALITIES.join(', ')}`,
    };
  }

  // name: required
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    return { valid: false, error: 'name is required and cannot be empty' };
  }
  if (raw.name.trim().length > 255) {
    return { valid: false, error: 'name exceeds maximum length of 255 characters' };
  }

  // bodyRegion: required
  if (typeof raw.bodyRegion !== 'string' || raw.bodyRegion.trim().length === 0) {
    return { valid: false, error: 'bodyRegion is required and cannot be empty' };
  }
  if (raw.bodyRegion.trim().length > 255) {
    return { valid: false, error: 'bodyRegion exceeds maximum length of 255 characters' };
  }

  // investigationDate: required
  if (typeof raw.investigationDate !== 'string' || !DATE_REGEX.test(raw.investigationDate.trim())) {
    return { valid: false, error: 'investigationDate is required and must be in YYYY-MM-DD format' };
  }

  return {
    valid: true,
    data: {
      category: (raw.category as InvestigationCategory) || 'radiological',
      modality: raw.modality as RadiologicalModality,
      name: raw.name.trim(),
      bodyRegion: raw.bodyRegion.trim(),
      investigationDate: raw.investigationDate.trim(),
      indication: typeof raw.indication === 'string' ? raw.indication : undefined,
      findings: typeof raw.findings === 'string' ? raw.findings : undefined,
      impression: typeof raw.impression === 'string' ? raw.impression : undefined,
      sourceType: typeof raw.sourceType === 'string' ? raw.sourceType : undefined,
      sourceName: typeof raw.sourceName === 'string' ? raw.sourceName : undefined,
      clinicianRelevance: typeof raw.clinicianRelevance === 'string' ? raw.clinicianRelevance : undefined,
      attachment: typeof raw.attachment === 'object' && raw.attachment !== null ? (raw.attachment as InvestigationAttachment) : undefined,
    },
  };
}

export function validateUpdateInvestigation(body: unknown):
  | { valid: true; data: UpdateInvestigationInput }
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

  // version: required integer >= 1
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return { valid: false, error: 'version is required and must be a positive integer for optimistic concurrency' };
  }

  if (raw.category !== undefined && raw.category !== 'radiological') {
    return { valid: false, error: `category must be 'radiological'` };
  }

  if (raw.modality !== undefined && (typeof raw.modality !== 'string' || !VALID_RADIOLOGICAL_MODALITIES.includes(raw.modality as RadiologicalModality))) {
    return {
      valid: false,
      error: `modality must be one of: ${VALID_RADIOLOGICAL_MODALITIES.join(', ')}`,
    };
  }

  if (raw.name !== undefined) {
    if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
      return { valid: false, error: 'name cannot be empty' };
    }
    if (raw.name.trim().length > 255) {
      return { valid: false, error: 'name exceeds maximum length of 255 characters' };
    }
  }

  if (raw.bodyRegion !== undefined) {
    if (typeof raw.bodyRegion !== 'string' || raw.bodyRegion.trim().length === 0) {
      return { valid: false, error: 'bodyRegion cannot be empty' };
    }
    if (raw.bodyRegion.trim().length > 255) {
      return { valid: false, error: 'bodyRegion exceeds maximum length of 255 characters' };
    }
  }

  if (raw.investigationDate !== undefined) {
    if (typeof raw.investigationDate !== 'string' || !DATE_REGEX.test(raw.investigationDate.trim())) {
      return { valid: false, error: 'investigationDate must be in YYYY-MM-DD format' };
    }
  }

  return {
    valid: true,
    data: {
      version: raw.version,
      category: raw.category as InvestigationCategory | undefined,
      modality: raw.modality as RadiologicalModality | undefined,
      name: typeof raw.name === 'string' ? raw.name.trim() : undefined,
      bodyRegion: typeof raw.bodyRegion === 'string' ? raw.bodyRegion.trim() : undefined,
      investigationDate: typeof raw.investigationDate === 'string' ? raw.investigationDate.trim() : undefined,
      indication: typeof raw.indication === 'string' ? raw.indication : undefined,
      findings: typeof raw.findings === 'string' ? raw.findings : undefined,
      impression: typeof raw.impression === 'string' ? raw.impression : undefined,
      sourceType: typeof raw.sourceType === 'string' ? raw.sourceType : undefined,
      sourceName: typeof raw.sourceName === 'string' ? raw.sourceName : undefined,
      clinicianRelevance: typeof raw.clinicianRelevance === 'string' ? raw.clinicianRelevance : undefined,
      attachment: typeof raw.attachment === 'object' && raw.attachment !== null ? (raw.attachment as InvestigationAttachment) : undefined,
    },
  };
}

export function validateArchiveInvestigation(body: unknown):
  | { valid: true; data: ArchiveInvestigationInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.reason !== 'string' || raw.reason.trim().length === 0) {
    return { valid: false, error: 'reason is required and cannot be empty when archiving an investigation' };
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
