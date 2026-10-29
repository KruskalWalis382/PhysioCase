import {
  AuthoritativeWorkspaceDataset,
  PhysioCaseWorkspaceBackupEnvelope,
  WorkspaceBackupSummary,
  BackupValidationResult,
  BackupValidationError,
  RestoreExecutionResult,
} from '../types/backup';
import { ClinicalAuditEvent } from '../types';
import { generateAuditId, getNextSequence, validateAuditEvent } from './clinicalAudit';

/**
 * The exact 24 authoritative LocalStorage keys matching ClinicalContext.tsx.
 */
export const WORKSPACE_STORAGE_KEYS = {
  patients: 'physiocase_workspace_patients',
  cases: 'physiocase_workspace_cases',
  settings: 'physiocase_workspace_settings',
  subjectiveAssessments: 'physiocase_workspace_subjective_assessments',
  clinicalThreads: 'physiocase_workspace_clinical_threads',
  objectiveAssessments: 'physiocase_workspace_objective_assessments',
  clinicalProblems: 'physiocase_workspace_clinical_problems',
  clinicalGoals: 'physiocase_workspace_clinical_goals',
  treatmentPlans: 'physiocase_workspace_treatment_plans',
  treatmentSelections: 'physiocase_workspace_treatment_selections',
  treatmentEvidenceLinks: 'physiocase_workspace_treatment_evidence_links',
  treatmentConditionLinks: 'physiocase_workspace_treatment_condition_links',
  evidenceSources: 'physiocase_workspace_evidence_sources',
  evidenceItems: 'physiocase_workspace_evidence_items',
  conditionPresentations: 'physiocase_workspace_condition_presentations',
  conditionEvidenceLinks: 'physiocase_workspace_condition_evidence_links',
  clinicalInvestigations: 'physiocase_workspace_clinical_investigations',
  clinicalSessions: 'physiocase_workspace_clinical_sessions',
  sessionTreatmentDeliveries: 'physiocase_workspace_session_treatment_deliveries',
  outcomeMeasureDefinitions: 'physiocase_workspace_outcome_measure_definitions',
  progressRecords: 'physiocase_workspace_progress_records',
  progressMeasurements: 'physiocase_workspace_progress_measurements',
  caseDischargeRecords: 'physiocase_workspace_case_discharge_records',
  auditEvents: 'physiocase_workspace_audit_events',
} as const;

export const AUTHORITATIVE_COLLECTION_NAMES = [
  'patients',
  'cases',
  'settings',
  'subjectiveAssessments',
  'clinicalThreads',
  'objectiveAssessments',
  'clinicalProblems',
  'clinicalGoals',
  'treatmentPlans',
  'treatmentSelections',
  'treatmentEvidenceLinks',
  'treatmentConditionLinks',
  'evidenceSources',
  'evidenceItems',
  'conditionPresentations',
  'conditionEvidenceLinks',
  'clinicalInvestigations',
  'clinicalSessions',
  'sessionTreatmentDeliveries',
  'outcomeMeasureDefinitions',
  'progressRecords',
  'progressMeasurements',
  'caseDischargeRecords',
] as (keyof AuthoritativeWorkspaceDataset)[];

export const ALL_WORKSPACE_COLLECTION_NAMES = [
  ...AUTHORITATIVE_COLLECTION_NAMES,
  'auditEvents',
] as (keyof AuthoritativeWorkspaceDataset)[];

/**
 * Deterministic recursive JSON canonicalization.
 * Recursively sorts all object keys lexicographically while strictly preserving array order and primitive types.
 * Omits undefined object properties. Treats undefined in arrays as null.
 */
export function canonicalizeJson(val: unknown): string {
  if (val === null || val === undefined) {
    return 'null';
  }
  if (typeof val === 'boolean' || typeof val === 'number') {
    return JSON.stringify(val);
  }
  if (typeof val === 'string') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    const items = val.map((item) => (item === undefined ? 'null' : canonicalizeJson(item)));
    return `[${items.join(',')}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>).sort();
    const entries: string[] = [];
    for (const key of keys) {
      const v = (val as Record<string, unknown>)[key];
      if (v !== undefined && typeof v !== 'function' && typeof v !== 'symbol') {
        entries.push(`${JSON.stringify(key)}:${canonicalizeJson(v)}`);
      }
    }
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(val);
}

/**
 * Environment-universal SHA-256 calculation.
 * Operates cleanly in both modern Web Crypto browser environments and Node.js test runners.
 */
export async function computeSha256(canonicalStr: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalStr);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle && typeof globalThis.crypto.subtle.digest === 'function') {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Cryptographic SHA-256 provider not available in this environment.');
}

/**
 * Computes diagnostic entity counts for the authoritative dataset.
 */
export function calculateWorkspaceSummary(dataset: AuthoritativeWorkspaceDataset): WorkspaceBackupSummary {
  const patientCount = dataset.patients?.length || 0;
  const caseCount = dataset.cases?.length || 0;
  const sessionCount = dataset.clinicalSessions?.length || 0;
  const problemCount = dataset.clinicalProblems?.length || 0;
  const measurementCount = dataset.progressMeasurements?.length || 0;
  const investigationCount = dataset.clinicalInvestigations?.length || 0;
  const auditEventCount = dataset.auditEvents?.length || 0;

  const totalEntityCount =
    patientCount +
    caseCount +
    sessionCount +
    problemCount +
    measurementCount +
    investigationCount +
    auditEventCount +
    (dataset.subjectiveAssessments?.length || 0) +
    (dataset.clinicalThreads?.length || 0) +
    (dataset.objectiveAssessments?.length || 0) +
    (dataset.clinicalGoals?.length || 0) +
    (dataset.treatmentPlans?.length || 0) +
    (dataset.treatmentSelections?.length || 0) +
    (dataset.treatmentEvidenceLinks?.length || 0) +
    (dataset.treatmentConditionLinks?.length || 0) +
    (dataset.evidenceSources?.length || 0) +
    (dataset.evidenceItems?.length || 0) +
    (dataset.conditionPresentations?.length || 0) +
    (dataset.conditionEvidenceLinks?.length || 0) +
    (dataset.sessionTreatmentDeliveries?.length || 0) +
    (dataset.outcomeMeasureDefinitions?.length || 0) +
    (dataset.progressRecords?.length || 0) +
    (dataset.caseDischargeRecords?.length || 0) +
    1; // Settings object

  return {
    patientCount,
    caseCount,
    sessionCount,
    problemCount,
    measurementCount,
    investigationCount,
    auditEventCount,
    totalEntityCount,
  };
}

/**
 * Creates the canonical backup envelope from an authoritative workspace dataset.
 * Checksum covers ONLY the recursively canonicalized dataset payload.
 */
export async function createWorkspaceBackupEnvelope(
  dataset: AuthoritativeWorkspaceDataset,
  appVersion = '1.0.0',
  schemaVersion?: '1.0' | '1.1'
): Promise<PhysioCaseWorkspaceBackupEnvelope> {
  const summary = calculateWorkspaceSummary(dataset);
  const now = new Date();
  const backupId = `bkp_${now.getTime()}_${Math.random().toString(36).substring(2, 8)}`;
  const exportedAt = now.toISOString();

  const version: '1.0' | '1.1' =
    schemaVersion ?? (dataset.auditEvents !== undefined ? '1.1' : '1.0');

  // Canonicalize dataset only
  const canonicalDataset = canonicalizeJson(dataset);
  const checksum = await computeSha256(canonicalDataset);

  return {
    format: 'physiocase-workspace-backup',
    schemaVersion: version,
    application: 'PhysioCase',
    applicationVersion: appVersion,
    backupId,
    exportedAt,
    integrity: {
      algorithm: 'SHA-256',
      checksum,
    },
    summary,
    dataset,
  };
}

/**
 * Triggers a client-side browser download of the backup envelope as a JSON file.
 */
export function downloadWorkspaceBackupFile(envelope: PhysioCaseWorkspaceBackupEnvelope): void {
  const jsonString = JSON.stringify(envelope, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const timestamp = envelope.exportedAt.replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const filename = `physiocase-workspace-backup-${timestamp}.json`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Strict Pre-Restore Validation Pipeline (Tiers 1 through 8).
 * Pure, fail-closed validation. Catches syntax, format, checksum, structural, and referential errors.
 */
export async function validateWorkspaceBackup(rawJson: string): Promise<BackupValidationResult> {
  const errors: BackupValidationError[] = [];
  const warnings: string[] = [];

  // Tier 1: JSON syntax
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: any) {
    return {
      valid: false,
      errors: [
        {
          code: 'ERR_INVALID_JSON',
          message: `Malformed JSON: ${err.message || 'Syntax error'}`,
        },
      ],
      warnings: [],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: [
        {
          code: 'ERR_INVALID_STRUCTURE',
          message: 'Backup file must contain a root JSON object envelope.',
        },
      ],
      warnings: [],
    };
  }

  // Tier 2: Format discrimination
  if (parsed.format === 'physiocase-case-archive') {
    return {
      valid: false,
      errors: [
        {
          code: 'ERR_WRONG_FORMAT',
          message:
            'The selected file is a Stage 8 Case Clinical Archive, not a full workspace backup. It cannot be used to restore the workspace.',
        },
      ],
      warnings: [],
    };
  }

  if (parsed.format === 'physiocase-longitudinal-summary') {
    return {
      valid: false,
      errors: [
        {
          code: 'ERR_WRONG_FORMAT',
          message:
            'The selected file is a Stage 11 Longitudinal Patient Report, not a full workspace backup. It cannot be used to restore the workspace.',
        },
      ],
      warnings: [],
    };
  }

  if (parsed.format !== 'physiocase-workspace-backup') {
    return {
      valid: false,
      errors: [
        {
          code: 'ERR_WRONG_FORMAT',
          message: `Unrecognized file format: "${parsed.format || 'unknown'}". Expected "physiocase-workspace-backup".`,
        },
      ],
      warnings: [],
    };
  }

  // Tier 3: Schema version compatibility
  if (parsed.schemaVersion !== '1.0' && parsed.schemaVersion !== '1.1') {
    return {
      valid: false,
      errors: [
        {
          code: 'ERR_UNSUPPORTED_VERSION',
          message: `Unsupported schema version: "${parsed.schemaVersion}". This version of PhysioCase supports schemas "1.0" and "1.1".`,
        },
      ],
      warnings: [],
    };
  }

  // Tier 4: Envelope metadata
  if (!parsed.backupId || typeof parsed.backupId !== 'string') {
    errors.push({ code: 'ERR_INVALID_STRUCTURE', message: 'Missing or invalid "backupId" in backup envelope.' });
  }
  if (!parsed.exportedAt || typeof parsed.exportedAt !== 'string') {
    errors.push({ code: 'ERR_INVALID_STRUCTURE', message: 'Missing or invalid "exportedAt" in backup envelope.' });
  }
  if (!parsed.integrity || typeof parsed.integrity !== 'object' || parsed.integrity.algorithm !== 'SHA-256' || typeof parsed.integrity.checksum !== 'string') {
    errors.push({ code: 'ERR_INVALID_STRUCTURE', message: 'Missing or invalid "integrity" SHA-256 block in backup envelope.' });
  }
  if (!parsed.dataset || typeof parsed.dataset !== 'object' || Array.isArray(parsed.dataset)) {
    return {
      valid: false,
      errors: [
        {
          code: 'ERR_MISSING_DATASET',
          message: 'Missing authoritative "dataset" object payload in backup envelope.',
        },
      ],
      warnings: [],
    };
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const envelope = parsed as PhysioCaseWorkspaceBackupEnvelope;

  // Tier 5: SHA-256 Checksum verification
  const canonicalDataset = canonicalizeJson(envelope.dataset);
  let computedChecksum = '';
  try {
    computedChecksum = await computeSha256(canonicalDataset);
  } catch (err: any) {
    return {
      valid: false,
      errors: [{ code: 'ERR_CHECKSUM_MISMATCH', message: `Checksum calculation failed: ${err.message}` }],
      warnings,
    };
  }

  if (computedChecksum.toLowerCase() !== envelope.integrity.checksum.toLowerCase()) {
    return {
      valid: false,
      errors: [
        {
          code: 'ERR_CHECKSUM_MISMATCH',
          message: `Checksum verification failed. The dataset content has been modified, corrupted, or truncated (expected: ${envelope.integrity.checksum}, computed: ${computedChecksum}).`,
        },
      ],
      warnings,
    };
  }

  // Schema 1.0 backward compatibility migration adapter: initialize auditEvents if missing
  if (envelope.schemaVersion === '1.0' && !envelope.dataset.auditEvents) {
    envelope.dataset.auditEvents = [];
    warnings.push('Workspace backup was created with schema version 1.0; initialized empty audit log.');
  }

  // Tier 6: Structural validation of all collections
  const dataset = envelope.dataset;
  if (!dataset.settings || typeof dataset.settings !== 'object') {
    errors.push({ code: 'ERR_MISSING_COLLECTION', message: 'Missing required "settings" configuration object in dataset.' });
  }

  const collectionsToCheck = envelope.schemaVersion === '1.0'
    ? AUTHORITATIVE_COLLECTION_NAMES
    : ALL_WORKSPACE_COLLECTION_NAMES;

  for (const collectionName of collectionsToCheck) {
    if (collectionName === 'settings') continue;
    const col = (dataset as any)[collectionName];
    if (!col) {
      errors.push({
        code: 'ERR_MISSING_COLLECTION',
        message: `Missing required collection "${collectionName}" in dataset.`,
        field: collectionName,
      });
    } else if (!Array.isArray(col)) {
      errors.push({
        code: 'ERR_INVALID_STRUCTURE',
        message: `Collection "${collectionName}" must be an array.`,
        field: collectionName,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Tier 7: Primary Key Uniqueness Check
  const checkUniqueIds = (items: Array<{ id?: string }>, collectionLabel: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.id || typeof item.id !== 'string') {
        errors.push({
          code: 'ERR_INVALID_STRUCTURE',
          message: `Record in "${collectionLabel}" is missing a valid string "id".`,
        });
        continue;
      }
      if (seen.has(item.id)) {
        errors.push({
          code: 'ERR_DUPLICATE_ID',
          message: `Duplicate ID "${item.id}" detected in collection "${collectionLabel}".`,
          details: { id: item.id, collection: collectionLabel },
        });
      }
      seen.add(item.id);
    }
  };

  checkUniqueIds(dataset.patients, 'patients');
  checkUniqueIds(dataset.cases, 'cases');
  checkUniqueIds(dataset.clinicalSessions, 'clinicalSessions');
  checkUniqueIds(dataset.clinicalProblems, 'clinicalProblems');
  checkUniqueIds(dataset.clinicalGoals, 'clinicalGoals');
  checkUniqueIds(dataset.treatmentPlans, 'treatmentPlans');
  checkUniqueIds(dataset.treatmentSelections, 'treatmentSelections');
  checkUniqueIds(dataset.progressRecords, 'progressRecords');
  checkUniqueIds(dataset.progressMeasurements, 'progressMeasurements');
  checkUniqueIds(dataset.clinicalInvestigations, 'clinicalInvestigations');
  checkUniqueIds(dataset.caseDischargeRecords, 'caseDischargeRecords');

  // Audit Events validation
  if (dataset.auditEvents && Array.isArray(dataset.auditEvents)) {
    checkUniqueIds(dataset.auditEvents, 'auditEvents');
    for (const ev of dataset.auditEvents) {
      const valRes = validateAuditEvent(ev);
      if (!valRes.valid) {
        errors.push({
          code: 'ERR_INVALID_AUDIT_EVENT',
          message: valRes.error || 'Invalid audit event record.',
          details: ev,
        });
      }
    }
  }

  // Tier 8: Referential Integrity / Orphan Checks
  const patientIdSet = new Set(dataset.patients.map((p) => p.id));
  const caseIdSet = new Set(dataset.cases.map((c) => c.id));
  const sessionIdSet = new Set(dataset.clinicalSessions.map((s) => s.id));
  const progressRecordIdSet = new Set(dataset.progressRecords.map((r) => r.id));

  // Cases must reference existing patients
  for (const c of dataset.cases) {
    if (c.patientId && !patientIdSet.has(c.patientId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Case "${c.caseId || c.id}" references non-existent patient ID "${c.patientId}".`,
        details: { caseId: c.id, patientId: c.patientId },
      });
    }
  }

  // Subjective assessments must reference existing cases
  for (const sub of dataset.subjectiveAssessments) {
    if (sub.caseId && !caseIdSet.has(sub.caseId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Subjective assessment "${sub.id}" references non-existent case ID "${sub.caseId}".`,
      });
    }
  }

  // Clinical threads must reference existing cases
  for (const thread of dataset.clinicalThreads) {
    if (thread.caseId && !caseIdSet.has(thread.caseId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Clinical thread "${thread.id}" references non-existent case ID "${thread.caseId}".`,
      });
    }
  }

  // Objective assessments must reference existing cases
  for (const obj of dataset.objectiveAssessments) {
    if (obj.caseId && !caseIdSet.has(obj.caseId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Objective assessment "${obj.id}" references non-existent case ID "${obj.caseId}".`,
      });
    }
  }

  // Problems must reference existing cases
  for (const prob of dataset.clinicalProblems) {
    if (prob.caseId && !caseIdSet.has(prob.caseId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Clinical problem "${prob.title || prob.id}" references non-existent case ID "${prob.caseId}".`,
      });
    }
  }

  // Goals must reference existing cases
  for (const goal of dataset.clinicalGoals) {
    if (goal.caseId && !caseIdSet.has(goal.caseId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Clinical goal "${goal.description || goal.id}" references non-existent case ID "${goal.caseId}".`,
      });
    }
  }

  // Sessions must reference existing cases
  for (const sess of dataset.clinicalSessions) {
    if (sess.caseId && !caseIdSet.has(sess.caseId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Clinical session #${sess.sessionNumber || sess.id} references non-existent case ID "${sess.caseId}".`,
      });
    }
  }

  // Session deliveries must reference existing sessions
  for (const del of dataset.sessionTreatmentDeliveries) {
    if (del.sessionId && !sessionIdSet.has(del.sessionId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Session treatment delivery "${del.id}" references non-existent session ID "${del.sessionId}".`,
      });
    }
  }

  // Progress records must reference existing cases
  for (const rec of dataset.progressRecords) {
    if (rec.caseId && !caseIdSet.has(rec.caseId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Progress record "${rec.id}" references non-existent case ID "${rec.caseId}".`,
      });
    }
  }

  // Progress measurements must reference existing progress records
  for (const m of dataset.progressMeasurements) {
    if (m.progressRecordId && !progressRecordIdSet.has(m.progressRecordId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Progress measurement "${m.id}" references non-existent progress record ID "${m.progressRecordId}".`,
      });
    }
  }

  // Discharge records must reference existing cases
  for (const dis of dataset.caseDischargeRecords) {
    if (dis.caseId && !caseIdSet.has(dis.caseId)) {
      errors.push({
        code: 'ERR_ORPHAN_RECORD',
        message: `Discharge record "${dis.id}" references non-existent case ID "${dis.caseId}".`,
      });
    }
  }

  const summary = calculateWorkspaceSummary(dataset);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    envelope: errors.length === 0 ? envelope : undefined,
    summary,
  };
}

/**
 * Pre-flight storage size estimation in bytes.
 */
export function estimateStorageSizeBytes(dataset: AuthoritativeWorkspaceDataset): number {
  let bytes = 0;
  for (const key of AUTHORITATIVE_COLLECTION_NAMES) {
    const val = (dataset as any)[key];
    const str = JSON.stringify(val || (key === 'settings' ? {} : []));
    bytes += str.length * 2; // UTF-16 character byte estimate
  }
  return bytes;
}

/**
 * Executes full replace restore with staged sequential writes and best-effort rollback.
 * Terminology: Fail-closed validation with best-effort rollback protection.
 * NOT described as atomic or transactional.
 */
export async function executeReplaceRestore(
  candidateEnvelope: PhysioCaseWorkspaceBackupEnvelope,
  activeDataset: AuthoritativeWorkspaceDataset,
  onRehydrate: (dataset: AuthoritativeWorkspaceDataset) => void,
  storageOverride?: Storage
): Promise<RestoreExecutionResult> {
  const targetStorage = storageOverride || (typeof window !== 'undefined' ? window.localStorage : undefined);

  if (!targetStorage) {
    return {
      success: false,
      error: 'LocalStorage persistence is not available in this environment.',
    };
  }

  // 1. Pre-flight capacity check (~4.8MB safety limit)
  const candidateBytes = estimateStorageSizeBytes(candidateEnvelope.dataset);
  if (candidateBytes > 4.8 * 1024 * 1024) {
    return {
      success: false,
      error: `Storage capacity warning: Candidate dataset size (${(candidateBytes / 1024 / 1024).toFixed(2)} MB) approaches or exceeds browser LocalStorage limits. Restore aborted before modifying workspace.`,
    };
  }

  // 2. Snapshot current active database in memory
  const rollbackSnapshot: AuthoritativeWorkspaceDataset = {
    settings: { ...activeDataset.settings },
    patients: activeDataset.patients.map((p) => ({ ...p })),
    cases: activeDataset.cases.map((c) => ({ ...c })),
    subjectiveAssessments: activeDataset.subjectiveAssessments.map((s) => ({ ...s })),
    clinicalThreads: activeDataset.clinicalThreads.map((t) => ({ ...t })),
    objectiveAssessments: activeDataset.objectiveAssessments.map((o) => ({ ...o })),
    clinicalProblems: activeDataset.clinicalProblems.map((p) => ({ ...p })),
    clinicalGoals: activeDataset.clinicalGoals.map((g) => ({ ...g })),
    treatmentPlans: activeDataset.treatmentPlans.map((tp) => ({ ...tp })),
    treatmentSelections: activeDataset.treatmentSelections.map((ts) => ({ ...ts })),
    treatmentEvidenceLinks: activeDataset.treatmentEvidenceLinks.map((tel) => ({ ...tel })),
    treatmentConditionLinks: activeDataset.treatmentConditionLinks.map((tcl) => ({ ...tcl })),
    evidenceSources: activeDataset.evidenceSources.map((es) => ({ ...es })),
    evidenceItems: activeDataset.evidenceItems.map((ei) => ({ ...ei })),
    conditionPresentations: activeDataset.conditionPresentations.map((cp) => ({ ...cp })),
    conditionEvidenceLinks: activeDataset.conditionEvidenceLinks.map((cel) => ({ ...cel })),
    clinicalInvestigations: activeDataset.clinicalInvestigations.map((ci) => ({ ...ci })),
    clinicalSessions: activeDataset.clinicalSessions.map((cs) => ({ ...cs })),
    sessionTreatmentDeliveries: activeDataset.sessionTreatmentDeliveries.map((std) => ({ ...std })),
    outcomeMeasureDefinitions: activeDataset.outcomeMeasureDefinitions.map((omd) => ({ ...omd })),
    progressRecords: activeDataset.progressRecords.map((pr) => ({ ...pr })),
    progressMeasurements: activeDataset.progressMeasurements.map((pm) => ({ ...pm })),
    caseDischargeRecords: activeDataset.caseDischargeRecords.map((cdr) => ({ ...cdr })),
    auditEvents: (activeDataset.auditEvents || []).map((ae) => ({ ...ae })),
  };

  const candidateDataset = candidateEnvelope.dataset;

  // Schema 1.0 adaptation
  if (candidateEnvelope.schemaVersion === '1.0' && !candidateDataset.auditEvents) {
    candidateDataset.auditEvents = [];
  }

  // Append RESTORE_WORKSPACE audit event to candidate dataset before persistence
  const currentAuditEvents = [...(candidateDataset.auditEvents || [])];
  const nextSeq = getNextSequence(currentAuditEvents);
  const restoreEvent: ClinicalAuditEvent = {
    id: generateAuditId(nextSeq),
    sequence: nextSeq,
    occurredAt: new Date().toISOString(),
    actor: {
      id: 'system_restore',
      name: 'Workspace Restore',
      source: 'unauthenticated_local',
    },
    action: 'RESTORE_WORKSPACE',
    entityType: 'workspace_settings',
    entityId: 'settings',
    metadata: {
      sourceVersion: candidateEnvelope.schemaVersion,
      restoredEventCount: (candidateDataset.auditEvents || []).length,
      notice:
        candidateEnvelope.schemaVersion === '1.0'
          ? 'Historical audit log initialized upon v1.0 import'
          : 'Restored v1.1 workspace with audit events',
    },
  };
  currentAuditEvents.push(restoreEvent);
  candidateDataset.auditEvents = currentAuditEvents;

  const writtenKeys: string[] = [];
  const collectionsToCommit =
    candidateEnvelope.schemaVersion === '1.0'
      ? AUTHORITATIVE_COLLECTION_NAMES
      : ALL_WORKSPACE_COLLECTION_NAMES;

  // 3. Sequential Commit
  try {
    for (const collectionName of collectionsToCommit) {
      const storageKey = WORKSPACE_STORAGE_KEYS[collectionName];
      const dataToPersist = (candidateDataset as any)[collectionName];
      targetStorage.setItem(storageKey, JSON.stringify(dataToPersist));
      writtenKeys.push(storageKey);
    }
  } catch (writeErr: any) {
    console.error('Sequential write failed during restore:', writeErr);

    // 4. Rollback attempt
    let rollbackSuccess = false;
    try {
      for (const collectionName of collectionsToCommit) {
        const storageKey = WORKSPACE_STORAGE_KEYS[collectionName];
        const originalData = (rollbackSnapshot as any)[collectionName];
        targetStorage.setItem(storageKey, JSON.stringify(originalData));
      }

      // Verify rollback
      let allKeysRestored = true;
      for (const collectionName of collectionsToCommit) {
        const storageKey = WORKSPACE_STORAGE_KEYS[collectionName];
        if (targetStorage.getItem(storageKey) === null) {
          allKeysRestored = false;
          break;
        }
      }
      rollbackSuccess = allKeysRestored;
    } catch (rbErr) {
      console.error('Rollback attempt itself failed:', rbErr);
      rollbackSuccess = false;
    }

    if (rollbackSuccess) {
      return {
        success: false,
        error: `Restore failed during sequential write (${writeErr.message || 'Storage error'}). Best-effort rollback succeeded: your previous workspace data was restored intact.`,
      };
    }

    // 5. Critical Recovery State
    if (typeof window !== 'undefined') {
      window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__ = {
        preRestoreSnapshot: rollbackSnapshot,
        failedCandidateBackup: candidateEnvelope,
        failedAt: new Date().toISOString(),
        error: writeErr.message || 'Fatal write failure with unverified rollback',
      };
    }

    return {
      success: false,
      error: 'CRITICAL RECOVERY STATE: Storage write failed and rollback could not be verified. An emergency in-memory snapshot has been preserved.',
      criticalRecovery: true,
    };
  }

  // 6. Post-Write Verification
  for (const collectionName of collectionsToCommit) {
    const storageKey = WORKSPACE_STORAGE_KEYS[collectionName];
    const item = targetStorage.getItem(storageKey);
    if (item === null) {
      // Trigger rollback if post-write read fails
      for (const col of collectionsToCommit) {
        const k = WORKSPACE_STORAGE_KEYS[col];
        targetStorage.setItem(k, JSON.stringify((rollbackSnapshot as any)[col]));
      }
      return {
        success: false,
        error: `Post-write verification failed: key "${storageKey}" was missing. Workspace rolled back to original state.`,
      };
    }
  }

  // 7. Application Rehydration
  onRehydrate(candidateDataset);

  return {
    success: true,
    restoredCounts: candidateEnvelope.summary,
  };
}
