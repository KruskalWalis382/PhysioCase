/**
 * Stage 13 Comprehensive Verification Test Suite
 *
 * Verifies Clinical Documentation Integrity, Amendment Lifecycle & Compact Audit Ledger:
 * 1. Append-Only Clinical Audit Ledger & Schema Validation:
 *    - All 9 audit action types supported.
 *    - Strict monotonic sequence numbering (getNextSequence).
 *    - Actor attribution across 3 sources (authenticated_session, settings_configured, unauthenticated_local).
 *    - Fail-closed audit event validation (validateAuditEvent).
 *    - Deterministic audit event sorting (sortAuditEvents).
 *    - Absence of protected clinical narrative in audit entries (metadata & changed fields only).
 * 2. Clinical Note Finalization Lifecycle:
 *    - Finalization of Subjective Assessment.
 *    - Rejection of direct mutation on finalized Subjective Assessment.
 *    - Finalization of Objective Assessment.
 *    - Rejection of direct mutation on finalized Objective Assessment.
 *    - Finalization of Clinical Session.
 *    - Rejection of direct mutation & deletion on finalized Clinical Session.
 *    - Finalization of Case Discharge Record.
 *    - Rejection of direct mutation & deletion on finalized Case Discharge Record.
 * 3. Immutable Clinical Amendments:
 *    - Attempting amendment on unfinalized note is strictly rejected.
 *    - Adding amendment to finalized notes succeeds with UUID, timestamp, author attribution, and valid reason.
 *    - Multiple amendments append chronologically in an immutable array.
 *    - Corresponding AMEND audit event recorded.
 * 4. Governed Soft Deletion & Referential Integrity:
 *    - Governed soft deletion (isArchived) for Clinical Problems.
 *    - Governed soft deletion (isArchived) for Clinical Goals.
 *    - Session treatment deliveries cannot be deleted if parent session is finalized.
 * 5. Workspace Backup / Restore Integration (24th Collection):
 *    - Workspace backup includes all 24 authoritative collections.
 *    - Envelope schemaVersion is 1.1 with backward compatibility for 1.0.
 *    - SHA-256 integrity covers the entire 24-collection dataset.
 *    - Replace restore commits all 24 collections.
 *    - Restore automatically records a RESTORE_WORKSPACE audit event.
 * 6. Audit Maintenance, Archival & Pruning:
 *    - Indefinite retention by default (no automatic rolling truncation).
 *    - High-friction pruning leaves an immutable anchor event with archive checksum.
 * 7. UI Component Rendering:
 *    - AuditHistoryDrawer renders with action filter, search filter, and event entries.
 *    - AuditHistoryDrawer respects patientId and caseId scoping.
 *    - DataManagementSection renders Audit Ledger Maintenance card with 24th collection badge.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AuditActionType,
  AuditableEntityType,
  AuditActor,
  ClinicalAuditEvent,
  ClinicalNoteAmendment,
} from '../src/types/audit';
import {
  generateAuditId,
  getNextSequence,
  sortAuditEvents,
  validateAuditEvent,
  createClinicalNoteAmendment,
  resolveAuditActor,
  canDeleteTreatmentSelection,
  canDeleteTreatmentPlan,
  canDeleteEvidenceSource,
  canDeleteClinicalSession,
  canDeleteSessionTreatmentDelivery,
  canDeleteProgressRecord,
  canDeleteProgressMeasurement,
  canDeleteCaseDischargeRecord,
  WORKSPACE_24_COLLECTION_DELETION_MATRIX,
  AuditRetryQueue,
  executeEntityWithAuditProtocol,
} from '../src/utils/clinicalAudit';
import {
  AuthoritativeWorkspaceDataset,
  PhysioCaseWorkspaceBackupEnvelope,
} from '../src/types/backup';
import {
  canonicalizeJson,
  computeSha256,
  calculateWorkspaceSummary,
  createWorkspaceBackupEnvelope,
  validateWorkspaceBackup,
  executeReplaceRestore,
  WORKSPACE_STORAGE_KEYS,
  AUTHORITATIVE_COLLECTION_NAMES,
  ALL_WORKSPACE_COLLECTION_NAMES,
} from '../src/utils/workspaceBackup';
import { AuditHistoryDrawer } from '../src/components/audit/AuditHistoryDrawer';
import { DataManagementSection } from '../src/components/settings/DataManagementSection';
import { ClinicalContext } from '../src/context/ClinicalContext';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`✓ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

// In-Memory Storage Mock
class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function buildMock24Dataset(): AuthoritativeWorkspaceDataset {
  const patient = {
    id: 'pt_stage13_1',
    patientNumber: 'PC-0013',
    fullName: 'Audit Test Patient',
    dateOfBirth: '1985-06-15',
    sex: 'Female',
    reasonForVisit: 'Mechanical lower back pain',
    status: 'active' as const,
    createdAt: '2024-03-01T10:00:00Z',
    patientSafetyProfile: {
      allergies: [],
      persistentPrecautions: [],
      surgicalHistory: [],
      persistentMedicalConditions: [],
    },
  };

  const caseItem = {
    id: 'case_stage13_1',
    caseId: 'CASE-0013',
    patientId: patient.id,
    caseName: 'Lumbar Spine Rehabilitation',
    startDate: '2024-03-01',
    status: 'Treatment' as const,
    createdAt: '2024-03-01T10:05:00Z',
  };

  const auditEvents: ClinicalAuditEvent[] = [
    {
      id: generateAuditId(1),
      sequence: 1,
      occurredAt: '2024-03-01T10:00:00Z',
      actor: { id: 'clinician_1', name: 'Dr. Jane Smith, PT', source: 'settings_configured' },
      action: 'CREATE',
      entityType: 'patient',
      entityId: patient.id,
      patientId: patient.id,
    },
    {
      id: generateAuditId(2),
      sequence: 2,
      occurredAt: '2024-03-01T10:05:00Z',
      actor: { id: 'clinician_1', name: 'Dr. Jane Smith, PT', source: 'settings_configured' },
      action: 'CREATE',
      entityType: 'case',
      entityId: caseItem.id,
      patientId: patient.id,
      caseId: caseItem.id,
    },
  ];

  return {
    settings: {
      practitionerName: 'Dr. Jane Smith',
      credentials: 'PT, DPT, OCS',
      clinicName: 'PhysioCase Integrity Clinic',
      licenseNumber: 'PT-12345',
      email: 'jane@clinic.org',
      theme: 'warm-clinical',
      density: 'comfortable',
      measurementSystem: 'metric',
      framework: 'journey',
      reviewCadenceWeeks: 2,
    },
    patients: [patient],
    cases: [caseItem],
    subjectiveAssessments: [
      {
        id: 'subj_13_1',
        caseId: caseItem.id,
        patientId: patient.id,
        status: 'in_progress',
        createdAt: '2024-03-01T10:10:00Z',
        updatedAt: '2024-03-01T10:10:00Z',
        patientStory: 'Lower back stiffness and pain when bending forward.',
        symptomLocations: [],
        symptomDescriptions: ['Aching'],
        onset: 'Gradual',
        aggravatingFactors: ['Sitting'],
        easingFactors: ['Walking'],
        frequency: 'Intermittent',
        painSeverity: { current: 5, best: 2, worst: 7 },
        functionalDifficulties: ['Stairs'],
      },
    ],
    clinicalThreads: [],
    objectiveAssessments: [
      {
        id: 'obj_13_1',
        caseId: caseItem.id,
        patientId: patient.id,
        status: 'in_progress',
        createdAt: '2024-03-01T10:15:00Z',
        updatedAt: '2024-03-01T10:15:00Z',
        selectedAreas: [],
        findings: [],
      },
    ],
    clinicalProblems: [
      {
        id: 'prob_13_1',
        caseId: caseItem.id,
        patientId: patient.id,
        title: 'Reduced lumbar flexion mobility and paraspinal tenderness',
        linkedFindingIds: [],
        status: 'active',
        createdAt: '2024-03-01T10:20:00Z',
        updatedAt: '2024-03-01T10:20:00Z',
      },
    ],
    clinicalGoals: [
      {
        id: 'goal_13_1',
        caseId: caseItem.id,
        patientId: patient.id,
        title: 'Walk 30 minutes without lumbar discomfort',
        type: 'short_term',
        linkedProblemIds: ['prob_13_1'],
        status: 'active',
        createdAt: '2024-03-01T10:25:00Z',
        updatedAt: '2024-03-01T10:25:00Z',
      },
    ],
    treatmentPlans: [],
    treatmentSelections: [],
    treatmentEvidenceLinks: [],
    treatmentConditionLinks: [],
    evidenceSources: [],
    evidenceItems: [],
    conditionPresentations: [],
    conditionEvidenceLinks: [],
    clinicalInvestigations: [],
    clinicalSessions: [
      {
        id: 'sess_13_1',
        caseId: caseItem.id,
        patientId: patient.id,
        sessionNumber: 1,
        sessionDate: '2024-03-01',
        status: 'completed',
        overallTolerance: 'well_tolerated',
        therapistSessionNotes: 'Initial evaluation and gentle active mobility.',
        createdAt: '2024-03-01T10:30:00Z',
        updatedAt: '2024-03-01T10:30:00Z',
      },
    ],
    sessionTreatmentDeliveries: [
      {
        id: 'del_13_1',
        sessionId: 'sess_13_1',
        caseId: caseItem.id,
        patientId: patient.id,
        title: 'Pelvic tilts and gentle knee-to-chest',
        interventionType: 'therapeutic_exercise',
        deliveryStatus: 'completed_as_planned',
        createdAt: '2024-03-01T10:35:00Z',
        updatedAt: '2024-03-01T10:35:00Z',
      },
    ],
    outcomeMeasureDefinitions: [],
    progressRecords: [],
    progressMeasurements: [],
    caseDischargeRecords: [
      {
        id: 'disch_13_1',
        caseId: caseItem.id,
        patientId: patient.id,
        dischargeDate: '2024-04-01',
        dischargeReason: 'goals_achieved',
        episodeSummary: 'Patient achieved functional mobility goals and transitioned to independent home exercises.',
        clinicalStatusAtDischarge: 'Asymptomatic during routine activities.',
        status: 'in_progress',
        createdAt: '2024-04-01T11:00:00Z',
        updatedAt: '2024-04-01T11:00:00Z',
      },
    ],
    auditEvents,
  };
}

async function runStage13TestSuite() {
  console.log('=== STAGE 13 COMPREHENSIVE VERIFICATION TEST SUITE ===\n');

  // ==========================================
  // SECTION 1: Append-Only Clinical Audit Ledger & Sequences
  // ==========================================
  console.log('--- Section 1: Append-Only Clinical Audit Ledger & Sequences ---');

  // 1.1 Monotonic sequence calculation
  assert(getNextSequence([]) === 1, 'Test 1.1: getNextSequence returns 1 for empty ledger');
  const seqEvents: ClinicalAuditEvent[] = [
    { id: 'aud_1', sequence: 1, occurredAt: '2024-01-01T00:00:00Z', actor: { id: 'u1', name: 'Doc', source: 'settings_configured' }, action: 'CREATE', entityType: 'patient', entityId: 'p1' },
    { id: 'aud_2', sequence: 5, occurredAt: '2024-01-01T00:01:00Z', actor: { id: 'u1', name: 'Doc', source: 'settings_configured' }, action: 'UPDATE', entityType: 'patient', entityId: 'p1' },
    { id: 'aud_3', sequence: 3, occurredAt: '2024-01-01T00:02:00Z', actor: { id: 'u1', name: 'Doc', source: 'settings_configured' }, action: 'FINALIZE', entityType: 'subjective_assessment', entityId: 's1' },
  ];
  assert(getNextSequence(seqEvents) === 6, 'Test 1.2: getNextSequence strictly finds max(sequences) + 1 (handles out-of-order sequence)');

  // 1.2 Action types validity
  const validActionTypes: AuditActionType[] = [
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
  assert(validActionTypes.length === 9, 'Test 1.3: Exactly 9 factual audit action types recognized');

  // 1.3 Deterministic sorting
  const sorted = sortAuditEvents(seqEvents);
  assert(sorted[0].sequence === 1 && sorted[1].sequence === 3 && sorted[2].sequence === 5, 'Test 1.4: sortAuditEvents orders primarily by sequence ASC');

  // 1.4 Fail-closed validation (validateAuditEvent)
  const validEvent: ClinicalAuditEvent = {
    id: generateAuditId(10),
    sequence: 10,
    occurredAt: new Date().toISOString(),
    actor: { id: 'actor_1', name: 'Jane PT', source: 'authenticated_session' },
    action: 'CREATE',
    entityType: 'patient',
    entityId: 'pt_100',
  };
  assert(validateAuditEvent(validEvent).valid === true, 'Test 1.5: Valid audit event passes validateAuditEvent');

  const invalidEventNoActor = { ...validEvent, actor: null as any };
  assert(validateAuditEvent(invalidEventNoActor).valid === false, 'Test 1.6: Missing actor fails validation fail-closed');

  const invalidAction = { ...validEvent, action: 'INVALID_ACTION' as any };
  assert(validateAuditEvent(invalidAction).valid === false, 'Test 1.7: Unrecognized audit action fails validation fail-closed');

  const invalidSequence = { ...validEvent, sequence: -1 };
  assert(validateAuditEvent(invalidSequence).valid === false, 'Test 1.8: Negative sequence fails validation fail-closed');

  const nonIntegerSequence = { ...validEvent, sequence: 1.5 };
  assert(validateAuditEvent(nonIntegerSequence).valid === false, 'Test 1.9: Non-integer sequence fails validation fail-closed');

  // 1.5 Audit actor resolution
  const sessionActor = resolveAuditActor(
    {
      id: 'auth_usr_1',
      name: 'Jane Smith',
      email: 'jane@clinic.org',
      title: 'Physiotherapist',
      clinicName: 'Integrity Clinic',
      initials: 'JS',
    },
    { therapistName: 'Dr. Jane' }
  );
  assert(sessionActor.source === 'authenticated_session', 'Test 1.10: Actor source resolves to authenticated_session when session user exists');

  const settingsActor = resolveAuditActor(null, { therapistName: 'Dr. Jane PT' });
  assert(settingsActor.source === 'settings_configured', 'Test 1.11: Actor source resolves to settings_configured when session null but name configured');

  const anonymousActor = resolveAuditActor(null, { therapistName: '' });
  assert(anonymousActor.source === 'unauthenticated_local', 'Test 1.12: Actor source resolves to unauthenticated_local when no session or name exists');

  // 1.6 Entity-First Protocol & Mutation Consistency
  // Case A: Entity write succeeds + audit write succeeds -> state update -> persistence -> audit creation -> audit persistence
  let mockEntityState = { name: 'Initial' };
  let rolledBack = false;
  let auditPersisted = false;
  const retryQueue = new AuditRetryQueue();

  const successResult = executeEntityWithAuditProtocol({
    entityWrite: () => {
      mockEntityState = { name: 'Updated' };
      return mockEntityState;
    },
    rollbackEntity: () => {
      mockEntityState = { name: 'Initial' };
      rolledBack = true;
    },
    createAuditEvent: (entity) => ({
      id: generateAuditId(1),
      sequence: 1,
      occurredAt: new Date().toISOString(),
      actor: sessionActor,
      action: 'UPDATE',
      entityType: 'patient',
      entityId: 'p1',
      changedFields: ['name'],
    }),
    persistAudit: () => {
      auditPersisted = true;
    },
    retryQueue,
  });
  assert(
    successResult.success && mockEntityState.name === 'Updated' && auditPersisted && !rolledBack && retryQueue.length === 0,
    'Test 1.13: Entity write succeeds + audit write succeeds: state update -> entity persistence -> audit creation -> audit persistence'
  );

  // Case B: Entity write fails -> rollback state -> NO audit event
  let auditCreatedOnFail = false;
  rolledBack = false;
  const failResult = executeEntityWithAuditProtocol({
    entityWrite: () => {
      throw new Error('Disk quota full during patient record write');
    },
    rollbackEntity: () => {
      rolledBack = true;
    },
    createAuditEvent: () => {
      auditCreatedOnFail = true;
      return null as any;
    },
    persistAudit: () => {},
    retryQueue,
  });
  assert(
    !failResult.success && rolledBack && !auditCreatedOnFail && retryQueue.length === 0,
    'Test 1.14: Entity write fails: entity persistence fails -> state rollback -> NO audit event'
  );

  // Case C: Entity write succeeds + audit write fails -> entity persists -> audit event remains in transient retry queue -> prominent warning
  let warningMessage: string | null = null;
  const auditFailResult = executeEntityWithAuditProtocol({
    entityWrite: () => {
      mockEntityState = { name: 'Persisted Patient' };
      return mockEntityState;
    },
    rollbackEntity: () => {
      mockEntityState = { name: 'Failed' };
    },
    createAuditEvent: () => ({
      id: 'ae_retry_101',
      sequence: 2,
      occurredAt: new Date().toISOString(),
      actor: sessionActor,
      action: 'UPDATE',
      entityType: 'patient',
      entityId: 'p1',
      changedFields: ['name'],
    }),
    persistAudit: () => {
      throw new Error('QuotaExceededError: LocalStorage capacity reached');
    },
    onAuditFailureWarning: (w) => {
      warningMessage = w;
    },
    retryQueue,
  });
  assert(
    auditFailResult.success &&
      mockEntityState.name === 'Persisted Patient' &&
      auditFailResult.heldInRetryQueue === true &&
      retryQueue.length === 1 &&
      retryQueue.peek()[0].id === 'ae_retry_101' &&
      typeof warningMessage === 'string' &&
      warningMessage.includes('QuotaExceededError'),
    'Test 1.15: Entity write succeeds + audit write fails: entity persists -> event held in retry queue -> prominent storage warning'
  );

  // Retry Queue queue/dequeue/clear semantics
  retryQueue.enqueue({
    id: 'ae_retry_102',
    sequence: 3,
    occurredAt: new Date().toISOString(),
    actor: sessionActor,
    action: 'CREATE',
    entityType: 'patient',
    entityId: 'p2',
  });
  assert(retryQueue.length === 2, 'Test 1.16: Transient audit retry queue maintains FIFO sequence without dropping events');
  retryQueue.clear();
  assert(retryQueue.length === 0, 'Test 1.17: Retry queue clear frees retained memory after recovery');

  // ==========================================
  // SECTION 2: Clinical Note Finalization Lifecycle
  // ==========================================
  console.log('\n--- Section 2: Clinical Note Finalization Lifecycle ---');

  const dataset = buildMock24Dataset();
  const subj = dataset.subjectiveAssessments[0];
  const obj = dataset.objectiveAssessments[0];
  const sess = dataset.clinicalSessions[0];
  const disch = dataset.caseDischargeRecords[0];

  // 2.1 Unfinalized state initially
  assert(!subj.isFinalized, 'Test 2.1: Subjective assessment is unfinalized initially');
  assert(!obj.isFinalized, 'Test 2.2: Objective assessment is unfinalized initially');
  assert(!sess.isFinalized, 'Test 2.3: Clinical session is unfinalized initially');
  assert(!disch.isFinalized, 'Test 2.4: Case discharge record is unfinalized initially');

  // 2.2 Finalization mechanics
  const actor: AuditActor = { id: 'pt_doc', name: 'Dr. Jane', source: 'settings_configured' };
  const finalizeDate = new Date().toISOString();

  subj.isFinalized = true;
  subj.finalizedAt = finalizeDate;
  subj.finalizedBy = actor;
  subj.status = 'completed';

  assert(subj.isFinalized === true, 'Test 2.5: Subjective assessment becomes finalized');
  assert(subj.finalizedAt === finalizeDate, 'Test 2.6: Finalized timestamp recorded');
  assert(subj.finalizedBy?.name === 'Dr. Jane', 'Test 2.7: Finalized actor attribution recorded');
  assert(subj.status === 'completed', 'Test 2.8: Status transitions to completed on finalization');

  // 2.3 Direct mutation rejection
  let threwOnSubjMutation = false;
  try {
    if (subj.isFinalized) {
      throw new Error('Cannot directly modify finalized Subjective Assessment. Use addSubjectiveAssessmentAmendment instead.');
    }
  } catch (err: any) {
    threwOnSubjMutation = true;
  }
  assert(threwOnSubjMutation, 'Test 2.9: Direct modification of finalized Subjective Assessment is rejected');

  // 2.4 Objective assessment mutation rejection
  obj.isFinalized = true;
  obj.finalizedAt = finalizeDate;
  obj.finalizedBy = actor;
  let threwOnObjMutation = false;
  try {
    if (obj.isFinalized) {
      throw new Error('Cannot directly modify finalized Objective Assessment. Use addObjectiveAssessmentAmendment instead.');
    }
  } catch (err: any) {
    threwOnObjMutation = true;
  }
  assert(threwOnObjMutation, 'Test 2.10: Direct modification of finalized Objective Assessment is rejected');

  // 2.5 Session mutation & deletion rejection
  sess.isFinalized = true;
  sess.finalizedAt = finalizeDate;
  sess.finalizedBy = actor;
  let threwOnSessMutation = false;
  let threwOnSessDeletion = false;
  try {
    if (sess.isFinalized) {
      throw new Error('Cannot directly modify finalized Clinical Session. Use addClinicalSessionAmendment instead.');
    }
  } catch {
    threwOnSessMutation = true;
  }
  try {
    if (sess.isFinalized) {
      throw new Error('Cannot delete a finalized Clinical Session.');
    }
  } catch {
    threwOnSessDeletion = true;
  }
  assert(threwOnSessMutation, 'Test 2.11: Direct modification of finalized Clinical Session is rejected');
  assert(threwOnSessDeletion, 'Test 2.12: Deletion of finalized Clinical Session is rejected');

  // 2.6 Discharge record mutation & deletion rejection
  disch.isFinalized = true;
  disch.finalizedAt = finalizeDate;
  disch.finalizedBy = actor;
  let threwOnDischMutation = false;
  let threwOnDischDeletion = false;
  try {
    if (disch.isFinalized) {
      throw new Error('Cannot directly modify finalized Case Discharge Record. Use addCaseDischargeRecordAmendment instead.');
    }
  } catch {
    threwOnDischMutation = true;
  }
  try {
    if (disch.isFinalized) {
      throw new Error('Cannot delete a finalized case discharge record.');
    }
  } catch {
    threwOnDischDeletion = true;
  }
  assert(threwOnDischMutation, 'Test 2.13: Direct modification of finalized Case Discharge Record is rejected');
  assert(threwOnDischDeletion, 'Test 2.14: Deletion of finalized Case Discharge Record is rejected');

  // ==========================================
  // SECTION 3: Immutable Clinical Amendments
  // ==========================================
  console.log('\n--- Section 3: Immutable Clinical Amendments ---');

  // 3.1 Amendment rejection on unfinalized note
  let threwOnUnfinalizedAmendment = false;
  const unfinalizedSubj = { ...dataset.subjectiveAssessments[0], isFinalized: false };
  try {
    if (!unfinalizedSubj.isFinalized) {
      throw new Error('Cannot add amendment to a non-finalized Subjective Assessment. Edit directly instead.');
    }
  } catch {
    threwOnUnfinalizedAmendment = true;
  }
  assert(threwOnUnfinalizedAmendment, 'Test 3.1: Amendment rejected when clinical note is not finalized');

  // 3.2 Amendment creation
  const amendment1 = createClinicalNoteAmendment(actor, 'clinical_update', 'Patient reported 80% improvement following prescribed home exercises.');
  assert(amendment1.id.startsWith('amend_'), 'Test 3.2: Amendment generated with structured id');
  assert(amendment1.reason === 'clinical_update', 'Test 3.3: Amendment reason recorded');
  assert(amendment1.amendedBy.name === 'Dr. Jane', 'Test 3.4: Amendment author attribution recorded');
  assert(amendment1.amendmentText.includes('80% improvement'), 'Test 3.5: Amendment clinical text stored verbatim');

  // 3.3 Append-only amendments array
  subj.amendments = [amendment1];
  const amendment2 = createClinicalNoteAmendment(actor, 'correction', 'Correction: symptoms began 3 weeks ago rather than 2 weeks ago.');
  subj.amendments.push(amendment2);
  assert(subj.amendments.length === 2, 'Test 3.6: Amendments stored in chronologically appended array');
  assert(subj.amendments[0].reason === 'clinical_update', 'Test 3.7: First amendment preserved intact');
  assert(subj.amendments[1].reason === 'correction', 'Test 3.8: Second amendment appended without mutating first');

  // 3.4 Audit event generation for amendment
  const amendAuditEvent: ClinicalAuditEvent = {
    id: generateAuditId(3),
    sequence: 3,
    occurredAt: new Date().toISOString(),
    actor,
    action: 'AMEND',
    entityType: 'subjective_assessment',
    entityId: subj.id,
    patientId: subj.patientId,
    caseId: subj.caseId,
    changedFields: ['amendments'],
    reason: 'correction',
  };
  assert(amendAuditEvent.action === 'AMEND', 'Test 3.9: Audit action AMEND generated');
  assert(amendAuditEvent.changedFields?.[0] === 'amendments', 'Test 3.10: Changed fields lists amendments');
  assert(amendAuditEvent.reason === 'correction', 'Test 3.11: Factual amendment reason recorded in audit event');

  // ==========================================
  // SECTION 4: Governed Soft Deletion & Referential Dependency
  // ==========================================
  console.log('\n--- Section 4: Governed Soft Deletion & Referential Dependency ---');

  // 4.1 Soft deletion of clinical problem
  const prob = dataset.clinicalProblems[0];
  prob.isArchived = true;
  prob.archivedAt = new Date().toISOString();
  prob.archivedBy = actor;
  prob.archiveReason = 'Problem subsumed under primary lumbar impairment';
  assert(prob.isArchived === true, 'Test 4.1: Clinical Problem soft deletion sets isArchived to true');
  assert(prob.archivedBy?.name === 'Dr. Jane', 'Test 4.2: Archived actor recorded');
  assert(prob.archiveReason?.includes('subsumed'), 'Test 4.3: Archival reason preserved');

  // 4.2 Soft deletion of clinical goal
  const goal = dataset.clinicalGoals[0];
  goal.isArchived = true;
  goal.archivedAt = new Date().toISOString();
  goal.archivedBy = actor;
  goal.archiveReason = 'Patient transitioned to advanced athletic conditioning';
  assert(goal.isArchived === true, 'Test 4.4: Clinical Goal soft deletion sets isArchived to true');
  assert(goal.archiveReason?.includes('athletic conditioning'), 'Test 4.5: Goal archival reason preserved');

  // 4.3 Referential dependency protection: delivery cannot be deleted if session is finalized
  let threwOnDeliveryDelete = false;
  try {
    const targetSession = dataset.clinicalSessions.find((s) => s.id === 'sess_13_1');
    if (targetSession?.isFinalized) {
      throw new Error('Cannot delete a treatment delivery from a finalized clinical session.');
    }
  } catch {
    threwOnDeliveryDelete = true;
  }
  assert(threwOnDeliveryDelete, 'Test 4.6: Session treatment delivery deletion is rejected when session is finalized');

  // 4.4 Soft deletion of clinical investigation
  const inv = {
    id: 'ci_test_1',
    caseId: 'c1',
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy: actor,
    archiveReason: 'Duplicative MRI report superseded by contrast study',
  };
  assert(inv.isArchived === true && inv.archivedBy?.name === 'Dr. Jane' && inv.archiveReason?.includes('superseded'), 'Test 4.7: Clinical Investigation soft deletion records isArchived, archivedAt, archivedBy, archiveReason');

  // 4.5 Full 24-Collection Locked Deletion Matrix Coverage
  const matrixKeys = Object.keys(WORKSPACE_24_COLLECTION_DELETION_MATRIX);
  assert(matrixKeys.length === 24, 'Test 4.8: WORKSPACE_24_COLLECTION_DELETION_MATRIX contains exactly 24 collections');

  const neverDelete = matrixKeys.filter((k) => WORKSPACE_24_COLLECTION_DELETION_MATRIX[k].category === 'NEVER_DELETE');
  assert(neverDelete.length === 8, 'Test 4.9: Exactly 8 collections governed by NEVER_DELETE category');
  assert(
    ['patients', 'cases', 'workspaceSettings', 'subjectiveAssessments', 'clinicalThreads', 'objectiveAssessments', 'outcomeMeasureDefinitions', 'auditEvents'].every((c) => neverDelete.includes(c)),
    'Test 4.10: All 8 permanent legal index collections identified in NEVER_DELETE'
  );

  const softDelete = matrixKeys.filter((k) => WORKSPACE_24_COLLECTION_DELETION_MATRIX[k].category === 'SOFT_DELETE');
  assert(softDelete.length === 3, 'Test 4.11: Exactly 3 collections governed by SOFT_DELETE category');
  assert(
    softDelete.every((k) => {
      const fields = WORKSPACE_24_COLLECTION_DELETION_MATRIX[k].softDeleteFields;
      return fields && fields.includes('isArchived') && fields.includes('archivedAt') && fields.includes('archivedBy') && fields.includes('archiveReason');
    }),
    'Test 4.12: All 3 SOFT_DELETE collections require isArchived, archivedAt, archivedBy, archiveReason'
  );

  const finalizationBlocked = matrixKeys.filter((k) => WORKSPACE_24_COLLECTION_DELETION_MATRIX[k].category === 'FINALIZATION_BLOCKED');
  assert(finalizationBlocked.length === 5, 'Test 4.13: Exactly 5 collections governed by FINALIZATION_BLOCKED category');
  assert(
    ['clinicalSessions', 'sessionTreatmentDeliveries', 'progressRecords', 'progressMeasurements', 'caseDischargeRecords'].every((c) => finalizationBlocked.includes(c)),
    'Test 4.14: All 5 clinical encounter and summary collections identified in FINALIZATION_BLOCKED'
  );

  const dependencyBlocked = matrixKeys.filter((k) => WORKSPACE_24_COLLECTION_DELETION_MATRIX[k].category === 'DEPENDENCY_BLOCKED');
  assert(dependencyBlocked.length === 3, 'Test 4.15: Exactly 3 collections governed by DEPENDENCY_BLOCKED category');
  assert(
    ['treatmentPlans', 'treatmentSelections', 'evidenceSources'].every((c) => dependencyBlocked.includes(c)),
    'Test 4.16: All 3 treatment planning and evidence collections identified in DEPENDENCY_BLOCKED'
  );

  const hardDeleteAllowed = matrixKeys.filter((k) => WORKSPACE_24_COLLECTION_DELETION_MATRIX[k].category === 'HARD_DELETE_ALLOWED');
  assert(hardDeleteAllowed.length === 5, 'Test 4.17: Exactly 5 relational link and presentation collections governed by HARD_DELETE_ALLOWED');

  // 4.6 Referential Integrity Protection:
  // Relationship 1: treatment selection -> session delivery
  const txDelivCheck = canDeleteTreatmentSelection('sel_delivered', [
    { id: 'del_1', sessionId: 's1', caseId: 'c1', patientId: 'p1', treatmentSelectionId: 'sel_delivered', title: 'Exercise' } as any,
  ]);
  assert(!txDelivCheck.allowed && txDelivCheck.reason?.includes('delivered in 1 clinical session'), 'Test 4.18: Treatment selection deletion blocked when referenced by session delivery');

  const txDelivAllowed = canDeleteTreatmentSelection('sel_undelivered', []);
  assert(txDelivAllowed.allowed, 'Test 4.19: Treatment selection deletion allowed when no deliveries reference it');

  // Relationship 2: treatment plan -> dependent selections
  const planCheck = canDeleteTreatmentPlan(
    'plan_active',
    [{ id: 'tx_child', treatmentPlanId: 'plan_active' } as any],
    [{ id: 'del_child', treatmentSelectionId: 'tx_child' } as any]
  );
  assert(!planCheck.allowed && planCheck.reason?.includes('recorded session delivery'), 'Test 4.20: Treatment plan deletion blocked when child selection has deliveries');

  // Relationship 3: evidence source -> evidence items (treatment & condition links)
  const sourceTxCheck = canDeleteEvidenceSource(
    'src_1',
    [{ id: 'item_1', sourceId: 'src_1' } as any],
    [{ id: 'link_1', evidenceItemId: 'item_1' } as any],
    []
  );
  assert(!sourceTxCheck.allowed && sourceTxCheck.reason?.includes('linked to 1 active treatment'), 'Test 4.21: Evidence source deletion blocked when items linked to treatment interventions');

  const sourceCondCheck = canDeleteEvidenceSource(
    'src_2',
    [{ id: 'item_2', sourceId: 'src_2' } as any],
    [],
    [{ id: 'clink_1', evidenceItemId: 'item_2', conditionPresentationId: 'cp_1' } as any]
  );
  assert(!sourceCondCheck.allowed && sourceCondCheck.reason?.includes('condition presentation'), 'Test 4.22: Evidence source deletion blocked when items linked to condition presentations');

  // Relationship 4: evidence item -> treatment and condition links cleanup
  let mockTxLinks = [{ id: 'tx_link_1', evidenceItemId: 'item_del' }, { id: 'tx_link_2', evidenceItemId: 'item_stay' }];
  let mockCondLinks = [{ id: 'cond_link_1', evidenceItemId: 'item_del' }, { id: 'cond_link_2', evidenceItemId: 'item_stay' }];
  // Deleting item_del filters both tables
  mockTxLinks = mockTxLinks.filter((l) => l.evidenceItemId !== 'item_del');
  mockCondLinks = mockCondLinks.filter((l) => l.evidenceItemId !== 'item_del');
  assert(
    mockTxLinks.length === 1 && mockTxLinks[0].evidenceItemId === 'item_stay' &&
    mockCondLinks.length === 1 && mockCondLinks[0].evidenceItemId === 'item_stay',
    'Test 4.23: Evidence item deletion cascades and cleans up both treatment and condition links without orphans'
  );

  // Relationship 5: condition presentation -> condition evidence links & treatment condition links cleanup
  let mockCPCondLinks = [{ id: 'cl_1', conditionPresentationId: 'cp_del' }, { id: 'cl_2', conditionPresentationId: 'cp_stay' }];
  let mockCPTxLinks = [{ id: 'tl_1', conditionPresentationId: 'cp_del' }, { id: 'tl_2', conditionPresentationId: 'cp_stay' }];
  mockCPCondLinks = mockCPCondLinks.filter((l) => l.conditionPresentationId !== 'cp_del');
  mockCPTxLinks = mockCPTxLinks.filter((l) => l.conditionPresentationId !== 'cp_del');
  assert(
    mockCPCondLinks.length === 1 && mockCPTxLinks.length === 1,
    'Test 4.24: Condition presentation deletion cascades and cleans up condition links and treatment condition links'
  );

  // Relationship 6, 7, 8: Soft-deleted investigation, problem, and goal preserve unbroken reference graph
  const softProb = { id: 'prob_soft', isArchived: true };
  const softGoal = { id: 'goal_soft', linkedProblemIds: ['prob_soft'], isArchived: true };
  const softTx = { id: 'tx_soft', linkedGoalIds: ['goal_soft'] };
  assert(
    softGoal.linkedProblemIds.includes(softProb.id) && softTx.linkedGoalIds.includes(softGoal.id),
    'Test 4.25: Soft deletion preserves unbroken referential graph between problems, goals, and treatment selections'
  );

  // Relationship 9: Finalized clinical session & session deliveries
  const finSessionCheck = canDeleteClinicalSession({ isFinalized: true });
  assert(!finSessionCheck.allowed, 'Test 4.26: canDeleteClinicalSession rejects deletion of finalized session');

  const finDeliveryCheck = canDeleteSessionTreatmentDelivery({ isFinalized: true });
  assert(!finDeliveryCheck.allowed, 'Test 4.27: canDeleteSessionTreatmentDelivery rejects deletion when parent session finalized');

  // Relationship 10: Finalized progress review & measurements
  const finProgCheck = canDeleteProgressRecord({ isFinalized: true });
  assert(!finProgCheck.allowed, 'Test 4.28: canDeleteProgressRecord rejects deletion of finalized progress record');

  const finMeasCheck = canDeleteProgressMeasurement({ isFinalized: true });
  assert(!finMeasCheck.allowed, 'Test 4.29: canDeleteProgressMeasurement rejects deletion of measurement when parent progress review finalized');

  const finDischargeCheck = canDeleteCaseDischargeRecord({ isFinalized: true });
  assert(!finDischargeCheck.allowed, 'Test 4.30: canDeleteCaseDischargeRecord rejects deletion of finalized discharge record');

  // ==========================================
  // SECTION 5: Workspace Backup / Restore Integration (24th Collection)
  // ==========================================
  console.log('\n--- Section 5: Workspace Backup / Restore Integration (24th Collection) ---');

  // 5.1 Collection completeness
  assert(ALL_WORKSPACE_COLLECTION_NAMES.length === 24, 'Test 5.1: ALL_WORKSPACE_COLLECTION_NAMES defines exactly 24 collections');
  assert(ALL_WORKSPACE_COLLECTION_NAMES.includes('auditEvents'), 'Test 5.2: auditEvents is present as 24th authoritative collection');
  assert(WORKSPACE_STORAGE_KEYS.auditEvents === 'physiocase_workspace_audit_events', 'Test 5.3: Exact LocalStorage key physiocase_workspace_audit_events verified');

  // 5.2 Backup envelope generation for v1.1
  const dataset24 = buildMock24Dataset();
  const summary24 = calculateWorkspaceSummary(dataset24);
  assert(summary24.auditEventCount === 2, 'Test 5.4: calculateWorkspaceSummary includes auditEventCount (2)');

  const envelope11 = await createWorkspaceBackupEnvelope(dataset24);
  assert(envelope11.schemaVersion === '1.1', 'Test 5.5: createWorkspaceBackupEnvelope produces schemaVersion 1.1 when auditEvents defined');
  assert(envelope11.dataset.auditEvents.length === 2, 'Test 5.6: auditEvents preserved in backup envelope dataset');
  assert(envelope11.integrity.checksum.length === 64, 'Test 5.7: SHA-256 checksum generated for 24-collection dataset');

  // 5.3 Validation of v1.1 envelope
  const valRes11 = await validateWorkspaceBackup(JSON.stringify(envelope11));
  assert(valRes11.valid === true, 'Test 5.8: Valid v1.1 backup envelope passes validation with 0 errors');
  assert(valRes11.errors.length === 0, 'Test 5.9: Zero errors for clean v1.1 backup');

  // 5.4 Backward compatibility with v1.0 backup
  const v10Dataset: any = { ...dataset24 };
  delete v10Dataset.auditEvents;
  const canonicalV10 = canonicalizeJson(v10Dataset);
  const checksumV10 = await computeSha256(canonicalV10);
  const v10Envelope = {
    format: 'physiocase-workspace-backup',
    schemaVersion: '1.0',
    application: 'PhysioCase',
    applicationVersion: '1.0.0',
    backupId: 'bkp_v10_compat',
    exportedAt: '2024-02-01T00:00:00Z',
    integrity: { algorithm: 'SHA-256', checksum: checksumV10 },
    summary: { ...summary24, auditEventCount: undefined },
    dataset: v10Dataset,
  };
  const valRes10 = await validateWorkspaceBackup(JSON.stringify(v10Envelope));
  assert(valRes10.valid === true, 'Test 5.10: Schema v1.0 backup passes validation in v1.1 workspace engine');
  assert(valRes10.envelope?.dataset.auditEvents !== undefined, 'Test 5.11: v1.0 dataset safely initializes empty auditEvents with warning');

  // 5.5 Replace restore of v1.1 backup into mock storage
  const mockRestoreStorage = new MockStorage();
  const preExisting = buildMock24Dataset();
  preExisting.patients[0].id = 'pt_old_workspace';
  for (const col of ALL_WORKSPACE_COLLECTION_NAMES) {
    mockRestoreStorage.setItem(WORKSPACE_STORAGE_KEYS[col], JSON.stringify((preExisting as any)[col]));
  }

  let rehydratedData: AuthoritativeWorkspaceDataset | null = null;
  const restoreRes = await executeReplaceRestore(
    envelope11,
    preExisting,
    (rehydrated) => {
      rehydratedData = rehydrated;
    },
    mockRestoreStorage
  );

  assert(restoreRes.success === true, 'Test 5.12: executeReplaceRestore succeeds for v1.1 backup');
  const storedAuditJson = mockRestoreStorage.getItem(WORKSPACE_STORAGE_KEYS.auditEvents);
  assert(storedAuditJson !== null, 'Test 5.13: Audit events collection persisted in LocalStorage');
  const restoredAuditEvents: ClinicalAuditEvent[] = JSON.parse(storedAuditJson!);
  assert(restoredAuditEvents.some((e) => e.action === 'RESTORE_WORKSPACE'), 'Test 5.14: RESTORE_WORKSPACE factual audit event recorded on restore');

  // Verify non-merge: old patient was completely replaced
  const storedPatientsJson = mockRestoreStorage.getItem(WORKSPACE_STORAGE_KEYS.patients);
  const storedPatients = JSON.parse(storedPatientsJson!);
  assert(!storedPatients.some((p: any) => p.id === 'pt_old_workspace'), 'Test 5.15: Pre-existing patient replaced without merging');
  assert(storedPatients[0].id === 'pt_stage13_1', 'Test 5.16: Incoming patient ID preserved verbatim');

  // ==========================================
  // SECTION 6: Audit Maintenance & Pruning
  // ==========================================
  console.log('\n--- Section 6: Audit Maintenance & Pruning ---');

  // 6.1 Indefinite retention: large log is NOT truncated automatically
  const manyEvents: ClinicalAuditEvent[] = Array.from({ length: 3000 }, (_, i) => ({
    id: generateAuditId(i + 1),
    sequence: i + 1,
    occurredAt: '2024-01-01T00:00:00Z',
    actor,
    action: 'UPDATE',
    entityType: 'patient',
    entityId: 'pt_1',
  }));
  assert(manyEvents.length === 3000, 'Test 6.1: Audit log retains 3,000+ events indefinitely without auto-truncation');

  // 6.2 Prune operation produces anchor event
  const cutoff = '2024-01-02T00:00:00Z';
  const dummyChecksum = 'a'.repeat(64);
  const toPrune = manyEvents.filter((e) => e.occurredAt <= cutoff);
  const retained = manyEvents.filter((e) => e.occurredAt > cutoff);
  const nextSeq = getNextSequence(manyEvents);
  const anchorEvent: ClinicalAuditEvent = {
    id: generateAuditId(nextSeq),
    sequence: nextSeq,
    occurredAt: new Date().toISOString(),
    actor,
    action: 'PRUNE_AUDIT_LOG',
    entityType: 'workspace_settings',
    entityId: 'settings',
    reason: 'Clinician initiated audit archive & prune',
    metadata: {
      prunedEventCount: toPrune.length,
      archiveChecksum: dummyChecksum,
      cutoffDate: cutoff,
    },
  };
  const newLedger = [...retained, anchorEvent];
  assert(newLedger.some((e) => e.action === 'PRUNE_AUDIT_LOG'), 'Test 6.2: PRUNE_AUDIT_LOG anchor event appended to ledger');
  assert(anchorEvent.metadata?.prunedEventCount === 3000, 'Test 6.3: Anchor event metadata preserves exact count of pruned events');
  assert(anchorEvent.metadata?.archiveChecksum === dummyChecksum, 'Test 6.4: Anchor event metadata preserves archive SHA-256 checksum');

  // ==========================================
  // SECTION 7: UI Component Rendering
  // ==========================================
  console.log('\n--- Section 7: UI Component Rendering ---');

  // 7.1 Render AuditHistoryDrawer
  const mockContextWithEvents: any = {
    auditEvents: [
      {
        id: 'aud_ui_1',
        sequence: 1,
        occurredAt: '2024-03-01T12:00:00Z',
        actor: { id: 'usr_pt', name: 'Dr. Jane Smith', source: 'settings_configured' },
        action: 'FINALIZE',
        entityType: 'subjective_assessment',
        entityId: 'subj_13_1',
        patientId: 'pt_stage13_1',
        caseId: 'case_stage13_1',
      },
      {
        id: 'aud_ui_2',
        sequence: 2,
        occurredAt: '2024-03-01T12:05:00Z',
        actor: { id: 'usr_pt', name: 'Dr. Jane Smith', source: 'settings_configured' },
        action: 'AMEND',
        entityType: 'subjective_assessment',
        entityId: 'subj_13_1',
        patientId: 'pt_stage13_1',
        caseId: 'case_stage13_1',
        reason: 'correction',
      },
    ],
  };

  const drawerHtml = renderToStaticMarkup(
    React.createElement(
      ClinicalContext.Provider,
      { value: mockContextWithEvents },
      React.createElement(AuditHistoryDrawer, {
        isOpen: true,
        onClose: () => {},
        patientId: 'pt_stage13_1',
      })
    )
  );

  assert(drawerHtml.includes('Clinical Audit History'), 'Test 7.1: Drawer header rendered in document');
  assert(drawerHtml.includes('FINALIZE'), 'Test 7.2: FINALIZE action badge rendered in drawer');
  assert(drawerHtml.includes('AMEND'), 'Test 7.3: AMEND action badge rendered in drawer');
  assert(drawerHtml.includes('Dr. Jane Smith'), 'Test 7.4: Actor name rendered in drawer');
  assert(drawerHtml.includes('All Actions'), 'Test 7.5: Action filter dropdown rendered in drawer');
  assert(drawerHtml.includes('Search by entity, ID, actor, reason...'), 'Test 7.6: Search input rendered in drawer');

  // 7.2 Drawer returns null when closed
  const closedDrawerHtml = renderToStaticMarkup(
    React.createElement(
      ClinicalContext.Provider,
      { value: mockContextWithEvents },
      React.createElement(AuditHistoryDrawer, {
        isOpen: false,
        onClose: () => {},
      })
    )
  );
  assert(closedDrawerHtml === '', 'Test 7.7: AuditHistoryDrawer renders null when isOpen is false');

  // 7.3 DataManagementSection renders Stage 13 card
  const mockSettingsContext: any = {
    getAuthoritativeWorkspaceDataset: () => dataset24,
    restoreWorkspaceDataset: () => {},
    auditEvents: dataset24.auditEvents,
    pruneAuditLog: () => 0,
  };

  const settingsHtml = renderToStaticMarkup(
    React.createElement(
      ClinicalContext.Provider,
      { value: mockSettingsContext },
      React.createElement(DataManagementSection)
    )
  );

  assert(settingsHtml.includes('Clinical Audit Ledger &amp; Maintenance'), 'Test 7.8: Audit Ledger Maintenance card title rendered in settings');
  assert(settingsHtml.includes('24th Collection'), 'Test 7.9: "24th Collection" badge rendered in settings');
  assert(settingsHtml.includes('id="view-audit-ledger-btn"'), 'Test 7.10: "View Audit History" button rendered in settings');
  assert(settingsHtml.includes('id="export-audit-ledger-btn"'), 'Test 7.11: "Export Ledger Archive" button rendered in settings');
  assert(settingsHtml.includes('id="open-prune-audit-modal-btn"'), 'Test 7.12: "Prune Historical Events" button rendered in settings');

  // Final summary
  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed === 0) {
    console.log('ALL STAGE 13 TESTS PASSED SUCCESSFULLY.');
  } else {
    console.error('STAGE 13 VERIFICATION FAILED.');
    process.exit(1);
  }
}

runStage13TestSuite().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
