/**
 * Stage 10D-1 Verification Test Suite
 *
 * Covers all 12 required test conditions specified in Section 24:
 * Test 1: Empty patient
 * Test 2: Single current case
 * Test 3: Multiple cases (Case A, B, C; viewing B gives A and C, never B)
 * Test 4: Current case display ID protection
 * Test 5: Patient isolation
 * Test 6: Safety profile exposed without mutation or inference
 * Test 7: Historical problem provenance
 * Test 8: Historical outcome provenance
 * Test 9: Historical treatment provenance
 * Test 10: Timeline exclusion
 * Test 11: Mutation safety
 * Test 12: Deterministic sorting
 */

import {
  Patient,
  Case,
  ClinicalProblem,
  ClinicalSession,
  SessionTreatmentDelivery,
  ProgressRecord,
  ProgressMeasurement,
  CaseDischargeRecord,
} from '../src/types';
import {
  LongitudinalClinicalDataset,
  deriveCaseLongitudinalContext,
} from '../src/utils/longitudinalPatientHistory';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`✓ [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

// Helpers
const mockPatient = (id: string, name: string): Patient => ({
  id,
  fullName: name,
  dateOfBirth: '1985-05-15',
  reasonForVisit: 'Assessment',
  status: 'active',
  createdAt: '2025-01-01T00:00:00.000Z',
  patientSafetyProfile: {
    allergies: [
      {
        id: `alg-${id}`,
        allergen: 'Latex',
        reactionType: 'Contact dermatitis',
        severity: 'moderate',
        recordedAt: '2025-01-01T00:00:00.000Z',
        recordedBy: 'Dr. Clinician',
        source: 'patient_reported',
        verificationStatus: 'verified',
      },
    ],
    persistentPrecautions: [
      {
        id: `prc-${id}`,
        precaution: 'Avoid cervical high-velocity thrust manipulation',
        category: 'biomechanical',
        details: 'History of cervical disc prolapse',
        recordedAt: '2025-01-01T00:00:00.000Z',
        recordedBy: 'Dr. Clinician',
        source: 'clinician_entry',
        verificationStatus: 'verified',
      },
    ],
    surgicalHistory: [
      {
        id: `srg-${id}`,
        procedure: 'Right Knee ACL Reconstruction',
        approximateDateOrYear: '2020',
        bodyRegion: 'Knee',
        recordedAt: '2025-01-01T00:00:00.000Z',
        recordedBy: 'Dr. Clinician',
        source: 'referral_letter',
        verificationStatus: 'verified',
      },
    ],
    persistentMedicalConditions: [
      {
        id: `cnd-${id}`,
        conditionName: 'Type 1 Diabetes Mellitus',
        clinicalRelevanceToPhysio: 'Altered tissue healing',
        isActive: true,
        recordedAt: '2025-01-01T00:00:00.000Z',
        recordedBy: 'Dr. Clinician',
        source: 'patient_reported',
        verificationStatus: 'unverified',
      },
    ],
  },
});

const mockCase = (
  id: string,
  displayId: string,
  patientId: string,
  name: string,
  startDate: string,
  status: Case['status'] = 'Treatment'
): Case => ({
  id,
  caseId: displayId,
  patientId,
  caseName: name,
  bodyRegion: 'Lumbar',
  status,
  stage: 'treatment',
  startDate,
  createdAt: `${startDate}T09:00:00.000Z`,
  updatedAt: `${startDate}T09:00:00.000Z`,
});

const createEmptyDataset = (): LongitudinalClinicalDataset => ({
  patients: [],
  cases: [],
  subjectiveAssessments: [],
  objectiveAssessments: [],
  clinicalInvestigations: [],
  clinicalProblems: [],
  clinicalGoals: [],
  clinicalSessions: [],
  sessionTreatmentDeliveries: [],
  progressRecords: [],
  progressMeasurements: [],
  caseDischargeRecords: [],
});

function runTests() {
  console.log('=== STAGE 10D-1 VERIFICATION TEST SUITE ===');

  // TEST 1: Empty Patient
  {
    const dataset = createEmptyDataset();
    const result = deriveCaseLongitudinalContext('pt-empty', 'case-none', dataset);
    assert(result.patientId === 'pt-empty', 'Test 1: Patient ID preserved for empty patient');
    assert(result.historicalCases.length === 0, 'Test 1: historicalCases is empty');
    assert(result.historicalProblems.length === 0, 'Test 1: historicalProblems is empty');
    assert(result.historicalOutcomes.length === 0, 'Test 1: historicalOutcomes is empty');
    assert(result.historicalTreatments.length === 0, 'Test 1: historicalTreatments is empty');
    assert(result.timelineEvents.length === 0, 'Test 1: timelineEvents is empty');
  }

  // TEST 2: Single Current Case
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const c1 = mockCase('case-1', 'CASE-001', 'pt-1', 'Lumbar Episode', '2025-01-10');
    dataset.patients.push(pt);
    dataset.cases.push(c1);

    // Add a problem, measurement, session, delivery in case-1
    dataset.clinicalProblems.push({
      id: 'prob-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      title: 'L4-L5 discogenic pain',
      status: 'active',
      linkedFindingIds: [],
      createdAt: '2025-01-10T10:00:00.000Z',
      updatedAt: '2025-01-10T10:00:00.000Z',
    });

    dataset.progressRecords.push({
      id: 'pr-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      recordDate: '2025-01-10',
      contextType: 'routine_progress_review',
      therapistSummary: 'Baseline assessment',
      createdAt: '2025-01-10T10:00:00.000Z',
      updatedAt: '2025-01-10T10:00:00.000Z',
    });

    dataset.progressMeasurements.push({
      id: 'm-1',
      progressRecordId: 'pr-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureName: 'NPRS',
      category: 'pain',
      valueType: 'numeric',
      stage: 'baseline',
      numericValue: 8,
      unit: '/10',
      createdAt: '2025-01-10T10:00:00.000Z',
      updatedAt: '2025-01-10T10:00:00.000Z',
    });

    dataset.clinicalSessions.push({
      id: 'sess-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      sessionNumber: 1,
      sessionDate: '2025-01-10',
      status: 'completed',
      overallTolerance: 'well_tolerated',
      createdAt: '2025-01-10T10:00:00.000Z',
      updatedAt: '2025-01-10T10:00:00.000Z',
    });

    dataset.sessionTreatmentDeliveries.push({
      id: 'del-1',
      sessionId: 'sess-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      title: 'Lumbar stabilization exercises',
      interventionType: 'therapeutic_exercise',
      deliveryStatus: 'completed_as_planned',
      createdAt: '2025-01-10T10:00:00.000Z',
      updatedAt: '2025-01-10T10:00:00.000Z',
    });

    const result = deriveCaseLongitudinalContext('pt-1', 'case-1', dataset);
    assert(result.historicalCases.length === 0, 'Test 2: Single case patient has 0 historical cases');
    assert(result.historicalProblems.length === 0, 'Test 2: Single case patient has 0 historical problems');
    assert(result.historicalOutcomes.length === 0, 'Test 2: Single case patient has 0 historical outcomes');
    assert(result.historicalTreatments.length === 0, 'Test 2: Single case patient has 0 historical treatments');
    assert(result.timelineEvents.length === 0, 'Test 2: Single case patient has 0 historical case timeline events');
  }

  // TEST 3: Multiple Cases (Case A, Case B, Case C - viewing Case B returns Case A and Case C, never Case B)
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const caseA = mockCase('case-a', 'CASE-A', 'pt-1', 'Episode A', '2024-01-01', 'Discharged');
    const caseB = mockCase('case-b', 'CASE-B', 'pt-1', 'Episode B', '2024-06-01', 'Treatment');
    const caseC = mockCase('case-c', 'CASE-C', 'pt-1', 'Episode C', '2025-01-01', 'Treatment');
    dataset.patients.push(pt);
    dataset.cases.push(caseA, caseB, caseC);

    const result = deriveCaseLongitudinalContext('pt-1', 'case-b', dataset);
    assert(result.historicalCases.length === 2, 'Test 3: Exactly 2 historical cases derived');
    const returnedIds = result.historicalCases.map((c) => c.caseId);
    assert(!returnedIds.includes('case-b'), 'Test 3: Current Case B is NEVER in historicalCases');
    assert(returnedIds.includes('case-a'), 'Test 3: Historical Case A is included');
    assert(returnedIds.includes('case-c'), 'Test 3: Historical Case C is included');
  }

  // TEST 4: Current Case Display ID Protection
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const caseX = mockCase('case-uuid-999', 'DISP-999', 'pt-1', 'Episode X', '2025-01-01');
    const caseY = mockCase('case-uuid-888', 'DISP-888', 'pt-1', 'Episode Y', '2024-01-01');
    dataset.patients.push(pt);
    dataset.cases.push(caseX, caseY);

    // Call using display ID as currentCaseId
    const resultByDisplayId = deriveCaseLongitudinalContext('pt-1', 'DISP-999', dataset);
    assert(resultByDisplayId.historicalCases.length === 1, 'Test 4: Correct exclusion when passing display ID');
    assert(resultByDisplayId.historicalCases[0].caseId === 'case-uuid-888', 'Test 4: Only Episode Y returned');

    // Call using internal UUID
    const resultByUuid = deriveCaseLongitudinalContext('pt-1', 'case-uuid-999', dataset);
    assert(resultByUuid.historicalCases.length === 1, 'Test 4: Correct exclusion when passing internal UUID');
    assert(resultByUuid.historicalCases[0].caseId === 'case-uuid-888', 'Test 4: Only Episode Y returned');
  }

  // TEST 5: Patient Isolation
  {
    const dataset = createEmptyDataset();
    const pt1 = mockPatient('pt-1', 'Alice');
    const pt2 = mockPatient('pt-2', 'Bob');
    const casePt1 = mockCase('case-1', 'C-1', 'pt-1', 'Alice Case', '2025-01-01');
    const casePt2 = mockCase('case-2', 'C-2', 'pt-2', 'Bob Case', '2025-01-01');
    dataset.patients.push(pt1, pt2);
    dataset.cases.push(casePt1, casePt2);

    dataset.clinicalProblems.push({
      id: 'prob-bob',
      caseId: 'case-2',
      patientId: 'pt-2',
      title: 'Bob Cervical Radiculopathy',
      status: 'active',
      linkedFindingIds: [],
      createdAt: '2025-01-01T10:00:00.000Z',
      updatedAt: '2025-01-01T10:00:00.000Z',
    });

    const result = deriveCaseLongitudinalContext('pt-1', 'case-1', dataset);
    assert(result.historicalProblems.length === 0, 'Test 5: Pt 1 historical problems has 0 leakage from Pt 2');
    assert(result.historicalCases.length === 0, 'Test 5: Pt 1 historical cases has 0 leakage from Pt 2');
    assert(result.patient?.id === 'pt-1', 'Test 5: Correct patient identity attached');
  }

  // TEST 6: Safety Profile Exposed Without Mutation or Inference
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const c1 = mockCase('case-1', 'C-1', 'pt-1', 'Episode 1', '2025-01-01');
    dataset.patients.push(pt);
    dataset.cases.push(c1);

    const result = deriveCaseLongitudinalContext('pt-1', 'case-1', dataset);
    assert(result.safetyProfile.allergies.length === 1, 'Test 6: Allergy preserved');
    assert(result.safetyProfile.allergies[0].allergen === 'Latex', 'Test 6: Allergen name preserved');
    assert(result.safetyProfile.persistentPrecautions.length === 1, 'Test 6: Precaution preserved');
    assert(result.safetyProfile.surgicalHistory.length === 1, 'Test 6: Surgery preserved');
    assert(result.safetyProfile.persistentMedicalConditions.length === 1, 'Test 6: Medical condition preserved');
    assert(result.safetyAlerts.verifiedCount === 3, 'Test 6: Verified count correct');
    assert(result.safetyAlerts.unverifiedCount === 1, 'Test 6: Unverified count correct');
  }

  // TEST 7: Historical Problem Provenance
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const case1 = mockCase('case-1', 'CASE-001', 'pt-1', 'Lumbar Strain', '2024-01-01', 'Discharged');
    const case2 = mockCase('case-2', 'CASE-002', 'pt-1', 'Knee Sprain', '2025-01-01', 'Treatment');
    dataset.patients.push(pt);
    dataset.cases.push(case1, case2);

    dataset.clinicalProblems.push({
      id: 'prob-past',
      caseId: 'case-1',
      patientId: 'pt-1',
      title: 'Mechanical low back pain',
      status: 'resolved',
      linkedFindingIds: [],
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    });

    const result = deriveCaseLongitudinalContext('pt-1', 'case-2', dataset);
    assert(result.historicalProblems.length === 1, 'Test 7: Historical problem derived');
    assert(result.historicalProblems[0].originatingCaseId === 'case-1', 'Test 7: Originating case ID preserved');
    assert(result.historicalProblems[0].originatingCaseName === 'Lumbar Strain', 'Test 7: Originating case name preserved');
    assert(result.historicalProblems[0].isFromClosedCase === true, 'Test 7: isFromClosedCase flag preserved');
  }

  // TEST 8: Historical Outcome Provenance
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const case1 = mockCase('case-1', 'CASE-001', 'pt-1', 'Lumbar Episode', '2024-01-01', 'Discharged');
    const case2 = mockCase('case-2', 'CASE-002', 'pt-1', 'Cervical Episode', '2025-01-01', 'Treatment');
    dataset.patients.push(pt);
    dataset.cases.push(case1, case2);

    dataset.progressRecords.push({
      id: 'pr-past',
      caseId: 'case-1',
      patientId: 'pt-1',
      recordDate: '2024-01-05',
      contextType: 'routine_progress_review',
      therapistSummary: 'Baseline',
      createdAt: '2024-01-05T10:00:00.000Z',
      updatedAt: '2024-01-05T10:00:00.000Z',
    });

    dataset.progressMeasurements.push({
      id: 'm-past',
      progressRecordId: 'pr-past',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureName: 'NPRS',
      category: 'pain',
      valueType: 'numeric',
      stage: 'baseline',
      numericValue: 7,
      unit: '/10',
      createdAt: '2024-01-05T10:00:00.000Z',
      updatedAt: '2024-01-05T10:00:00.000Z',
    });

    // Also add a measurement in current case (case-2)
    dataset.progressRecords.push({
      id: 'pr-curr',
      caseId: 'case-2',
      patientId: 'pt-1',
      recordDate: '2025-01-05',
      contextType: 'routine_progress_review',
      therapistSummary: 'Baseline',
      createdAt: '2025-01-05T10:00:00.000Z',
      updatedAt: '2025-01-05T10:00:00.000Z',
    });

    dataset.progressMeasurements.push({
      id: 'm-curr',
      progressRecordId: 'pr-curr',
      caseId: 'case-2',
      patientId: 'pt-1',
      measureName: 'NPRS',
      category: 'pain',
      valueType: 'numeric',
      stage: 'baseline',
      numericValue: 4,
      unit: '/10',
      createdAt: '2025-01-05T10:00:00.000Z',
      updatedAt: '2025-01-05T10:00:00.000Z',
    });

    const result = deriveCaseLongitudinalContext('pt-1', 'case-2', dataset);
    assert(result.historicalOutcomes.length === 1, 'Test 8: Historical outcome series derived');
    assert(result.historicalOutcomes[0].points.length === 1, 'Test 8: Only 1 prior point derived');
    assert(result.historicalOutcomes[0].points[0].caseId === 'case-1', 'Test 8: Point originating from case-1');
    assert(result.historicalOutcomes[0].points[0].scoreNumeric === 7, 'Test 8: Score is 7');
  }

  // TEST 9: Historical Treatment Provenance
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const case1 = mockCase('case-1', 'CASE-001', 'pt-1', 'Episode 1', '2024-01-01');
    const case2 = mockCase('case-2', 'CASE-002', 'pt-1', 'Episode 2', '2025-01-01');
    dataset.patients.push(pt);
    dataset.cases.push(case1, case2);

    dataset.clinicalSessions.push({
      id: 'sess-past',
      caseId: 'case-1',
      patientId: 'pt-1',
      sessionNumber: 1,
      sessionDate: '2024-01-10',
      status: 'completed',
      overallTolerance: 'well_tolerated',
      createdAt: '2024-01-10T10:00:00.000Z',
      updatedAt: '2024-01-10T10:00:00.000Z',
    });

    dataset.sessionTreatmentDeliveries.push({
      id: 'del-past',
      sessionId: 'sess-past',
      caseId: 'case-1',
      patientId: 'pt-1',
      title: 'McKenzie Extension in Lying',
      interventionType: 'therapeutic_exercise',
      deliveryStatus: 'completed_as_planned',
      createdAt: '2024-01-10T10:00:00.000Z',
      updatedAt: '2024-01-10T10:00:00.000Z',
    });

    const result = deriveCaseLongitudinalContext('pt-1', 'case-2', dataset);
    assert(result.historicalTreatments.length === 1, 'Test 9: Historical treatment derived');
    assert(result.historicalTreatments[0].originatingCaseId === 'case-1', 'Test 9: Treatment originatingCaseId is case-1');
    assert(result.historicalTreatments[0].treatmentName === 'McKenzie Extension in Lying', 'Test 9: Treatment name preserved');
  }

  // TEST 10: Timeline Exclusion
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const case1 = mockCase('case-1', 'CASE-001', 'pt-1', 'Episode 1', '2024-01-01', 'Discharged');
    const case2 = mockCase('case-2', 'CASE-002', 'pt-1', 'Episode 2', '2025-01-01', 'Treatment');
    dataset.patients.push(pt);
    dataset.cases.push(case1, case2);

    const dischargeRecord: CaseDischargeRecord = {
      id: 'dc-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      dischargeDate: '2024-03-01',
      dischargeReason: 'goals_achieved',
      episodeSummary: 'Great progress',
      clinicalStatusAtDischarge: 'Full functional recovery',
      createdAt: '2024-03-01T10:00:00.000Z',
      updatedAt: '2024-03-01T10:00:00.000Z',
    };
    dataset.caseDischargeRecords.push(dischargeRecord);

    // Add session to case 2 (current case)
    dataset.clinicalSessions.push({
      id: 'sess-curr',
      caseId: 'case-2',
      patientId: 'pt-1',
      sessionNumber: 1,
      sessionDate: '2025-01-02',
      status: 'completed',
      overallTolerance: 'well_tolerated',
      createdAt: '2025-01-02T10:00:00.000Z',
      updatedAt: '2025-01-02T10:00:00.000Z',
    });

    const result = deriveCaseLongitudinalContext('pt-1', 'case-2', dataset);
    const case2TimelineEvents = result.timelineEvents.filter((e) => e.caseId === 'case-2');
    assert(case2TimelineEvents.length === 0, 'Test 10: Current case events excluded from timeline');
    const case1DischargeEvent = result.timelineEvents.find((e) => e.eventType === 'case_discharged');
    assert(!!case1DischargeEvent, 'Test 10: Prior episode discharge event included in timeline');
  }

  // TEST 11: Mutation Safety (Modifying source dataset changes derived result naturally)
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const case1 = mockCase('case-1', 'CASE-001', 'pt-1', 'Old Episode', '2024-01-01');
    const case2 = mockCase('case-2', 'CASE-002', 'pt-1', 'New Episode', '2025-01-01');
    dataset.patients.push(pt);
    dataset.cases.push(case1, case2);

    const problem: ClinicalProblem = {
      id: 'prob-mut',
      caseId: 'case-1',
      patientId: 'pt-1',
      title: 'Original Problem Title',
      status: 'active',
      linkedFindingIds: [],
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    };
    dataset.clinicalProblems.push(problem);

    const res1 = deriveCaseLongitudinalContext('pt-1', 'case-2', dataset);
    assert(res1.historicalProblems[0].problemStatement === 'Original Problem Title', 'Test 11: Initial derived title correct');

    // Mutate in source
    problem.title = 'Updated Problem Title';
    const res2 = deriveCaseLongitudinalContext('pt-1', 'case-2', dataset);
    assert(res2.historicalProblems[0].problemStatement === 'Updated Problem Title', 'Test 11: Updated title reflected upon re-derivation');

    // Delete in source
    dataset.clinicalProblems.pop();
    const res3 = deriveCaseLongitudinalContext('pt-1', 'case-2', dataset);
    assert(res3.historicalProblems.length === 0, 'Test 11: Deleted problem immediately excluded upon re-derivation');
  }

  // TEST 12: Deterministic Sorting
  {
    const dataset = createEmptyDataset();
    const pt = mockPatient('pt-1', 'Alice');
    const c1 = mockCase('c-1', 'C-1', 'pt-1', 'Old Case', '2023-01-01');
    const c2 = mockCase('c-2', 'C-2', 'pt-1', 'Mid Case', '2024-01-01');
    const c3 = mockCase('c-3', 'C-3', 'pt-1', 'Current Case', '2025-01-01');
    dataset.patients.push(pt);
    // Push in arbitrary order
    dataset.cases.push(c1, c2, c3);

    const run1 = deriveCaseLongitudinalContext('pt-1', 'c-3', dataset);
    const run2 = deriveCaseLongitudinalContext('pt-1', 'c-3', dataset);

    assert(
      JSON.stringify(run1.historicalCases.map((c) => c.caseId)) ===
        JSON.stringify(run2.historicalCases.map((c) => c.caseId)),
      'Test 12: Deterministic case ordering between runs'
    );
    assert(run1.historicalCases[0].caseId === 'c-2', 'Test 12: Newest historical case (2024) sorted first');
    assert(run1.historicalCases[1].caseId === 'c-1', 'Test 12: Older historical case (2023) sorted second');
  }

  console.log(`\nVerification complete: ${passedCount} passed, ${failedCount} failed.`);
  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY.');
  }
}

runTests();
