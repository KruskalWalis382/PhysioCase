/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: OBJECTIVE ASSESSMENT DOMAIN SERVICE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../../types/auth';
import type {
  ObjectiveAssessment,
  ObjectiveAssessmentStatus,
  ObjectiveFinding,
  ClinicalNoteAmendment,
} from '../../types';
import {
  canPerformClinicalMutation,
  hasActiveMembership,
} from '../../auth/authorization';
import { recordAuditEvent, buildAuditActor } from '../audit/audit.service';
import type {
  SaveObjectiveInput,
  FinalizeObjectiveInput,
  AmendObjectiveInput,
} from './objective.schema';

export interface ObjectiveDbRow {
  id: string;
  workspace_id: string;
  case_id: string;
  patient_id: string;
  status: ObjectiveAssessmentStatus;
  selected_areas: any;
  findings: any;
  therapist_notes: string | null;
  completed_at: string | null;
  is_finalized: boolean;
  finalized_at: string | null;
  finalized_by: any | null;
  amendments: any;
  version: number;
  created_at: string;
  updated_at: string;
}

export function mapObjectiveRow(row: ObjectiveDbRow): ObjectiveAssessment {
  return {
    id: row.id,
    caseId: row.case_id,
    patientId: row.patient_id,
    status: row.status,
    selectedAreas: typeof row.selected_areas === 'string'
      ? JSON.parse(row.selected_areas)
      : row.selected_areas || [],
    findings: typeof row.findings === 'string'
      ? JSON.parse(row.findings)
      : row.findings || [],
    therapistNotes: row.therapist_notes || undefined,
    completedAt: row.completed_at || undefined,
    isFinalized: row.is_finalized,
    finalizedAt: row.finalized_at || undefined,
    finalizedBy: typeof row.finalized_by === 'string'
      ? JSON.parse(row.finalized_by)
      : row.finalized_by || undefined,
    amendments: typeof row.amendments === 'string'
      ? JSON.parse(row.amendments)
      : row.amendments || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ObjectiveAssessmentService {
  constructor(private db: PGlite) {}

  /**
   * Retrieves objective assessment for a case.
   * If case does not exist in workspace, throws 404.
   * If case exists but no objective assessment has been saved yet, returns null.
   * Strictly read-only; creates no database rows or audit events.
   */
  async getObjectiveAssessment(
    context: AuthContext,
    caseId: string
  ): Promise<ObjectiveAssessment | null> {
    if (!hasActiveMembership(context)) {
      const err: any = new Error('Active workspace membership required');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;

    // Verify parent case exists in workspace
    const caseRes = await this.db.query<{ id: string }>(
      `SELECT id FROM cases WHERE id = $1 AND workspace_id = $2`,
      [caseId, workspaceId]
    );

    if (caseRes.rows.length === 0) {
      const err: any = new Error('Case not found');
      err.statusCode = 404;
      throw err;
    }

    const res = await this.db.query<ObjectiveDbRow>(
      `SELECT * FROM objective_assessments WHERE case_id = $1 AND workspace_id = $2`,
      [caseId, workspaceId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return mapObjectiveRow(res.rows[0]);
  }

  /**
   * Saves or updates an objective assessment draft.
   * Requires clinical mutation authority.
   * Locks parent case first, then assessment row.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async saveObjectiveAssessment(
    context: AuthContext,
    caseId: string,
    input: SaveObjectiveInput
  ): Promise<ObjectiveAssessment> {
    if (!canPerformClinicalMutation(context)) {
      const err: any = new Error('Clinical authorization capability required for this operation');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    await this.db.query('BEGIN');
    try {
      // 1. Lock parent case first
      const caseRes = await this.db.query<{ id: string; patient_id: string; is_archived: boolean }>(
        `SELECT id, patient_id, is_archived FROM cases WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      if (caseRes.rows.length === 0) {
        const err: any = new Error('Case not found');
        err.statusCode = 404;
        throw err;
      }

      const parentCase = caseRes.rows[0];

      if (parentCase.is_archived) {
        const err: any = new Error('Cannot modify assessment: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock assessment row
      const assessRes = await this.db.query<ObjectiveDbRow>(
        `SELECT * FROM objective_assessments WHERE case_id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      let savedRow: ObjectiveDbRow;
      let auditAction: 'CREATE' | 'UPDATE';
      let changedFields: string[] | undefined;

      // Ensure every finding has a valid unique ID and timestamps
      let sanitizedFindings: ObjectiveFinding[] | undefined;
      if (input.findings !== undefined) {
        const now = new Date().toISOString();
        sanitizedFindings = [];
        for (let i = 0; i < input.findings.length; i++) {
          const f = input.findings[i];
          let findingId = f.id;
          if (!findingId) {
            const uuidRes = await this.db.query<{ generate_uuid_v7: string }>(`SELECT generate_uuid_v7()`);
            findingId = uuidRes.rows[0].generate_uuid_v7;
          }
          sanitizedFindings.push({
            id: findingId,
            assessmentId: assessRes.rows[0]?.id || '',
            examinationArea: f.examinationArea,
            finding: f.finding,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (assessRes.rows.length === 0) {
        // CASE A: Initial creation
        if (input.version !== undefined) {
          const err: any = new Error(`Record version conflict: expected version ${input.version}, but no assessment exists yet`);
          err.statusCode = 409;
          throw err;
        }

        const initialStatus: ObjectiveAssessmentStatus = input.markCompleted ? 'completed' : 'in_progress';
        const completedAt = input.markCompleted ? new Date().toISOString() : null;

        const insertRes = await this.db.query<ObjectiveDbRow>(
          `INSERT INTO objective_assessments (
            workspace_id,
            case_id,
            patient_id,
            status,
            completed_at,
            selected_areas,
            findings,
            therapist_notes,
            version
          ) VALUES (
            $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, 1
          ) RETURNING *`,
          [
            workspaceId,
            caseId,
            parentCase.patient_id,
            initialStatus,
            completedAt,
            JSON.stringify(input.selectedAreas || []),
            JSON.stringify(sanitizedFindings || []),
            input.therapistNotes || null,
          ]
        );

        savedRow = insertRes.rows[0];
        auditAction = 'CREATE';
      } else {
        // CASE B: Update existing draft
        const existing = assessRes.rows[0];

        if (existing.is_finalized) {
          const err: any = new Error(
            'Cannot directly modify finalized Objective Assessment. Finalized clinical records are legally immutable. Use amendment workflow.'
          );
          err.statusCode = 422;
          throw err;
        }

        // Optimistic concurrency check: version is strictly required for updating an existing record
        if (input.version === undefined) {
          const err: any = new Error(
            `Record version conflict: Assessment already exists at version ${existing.version}. Version is required for updates.`
          );
          err.statusCode = 409;
          throw err;
        }

        if (input.version !== existing.version) {
          const err: any = new Error(
            `Record version conflict: expected version ${input.version}, but current version is ${existing.version}`
          );
          err.statusCode = 409;
          throw err;
        }

        let newStatus = existing.status;
        let newCompletedAt = existing.completed_at;

        if (input.markCompleted === true) {
          newStatus = 'completed';
          newCompletedAt = existing.completed_at || new Date().toISOString();
        } else if (input.markCompleted === false) {
          newStatus = 'in_progress';
          newCompletedAt = null;
        }

        const updateRes = await this.db.query<ObjectiveDbRow>(
          `UPDATE objective_assessments SET
            status = $3,
            completed_at = $4,
            selected_areas = COALESCE($5::jsonb, selected_areas),
            findings = COALESCE($6::jsonb, findings),
            therapist_notes = COALESCE($7, therapist_notes)
          WHERE id = $1 AND workspace_id = $2
          RETURNING *`,
          [
            existing.id,
            workspaceId,
            newStatus,
            newCompletedAt,
            input.selectedAreas !== undefined ? JSON.stringify(input.selectedAreas) : null,
            sanitizedFindings !== undefined ? JSON.stringify(sanitizedFindings) : null,
            input.therapistNotes !== undefined ? input.therapistNotes : null,
          ]
        );

        savedRow = updateRes.rows[0];
        auditAction = 'UPDATE';
        changedFields = Object.keys(input).filter((k) => k !== 'version' && k !== 'markCompleted');
      }

      // 3. Insert audit event in the same transaction
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: auditAction,
        entityType: 'objective_assessment',
        entityId: savedRow.id,
        patientId: parentCase.patient_id,
        caseId: parentCase.id,
        changedFields: changedFields || null,
      });

      await this.db.query('COMMIT');
      return mapObjectiveRow(savedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Finalizes an objective assessment, permanently locking it against direct edits.
   * Requires clinical mutation authority.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async finalizeObjectiveAssessment(
    context: AuthContext,
    caseId: string,
    input: FinalizeObjectiveInput
  ): Promise<ObjectiveAssessment> {
    if (!canPerformClinicalMutation(context)) {
      const err: any = new Error('Clinical authorization capability required for this operation');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    await this.db.query('BEGIN');
    try {
      // 1. Lock parent case
      const caseRes = await this.db.query<{ id: string; patient_id: string; is_archived: boolean }>(
        `SELECT id, patient_id, is_archived FROM cases WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      if (caseRes.rows.length === 0) {
        const err: any = new Error('Case not found');
        err.statusCode = 404;
        throw err;
      }

      const parentCase = caseRes.rows[0];

      if (parentCase.is_archived) {
        const err: any = new Error('Cannot modify assessment: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock assessment row
      const assessRes = await this.db.query<ObjectiveDbRow>(
        `SELECT * FROM objective_assessments WHERE case_id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      if (assessRes.rows.length === 0) {
        const err: any = new Error('Assessment not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = assessRes.rows[0];

      if (existing.is_finalized) {
        const err: any = new Error('Assessment is already finalized');
        err.statusCode = 409;
        throw err;
      }

      if (input.version !== existing.version) {
        const err: any = new Error(`Record version conflict: expected version ${existing.version}, got ${input.version}`);
        err.statusCode = 409;
        throw err;
      }

      const updateRes = await this.db.query<ObjectiveDbRow>(
        `UPDATE objective_assessments SET
          is_finalized = true,
          status = 'completed',
          completed_at = COALESCE(completed_at, clock_timestamp()::text),
          finalized_at = clock_timestamp(),
          finalized_by = $3::jsonb
        WHERE id = $1 AND workspace_id = $2
        RETURNING *`,
        [existing.id, workspaceId, JSON.stringify(actor)]
      );

      const finalizedRow = updateRes.rows[0];

      // 3. Insert FINALIZE audit event in same transaction
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'FINALIZE',
        entityType: 'objective_assessment',
        entityId: finalizedRow.id,
        patientId: parentCase.patient_id,
        caseId: parentCase.id,
        changedFields: ['isFinalized', 'finalizedAt', 'finalizedBy', 'status'],
      });

      await this.db.query('COMMIT');
      return mapObjectiveRow(finalizedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Appends a structured clinical amendment to a finalized objective assessment.
   * Requires clinical mutation authority.
   * Trigger enforces prior amendment immutability and content protection.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async amendObjectiveAssessment(
    context: AuthContext,
    caseId: string,
    input: AmendObjectiveInput
  ): Promise<ObjectiveAssessment> {
    if (!canPerformClinicalMutation(context)) {
      const err: any = new Error('Clinical authorization capability required for this operation');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;
    const actor = buildAuditActor(context);

    await this.db.query('BEGIN');
    try {
      // 1. Lock parent case
      const caseRes = await this.db.query<{ id: string; patient_id: string; is_archived: boolean }>(
        `SELECT id, patient_id, is_archived FROM cases WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      if (caseRes.rows.length === 0) {
        const err: any = new Error('Case not found');
        err.statusCode = 404;
        throw err;
      }

      const parentCase = caseRes.rows[0];

      if (parentCase.is_archived) {
        const err: any = new Error('Cannot modify assessment: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock assessment row
      const assessRes = await this.db.query<ObjectiveDbRow>(
        `SELECT * FROM objective_assessments WHERE case_id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      if (assessRes.rows.length === 0) {
        const err: any = new Error('Assessment not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = assessRes.rows[0];

      if (!existing.is_finalized) {
        const err: any = new Error(
          'Cannot add amendment to a non-finalized Objective Assessment. Only finalized clinical records can be amended. Edit directly instead.'
        );
        err.statusCode = 422;
        throw err;
      }

      if (input.version !== existing.version) {
        const err: any = new Error(`Record version conflict: expected version ${existing.version}, got ${input.version}`);
        err.statusCode = 409;
        throw err;
      }

      // Allocate amendment ID via UUIDv7
      const idRes = await this.db.query<{ generate_uuid_v7: string }>(`SELECT generate_uuid_v7()`);
      const amendmentId = idRes.rows[0].generate_uuid_v7;

      const newAmendment: ClinicalNoteAmendment = {
        id: amendmentId,
        amendedAt: new Date().toISOString(),
        amendedBy: {
          id: actor.id,
          name: actor.name,
          role: actor.role as any,
          source: actor.source,
        },
        reason: input.reason,
        amendmentText: input.text,
      };

      const updateRes = await this.db.query<ObjectiveDbRow>(
        `UPDATE objective_assessments SET
          amendments = amendments || $3::jsonb
        WHERE id = $1 AND workspace_id = $2
        RETURNING *`,
        [existing.id, workspaceId, JSON.stringify([newAmendment])]
      );

      const amendedRow = updateRes.rows[0];

      // 3. Insert AMEND audit event in same transaction
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'AMEND',
        entityType: 'objective_assessment',
        entityId: amendedRow.id,
        patientId: parentCase.patient_id,
        caseId: parentCase.id,
        changedFields: ['amendments'],
        reason: `${input.reason}: ${input.text}`,
      });

      await this.db.query('COMMIT');
      return mapObjectiveRow(amendedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }
}
