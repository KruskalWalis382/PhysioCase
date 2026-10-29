/**
 * Stage 10E Verification Test Suite
 *
 * Verifies Patient Hub Longitudinal Overview & Navigation Layer:
 * 1. Overview Tab Presence & Layout:
 *    - Hub tablist includes "Overview" tab (id="hub-tab-overview").
 *    - Overview panel (id="hub-overview-panel") renders four navigation pillars:
 *      - Episodes of Care (id="overview-card-episodes")
 *      - Clinical Timeline (id="overview-card-timeline")
 *      - Cumulative Problems (id="overview-card-problems")
 *      - Cross-Episode Outcomes (id="overview-card-outcomes")
 * 2. Scannable Orientation & Factual Record Counts:
 *    - Documented episodes count (total, open, closed).
 *    - Documented timeline events count & latest milestone.
 *    - Documented cumulative problems count (active, resolved).
 *    - Documented cross-episode outcome measures tracked count.
 * 3. Most Recent Episode Card:
 *    - Displays factual details: case display ID, case name, start date, status, recorded sessions.
 *    - Provides "Open Episode" action.
 * 4. Documented Safety Context Snapshot:
 *    - Surfaced from patient.patientSafetyProfile.
 *    - Allergies, persistent precautions, surgeries, medical conditions, mobility context.
 *    - Verification count surfaced.
 * 5. Recent Clinical Activity:
 *    - Surfaced from authoritative timeline derivation.
 *    - Factual event titles, summaries, formatted dates, and case provenance.
 * 6. Navigation Controls:
 *    - Action buttons on each card target the corresponding detailed longitudinal tab.
 * 7. Patient Isolation:
 *    - Patient A's overview strictly contains Patient A's records; Patient B's records are never leaked.
 * 8. Patient Hub vs Case Drawer Distinction:
 *    - Patient Hub includes current/active episode in its comprehensive view.
 * 9. Documentation-Accurate Empty States:
 *    - For patients without historical documentation, shows factual absence of documentation.
 * 10. Clinical Neutrality:
 *    - Zero automated clinical interpretations, chronicity claims, recovery scores, or efficacy judgments.
 * 11. Persistence:
 *    - Zero new LocalStorage collections or keys introduced.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientHubView } from '../src/views/PatientHubView';
import { ClinicalContext } from '../src/context/ClinicalContext';
import {
  Patient,
  Case,
  ClinicalProblem,
  ClinicalSession,
  ProgressRecord,
  ProgressMeasurement,
  CaseDischargeRecord,
} from '../src/types';

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

function createMockPatient(id: string, fullName: string, patientNumber = 'PC-0042'): Patient {
  return {
    id,
    fullName,
    patientNumber,
    dateOfBirth: '1985-06-15',
    sex: 'Female',
    reasonForVisit: 'Persistent lumbar discomfort',
    status: 'active',
    createdAt: '2023-01-01',
    patientSafetyProfile: {
      allergies: [
        {
          id: 'alg-1',
          allergen: 'Latex',
          reactionType: 'Contact dermatitis',
          severity: 'moderate',
          verificationStatus: 'verified',
          clinicalNotes: 'Use nitrile examination gloves only',
          recordedAt: '2023-01-01',
          recordedBy: 'Dr. Clinician',
          source: 'patient_reported',
        },
      ],
      persistentPrecautions: [
        {
          id: 'prc-1',
          precaution: 'Avoid cervical manipulation',
          category: 'biomechanical',
          details: 'Hypermobility spectrum condition',
          recordedAt: '2023-01-01',
          recordedBy: 'Dr. Clinician',
          source: 'clinician_entry',
          verificationStatus: 'verified',
        },
      ],
      surgicalHistory: [
        {
          id: 'srg-1',
          procedure: 'Right Knee Arthroscopy',
          approximateDateOrYear: '2018',
          bodyRegion: 'Right Knee',
          recordedAt: '2023-01-01',
          recordedBy: 'Dr. Clinician',
          source: 'patient_reported',
          verificationStatus: 'verified',
        },
      ],
      persistentMedicalConditions: [
        {
          id: 'cnd-1',
          conditionName: 'Type 1 Diabetes Mellitus',
          diagnosedYearOrDate: '2010',
          clinicalRelevanceToPhysio: 'Altered peripheral sensation',
          isActive: true,
          recordedAt: '2023-01-01',
          recordedBy: 'Dr. Clinician',
          source: 'external_medical_record',
          verificationStatus: 'verified',
        },
      ],
      enduringMobilityContext: {
        baselineMobilityStatus: 'Independent community ambulation without aids',
        enduringAssistiveDevices: [],
        recordedAt: '2023-01-01',
        recordedBy: 'Dr. Clinician',
        source: 'clinician_entry',
        verificationStatus: 'verified',
      },
    },
  };
}

function createEmptyMockPatient(id: string, fullName: string): Patient {
  return {
    id,
    fullName,
    patientNumber: 'PC-9999',
    dateOfBirth: '1995-10-20',
    sex: 'Male',
    reasonForVisit: '',
    status: 'active',
    createdAt: '',
    patientSafetyProfile: {
      allergies: [],
      persistentPrecautions: [],
      surgicalHistory: [],
      persistentMedicalConditions: [],
    },
  };
}

function createMockCase(
  id: string,
  patientId: string,
  caseId: string,
  caseName: string,
  status: 'Assessment' | 'Treatment' | 'Reassessment' | 'Discharged' = 'Assessment'
): Case {
  return {
    id,
    patientId,
    caseId,
    caseName,
    status,
    startDate: '2024-01-15',
    presentingProblem: 'Musculoskeletal issue',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  };
}

function createMockClinicalContext(overrides?: Partial<any>) {
  const patient1 = createMockPatient('pt-1', 'Eleanor Vance', 'PC-0042');
  const patient2 = createMockPatient('pt-2', 'Marcus Brody', 'PC-0088');
  const emptyPatient = createEmptyMockPatient('pt-empty', 'Arthur Pendelton');

  const case1Prior = createMockCase('case-past-1', 'pt-1', 'CASE-0010', 'Lumbar Radiculopathy', 'Discharged');
  const case2Active = createMockCase('case-curr-2', 'pt-1', 'CASE-0042', 'Cervical Spine Pain', 'Assessment');
  const casePatient2 = createMockCase('case-pt2-1', 'pt-2', 'CASE-0099', 'Ankle Inversion Sprain', 'Discharged');

  const problem1: ClinicalProblem = {
    id: 'prob-1',
    patientId: 'pt-1',
    caseId: 'case-past-1',
    title: 'L5-S1 Disc Herniation',
    status: 'resolved',
    linkedFindingIds: [],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  };

  const problem2: ClinicalProblem = {
    id: 'prob-2',
    patientId: 'pt-1',
    caseId: 'case-curr-2',
    title: 'C5-C6 Facet Irritation',
    status: 'active',
    linkedFindingIds: [],
    createdAt: '2024-02-01T10:00:00.000Z',
    updatedAt: '2024-02-01T10:00:00.000Z',
  };

  const discharge1: CaseDischargeRecord = {
    id: 'dc-1',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    dischargeDate: '2024-04-10',
    dischargeReason: 'goals_achieved',
    episodeSummary: 'Full functional recovery achieved',
    clinicalStatusAtDischarge: 'Asymptomatic',
    homeMaintenancePlan: 'Home exercise program',
    createdAt: '2024-04-10T10:00:00.000Z',
    updatedAt: '2024-04-10T10:00:00.000Z',
  };

  const session1: ClinicalSession = {
    id: 'ses-1',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    sessionNumber: 1,
    sessionDate: '2024-01-20',
    status: 'completed',
    patientSubjectiveResponse: 'Initial session',
    therapistSessionNotes: 'ROM assessed. Gentle mobilisations.',
    overallTolerance: 'well_tolerated',
    createdAt: '2024-01-20T10:00:00.000Z',
    updatedAt: '2024-01-20T10:00:00.000Z',
  };

  const measurement1: ProgressMeasurement = {
    id: 'meas-1',
    progressRecordId: 'pr-1',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    measureName: 'Numerical Pain Rating Scale (NPRS)',
    category: 'pain',
    valueType: 'numeric',
    stage: 'baseline',
    numericValue: 7,
    unit: '/10',
    createdAt: '2024-01-20T10:00:00.000Z',
    updatedAt: '2024-01-20T10:00:00.000Z',
  };

  const defaultContext = {
    patients: [patient1, patient2, emptyPatient],
    cases: [case1Prior, case2Active, casePatient2],
    reviewsTodayCount: 0,
    addPatient: () => patient1,
    updatePatient: () => {},
    updatePatientSafetyProfile: () => {},
    verifyPatientSafetyItem: () => {},
    addCase: () => case2Active,
    updateCase: () => {},
    getCasesForPatient: (pid: string) => [case1Prior, case2Active, casePatient2].filter((c) => c.patientId === pid),
    subjectiveAssessments: [],
    getSubjectiveAssessment: () => null,
    saveSubjectiveAssessment: () => ({} as any),
    activeAssessmentCaseId: null,
    setActiveAssessmentCaseId: () => {},
    openSubjectiveAssessment: () => {},
    closeSubjectiveAssessment: () => {},
    clinicalThreads: [],
    getClinicalThreadsForCase: () => [],
    getClinicalThread: () => null,
    generateClinicalThreadsForCase: () => [],
    updateClinicalThreadStatus: () => {},
    updateClinicalThreadNotes: () => {},
    objectiveAssessments: [],
    getObjectiveAssessment: () => null,
    saveObjectiveAssessment: () => ({} as any),
    clinicalProblems: [problem1, problem2],
    getClinicalProblemsForCase: (cid: string) => [problem1, problem2].filter((p) => p.caseId === cid),
    saveClinicalProblem: () => problem1,
    updateClinicalProblemStatus: () => {},
    deleteClinicalProblem: () => {},
    clinicalGoals: [],
    getClinicalGoalsForCase: () => [],
    saveClinicalGoal: () => ({} as any),
    updateClinicalGoalStatus: () => {},
    deleteClinicalGoal: () => {},
    treatmentPlans: [],
    getTreatmentPlansForCase: () => [],
    saveTreatmentPlan: () => ({} as any),
    updateTreatmentPlanStatus: () => {},
    treatmentSelections: [],
    getTreatmentSelectionsForCase: () => [],
    saveTreatmentSelection: () => ({} as any),
    updateTreatmentSelectionStatus: () => {},
    deleteTreatmentSelection: () => {},
    treatmentEvidenceLinks: [],
    treatmentConditionLinks: [],
    getEvidenceLinksForTreatment: () => [],
    getConditionLinksForTreatment: () => [],
    linkEvidenceToTreatment: () => ({} as any),
    unlinkEvidenceFromTreatment: () => {},
    linkConditionToTreatment: () => ({} as any),
    unlinkConditionFromTreatment: () => {},
    evidenceSources: [],
    evidenceItems: [],
    getEvidenceSourceById: () => undefined,
    findEvidenceForTreatment: () => [],
    findEvidenceForCondition: () => [],
    clinicalSessions: [session1],
    getCSSessionsForCase: () => [session1],
    saveClinicalSession: () => session1,
    deleteClinicalSession: () => {},
    sessionTreatmentDeliveries: [],
    getSessionTreatmentDeliveries: () => [],
    saveSessionTreatmentDelivery: () => ({} as any),
    deleteSessionTreatmentDelivery: () => {},
    progressRecords: [
      {
        id: 'pr-1',
        caseId: 'case-past-1',
        evaluationDate: '2024-01-20',
        stage: 'baseline',
        sessionNumber: 1,
        therapistAuthoredSummary: 'Baseline assessment completed',
        createdAt: '2024-01-20T10:00:00.000Z',
        updatedAt: '2024-01-20T10:00:00.000Z',
      },
    ],
    getProgressRecordsForCase: () => [],
    saveProgressRecord: () => ({} as any),
    deleteProgressRecord: () => {},
    progressMeasurements: [measurement1],
    getProgressMeasurementsForCase: () => [measurement1],
    saveProgressMeasurement: () => ({} as any),
    deleteProgressMeasurement: () => {},
    caseDischargeRecords: [discharge1],
    getCaseDischargeRecord: (cid: string) => (cid === 'case-past-1' ? discharge1 : null),
    saveCaseDischargeRecord: () => discharge1,
    clinicalInvestigations: [],
    getInvestigationsForCase: () => [],
    saveInvestigation: () => ({} as any),
    deleteInvestigation: () => {},
    openNewCaseModal: () => {},
    openEditPatientModal: () => {},
    ...overrides,
  };

  return defaultContext;
}

function renderPatientHub(context: any, patient: Patient): string {
  return renderToStaticMarkup(
    React.createElement(
      ClinicalContext.Provider,
      { value: context },
      React.createElement(PatientHubView, {
        patient,
        onBack: () => {},
        onOpenCase: () => {},
      })
    )
  );
}

console.log('=== STAGE 10E VERIFICATION TEST SUITE ===');

// ----------------------------------------------------
// TEST 1: Overview Tab Presence & Default Activation
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0]; // Eleanor Vance (pt-1)

  const html = renderPatientHub(mockContext, patient);

  assert(html.includes('id="hub-tab-overview"'), 'Test 1: Overview tab button exists in PatientHubView tablist');
  assert(html.includes('id="hub-overview-panel"'), 'Test 1: Overview panel is rendered by default');
  assert(html.includes('Overview</span>'), 'Test 1: Overview tab has human-readable label "Overview"');
}

// ----------------------------------------------------
// TEST 2: Four Navigation Pillars Rendered
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0];

  const html = renderPatientHub(mockContext, patient);

  assert(html.includes('id="overview-card-episodes"'), 'Test 2: Episodes of Care orientation card rendered');
  assert(html.includes('id="overview-card-timeline"'), 'Test 2: Clinical Timeline orientation card rendered');
  assert(html.includes('id="overview-card-problems"'), 'Test 2: Cumulative Problems orientation card rendered');
  assert(html.includes('id="overview-card-outcomes"'), 'Test 2: Cross-Episode Outcomes orientation card rendered');
}

// ----------------------------------------------------
// TEST 3: Navigation Triggers with Accessible Labels
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0];

  const html = renderPatientHub(mockContext, patient);

  assert(
    html.includes('id="overview-nav-episodes-btn"') &&
      html.includes('aria-label="Navigate to Episodes of Care"'),
    'Test 3: Episodes navigation trigger exists with accessible name'
  );
  assert(
    html.includes('id="overview-nav-timeline-btn"') &&
      html.includes('aria-label="Navigate to Clinical Timeline"'),
    'Test 3: Timeline navigation trigger exists with accessible name'
  );
  assert(
    html.includes('id="overview-nav-problems-btn"') &&
      html.includes('aria-label="Navigate to Cumulative Problems"'),
    'Test 3: Problems navigation trigger exists with accessible name'
  );
  assert(
    html.includes('id="overview-nav-outcomes-btn"') &&
      html.includes('aria-label="Navigate to Cross-Episode Outcomes"'),
    'Test 3: Outcomes navigation trigger exists with accessible name'
  );
}

// ----------------------------------------------------
// TEST 4: Factual Episode Counts Surfaced Correctly
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0]; // pt-1 has 2 cases: 1 active, 1 discharged

  const html = renderPatientHub(mockContext, patient);

  // Total episodes = 2, open = 1, closed = 1
  assert(
    (html.includes('>2<') || html.includes('2 total')) && html.includes('Documented Episode'),
    'Test 4: Total documented episodes count (2) surfaced'
  );
  assert(html.includes('Open:') && html.includes('>1<'), 'Test 4: Open episodes count (1) surfaced');
  assert(html.includes('Closed:') && html.includes('>1<'), 'Test 4: Closed episodes count (1) surfaced');
}

// ----------------------------------------------------
// TEST 5: Documented Safety Context Snapshot
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0];

  const html = renderPatientHub(mockContext, patient);

  assert(html.includes('id="overview-safety-snapshot"'), 'Test 5: Safety snapshot container rendered');
  assert(html.includes('Latex'), 'Test 5: Authored allergy "Latex" rendered');
  assert(html.includes('Avoid cervical manipulation'), 'Test 5: Authored persistent precaution rendered');
  assert(html.includes('Right Knee Arthroscopy'), 'Test 5: Authored surgical history item rendered');
  assert(html.includes('Type 1 Diabetes Mellitus'), 'Test 5: Authored medical condition rendered');
  assert(html.includes('Independent community ambulation'), 'Test 5: Authored mobility status rendered');
  assert(html.includes('id="overview-manage-safety-btn"'), 'Test 5: Action to manage safety profile exists');
}

// ----------------------------------------------------
// TEST 6: Recent Clinical Activity from Authoritative Timeline
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0];

  const html = renderPatientHub(mockContext, patient);

  assert(html.includes('id="overview-recent-activity"'), 'Test 6: Recent clinical activity section rendered');
  assert(html.includes('id="overview-view-all-timeline-btn"'), 'Test 6: View Full Timeline trigger present');
  // Events have provenance badge with case name/ID
  assert(html.includes('CASE-0010') || html.includes('Lumbar Radiculopathy') || html.includes('CASE-0042'), 'Test 6: Case provenance retained for recent activity events');
}

// ----------------------------------------------------
// TEST 7: Most Recent Documented Episode Card
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0];

  const html = renderPatientHub(mockContext, patient);

  assert(html.includes('id="overview-recent-episode"'), 'Test 7: Most recent episode container rendered');
  assert(html.includes('CASE-0042') || html.includes('Cervical Spine Pain'), 'Test 7: Most recent episode display ID or title rendered');
  assert(html.includes('id="overview-open-recent-case-btn"'), 'Test 7: Open Episode action present for most recent episode');
}

// ----------------------------------------------------
// TEST 8: Patient Isolation
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient1 = mockContext.patients[0]; // pt-1 (Eleanor Vance)
  const patient2 = mockContext.patients[1]; // pt-2 (Marcus Brody, CASE-0099)

  const html1 = renderPatientHub(mockContext, patient1);
  const html2 = renderPatientHub(mockContext, patient2);

  assert(!html1.includes('CASE-0099'), 'Test 8: Patient 1 overview never displays Patient 2 case CASE-0099');
  assert(!html1.includes('Ankle Inversion Sprain'), 'Test 8: Patient 1 overview never displays Patient 2 diagnosis');
  assert(html2.includes('CASE-0099'), 'Test 8: Patient 2 overview renders Patient 2 case CASE-0099');
  assert(!html2.includes('CASE-0010'), 'Test 8: Patient 2 overview never displays Patient 1 case CASE-0010');
}

// ----------------------------------------------------
// TEST 9: Patient Hub Includes Current Case (≠ Case Drawer)
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0];

  const html = renderPatientHub(mockContext, patient);

  // In Patient Hub, the active case CASE-0042 is documented and counted (totalEpisodes = 2)
  assert(html.includes('CASE-0042'), 'Test 9: Patient Hub includes currently active episode CASE-0042');
  assert(html.includes('Open:') && html.includes('>1<'), 'Test 9: Patient Hub accounts for active open episode');
}

// ----------------------------------------------------
// TEST 10: Documentation-Accurate Empty States
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const emptyPatient = mockContext.patients[2]; // pt-empty (0 cases, 0 problems, 0 events)

  const html = renderPatientHub(mockContext, emptyPatient);

  assert(html.includes('No prior episodes documented.'), 'Test 10: Renders exact factual empty state for episodes');
  assert(html.includes('No timeline events available.'), 'Test 10: Renders exact factual empty state for timeline');
  assert(html.includes('No problems documented.'), 'Test 10: Renders exact factual empty state for problems');
  assert(html.includes('No outcome measurements documented.'), 'Test 10: Renders exact factual empty state for outcomes');
  assert(html.includes('No persistent safety information recorded.'), 'Test 10: Renders exact factual empty state for safety');
  // Confirm absence of fabrication
  assert(!html.includes('No medical history'), 'Test 10: Does not fabricate "No medical history" claim');
  assert(!html.includes('No risks'), 'Test 10: Does not fabricate "No risks" claim');
  assert(!html.includes('No complications'), 'Test 10: Does not fabricate "No complications" claim');
}

// ----------------------------------------------------
// TEST 11: Clinical Neutrality Enforced
// ----------------------------------------------------
{
  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0];

  const html = renderPatientHub(mockContext, patient);

  assert(!html.includes('patient is worsening'), 'Test 11: No "patient is worsening" inference');
  assert(!html.includes('patient is improving'), 'Test 11: No "patient is improving" inference');
  assert(!html.includes('treatment failed'), 'Test 11: No "treatment failed" inference');
  assert(!html.includes('treatment was effective'), 'Test 11: No "treatment was effective" inference');
  assert(!html.includes('chronic condition'), 'Test 11: No automated chronic classification');
  assert(!html.includes('recurrent episode'), 'Test 11: No automated recurrence classification');
  assert(!html.includes('prognosis score'), 'Test 11: No prognosis score fabricated');
  assert(!html.includes('MCID'), 'Test 11: No MCID outcome inference fabricated');
}

// ----------------------------------------------------
// TEST 12: Zero LocalStorage Operations
// ----------------------------------------------------
{
  const originalSetItem = (global as any).localStorage?.setItem;
  let setItemCalls = 0;

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem = () => {
      setItemCalls++;
    };
  }

  const mockContext = createMockClinicalContext();
  const patient = mockContext.patients[0];

  renderPatientHub(mockContext, patient);

  assert(setItemCalls === 0, 'Test 12: Zero LocalStorage writes during Patient Hub Overview render');

  if (typeof window !== 'undefined' && window.localStorage && originalSetItem) {
    window.localStorage.setItem = originalSetItem;
  }
}

console.log(`Verification complete: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  console.error(`STAGE 10E VERIFICATION FAILED: ${failed} assertions failed.`);
  process.exit(1);
} else {
  console.log('ALL STAGE 10E TESTS PASSED SUCCESSFULLY.');
}
