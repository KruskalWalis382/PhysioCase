/**
 * ============================================================================
 * PHYSIOCASE — PART B-3: PATIENT DOMAIN SCHEMAS & VALIDATION
 * ============================================================================
 */

import type { PatientSafetyProfile } from '../../types';

export interface CreatePatientInput {
  fullName: string;
  dateOfBirth: string;
  reasonForVisit: string;
  sex?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'discharged';
  patientSafetyProfile?: PatientSafetyProfile;
}

export interface UpdatePatientInput {
  fullName?: string;
  dateOfBirth?: string;
  reasonForVisit?: string;
  sex?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'discharged';
  patientSafetyProfile?: PatientSafetyProfile;
  version?: number;
}

export interface ListPatientsQuery {
  search?: string;
  status?: 'active' | 'discharged';
  limit?: number;
  offset?: number;
}

const DISALLOWED_PATIENT_FIELDS = [
  'id',
  'workspaceId',
  'workspace_id',
  'patientNumber',
  'patient_number',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
];

export function validateCreatePatient(body: unknown): { valid: true; data: CreatePatientInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  // Check for disallowed override fields
  for (const field of DISALLOWED_PATIENT_FIELDS) {
    if (raw[field] !== undefined) {
      return { valid: false, error: `Field '${field}' cannot be provided by client` };
    }
  }

  const fullName = typeof raw.fullName === 'string' ? raw.fullName.trim() : '';
  const dateOfBirth = typeof raw.dateOfBirth === 'string' ? raw.dateOfBirth.trim() : '';
  const reasonForVisit = typeof raw.reasonForVisit === 'string' ? raw.reasonForVisit.trim() : '';

  if (!fullName) {
    return { valid: false, error: 'fullName is required and must not be empty' };
  }
  if (!dateOfBirth) {
    return { valid: false, error: 'dateOfBirth is required and must not be empty' };
  }
  if (!reasonForVisit) {
    return { valid: false, error: 'reasonForVisit is required and must not be empty' };
  }

  let status: 'active' | 'discharged' = 'active';
  if (raw.status !== undefined) {
    if (raw.status !== 'active' && raw.status !== 'discharged') {
      return { valid: false, error: "status must be either 'active' or 'discharged'" };
    }
    status = raw.status;
  }

  return {
    valid: true,
    data: {
      fullName,
      dateOfBirth,
      reasonForVisit,
      sex: typeof raw.sex === 'string' ? raw.sex.trim() : undefined,
      phone: typeof raw.phone === 'string' ? raw.phone.trim() : undefined,
      email: typeof raw.email === 'string' ? raw.email.trim() : undefined,
      status,
      patientSafetyProfile: raw.patientSafetyProfile && typeof raw.patientSafetyProfile === 'object'
        ? (raw.patientSafetyProfile as PatientSafetyProfile)
        : undefined,
    },
  };
}

export function validateUpdatePatient(body: unknown): { valid: true; data: UpdatePatientInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  for (const field of DISALLOWED_PATIENT_FIELDS) {
    if (raw[field] !== undefined) {
      return { valid: false, error: `Field '${field}' cannot be updated by client` };
    }
  }

  const data: UpdatePatientInput = {};

  if (raw.fullName !== undefined) {
    if (typeof raw.fullName !== 'string' || !raw.fullName.trim()) {
      return { valid: false, error: 'fullName must be a non-empty string' };
    }
    data.fullName = raw.fullName.trim();
  }

  if (raw.dateOfBirth !== undefined) {
    if (typeof raw.dateOfBirth !== 'string' || !raw.dateOfBirth.trim()) {
      return { valid: false, error: 'dateOfBirth must be a non-empty string' };
    }
    data.dateOfBirth = raw.dateOfBirth.trim();
  }

  if (raw.reasonForVisit !== undefined) {
    if (typeof raw.reasonForVisit !== 'string' || !raw.reasonForVisit.trim()) {
      return { valid: false, error: 'reasonForVisit must be a non-empty string' };
    }
    data.reasonForVisit = raw.reasonForVisit.trim();
  }

  if (raw.sex !== undefined) {
    data.sex = typeof raw.sex === 'string' ? raw.sex.trim() : '';
  }

  if (raw.phone !== undefined) {
    data.phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  }

  if (raw.email !== undefined) {
    data.email = typeof raw.email === 'string' ? raw.email.trim() : '';
  }

  if (raw.status !== undefined) {
    if (raw.status !== 'active' && raw.status !== 'discharged') {
      return { valid: false, error: "status must be either 'active' or 'discharged'" };
    }
    data.status = raw.status;
  }

  if (raw.patientSafetyProfile !== undefined) {
    if (typeof raw.patientSafetyProfile !== 'object' || raw.patientSafetyProfile === null) {
      return { valid: false, error: 'patientSafetyProfile must be an object' };
    }
    data.patientSafetyProfile = raw.patientSafetyProfile as PatientSafetyProfile;
  }

  if (raw.version !== undefined) {
    if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
      return { valid: false, error: 'version must be a positive integer' };
    }
    data.version = raw.version;
  }

  return { valid: true, data };
}
