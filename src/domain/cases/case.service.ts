/**
 * ============================================================================
 * PHYSIOCASE — PART B-3: CASE DOMAIN SERVICE & LIFECYCLE ENGINE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../../types/auth';
import type { Case, CaseStatus, CaseArchiveReason } from '../../types';
import {
  canPerformClinicalMutation,
  isWorkspaceOwner,
  hasActiveMembership,
} from '../../auth/authorization';
import { recordAuditEvent, buildAuditActor } from '../audit/audit.service';
import type {
  CreateCaseInput,
  UpdateCaseInput,
  ArchiveCaseInput,
  UnarchiveCaseInput,
  ListCasesQuery,
} from './case.schema';

export interface CaseDbRow {
  id: string;
  workspace_id: string;
  patient_id: string;
  case_id: string;
  case_name: string;
  presenting_problem: string | null;
  date_of_onset: string | null;
  referral_source: string | null;
  start_date: string;
  status: CaseStatus;
  last_session_date: string | null;
  next_review_date: string | null;
  title: string | null;
  stage: string | null;
  patient_name: string | null;
  body_region: string | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: any | null;
  archive_reason: CaseArchiveReason | null;
  archive_notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export function mapCaseRow(row: CaseDbRow): Case {
  return {
    id: row.id,
    caseId: row.case_id,
    patientId: row.patient_id,
    caseName: row.case_name,
    presentingProblem: row.presenting_problem || undefined,
    dateOfOnset: row.date_of_onset || undefined,
    referralSource: row.referral_source || undefined,
    startDate: row.start_date,
    status: row.status,
    lastSessionDate: row.last_session_date || undefined,
    nextReviewDate: row.next_review_date || undefined,
    title: row.title || row.case_name,
    stage: (row.stage as any) || (row.status ? (row.status.toLowerCase() as any) : undefined),
    patientName: row.patient_name || undefined,
    bodyRegion: row.body_region || undefined,
    isArchived: row.is_archived,
    archivedAt: row.archived_at || undefined,
    archivedBy: typeof row.archived_by === 'string' ? JSON.parse(row.archived_by) : row.archived_by || undefined,
    archiveReason: row.archive_reason || undefined,
    archiveNotes: row.archive_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ClinicalFootprint {
  isPreClinical: boolean;
  totalCount: number;
  sessionsCount: number;
  deliveriesCount: number;
  progressRecordsCount: number;
  progressMeasurementsCount: number;
  dischargeRecordsCount: number;
  documentedSubjectiveCount: number;
  documentedObjectiveCount: number;
  activeProblemsCount: number;
  activeGoalsCount: number;
  treatmentPlansCount: number;
  treatmentSelectionsCount: number;
  investigationsCount: number;
}

/**
 * Validates canonical clinical status transitions.
 */
export function isAllowedTransition(from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return true;
  if (from === 'Assessment') {
    return to === 'Treatment' || to === 'Discharged';
  }
  if (from === 'Treatment') {
    return to === 'Reassessment' || to === 'Discharged';
  }
  if (from === 'Reassessment') {
    return to === 'Treatment' || to === 'Discharged';
  }
  if (from === 'Discharged') {
    return to === 'Treatment'; // Approved reopen transition
  }
  return false;
}

export class CaseService {
  constructor(private db: PGlite) {}

  /**
   * Evaluates authoritative clinical footprint across 12 child collections.
   * Client-provided footprint claims are never trusted.
   */
  async getCaseClinicalFootprint(
    workspaceId: string,
    caseId: string,
    client: PGlite = this.db
  ): Promise<ClinicalFootprint> {
    const query = `
      SELECT
        (SELECT count(*) FROM clinical_sessions WHERE workspace_id = $1 AND case_id = $2) as sessions_count,
        (SELECT count(*) FROM session_treatment_deliveries WHERE workspace_id = $1 AND case_id = $2) as deliveries_count,
        (SELECT count(*) FROM progress_records WHERE workspace_id = $1 AND case_id = $2) as progress_records_count,
        (SELECT count(*) FROM progress_measurements WHERE workspace_id = $1 AND case_id = $2) as progress_measurements_count,
        (SELECT count(*) FROM case_discharge_records WHERE workspace_id = $1 AND case_id = $2) as discharge_records_count,
        (SELECT count(*) FROM subjective_assessments WHERE workspace_id = $1 AND case_id = $2 AND (is_finalized = true OR (patient_story IS NOT NULL AND trim(patient_story) != '') OR jsonb_array_length(symptom_locations) > 0)) as documented_subjective_count,
        (SELECT count(*) FROM objective_assessments WHERE workspace_id = $1 AND case_id = $2 AND (is_finalized = true OR jsonb_array_length(findings) > 0)) as documented_objective_count,
        (SELECT count(*) FROM clinical_problems WHERE workspace_id = $1 AND case_id = $2 AND is_archived = false) as active_problems_count,
        (SELECT count(*) FROM clinical_goals WHERE workspace_id = $1 AND case_id = $2 AND is_archived = false) as active_goals_count,
        (SELECT count(*) FROM treatment_plans WHERE workspace_id = $1 AND case_id = $2) as treatment_plans_count,
        (SELECT count(*) FROM treatment_selections WHERE workspace_id = $1 AND case_id = $2) as treatment_selections_count,
        (SELECT count(*) FROM clinical_investigations WHERE workspace_id = $1 AND case_id = $2 AND is_archived = false) as investigations_count
    `;

    const res = await client.query<any>(query, [workspaceId, caseId]);
    const row = res.rows[0];

    const sessionsCount = parseInt(row.sessions_count, 10) || 0;
    const deliveriesCount = parseInt(row.deliveries_count, 10) || 0;
    const progressRecordsCount = parseInt(row.progress_records_count, 10) || 0;
    const progressMeasurementsCount = parseInt(row.progress_measurements_count, 10) || 0;
    const dischargeRecordsCount = parseInt(row.discharge_records_count, 10) || 0;
    const documentedSubjectiveCount = parseInt(row.documented_subjective_count, 10) || 0;
    const documentedObjectiveCount = parseInt(row.documented_objective_count, 10) || 0;
    const activeProblemsCount = parseInt(row.active_problems_count, 10) || 0;
    const activeGoalsCount = parseInt(row.active_goals_count, 10) || 0;
    const treatmentPlansCount = parseInt(row.treatment_plans_count, 10) || 0;
    const treatmentSelectionsCount = parseInt(row.treatment_selections_count, 10) || 0;
    const investigationsCount = parseInt(row.investigations_count, 10) || 0;

    const totalCount =
      sessionsCount +
      deliveriesCount +
      progressRecordsCount +
      progressMeasurementsCount +
      dischargeRecordsCount +
      documentedSubjectiveCount +
      documentedObjectiveCount +
      activeProblemsCount +
      activeGoalsCount +
      treatmentPlansCount +
      treatmentSelectionsCount +
      investigationsCount;

    return {
      isPreClinical: totalCount === 0,
      totalCount,
      sessionsCount,
      deliveriesCount,
      progressRecordsCount,
      progressMeasurementsCount,
      dischargeRecordsCount,
      documentedSubjectiveCount,
      documentedObjectiveCount,
      activeProblemsCount,
      activeGoalsCount,
      treatmentPlansCount,
      treatmentSelectionsCount,
      investigationsCount,
    };
  }

  /**
   * Creates a new case bound to an existing patient in the workspace.
   * Generates CASE-XXXX via atomic function.
   * Requires clinical mutation capability.
   */
  async createCase(
    context: AuthContext,
    input: CreateCaseInput
  ): Promise<Case> {
    if (!canPerformClinicalMutation(context)) {
      const err: any = new Error('Clinical mutation capability required to create case');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    // 1. Verify patient belongs to workspace
    const patRes = await this.db.query<{ id: string; full_name: string }>(
      `SELECT id, full_name FROM patients WHERE id = $1 AND workspace_id = $2`,
      [input.patientId, workspaceId]
    );

    if (patRes.rows.length === 0) {
      const err: any = new Error('Patient not found in this workspace');
      err.statusCode = 404;
      throw err;
    }

    const patient = patRes.rows[0];
    const initialStatus: CaseStatus = input.status || 'Assessment';
    const initialStage = initialStatus.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    await this.db.query('BEGIN');
    try {
      // 2. Allocate CASE-XXXX
      const numRes = await this.db.query<{ allocate_next_human_id: string }>(
        `SELECT allocate_next_human_id($1, 'case')`,
        [workspaceId]
      );
      const caseId = numRes.rows[0].allocate_next_human_id;

      // 3. Insert case record
      const insertRes = await this.db.query<CaseDbRow>(
        `INSERT INTO cases (
          workspace_id,
          patient_id,
          case_id,
          case_name,
          presenting_problem,
          date_of_onset,
          referral_source,
          start_date,
          status,
          stage,
          title,
          patient_name,
          body_region,
          is_archived,
          version,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, 1, clock_timestamp(), clock_timestamp()
        ) RETURNING *`,
        [
          workspaceId,
          patient.id,
          caseId,
          input.caseName,
          input.presentingProblem || null,
          input.dateOfOnset || null,
          input.referralSource || null,
          input.startDate || today,
          initialStatus,
          initialStage,
          input.caseName,
          patient.full_name,
          input.bodyRegion || null,
        ]
      );

      const createdRow = insertRes.rows[0];

      // 4. Record audit event
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'CREATE',
        entityType: 'case',
        entityId: createdRow.id,
        patientId: createdRow.patient_id,
        caseId: createdRow.id,
        metadata: {
          displayCaseId: createdRow.case_id,
          caseStatus: createdRow.status,
        },
      });

      await this.db.query('COMMIT');
      return mapCaseRow(createdRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Retrieves a single case by ID, strictly scoped to the authenticated workspace.
   */
  async getCaseById(context: AuthContext, id: string): Promise<Case> {
    if (!hasActiveMembership(context)) {
      const err: any = new Error('Active workspace membership required');
      err.statusCode = 403;
      throw err;
    }

    const res = await this.db.query<CaseDbRow>(
      `SELECT * FROM cases WHERE id = $1 AND workspace_id = $2`,
      [id, context.workspace.id]
    );

    if (res.rows.length === 0) {
      const err: any = new Error('Case not found');
      err.statusCode = 404;
      throw err;
    }

    return mapCaseRow(res.rows[0]);
  }

  /**
   * Lists cases within the authenticated workspace.
   */
  async listCases(
    context: AuthContext,
    query?: ListCasesQuery
  ): Promise<Case[]> {
    if (!hasActiveMembership(context)) {
      const err: any = new Error('Active workspace membership required');
      err.statusCode = 403;
      throw err;
    }

    const params: any[] = [context.workspace.id];
    let sql = `SELECT * FROM cases WHERE workspace_id = $1`;

    if (query?.patientId) {
      params.push(query.patientId);
      sql += ` AND patient_id = $${params.length}`;
    }

    if (query?.status) {
      params.push(query.status);
      sql += ` AND status = $${params.length}`;
    }

    if (query?.isArchived !== undefined) {
      params.push(query.isArchived);
      sql += ` AND is_archived = $${params.length}`;
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

    const res = await this.db.query<CaseDbRow>(sql, params);
    return res.rows.map(mapCaseRow);
  }

  /**
   * Updates clinical case fields and validates lifecycle state transitions.
   * Prohibits modification of archived cases.
   * Requires clinical mutation authority.
   */
  async updateCase(
    context: AuthContext,
    caseId: string,
    updates: UpdateCaseInput
  ): Promise<Case> {
    if (!canPerformClinicalMutation(context)) {
      const err: any = new Error('Clinical mutation capability required to update case');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    await this.db.query('BEGIN');
    try {
      const selectRes = await this.db.query<CaseDbRow>(
        `SELECT * FROM cases WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      if (selectRes.rows.length === 0) {
        const err: any = new Error('Case not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = selectRes.rows[0];

      // Prohibit clinical mutations on archived cases
      if (existing.is_archived) {
        const err: any = new Error(`Cannot modify case: Case "${existing.case_id}" is archived and read-only.`);
        err.statusCode = 422;
        throw err;
      }

      // Optimistic concurrency check
      if (updates.version !== undefined && updates.version !== existing.version) {
        const err: any = new Error(
          `Record version conflict: expected version ${existing.version}, got ${updates.version}`
        );
        err.statusCode = 409;
        throw err;
      }

      // Lifecycle status transition validation
      let targetStatus = existing.status;
      let targetStage = existing.stage || existing.status.toLowerCase();

      if (updates.status !== undefined && updates.status !== existing.status) {
        if (!isAllowedTransition(existing.status, updates.status)) {
          const err: any = new Error(
            `Invalid case status transition from '${existing.status}' to '${updates.status}'`
          );
          err.statusCode = 400;
          throw err;
        }
        targetStatus = updates.status;
        targetStage = updates.status.toLowerCase();
      }

      // Track changed fields in camelCase for audit log
      const changedFields: string[] = [];
      const setClauses: string[] = ['version = version + 1', 'updated_at = clock_timestamp()'];
      const updateParams: any[] = [caseId, workspaceId];

      if (targetStatus !== existing.status) {
        updateParams.push(targetStatus);
        setClauses.push(`status = $${updateParams.length}`);
        changedFields.push('status');

        updateParams.push(targetStage);
        setClauses.push(`stage = $${updateParams.length}`);
        changedFields.push('stage');
      }

      if (updates.caseName !== undefined && updates.caseName !== existing.case_name) {
        updateParams.push(updates.caseName);
        setClauses.push(`case_name = $${updateParams.length}`);
        updateParams.push(updates.caseName);
        setClauses.push(`title = $${updateParams.length}`);
        changedFields.push('caseName');
      }

      if (updates.presentingProblem !== undefined && updates.presentingProblem !== (existing.presenting_problem || '')) {
        updateParams.push(updates.presentingProblem || null);
        setClauses.push(`presenting_problem = $${updateParams.length}`);
        changedFields.push('presentingProblem');
      }

      if (updates.dateOfOnset !== undefined && updates.dateOfOnset !== (existing.date_of_onset || '')) {
        updateParams.push(updates.dateOfOnset || null);
        setClauses.push(`date_of_onset = $${updateParams.length}`);
        changedFields.push('dateOfOnset');
      }

      if (updates.referralSource !== undefined && updates.referralSource !== (existing.referral_source || '')) {
        updateParams.push(updates.referralSource || null);
        setClauses.push(`referral_source = $${updateParams.length}`);
        changedFields.push('referralSource');
      }

      if (updates.startDate !== undefined && updates.startDate !== existing.start_date) {
        updateParams.push(updates.startDate);
        setClauses.push(`start_date = $${updateParams.length}`);
        changedFields.push('startDate');
      }

      if (updates.lastSessionDate !== undefined && updates.lastSessionDate !== (existing.last_session_date || '')) {
        updateParams.push(updates.lastSessionDate || null);
        setClauses.push(`last_session_date = $${updateParams.length}`);
        changedFields.push('lastSessionDate');
      }

      if (updates.nextReviewDate !== undefined && updates.nextReviewDate !== (existing.next_review_date || '')) {
        updateParams.push(updates.nextReviewDate || null);
        setClauses.push(`next_review_date = $${updateParams.length}`);
        changedFields.push('nextReviewDate');
      }

      if (updates.bodyRegion !== undefined && updates.bodyRegion !== (existing.body_region || '')) {
        updateParams.push(updates.bodyRegion || null);
        setClauses.push(`body_region = $${updateParams.length}`);
        changedFields.push('bodyRegion');
      }

      if (changedFields.length === 0) {
        await this.db.query('ROLLBACK');
        return mapCaseRow(existing);
      }

      const updateSql = `
        UPDATE cases
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND workspace_id = $2
        RETURNING *
      `;

      const updateRes = await this.db.query<CaseDbRow>(updateSql, updateParams);
      const updatedRow = updateRes.rows[0];

      // Record audit event
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'UPDATE',
        entityType: 'case',
        entityId: updatedRow.id,
        patientId: updatedRow.patient_id,
        caseId: updatedRow.id,
        changedFields,
        metadata: {
          displayCaseId: updatedRow.case_id,
          caseStatus: updatedRow.status,
          newVersion: updatedRow.version,
        },
      });

      await this.db.query('COMMIT');
      return mapCaseRow(updatedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Archives a case with authoritative clinical footprint and reason checks.
   * Administrative vs clinical reasons reconciled with authorization boundary.
   */
  async archiveCase(
    context: AuthContext,
    caseId: string,
    input: ArchiveCaseInput
  ): Promise<Case> {
    if (!hasActiveMembership(context)) {
      const err: any = new Error('Active workspace membership required');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    await this.db.query('BEGIN');
    try {
      const selectRes = await this.db.query<CaseDbRow>(
        `SELECT * FROM cases WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      if (selectRes.rows.length === 0) {
        const err: any = new Error('Case not found');
        err.statusCode = 404;
        throw err;
      }

      const targetCase = selectRes.rows[0];

      if (targetCase.is_archived) {
        const err: any = new Error(`Cannot archive case: Case "${targetCase.case_id}" is already archived.`);
        err.statusCode = 400;
        throw err;
      }

      // Compute authoritative server-side clinical footprint
      const footprint = await this.getCaseClinicalFootprint(workspaceId, caseId, this.db);

      // Validate reason eligibility based on clinical footprint
      if (footprint.isPreClinical) {
        const preClinicalReasons: CaseArchiveReason[] = [
          'created_in_error',
          'duplicate_entry',
          'wrong_patient',
          'test_or_demo',
        ];
        if (!preClinicalReasons.includes(input.reason)) {
          const err: any = new Error(
            `Reason "${input.reason}" is not permitted for pre-clinical cases. Only clerical/pre-clinical reasons are allowed.`
          );
          err.statusCode = 422;
          throw err;
        }
      } else {
        // Documented clinical case
        if (input.reason === 'created_in_error' || input.reason === 'test_or_demo') {
          const err: any = new Error(
            `Documented clinical cases cannot be archived as "${input.reason}". Clinical records exist and must be archived using care discontinuation, transfer, duplicate, wrong patient, or administrative closure.`
          );
          err.statusCode = 422;
          throw err;
        }
      }

      // Mandatory notes validation
      const requiresNotes =
        input.reason === 'wrong_patient' ||
        input.reason === 'administrative_closure' ||
        input.reason === 'duplicate_entry' ||
        !footprint.isPreClinical;

      if (requiresNotes && (!input.notes || !input.notes.trim())) {
        const err: any = new Error(
          `Explanatory archive notes are required when archiving with reason "${input.reason}".`
        );
        err.statusCode = 400;
        throw err;
      }

      // Authorization reconciliation:
      // Clinical reasons require clinical_authorized = true.
      // Administrative reasons permitted for workspace owner or clinically authorized practitioner.
      const clinicalReasons: CaseArchiveReason[] = [
        'care_discontinued_uncontactable',
        'care_transferred_external',
        'clinical_hold_inactive',
      ];

      if (clinicalReasons.includes(input.reason)) {
        if (!canPerformClinicalMutation(context)) {
          const err: any = new Error(
            `Clinical authorization capability required to archive case with clinical reason '${input.reason}'`
          );
          err.statusCode = 403;
          throw err;
        }
      } else {
        // Administrative reason
        if (!canPerformClinicalMutation(context) && !isWorkspaceOwner(context)) {
          const err: any = new Error('Workspace owner or clinical authorization required to archive case');
          err.statusCode = 403;
          throw err;
        }
      }

      const updateRes = await this.db.query<CaseDbRow>(
        `UPDATE cases
         SET
           is_archived = true,
           archived_at = clock_timestamp(),
           archived_by = $3::jsonb,
           archive_reason = $4,
           archive_notes = $5,
           version = version + 1,
           updated_at = clock_timestamp()
         WHERE id = $1 AND workspace_id = $2
         RETURNING *`,
        [
          caseId,
          workspaceId,
          JSON.stringify(actor),
          input.reason,
          input.notes?.trim() || null,
        ]
      );

      const archivedRow = updateRes.rows[0];

      // Record SOFT_DELETE audit event
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'SOFT_DELETE',
        entityType: 'case',
        entityId: archivedRow.id,
        patientId: archivedRow.patient_id,
        caseId: archivedRow.id,
        changedFields: ['isArchived', 'archivedAt', 'archivedBy', 'archiveReason', 'archiveNotes'],
        reason: input.reason,
        metadata: {
          displayCaseId: archivedRow.case_id,
          caseStatus: archivedRow.status,
          isPreClinical: footprint.isPreClinical,
          archiveReason: input.reason,
        },
      });

      await this.db.query('COMMIT');
      return mapCaseRow(archivedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Unarchives a case, clearing archive metadata in accordance with database constraint.
   * Preserves previous archival context in audit event metadata.
   */
  async unarchiveCase(
    context: AuthContext,
    caseId: string,
    input: UnarchiveCaseInput
  ): Promise<Case> {
    if (!hasActiveMembership(context)) {
      const err: any = new Error('Active workspace membership required');
      err.statusCode = 403;
      throw err;
    }

    if (!canPerformClinicalMutation(context) && !isWorkspaceOwner(context)) {
      const err: any = new Error('Workspace owner or clinical authorization required to unarchive case');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    await this.db.query('BEGIN');
    try {
      const selectRes = await this.db.query<CaseDbRow>(
        `SELECT * FROM cases WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      if (selectRes.rows.length === 0) {
        const err: any = new Error('Case not found');
        err.statusCode = 404;
        throw err;
      }

      const targetCase = selectRes.rows[0];

      if (!targetCase.is_archived) {
        const err: any = new Error(`Cannot unarchive case: Case "${targetCase.case_id}" is not archived.`);
        err.statusCode = 400;
        throw err;
      }

      const updateRes = await this.db.query<CaseDbRow>(
        `UPDATE cases
         SET
           is_archived = false,
           archived_at = NULL,
           archived_by = NULL,
           archive_reason = NULL,
           archive_notes = NULL,
           version = version + 1,
           updated_at = clock_timestamp()
         WHERE id = $1 AND workspace_id = $2
         RETURNING *`,
        [caseId, workspaceId]
      );

      const unarchivedRow = updateRes.rows[0];

      // Record UPDATE audit event preserving previous archival context
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'UPDATE',
        entityType: 'case',
        entityId: unarchivedRow.id,
        patientId: unarchivedRow.patient_id,
        caseId: unarchivedRow.id,
        changedFields: ['isArchived', 'archivedAt', 'archivedBy', 'archiveReason', 'archiveNotes'],
        reason: input.reason,
        metadata: {
          displayCaseId: unarchivedRow.case_id,
          caseStatus: unarchivedRow.status,
          previousArchiveReason: targetCase.archive_reason || 'unknown',
          previousArchivedAt: targetCase.archived_at || 'unknown',
        },
      });

      await this.db.query('COMMIT');
      return mapCaseRow(unarchivedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }
}
