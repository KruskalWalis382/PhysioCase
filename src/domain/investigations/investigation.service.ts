/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: CLINICAL INVESTIGATION DOMAIN SERVICE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../../types/auth';
import type {
  ClinicalInvestigation,
  InvestigationCategory,
  RadiologicalModality,
} from '../../types';
import {
  canPerformClinicalMutation,
  hasActiveMembership,
} from '../../auth/authorization';
import { recordAuditEvent, buildAuditActor } from '../audit/audit.service';
import type {
  CreateInvestigationInput,
  UpdateInvestigationInput,
  ArchiveInvestigationInput,
} from './investigation.schema';

export interface InvestigationDbRow {
  id: string;
  workspace_id: string;
  case_id: string;
  category: InvestigationCategory;
  modality: RadiologicalModality;
  name: string;
  body_region: string;
  investigation_date: string;
  indication: string | null;
  findings: string | null;
  impression: string | null;
  source_type: string | null;
  source_name: string | null;
  clinician_relevance: string | null;
  attachment: any | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: any | null;
  archive_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export function mapInvestigationRow(row: InvestigationDbRow): ClinicalInvestigation {
  return {
    id: row.id,
    caseId: row.case_id,
    category: row.category,
    modality: row.modality,
    name: row.name,
    bodyRegion: row.body_region,
    investigationDate: row.investigation_date,
    indication: row.indication || undefined,
    findings: row.findings || undefined,
    impression: row.impression || undefined,
    sourceType: row.source_type || undefined,
    sourceName: row.source_name || undefined,
    clinicianRelevance: row.clinician_relevance || undefined,
    attachment: typeof row.attachment === 'string'
      ? JSON.parse(row.attachment)
      : row.attachment || undefined,
    isArchived: row.is_archived,
    archivedAt: row.archived_at || undefined,
    archivedBy: typeof row.archived_by === 'string'
      ? JSON.parse(row.archived_by)
      : row.archived_by || undefined,
    archiveReason: row.archive_reason || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class InvestigationService {
  constructor(private db: PGlite) {}

  /**
   * Lists clinical investigations for a given case.
   * Scoped strictly to the authenticated workspace.
   */
  async listInvestigations(
    context: AuthContext,
    caseId: string,
    includeArchived = false
  ): Promise<ClinicalInvestigation[]> {
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

    const query = includeArchived
      ? `SELECT * FROM clinical_investigations WHERE case_id = $1 AND workspace_id = $2 ORDER BY investigation_date DESC, created_at DESC`
      : `SELECT * FROM clinical_investigations WHERE case_id = $1 AND workspace_id = $2 AND is_archived = false ORDER BY investigation_date DESC, created_at DESC`;

    const res = await this.db.query<InvestigationDbRow>(query, [caseId, workspaceId]);
    return res.rows.map(mapInvestigationRow);
  }

  /**
   * Retrieves a single investigation by ID.
   */
  async getInvestigationById(
    context: AuthContext,
    caseId: string,
    id: string
  ): Promise<ClinicalInvestigation> {
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

    const res = await this.db.query<InvestigationDbRow>(
      `SELECT * FROM clinical_investigations WHERE id = $1 AND case_id = $2 AND workspace_id = $3`,
      [id, caseId, workspaceId]
    );

    if (res.rows.length === 0) {
      const err: any = new Error('Investigation not found');
      err.statusCode = 404;
      throw err;
    }

    return mapInvestigationRow(res.rows[0]);
  }

  /**
   * Creates a new clinical investigation record.
   * Locks parent case first to serialize against concurrent case archival.
   * Emits 'CREATE' audit event in the same transaction.
   */
  async createInvestigation(
    context: AuthContext,
    caseId: string,
    input: CreateInvestigationInput
  ): Promise<ClinicalInvestigation> {
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
        const err: any = new Error('Cannot add investigation: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Insert clinical investigation
      const insertQuery = `
        INSERT INTO clinical_investigations (
          workspace_id,
          case_id,
          category,
          modality,
          name,
          body_region,
          investigation_date,
          indication,
          findings,
          impression,
          source_type,
          source_name,
          clinician_relevance,
          attachment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const insertValues = [
        workspaceId,
        caseId,
        input.category || 'radiological',
        input.modality,
        input.name,
        input.bodyRegion,
        input.investigationDate,
        input.indication || null,
        input.findings || null,
        input.impression || null,
        input.sourceType || null,
        input.sourceName || null,
        input.clinicianRelevance || null,
        input.attachment ? JSON.stringify(input.attachment) : null,
      ];

      const res = await this.db.query<InvestigationDbRow>(insertQuery, insertValues);
      const newRow = res.rows[0];

      // 3. Record audit event in same transaction
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'CREATE',
        entityType: 'clinical_investigation',
        entityId: newRow.id,
        patientId: parentCase.patient_id,
        caseId,
        changedFields: undefined,
        reason: undefined,
        metadata: {
          category: newRow.category,
          modality: newRow.modality,
          name: newRow.name,
        },
      });

      await this.db.query('COMMIT');
      return mapInvestigationRow(newRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Updates an existing clinical investigation record.
   * Locks parent case first, then investigation row.
   * Optimistic concurrency: input.version must match existing.version.
   * Version increment and updated_at handled by database trigger.
   * Emits 'UPDATE' audit event in the same transaction.
   */
  async updateInvestigation(
    context: AuthContext,
    caseId: string,
    id: string,
    input: UpdateInvestigationInput
  ): Promise<ClinicalInvestigation> {
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
        const err: any = new Error('Cannot modify investigation: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock investigation row
      const invRes = await this.db.query<InvestigationDbRow>(
        `SELECT * FROM clinical_investigations WHERE id = $1 AND case_id = $2 AND workspace_id = $3 FOR UPDATE`,
        [id, caseId, workspaceId]
      );

      if (invRes.rows.length === 0) {
        const err: any = new Error('Investigation not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = invRes.rows[0];

      if (existing.is_archived) {
        const err: any = new Error('Cannot modify archived investigation');
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

      // 4. Build update set and track changed fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;
      const changedFields: string[] = [];

      if (input.category !== undefined && input.category !== existing.category) {
        updates.push(`category = $${paramIdx++}`);
        values.push(input.category);
        changedFields.push('category');
      }

      if (input.modality !== undefined && input.modality !== existing.modality) {
        updates.push(`modality = $${paramIdx++}`);
        values.push(input.modality);
        changedFields.push('modality');
      }

      if (input.name !== undefined && input.name !== existing.name) {
        updates.push(`name = $${paramIdx++}`);
        values.push(input.name);
        changedFields.push('name');
      }

      if (input.bodyRegion !== undefined && input.bodyRegion !== existing.body_region) {
        updates.push(`body_region = $${paramIdx++}`);
        values.push(input.bodyRegion);
        changedFields.push('body_region');
      }

      if (input.investigationDate !== undefined && input.investigationDate !== existing.investigation_date) {
        updates.push(`investigation_date = $${paramIdx++}`);
        values.push(input.investigationDate);
        changedFields.push('investigation_date');
      }

      if (input.indication !== undefined && input.indication !== existing.indication) {
        updates.push(`indication = $${paramIdx++}`);
        values.push(input.indication || null);
        changedFields.push('indication');
      }

      if (input.findings !== undefined && input.findings !== existing.findings) {
        updates.push(`findings = $${paramIdx++}`);
        values.push(input.findings || null);
        changedFields.push('findings');
      }

      if (input.impression !== undefined && input.impression !== existing.impression) {
        updates.push(`impression = $${paramIdx++}`);
        values.push(input.impression || null);
        changedFields.push('impression');
      }

      if (input.sourceType !== undefined && input.sourceType !== existing.source_type) {
        updates.push(`source_type = $${paramIdx++}`);
        values.push(input.sourceType || null);
        changedFields.push('source_type');
      }

      if (input.sourceName !== undefined && input.sourceName !== existing.source_name) {
        updates.push(`source_name = $${paramIdx++}`);
        values.push(input.sourceName || null);
        changedFields.push('source_name');
      }

      if (input.clinicianRelevance !== undefined && input.clinicianRelevance !== existing.clinician_relevance) {
        updates.push(`clinician_relevance = $${paramIdx++}`);
        values.push(input.clinicianRelevance || null);
        changedFields.push('clinician_relevance');
      }

      if (input.attachment !== undefined) {
        updates.push(`attachment = $${paramIdx++}`);
        values.push(input.attachment ? JSON.stringify(input.attachment) : null);
        changedFields.push('attachment');
      }

      let updatedRow: InvestigationDbRow;

      if (updates.length > 0) {
        values.push(id, caseId, workspaceId);
        const updateSql = `
          UPDATE clinical_investigations
          SET ${updates.join(', ')}
          WHERE id = $${paramIdx++} AND case_id = $${paramIdx++} AND workspace_id = $${paramIdx++}
          RETURNING *
        `;
        const res = await this.db.query<InvestigationDbRow>(updateSql, values);
        updatedRow = res.rows[0];
      } else {
        updatedRow = existing;
      }

      // Record audit event
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'UPDATE',
        entityType: 'clinical_investigation',
        entityId: id,
        patientId: parentCase.patient_id,
        caseId,
        changedFields: changedFields.length > 0 ? changedFields : undefined,
        reason: undefined,
        metadata: {
          category: updatedRow.category,
          modality: updatedRow.modality,
          name: updatedRow.name,
        },
      });

      await this.db.query('COMMIT');
      return mapInvestigationRow(updatedRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Archives a clinical investigation (governed soft deletion).
   * Locks parent case first, then investigation row.
   * If already archived, rejects with 400.
   * Emits 'SOFT_DELETE' audit event in the same transaction.
   */
  async archiveInvestigation(
    context: AuthContext,
    caseId: string,
    id: string,
    input: ArchiveInvestigationInput
  ): Promise<ClinicalInvestigation> {
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
        const err: any = new Error('Cannot archive investigation: Case is archived and read-only');
        err.statusCode = 422;
        throw err;
      }

      // 2. Lock investigation row
      const invRes = await this.db.query<InvestigationDbRow>(
        `SELECT * FROM clinical_investigations WHERE id = $1 AND case_id = $2 AND workspace_id = $3 FOR UPDATE`,
        [id, caseId, workspaceId]
      );

      if (invRes.rows.length === 0) {
        const err: any = new Error('Investigation not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = invRes.rows[0];

      // Rejection if already archived (Scenario 19: 400 Bad Request)
      if (existing.is_archived) {
        const err: any = new Error('Investigation is already archived');
        err.statusCode = 400;
        throw err;
      }

      // 3. Mark archived
      const updateSql = `
        UPDATE clinical_investigations
        SET
          is_archived = true,
          archived_at = clock_timestamp(),
          archived_by = $1,
          archive_reason = $2
        WHERE id = $3 AND case_id = $4 AND workspace_id = $5
        RETURNING *
      `;

      const res = await this.db.query<InvestigationDbRow>(updateSql, [
        JSON.stringify(actor),
        input.reason,
        id,
        caseId,
        workspaceId,
      ]);

      const archivedRow = res.rows[0];

      // 4. Record audit event with action 'SOFT_DELETE'
      await recordAuditEvent(this.db, {
        workspaceId,
        actor,
        action: 'SOFT_DELETE',
        entityType: 'clinical_investigation',
        entityId: id,
        patientId: parentCase.patient_id,
        caseId,
        changedFields: ['is_archived', 'archived_at', 'archived_by', 'archive_reason'],
        reason: input.reason,
        metadata: {
          name: existing.name,
          modality: existing.modality,
        },
      });

      await this.db.query('COMMIT');
      return mapInvestigationRow(archivedRow);
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
