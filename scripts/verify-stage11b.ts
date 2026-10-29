/**
 * Stage 11B Verification Test Suite
 *
 * Verifies Longitudinal Patient Reporting & Health Summary Export:
 * 1. Pure Assembler Functionality (assembleLongitudinalPatientReport):
 *    - Clinic and practitioner header compilation.
 *    - Patient demographics and non-mutating de-identification masking.
 *    - Documented safety profile compilation (allergies, precautions, surgeries, conditions, mobility).
 *    - Historical episodes directory compilation and sorting (newest vs oldest first).
 *    - Cumulative problem history compilation and provenance preservation.
 *    - Cross-episode outcome trajectories compilation and raw mathematical delta calculation.
 *    - Historical treatment deliveries compilation.
 *    - Clinical timeline events compilation and sorting.
 *    - Clinician signature and declaration block.
 *    - Custom clinical remarks handling.
 * 2. Structured JSON Export Serialization (exportLongitudinalReportToJSON):
 *    - Conforms to 'physiocase-longitudinal-summary' schema v1.0.
 *    - Respects section selection filters and de-identification settings.
 *    - Valid JSON parsing without data corruption.
 * 3. Component Rendering (LongitudinalReportDocument & LongitudinalReportModal & PatientHubView):
 *    - Print-ready document structure with clinical styling.
 *    - Section toggles and mandatory section protection.
 *    - Graceful empty states when historical records are absent.
 *    - Patient Hub entry point triggers (header action and tab header action).
 * 4. Safety, Governance & Clinical Neutrality:
 *    - Zero automated clinical interpretations or recovery labels.
 *    - Strict cross-patient data isolation.
 *    - Zero LocalStorage mutations.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientHubView } from '../src/views/PatientHubView';
import { LongitudinalReportDocument } from '../src/components/patient/LongitudinalReportDocument';
import { LongitudinalReportModal } from '../src/components/patient/LongitudinalReportModal';
import { ClinicalContext } from '../src/context/ClinicalContext';
import {
  assembleLongitudinalPatientReport,
  exportLongitudinalReportToJSON,
  AVAILABLE_LONGITUDINAL_REPORT_SECTIONS,
  createDefaultLongitudinalReportConfig,
} from '../src/utils/longitudinalReporting';
import {
  Patient,
  Case,
  ClinicalProblem,
  ClinicalGoal,
  ClinicalSession,
  SessionTreatmentDelivery,
  ProgressRecord,
  ProgressMeasurement,
  CaseDischargeRecord,
  AppSettings,
} from '../src/types';
import { LongitudinalClinicalDataset } from '../src/utils/longitudinalPatientHistory';

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

// Mock settings
const mockSettings: AppSettings = {
  clinicName: 'St. Jude Physiotherapy Centre',
  practitionerName: 'Dr. Arthur Pendelton',
  credentials: 'PT, DPT, OCS, FAAOMPT',
  licenseNumber: 'PT-883921',
  email: 'arthur@stjudephysio.com',
  theme: 'warm-clinical',
  density: 'comfortable',
  measurementSystem: 'metric',
  framework: 'journey',
  reviewCadenceWeeks: 4,
};

function createMockPatient(id: string, fullName: string, patientNumber = 'PC-0042'): Patient {
  return {
    id,
    fullName,
    patientNumber,
    dateOfBirth: '1985-06-15',
    sex: 'Female',
    phone: '+44 7700 900123',
    email: 'sarah.jenkins@example.com',
    reasonForVisit: 'Persistent lumbar discomfort with radicular symptoms',
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
          precaution: 'Avoid cervical high-velocity manipulation',
          category: 'biomechanical',
          details: 'Hypermobility spectrum disorder',
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
          clinicalRelevanceToPhysio: 'Delayed tissue healing and sensory monitoring',
          verificationStatus: 'verified',
          isActive: true,
          recordedAt: '2023-01-01',
          recordedBy: 'Dr. Clinician',
          source: 'clinician_entry',
        },
      ],
      enduringMobilityContext: {
        baselineMobilityStatus: 'Independent community ambulation with single crutch for distances > 1km',
        enduringAssistiveDevices: ['Single elbow crutch'],
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

function buildMockDataset(): { patient1: Patient; patient2: Patient; dataset: LongitudinalClinicalDataset } {
  const patient1 = createMockPatient('pt-1', 'Eleanor Vance', 'PC-0042');
  const patient2 = createMockPatient('pt-2', 'Theodora Crain', 'PC-0099');

  const case1: Case = {
    id: 'case-past-1',
    patientId: 'pt-1',
    caseId: 'CASE-0010',
    caseName: 'Lumbar Disc Herniation',
    status: 'Discharged',
    startDate: '2023-01-15',
    createdAt: '2023-01-15',
    updatedAt: '2023-04-10',
  };

  const case2: Case = {
    id: 'case-active-1',
    patientId: 'pt-1',
    caseId: 'CASE-0042',
    caseName: 'Right Shoulder Impingement',
    status: 'Assessment',
    startDate: '2024-02-01',
    createdAt: '2024-02-01',
    updatedAt: '2024-03-01',
  };

  const caseOtherPatient: Case = {
    id: 'case-other-1',
    patientId: 'pt-2',
    caseId: 'CASE-0099',
    caseName: 'Cervical Radiculopathy',
    status: 'Assessment',
    startDate: '2024-01-10',
    createdAt: '2024-01-10',
  };

  const problem1: ClinicalProblem = {
    id: 'prob-1',
    patientId: 'pt-1',
    caseId: 'case-past-1',
    title: 'L5-S1 Radicular Pain into Left Calf',
    status: 'resolved',
    linkedFindingIds: [],
    linkedInvestigationIds: [],
    therapistNotes: 'Symptom resolution following nerve root decompression exercises',
    createdAt: '2023-01-16',
    updatedAt: '2023-01-16',
  };

  const problem2: ClinicalProblem = {
    id: 'prob-2',
    patientId: 'pt-1',
    caseId: 'case-active-1',
    title: 'Subacromial Impingement Pain on Abduction',
    status: 'active',
    linkedFindingIds: [],
    linkedInvestigationIds: [],
    therapistNotes: 'Pain provoked between 70-110 degrees of elevation',
    createdAt: '2024-02-02',
    updatedAt: '2024-02-02',
  };

  const goal1: ClinicalGoal = {
    id: 'goal-1',
    patientId: 'pt-1',
    caseId: 'case-past-1',
    title: 'Walk 3km pain free without sitting breaks',
    description: 'Walk 3km pain free without sitting breaks',
    type: 'long_term',
    linkedProblemIds: ['prob-1'],
    status: 'met',
    targetDate: '2023-04-01',
    createdAt: '2023-01-16',
    updatedAt: '2023-01-16',
  };

  const goal2: ClinicalGoal = {
    id: 'goal-2',
    patientId: 'pt-1',
    caseId: 'case-active-1',
    title: 'Reach overhead to top cupboard without compensatory trunk extension',
    description: 'Reach overhead to top cupboard without compensatory trunk extension',
    type: 'short_term',
    linkedProblemIds: ['prob-2'],
    status: 'active',
    targetDate: '2024-04-15',
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
  };

  const session1: ClinicalSession = {
    id: 'ses-1',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    sessionNumber: 1,
    sessionDate: '2023-01-16',
    status: 'completed',
    patientSubjectiveResponse: 'Initial session',
    therapistSessionNotes: 'Baseline assessment and gentle mobility',
    overallTolerance: 'well_tolerated',
    createdAt: '2023-01-16',
    updatedAt: '2023-01-16',
  };

  const session2: ClinicalSession = {
    id: 'ses-2',
    caseId: 'case-active-1',
    patientId: 'pt-1',
    sessionNumber: 1,
    sessionDate: '2024-02-03',
    status: 'completed',
    patientSubjectiveResponse: 'Mild soreness after elevation',
    therapistSessionNotes: 'Rotator cuff activation exercises',
    overallTolerance: 'well_tolerated',
    createdAt: '2024-02-03',
    updatedAt: '2024-02-03',
  };

  const delivery1: SessionTreatmentDelivery = {
    id: 'del-1',
    sessionId: 'ses-1',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    treatmentSelectionId: 'tx-1',
    title: 'Directional Lumbar Extension',
    interventionType: 'therapeutic_exercise',
    actualDosage: {
      sets: 3,
      reps: 10,
      parameters: 'prone press-up',
    },
    deliveryStatus: 'completed_as_planned',
    createdAt: '2023-01-16',
    updatedAt: '2023-01-16',
  };

  const delivery2: SessionTreatmentDelivery = {
    id: 'del-2',
    sessionId: 'ses-2',
    caseId: 'case-active-1',
    patientId: 'pt-1',
    treatmentSelectionId: 'tx-2',
    title: 'Scapular Retraction & Setting',
    interventionType: 'therapeutic_exercise',
    actualDosage: {
      sets: 2,
      reps: 12,
      holdTime: '5s',
    },
    deliveryStatus: 'completed_as_planned',
    createdAt: '2024-02-03',
    updatedAt: '2024-02-03',
  };

  const progress1: ProgressRecord = {
    id: 'prg-1',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    recordDate: '2023-01-16',
    contextType: 'routine_progress_review',
    therapistSummary: 'Progress noted',
    createdAt: '2023-01-16',
    updatedAt: '2023-01-16',
  };

  const progress2: ProgressRecord = {
    id: 'prg-2',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    recordDate: '2023-04-09',
    contextType: 'routine_progress_review',
    therapistSummary: 'Progress noted',
    createdAt: '2023-04-09',
    updatedAt: '2023-04-09',
  };

  const measurement1: ProgressMeasurement = {
    id: 'meas-1',
    progressRecordId: 'prg-1',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    measureName: 'Numerical Pain Rating Scale (NPRS)',
    category: 'pain',
    valueType: 'numeric',
    stage: 'baseline',
    unit: '/10',
    numericValue: 8,
    createdAt: '2023-01-16',
    updatedAt: '2023-01-16',
  };

  const measurement2: ProgressMeasurement = {
    id: 'meas-2',
    progressRecordId: 'prg-2',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    measureName: 'Numerical Pain Rating Scale (NPRS)',
    category: 'pain',
    valueType: 'numeric',
    stage: 'discharge',
    unit: '/10',
    numericValue: 2,
    createdAt: '2023-04-09',
    updatedAt: '2023-04-09',
  };

  const discharge1: CaseDischargeRecord = {
    id: 'dis-1',
    caseId: 'case-past-1',
    patientId: 'pt-1',
    dischargeDate: '2023-04-10',
    dischargeReason: 'goals_achieved',
    clinicalStatusAtDischarge: 'Pain resolved, functional mobility fully restored.',
    episodeSummary: 'Comprehensive 12-week rehabilitation following acute discogenic episode.',
    homeMaintenancePlan: 'Continue daily extension mobility and core stability regimen.',
    precautionsAndWarningSigns: 'Avoid prolonged slouched sitting. Re-contact if radicular symptoms return.',
    referralOrFollowUp: 'Discharged to self-management.',
    createdAt: '2023-04-10',
    updatedAt: '2023-04-10',
  };

  const dataset: LongitudinalClinicalDataset = {
    patients: [patient1, patient2],
    cases: [case1, case2, caseOtherPatient],
    subjectiveAssessments: [],
    objectiveAssessments: [],
    clinicalInvestigations: [],
    clinicalProblems: [problem1, problem2],
    clinicalGoals: [goal1, goal2],
    clinicalSessions: [session1, session2],
    sessionTreatmentDeliveries: [delivery1, delivery2],
    progressRecords: [progress1, progress2],
    progressMeasurements: [measurement1, measurement2],
    caseDischargeRecords: [discharge1],
  };

  return { patient1, patient2, dataset };
}

function createMockClinicalContext(patient1: Patient, patient2: Patient, dataset: LongitudinalClinicalDataset): any {
  return {
    patients: dataset.patients,
    cases: dataset.cases,
    reviewsTodayCount: 0,
    addPatient: () => patient1,
    updatePatient: () => {},
    deletePatient: () => {},
    getPatientCases: (id: string) => dataset.cases.filter((c) => c.patientId === id),
    addCase: () => dataset.cases[0],
    updateCase: () => {},
    deleteCase: () => {},
    getSubjectiveAssessment: () => undefined,
    updateSubjectiveAssessment: () => {},
    clinicalProblems: dataset.clinicalProblems,
    clinicalGoals: dataset.clinicalGoals,
    clinicalSessions: dataset.clinicalSessions,
    sessionTreatmentDeliveries: dataset.sessionTreatmentDeliveries,
    progressRecords: dataset.progressRecords,
    progressMeasurements: dataset.progressMeasurements,
    caseDischargeRecords: dataset.caseDischargeRecords,
    subjectiveAssessments: dataset.subjectiveAssessments,
    objectiveAssessments: dataset.objectiveAssessments,
    clinicalInvestigations: dataset.clinicalInvestigations,
    treatmentPlans: [],
    treatmentSelections: [],
    treatmentEvidenceLinks: [],
    treatmentConditionLinks: [],
    evidenceSources: [],
    evidenceItems: [],
    conditionPresentations: [],
    conditionEvidenceLinks: [],
    outcomeMeasureDefinitions: [],
    appSettings: mockSettings,
    settings: mockSettings,
    updateSettings: () => {},
    activeCase: dataset.cases[1],
    setActiveCase: () => {},
    openNewCaseModal: () => {},
    openEditPatientModal: () => {},
    verifyPatientSafetyItem: () => {},
    updatePatientSafetyProfile: () => {},
  };
}

async function runTestSuite() {
  console.log('=== STAGE 11B VERIFICATION TEST SUITE ===');

  const { patient1, patient2, dataset } = buildMockDataset();

  // ==========================================
  // SECTION 1: Pure Assembler Verification
  // ==========================================
  console.log('\n--- Section 1: Pure Report Assembler (assembleLongitudinalPatientReport) ---');

  const defaultConfig = createDefaultLongitudinalReportConfig();
  const assembled = assembleLongitudinalPatientReport(patient1, dataset, defaultConfig, mockSettings);

  assert(assembled.reportType === 'longitudinal_patient_summary', 'Test 1.1: Report type is longitudinal_patient_summary');
  assert(assembled.header.clinicName === mockSettings.clinicName, 'Test 1.2: Header includes configured clinic name');
  assert(assembled.header.practitionerName === mockSettings.practitionerName, 'Test 1.3: Header includes configured practitioner name');
  assert(assembled.header.credentials === mockSettings.credentials, 'Test 1.4: Header includes practitioner credentials');
  assert(assembled.header.licenseNumber === mockSettings.licenseNumber, 'Test 1.5: Header includes registration/license number');
  assert(!assembled.header.deIdentified, 'Test 1.6: Default report is not de-identified');

  // Patient Demographics
  assert(assembled.patientInfo.displayName === patient1.fullName, 'Test 1.7: Patient full name correctly assembled');
  assert(assembled.patientInfo.patientNumber === patient1.patientNumber, 'Test 1.8: Patient ID surfaced');
  assert(assembled.patientInfo.dateOfBirth === patient1.dateOfBirth, 'Test 1.9: Patient DOB surfaced');
  assert(assembled.patientInfo.phone === patient1.phone, 'Test 1.10: Patient phone surfaced');
  assert(assembled.patientInfo.email === patient1.email, 'Test 1.11: Patient email surfaced');

  // Safety Profile
  assert(assembled.safety.totalAlertCount === 5, 'Test 1.12: Safety total alert count correctly assembled');
  assert(assembled.safety.verifiedCount === 5, 'Test 1.13: Safety verified count correctly assembled');
  assert(assembled.safety.allergies[0].allergen === 'Latex', 'Test 1.14: Allergy Latex compiled');
  assert(assembled.safety.persistentPrecautions[0].precaution.includes('cervical'), 'Test 1.15: Precaution compiled');
  assert(assembled.safety.surgicalHistory[0].procedure.includes('Arthroscopy'), 'Test 1.16: Surgery compiled');
  assert(assembled.safety.persistentMedicalConditions[0].condition.includes('Diabetes'), 'Test 1.17: Medical condition compiled');

  // Episodes Directory
  assert(assembled.episodes.length === 2, 'Test 1.18: Both episodes compiled (closed + active)');
  const closedEp = assembled.episodes.find((e) => e.caseId === 'case-past-1');
  const activeEp = assembled.episodes.find((e) => e.caseId === 'case-active-1');
  assert(Boolean(closedEp && !closedEp.isActiveEpisode), 'Test 1.19: Closed episode identified');
  assert(Boolean(activeEp && activeEp.isActiveEpisode), 'Test 1.20: Active episode identified');
  assert(closedEp?.dischargeReason === 'goals_achieved', 'Test 1.21: Discharge reason preserved');
  assert(closedEp?.episodeSummary?.includes('rehabilitation') === true, 'Test 1.22: Discharge episode summary preserved');

  // Cumulative Problems
  assert(assembled.cumulativeProblems.length === 2, 'Test 1.23: Cumulative problems compiled');
  const resolvedProb = assembled.cumulativeProblems.find((p) => p.id === 'prob-1');
  assert(resolvedProb?.originatingCaseDisplayId === 'CASE-0010', 'Test 1.24: Problem provenance preserved');
  assert(resolvedProb?.sourceStatus === 'resolved', 'Test 1.25: Problem status preserved');

  // Cross-Episode Outcome Trajectories
  assert(assembled.outcomeSeries.length === 1, 'Test 1.26: Cross-episode outcome series compiled');
  const nprsSeries = assembled.outcomeSeries[0];
  assert(nprsSeries.measureName === 'Numerical Pain Rating Scale (NPRS)', 'Test 1.27: Outcome measure name compiled');
  assert(nprsSeries.episodes.length === 1, 'Test 1.28: NPRS episode compiled');
  assert(nprsSeries.episodes[0].baselineValue === 8, 'Test 1.29: Baseline score 8 preserved');
  assert(nprsSeries.episodes[0].latestValue === 2, 'Test 1.30: Latest score 2 preserved');
  assert(nprsSeries.episodes[0].rawDelta === -6, 'Test 1.31: Raw delta mathematically calculated (-6)');

  // Historical Treatments
  assert(assembled.historicalTreatments.length === 2, 'Test 1.32: Historical treatments compiled');
  const tx1 = assembled.historicalTreatments.find((t) => t.id === 'del-1');
  assert(tx1?.treatmentName === 'Directional Lumbar Extension', 'Test 1.33: Treatment name compiled');
  assert(Boolean(tx1 && (tx1.originatingCaseName === 'Lumbar Disc Herniation' || tx1.originatingCaseId === 'case-past-1')), 'Test 1.34: Treatment originating case provenance preserved');

  // Therapist Declaration
  assert(assembled.therapistDeclaration.practitionerName === mockSettings.practitionerName, 'Test 1.35: Declaration practitioner name compiled');
  assert(assembled.therapistDeclaration.clinicName === mockSettings.clinicName, 'Test 1.36: Declaration clinic name compiled');

  // ==========================================
  // SECTION 2: Presentation & Privacy Configurations
  // ==========================================
  console.log('\n--- Section 2: Presentation & Privacy Configurations ---');

  // De-identification Mode
  const deIdConfig = { ...defaultConfig, deIdentify: true };
  const deIdReport = assembleLongitudinalPatientReport(patient1, dataset, deIdConfig, mockSettings);

  assert(deIdReport.header.deIdentified === true, 'Test 2.1: Header deIdentified flag is true');
  assert(deIdReport.patientInfo.displayName === 'Patient #PC-0042', 'Test 2.2: Patient name is masked to Patient #PC-0042');
  assert(deIdReport.patientInfo.dateOfBirth === undefined, 'Test 2.3: DOB is omitted in de-identified mode');
  assert(deIdReport.patientInfo.phone === undefined, 'Test 2.4: Phone is omitted in de-identified mode');
  assert(deIdReport.patientInfo.email === undefined, 'Test 2.5: Email is omitted in de-identified mode');

  // Chronological Ordering: Newest First vs Oldest First
  const oldestFirstConfig = { ...defaultConfig, chronologicalOrder: 'oldest_first' as const };
  const oldestReport = assembleLongitudinalPatientReport(patient1, dataset, oldestFirstConfig, mockSettings);

  assert(new Date(oldestReport.episodes[0].startDate).getTime() < new Date(oldestReport.episodes[1].startDate).getTime(), 'Test 2.6: Oldest episode first when configured');
  assert(new Date(assembled.episodes[0].startDate).getTime() > new Date(assembled.episodes[1].startDate).getTime(), 'Test 2.7: Newest episode first by default');

  // Custom Clinical Cover Remarks
  const notesConfig = { ...defaultConfig, customClinicalNotes: 'Please review previous MRI before initial consultation.' };
  const notesReport = assembleLongitudinalPatientReport(patient1, dataset, notesConfig, mockSettings);
  assert(notesReport.config.customClinicalNotes === 'Please review previous MRI before initial consultation.', 'Test 2.8: Custom cover remarks stored in report config');

  // Recipient Metadata
  const recipientConfig = {
    ...defaultConfig,
    recipientName: 'Dr. Gregory House',
    recipientRole: 'Head of Diagnostic Medicine',
    facilityName: 'Princeton-Plainsboro Hospital',
  };
  const recipientReport = assembleLongitudinalPatientReport(patient1, dataset, recipientConfig, mockSettings);
  assert(recipientReport.header.recipientName === 'Dr. Gregory House', 'Test 2.9: Recipient name compiled');
  assert(recipientReport.header.recipientRole === 'Head of Diagnostic Medicine', 'Test 2.10: Recipient role compiled');
  assert(recipientReport.header.facilityName === 'Princeton-Plainsboro Hospital', 'Test 2.11: Recipient facility compiled');

  // ==========================================
  // SECTION 3: Structured JSON Export Serialization
  // ==========================================
  console.log('\n--- Section 3: Structured JSON Export Serialization ---');

  const jsonString = exportLongitudinalReportToJSON(assembled);
  const parsed = JSON.parse(jsonString);

  assert(parsed.format === 'physiocase-longitudinal-summary', 'Test 3.1: JSON format is physiocase-longitudinal-summary');
  assert(parsed.version === '1.0', 'Test 3.2: Schema version is 1.0');
  assert(parsed.application === 'PhysioCase', 'Test 3.3: Application is PhysioCase');
  assert(typeof parsed.exportedAt === 'string', 'Test 3.4: Exported timestamp is present');
  assert(parsed.header.clinicName === mockSettings.clinicName, 'Test 3.5: JSON contains header');
  assert(parsed.patient.displayName === patient1.fullName, 'Test 3.6: JSON contains patient info');
  assert(Array.isArray(parsed.sections.episodes), 'Test 3.7: JSON contains episodes array');
  assert(Array.isArray(parsed.sections.cumulativeProblems), 'Test 3.8: JSON contains cumulative problems');
  assert(Array.isArray(parsed.sections.crossEpisodeOutcomes), 'Test 3.9: JSON contains outcome series');
  assert(Array.isArray(parsed.sections.historicalTreatments), 'Test 3.10: JSON contains historical treatments');
  assert(parsed.therapistDeclaration.practitionerName === mockSettings.practitionerName, 'Test 3.11: JSON contains therapist declaration');

  // Section Exclusion in JSON
  const filteredConfig = {
    ...defaultConfig,
    includedSectionIds: AVAILABLE_LONGITUDINAL_REPORT_SECTIONS
      .map((s) => s.id)
      .filter((id) => id !== 'cumulative_problems'),
  };
  const filteredReport = assembleLongitudinalPatientReport(patient1, dataset, filteredConfig, mockSettings);
  const filteredJSON = JSON.parse(exportLongitudinalReportToJSON(filteredReport));
  assert(filteredJSON.sections.cumulativeProblems === undefined, 'Test 3.12: Excluded cumulative_problems section is omitted from JSON');

  // De-identified JSON
  const deIdJSON = JSON.parse(exportLongitudinalReportToJSON(deIdReport));
  assert(deIdJSON.patient.displayName === 'Patient #PC-0042', 'Test 3.13: JSON patient is masked in de-identified export');
  assert(deIdJSON.patient.dateOfBirth === undefined, 'Test 3.14: JSON patient DOB is omitted in de-identified export');

  // ==========================================
  // SECTION 4: Component Rendering
  // ==========================================
  console.log('\n--- Section 4: Component Rendering ---');

  // 4.1 LongitudinalReportDocument
  const docHtml = renderToStaticMarkup(React.createElement(LongitudinalReportDocument, { report: assembled }));

  assert(docHtml.includes('id="longitudinal-report-document"'), 'Test 4.1: Report document container rendered');
  assert(docHtml.includes(mockSettings.clinicName), 'Test 4.2: Clinic name rendered in document');
  assert(docHtml.includes(mockSettings.practitionerName), 'Test 4.3: Practitioner name rendered in document');
  assert(docHtml.includes(patient1.fullName), 'Test 4.4: Patient name rendered in document');
  assert(docHtml.includes('Documented Patient Safety Context'), 'Test 4.5: Safety section title rendered');
  assert(docHtml.includes('Latex'), 'Test 4.6: Authored allergy rendered');
  assert(docHtml.includes('Episodes of Care Directory'), 'Test 4.7: Episodes section rendered');
  assert(docHtml.includes('CASE-0010'), 'Test 4.8: Historical case display ID rendered');
  assert(docHtml.includes('CASE-0042'), 'Test 4.9: Active case display ID rendered');
  assert(docHtml.includes('Cumulative Problem History'), 'Test 4.10: Cumulative problems title rendered');
  assert(docHtml.includes('L5-S1 Radicular Pain into Left Calf'), 'Test 4.11: Authored problem statement rendered');
  assert(docHtml.includes('Cross-Episode Outcome Trajectories'), 'Test 4.12: Cross-episode outcomes section rendered');
  assert(docHtml.includes('Numerical Pain Rating Scale (NPRS)'), 'Test 4.13: Outcome measure name rendered');
  assert(docHtml.includes('Historical Treatment Context'), 'Test 4.14: Historical treatments section rendered');
  assert(docHtml.includes('Directional Lumbar Extension'), 'Test 4.15: Treatment name rendered');
  assert(docHtml.includes('Longitudinal Clinical Timeline'), 'Test 4.16: Timeline section rendered');
  assert(docHtml.includes('Clinician Signature &amp; Declaration') || docHtml.includes('I confirm that this Longitudinal Patient Summary'), 'Test 4.17: Therapist declaration block rendered');

  // De-identified document rendering
  const deIdDocHtml = renderToStaticMarkup(React.createElement(LongitudinalReportDocument, { report: deIdReport }));
  assert(deIdDocHtml.includes('Patient #PC-0042'), 'Test 4.18: De-identified patient pseudonym rendered in document');
  assert(!deIdDocHtml.includes(patient1.fullName), 'Test 4.19: True patient name masked in de-identified document');
  assert(deIdDocHtml.includes('De-Identified Record'), 'Test 4.20: De-identified badge rendered in document');

  // Custom cover remarks in document
  const notesDocHtml = renderToStaticMarkup(React.createElement(LongitudinalReportDocument, { report: notesReport }));
  assert(notesDocHtml.includes('Clinical Cover Remarks'), 'Test 4.21: Cover remarks header rendered');
  assert(notesDocHtml.includes('Please review previous MRI'), 'Test 4.22: Authored cover remarks text rendered');

  // Graceful empty states in document
  const emptyPatient = createEmptyMockPatient('pt-empty', 'Empty Patient');
  const emptyDataset: LongitudinalClinicalDataset = {
    patients: [emptyPatient],
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
  };
  const emptyReport = assembleLongitudinalPatientReport(emptyPatient, emptyDataset, defaultConfig, mockSettings);
  const emptyDocHtml = renderToStaticMarkup(React.createElement(LongitudinalReportDocument, { report: emptyReport }));

  assert(emptyDocHtml.includes('No persistent safety information recorded.'), 'Test 4.23: Factual safety empty state rendered');
  assert(emptyDocHtml.includes('No prior episodes documented.'), 'Test 4.24: Factual episodes empty state rendered');
  assert(emptyDocHtml.includes('No clinical problems documented.'), 'Test 4.25: Factual problems empty state rendered');
  assert(emptyDocHtml.includes('No outcome measurements documented across episodes.'), 'Test 4.26: Factual outcomes empty state rendered');
  assert(emptyDocHtml.includes('No historical treatment deliveries recorded.'), 'Test 4.27: Factual treatments empty state rendered');
  assert(emptyDocHtml.includes('No timeline events available.'), 'Test 4.28: Factual timeline empty state rendered');

  // 4.2 LongitudinalReportModal
  const modalHtml = renderToStaticMarkup(
    React.createElement(LongitudinalReportModal, {
      isOpen: true,
      onClose: () => {},
      patient: patient1,
      dataset,
      settings: mockSettings,
    })
  );

  assert(modalHtml.includes('role="dialog"'), 'Test 4.29: Modal dialog container rendered');
  assert(modalHtml.includes('id="longitudinal-report-modal-title"'), 'Test 4.30: Modal title element rendered');
  assert(modalHtml.includes('id="report-print-btn"'), 'Test 4.31: Print / PDF action button present');
  assert(modalHtml.includes('id="report-export-json-btn"'), 'Test 4.32: Export JSON action button present');
  assert(modalHtml.includes('id="report-close-btn"'), 'Test 4.33: Modal close action button present');
  assert(modalHtml.includes('id="report-deidentify-toggle"'), 'Test 4.34: De-identify checkbox toggle present');
  assert(modalHtml.includes('Newest First'), 'Test 4.35: Chronological ordering button present');
  assert(modalHtml.includes('Oldest First'), 'Test 4.36: Chronological ordering button present');
  assert(modalHtml.includes('Report Sections'), 'Test 4.37: Report sections list present');

  // Modal closed returns null
  const closedModalHtml = renderToStaticMarkup(
    React.createElement(LongitudinalReportModal, {
      isOpen: false,
      onClose: () => {},
      patient: patient1,
      dataset,
      settings: mockSettings,
    })
  );
  assert(closedModalHtml === '', 'Test 4.38: Modal renders nothing when isOpen is false');

  // 4.3 PatientHubView Integration
  const mockContext = createMockClinicalContext(patient1, patient2, dataset);
  const hubHtml = renderToStaticMarkup(
    React.createElement(
      ClinicalContext.Provider,
      { value: mockContext },
      React.createElement(PatientHubView, {
        patient: patient1,
        onBack: () => {},
        onOpenCase: () => {},
      })
    )
  );

  assert(hubHtml.includes('id="hub-longitudinal-report-btn"'), 'Test 4.39: Patient Hub header action button "hub-longitudinal-report-btn" present');
  assert(hubHtml.includes('Longitudinal Report'), 'Test 4.40: Button label "Longitudinal Report" present');
  assert(hubHtml.includes('id="hub-export-longitudinal-summary-btn"'), 'Test 4.41: Tab bar action button "hub-export-longitudinal-summary-btn" present');
  assert(hubHtml.includes('Export Health Summary'), 'Test 4.42: Button label "Export Health Summary" present');

  // ==========================================
  // SECTION 5: Safety, Governance & Patient Isolation
  // ==========================================
  console.log('\n--- Section 5: Safety, Governance & Patient Isolation ---');

  // Cross-patient isolation: Eleanor Vance (pt-1) must never contain Theodora Crain's (pt-2) episode CASE-0099
  assert(!assembled.episodes.some((e) => e.caseId === 'case-other-1'), 'Test 5.1: Patient 1 report contains zero episodes from Patient 2');
  assert(!docHtml.includes('CASE-0099'), 'Test 5.2: Document HTML never contains Patient 2 case display ID');
  assert(!docHtml.includes('Cervical Radiculopathy'), 'Test 5.3: Document HTML never contains Patient 2 diagnosis');

  // Assemble for Patient 2: verify Patient 2 receives their own data
  const p2Report = assembleLongitudinalPatientReport(patient2, dataset, defaultConfig, mockSettings);
  assert(p2Report.episodes.length === 1 && p2Report.episodes[0].displayId === 'CASE-0099', 'Test 5.4: Patient 2 report contains their own episode CASE-0099');
  assert(!p2Report.episodes.some((e) => e.caseId === 'case-past-1'), 'Test 5.5: Patient 2 report never contains Patient 1 episodes');

  // Clinical Neutrality: Ensure no autonomous diagnostic, prognostic, or efficacy claims
  const forbiddenPhrases = [
    'patient has recovered',
    'patient is cured',
    'treatment was effective',
    'treatment failed',
    'favorable prognosis',
    'poor prognosis',
    'chronic disease confirmed',
    'mcid achieved',
    'clinically significant improvement',
    'high risk patient',
  ];

  for (const phrase of forbiddenPhrases) {
    assert(!docHtml.toLowerCase().includes(phrase), `Test 5.6: No autonomous phrase "${phrase}" fabricated`);
  }

  // Zero LocalStorage writes during report operations
  let storageWrites = 0;
  const originalSetItem = (globalThis as any).localStorage?.setItem;
  if ((globalThis as any).localStorage) {
    (globalThis as any).localStorage.setItem = () => {
      storageWrites++;
    };
  }

  assembleLongitudinalPatientReport(patient1, dataset, defaultConfig, mockSettings);
  exportLongitudinalReportToJSON(assembled);
  renderToStaticMarkup(React.createElement(LongitudinalReportDocument, { report: assembled }));

  if (originalSetItem) {
    (globalThis as any).localStorage.setItem = originalSetItem;
  }
  assert(storageWrites === 0, 'Test 5.7: Zero LocalStorage writes during report assembly, export, or render');

  // Final summary
  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed === 0) {
    console.log('ALL STAGE 11B TESTS PASSED SUCCESSFULLY.');
  } else {
    console.error('STAGE 11B VERIFICATION FAILED.');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
