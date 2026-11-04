/**
 * ============================================================================
 * PHYSIOCASE — PART B-5: CLINICAL PROBLEM DOMAIN SERVICE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../../types/auth';
import type { ClinicalProblem, ClinicalProblemStatus } from '../../types';
import {
  canPerformClinicalMutation,
  hasActiveMembership,
} from '../../auth/authorization';
import { recordAuditEvent, buildAuditActor } from '../audit/audit.service';
import type {
  CreateProblemInput,
  UpdateProblemInput,
  ArchiveProblemInput,
  ListProblemsQuery,
} from './problem.schema';

export interface ProblemDbRow {
  id: string;
  workspace_id: string;
  case_id: string;
  patient_id: string;
  title: string;
  description: string | null;
  linked_finding_ids: any;
  linked_investigation_ids: any;
  status: ClinicalProblemStatus;
  therapist_notes: string | null;
  resolved_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: any | null;
  archive_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export function mapProblemRow(row: ProblemDbRow): ClinicalProblem {
  return {
    id: row.id,
    caseId: row.case_id,
    patientId: row.patient_id,
    title: row.title,
    description: row.description || undefined,
    linkedFindingIds: typeof row.linked_finding_ids === 'string'
      ? JSON.parse(row.linked_finding_ids)
      : row.linked_finding_ids || [],
    linkedInvestigationIds: typeof row.linked_investigation_ids === 'string'
      ? JSON.parse(row.linked_investigation_ids)
      : row.linked_investigation_ids || [],
    status: row.status,
    therapistNotes: row.therapist_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at || undefined,
    isArchived: row.is_archived,
    archivedAt: row.archived_at || undefined,
    archivedBy: typeof row.archived_by === 'string'
      ? JSON.parse(row.archived_by)
      : row.archived_by || undefined,
    archiveReason: row.archive_reason || undefined,
    version: row.version,
  };
}

export class ProblemService {
  constructor(private db: PGlite) {}

  /**
   * Helper to validate that all supplied finding IDs exist in the parent case's objective assessment.
   */
  private async validateLinkedFindings(
    workspaceId: string,
    caseId: string,
    findingIds: string[]
  ): Promise<void> {
    if (findingIds.length === 0) return;

    const res = await this.db.query<{ findings: any }>(
      `SELECT findings FROM objective_assessments WHERE case_id = $1 AND workspace_id = $2`,
      [caseId, workspaceId]
    );

    const storedFindings: Array<{ id: string }> = res.rows.length > 0
      ? (typeof res.rows[0].findings === 'string' ? JSON.parse(res.rows[0].findings) : res.rows[0].findings || [])
      : [];

    const availableIds = new Set(storedFindings.map((f) => f.id));

    for (const fid of findingIds) {
      if (!availableIds.has(fid)) {
        const err: any = new Error(`Invalid linked finding ID: "${fid}". Finding does not exist in this case.`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  /**
   * Helper to validate that all supplied investigation IDs exist for the parent case in this workspace.
   */
  private async validateLinkedInvestigations(
    workspaceId: string,
    caseId: string,
    investigationIds: string[]
  ): Promise<void> {
    if (investigationIds.length === 0) return;

    for (const invId of investigationIds) {
      const res = await this.db.query<{ id: string }>(
        `SELECT id FROM clinical_investigations WHERE id = $1 AND case_id = $2 AND workspace_id = $3`,
        [invId, caseId, workspaceId]
      );

      if (res.rows.length === 0) {
        const err: any = new Error(`Invalid linked investigation ID: "${invId}". Investigation does not exist in this case.`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  /**
   * Lists clinical problems for a given case.
   * Scoped strictly to the authenticated workspace.
   */
  async listProblems(
    context: AuthContext,
    caseId: string,
    query?: ListProblemsQuery
  ): Promise<ClinicalProblem[]> {
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

    const conditions: string[] = ['case_id = $1', 'workspace_id = $2'];
    const params: any[] = [caseId, workspaceId];
    let paramIdx = 3;

    if (!query?.includeArchived) {
      conditions.push('is_archived = false');
    }

    if (query?.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(query.status);
    }

    const sql = `SELECT * FROM clinical_problems WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC`;
    const res = await this.db.query<ProblemDbRow>(sql, params);
    return res.rows.map(mapProblemRow);
  }

  /**
   * Retrieves a single problem by ID.
   */
  async getProblemById(
    context: AuthContext,
    caseId: string,
    problemId: string
  ): Promise<ClinicalProblem> {
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

    const res = await this.db.query<ProblemDbRow>(
      `SELECT * FROM clinical_problems WHERE id = $1 AND case_id = $2 AND workspace_id = $3`,
      [problemId, caseId, workspaceId]
    );

    if (res.rows.length === 0) {
      const err: any = new Error('Clinical problem not found');
      err.statusCode = 404;
      throw err;
    }

    return mapProblemRow(res.rows[0]);
  }

  /**
   * Creates a new clinical problem.
   * Requires clinical authorization capability.
   * Locks parent case first to serialize against concurrent case archival.
   * Validates linked finding and investigation IDs.
   * Emits 'CREATE' audit event in the same transaction.
   */
  async createProblem(
    context: AuthContext,
    caseId: string,
    input: CreateProblemInput
  ): Promise<ClinicalProblem> {
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
        const err: any = new Error('Cannot add problems: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Validate linked references
      const linkedFindings = input.linkedFindingIds || [];
      const linkedInvestigations = input.linkedInvestigationIds || [];

      await this.validateLinkedFindings(workspaceId, caseId, linkedFindings);
      await this.validateLinkedInvestigations(workspaceId, caseId, linkedInvestigations);

      // 3. Status and resolution timestamp handling
      const status: ClinicalProblemStatus = input.status || 'active';
      const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;

      // 4. Insert clinical problem
      const insertSql = `
        INSERT INTO clinical_problems (
          workspace_id,
          case_id,
          patient_id,
          title,
          description,
          linked_finding_ids,
          linked_investigation_ids,
          status,
          therapist_notes,
          resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
        RETURNING *
      `;

      const insertValues = [
        workspaceId,
        caseId,
        parentCase.patient_id,
        input.title,
        input.description || null,
        JSON.stringify(linkedFindings),
        JSON.stringify(linkedInvestigations),
        status,
        input.therapistNotes || null,
        resolvedAt,
      ];

      const res = await this.db.query<ProblemDbRow>(insertSql, insertValues);
      const newRow = res.rows[0];

      // 5. Record audit event in same transaction
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'CREATE',
        entityType: 'clinical_problem',
        entityId: newRow.id,
        patientId: parentCase.patient_id,
        caseId,
        changedFields: undefined,
        reason: undefined,
        metadata: {
          title: newRow.title,
          status: newRow.status,
        },
      });

      await this.db.query('COMMIT');
      return mapProblemRow(newRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Updates an existing clinical problem.
   * Locks parent case first, then problem row.
   * Optimistic concurrency: input.version must match existing.version.
   * Manages resolved_at timestamp server-side.
   * Version increment and updated_at handled automatically by database trigger trg_problems_version.
   * Emits 'UPDATE' audit event in the same transaction.
   */
  async updateProblem(
    context: AuthContext,
    caseId: string,
    problemId: string,
    input: UpdateProblemInput
  ): Promise<ClinicalProblem> {
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
        const err: any = new Error('Cannot modify problems: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock problem row
      const probRes = await this.db.query<ProblemDbRow>(
        `SELECT * FROM clinical_problems WHERE id = $1 AND case_id = $2 AND workspace_id = $3 FOR UPDATE`,
        [problemId, caseId, workspaceId]
      );

      if (probRes.rows.length === 0) {
        const err: any = new Error('Clinical problem not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = probRes.rows[0];

      if (existing.is_archived) {
        const err: any = new Error('Cannot modify archived problem');
        err.statusCode = 422;
        throw err;
      }

      // 3. Optimistic concurrency check
      if (input.version !== existing.version) {
        const err: any = new Error(
          `Record version conflict: expected version ${input.version}, but current version is ${existing.version}`
        );
        err.statusCode = 409;
        throw err;
      }

      // 4. Validate any updated linked references
      if (input.linkedFindingIds !== undefined) {
        await this.validateLinkedFindings(workspaceId, caseId, input.linkedFindingIds);
      }
      if (input.linkedInvestigationIds !== undefined) {
        await this.validateLinkedInvestigations(workspaceId, caseId, input.linkedInvestigationIds);
      }

      // 5. Build update set and track changed fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;
      const changedFields: string[] = [];

      if (input.title !== undefined && input.title !== existing.title) {
        updates.push(`title = $${paramIdx++}`);
        values.push(input.title);
        changedFields.push('title');
      }

      if (input.description !== undefined && input.description !== (existing.description || undefined)) {
        updates.push(`description = $${paramIdx++}`);
        values.push(input.description || null);
        changedFields.push('description');
      }

      if (input.linkedFindingIds !== undefined) {
        updates.push(`linked_finding_ids = $${paramIdx++}::jsonb`);
        values.push(JSON.stringify(input.linkedFindingIds));
        changedFields.push('linked_finding_ids');
      }

      if (input.linkedInvestigationIds !== undefined) {
        updates.push(`linked_investigation_ids = $${paramIdx++}::jsonb`);
        values.push(JSON.stringify(input.linkedInvestigationIds));
        changedFields.push('linked_investigation_ids');
      }

      if (input.therapistNotes !== undefined && input.therapistNotes !== (existing.therapist_notes || undefined)) {
        updates.push(`therapist_notes = $${paramIdx++}`);
        values.push(input.therapistNotes || null);
        changedFields.push('therapist_notes');
      }

      // Resolution timestamp logic:
      // - Transition into 'resolved': set current ISO timestamp
      // - Transition out of 'resolved': clear resolved_at (null)
      // - Remains 'resolved' during unrelated edit: preserve original resolved_at
      if (input.status !== undefined && input.status !== existing.status) {
        updates.push(`status = $${paramIdx++}`);
        values.push(input.status);
        changedFields.push('status');

        if (input.status === 'resolved' && existing.status !== 'resolved') {
          const nowIso = new Date().toISOString();
          updates.push(`resolved_at = $${paramIdx++}`);
          values.push(nowIso);
          changedFields.push('resolved_at');
        } else if (input.status !== 'resolved' && existing.status === 'resolved') {
          updates.push(`resolved_at = NULL`);
          changedFields.push('resolved_at');
        }
      }

      let updatedRow: ProblemDbRow;

      if (updates.length > 0) {
        values.push(problemId, caseId, workspaceId);
        const updateSql = `
          UPDATE clinical_problems
          SET ${updates.join(', ')}
          WHERE id = $${paramIdx++} AND case_id = $${paramIdx++} AND workspace_id = $${paramIdx++}
          RETURNING *
        `;
        const res = await this.db.query<ProblemDbRow>(updateSql, values);
        updatedRow = res.rows[0];
      } else {
        updatedRow = existing;
      }

      // Record audit event
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'UPDATE',
        entityType: 'clinical_problem',
        entityId: problemId,
        patientId: parentCase.patient_id,
        caseId,
        changedFields: changedFields.length > 0 ? changedFields : undefined,
        reason: undefined,
        metadata: {
          title: updatedRow.title,
          status: updatedRow.status,
        },
      });

      await this.db.query('COMMIT');
      return mapProblemRow(updatedRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Archives a clinical problem (governed soft deletion).
   * Locks parent case first, then problem row.
   * If already archived, rejects with 400.
   * Emits 'SOFT_DELETE' audit event in the same transaction.
   */
  async archiveProblem(
    context: AuthContext,
    caseId: string,
    problemId: string,
    input: ArchiveProblemInput
  ): Promise<ClinicalProblem> {
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
        const err: any = new Error('Cannot archive problem: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock problem row
      const probRes = await this.db.query<ProblemDbRow>(
        `SELECT * FROM clinical_problems WHERE id = $1 AND case_id = $2 AND workspace_id = $3 FOR UPDATE`,
        [problemId, caseId, workspaceId]
      );

      if (probRes.rows.length === 0) {
        const err: any = new Error('Clinical problem not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = probRes.rows[0];

      // Rejection if already archived (HTTP 400)
      if (existing.is_archived) {
        const err: any = new Error('Problem is already archived');
        err.statusCode = 400;
        throw err;
      }

      // 3. Mark archived (soft delete)
      const updateSql = `
        UPDATE clinical_problems
        SET
          is_archived = true,
          archived_at = clock_timestamp(),
          archived_by = $1,
          archive_reason = $2
        WHERE id = $3 AND case_id = $4 AND workspace_id = $5
        RETURNING *
      `;

      const res = await this.db.query<ProblemDbRow>(updateSql, [
        JSON.stringify(actor),
        input.reason,
        problemId,
        caseId,
        workspaceId,
      ]);

      const archivedRow = res.rows[0];

      // 4. Record audit event with action 'SOFT_DELETE'
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'SOFT_DELETE',
        entityType: 'clinical_problem',
        entityId: problemId,
        patientId: parentCase.patient_id,
        caseId,
        changedFields: ['is_archived', 'archived_at', 'archived_by', 'archive_reason'],
        reason: input.reason,
        metadata: {
          title: existing.title,
          status: existing.status,
        },
      });

      await this.db.query('COMMIT');
      return mapProblemRow(archivedRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
