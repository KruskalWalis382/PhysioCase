import {
  Patient,
  Case,
  AppSettings,
  SubjectiveAssessment,
  ClinicalThread,
  ObjectiveAssessment,
  ClinicalProblem,
  ClinicalGoal,
  TreatmentPlan,
  TreatmentSelection,
  TreatmentEvidenceLink,
  TreatmentConditionLink,
  EvidenceSource,
  EvidenceItem,
  ConditionPresentation,
  ConditionEvidenceLink,
  ClinicalInvestigation,
  ClinicalSession,
  SessionTreatmentDelivery,
  OutcomeMeasureDefinition,
  ProgressRecord,
  ProgressMeasurement,
  CaseDischargeRecord,
  ClinicalAuditEvent,
} from '../types';

/**
 * Stage 13: Authoritative Workspace Dataset
 * Represents the complete, authoritative, uncorrupted clinical database across all 24 collections.
 * Derived models, longitudinal caches, governance metrics, and presentation reports are strictly excluded.
 */
export interface AuthoritativeWorkspaceDataset {
  settings: AppSettings;
  patients: Patient[];
  cases: Case[];
  subjectiveAssessments: SubjectiveAssessment[];
  clinicalThreads: ClinicalThread[];
  objectiveAssessments: ObjectiveAssessment[];
  clinicalProblems: ClinicalProblem[];
  clinicalGoals: ClinicalGoal[];
  treatmentPlans: TreatmentPlan[];
  treatmentSelections: TreatmentSelection[];
  treatmentEvidenceLinks: TreatmentEvidenceLink[];
  treatmentConditionLinks: TreatmentConditionLink[];
  evidenceSources: EvidenceSource[];
  evidenceItems: EvidenceItem[];
  conditionPresentations: ConditionPresentation[];
  conditionEvidenceLinks: ConditionEvidenceLink[];
  clinicalInvestigations: ClinicalInvestigation[];
  clinicalSessions: ClinicalSession[];
  sessionTreatmentDeliveries: SessionTreatmentDelivery[];
  outcomeMeasureDefinitions: OutcomeMeasureDefinition[];
  progressRecords: ProgressRecord[];
  progressMeasurements: ProgressMeasurement[];
  caseDischargeRecords: CaseDischargeRecord[];
  auditEvents: ClinicalAuditEvent[];
}

/**
 * Diagnostic summary of the workspace dataset.
 */
export interface WorkspaceBackupSummary {
  patientCount: number;
  caseCount: number;
  sessionCount: number;
  problemCount: number;
  measurementCount: number;
  investigationCount: number;
  auditEventCount?: number;
  totalEntityCount: number;
}

/**
 * Stage 13: Canonical Backup Envelope
 * Format discriminator: 'physiocase-workspace-backup'
 * Schema version: '1.1' (with full backward compatibility for '1.0')
 */
export interface PhysioCaseWorkspaceBackupEnvelope {
  format: 'physiocase-workspace-backup';
  schemaVersion: '1.0' | '1.1';
  application: 'PhysioCase';
  applicationVersion: string;
  backupId: string;
  exportedAt: string;

  integrity: {
    algorithm: 'SHA-256';
    checksum: string;
  };

  summary: WorkspaceBackupSummary;

  dataset: AuthoritativeWorkspaceDataset;
}

/**
 * Validation error codes for backup file inspection.
 */
export type BackupValidationErrorCode =
  | 'ERR_INVALID_JSON'
  | 'ERR_WRONG_FORMAT'
  | 'ERR_UNSUPPORTED_VERSION'
  | 'ERR_CHECKSUM_MISMATCH'
  | 'ERR_MISSING_DATASET'
  | 'ERR_MISSING_COLLECTION'
  | 'ERR_INVALID_STRUCTURE'
  | 'ERR_DUPLICATE_ID'
  | 'ERR_ORPHAN_RECORD'
  | 'ERR_INVALID_AUDIT_EVENT'
  | 'ERR_STORAGE_QUOTA';

export interface BackupValidationError {
  code: BackupValidationErrorCode;
  message: string;
  field?: string;
  details?: unknown;
}

export interface BackupValidationResult {
  valid: boolean;
  errors: BackupValidationError[];
  warnings: string[];
  envelope?: PhysioCaseWorkspaceBackupEnvelope;
  summary?: WorkspaceBackupSummary;
}

/**
 * Future Schema Migration Adapter Interface (Deferred implementation, explicit contract)
 */
export interface BackupMigrationAdapter {
  fromVersion: string;
  toVersion: string;
  migrate: (rawDataset: unknown) => AuthoritativeWorkspaceDataset;
}

/**
 * Execution result for replace restore.
 */
export interface RestoreExecutionResult {
  success: boolean;
  restoredCounts?: WorkspaceBackupSummary;
  error?: string;
  criticalRecovery?: boolean;
}

/**
 * Global window extension for transient emergency recovery snapshot.
 * NOT a LocalStorage key, NOT a permanent cache.
 */
declare global {
  interface Window {
    __PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__?: {
      preRestoreSnapshot: AuthoritativeWorkspaceDataset;
      failedCandidateBackup: PhysioCaseWorkspaceBackupEnvelope;
      failedAt: string;
      error: string;
    };
  }
}
