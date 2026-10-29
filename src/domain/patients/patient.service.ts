/**
 * ============================================================================
 * PHYSIOCASE — PART B-3: PATIENT DOMAIN SERVICE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../../types/auth';
import type { Patient } from '../../types';
import {
  canPerformClinicalMutation,
  hasActiveMembership,
} from '../../auth/authorization';
import { recordAuditEvent, buildAuditActor } from '../audit/audit.service';
import type {
  CreatePatientInput,
  UpdatePatientInput,
  ListPatientsQuery,
} from './patient.schema';

export interface PatientDbRow {
  id: string;
  workspace_id: string;
  patient_number: string;
  full_name: string;
  date_of_birth: string;
  sex: string | null;
  phone: string | null;
  email: string | null;
  reason_for_visit: string;
  status: 'active' | 'discharged';
  patient_safety_profile: any;
  version: number;
  created_at: string;
  updated_at: string;
}

export function mapPatientRow(row: PatientDbRow): Patient {
  return {
    id: row.id,
    patientNumber: row.patient_number,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    sex: row.sex || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    reasonForVisit: row.reason_for_visit,
    status: row.status,
    patientSafetyProfile: typeof row.patient_safety_profile === 'string'
      ? JSON.parse(row.patient_safety_profile)
      : row.patient_safety_profile || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PatientService {
  constructor(private db: PGlite) {}

  /**
   * Creates a new patient with an atomically allocated PC-XXXX identifier.
   * Requires clinical mutation authority.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async createPatient(
    context: AuthContext,
    input: CreatePatientInput
  ): Promise<Patient> {
    if (!canPerformClinicalMutation(context)) {
      const err: any = new Error('Clinical mutation capability required to create patient');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    await this.db.query('BEGIN');
    try {
      // 1. Allocate next PC-XXXX human ID
      const numRes = await this.db.query<{ allocate_next_human_id: string }>(
        `SELECT allocate_next_human_id($1, 'patient')`,
        [workspaceId]
      );
      const patientNumber = numRes.rows[0].allocate_next_human_id;

      // 2. Insert patient record
      const insertRes = await this.db.query<PatientDbRow>(
        `INSERT INTO patients (
          workspace_id,
          patient_number,
          full_name,
          date_of_birth,
          sex,
          phone,
          email,
          reason_for_visit,
          status,
          patient_safety_profile,
          version,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 1, clock_timestamp(), clock_timestamp()
        ) RETURNING *`,
        [
          workspaceId,
          patientNumber,
          input.fullName,
          input.dateOfBirth,
          input.sex || null,
          input.phone || null,
          input.email || null,
          input.reasonForVisit,
          input.status || 'active',
          JSON.stringify(input.patientSafetyProfile || {}),
        ]
      );

      const createdRow = insertRes.rows[0];

      // 3. Atomically record CREATE audit event
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'CREATE',
        entityType: 'patient',
        entityId: createdRow.id,
        patientId: createdRow.id,
        metadata: {
          patientNumber: createdRow.patient_number,
          fullName: createdRow.full_name,
        },
      });

      await this.db.query('COMMIT');
      return mapPatientRow(createdRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Retrieves a single patient by ID, strictly scoped to the authenticated workspace.
   * Cross-workspace IDs return 404 to avoid information disclosure.
   */
  async getPatientById(context: AuthContext, patientId: string): Promise<Patient> {
    if (!hasActiveMembership(context)) {
      const err: any = new Error('Active workspace membership required');
      err.statusCode = 403;
      throw err;
    }

    const res = await this.db.query<PatientDbRow>(
      `SELECT * FROM patients WHERE id = $1 AND workspace_id = $2`,
      [patientId, context.workspace.id]
    );

    if (res.rows.length === 0) {
      const err: any = new Error('Patient not found');
      err.statusCode = 404;
      throw err;
    }

    return mapPatientRow(res.rows[0]);
  }

  /**
   * Lists patients in the authenticated workspace.
   */
  async listPatients(
    context: AuthContext,
    query?: ListPatientsQuery
  ): Promise<Patient[]> {
    if (!hasActiveMembership(context)) {
      const err: any = new Error('Active workspace membership required');
      err.statusCode = 403;
      throw err;
    }

    const params: any[] = [context.workspace.id];
    let sql = `SELECT * FROM patients WHERE workspace_id = $1`;

    if (query?.status) {
      params.push(query.status);
      sql += ` AND status = $${params.length}`;
    }

    if (query?.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      sql += ` AND (LOWER(full_name) LIKE $${params.length} OR LOWER(patient_number) LIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC`;

    if (query?.limit) {
      params.push(query.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (query?.offset) {
      params.push(query.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const res = await this.db.query<PatientDbRow>(sql, params);
    return res.rows.map(mapPatientRow);
  }

  /**
   * Updates patient demographics or safety profile.
   * Requires clinical mutation authority.
   * Optimistic concurrency check via version.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async updatePatient(
    context: AuthContext,
    patientId: string,
    updates: UpdatePatientInput
  ): Promise<Patient> {
    if (!canPerformClinicalMutation(context)) {
      const err: any = new Error('Clinical mutation capability required to update patient');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    await this.db.query('BEGIN');
    try {
      // 1. Lock existing patient row
      const selectRes = await this.db.query<PatientDbRow>(
        `SELECT * FROM patients WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [patientId, workspaceId]
      );

      if (selectRes.rows.length === 0) {
        const err: any = new Error('Patient not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = selectRes.rows[0];

      // 2. Optimistic concurrency check
      if (updates.version !== undefined && updates.version !== existing.version) {
        const err: any = new Error(
          `Record version conflict: expected version ${existing.version}, got ${updates.version}`
        );
        err.statusCode = 409;
        throw err;
      }

      // 3. Prepare field updates and track changed fields (camelCase convention)
      const changedFields: string[] = [];
      const setClauses: string[] = ['version = version + 1', 'updated_at = clock_timestamp()'];
      const updateParams: any[] = [patientId, workspaceId];

      if (updates.fullName !== undefined && updates.fullName !== existing.full_name) {
        updateParams.push(updates.fullName);
        setClauses.push(`full_name = $${updateParams.length}`);
        changedFields.push('fullName');
      }

      if (updates.dateOfBirth !== undefined && updates.dateOfBirth !== existing.date_of_birth) {
        updateParams.push(updates.dateOfBirth);
        setClauses.push(`date_of_birth = $${updateParams.length}`);
        changedFields.push('dateOfBirth');
      }

      if (updates.reasonForVisit !== undefined && updates.reasonForVisit !== existing.reason_for_visit) {
        updateParams.push(updates.reasonForVisit);
        setClauses.push(`reason_for_visit = $${updateParams.length}`);
        changedFields.push('reasonForVisit');
      }

      if (updates.sex !== undefined && updates.sex !== (existing.sex || '')) {
        updateParams.push(updates.sex || null);
        setClauses.push(`sex = $${updateParams.length}`);
        changedFields.push('sex');
      }

      if (updates.phone !== undefined && updates.phone !== (existing.phone || '')) {
        updateParams.push(updates.phone || null);
        setClauses.push(`phone = $${updateParams.length}`);
        changedFields.push('phone');
      }

      if (updates.email !== undefined && updates.email !== (existing.email || '')) {
        updateParams.push(updates.email || null);
        setClauses.push(`email = $${updateParams.length}`);
        changedFields.push('email');
      }

      if (updates.status !== undefined && updates.status !== existing.status) {
        updateParams.push(updates.status);
        setClauses.push(`status = $${updateParams.length}`);
        changedFields.push('status');
      }

      if (updates.patientSafetyProfile !== undefined) {
        const newProfileStr = JSON.stringify(updates.patientSafetyProfile);
        const oldProfileStr = JSON.stringify(existing.patient_safety_profile || {});
        if (newProfileStr !== oldProfileStr) {
          updateParams.push(newProfileStr);
          setClauses.push(`patient_safety_profile = $${updateParams.length}::jsonb`);
          changedFields.push('patientSafetyProfile');
        }
      }

      // If no fields actually changed, return current record
      if (changedFields.length === 0) {
        await this.db.query('ROLLBACK');
        return mapPatientRow(existing);
      }

      const updateSql = `
        UPDATE patients
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND workspace_id = $2
        RETURNING *
      `;

      const updateRes = await this.db.query<PatientDbRow>(updateSql, updateParams);
      const updatedRow = updateRes.rows[0];

      // 4. Record audit event
      const isSafetyProfileOnly =
        changedFields.length === 1 && changedFields[0] === 'patientSafetyProfile';

      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'UPDATE',
        entityType: isSafetyProfileOnly ? 'patient_safety_profile' : 'patient',
        entityId: updatedRow.id,
        patientId: updatedRow.id,
        changedFields,
        metadata: {
          patientNumber: updatedRow.patient_number,
          newVersion: updatedRow.version,
        },
      });

      await this.db.query('COMMIT');
      return mapPatientRow(updatedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }
}
