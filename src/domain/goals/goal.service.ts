/**
 * ============================================================================
 * PHYSIOCASE — PART B-6: CLINICAL GOAL DOMAIN SERVICE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../../types/auth';
import type { ClinicalGoal, ClinicalGoalStatus, ClinicalGoalType } from '../../types';
import {
  canPerformClinicalMutation,
  hasActiveMembership,
} from '../../auth/authorization';
import { recordAuditEvent, buildAuditActor } from '../audit/audit.service';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  ArchiveGoalInput,
  ListGoalsQuery,
} from './goal.schema';

export interface GoalDbRow {
  id: string;
  workspace_id: string;
  case_id: string;
  patient_id: string;
  title: string;
  description: string | null;
  type: ClinicalGoalType;
  linked_problem_ids: any;
  target_value: string | null;
  target_date: string | null;
  status: ClinicalGoalStatus;
  therapist_notes: string | null;
  achieved_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: any | null;
  archive_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export function mapGoalRow(row: GoalDbRow): ClinicalGoal {
  return {
    id: row.id,
    caseId: row.case_id,
    patientId: row.patient_id,
    title: row.title,
    description: row.description || undefined,
    type: row.type,
    linkedProblemIds: typeof row.linked_problem_ids === 'string'
      ? JSON.parse(row.linked_problem_ids)
      : row.linked_problem_ids || [],
    targetValue: row.target_value || undefined,
    targetDate: row.target_date || undefined,
    status: row.status,
    therapistNotes: row.therapist_notes || undefined,
    achievedAt: row.achieved_at || undefined,
    isArchived: row.is_archived,
    archivedAt: row.archived_at || undefined,
    archivedBy: typeof row.archived_by === 'string'
      ? JSON.parse(row.archived_by)
      : row.archived_by || undefined,
    archiveReason: row.archive_reason || undefined,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class GoalService {
  constructor(private db: PGlite) {}

  /**
   * Helper to validate that all supplied problem IDs exist in the parent case and workspace,
   * and that newly linked problems are not archived.
   */
  private async validateLinkedProblems(
    workspaceId: string,
    caseId: string,
    problemIds: string[],
    existingProblemIds: string[] = []
  ): Promise<void> {
    if (problemIds.length === 0) return;

    const uniqueIds = Array.from(new Set(problemIds));
    const existingSet = new Set(existingProblemIds);

    for (const pid of uniqueIds) {
      const res = await this.db.query<{ id: string; is_archived: boolean }>(
        `SELECT id, is_archived FROM clinical_problems
         WHERE id = $1 AND case_id = $2 AND workspace_id = $3`,
        [pid, caseId, workspaceId]
      );

      if (res.rows.length === 0) {
        const err: any = new Error(`Invalid linked problem ID: "${pid}". Problem does not exist in this case.`);
        err.statusCode = 400;
        throw err;
      }

      const problem = res.rows[0];

      // Newly linked problems cannot be archived. Existing historical links are preserved.
      if (!existingSet.has(pid) && problem.is_archived) {
        const err: any = new Error(`Cannot link archived clinical problem: "${pid}".`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  /**
   * Lists clinical goals for a given case.
   * Scoped strictly to the authenticated workspace.
   */
  async listGoals(
    context: AuthContext,
    caseId: string,
    query?: ListGoalsQuery
  ): Promise<ClinicalGoal[]> {
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

    const conditions: string[] = ['workspace_id = $1', 'case_id = $2'];
    const values: any[] = [workspaceId, caseId];
    let paramIndex = 3;

    // Filter out archived goals by default unless explicitly requested
    if (!query?.includeArchived) {
      conditions.push('is_archived = false');
    }

    if (query?.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(query.status);
      paramIndex++;
    }

    if (query?.type) {
      conditions.push(`type = $${paramIndex}`);
      values.push(query.type);
      paramIndex++;
    }

    const sql = `
      SELECT * FROM clinical_goals
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at ASC
    `;

    const res = await this.db.query<GoalDbRow>(sql, values);
    return res.rows.map(mapGoalRow);
  }

  /**
   * Retrieves a single clinical goal by ID.
   * Scoped strictly to the parent case and authenticated workspace.
   */
  async getGoalById(
    context: AuthContext,
    caseId: string,
    goalId: string
  ): Promise<ClinicalGoal> {
    if (!hasActiveMembership(context)) {
      const err: any = new Error('Active workspace membership required');
      err.statusCode = 403;
      throw err;
    }

    const workspaceId = context.workspace.id;

    const res = await this.db.query<GoalDbRow>(
      `SELECT * FROM clinical_goals
       WHERE id = $1 AND case_id = $2 AND workspace_id = $3`,
      [goalId, caseId, workspaceId]
    );

    if (res.rows.length === 0) {
      const err: any = new Error('Clinical goal not found');
      err.statusCode = 404;
      throw err;
    }

    return mapGoalRow(res.rows[0]);
  }

  /**
   * Formulates a new clinical goal.
   * Requires clinical mutation authority.
   * Locks parent case first to verify existence and reject archived cases.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async createGoal(
    context: AuthContext,
    caseId: string,
    input: CreateGoalInput
  ): Promise<ClinicalGoal> {
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
        const err: any = new Error('Cannot create goal: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Validate linked problems if provided
      const linkedProblemIds = input.linkedProblemIds ? Array.from(new Set(input.linkedProblemIds)) : [];
      if (linkedProblemIds.length > 0) {
        await this.validateLinkedProblems(workspaceId, caseId, linkedProblemIds, []);
      }

      // 3. Determine initial achieved_at timestamp
      const initialStatus = input.status || 'active';
      const initialAchievedAt = initialStatus === 'met' ? new Date().toISOString() : null;

      // 4. Insert clinical goal
      const insertSql = `
        INSERT INTO clinical_goals (
          workspace_id,
          case_id,
          patient_id,
          title,
          description,
          type,
          linked_problem_ids,
          target_value,
          target_date,
          status,
          therapist_notes,
          achieved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const insertValues = [
        workspaceId,
        caseId,
        parentCase.patient_id,
        input.title,
        input.description || null,
        input.type || 'short_term',
        JSON.stringify(linkedProblemIds),
        input.targetValue || null,
        input.targetDate || null,
        initialStatus,
        input.therapistNotes || null,
        initialAchievedAt,
      ];

      const res = await this.db.query<GoalDbRow>(insertSql, insertValues);
      const newRow = res.rows[0];

      // 5. Record audit event in same transaction
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'CREATE',
        entityType: 'clinical_goal',
        entityId: newRow.id,
        patientId: parentCase.patient_id,
        caseId,
        changedFields: undefined,
        reason: undefined,
        metadata: {
          title: newRow.title,
          type: newRow.type,
          status: newRow.status,
        },
      });

      await this.db.query('COMMIT');
      return mapGoalRow(newRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Updates an existing clinical goal.
   * Requires clinical mutation authority.
   * Locks parent case first, then clinical goal row.
   * Enforces optimistic concurrency via matching version.
   * Manages achieved_at timestamp rules automatically.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async updateGoal(
    context: AuthContext,
    caseId: string,
    goalId: string,
    input: UpdateGoalInput
  ): Promise<ClinicalGoal> {
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
        const err: any = new Error('Cannot modify goal: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock clinical goal row second
      const goalRes = await this.db.query<GoalDbRow>(
        `SELECT * FROM clinical_goals
         WHERE id = $1 AND case_id = $2 AND workspace_id = $3 FOR UPDATE`,
        [goalId, caseId, workspaceId]
      );

      if (goalRes.rows.length === 0) {
        const err: any = new Error('Clinical goal not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = goalRes.rows[0];

      if (existing.is_archived) {
        const err: any = new Error('Cannot modify archived goal');
        err.statusCode = 422;
        throw err;
      }

      // 3. Optimistic concurrency check
      if (input.version !== existing.version) {
        const err: any = new Error(
          `Record version conflict: expected version ${existing.version}, but current version is ${input.version}`
        );
        err.statusCode = 409;
        throw err;
      }

      const existingLinkedProblems: string[] = typeof existing.linked_problem_ids === 'string'
        ? JSON.parse(existing.linked_problem_ids)
        : existing.linked_problem_ids || [];

      // 4. Validate problem linkages if provided
      if (input.linkedProblemIds !== undefined) {
        await this.validateLinkedProblems(
          workspaceId,
          caseId,
          input.linkedProblemIds,
          existingLinkedProblems
        );
      }

      // 5. Compute dynamic updates and achieved_at rules
      const updates: string[] = [];
      const values: any[] = [];
      const changedFields: string[] = [];
      let paramIndex = 1;

      if (input.title !== undefined) {
        updates.push(`title = $${paramIndex}`);
        values.push(input.title);
        changedFields.push('title');
        paramIndex++;
      }

      if (input.type !== undefined) {
        updates.push(`type = $${paramIndex}`);
        values.push(input.type);
        changedFields.push('type');
        paramIndex++;
      }

      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(input.description);
        changedFields.push('description');
        paramIndex++;
      }

      if (input.linkedProblemIds !== undefined) {
        updates.push(`linked_problem_ids = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(input.linkedProblemIds));
        changedFields.push('linkedProblemIds');
        paramIndex++;
      }

      if (input.targetValue !== undefined) {
        updates.push(`target_value = $${paramIndex}`);
        values.push(input.targetValue);
        changedFields.push('targetValue');
        paramIndex++;
      }

      if (input.targetDate !== undefined) {
        updates.push(`target_date = $${paramIndex}`);
        values.push(input.targetDate);
        changedFields.push('targetDate');
        paramIndex++;
      }

      if (input.therapistNotes !== undefined) {
        updates.push(`therapist_notes = $${paramIndex}`);
        values.push(input.therapistNotes);
        changedFields.push('therapistNotes');
        paramIndex++;
      }

      // Compute status and achieved_at transitions
      const nextStatus = input.status !== undefined ? input.status : existing.status;
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(nextStatus);
        changedFields.push('status');
        paramIndex++;
      }

      let nextAchievedAt = existing.achieved_at;
      if (nextStatus === 'met') {
        if (existing.status !== 'met' || !nextAchievedAt) {
          nextAchievedAt = new Date().toISOString();
        }
      } else {
        nextAchievedAt = null;
      }

      if (nextAchievedAt !== existing.achieved_at) {
        updates.push(`achieved_at = $${paramIndex}`);
        values.push(nextAchievedAt);
        changedFields.push('achievedAt');
        paramIndex++;
      }

      // If no clinical fields were modified, return existing record
      if (updates.length === 0) {
        await this.db.query('COMMIT');
        return mapGoalRow(existing);
      }

      // Append WHERE clause identifiers
      values.push(goalId, caseId, workspaceId);
      const updateSql = `
        UPDATE clinical_goals
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND case_id = $${paramIndex + 1} AND workspace_id = $${paramIndex + 2}
        RETURNING *
      `;

      const updateRes = await this.db.query<GoalDbRow>(updateSql, values);
      const updatedRow = updateRes.rows[0];

      // 6. Record audit event in same transaction
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'UPDATE',
        entityType: 'clinical_goal',
        entityId: updatedRow.id,
        patientId: parentCase.patient_id,
        caseId,
        changedFields,
        reason: undefined,
        metadata: {
          title: updatedRow.title,
          type: updatedRow.type,
          status: updatedRow.status,
          version: updatedRow.version,
        },
      });

      await this.db.query('COMMIT');
      return mapGoalRow(updatedRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Archives a clinical goal (governed soft-deletion).
   * Requires clinical mutation authority.
   * Enforces mandatory archive reason.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async archiveGoal(
    context: AuthContext,
    caseId: string,
    goalId: string,
    input: ArchiveGoalInput
  ): Promise<ClinicalGoal> {
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
        const err: any = new Error('Cannot modify goal: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock clinical goal row second
      const goalRes = await this.db.query<GoalDbRow>(
        `SELECT * FROM clinical_goals
         WHERE id = $1 AND case_id = $2 AND workspace_id = $3 FOR UPDATE`,
        [goalId, caseId, workspaceId]
      );

      if (goalRes.rows.length === 0) {
        const err: any = new Error('Clinical goal not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = goalRes.rows[0];

      if (existing.is_archived) {
        const err: any = new Error('Goal is already archived');
        err.statusCode = 400;
        throw err;
      }

      // 3. Perform governed soft deletion
      const updateRes = await this.db.query<GoalDbRow>(
        `UPDATE clinical_goals
         SET
           is_archived = true,
           archived_at = clock_timestamp(),
           archived_by = $1::jsonb,
           archive_reason = $2
         WHERE id = $3 AND case_id = $4 AND workspace_id = $5
         RETURNING *`,
        [JSON.stringify(actor), input.reason, goalId, caseId, workspaceId]
      );

      const archivedRow = updateRes.rows[0];

      // 4. Record audit event in same transaction
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'SOFT_DELETE',
        entityType: 'clinical_goal',
        entityId: archivedRow.id,
        patientId: parentCase.patient_id,
        caseId,
        changedFields: ['isArchived', 'archivedAt', 'archivedBy', 'archiveReason'],
        reason: input.reason,
        metadata: {
          title: archivedRow.title,
          type: archivedRow.type,
          status: archivedRow.status,
        },
      });

      await this.db.query('COMMIT');
      return mapGoalRow(archivedRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
