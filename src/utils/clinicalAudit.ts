import {
  AuditActionType,
  AuditableEntityType,
  AuditActor,
  ClinicalAuditEvent,
  ClinicalNoteAmendment,
  SessionTreatmentDelivery,
  TreatmentSelection,
  TreatmentEvidenceLink,
  ConditionEvidenceLink,
  EvidenceItem,
  User,
  Case,
  CaseArchiveReason,
  SubjectiveAssessment,
  ObjectiveAssessment,
  ClinicalInvestigation,
  ClinicalProblem,
  ClinicalGoal,
  TreatmentPlan,
  ClinicalSession,
  ProgressRecord,
  ProgressMeasurement,
  CaseDischargeRecord,
} from '../types';

/**
 * Stage 13: Clinical Audit Utility Functions
 * Pure, deterministic functions for generating, ordering, validating, and managing clinical audit entries.
 * Does not mutate records, does not write to localStorage directly, does not execute network calls.
 */

/**
 * Generate a collision-resistant audit event ID within a PhysioCase workspace.
 * Format: ae_<timestamp_ms>_<sequence>_<random6hex>
 */
export function generateAuditId(sequence: number): string {
  const ts = Date.now();
  const rand = Math.random().toString(16).substring(2, 8).padEnd(6, '0');
  return `ae_${ts}_${sequence}_${rand}`;
}

/**
 * Calculate the next monotonic sequence number based on existing audit events.
 * Returns max(sequence) + 1, or 1 if empty.
 */
export function getNextSequence(existingEvents: ClinicalAuditEvent[]): number {
  if (!existingEvents || existingEvents.length === 0) {
    return 1;
  }
  let maxSeq = 0;
  for (const ev of existingEvents) {
    if (typeof ev.sequence === 'number' && ev.sequence > maxSeq) {
      maxSeq = ev.sequence;
    }
  }
  return maxSeq + 1;
}

/**
 * Authoritative ordering rule for audit events:
 * 1. sequence ASC
 * 2. occurredAt ASC
 * 3. id ASC
 */
export function sortAuditEvents(events: ClinicalAuditEvent[]): ClinicalAuditEvent[] {
  if (!events || !Array.isArray(events)) return [];
  return [...events].sort((a, b) => {
    const seqA = typeof a.sequence === 'number' ? a.sequence : 0;
    const seqB = typeof b.sequence === 'number' ? b.sequence : 0;
    if (seqA !== seqB) {
      return seqA - seqB;
    }

    const timeA = a.occurredAt || '';
    const timeB = b.occurredAt || '';
    const timeComp = timeA.localeCompare(timeB);
    if (timeComp !== 0) {
      return timeComp;
    }

    return (a.id || '').localeCompare(b.id || '');
  });
}

/**
 * Resolves the active audit actor based on the strict hierarchy:
 * 1. Authenticated session user
 * 2. Configured practitioner in AppSettings
 * 3. Unauthenticated local fallback
 */
export function resolveAuditActor(
  user: User | null | undefined,
  defaultPractitionerName?: string | { therapistName?: string }
): AuditActor {
  if (user && user.id) {
    const actorName = user.name || user.email || 'Authenticated User';
    return {
      id: user.id,
      name: actorName,
      role: user.title,
      source: 'authenticated_session',
    };
  }

  const nameCandidate =
    typeof defaultPractitionerName === 'string'
      ? defaultPractitionerName
      : defaultPractitionerName?.therapistName || '';
  const cleanName = nameCandidate ? nameCandidate.trim() : '';
  if (cleanName) {
    return {
      id: 'practitioner_configured',
      name: cleanName,
      source: 'settings_configured',
    };
  }

  return {
    id: 'unauthenticated_local',
    name: 'Local Practitioner',
    source: 'unauthenticated_local',
  };
}

/**
 * Detects changed property keys between two objects.
 * STRICT PRIVACY REQUIREMENT: Returns property keys ONLY.
 * NEVER returns narrative values or clinical prose.
 */
export function detectChangedFieldNames(
  oldObj: Record<string, unknown> | null | undefined,
  newObj: Record<string, unknown> | null | undefined,
  ignoredFields: string[] = ['updatedAt', 'id', 'createdAt']
): string[] {
  if (!oldObj || !newObj) {
    return [];
  }

  const changed = new Set<string>();
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (ignoredFields.includes(key)) {
      continue;
    }
    const valA = oldObj[key];
    const valB = newObj[key];

    // Simple comparison for primitives and arrays
    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        changed.add(key);
      }
    } else if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        changed.add(key);
      }
    } else if (valA !== valB) {
      changed.add(key);
    }
  }

  return Array.from(changed).sort();
}

/**
 * Creates an immutable clinical note amendment.
 * Requires non-empty clinical text and a valid taxonomy reason.
 */
export function createClinicalNoteAmendment(
  actor: AuditActor,
  reason: 'correction' | 'late_entry' | 'clinical_update',
  text: string
): ClinicalNoteAmendment {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Amendment text cannot be empty.');
  }

  const validReasons = ['correction', 'late_entry', 'clinical_update'];
  if (!validReasons.includes(reason)) {
    throw new Error(`Invalid amendment reason: "${reason}". Must be one of: ${validReasons.join(', ')}.`);
  }

  const id = `amend_${Date.now()}_${Math.random().toString(16).substring(2, 6)}`;
  return {
    id,
    amendedAt: new Date().toISOString(),
    amendedBy: actor,
    reason,
    amendmentText: trimmed,
  };
}

/**
 * Validates the structure and fields of a ClinicalAuditEvent.
 */
export function validateAuditEvent(event: unknown): { valid: boolean; error?: string } {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { valid: false, error: 'Audit event must be an object' };
  }

  const ev = event as Partial<ClinicalAuditEvent>;

  if (!ev.id || typeof ev.id !== 'string') {
    return { valid: false, error: 'Audit event missing valid id' };
  }

  if (typeof ev.sequence !== 'number' || ev.sequence < 1 || !Number.isInteger(ev.sequence)) {
    return { valid: false, error: `Audit event "${ev.id}" has invalid sequence: ${ev.sequence}` };
  }

  if (!ev.occurredAt || typeof ev.occurredAt !== 'string') {
    return { valid: false, error: `Audit event "${ev.id}" missing occurredAt timestamp` };
  }

  const validActions: AuditActionType[] = [
    'CREATE',
    'UPDATE',
    'FINALIZE',
    'AMEND',
    'SOFT_DELETE',
    'HARD_DELETE',
    'RESTORE_WORKSPACE',
    'PRUNE_AUDIT_LOG',
    'EXPORT_REPORT',
  ];

  if (!ev.action || !validActions.includes(ev.action)) {
    return { valid: false, error: `Audit event "${ev.id}" has unknown action: "${ev.action}"` };
  }

  const validEntityTypes: AuditableEntityType[] = [
    'patient',
    'patient_safety_profile',
    'case',
    'subjective_assessment',
    'objective_assessment',
    'clinical_problem',
    'clinical_goal',
    'treatment_plan',
    'treatment_selection',
    'clinical_investigation',
    'clinical_session',
    'session_treatment_delivery',
    'progress_record',
    'progress_measurement',
    'case_discharge_record',
    'workspace_settings',
  ];

  if (!ev.entityType || !validEntityTypes.includes(ev.entityType)) {
    return { valid: false, error: `Audit event "${ev.id}" has unknown entityType: "${ev.entityType}"` };
  }

  if (!ev.entityId || typeof ev.entityId !== 'string') {
    return { valid: false, error: `Audit event "${ev.id}" missing valid entityId` };
  }

  if (!ev.actor || typeof ev.actor !== 'object' || !ev.actor.id || !ev.actor.name) {
    return { valid: false, error: `Audit event "${ev.id}" missing valid actor attribution` };
  }

  const validSources = ['authenticated_session', 'settings_configured', 'unauthenticated_local'];
  if (!ev.actor.source || !validSources.includes(ev.actor.source)) {
    return { valid: false, error: `Audit event "${ev.id}" has invalid actor source: "${ev.actor.source}"` };
  }

  // Changed fields must be an array of strings if defined
  if (ev.changedFields !== undefined) {
    if (!Array.isArray(ev.changedFields) || ev.changedFields.some((f) => typeof f !== 'string')) {
      return { valid: false, error: `Audit event "${ev.id}" changedFields must be an array of strings` };
    }
  }

  return { valid: true };
}

// ==========================================
// REFERENTIAL INTEGRITY & DELETION GUARDS
// ==========================================

/**
 * Checks whether a treatment selection can safely be deleted.
 * BLOCKED if referenced by any SessionTreatmentDelivery.
 */
export function canDeleteTreatmentSelection(
  selectionId: string,
  deliveries: SessionTreatmentDelivery[]
): { allowed: boolean; reason?: string } {
  const matchingDeliveries = deliveries.filter((d) => d.treatmentSelectionId === selectionId);
  if (matchingDeliveries.length > 0) {
    return {
      allowed: false,
      reason: `Cannot delete treatment selection because it has been delivered in ${matchingDeliveries.length} clinical session encounter(s). Discontinue the treatment or document in session notes instead.`,
    };
  }
  return { allowed: true };
}

/**
 * Checks whether a treatment plan can safely be deleted.
 * BLOCKED if any child treatment selection has recorded session deliveries.
 */
export function canDeleteTreatmentPlan(
  planId: string,
  selections: TreatmentSelection[],
  deliveries: SessionTreatmentDelivery[]
): { allowed: boolean; reason?: string } {
  const childSelections = selections.filter((s) => s.treatmentPlanId === planId);
  const childIds = new Set(childSelections.map((s) => s.id));
  const activeDeliveries = deliveries.filter((d) => d.treatmentSelectionId && childIds.has(d.treatmentSelectionId));

  if (activeDeliveries.length > 0) {
    return {
      allowed: false,
      reason: `Cannot delete treatment plan because its interventions have ${activeDeliveries.length} recorded session delivery record(s). Discontinue the plan instead.`,
    };
  }
  return { allowed: true };
}

/**
 * Checks whether an evidence source can safely be deleted.
 * BLOCKED if any child evidence items are linked to active treatment selections.
 */
export function canDeleteEvidenceSource(
  sourceId: string,
  items: EvidenceItem[],
  treatmentEvidenceLinks: TreatmentEvidenceLink[],
  conditionEvidenceLinks?: ConditionEvidenceLink[]
): { allowed: boolean; reason?: string } {
  const childItems = items.filter((item) => item.sourceId === sourceId);
  const childIds = new Set(childItems.map((i) => i.id));
  const activeTxLinks = treatmentEvidenceLinks.filter((link) => childIds.has(link.evidenceItemId));

  if (activeTxLinks.length > 0) {
    return {
      allowed: false,
      reason: `Cannot delete evidence source because its items are linked to ${activeTxLinks.length} active treatment intervention(s). Remove the intervention evidence links first.`,
    };
  }

  if (conditionEvidenceLinks && conditionEvidenceLinks.length > 0) {
    const activeCondLinks = conditionEvidenceLinks.filter((link) => childIds.has(link.evidenceItemId));
    if (activeCondLinks.length > 0) {
      return {
        allowed: false,
        reason: `Cannot delete evidence source because its items are linked to ${activeCondLinks.length} active condition presentation(s). Remove the condition evidence links first.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Checks whether a clinical session can be safely deleted.
 * BLOCKED if finalized.
 */
export function canDeleteClinicalSession(session: { isFinalized?: boolean } | undefined): {
  allowed: boolean;
  reason?: string;
} {
  if (session?.isFinalized) {
    return {
      allowed: false,
      reason: 'Cannot delete a finalized Clinical Session. It is a permanent legal encounter record.',
    };
  }
  return { allowed: true };
}

/**
 * Checks whether a session treatment delivery can be safely deleted.
 * BLOCKED if its parent session is finalized.
 */
export function canDeleteSessionTreatmentDelivery(parentSession: { isFinalized?: boolean } | undefined): {
  allowed: boolean;
  reason?: string;
} {
  if (parentSession?.isFinalized) {
    return {
      allowed: false,
      reason: 'Cannot delete a treatment delivery from a finalized clinical session.',
    };
  }
  return { allowed: true };
}

/**
 * Checks whether a progress record can be safely deleted.
 * BLOCKED if finalized.
 */
export function canDeleteProgressRecord(record: { isFinalized?: boolean } | undefined): {
  allowed: boolean;
  reason?: string;
} {
  if (record?.isFinalized) {
    return {
      allowed: false,
      reason: 'Cannot delete a finalized progress review record.',
    };
  }
  return { allowed: true };
}

/**
 * Checks whether a progress measurement can be safely deleted.
 * BLOCKED if parent progress review record is finalized.
 */
export function canDeleteProgressMeasurement(parentRecord: { isFinalized?: boolean } | undefined): {
  allowed: boolean;
  reason?: string;
} {
  if (parentRecord?.isFinalized) {
    return {
      allowed: false,
      reason: 'Cannot delete a measurement from a finalized progress review record.',
    };
  }
  return { allowed: true };
}

/**
 * Checks whether a case discharge record can be safely deleted.
 * BLOCKED if finalized.
 */
export function canDeleteCaseDischargeRecord(dischargeRecord: { isFinalized?: boolean } | undefined): {
  allowed: boolean;
  reason?: string;
} {
  if (dischargeRecord?.isFinalized) {
    return {
      allowed: false,
      reason: 'Cannot delete a finalized case discharge record. It is a permanent clinical summary.',
    };
  }
  return { allowed: true };
}

// ==========================================
// CASE LIFECYCLE & ARCHIVAL PURE SELECTORS
// ==========================================

export interface CaseFootprintDataset {
  clinicalSessions: ClinicalSession[];
  sessionTreatmentDeliveries: SessionTreatmentDelivery[];
  progressRecords: ProgressRecord[];
  progressMeasurements: ProgressMeasurement[];
  caseDischargeRecords: CaseDischargeRecord[];
  subjectiveAssessments: SubjectiveAssessment[];
  objectiveAssessments: ObjectiveAssessment[];
  clinicalProblems: ClinicalProblem[];
  clinicalGoals: ClinicalGoal[];
  treatmentPlans: TreatmentPlan[];
  treatmentSelections: TreatmentSelection[];
  clinicalInvestigations: ClinicalInvestigation[];
}

export interface CaseClinicalFootprint {
  isPreClinical: boolean;
  sessionsCount: number;
  deliveriesCount: number;
  progressRecordsCount: number;
  progressMeasurementsCount: number;
  dischargeRecordsCount: number;
  hasDocumentedSubjective: boolean;
  hasDocumentedObjective: boolean;
  activeProblemsCount: number;
  activeGoalsCount: number;
  treatmentPlansCount: number;
  treatmentSelectionsCount: number;
  investigationsCount: number;
  summaryFootprintCount: number;
}

/**
 * Pure selector deriving whether a Case has a clinical footprint across authoritative collections.
 * Returns isPreClinical: true ONLY if ALL 12 clinical record conditions are satisfied.
 */
export function getCaseClinicalFootprint(
  caseItem: Case,
  dataset: CaseFootprintDataset
): CaseClinicalFootprint {
  const caseId = caseItem.id;
  const legacyCaseId = caseItem.caseId;
  const matchesCase = (cId: string | undefined) => cId === caseId || (legacyCaseId && cId === legacyCaseId);

  const sessionsCount = dataset.clinicalSessions.filter((s) => matchesCase(s.caseId)).length;
  const deliveriesCount = dataset.sessionTreatmentDeliveries.filter((d) => matchesCase(d.caseId)).length;
  const progressRecordsCount = dataset.progressRecords.filter((r) => matchesCase(r.caseId)).length;
  const progressMeasurementsCount = dataset.progressMeasurements.filter((m) => matchesCase(m.caseId)).length;
  const dischargeRecordsCount = dataset.caseDischargeRecords.filter((d) => matchesCase(d.caseId)).length;

  const subjective = dataset.subjectiveAssessments.find((s) => matchesCase(s.caseId));
  const hasDocumentedSubjective = Boolean(
    subjective &&
      (subjective.isFinalized ||
        (subjective.patientStory && subjective.patientStory.trim().length > 0) ||
        (subjective.symptomLocations && subjective.symptomLocations.length > 0))
  );

  const objective = dataset.objectiveAssessments.find((o) => matchesCase(o.caseId));
  const hasDocumentedObjective = Boolean(
    objective &&
      (objective.isFinalized ||
        (objective.findings && objective.findings.length > 0))
  );

  const activeProblemsCount = dataset.clinicalProblems.filter(
    (p) => matchesCase(p.caseId) && !p.isArchived
  ).length;

  const activeGoalsCount = dataset.clinicalGoals.filter(
    (g) => matchesCase(g.caseId) && !g.isArchived
  ).length;

  const treatmentPlansCount = dataset.treatmentPlans.filter((tp) => matchesCase(tp.caseId)).length;
  const treatmentSelectionsCount = dataset.treatmentSelections.filter((ts) => matchesCase(ts.caseId)).length;

  const investigationsCount = dataset.clinicalInvestigations.filter(
    (ci) => matchesCase(ci.caseId) && !ci.isArchived
  ).length;

  const isPreClinical =
    sessionsCount === 0 &&
    deliveriesCount === 0 &&
    progressRecordsCount === 0 &&
    progressMeasurementsCount === 0 &&
    dischargeRecordsCount === 0 &&
    !hasDocumentedSubjective &&
    !hasDocumentedObjective &&
    activeProblemsCount === 0 &&
    activeGoalsCount === 0 &&
    treatmentPlansCount === 0 &&
    treatmentSelectionsCount === 0 &&
    investigationsCount === 0;

  const summaryFootprintCount =
    sessionsCount +
    deliveriesCount +
    progressRecordsCount +
    progressMeasurementsCount +
    dischargeRecordsCount +
    (hasDocumentedSubjective ? 1 : 0) +
    (hasDocumentedObjective ? 1 : 0) +
    activeProblemsCount +
    activeGoalsCount +
    treatmentPlansCount +
    treatmentSelectionsCount +
    investigationsCount;

  return {
    isPreClinical,
    sessionsCount,
    deliveriesCount,
    progressRecordsCount,
    progressMeasurementsCount,
    dischargeRecordsCount,
    hasDocumentedSubjective,
    hasDocumentedObjective,
    activeProblemsCount,
    activeGoalsCount,
    treatmentPlansCount,
    treatmentSelectionsCount,
    investigationsCount,
    summaryFootprintCount,
  };
}

/**
 * Validates whether a case can be archived with the requested reason and notes.
 */
export function canArchiveCase(
  caseItem: Case,
  dataset: CaseFootprintDataset,
  reason: CaseArchiveReason,
  notes?: string
): { allowed: boolean; reason?: string; footprint: CaseClinicalFootprint } {
  const footprint = getCaseClinicalFootprint(caseItem, dataset);

  if (caseItem.isArchived) {
    return {
      allowed: false,
      reason: 'This case is already archived.',
      footprint,
    };
  }

  // Reason eligibility based on clinical footprint
  if (footprint.isPreClinical) {
    const validPreClinicalReasons: CaseArchiveReason[] = [
      'created_in_error',
      'duplicate_entry',
      'wrong_patient',
      'test_or_demo',
    ];
    if (!validPreClinicalReasons.includes(reason)) {
      return {
        allowed: false,
        reason: `Reason "${reason}" is not permitted for pre-clinical cases. Only clerical/pre-clinical reasons are allowed.`,
        footprint,
      };
    }
  } else {
    // Documented clinical case
    const prohibitedDocumentedReasons: CaseArchiveReason[] = [
      'created_in_error',
      'test_or_demo',
    ];
    if (prohibitedDocumentedReasons.includes(reason)) {
      return {
        allowed: false,
        reason: `Documented clinical cases cannot be archived as "${reason}". Clinical records exist and must be archived using care discontinuation, transfer, duplicate, wrong patient, or administrative closure.`,
        footprint,
      };
    }
  }

  // Mandatory notes check
  const requiresNotes =
    reason === 'wrong_patient' ||
    reason === 'administrative_closure' ||
    reason === 'duplicate_entry' ||
    !footprint.isPreClinical;

  if (requiresNotes && (!notes || notes.trim().length === 0)) {
    return {
      allowed: false,
      reason: `Explanatory archive notes are required when archiving with reason "${reason}".`,
      footprint,
    };
  }

  return { allowed: true, footprint };
}

// ==========================================
// 24-COLLECTION LOCKED DELETION GOVERNANCE MATRIX
// ==========================================

export type DeletionGovernanceCategory =
  | 'NEVER_DELETE'
  | 'SOFT_DELETE'
  | 'FINALIZATION_BLOCKED'
  | 'DEPENDENCY_BLOCKED'
  | 'HARD_DELETE_ALLOWED';

export interface CollectionGovernanceRule {
  collection: string;
  category: DeletionGovernanceCategory;
  description: string;
  softDeleteFields?: string[];
}

export const WORKSPACE_24_COLLECTION_DELETION_MATRIX: Record<string, CollectionGovernanceRule> = {
  patients: {
    collection: 'patients',
    category: 'NEVER_DELETE',
    description: 'Patient master records are permanent clinical index records and must never be deleted.',
  },
  cases: {
    collection: 'cases',
    category: 'NEVER_DELETE',
    description: 'Care episode cases are permanent clinical charts and must never be deleted.',
  },
  workspaceSettings: {
    collection: 'workspaceSettings',
    category: 'NEVER_DELETE',
    description: 'Workspace configuration and clinic branding cannot be destroyed.',
  },
  subjectiveAssessments: {
    collection: 'subjectiveAssessments',
    category: 'NEVER_DELETE',
    description: 'Subjective evaluations are permanent legal narratives; supported via finalization and amendments only.',
  },
  clinicalThreads: {
    collection: 'clinicalThreads',
    category: 'NEVER_DELETE',
    description: 'Clinical symptom threads track longitudinal journey continuity and are permanent.',
  },
  objectiveAssessments: {
    collection: 'objectiveAssessments',
    category: 'NEVER_DELETE',
    description: 'Objective physical exams are permanent clinical baseline data; finalize and amend only.',
  },
  outcomeMeasureDefinitions: {
    collection: 'outcomeMeasureDefinitions',
    category: 'NEVER_DELETE',
    description: 'Standard clinical outcome definitions cannot be deleted to preserve historic scoring semantics.',
  },
  auditEvents: {
    collection: 'auditEvents',
    category: 'NEVER_DELETE',
    description: 'Clinical audit ledger is append-only and immutable. Historical pruning leaves a cryptographic anchor event.',
  },

  clinicalProblems: {
    collection: 'clinicalProblems',
    category: 'SOFT_DELETE',
    description: 'Clinical problems support governed soft deletion with actor attribution and rationale.',
    softDeleteFields: ['isArchived', 'archivedAt', 'archivedBy', 'archiveReason'],
  },
  clinicalGoals: {
    collection: 'clinicalGoals',
    category: 'SOFT_DELETE',
    description: 'Clinical goals support governed soft deletion with actor attribution and rationale.',
    softDeleteFields: ['isArchived', 'archivedAt', 'archivedBy', 'archiveReason'],
  },
  clinicalInvestigations: {
    collection: 'clinicalInvestigations',
    category: 'SOFT_DELETE',
    description: 'Radiology and diagnostic reports support governed soft deletion with audit provenance.',
    softDeleteFields: ['isArchived', 'archivedAt', 'archivedBy', 'archiveReason'],
  },

  clinicalSessions: {
    collection: 'clinicalSessions',
    category: 'FINALIZATION_BLOCKED',
    description: 'Clinical sessions can be removed during drafting, but cannot be deleted once finalized.',
  },
  sessionTreatmentDeliveries: {
    collection: 'sessionTreatmentDeliveries',
    category: 'FINALIZATION_BLOCKED',
    description: 'Intervention deliveries cannot be deleted if the parent clinical session is finalized.',
  },
  progressRecords: {
    collection: 'progressRecords',
    category: 'FINALIZATION_BLOCKED',
    description: 'Progress review records cannot be deleted once finalized.',
  },
  progressMeasurements: {
    collection: 'progressMeasurements',
    category: 'FINALIZATION_BLOCKED',
    description: 'Progress measurements cannot be deleted if parent review is finalized.',
  },
  caseDischargeRecords: {
    collection: 'caseDischargeRecords',
    category: 'FINALIZATION_BLOCKED',
    description: 'Formal discharge records cannot be deleted once finalized.',
  },

  treatmentPlans: {
    collection: 'treatmentPlans',
    category: 'DEPENDENCY_BLOCKED',
    description: 'Deletion is blocked if child treatment selections have recorded session deliveries.',
  },
  treatmentSelections: {
    collection: 'treatmentSelections',
    category: 'DEPENDENCY_BLOCKED',
    description: 'Deletion is blocked if referenced by any session treatment delivery records.',
  },
  evidenceSources: {
    collection: 'evidenceSources',
    category: 'DEPENDENCY_BLOCKED',
    description: 'Deletion is blocked if child evidence items are linked to active treatments or condition pathways.',
  },

  treatmentEvidenceLinks: {
    collection: 'treatmentEvidenceLinks',
    category: 'HARD_DELETE_ALLOWED',
    description: 'Relational link unlinking permitted with explicit audit event.',
  },
  treatmentConditionLinks: {
    collection: 'treatmentConditionLinks',
    category: 'HARD_DELETE_ALLOWED',
    description: 'Relational link unlinking permitted with explicit audit event.',
  },
  evidenceItems: {
    collection: 'evidenceItems',
    category: 'HARD_DELETE_ALLOWED',
    description: 'Hard delete permitted with cascade cleanup to condition and treatment link tables.',
  },
  conditionPresentations: {
    collection: 'conditionPresentations',
    category: 'HARD_DELETE_ALLOWED',
    description: 'Hard delete permitted with cascade cleanup to evidence and treatment link tables.',
  },
  conditionEvidenceLinks: {
    collection: 'conditionEvidenceLinks',
    category: 'HARD_DELETE_ALLOWED',
    description: 'Relational link unlinking permitted with explicit audit event.',
  },
};

// ==========================================
// TRANSIENT AUDIT RETRY QUEUE & ENTITY-FIRST PROTOCOL
// ==========================================

export class AuditRetryQueue {
  private queue: ClinicalAuditEvent[] = [];

  enqueue(event: ClinicalAuditEvent): void {
    if (!this.queue.some((e) => e.id === event.id)) {
      this.queue.push(event);
    }
  }

  dequeue(): ClinicalAuditEvent | undefined {
    return this.queue.shift();
  }

  peek(): ClinicalAuditEvent[] {
    return [...this.queue];
  }

  get length(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}

export const globalAuditRetryQueue = new AuditRetryQueue();

export interface EntityMutationResult<T> {
  success: boolean;
  entity?: T;
  auditEvent?: ClinicalAuditEvent;
  error?: string;
  auditStorageWarning?: string | null;
  heldInRetryQueue?: boolean;
}

/**
 * Executes a mutation following the locked Entity-First Protocol:
 * 1. Entity write succeeds + audit write succeeds:
 *    - state update -> entity persistence -> audit event creation -> audit persistence
 * 2. Entity write fails:
 *    - entity persistence fails -> state rollback -> NO audit event
 * 3. Entity write succeeds + audit write fails:
 *    - entity persists -> audit event remains available in transient retry queue -> prominent storage warning
 */
export function executeEntityWithAuditProtocol<T>(params: {
  entityWrite: () => T;
  rollbackEntity: () => void;
  createAuditEvent: (savedEntity: T) => ClinicalAuditEvent;
  persistAudit: (event: ClinicalAuditEvent) => void;
  onAuditFailureWarning?: (warning: string) => void;
  retryQueue?: AuditRetryQueue;
}): EntityMutationResult<T> {
  let savedEntity: T;
  try {
    savedEntity = params.entityWrite();
  } catch (err: any) {
    // Entity persistence fails -> rollback -> NO audit event
    params.rollbackEntity();
    return {
      success: false,
      error: `Entity persistence failed: ${err?.message || String(err)}`,
    };
  }

  const auditEvent = params.createAuditEvent(savedEntity);
  const queue = params.retryQueue || globalAuditRetryQueue;

  try {
    params.persistAudit(auditEvent);
    return {
      success: true,
      entity: savedEntity,
      auditEvent,
    };
  } catch (auditErr: any) {
    // Entity write succeeds + audit write fails:
    // Entity persists -> audit event held in transient retry queue -> prominent warning
    queue.enqueue(auditEvent);
    const warning = `Audit persistence failed (${auditErr?.message || 'Storage quota exceeded'}). Event retained in transient retry queue (${queue.length} queued).`;
    if (params.onAuditFailureWarning) {
      params.onAuditFailureWarning(warning);
    }
    return {
      success: true,
      entity: savedEntity,
      auditEvent,
      heldInRetryQueue: true,
      auditStorageWarning: warning,
    };
  }
}
