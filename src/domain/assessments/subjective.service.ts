/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: SUBJECTIVE ASSESSMENT DOMAIN SERVICE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../../types/auth';
import type {
  SubjectiveAssessment,
  ClinicalNoteAmendment,
} from '../../types';
import {
  canPerformClinicalMutation,
  hasActiveMembership,
} from '../../auth/authorization';
import { recordAuditEvent, buildAuditActor } from '../audit/audit.service';
import type {
  SubjectiveAssessmentStatus,
  SaveSubjectiveInput,
  FinalizeSubjectiveInput,
  AmendSubjectiveInput,
} from './subjective.schema';

export interface SubjectiveDbRow {
  id: string;
  workspace_id: string;
  case_id: string;
  patient_id: string;
  status: SubjectiveAssessmentStatus;
  completed_at: string | null;
  is_finalized: boolean;
  finalized_at: string | null;
  finalized_by: any | null;
  amendments: any;
  patient_story: string;
  symptom_locations: any;
  symptom_descriptions: any;
  symptom_description_other: string | null;
  onset: string | null;
  date_of_onset: string | null;
  how_did_it_start: string | null;
  aggravating_factors: any;
  aggravating_factors_notes: string | null;
  easing_factors: any;
  easing_factors_notes: string | null;
  frequency: string | null;
  pain_severity: any;
  duration_after_aggravation: string | null;
  functional_difficulties: any;
  functional_difficulties_notes: string | null;
  most_important_activity: string | null;
  previous_similar_episode: string | null;
  previous_surgery: string | null;
  previous_injury: string | null;
  current_medication: string | null;
  relevant_conditions: string | null;
  previous_physiotherapy: string | null;
  safety_screening: string | null;
  safety_screening_details: string | null;
  patient_goals: string | null;
  therapist_initial_notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export function mapSubjectiveRow(row: SubjectiveDbRow): SubjectiveAssessment {
  return {
    id: row.id,
    caseId: row.case_id,
    patientId: row.patient_id,
    status: row.status,
    completedAt: row.completed_at || undefined,
    isFinalized: row.is_finalized,
    finalizedAt: row.finalized_at || undefined,
    finalizedBy: typeof row.finalized_by === 'string'
      ? JSON.parse(row.finalized_by)
      : row.finalized_by || undefined,
    amendments: typeof row.amendments === 'string'
      ? JSON.parse(row.amendments)
      : row.amendments || [],
    patientStory: row.patient_story || '',
    symptomLocations: typeof row.symptom_locations === 'string'
      ? JSON.parse(row.symptom_locations)
      : row.symptom_locations || [],
    symptomDescriptions: typeof row.symptom_descriptions === 'string'
      ? JSON.parse(row.symptom_descriptions)
      : row.symptom_descriptions || [],
    symptomDescriptionOther: row.symptom_description_other || undefined,
    onset: (row.onset as any) || undefined,
    dateOfOnset: row.date_of_onset || undefined,
    howDidItStart: row.how_did_it_start || undefined,
    aggravatingFactors: typeof row.aggravating_factors === 'string'
      ? JSON.parse(row.aggravating_factors)
      : row.aggravating_factors || [],
    aggravatingFactorsNotes: row.aggravating_factors_notes || undefined,
    easingFactors: typeof row.easing_factors === 'string'
      ? JSON.parse(row.easing_factors)
      : row.easing_factors || [],
    easingFactorsNotes: row.easing_factors_notes || undefined,
    frequency: (row.frequency as any) || undefined,
    painSeverity: typeof row.pain_severity === 'string'
      ? JSON.parse(row.pain_severity)
      : row.pain_severity || { current: 0, best: 0, worst: 0 },
    durationAfterAggravation: row.duration_after_aggravation || undefined,
    functionalDifficulties: typeof row.functional_difficulties === 'string'
      ? JSON.parse(row.functional_difficulties)
      : row.functional_difficulties || [],
    functionalDifficultiesNotes: row.functional_difficulties_notes || undefined,
    mostImportantActivity: row.most_important_activity || undefined,
    previousSimilarEpisode: row.previous_similar_episode || undefined,
    previousSurgery: row.previous_surgery || undefined,
    previousInjury: row.previous_injury || undefined,
    currentMedication: row.current_medication || undefined,
    relevantConditions: row.relevant_conditions || undefined,
    previousPhysiotherapy: row.previous_physiotherapy || undefined,
    safetyScreening: (row.safety_screening as any) || undefined,
    safetyScreeningDetails: row.safety_screening_details || undefined,
    patientGoals: row.patient_goals || undefined,
    therapistInitialNotes: row.therapist_initial_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SubjectiveAssessmentService {
  constructor(private db: PGlite) {}

  /**
   * Retrieves subjective assessment for a case.
   * If case does not exist in workspace, throws 404.
   * If case exists but no subjective assessment has been saved yet, returns null.
   * Strictly read-only; creates no database rows or audit events.
   */
  async getSubjectiveAssessment(
    context: AuthContext,
    caseId: string
  ): Promise<SubjectiveAssessment | null> {
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

    const res = await this.db.query<SubjectiveDbRow>(
      `SELECT * FROM subjective_assessments WHERE case_id = $1 AND workspace_id = $2`,
      [caseId, workspaceId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return mapSubjectiveRow(res.rows[0]);
  }

  /**
   * Saves or updates a subjective assessment draft.
   * Requires clinical mutation authority.
   * Locks parent case first, then assessment row.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async saveSubjectiveAssessment(
    context: AuthContext,
    caseId: string,
    input: SaveSubjectiveInput
  ): Promise<SubjectiveAssessment> {
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
      const assessRes = await this.db.query<SubjectiveDbRow>(
        `SELECT * FROM subjective_assessments WHERE case_id = $1 AND workspace_id = $2 FOR UPDATE`,
        [caseId, workspaceId]
      );

      let savedRow: SubjectiveDbRow;
      let auditAction: 'CREATE' | 'UPDATE';
      let changedFields: string[] | undefined;

      if (assessRes.rows.length === 0) {
        // CASE A: Initial creation
        if (input.version !== undefined) {
          const err: any = new Error(`Record version conflict: expected version ${input.version}, but no assessment exists yet`);
          err.statusCode = 409;
          throw err;
        }

        const initialStatus: SubjectiveAssessmentStatus = input.markCompleted ? 'completed' : 'in_progress';
        const completedAt = input.markCompleted ? new Date().toISOString() : null;

        const insertRes = await this.db.query<SubjectiveDbRow>(
          `INSERT INTO subjective_assessments (
            workspace_id,
            case_id,
            patient_id,
            status,
            completed_at,
            patient_story,
            symptom_locations,
            symptom_descriptions,
            symptom_description_other,
            onset,
            date_of_onset,
            how_did_it_start,
            aggravating_factors,
            aggravating_factors_notes,
            easing_factors,
            easing_factors_notes,
            frequency,
            pain_severity,
            duration_after_aggravation,
            functional_difficulties,
            functional_difficulties_notes,
            most_important_activity,
            previous_similar_episode,
            previous_surgery,
            previous_injury,
            current_medication,
            relevant_conditions,
            previous_physiotherapy,
            safety_screening,
            safety_screening_details,
            patient_goals,
            therapist_initial_notes,
            version
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10,
            $11, $12, $13::jsonb, $14, $15::jsonb, $16, $17, $18::jsonb, $19, $20::jsonb,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, 1
          ) RETURNING *`,
          [
            workspaceId,
            caseId,
            parentCase.patient_id,
            initialStatus,
            completedAt,
            input.patientStory || '',
            JSON.stringify(input.symptomLocations || []),
            JSON.stringify(input.symptomDescriptions || []),
            input.symptomDescriptionOther || null,
            input.onset || null,
            input.dateOfOnset || null,
            input.howDidItStart || null,
            JSON.stringify(input.aggravatingFactors || []),
            input.aggravatingFactorsNotes || null,
            JSON.stringify(input.easingFactors || []),
            input.easingFactorsNotes || null,
            input.frequency || null,
            JSON.stringify(input.painSeverity || { current: 0, best: 0, worst: 0 }),
            input.durationAfterAggravation || null,
            JSON.stringify(input.functionalDifficulties || []),
            input.functionalDifficultiesNotes || null,
            input.mostImportantActivity || null,
            input.previousSimilarEpisode || null,
            input.previousSurgery || null,
            input.previousInjury || null,
            input.currentMedication || null,
            input.relevantConditions || null,
            input.previousPhysiotherapy || null,
            input.safetyScreening || null,
            input.safetyScreeningDetails || null,
            input.patientGoals || null,
            input.therapistInitialNotes || null,
          ]
        );

        savedRow = insertRes.rows[0];
        auditAction = 'CREATE';
      } else {
        // CASE B: Update existing draft
        const existing = assessRes.rows[0];

        if (existing.is_finalized) {
          const err: any = new Error(
            'Cannot directly modify finalized Subjective Assessment. Finalized clinical records are legally immutable. Use amendment workflow.'
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

        const updateRes = await this.db.query<SubjectiveDbRow>(
          `UPDATE subjective_assessments SET
            status = $3,
            completed_at = $4,
            patient_story = COALESCE($5, patient_story),
            symptom_locations = COALESCE($6::jsonb, symptom_locations),
            symptom_descriptions = COALESCE($7::jsonb, symptom_descriptions),
            symptom_description_other = COALESCE($8, symptom_description_other),
            onset = COALESCE($9, onset),
            date_of_onset = COALESCE($10, date_of_onset),
            how_did_it_start = COALESCE($11, how_did_it_start),
            aggravating_factors = COALESCE($12::jsonb, aggravating_factors),
            aggravating_factors_notes = COALESCE($13, aggravating_factors_notes),
            easing_factors = COALESCE($14::jsonb, easing_factors),
            easing_factors_notes = COALESCE($15, easing_factors_notes),
            frequency = COALESCE($16, frequency),
            pain_severity = COALESCE($17::jsonb, pain_severity),
            duration_after_aggravation = COALESCE($18, duration_after_aggravation),
            functional_difficulties = COALESCE($19::jsonb, functional_difficulties),
            functional_difficulties_notes = COALESCE($20, functional_difficulties_notes),
            most_important_activity = COALESCE($21, most_important_activity),
            previous_similar_episode = COALESCE($22, previous_similar_episode),
            previous_surgery = COALESCE($23, previous_surgery),
            previous_injury = COALESCE($24, previous_injury),
            current_medication = COALESCE($25, current_medication),
            relevant_conditions = COALESCE($26, relevant_conditions),
            previous_physiotherapy = COALESCE($27, previous_physiotherapy),
            safety_screening = COALESCE($28, safety_screening),
            safety_screening_details = COALESCE($29, safety_screening_details),
            patient_goals = COALESCE($30, patient_goals),
            therapist_initial_notes = COALESCE($31, therapist_initial_notes)
          WHERE id = $1 AND workspace_id = $2
          RETURNING *`,
          [
            existing.id,
            workspaceId,
            newStatus,
            newCompletedAt,
            input.patientStory !== undefined ? input.patientStory : null,
            input.symptomLocations !== undefined ? JSON.stringify(input.symptomLocations) : null,
            input.symptomDescriptions !== undefined ? JSON.stringify(input.symptomDescriptions) : null,
            input.symptomDescriptionOther !== undefined ? input.symptomDescriptionOther : null,
            input.onset !== undefined ? input.onset : null,
            input.dateOfOnset !== undefined ? input.dateOfOnset : null,
            input.howDidItStart !== undefined ? input.howDidItStart : null,
            input.aggravatingFactors !== undefined ? JSON.stringify(input.aggravatingFactors) : null,
            input.aggravatingFactorsNotes !== undefined ? input.aggravatingFactorsNotes : null,
            input.easingFactors !== undefined ? JSON.stringify(input.easingFactors) : null,
            input.easingFactorsNotes !== undefined ? input.easingFactorsNotes : null,
            input.frequency !== undefined ? input.frequency : null,
            input.painSeverity !== undefined ? JSON.stringify(input.painSeverity) : null,
            input.durationAfterAggravation !== undefined ? input.durationAfterAggravation : null,
            input.functionalDifficulties !== undefined ? JSON.stringify(input.functionalDifficulties) : null,
            input.functionalDifficultiesNotes !== undefined ? input.functionalDifficultiesNotes : null,
            input.mostImportantActivity !== undefined ? input.mostImportantActivity : null,
            input.previousSimilarEpisode !== undefined ? input.previousSimilarEpisode : null,
            input.previousSurgery !== undefined ? input.previousSurgery : null,
            input.previousInjury !== undefined ? input.previousInjury : null,
            input.currentMedication !== undefined ? input.currentMedication : null,
            input.relevantConditions !== undefined ? input.relevantConditions : null,
            input.previousPhysiotherapy !== undefined ? input.previousPhysiotherapy : null,
            input.safetyScreening !== undefined ? input.safetyScreening : null,
            input.safetyScreeningDetails !== undefined ? input.safetyScreeningDetails : null,
            input.patientGoals !== undefined ? input.patientGoals : null,
            input.therapistInitialNotes !== undefined ? input.therapistInitialNotes : null,
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
        entityType: 'subjective_assessment',
        entityId: savedRow.id,
        patientId: parentCase.patient_id,
        caseId: parentCase.id,
        changedFields: changedFields || null,
      });

      await this.db.query('COMMIT');
      return mapSubjectiveRow(savedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Finalizes a subjective assessment, permanently locking it against direct edits.
   * Requires clinical mutation authority.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async finalizeSubjectiveAssessment(
    context: AuthContext,
    caseId: string,
    input: FinalizeSubjectiveInput
  ): Promise<SubjectiveAssessment> {
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
      const assessRes = await this.db.query<SubjectiveDbRow>(
        `SELECT * FROM subjective_assessments WHERE case_id = $1 AND workspace_id = $2 FOR UPDATE`,
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

      const updateRes = await this.db.query<SubjectiveDbRow>(
        `UPDATE subjective_assessments SET
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
        entityType: 'subjective_assessment',
        entityId: finalizedRow.id,
        patientId: parentCase.patient_id,
        caseId: parentCase.id,
        changedFields: ['isFinalized', 'finalizedAt', 'finalizedBy', 'status'],
      });

      await this.db.query('COMMIT');
      return mapSubjectiveRow(finalizedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Appends a structured clinical amendment to a finalized subjective assessment.
   * Requires clinical mutation authority.
   * Trigger enforces prior amendment immutability and content protection.
   * Atomic commit: domain mutation + audit event in single transaction.
   */
  async amendSubjectiveAssessment(
    context: AuthContext,
    caseId: string,
    input: AmendSubjectiveInput
  ): Promise<SubjectiveAssessment> {
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
      const assessRes = await this.db.query<SubjectiveDbRow>(
        `SELECT * FROM subjective_assessments WHERE case_id = $1 AND workspace_id = $2 FOR UPDATE`,
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
          'Cannot add amendment to a non-finalized Subjective Assessment. Only finalized clinical records can be amended. Edit directly instead.'
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

      const updateRes = await this.db.query<SubjectiveDbRow>(
        `UPDATE subjective_assessments SET
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
        entityType: 'subjective_assessment',
        entityId: amendedRow.id,
        patientId: parentCase.patient_id,
        caseId: parentCase.id,
        changedFields: ['amendments'],
        reason: `${input.reason}: ${input.text}`,
      });

      await this.db.query('COMMIT');
      return mapSubjectiveRow(amendedRow);
    } catch (err: any) {
      await this.db.query('ROLLBACK');
      throw err;
    }
  }
}
