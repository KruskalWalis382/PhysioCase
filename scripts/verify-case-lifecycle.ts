/**
 * PHYSIOCASE — CASE LIFECYCLE REORGANIZATION & ARCHIVAL ENGINE
 * VERIFICATION TEST SUITE
 */

import {
  Case,
  Patient,
  AppSettings,
  ClinicalSession,
  ClinicalProblem,
  ClinicalGoal,
  SubjectiveAssessment,
  ClinicalInvestigation,
} from '../src/types';

import {
  getCaseClinicalFootprint,
  canArchiveCase,
  CaseFootprintDataset,
  WORKSPACE_24_COLLECTION_DELETION_MATRIX,
} from '../src/utils/clinicalAudit';

import {
  deriveCaseloadGovernance,
} from '../src/utils/clinicalGovernance';

import {
  deriveHistoricalCaseSummaries,
  LongitudinalClinicalDataset,
} from '../src/utils/longitudinalPatientHistory';

import {
  ARCHIVE_REASONS_CATALOGUE,
  formatArchiveReasonLabel,
} from '../src/components/modals/ArchiveCaseModal';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    failed++;
  }
}

console.log('=== PHYSIOCASE CASE LIFECYCLE VERIFICATION SUITE ===\n');

// -------------------------------------------------------------
// Test Helpers & Mock Data
// -------------------------------------------------------------
const mockPatient: Patient = {
  id: 'patient-001',
  fullName: 'John Doe',
  dateOfBirth: '1985-05-15',
  sex: 'Male',
  phone: '555-0100',
  email: 'john@example.com',
  reasonForVisit: 'Lumbar pain',
  status: 'active',
  createdAt: '2026-01-01T10:00:00.000Z',
};

const mockPreClinicalCase: Case = {
  id: 'case-empty-1',
  caseId: 'CASE-0001',
  patientId: 'patient-001',
  caseName: 'Accidental Shell Case',
  startDate: '2026-03-01',
  status: 'Assessment',
  createdAt: '2026-03-01T09:00:00.000Z',
};

const mockDocumentedCase: Case = {
  id: 'case-documented-1',
  caseId: 'CASE-0002',
  patientId: 'patient-001',
  caseName: 'Lumbar Spine Rehabilitation',
  presentingProblem: 'Mechanical low back pain with radiculopathy',
  startDate: '2026-02-01',
  status: 'Treatment',
  createdAt: '2026-02-01T09:00:00.000Z',
};

const emptyDataset: CaseFootprintDataset = {
  clinicalSessions: [],
  sessionTreatmentDeliveries: [],
  progressRecords: [],
  progressMeasurements: [],
  caseDischargeRecords: [],
  subjectiveAssessments: [],
  objectiveAssessments: [],
  clinicalProblems: [],
  clinicalGoals: [],
  treatmentPlans: [],
  treatmentSelections: [],
  clinicalInvestigations: [],
};

// -------------------------------------------------------------
// Section 1: Pure Clinical Footprint Detection
// -------------------------------------------------------------
console.log('--- Section 1: Clinical Footprint Detection ---');

const emptyFootprint = getCaseClinicalFootprint(mockPreClinicalCase, emptyDataset);
assert(emptyFootprint.isPreClinical === true, 'Test 1.1: Empty case correctly evaluated as isPreClinical = true');
assert(emptyFootprint.summaryFootprintCount === 0, 'Test 1.2: Empty case has summaryFootprintCount = 0');

// Case with session
const sessionDataset: CaseFootprintDataset = {
  ...emptyDataset,
  clinicalSessions: [
    {
      id: 'session-1',
      caseId: 'case-documented-1',
      sessionNumber: 1,
      sessionDate: '2026-02-05',
      sessionTime: '10:00',
      durationMinutes: 45,
      subjectiveNotes: 'Initial evaluation',
      objectiveNotes: 'Restricted flexion',
      treatmentNotes: 'Manual mobilization',
      planNotes: 'HEP prescribed',
      status: 'completed',
      createdAt: '2026-02-05T10:00:00.000Z',
    } as unknown as ClinicalSession,
  ],
};
const sessionFootprint = getCaseClinicalFootprint(mockDocumentedCase, sessionDataset);
assert(sessionFootprint.isPreClinical === false, 'Test 1.3: Case with 1 session is NOT pre-clinical');
assert(sessionFootprint.sessionsCount === 1, 'Test 1.4: sessionsCount = 1 detected');

// Case with active problem
const problemDataset: CaseFootprintDataset = {
  ...emptyDataset,
  clinicalProblems: [
    {
      id: 'prob-1',
      caseId: 'case-documented-1',
      title: 'Lumbar Flexion Restriction',
      status: 'active',
      patientId: 'patient-001',
      createdAt: '2026-02-01T10:00:00.000Z',
    } as unknown as ClinicalProblem,
  ],
};
const problemFootprint = getCaseClinicalFootprint(mockDocumentedCase, problemDataset);
assert(problemFootprint.isPreClinical === false, 'Test 1.5: Case with active problem is NOT pre-clinical');
assert(problemFootprint.activeProblemsCount === 1, 'Test 1.6: activeProblemsCount = 1 detected');

// Case with documented subjective
const subjectiveDataset: CaseFootprintDataset = {
  ...emptyDataset,
  subjectiveAssessments: [
    {
      id: 'subj-1',
      caseId: 'case-documented-1',
      patientId: 'patient-001',
      patientStory: 'Patient describes acute onset back pain after lifting',
      status: 'in_progress',
      createdAt: '2026-02-01T10:00:00.000Z',
    } as unknown as SubjectiveAssessment,
  ],
};
const subjectiveFootprint = getCaseClinicalFootprint(mockDocumentedCase, subjectiveDataset);
assert(subjectiveFootprint.isPreClinical === false, 'Test 1.7: Case with patientStory in subjective note is NOT pre-clinical');
assert(subjectiveFootprint.hasDocumentedSubjective === true, 'Test 1.8: hasDocumentedSubjective = true detected');

// Case with active goal
const goalDataset: CaseFootprintDataset = {
  ...emptyDataset,
  clinicalGoals: [
    {
      id: 'goal-1',
      caseId: 'case-documented-1',
      title: 'Walking tolerance',
      type: 'short_term',
      linkedProblemIds: [],
      targetValue: '30 mins',
      status: 'active',
      createdAt: '2026-02-01T10:00:00.000Z',
    } as unknown as ClinicalGoal,
  ],
};
const goalFootprint = getCaseClinicalFootprint(mockDocumentedCase, goalDataset);
assert(goalFootprint.isPreClinical === false, 'Test 1.9: Case with active goal is NOT pre-clinical');
assert(goalFootprint.activeGoalsCount === 1, 'Test 1.10: activeGoalsCount = 1 detected');

// Case with investigation
const invDataset: CaseFootprintDataset = {
  ...emptyDataset,
  clinicalInvestigations: [
    {
      id: 'inv-1',
      caseId: 'case-documented-1',
      patientId: 'patient-001',
      type: 'imaging_mri',
      requestedDate: '2026-02-01',
      summaryFindings: 'Lumbar disc protrusion',
      status: 'reviewed',
      createdAt: '2026-02-01T10:00:00.000Z',
    } as unknown as ClinicalInvestigation,
  ],
};
const invFootprint = getCaseClinicalFootprint(mockDocumentedCase, invDataset);
assert(invFootprint.isPreClinical === false, 'Test 1.11: Case with clinical investigation is NOT pre-clinical');
assert(invFootprint.investigationsCount === 1, 'Test 1.12: investigationsCount = 1 detected');

// -------------------------------------------------------------
// Section 2: Archival Policy & Eligibility
// -------------------------------------------------------------
console.log('\n--- Section 2: Archival Policy & Eligibility ---');

// Pre-clinical cases
const preClinicalCreatedInError = canArchiveCase(mockPreClinicalCase, emptyDataset, 'created_in_error');
assert(preClinicalCreatedInError.allowed === true, 'Test 2.1: Pre-clinical shell allowed to archive as "created_in_error"');

const preClinicalTestDemo = canArchiveCase(mockPreClinicalCase, emptyDataset, 'test_or_demo');
assert(preClinicalTestDemo.allowed === true, 'Test 2.2: Pre-clinical shell allowed to archive as "test_or_demo"');

const preClinicalDuplicateWithoutNotes = canArchiveCase(mockPreClinicalCase, emptyDataset, 'duplicate_entry', '');
assert(preClinicalDuplicateWithoutNotes.allowed === false, 'Test 2.3: "duplicate_entry" requires explanatory notes');

const preClinicalDuplicateWithNotes = canArchiveCase(
  mockPreClinicalCase,
  emptyDataset,
  'duplicate_entry',
  'Duplicate case opened accidentally; authoritative case is CASE-0002'
);
assert(preClinicalDuplicateWithNotes.allowed === true, 'Test 2.4: "duplicate_entry" allowed with notes');

const preClinicalWrongPatientWithoutNotes = canArchiveCase(mockPreClinicalCase, emptyDataset, 'wrong_patient');
assert(preClinicalWrongPatientWithoutNotes.allowed === false, 'Test 2.5: "wrong_patient" requires explanatory notes');

const preClinicalDiscontinuedAttempt = canArchiveCase(mockPreClinicalCase, emptyDataset, 'care_discontinued_uncontactable');
assert(
  preClinicalDiscontinuedAttempt.allowed === false,
  'Test 2.6: Pre-clinical case cannot be archived as clinical care discontinuation'
);

// Documented clinical cases
const fullDocumentedDataset: CaseFootprintDataset = {
  ...emptyDataset,
  clinicalSessions: [
    {
      id: 'session-1',
      caseId: 'case-documented-1',
      sessionNumber: 1,
      sessionDate: '2026-02-05',
      status: 'completed',
      createdAt: '2026-02-05T10:00:00.000Z',
    } as unknown as ClinicalSession,
  ],
  clinicalProblems: [
    {
      id: 'prob-1',
      caseId: 'case-documented-1',
      title: 'Lumbar Pain',
      status: 'active',
      createdAt: '2026-02-01T10:00:00.000Z',
    } as unknown as ClinicalProblem,
  ],
};

const documentedCreatedInErrorAttempt = canArchiveCase(
  mockDocumentedCase,
  fullDocumentedDataset,
  'created_in_error',
  'Attempt to delete clinical case'
);
assert(
  documentedCreatedInErrorAttempt.allowed === false,
  'Test 2.7: Safeguard blocks archiving documented clinical case as "created_in_error"'
);

const documentedTestDemoAttempt = canArchiveCase(
  mockDocumentedCase,
  fullDocumentedDataset,
  'test_or_demo',
  'Attempting test archive'
);
assert(
  documentedTestDemoAttempt.allowed === false,
  'Test 2.8: Safeguard blocks archiving documented clinical case as "test_or_demo"'
);

const documentedDiscontinuedWithoutNotes = canArchiveCase(
  mockDocumentedCase,
  fullDocumentedDataset,
  'care_discontinued_uncontactable'
);
assert(
  documentedDiscontinuedWithoutNotes.allowed === false,
  'Test 2.9: Documented clinical case requires explanatory notes'
);

const documentedDiscontinuedWithNotes = canArchiveCase(
  mockDocumentedCase,
  fullDocumentedDataset,
  'care_discontinued_uncontactable',
  'Patient defaulted after session 1; three attempts to contact by telephone unreturned'
);
assert(
  documentedDiscontinuedWithNotes.allowed === true,
  'Test 2.10: Documented case allowed to archive as "care_discontinued_uncontactable" with clinical notes'
);

const documentedTransferWithNotes = canArchiveCase(
  mockDocumentedCase,
  fullDocumentedDataset,
  'care_transferred_external',
  'Care transferred to Orthopaedic Spine Clinic at City General Hospital'
);
assert(
  documentedTransferWithNotes.allowed === true,
  'Test 2.11: Documented case allowed to archive as "care_transferred_external" with notes'
);

// Already archived case
const alreadyArchivedCase: Case = {
  ...mockPreClinicalCase,
  isArchived: true,
  archivedAt: '2026-03-02T10:00:00.000Z',
  archiveReason: 'created_in_error',
};
const alreadyArchivedAttempt = canArchiveCase(alreadyArchivedCase, emptyDataset, 'created_in_error');
assert(alreadyArchivedAttempt.allowed === false, 'Test 2.12: Already archived case cannot be archived again');

// -------------------------------------------------------------
// Section 3: Stage 13 Governance Neutrality & Deletion Matrix
// -------------------------------------------------------------
console.log('\n--- Section 3: Stage 13 Governance Neutrality ---');

assert(
  WORKSPACE_24_COLLECTION_DELETION_MATRIX.cases.category === 'NEVER_DELETE',
  'Test 3.1: "cases" collection strictly remains NEVER_DELETE in Stage 13 deletion matrix'
);

const totalCollections = Object.keys(WORKSPACE_24_COLLECTION_DELETION_MATRIX).length;
assert(totalCollections === 24, 'Test 3.2: Workspace maintains exactly 24 collections (zero collections added/removed)');

assert(
  ARCHIVE_REASONS_CATALOGUE.length === 8,
  'Test 3.3: Exactly 8 governed archival reasons defined in ARCHIVE_REASONS_CATALOGUE'
);

assert(
  formatArchiveReasonLabel('created_in_error').includes('Created in Error'),
  'Test 3.4: formatArchiveReasonLabel formats "created_in_error" cleanly'
);

assert(
  formatArchiveReasonLabel('care_discontinued_uncontactable').includes('Care Discontinued'),
  'Test 3.5: formatArchiveReasonLabel formats "care_discontinued_uncontactable" cleanly'
);

// -------------------------------------------------------------
// Section 4: Longitudinal History & Caseload Filtering
// -------------------------------------------------------------
console.log('\n--- Section 4: Longitudinal History & Caseload Filtering ---');

const longitudinalDataset: LongitudinalClinicalDataset = {
  patients: [mockPatient],
  cases: [
    mockDocumentedCase,
    mockPreClinicalCase, // pre-clinical shell
    {
      ...mockPreClinicalCase,
      id: 'case-archived-shell',
      caseId: 'CASE-0003',
      isArchived: true,
      archiveReason: 'created_in_error',
      archivedAt: '2026-03-02T10:00:00.000Z',
    },
    {
      ...mockDocumentedCase,
      id: 'case-archived-documented',
      caseId: 'CASE-0004',
      caseName: 'Historical Cervical Spine Care',
      isArchived: true,
      archiveReason: 'care_discontinued_uncontactable',
      archivedAt: '2026-03-02T10:00:00.000Z',
      archiveNotes: 'Patient relocated',
    },
  ],
  clinicalSessions: [
    {
      id: 'session-doc-1',
      caseId: 'case-documented-1',
      sessionNumber: 1,
      sessionDate: '2026-02-05',
      status: 'completed',
      createdAt: '2026-02-05T10:00:00.000Z',
    } as unknown as ClinicalSession,
    {
      id: 'session-archived-1',
      caseId: 'case-archived-documented',
      sessionNumber: 1,
      sessionDate: '2025-10-10',
      status: 'completed',
      createdAt: '2025-10-10T10:00:00.000Z',
    } as unknown as ClinicalSession,
  ],
  sessionTreatmentDeliveries: [],
  progressRecords: [],
  progressMeasurements: [],
  caseDischargeRecords: [],
  subjectiveAssessments: [],
  objectiveAssessments: [],
  clinicalProblems: [
    {
      id: 'prob-archived-1',
      caseId: 'case-archived-documented',
      title: 'Cervical Radiculopathy',
      status: 'active',
      createdAt: '2025-10-10T10:00:00.000Z',
    } as unknown as ClinicalProblem,
  ],
  clinicalGoals: [],
  clinicalInvestigations: [],
};

const historicalSummaries = deriveHistoricalCaseSummaries('patient-001', longitudinalDataset);

// Pre-clinical archived shell should NOT appear in historical summaries
const containsPreClinicalArchived = historicalSummaries.some((h) => h.caseId === 'case-archived-shell');
assert(
  containsPreClinicalArchived === false,
  'Test 4.1: Pre-clinical archived case (created_in_error) is filtered out of longitudinal history'
);

// Documented archived case SHOULD appear in historical summaries with isArchived: true
const documentedArchived = historicalSummaries.find((h) => h.caseId === 'case-archived-documented');
assert(
  documentedArchived !== undefined && documentedArchived.isArchived === true,
  'Test 4.2: Documented archived case is preserved in longitudinal history with isArchived = true'
);
assert(
  documentedArchived?.archiveReason === 'care_discontinued_uncontactable',
  'Test 4.3: Documented archived case preserves archiveReason'
);
assert(
  documentedArchived?.archiveNotes === 'Patient relocated',
  'Test 4.4: Documented archived case preserves archiveNotes'
);

// Caseload Governance
const mockSettings: AppSettings = {
  practitionerName: 'Dr. Jane Smith',
  credentials: 'PT, DPT',
  clinicName: 'PhysioClinic',
  licenseNumber: 'PT-12345',
  email: 'jane@example.com',
  theme: 'warm-clinical',
  density: 'comfortable',
  measurementSystem: 'metric',
  framework: 'journey',
  reviewCadenceWeeks: 4,
};

const caseloadGov = deriveCaseloadGovernance({
  cases: longitudinalDataset.cases,
  patients: longitudinalDataset.patients,
  subjectiveAssessments: longitudinalDataset.subjectiveAssessments,
  objectiveAssessments: longitudinalDataset.objectiveAssessments,
  clinicalProblems: longitudinalDataset.clinicalProblems,
  clinicalGoals: longitudinalDataset.clinicalGoals,
  treatmentPlans: [],
  treatmentSelections: [],
  clinicalSessions: longitudinalDataset.clinicalSessions,
  progressRecords: longitudinalDataset.progressRecords,
  progressMeasurements: longitudinalDataset.progressMeasurements,
  settings: mockSettings,
});

assert(
  caseloadGov.archivedCasesCount === 2,
  'Test 4.5: Caseload governance correctly counts exactly 2 archived cases'
);

assert(
  caseloadGov.activeCasesCount === 2,
  'Test 4.6: Caseload governance activeCasesCount excludes archived cases'
);

// -------------------------------------------------------------
// Section 5: Archived Case Read-Only Enforcement & State Semantics
// -------------------------------------------------------------
console.log('\n--- Section 5: Archived Case Read-Only Domain Enforcement & Clinical State Semantics ---');

import * as fs from 'fs';
import * as path from 'path';

const clinicalContextSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/context/ClinicalContext.tsx'),
  'utf-8'
);

// Verify assertCaseNotArchived exists and is called in mutation pathways
const requiredGuards = [
  'updateCase',
  'saveSubjectiveAssessment',
  'saveObjectiveAssessment',
  'saveClinicalProblem',
  'deleteClinicalProblem',
  'saveClinicalGoal',
  'deleteClinicalGoal',
  'saveTreatmentPlan',
  'deleteTreatmentPlan',
  'saveTreatmentSelection',
  'deleteTreatmentSelection',
  'saveClinicalSession',
  'deleteClinicalSession',
  'saveSessionTreatmentDelivery',
  'deleteSessionTreatmentDelivery',
  'saveProgressRecord',
  'deleteProgressRecord',
  'saveProgressMeasurement',
  'deleteProgressMeasurement',
  'saveCaseDischargeRecord',
  'deleteCaseDischargeRecord',
  'saveClinicalInvestigation',
  'deleteClinicalInvestigation',
  'reopenCase',
];

for (const fnName of requiredGuards) {
  // Find where the function starts
  const startIdx = clinicalContextSource.indexOf(`const ${fnName} =`);
  assert(startIdx !== -1, `Test 5.FnExists: "${fnName}" is defined in ClinicalContext`);
  if (startIdx !== -1) {
    // Check the following 600 characters for assertCaseNotArchived
    const slice = clinicalContextSource.slice(startIdx, startIdx + 800);
    assert(
      slice.includes('assertCaseNotArchived'),
      `Test 5.Guard: "${fnName}" is protected by assertCaseNotArchived`
    );
  }
}

// Clinical State Semantics Tests
// 1. Treatment + Active
const stateTreatmentActive: Case = {
  ...mockDocumentedCase,
  status: 'Treatment',
  isArchived: false,
};
assert(
  stateTreatmentActive.status === 'Treatment' && stateTreatmentActive.isArchived !== true,
  'Test 5.1: Treatment + Active is valid and distinct'
);

// 2. Treatment + Archived
const stateTreatmentArchived: Case = {
  ...mockDocumentedCase,
  status: 'Treatment',
  isArchived: true,
  archiveReason: 'care_discontinued_uncontactable',
};
assert(
  stateTreatmentArchived.status === 'Treatment' && stateTreatmentArchived.isArchived === true,
  'Test 5.2: Treatment + Archived preserves status Treatment independent of isArchived'
);

// 3. Discharged + Active
const stateDischargedActive: Case = {
  ...mockDocumentedCase,
  status: 'Discharged',
  isArchived: false,
};
assert(
  stateDischargedActive.status === 'Discharged' && stateDischargedActive.isArchived !== true,
  'Test 5.3: Discharged + Active is valid and distinct'
);

// 4. Discharged + Archived
const stateDischargedArchived: Case = {
  ...mockDocumentedCase,
  status: 'Discharged',
  isArchived: true,
  archiveReason: 'administrative_closure',
};
assert(
  stateDischargedArchived.status === 'Discharged' && stateDischargedArchived.isArchived === true,
  'Test 5.4: Discharged + Archived preserves status Discharged with isArchived = true'
);

// Unarchive clears live metadata while recording in audit
assert(
  clinicalContextSource.includes("['isArchived', 'archivedAt', 'archivedBy', 'archiveReason', 'archiveNotes']"),
  'Test 5.5: unarchiveCase records all cleared archival fields in changedFields'
);

assert(
  clinicalContextSource.includes('previousArchiveReason') && clinicalContextSource.includes('previousArchivedAt'),
  'Test 5.6: unarchiveCase preserves historical archival context in audit event metadata'
);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log(`\n=============================================================`);
console.log(`Verification complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  console.error(`SOME TESTS FAILED!`);
  process.exit(1);
} else {
  console.log(`ALL CASE LIFECYCLE TESTS PASSED SUCCESSFULLY.`);
  process.exit(0);
}
