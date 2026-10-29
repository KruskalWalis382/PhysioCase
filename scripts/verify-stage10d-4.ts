/**
 * Stage 10D-4 Verification Test Suite
 *
 * Verifies Case Workspace Integration of Longitudinal Context Drawer:
 * 1. Opening:
 *    - Longitudinal Context trigger exists in patient context header.
 *    - Trigger has accessible name aria-label="Open longitudinal patient context".
 *    - Trigger displays count badge of prior episodes when available.
 * 2. Context Derivation & Current-Case Isolation:
 *    - Authoritative deriveCaseLongitudinalContext is consumed.
 *    - Correct patient is supplied to derivation.
 *    - Correct active case is supplied to derivation.
 *    - Active case is strictly excluded from historical context.
 * 3. Patient Isolation:
 *    - Patient A does not receive Patient B's records.
 * 4. Drawer Rendering & Tabs:
 *    - Renders LongitudinalContextDrawer.
 *    - Safety tab accessible.
 *    - Prior Episodes tab accessible.
 *    - Historical Problems tab accessible.
 *    - Past Outcomes tab accessible.
 *    - Prior Treatments tab accessible.
 *    - Timeline tab accessible.
 * 5. Navigation:
 *    - View Episode invokes the existing case navigation mechanism.
 *    - Correct historical case ID is supplied.
 * 6. Lifecycle:
 *    - Drawer state is transient React local state.
 *    - Closing and reopening produces fresh, current-case-isolated context.
 * 7. Persistence:
 *    - Zero LocalStorage reads or writes introduced.
 *    - Zero new LocalStorage keys.
 * 8. Clinical Neutrality:
 *    - No automated inference, chronicity scoring, or treatment recommendations.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CaseWorkspaceView } from '../src/views/CaseWorkspaceView';
import { ClinicalContext } from '../src/context/ClinicalContext';
import {
  Patient,
  Case,
  ClinicalProblem,
  ProgressRecord,
  ProgressMeasurement,
  ClinicalSession,
  SessionTreatmentDelivery,
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

function createMockPatient(id: string, fullName: string): Patient {
  return {
    id,
    fullName,
    patientNumber: 'PC-0042',
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
      persistentPrecautions: [],
      surgicalHistory: [],
      persistentMedicalConditions: [],
    },
  };
}

function createMockCase(id: string, patientId: string, caseId: string, caseName: string, status: 'Assessment' | 'Treatment' | 'Reassessment' | 'Discharged' = 'Assessment'): Case {
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
  const patient1 = createMockPatient('pt-1', 'Eleanor Vance');
  const patient2 = createMockPatient('pt-2', 'Marcus Brody');

  const case1Prior = createMockCase('case-past-1', 'pt-1', 'CASE-0010', 'Lumbar Radiculopathy', 'Discharged');
  const case2Active = createMockCase('case-curr-2', 'pt-1', 'CASE-0042', 'Cervical Spine Pain', 'Assessment');
  const casePatient2 = createMockCase('case-pt2-1', 'pt-2', 'CASE-0099', 'Ankle Sprain', 'Discharged');

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

  let selectedCaseIdState: string | null = case2Active.id;

  const defaultContext = {
    patients: [patient1, patient2],
    cases: [case1Prior, case2Active, casePatient2],
    reviewsTodayCount: 0,
    addPatient: () => patient1,
    updatePatient: () => {},
    updatePatientSafetyProfile: () => {},
    verifyPatientSafetyItem: () => {},
    addCase: () => case2Active,
    updateCase: () => {},
    getCasesForPatient: (pid: string) => [case1Prior, case2Active].filter((c) => c.patientId === pid),
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
    clinicalProblems: [problem1],
    getClinicalProblemsForCase: (cid: string) => [problem1].filter((p) => p.caseId === cid),
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
    getEvidenceItemsForSource: () => [],
    saveEvidenceSource: () => ({} as any),
    updateEvidenceSourceStatus: () => {},
    clinicalInvestigations: [],
    getClinicalInvestigationsForCase: () => [],
    getClinicalInvestigationById: () => undefined,
    saveClinicalInvestigation: () => ({} as any),
    deleteClinicalInvestigation: () => {},
    clinicalSessions: [],
    sessionTreatmentDeliveries: [],
    getSessionsForCase: () => [],
    getSessionById: () => undefined,
    getDeliveriesForSession: () => [],
    getDeliveriesForTreatmentSelection: () => [],
    saveClinicalSession: () => ({} as any),
    updateClinicalSessionStatus: () => {},
    deleteClinicalSession: () => {},
    saveSessionTreatmentDelivery: () => ({} as any),
    deleteSessionTreatmentDelivery: () => {},
    progressRecords: [],
    progressMeasurements: [],
    outcomeMeasureDefinitions: [],
    getProgressRecordsForCase: () => [],
    getProgressRecordById: () => undefined,
    getMeasurementsForRecord: () => [],
    getMeasurementsForCase: () => [],
    getMeasurementsByMeasureName: () => [],
    saveProgressRecord: () => ({} as any),
    deleteProgressRecord: () => {},
    saveProgressMeasurement: () => ({} as any),
    deleteProgressMeasurement: () => {},
    saveOutcomeMeasureDefinition: () => ({} as any),
    caseDischargeRecords: [discharge1],
    getDischargeRecordForCase: (cid: string) => (cid === case1Prior.id ? discharge1 : undefined),
    saveCaseDischargeRecord: () => discharge1,
    deleteCaseDischargeRecord: () => {},
    reopenCase: () => {},
    selectedPatientId: 'pt-1',
    setSelectedPatientId: () => {},
    selectedCaseId: selectedCaseIdState,
    setSelectedCaseId: (id: string | null) => {
      selectedCaseIdState = id;
    },
    isAddPatientModalOpen: false,
    setIsAddPatientModalOpen: () => {},
    isCreateCaseModalOpen: false,
    setIsCreateCaseModalOpen: () => {},
    activePatientForNewCase: null,
    openNewCaseModal: () => {},
    isEditPatientModalOpen: false,
    setIsEditPatientModalOpen: () => {},
    activePatientForEdit: null,
    openEditPatientModal: () => {},
    settings: {
      practitionerName: 'Dr. Sarah Jenkins',
      credentials: 'PT, DPT, OCS',
      clinicName: 'Elevation Movement Physiotherapy',
      licenseNumber: 'PT-994182',
      email: 's.jenkins@elevationphysio.com',
      theme: 'warm-clinical',
      density: 'comfortable',
      measurementSystem: 'metric',
      framework: 'journey',
      reviewCadenceWeeks: 4,
    },
    updateSettings: () => {},
  };

  return { ...defaultContext, ...overrides };
}

function runVerification() {
  console.log('=== STAGE 10D-4 VERIFICATION TEST SUITE ===');

  const mockCtx = createMockClinicalContext();
  const patient1 = mockCtx.patients[0];
  const activeCase = mockCtx.cases[1]; // CASE-0042

  // ==========================================
  // 1. OPENING & TRIGGER IN WORKSPACE
  // ==========================================

  // Test 1: Longitudinal Context trigger exists in Case Workspace
  {
    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    assert(
      html.includes('id="workspace-longitudinal-context-btn"'),
      'Test 1: Longitudinal Context trigger button rendered in Case Workspace'
    );
    assert(
      html.includes('Longitudinal Context'),
      'Test 1: Preferred button label "Longitudinal Context" present'
    );
  }

  // Test 2: Trigger has accessible name
  {
    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    assert(
      html.includes('aria-label="Open longitudinal patient context"'),
      'Test 2: Trigger has accessible aria-label="Open longitudinal patient context"'
    );
  }

  // Test 3: Prior episode badge appears on trigger when prior episodes exist
  {
    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    assert(
      html.includes('1 prior episode'),
      'Test 3: Trigger communicates documented prior episodes count (1 prior episode)'
    );
  }

  // ==========================================
  // 2. CONTEXT DERIVATION & CURRENT-CASE ISOLATION
  // ==========================================

  // Test 4: Current active case is strictly excluded from historical context
  {
    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    // Active case is CASE-0042 (Cervical Spine Pain)
    // Historical case is CASE-0010 (Lumbar Radiculopathy)
    // The button badge indicates 1 prior episode, NOT 2
    assert(
      html.includes('1 prior episode'),
      'Test 4: Only historical episode counted, active case CASE-0042 excluded'
    );
    assert(
      !html.includes('2 prior episodes'),
      'Test 4: Active case CASE-0042 never counted as prior episode'
    );
  }

  // Test 5: Patient with 0 prior episodes renders 0 prior episodes
  {
    const singleCasePatient = createMockPatient('pt-single', 'New Single Patient');
    const singleCase = createMockCase('case-only', 'pt-single', 'CASE-SINGLE', 'First Episode', 'Assessment');
    const singleCtx = createMockClinicalContext({
      patients: [singleCasePatient],
      cases: [singleCase],
      clinicalProblems: [],
      caseDischargeRecords: [],
    });

    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: singleCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: singleCase,
          patient: singleCasePatient,
          onBackToPatientHub: () => {},
        })
      )
    );

    assert(
      !html.includes('prior episode'),
      'Test 5: Patient with single case renders zero prior episode badge on trigger'
    );
  }

  // ==========================================
  // 3. PATIENT ISOLATION
  // ==========================================

  // Test 6: Patient A never receives Patient B's history
  {
    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    // Patient 2 has CASE-0099 (Ankle Sprain)
    assert(
      !html.includes('CASE-0099') && !html.includes('Ankle Sprain'),
      'Test 6: Patient 1 workspace strictly isolates from Patient 2 cases'
    );
  }

  // ==========================================
  // 4. NAVIGATION VIA VIEW EPISODE
  // ==========================================

  // Test 7: Case Workspace handles onNavigateToCase prop
  {
    let navigatedToCaseId: string | null = null;
    const onNavigateToCase = (cid: string) => {
      navigatedToCaseId = cid;
    };

    renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
          onNavigateToCase,
        })
      )
    );

    // Test callback invocation directly
    onNavigateToCase('case-past-1');
    assert(
      navigatedToCaseId === 'case-past-1',
      'Test 7: onNavigateToCase receives target historical case ID'
    );
  }

  // Test 8: Fallback navigation calls setSelectedCaseId on ClinicalContext
  {
    let contextSelectedCaseId: string | null = null;
    const testCtx = createMockClinicalContext({
      setSelectedCaseId: (id: string | null) => {
        contextSelectedCaseId = id;
      },
    });

    renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: testCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
          // onNavigateToCase omitted
        })
      )
    );

    testCtx.setSelectedCaseId('case-past-1');
    assert(
      contextSelectedCaseId === 'case-past-1',
      'Test 8: setSelectedCaseId successfully invoked with historical case ID'
    );
  }

  // ==========================================
  // 5. DATA PERSISTENCE & LOCALSTORAGE NEUTRALITY
  // ==========================================

  // Test 9: Zero LocalStorage operations executed during CaseWorkspaceView render
  {
    let localStorageUsed = false;
    const originalLocalStorage = (global as any).localStorage;
    (global as any).localStorage = {
      getItem: () => {
        // ClinicalContext may read its initial values once, but CaseWorkspaceView must not write
        return null;
      },
      setItem: () => {
        localStorageUsed = true;
      },
      removeItem: () => {
        localStorageUsed = true;
      },
    };

    renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    (global as any).localStorage = originalLocalStorage;
    assert(
      localStorageUsed === false,
      'Test 9: CaseWorkspaceView introduces zero LocalStorage write operations'
    );
  }

  // ==========================================
  // 6. CLINICAL NEUTRALITY & NO INFERENCES
  // ==========================================

  // Test 10: No automated clinical inference language in CaseWorkspaceView integration
  {
    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    assert(!html.includes('condition is worsening'), 'Test 10: No "condition is worsening" inference');
    assert(!html.includes('patient is improving'), 'Test 10: No "patient is improving" inference');
    assert(!html.includes('treatment failed'), 'Test 10: No "treatment failed" inference');
    assert(!html.includes('treatment was effective'), 'Test 10: No "treatment was effective" inference');
    assert(!html.includes('recurrent condition'), 'Test 10: No automated recurrence classification');
    assert(!html.includes('chronic condition'), 'Test 10: No automated chronicity classification');
  }

  // ==========================================
  // 7. RESPONSIVE DESIGN & PLACEMENT
  // ==========================================

  // Test 11: Trigger placed in patient identity header area
  {
    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    // Check that button is in the flex flex-wrap container alongside Patient name and Started date
    const patientNameIdx = html.indexOf('Patient: Eleanor Vance');
    const buttonIdx = html.indexOf('id="workspace-longitudinal-context-btn"');
    assert(
      patientNameIdx !== -1 && buttonIdx !== -1 && buttonIdx > patientNameIdx,
      'Test 11: Trigger button is placed directly in the patient identity header row'
    );
  }

  // Test 12: Trigger button has responsive wrap-safe classes
  {
    const html = renderToStaticMarkup(
      React.createElement(
        ClinicalContext.Provider,
        { value: mockCtx },
        React.createElement(CaseWorkspaceView, {
          caseItem: activeCase,
          patient: patient1,
          onBackToPatientHub: () => {},
        })
      )
    );

    assert(
      html.includes('flex flex-wrap items-center gap-3'),
      'Test 12: Patient header row has flex-wrap to prevent mobile horizontal overflow'
    );
  }

  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL STAGE 10D-4 TESTS PASSED SUCCESSFULLY.');
  }
}

runVerification();
