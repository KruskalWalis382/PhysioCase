export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'FINALIZE'
  | 'AMEND'
  | 'SOFT_DELETE'
  | 'HARD_DELETE'
  | 'RESTORE_WORKSPACE'
  | 'PRUNE_AUDIT_LOG'
  | 'EXPORT_REPORT';

export type AuditableEntityType =
  | 'patient'
  | 'patient_safety_profile'
  | 'case'
  | 'subjective_assessment'
  | 'objective_assessment'
  | 'clinical_problem'
  | 'clinical_goal'
  | 'treatment_plan'
  | 'treatment_selection'
  | 'clinical_investigation'
  | 'clinical_session'
  | 'session_treatment_delivery'
  | 'progress_record'
  | 'progress_measurement'
  | 'case_discharge_record'
  | 'workspace_settings';

export interface AuditActor {
  id: string;
  name: string;
  role?: string;
  source:
    | 'authenticated_session'
    | 'settings_configured'
    | 'unauthenticated_local';
}

export interface ClinicalAuditEvent {
  id: string;
  sequence: number;
  occurredAt: string;
  actor: AuditActor;
  action: AuditActionType;
  entityType: AuditableEntityType;
  entityId: string;
  patientId?: string;
  caseId?: string;
  changedFields?: string[];
  reason?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ClinicalNoteAmendment {
  id: string;
  amendedAt: string;
  amendedBy: AuditActor;
  reason:
    | 'correction'
    | 'late_entry'
    | 'clinical_update';
  amendmentText: string;
}
