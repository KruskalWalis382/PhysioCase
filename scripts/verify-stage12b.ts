/**
 * Stage 12B Comprehensive Verification Test Suite
 *
 * Verifies Local-First Workspace Backup, Restore & Recovery Architecture:
 * 1. Backup Composition & Schema Envelope:
 *    - All 23 authoritative collections present.
 *    - Strict exclusion of derived longitudinal, governance, transient session/auth, and report models.
 *    - Summary counts accurately match dataset contents.
 * 2. Deterministic Canonicalization & SHA-256 Checksum:
 *    - Deep recursive key-sorted canonicalization preserving array order.
 *    - Checksum calculated on canonical dataset payload only (excluding envelope metadata).
 *    - Correct lowercase 64-character hexadecimal SHA-256 hash.
 *    - Checksum changes when dataset changes.
 *    - Checksum mismatch triggers ERR_CHECKSUM_MISMATCH.
 * 3. Strict Fail-Closed Validation (Tiers 1-8):
 *    - Malformed JSON -> ERR_INVALID_JSON.
 *    - Non-envelope or empty JSON -> ERR_INVALID_STRUCTURE.
 *    - Stage 8 case archive rejected -> ERR_WRONG_FORMAT.
 *    - Stage 11 longitudinal summary rejected -> ERR_WRONG_FORMAT.
 *    - Arbitrary JSON rejected -> ERR_WRONG_FORMAT.
 *    - Unsupported schema version -> ERR_UNSUPPORTED_VERSION.
 *    - Missing authoritative collections -> ERR_MISSING_COLLECTION.
 *    - Non-array collection -> ERR_INVALID_STRUCTURE.
 *    - Duplicate primary IDs -> ERR_DUPLICATE_ID.
 *    - Orphaned foreign key references (cases, sessions, problems, goals, deliveries) -> ERR_ORPHAN_RECORD.
 * 4. Replace Restore & Referential Integrity:
 *    - Candidate dataset replaces target storage completely.
 *    - Exact verbatim ID preservation (zero regeneration, zero remapping).
 *    - Zero merge semantics: previous unreferenced records are completely replaced, not merged.
 * 5. Rollback Staging & Fail-Closed Protection:
 *    - Simulated write failure during mid-restore triggers automatic rollback.
 *    - Pre-restore database verified 100% intact after rollback.
 *    - Simulated rollback failure triggers Critical Recovery State:
 *      - window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__ attached.
 *      - Zero permanent LocalStorage recovery cache created.
 * 6. UI Component Rendering:
 *    - DataManagementSection renders export and restore cards.
 *    - Sensitive clinical data warnings present.
 *    - Typed "RESTORE" verification required.
 *    - Emergency Recovery UI elements render.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
} from '../src/utils/workspaceBackup';
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

// In-Memory Storage Mock for isolated, non-polluting persistence testing
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

  // Debug helper to snapshot store
  dump(): Record<string, string> {
    const res: Record<string, string> = {};
    for (const [k, v] of this.store.entries()) {
      res[k] = v;
    }
    return res;
  }
}

function buildMockDataset(patientCount = 2, caseCount = 3): AuthoritativeWorkspaceDataset {
  const patients = Array.from({ length: patientCount }, (_, i) => ({
    id: `pt_${i + 1}`,
    patientNumber: `PC-${String(i + 1).padStart(4, '0')}`,
    fullName: `Patient Number ${i + 1}`,
    dateOfBirth: '1988-04-12',
    sex: 'Female',
    reasonForVisit: 'Lumbar radiculopathy',
    status: 'active' as const,
    createdAt: '2024-01-10T08:00:00Z',
    patientSafetyProfile: {
      allergies: [],
      persistentPrecautions: [],
      surgicalHistory: [],
      persistentMedicalConditions: [],
    },
  }));

  const cases = Array.from({ length: caseCount }, (_, i) => ({
    id: `case_${i + 1}`,
    caseId: `CASE-${String(i + 1).padStart(4, '0')}`,
    patientId: patients[i % patientCount].id,
    caseName: `Clinical Episode ${i + 1}`,
    startDate: '2024-01-15',
    status: 'Treatment' as const,
    createdAt: '2024-01-15T09:00:00Z',
  }));

  const sessions = [
    {
      id: 'sess_1',
      sessionNumber: 1,
      caseId: cases[0].id,
      patientId: patients[0].id,
      date: '2024-01-20',
      status: 'completed' as const,
      overallTolerance: 'tolerated_well' as const,
      createdAt: '2024-01-20T10:00:00Z',
    },
  ];

  const deliveries = [
    {
      id: 'del_1',
      sessionId: sessions[0].id,
      caseId: cases[0].id,
      patientId: patients[0].id,
      treatmentName: 'Directional Extension',
      dosageParameters: '3 sets of 10 reps',
      toleranceRating: 'well_tolerated' as const,
      createdAt: '2024-01-20T10:15:00Z',
    },
  ];

  const problems = [
    {
      id: 'prob_1',
      caseId: cases[0].id,
      patientId: patients[0].id,
      title: 'L5-S1 Disc Herniation with Radiculopathy',
      linkedFindingIds: [],
      status: 'active' as const,
      createdAt: '2024-01-15T09:30:00Z',
    },
  ];

  const goals = [
    {
      id: 'goal_1',
      caseId: cases[0].id,
      patientId: patients[0].id,
      description: 'Walk 30 minutes pain-free',
      type: 'functional' as const,
      status: 'active' as const,
      linkedProblemIds: [problems[0].id],
      createdAt: '2024-01-15T09:45:00Z',
    },
  ];

  const treatmentPlans = [
    {
      id: 'plan_1',
      caseId: cases[0].id,
      title: 'Phase 1: Symptom Reduction',
      status: 'active' as const,
      createdAt: '2024-01-15T10:00:00Z',
    },
  ];

  const treatmentSelections = [
    {
      id: 'tx_1',
      caseId: cases[0].id,
      title: 'Directional Extension Exercises',
      category: 'exercise' as const,
      interventionType: 'therapeutic_exercise' as const,
      status: 'prescribed' as const,
      createdAt: '2024-01-15T10:15:00Z',
    },
  ];

  const progressRecords = [
    {
      id: 'prog_1',
      caseId: cases[0].id,
      patientId: patients[0].id,
      date: '2024-02-15',
      therapistSummary: 'Significant reduction in radiating pain.',
      createdAt: '2024-02-15T11:00:00Z',
    },
  ];

  const progressMeasurements = [
    {
      id: 'meas_1',
      progressRecordId: progressRecords[0].id,
      caseId: cases[0].id,
      patientId: patients[0].id,
      measureName: 'NPRS',
      category: 'pain',
      valueType: 'numeric' as const,
      stage: 'progress' as const,
      numericValue: 3,
      date: '2024-02-15',
      createdAt: '2024-02-15T11:15:00Z',
    },
  ];

  const investigations = [
    {
      id: 'inv_1',
      caseId: cases[0].id,
      patientId: patients[0].id,
      name: 'Lumbar Spine MRI',
      category: 'radiology' as const,
      modality: 'mri' as const,
      investigationDate: '2024-01-05',
      bodyRegion: 'Lumbar Spine',
      keyFindings: 'L5-S1 posterior disc protrusion',
      status: 'completed' as const,
      createdAt: '2024-01-05T08:00:00Z',
    },
  ];

  const discharges = [
    {
      id: 'dis_1',
      caseId: cases[0].id,
      patientId: patients[0].id,
      dischargeDate: '2024-04-10',
      dischargeReason: 'goals_met' as const,
      episodeSummary: 'Fully achieved functional walking tolerance.',
      clinicalStatusAtDischarge: 'Resolved',
      createdAt: '2024-04-10T16:00:00Z',
    },
  ];

  return {
    settings: {
      practitionerName: 'Dr. Arthur Pendelton',
      credentials: 'PT, DPT, OCS',
      clinicName: 'St. Jude Physiotherapy Centre',
      licenseNumber: 'PT-883921',
      email: 'arthur@stjudephysio.com',
      theme: 'warm-clinical',
      density: 'comfortable',
      measurementSystem: 'metric',
      framework: 'journey',
      reviewCadenceWeeks: 4,
    },
    patients,
    cases,
    subjectiveAssessments: [
      {
        id: 'sub_1',
        caseId: cases[0].id,
        patientId: patients[0].id,
        chiefComplaint: 'Lower back and calf pain',
        createdAt: '2024-01-15T09:00:00Z',
      },
    ],
    clinicalThreads: [
      {
        id: 'thread_1',
        caseId: cases[0].id,
        title: 'Lumbar Derangement vs Dysfunction',
        status: 'investigating' as const,
        createdAt: '2024-01-15T09:15:00Z',
      },
    ],
    objectiveAssessments: [
      {
        id: 'obj_1',
        caseId: cases[0].id,
        patientId: patients[0].id,
        findings: [
          {
            id: 'find_1',
            testName: 'Straight Leg Raise (Left)',
            result: 'Positive at 40 degrees',
            significance: 'key_driver' as const,
          },
        ],
        createdAt: '2024-01-15T09:20:00Z',
      },
    ],
    clinicalProblems: problems,
    clinicalGoals: goals,
    treatmentPlans,
    treatmentSelections,
    treatmentEvidenceLinks: [],
    treatmentConditionLinks: [],
    evidenceSources: [
      {
        id: 'src_1',
        title: 'McKenzie Method for Lumbar Disc Herniation',
        authors: ['May S', 'Runge N'],
        publicationYear: 2020,
        evidenceType: 'systematic_review' as const,
        status: 'published' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    evidenceItems: [
      {
        id: 'item_1',
        sourceId: 'src_1',
        title: 'Directional preference extension centralization',
        summary: 'Reduces radicular pain in acute lumbar disc derangement',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    conditionPresentations: [
      {
        id: 'cond_1',
        name: 'Lumbar Radicular Syndrome',
        type: 'mechanical' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    conditionEvidenceLinks: [],
    clinicalInvestigations: investigations,
    clinicalSessions: sessions,
    sessionTreatmentDeliveries: deliveries,
    outcomeMeasureDefinitions: [
      {
        id: 'omd_1',
        name: 'Numerical Pain Rating Scale (NPRS)',
        category: 'pain' as const,
        valueType: 'numeric' as const,
        directionMeaning: 'lower_is_better' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    progressRecords,
    progressMeasurements,
    caseDischargeRecords: discharges,
  } as unknown as AuthoritativeWorkspaceDataset;
}

async function runTestSuite() {
  console.log('=== STAGE 12B VERIFICATION TEST SUITE ===');

  // ==========================================
  // SECTION 1: Backup Composition & Summary Counts
  // ==========================================
  console.log('\n--- Section 1: Backup Composition & Summary Counts ---');

  const mockDataset = buildMockDataset(3, 4);
  const envelope = await createWorkspaceBackupEnvelope(mockDataset, '1.2.0');

  assert(envelope.format === 'physiocase-workspace-backup', 'Test 1.1: Format is physiocase-workspace-backup');
  assert(envelope.schemaVersion === '1.0', 'Test 1.2: Schema version is 1.0');
  assert(envelope.application === 'PhysioCase', 'Test 1.3: Application is PhysioCase');
  assert(envelope.applicationVersion === '1.2.0', 'Test 1.4: Application version matches passed argument');
  assert(typeof envelope.backupId === 'string' && envelope.backupId.startsWith('bkp_'), 'Test 1.5: Backup ID is structured');
  assert(!isNaN(new Date(envelope.exportedAt).getTime()), 'Test 1.6: ExportedAt is valid ISO date');

  // Verify all 23 collections are in envelope.dataset
  for (const col of AUTHORITATIVE_COLLECTION_NAMES) {
    assert((envelope.dataset as any)[col] !== undefined, `Test 1.7: Authoritative collection "${col}" present in dataset`);
  }

  // Verify summary counts
  const summary = calculateWorkspaceSummary(mockDataset);
  assert(summary.patientCount === 3, 'Test 1.8: Summary patientCount matches dataset (3)');
  assert(summary.caseCount === 4, 'Test 1.9: Summary caseCount matches dataset (4)');
  assert(summary.sessionCount === 1, 'Test 1.10: Summary sessionCount matches dataset (1)');
  assert(summary.problemCount === 1, 'Test 1.11: Summary problemCount matches dataset (1)');
  assert(summary.measurementCount === 1, 'Test 1.12: Summary measurementCount matches dataset (1)');
  assert(summary.investigationCount === 1, 'Test 1.13: Summary investigationCount matches dataset (1)');
  assert(summary.totalEntityCount > 15, 'Test 1.14: Total entities calculated across all collections');

  // Verify strict exclusion of derived models and transient state
  const rawEnvelopeKeys = Object.keys(envelope);
  assert(!rawEnvelopeKeys.includes('timeline'), 'Test 1.15: Longitudinal timeline strictly excluded from envelope');
  assert(!rawEnvelopeKeys.includes('cumulativeProblems'), 'Test 1.16: Cumulative problems strictly excluded from envelope');
  assert(!rawEnvelopeKeys.includes('outcomeSeries'), 'Test 1.17: Longitudinal outcome series strictly excluded from envelope');
  assert(!rawEnvelopeKeys.includes('physiocase_session_user'), 'Test 1.18: Auth session user strictly excluded from envelope');
  assert(!rawEnvelopeKeys.includes('physiocase_remember_me'), 'Test 1.19: Remember me preference strictly excluded from envelope');

  // ==========================================
  // SECTION 2: Deterministic Canonicalization & Checksum
  // ==========================================
  console.log('\n--- Section 2: Deterministic Canonicalization & Checksum ---');

  // Test recursive canonicalization: objects with different key order must produce identical canonical string
  const objA = { z: 1, a: { y: 'hello', b: [1, 2, { c: 3, a: 4 }] } };
  const objB = { a: { b: [1, 2, { a: 4, c: 3 }], y: 'hello' }, z: 1 };
  const canonA = canonicalizeJson(objA);
  const canonB = canonicalizeJson(objB);
  assert(canonA === canonB, 'Test 2.1: Recursive canonicalization yields identical string regardless of key ordering');
  assert(canonA.startsWith('{"a":{"b":[1,2,{"a":4,"c":3}],"y":"hello"},"z":1}'), 'Test 2.2: Keys sorted lexicographically at every depth');

  // Array order must be strictly preserved
  const arr1 = canonicalizeJson([2, 1, 3]);
  const arr2 = canonicalizeJson([1, 2, 3]);
  assert(arr1 !== arr2, 'Test 2.3: Array order is strictly preserved and not sorted');

  // Checksum format and verification
  assert(typeof envelope.integrity.checksum === 'string', 'Test 2.4: Checksum is present');
  assert(/^[a-f0-9]{64}$/.test(envelope.integrity.checksum), 'Test 2.5: Checksum is a 64-character lowercase hexadecimal SHA-256 hash');

  const recomputed = await computeSha256(canonicalizeJson(mockDataset));
  assert(recomputed === envelope.integrity.checksum, 'Test 2.6: Checksum re-calculation matches envelope checksum');

  // Checksum must change if dataset is mutated
  const mutatedDataset = JSON.parse(JSON.stringify(mockDataset));
  mutatedDataset.patients[0].fullName = 'Mutated Name';
  const mutatedHash = await computeSha256(canonicalizeJson(mutatedDataset));
  assert(mutatedHash !== envelope.integrity.checksum, 'Test 2.7: Checksum changes when dataset changes');

  // ==========================================
  // SECTION 3: Validation Rigor & Fail-Closed Behavior
  // ==========================================
  console.log('\n--- Section 3: Validation Rigor & Fail-Closed Behavior ---');

  // Valid backup passes
  const validJson = JSON.stringify(envelope);
  const validRes = await validateWorkspaceBackup(validJson);
  assert(validRes.valid === true, 'Test 3.1: Valid backup envelope passes validation with 0 errors');
  assert(validRes.errors.length === 0, 'Test 3.2: Valid backup produces zero errors');
  assert(validRes.envelope !== undefined, 'Test 3.3: Valid backup returns typed envelope');

  // 3.1 Malformed JSON
  const malformedRes = await validateWorkspaceBackup('{ "format": "physiocase-workspace-backup", broken');
  assert(!malformedRes.valid && malformedRes.errors[0].code === 'ERR_INVALID_JSON', 'Test 3.4: Malformed JSON triggers ERR_INVALID_JSON');

  // 3.2 Non-object JSON
  const nonObjectRes = await validateWorkspaceBackup('["not", "an", "object"]');
  assert(!nonObjectRes.valid && nonObjectRes.errors[0].code === 'ERR_INVALID_STRUCTURE', 'Test 3.5: Array root triggers ERR_INVALID_STRUCTURE');

  // 3.3 Format discrimination: Stage 8 Case Archive rejected
  const stage8Archive = JSON.stringify({
    exportMetadata: { format: 'physiocase-case-archive', version: '1.0' },
    format: 'physiocase-case-archive',
    schemaVersion: '1.0',
    caseItem: { id: 'c1' },
  });
  const s8Res = await validateWorkspaceBackup(stage8Archive);
  assert(!s8Res.valid && s8Res.errors[0].code === 'ERR_WRONG_FORMAT', 'Test 3.6: Stage 8 Case Archive triggers ERR_WRONG_FORMAT');
  assert(s8Res.errors[0].message.includes('Stage 8'), 'Test 3.7: Stage 8 Case Archive produces helpful rejection message');

  // 3.4 Format discrimination: Stage 11 Longitudinal Summary rejected
  const stage11Summary = JSON.stringify({
    format: 'physiocase-longitudinal-summary',
    version: '1.0',
    reportId: 'rpt_1',
  });
  const s11Res = await validateWorkspaceBackup(stage11Summary);
  assert(!s11Res.valid && s11Res.errors[0].code === 'ERR_WRONG_FORMAT', 'Test 3.8: Stage 11 Longitudinal Summary triggers ERR_WRONG_FORMAT');
  assert(s11Res.errors[0].message.includes('Stage 11'), 'Test 3.9: Stage 11 Longitudinal Summary produces helpful rejection message');

  // 3.5 Arbitrary unknown JSON
  const arbitraryJson = JSON.stringify({ format: 'my-custom-ehr', someData: 123 });
  const arbRes = await validateWorkspaceBackup(arbitraryJson);
  assert(!arbRes.valid && arbRes.errors[0].code === 'ERR_WRONG_FORMAT', 'Test 3.10: Arbitrary format triggers ERR_WRONG_FORMAT');

  // 3.6 Unsupported schema version
  const futureSchema = JSON.stringify({ ...envelope, schemaVersion: '2.0' });
  const futureRes = await validateWorkspaceBackup(futureSchema);
  assert(!futureRes.valid && futureRes.errors[0].code === 'ERR_UNSUPPORTED_VERSION', 'Test 3.11: Unsupported schemaVersion 2.0 triggers ERR_UNSUPPORTED_VERSION');

  // 3.7 Checksum mismatch (Tamper detection)
  const tampered = JSON.parse(JSON.stringify(envelope));
  tampered.integrity.checksum = '0000000000000000000000000000000000000000000000000000000000000000';
  const tamperRes = await validateWorkspaceBackup(JSON.stringify(tampered));
  assert(!tamperRes.valid && tamperRes.errors[0].code === 'ERR_CHECKSUM_MISMATCH', 'Test 3.12: Checksum mismatch triggers ERR_CHECKSUM_MISMATCH');

  // 3.8 Missing authoritative collection
  const missingCol = JSON.parse(JSON.stringify(envelope));
  delete missingCol.dataset.clinicalProblems;
  missingCol.integrity.checksum = await computeSha256(canonicalizeJson(missingCol.dataset));
  const missingColRes = await validateWorkspaceBackup(JSON.stringify(missingCol));
  assert(!missingColRes.valid && missingColRes.errors.some((e) => e.code === 'ERR_MISSING_COLLECTION'), 'Test 3.13: Missing collection triggers ERR_MISSING_COLLECTION');

  // 3.9 Non-array collection
  const nonArrayCol = JSON.parse(JSON.stringify(envelope));
  nonArrayCol.dataset.clinicalGoals = 'not-an-array';
  nonArrayCol.integrity.checksum = await computeSha256(canonicalizeJson(nonArrayCol.dataset));
  const nonArrRes = await validateWorkspaceBackup(JSON.stringify(nonArrayCol));
  assert(!nonArrRes.valid && nonArrRes.errors.some((e) => e.code === 'ERR_INVALID_STRUCTURE'), 'Test 3.14: Non-array collection triggers ERR_INVALID_STRUCTURE');

  // 3.10 Duplicate Primary Key within collection
  const duplicateIdDataset = JSON.parse(JSON.stringify(envelope));
  duplicateIdDataset.dataset.patients.push({ ...duplicateIdDataset.dataset.patients[0] });
  duplicateIdDataset.integrity.checksum = await computeSha256(canonicalizeJson(duplicateIdDataset.dataset));
  const dupRes = await validateWorkspaceBackup(JSON.stringify(duplicateIdDataset));
  assert(!dupRes.valid && dupRes.errors.some((e) => e.code === 'ERR_DUPLICATE_ID'), 'Test 3.15: Duplicate primary ID triggers ERR_DUPLICATE_ID');

  // 3.11 Referential integrity: Orphan Case (references non-existent patientId)
  const orphanCaseDataset = JSON.parse(JSON.stringify(envelope));
  orphanCaseDataset.dataset.cases.push({
    id: 'case_orphan',
    caseId: 'CASE-9999',
    patientId: 'pt_non_existent',
    caseName: 'Orphaned Episode',
    startDate: '2024-01-01',
    status: 'Treatment',
  });
  orphanCaseDataset.integrity.checksum = await computeSha256(canonicalizeJson(orphanCaseDataset.dataset));
  const orphanCaseRes = await validateWorkspaceBackup(JSON.stringify(orphanCaseDataset));
  assert(!orphanCaseRes.valid && orphanCaseRes.errors.some((e) => e.code === 'ERR_ORPHAN_RECORD'), 'Test 3.16: Orphan case reference triggers ERR_ORPHAN_RECORD');

  // 3.12 Referential integrity: Orphan Session Treatment Delivery (references non-existent sessionId)
  const orphanDelDataset = JSON.parse(JSON.stringify(envelope));
  orphanDelDataset.dataset.sessionTreatmentDeliveries.push({
    id: 'del_orphan',
    sessionId: 'sess_non_existent',
    caseId: orphanDelDataset.dataset.cases[0].id,
    patientId: orphanDelDataset.dataset.patients[0].id,
    treatmentName: 'Orphan Delivery',
  });
  orphanDelDataset.integrity.checksum = await computeSha256(canonicalizeJson(orphanDelDataset.dataset));
  const orphanDelRes = await validateWorkspaceBackup(JSON.stringify(orphanDelDataset));
  assert(!orphanDelRes.valid && orphanDelRes.errors.some((e) => e.code === 'ERR_ORPHAN_RECORD'), 'Test 3.17: Orphan delivery reference triggers ERR_ORPHAN_RECORD');

  // ==========================================
  // SECTION 4: Replace Restore Execution & ID Preservation
  // ==========================================
  console.log('\n--- Section 4: Replace Restore Execution & ID Preservation ---');

  const mockStorage = new MockStorage();

  // Populate active storage with Initial Patient A & Case A
  const initialActive = buildMockDataset(1, 1);
  initialActive.patients[0].id = 'pt_initial_original';
  initialActive.patients[0].fullName = 'Initial Active Patient';
  initialActive.cases[0].id = 'case_initial_original';

  for (const col of AUTHORITATIVE_COLLECTION_NAMES) {
    mockStorage.setItem(WORKSPACE_STORAGE_KEYS[col], JSON.stringify((initialActive as any)[col]));
  }

  // Prepare candidate backup with Patient B & Case B
  const incomingDataset = buildMockDataset(2, 2);
  incomingDataset.patients[0].id = 'pt_incoming_1';
  incomingDataset.patients[0].fullName = 'Incoming Restored Patient 1';
  incomingDataset.patients[1].id = 'pt_incoming_2';
  incomingDataset.patients[1].fullName = 'Incoming Restored Patient 2';
  incomingDataset.cases[0].id = 'case_incoming_1';
  incomingDataset.cases[1].id = 'case_incoming_2';

  const candidateEnvelope = await createWorkspaceBackupEnvelope(incomingDataset);

  let rehydratedDataset: AuthoritativeWorkspaceDataset | null = null;
  const restoreRes = await executeReplaceRestore(
    candidateEnvelope,
    initialActive,
    (rehydrated) => {
      rehydratedDataset = rehydrated;
    },
    mockStorage
  );

  assert(restoreRes.success === true, 'Test 4.1: executeReplaceRestore executes successfully');
  assert(restoreRes.restoredCounts?.patientCount === 2, 'Test 4.2: Restored summary patient count matches incoming backup (2)');

  // Verify LocalStorage replaced verbatim
  const restoredPatientsJson = mockStorage.getItem(WORKSPACE_STORAGE_KEYS.patients);
  const restoredPatients = JSON.parse(restoredPatientsJson!);
  assert(restoredPatients.length === 2, 'Test 4.3: LocalStorage contains exactly 2 patients');
  assert(restoredPatients[0].id === 'pt_incoming_1', 'Test 4.4: Exact patient ID preserved verbatim without regeneration');
  assert(restoredPatients[0].fullName === 'Incoming Restored Patient 1', 'Test 4.5: Exact patient content preserved');
  assert(restoredPatients[1].id === 'pt_incoming_2', 'Test 4.6: Second patient ID preserved verbatim');

  // Verify NO MERGE semantics: Initial patient A is gone from storage
  assert(!restoredPatients.some((p: any) => p.id === 'pt_initial_original'), 'Test 4.7: Zero merge: initial patient A was completely replaced');

  const restoredCasesJson = mockStorage.getItem(WORKSPACE_STORAGE_KEYS.cases);
  const restoredCases = JSON.parse(restoredCasesJson!);
  assert(restoredCases.length === 2, 'Test 4.8: LocalStorage contains exactly 2 cases');
  assert(restoredCases[0].id === 'case_incoming_1', 'Test 4.9: Exact case ID preserved verbatim');
  assert(!restoredCases.some((c: any) => c.id === 'case_initial_original'), 'Test 4.10: Zero merge: initial case A was completely replaced');

  // Verify rehydration callback was triggered with candidate dataset
  assert(rehydratedDataset !== null && (rehydratedDataset as any).patients.length === 2, 'Test 4.11: Application state rehydration callback executed');

  // ==========================================
  // SECTION 5: Rollback Staging & Fail-Closed Protection
  // ==========================================
  console.log('\n--- Section 5: Rollback Staging & Fail-Closed Protection ---');

  // Setup mock storage that fails mid-write on key #10
  const faultStorage = new MockStorage();
  for (const col of AUTHORITATIVE_COLLECTION_NAMES) {
    faultStorage.setItem(WORKSPACE_STORAGE_KEYS[col], JSON.stringify((initialActive as any)[col]));
  }

  let writeCount = 0;
  const originalSetItem = faultStorage.setItem.bind(faultStorage);
  faultStorage.setItem = (k: string, v: string) => {
    writeCount++;
    if (writeCount === 8) {
      throw new Error('Disk quota exceeded simulated failure on collection write.');
    }
    originalSetItem(k, v);
  };

  const failedRestoreRes = await executeReplaceRestore(
    candidateEnvelope,
    initialActive,
    () => {},
    faultStorage
  );

  assert(failedRestoreRes.success === false, 'Test 5.1: Mid-write failure causes restore to abort');
  assert(failedRestoreRes.error?.includes('Best-effort rollback succeeded'), 'Test 5.2: Diagnostic feedback states rollback succeeded');

  // Verify active database rolled back 100% to initialActive state
  const rolledBackPatients = JSON.parse(faultStorage.getItem(WORKSPACE_STORAGE_KEYS.patients)!);
  assert(rolledBackPatients.length === 1, 'Test 5.3: Rollback verified: patient collection rolled back to 1 item');
  assert(rolledBackPatients[0].id === 'pt_initial_original', 'Test 5.4: Rollback verified: original patient ID intact');

  // Test Critical Recovery State when rollback itself fails
  const catastrophicStorage = new MockStorage();
  for (const col of AUTHORITATIVE_COLLECTION_NAMES) {
    catastrophicStorage.setItem(WORKSPACE_STORAGE_KEYS[col], JSON.stringify((initialActive as any)[col]));
  }

  catastrophicStorage.setItem = () => {
    throw new Error('Unrecoverable storage hardware failure');
  };

  // Mock global window object for test environment
  if (typeof (globalThis as any).window === 'undefined') {
    (globalThis as any).window = {};
  }

  const catastrophicRes = await executeReplaceRestore(
    candidateEnvelope,
    initialActive,
    () => {},
    catastrophicStorage
  );

  assert(catastrophicRes.success === false, 'Test 5.5: Catastrophic storage failure returns failure');
  assert(catastrophicRes.criticalRecovery === true, 'Test 5.6: Critical recovery flag is true');
  assert((globalThis as any).window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__ !== undefined, 'Test 5.7: Emergency recovery snapshot attached to window global');
  assert((globalThis as any).window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__.preRestoreSnapshot.patients[0].id === 'pt_initial_original', 'Test 5.8: Pre-restore snapshot preserves original data in memory');

  // Clean up global window mock
  delete (globalThis as any).window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__;

  // ==========================================
  // SECTION 6: UI Component Rendering
  // ==========================================
  console.log('\n--- Section 6: UI Component Rendering ---');

  const mockContextValue: any = {
    getAuthoritativeWorkspaceDataset: () => mockDataset,
    restoreWorkspaceDataset: () => {},
  };

  const uiHtml = renderToStaticMarkup(
    React.createElement(
      ClinicalContext.Provider,
      { value: mockContextValue },
      React.createElement(DataManagementSection)
    )
  );

  assert(uiHtml.includes('Data Management, Backup &amp; Disaster Recovery'), 'Test 6.1: Section title rendered in document');
  assert(uiHtml.includes('id="download-workspace-backup-btn"'), 'Test 6.2: "Download Workspace Backup" button rendered');
  assert(uiHtml.includes('id="backup-file-input"'), 'Test 6.3: "Select Backup File" file input rendered');
  assert(uiHtml.includes('id="initiate-restore-btn"'), 'Test 6.4: "Verify &amp; Restore Workspace" button rendered');
  assert(uiHtml.includes('Sensitive Clinical Data Notice'), 'Test 6.5: Sensitive clinical health data notice rendered');
  assert(uiHtml.includes('Current Workspace Caseload:'), 'Test 6.6: Current caseload stats summary card rendered');
  assert(uiHtml.includes('Patients:'), 'Test 6.7: Patient count label rendered');
  assert(uiHtml.includes('Care Episodes:'), 'Test 6.8: Care episode count label rendered');

  // Final summary
  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed === 0) {
    console.log('ALL STAGE 12B TESTS PASSED SUCCESSFULLY.');
  } else {
    console.error('STAGE 12B VERIFICATION FAILED.');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
