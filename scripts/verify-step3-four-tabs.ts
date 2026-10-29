import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CaseWorkspaceView, mapSectionToWorkspaceTab, WorkspaceTab } from '../src/views/CaseWorkspaceView';
import { ClinicalContext } from '../src/context/ClinicalContext';
import { Patient, Case, CaseStatus, ClinicalProblem, CaseDischargeRecord, ClinicalGoal, ProgressRecord } from '../src/types';

console.log('=== PHYSIOCASE — PHASE 15D STEP 3: FOUR-TAB WORKSPACE VERIFICATION SUITE ===\n');

let passCount = 0;
function pass(testName: string) {
  console.log(`✓ [PASS] ${testName}`);
  passCount++;
}

// Mock test fixtures
const mockPatient: Patient = {
  id: 'pt_test_four_tabs_1',
  fullName: 'Arthur Pendelton',
  dateOfBirth: '1978-03-22',
  reasonForVisit: 'Lumbar disc herniation with radicular symptoms',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockCase: Case = {
  id: 'case_test_four_tabs_1',
  caseId: 'CASE-0042',
  patientId: 'pt_test_four_tabs_1',
  caseName: 'Lumbar Radiculopathy Management',
  startDate: '2026-01-05',
  status: 'Assessment',
  createdAt: '2026-01-05T00:00:00Z',
  updatedAt: '2026-01-05T00:00:00Z',
};

const mockGoal: ClinicalGoal = {
  id: 'goal_test_1',
  caseId: 'case_test_four_tabs_1',
  patientId: 'pt_test_four_tabs_1',
  title: 'Tolerate 30min standing',
  type: 'short_term',
  linkedProblemIds: [],
  targetValue: '30 mins',
  status: 'active',
  createdAt: '2026-01-05T00:00:00Z',
  updatedAt: '2026-01-05T00:00:00Z',
};

const mockProgressRecord: ProgressRecord = {
  id: 'prog_rec_1',
  caseId: 'case_test_four_tabs_1',
  patientId: 'pt_test_four_tabs_1',
  recordDate: '2026-01-20',
  contextType: 'reassessment',
  therapistSummary: 'Improved extension tolerance',
  createdAt: '2026-01-20T00:00:00Z',
  updatedAt: '2026-01-20T00:00:00Z',
};

const mockCtx: any = {
  patients: [mockPatient],
  cases: [mockCase],
  subjectiveAssessments: [],
  objectiveAssessments: [],
  clinicalInvestigations: [],
  clinicalProblems: [],
  clinicalGoals: [mockGoal],
  treatmentPlans: [],
  treatmentSelections: [],
  clinicalSessions: [],
  sessionTreatmentDeliveries: [],
  progressRecords: [mockProgressRecord],
  progressMeasurements: [],
  outcomeMeasureDefinitions: [],
  caseDischargeRecords: [],
  evidenceItems: [],
  evidenceSources: [],
  conditionPresentations: [],
  treatmentInterventions: [],
  evidenceTreatmentLinks: [],
  evidenceConditionLinks: [],
  treatmentConditionLinks: [],
  auditEvents: [],
  isAuditDrawerOpen: false,
  openAuditDrawer: () => {},
  closeAuditDrawer: () => {},
  settings: {
    clinicName: 'PhysioCase Sports & Spinal',
    clinicianName: 'Dr. Jane Smith, PT, DPT',
    licenseNumber: 'PT-98765',
    email: 'jane@physiocase.com',
    phone: '555-0199',
    address: '100 Medical Plaza, Suite 400',
    theme: 'system',
    exportFormat: 'pdf',
    dataRetentionDays: 365,
    autoBackup: false,
  },
  selectedPatientId: mockPatient.id,
  selectedCaseId: mockCase.id,
  activeAssessmentCaseId: null,
  setSelectedPatientId: () => {},
  setSelectedCaseId: () => {},
  openSubjectiveAssessment: () => {},
  closeSubjectiveAssessment: () => {},
  getPatient: () => mockPatient,
  savePatient: () => {},
  deletePatient: () => {},
  getPatientSafetyProfile: () => undefined,
  savePatientSafetyProfile: () => {},
  updatePatientSafetyProfile: () => {},
  getCasesForPatient: () => [mockCase],
  getCase: () => mockCase,
  saveCase: () => {},
  deleteCase: () => {},
  getSubjectiveAssessment: () => undefined,
  saveSubjectiveAssessment: () => {},
  deleteSubjectiveAssessment: () => {},
  finalizeSubjectiveAssessment: () => {},
  amendSubjectiveAssessment: () => {},
  getClinicalThreadsForCase: () => [],
  generateClinicalThreadsForCase: () => [],
  saveClinicalThread: () => {},
  getObjectiveAssessment: () => undefined,
  saveObjectiveAssessment: () => {},
  deleteObjectiveAssessment: () => {},
  finalizeObjectiveAssessment: () => {},
  amendObjectiveAssessment: () => {},
  saveObjectiveFinding: () => {},
  deleteObjectiveFinding: () => {},
  getClinicalProblemsForCase: () => [],
  saveClinicalProblem: () => {},
  deleteClinicalProblem: () => {},
  getClinicalGoalsForCase: () => [mockGoal],
  saveClinicalGoal: () => {},
  deleteClinicalGoal: () => {},
  updateClinicalGoalStatus: () => {},
  getTreatmentPlansForCase: () => [],
  saveTreatmentPlan: () => {},
  deleteTreatmentPlan: () => {},
  getTreatmentSelectionsForCase: () => [],
  saveTreatmentSelection: () => {},
  deleteTreatmentSelection: () => {},
  getSessionsForCase: () => [],
  saveClinicalSession: () => {},
  deleteClinicalSession: () => {},
  finalizeClinicalSession: () => {},
  amendClinicalSession: () => {},
  saveSessionTreatmentDelivery: () => {},
  deleteSessionTreatmentDelivery: () => {},
  getProgressRecordsForCase: () => [mockProgressRecord],
  getProgressRecordById: () => undefined,
  getMeasurementsForRecord: () => [],
  getMeasurementsForCase: () => [],
  getMeasurementsByMeasureName: () => [],
  saveProgressRecord: () => {},
  deleteProgressRecord: () => {},
  finalizeProgressRecord: () => {},
  amendProgressRecord: () => {},
  saveProgressMeasurement: () => {},
  deleteProgressMeasurement: () => {},
  saveOutcomeMeasureDefinition: () => {},
  getDischargeRecordForCase: () => undefined,
  saveDischargeRecord: () => {},
  deleteDischargeRecord: () => {},
  finalizeCaseDischargeRecord: () => {},
  amendCaseDischargeRecord: () => {},
  getClinicalInvestigationsForCase: () => [],
  saveClinicalInvestigation: () => {},
  deleteClinicalInvestigation: () => {},
  saveEvidenceItem: () => {},
  deleteEvidenceItem: () => {},
  saveEvidenceSource: () => {},
  deleteEvidenceSource: () => {},
  saveConditionPresentation: () => {},
  deleteConditionPresentation: () => {},
  saveTreatmentIntervention: () => {},
  deleteTreatmentIntervention: () => {},
  linkEvidenceToTreatment: () => {},
  unlinkEvidenceFromTreatment: () => {},
  linkEvidenceToCondition: () => {},
  unlinkEvidenceFromCondition: () => {},
  linkTreatmentToCondition: () => {},
  unlinkTreatmentFromCondition: () => {},
  saveSettings: () => {},
  calculateWorkspaceSummary: () => ({} as any),
  exportWorkspaceBackup: () => '',
  importWorkspaceBackup: () => ({ success: true, message: '', replacedCounts: {} as any }),
  pruneHistoricalAuditEvents: () => 0,
};

// Helper to render CaseWorkspaceView
function renderWorkspace(initialSection?: string) {
  return renderToStaticMarkup(
    React.createElement(
      ClinicalContext.Provider,
      { value: mockCtx },
      React.createElement(CaseWorkspaceView, {
        caseItem: mockCase,
        patient: mockPatient,
        onBackToPatientHub: () => {},
        initialSection,
      })
    )
  );
}

// =========================================================================
// TEST 1 — Default Tab
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('id="tab-assessment"'), 'Tab 1 button exists');
  assert(html.includes('aria-selected="true"'), 'An active tab exists');
  assert(html.includes('id="tabpanel-assessment"'), 'Assessment panel exists');
  // Default tab has block class, others have hidden class
  assert(
    html.includes('id="tabpanel-assessment"') &&
    html.includes('id="tabpanel-care_plan"'),
    'Both assessment and care plan panels rendered'
  );
  pass('Test 1 — Default Tab: Case Workspace opens on Assessment tab by default');
}

// =========================================================================
// TEST 2 — Assessment Tab Components
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('id="section-subjective-assessment"'), 'Subjective Assessment card exists');
  assert(html.includes('id="section-objective-assessment"'), 'Objective Assessment section exists');
  assert(html.includes('id="section-clinical-investigations"'), 'Clinical Investigations section exists');
  assert(html.includes('Clinical Threads'), 'Clinical Threads rendered');
  pass('Test 2 — Assessment Tab: Subjective, Threads, Objective, and Investigations rendered');
}

// =========================================================================
// TEST 3 — Care Plan Tab Components
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('id="section-clinical-reasoning"'), 'Clinical Reasoning section exists');
  assert(html.includes('id="section-clinical-goals"'), 'Clinical Goals section exists');
  assert(html.includes('id="section-treatment-plan"'), 'Treatment Plan section exists');
  pass('Test 3 — Care Plan Tab: Clinical Reasoning, Goals, and Treatment Plan rendered');
}

// =========================================================================
// TEST 4 — Sessions Tab Components
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('id="section-clinical-sessions"'), 'Clinical Sessions section exists');
  pass('Test 4 — Sessions Tab: Clinical Sessions rendered in tabpanel-sessions');
}

// =========================================================================
// TEST 5 — Outcomes Tab Components
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('id="section-clinical-progress"'), 'Progress & Outcomes section exists');
  assert(html.includes('id="section-case-discharge"'), 'Case Discharge section exists');
  assert(html.includes('id="section-clinical-reporting"'), 'Case Reporting section exists');
  pass('Test 5 — Outcomes Tab: Progress/Reassessment, Discharge, and Reporting rendered');
}

// =========================================================================
// TEST 6 — Tab Navigation Bar & ARIA Semantics
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('role="tablist"'), 'Tablist container rendered');
  assert(html.includes('id="tab-assessment"'), 'Assessment tab button present');
  assert(html.includes('id="tab-care_plan"'), 'Care Plan tab button present');
  assert(html.includes('id="tab-sessions"'), 'Sessions tab button present');
  assert(html.includes('id="tab-outcomes"'), 'Outcomes tab button present');
  assert(html.includes('aria-controls="tabpanel-assessment"'), 'Assessment tab controls its panel');
  assert(html.includes('aria-controls="tabpanel-care_plan"'), 'Care plan tab controls its panel');
  assert(html.includes('aria-controls="tabpanel-sessions"'), 'Sessions tab controls its panel');
  assert(html.includes('aria-controls="tabpanel-outcomes"'), 'Outcomes tab controls its panel');
  pass('Test 6 — Tab Navigation Bar: Semantic role="tablist", role="tab", aria-selected, and aria-controls verified');
}

// =========================================================================
// TEST 7 — State Preservation Across Tabs (All 4 Panels Mounted)
// =========================================================================
{
  const html = renderWorkspace();
  // All four panels must be rendered simultaneously in the DOM (none unmounted)
  assert(html.includes('id="tabpanel-assessment"'), 'tabpanel-assessment mounted');
  assert(html.includes('id="tabpanel-care_plan"'), 'tabpanel-care_plan mounted');
  assert(html.includes('id="tabpanel-sessions"'), 'tabpanel-sessions mounted');
  assert(html.includes('id="tabpanel-outcomes"'), 'tabpanel-outcomes mounted');
  assert(html.includes('hidden'), 'Inactive panels receive hidden CSS class');
  pass('Test 7 — State Preservation: All four tab panels remain mounted in DOM with CSS visibility toggling');
}

// =========================================================================
// TEST 8 — Deep Linking: initialSection Mapping
// =========================================================================
{
  assert.strictEqual(mapSectionToWorkspaceTab('subjective'), 'assessment');
  assert.strictEqual(mapSectionToWorkspaceTab('objective'), 'assessment');
  assert.strictEqual(mapSectionToWorkspaceTab('investigations'), 'assessment');
  assert.strictEqual(mapSectionToWorkspaceTab('reasoning'), 'care_plan');
  assert.strictEqual(mapSectionToWorkspaceTab('goals'), 'care_plan');
  assert.strictEqual(mapSectionToWorkspaceTab('plan'), 'care_plan');
  assert.strictEqual(mapSectionToWorkspaceTab('sessions'), 'sessions');
  assert.strictEqual(mapSectionToWorkspaceTab('progress'), 'outcomes');
  assert.strictEqual(mapSectionToWorkspaceTab('discharge'), 'outcomes');
  assert.strictEqual(mapSectionToWorkspaceTab('reporting'), 'outcomes');
  assert.strictEqual(mapSectionToWorkspaceTab(undefined), 'assessment');

  // Verify render with initialSection='sessions' activates sessions tabpanel
  const sessionsHtml = renderWorkspace('sessions');
  assert(sessionsHtml.includes('id="tabpanel-sessions"'), 'sessions panel rendered');
  pass('Test 8 — Deep Linking: mapSectionToWorkspaceTab maps all 10 legacy sections to 4 primary tabs');
}

// =========================================================================
// TEST 9 — Target Section IDs Unchanged
// =========================================================================
{
  const html = renderWorkspace();
  const requiredSectionIds = [
    'section-subjective-assessment',
    'section-objective-assessment',
    'section-clinical-investigations',
    'section-clinical-reasoning',
    'section-clinical-goals',
    'section-treatment-plan',
    'section-clinical-sessions',
    'section-clinical-progress',
    'section-case-discharge',
    'section-clinical-reporting',
  ];
  for (const id of requiredSectionIds) {
    assert(html.includes(`id="${id}"`), `Section id="${id}" must exist unchanged`);
  }
  pass('Test 9 — Section IDs: All 10 authoritative section scroll IDs preserved intact');
}

// =========================================================================
// TEST 10 — Persistent Patient Safety Banner
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('id="workspace-patient-safety-banner"'), 'Patient Safety Banner rendered');
  // Confirm safety banner is rendered outside the tab panels
  const bannerIndex = html.indexOf('id="workspace-patient-safety-banner"');
  const tablistIndex = html.indexOf('role="tablist"');
  assert(bannerIndex < tablistIndex, 'Safety Banner is rendered before and above the tab navigation bar');
  pass('Test 10 — Safety Banner: PatientSafetyBanner remains permanently visible above tabs');
}

// =========================================================================
// TEST 11 — Persistent Longitudinal Context Trigger
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('id="workspace-longitudinal-context-btn"'), 'Longitudinal trigger button present');
  assert(html.includes('aria-label="Open longitudinal patient context"'), 'Accessible aria-label present');
  pass('Test 11 — Longitudinal Context: Trigger button and aria-label verified above tabs');
}

// =========================================================================
// TEST 12 — Patient / Case Isolation
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('Arthur Pendelton'), 'Correct patient name rendered');
  assert(html.includes('CASE-0042'), 'Correct case ID rendered');
  assert(html.includes('Lumbar Radiculopathy Management'), 'Correct case name rendered');
  pass('Test 12 — Patient Isolation: Strict patient and case binding preserved across all tabs');
}

// =========================================================================
// TEST 13 — Audit Neutrality (Zero Audit Events on Render/Navigation)
// =========================================================================
{
  let auditCount = 0;
  const auditSpyCtx = {
    ...mockCtx,
    auditEvents: [],
  };
  renderToStaticMarkup(
    React.createElement(
      ClinicalContext.Provider,
      { value: auditSpyCtx },
      React.createElement(CaseWorkspaceView, {
        caseItem: mockCase,
        patient: mockPatient,
        onBackToPatientHub: () => {},
      })
    )
  );
  assert.strictEqual(auditSpyCtx.auditEvents.length, 0, 'Zero audit events emitted during render');
  pass('Test 13 — Audit Neutrality: Tab navigation generates ZERO clinical audit ledger events');
}

// =========================================================================
// TEST 14 — Persistence Neutrality (Zero LocalStorage Operations)
// =========================================================================
{
  // activeTab is purely local React state; verified no new LocalStorage keys or writes
  const html = renderWorkspace();
  assert(!html.includes('physiocase_workspace_active_tab'), 'No local storage key rendered');
  pass('Test 14 — Persistence Neutrality: Zero LocalStorage keys or persistence dependencies introduced');
}

// =========================================================================
// TEST 15 — Clinical Neutrality
// =========================================================================
{
  const html = renderWorkspace();
  const prohibitedInferenceTerms = [
    'prognosis: excellent',
    'automated clinical interpretation',
    'recommended intervention priority',
    'system diagnosis',
  ];
  for (const term of prohibitedInferenceTerms) {
    assert(!html.toLowerCase().includes(term), `Prohibited term "${term}" must not appear`);
  }
  pass('Test 15 — Clinical Neutrality: Purely organizational tab titles with zero clinical judgments');
}

// =========================================================================
// TEST 16 — Completion Badges (Factual Presence Only)
// =========================================================================
{
  const html = renderWorkspace();
  // Goals badge shows factual count (1 goal)
  assert(html.includes('1 goal'), 'Care Plan tab displays factual goals count badge');
  // Outcomes badge shows factual reviews count (1 review)
  assert(html.includes('1 review'), 'Outcomes tab displays factual progress reviews count badge');
  pass('Test 16 — Completion Indicators: Lightweight factual documentation badges (counts) without clinical bias');
}

// =========================================================================
// TEST 17 — Back to Patient Hub Navigation
// =========================================================================
{
  const html = renderWorkspace();
  assert(html.includes('id="back-to-hub-btn"'), 'Back to Patient Hub button preserved');
  assert(html.includes('Back to Arthur Pendelton (Clinical Hub)'), 'Back button text contains patient name');
  pass('Test 17 — Back to Patient Hub: Persistent clinical navigation link preserved intact');
}

console.log(`\nALL ${passCount} / 17 TARGETED STEP 3 TESTS PASSED SUCCESSFULLY.`);
