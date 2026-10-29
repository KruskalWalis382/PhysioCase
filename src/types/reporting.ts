import {
  Patient,
  Case,
  SubjectiveAssessment,
  ObjectiveAssessment,
  ObjectiveFinding,
  ClinicalProblem,
  ClinicalGoal,
  TreatmentPlan,
  TreatmentSelection,
  ClinicalSession,
  SessionTreatmentDelivery,
  ProgressRecord,
  ProgressMeasurement,
  CaseDischargeRecord,
  EvidenceItem,
  AppSettings,
  ClinicalInvestigation,
  CumulativeProblemItem,
  HistoricalTreatmentContextItem,
  PatientTimelineEvent,
} from '../types';

// ==========================================
// STAGE 8: CLINICAL REPORTING & EXPORT TYPES
// ==========================================

export type ClinicalReportType =
  | 'comprehensive_case'
  | 'referral_communication'
  | 'patient_discharge';

export type ReportSectionId =
  | 'header'
  | 'patient_demographics'
  | 'case_overview'
  | 'referral_intake'
  | 'subjective_assessment'
  | 'objective_findings'
  | 'clinical_reasoning_problems'
  | 'functional_goals'
  | 'treatment_plan_selections'
  | 'session_history'
  | 'progress_outcomes'
  | 'discharge_summary'
  | 'home_maintenance_plan'
  | 'precautions_warning_signs'
  | 'follow_up_referral'
  | 'evidence_citations'
  | 'therapist_declaration';

export interface ReportSectionConfig {
  id: ReportSectionId;
  label: string;
  description: string;
  defaultIncluded: boolean;
  requiredForType?: boolean;
}

export interface ClinicalReportConfig {
  reportType: ClinicalReportType;
  includedSectionIds: ReportSectionId[];
  deIdentify: boolean;
  includeEvidence: boolean;
  generatedAt: string;
  recipientName?: string;
  recipientRole?: string;
  facilityName?: string;
}

// Pure data container passed into report builders
export interface CaseClinicalDataset {
  patient: Patient;
  caseItem: Case;
  subjectiveAssessment?: SubjectiveAssessment;
  objectiveAssessment?: ObjectiveAssessment;
  objectiveFindings: ObjectiveFinding[];
  clinicalProblems: ClinicalProblem[];
  goals: ClinicalGoal[];
  treatmentPlans: TreatmentPlan[];
  treatmentSelections: TreatmentSelection[];
  sessions: ClinicalSession[];
  sessionDeliveries: SessionTreatmentDelivery[];
  progressRecords: ProgressRecord[];
  progressMeasurements: ProgressMeasurement[];
  dischargeRecord?: CaseDischargeRecord;
  evidenceItems: EvidenceItem[];
  clinicalInvestigations?: ClinicalInvestigation[];
  settings?: AppSettings;
}

// Renderable compiled report structures
export interface RenderedReportHeader {
  clinicName: string;
  practitionerName: string;
  credentials: string;
  licenseNumber?: string;
  reportTitle: string;
  generatedDate: string;
  deIdentified: boolean;
  recipientName?: string;
  recipientRole?: string;
  facilityName?: string;
}

export interface RenderedPatientInfo {
  displayName: string;
  patientNumber?: string;
  dateOfBirth?: string;
  age?: number | string;
  sex?: string;
  phone?: string;
  email?: string;
}

export interface RenderedCaseOverview {
  caseId: string;
  caseName: string;
  presentingProblem?: string;
  dateOfOnset?: string;
  startDate: string;
  status: string;
  referralSource?: string;
  episodeDuration?: string;
  totalEncounters: number;
  isArchived?: boolean;
  archiveReason?: string;
  archivedAt?: string;
}

export interface RenderedSubjective {
  chiefComplaint?: string;
  painLocation?: string;
  painIntensity?: number | string;
  symptomBehavior?: string;
  functionalDifficulties: string[];
  medicalHistory?: string;
  safetyScreeningStatus?: string;
  safetyDetails?: string;
}

export interface RenderedObjectiveItem {
  examinationArea: string;
  finding: string;
}

export interface RenderedProblemItem {
  title: string;
  description?: string;
  status: string;
  linkedFindings: string[];
  linkedInvestigations?: string[];
}

export interface RenderedGoalItem {
  description: string;
  type: string;
  status: string;
  targetDate?: string;
}

export interface RenderedTreatmentItem {
  title: string;
  interventionType: string;
  parametersText?: string;
  rationale?: string;
  status: string;
}

export interface RenderedSessionItem {
  sessionNumber: number;
  date: string;
  status: string;
  tolerance: string;
  subjectiveCheckIn?: string;
  therapistNotes?: string;
  deliveriesSummary?: string;
}

export interface RenderedOutcomeComparisonItem {
  measureName: string;
  category: string;
  baselineValue?: string;
  dischargeValue?: string;
  netChange?: string;
}

export interface RenderedDischargeSummary {
  dischargeDate: string;
  dischargeReason: string;
  episodeSummary: string;
  clinicalStatusAtDischarge: string;
  homeMaintenancePlan?: string;
  precautionsAndWarningSigns?: string;
  referralOrFollowUp?: string;
}

export interface RenderedEvidenceItem {
  title: string;
  authors?: string;
  year?: number;
  levelOfEvidence?: string;
  clinicalTakeaway?: string;
}

export interface AssembledClinicalReport {
  id: string;
  reportType: ClinicalReportType;
  config: ClinicalReportConfig;
  header: RenderedReportHeader;
  patientInfo: RenderedPatientInfo;
  caseOverview: RenderedCaseOverview;
  subjective?: RenderedSubjective;
  objectiveFindings: RenderedObjectiveItem[];
  problems: RenderedProblemItem[];
  goals: RenderedGoalItem[];
  treatments: RenderedTreatmentItem[];
  sessions: RenderedSessionItem[];
  progressOutcomes: RenderedOutcomeComparisonItem[];
  discharge?: RenderedDischargeSummary;
  evidence: RenderedEvidenceItem[];
  therapistDeclaration: {
    practitionerName: string;
    credentials: string;
    clinicName: string;
    licenseNumber?: string;
    date: string;
  };
}

// Structured JSON Case Export metadata container
export interface StructuredCaseExportMetadata {
  format: 'physiocase-case-archive';
  version: '1.0';
  exportedAt: string;
  application: 'PhysioCase';
  caseId: string;
  patientId: string;
  deidentified: boolean;
}

// Structured JSON Case Export container
export interface StructuredCaseExport {
  exportMetadata: StructuredCaseExportMetadata;
  schemaVersion: '1.0';
  exportedAt: string;
  exportFormat: 'full' | 'de_identified';
  patient: Partial<Patient> & { age?: number };
  caseItem: Case;
  subjectiveAssessment?: SubjectiveAssessment;
  objectiveAssessment?: ObjectiveAssessment;
  objectiveFindings: ObjectiveFinding[];
  clinicalProblems: ClinicalProblem[];
  goals: ClinicalGoal[];
  treatmentPlans: TreatmentPlan[];
  treatmentSelections: TreatmentSelection[];
  sessions: ClinicalSession[];
  sessionDeliveries: SessionTreatmentDelivery[];
  progressRecords: ProgressRecord[];
  progressMeasurements: ProgressMeasurement[];
  dischargeRecord?: CaseDischargeRecord;
  evidenceItems: EvidenceItem[];
  clinicalInvestigations?: ClinicalInvestigation[];
}

// ==========================================
// STAGE 11: LONGITUDINAL PATIENT REPORTING TYPES
// ==========================================

export type LongitudinalReportType = 'longitudinal_patient_summary';

export type LongitudinalReportSectionId =
  | 'header'
  | 'patient_identity'
  | 'safety_context'
  | 'episodes_history'
  | 'cumulative_problems'
  | 'cross_episode_outcomes'
  | 'historical_treatments'
  | 'clinical_timeline'
  | 'therapist_declaration';

export interface LongitudinalReportSectionConfig {
  id: LongitudinalReportSectionId;
  label: string;
  description: string;
  defaultIncluded: boolean;
  requiredForType?: boolean;
}

export interface LongitudinalReportConfig {
  reportType: LongitudinalReportType;
  includedSectionIds: LongitudinalReportSectionId[];
  deIdentify: boolean;
  chronologicalOrder: 'newest_first' | 'oldest_first';
  generatedAt: string;
  recipientName?: string;
  recipientRole?: string;
  facilityName?: string;
  customClinicalNotes?: string;
}

export interface RenderedSafetySection {
  totalAlertCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  disputedCount: number;
  allergies: Array<{
    id: string;
    allergen: string;
    reaction: string;
    severity: string;
    status: string;
    clinicalNotes?: string;
  }>;
  persistentPrecautions: Array<{
    id: string;
    precaution: string;
    category: string;
    status: string;
    details?: string;
  }>;
  surgicalHistory: Array<{
    id: string;
    procedure: string;
    year: string;
    region: string;
  }>;
  persistentMedicalConditions: Array<{
    id: string;
    condition: string;
    physioRelevance: string;
    status: string;
  }>;
  mobilityContext?: {
    baseline: string;
    assistiveDevices: string[];
  };
}

export interface RenderedEpisodeItem {
  caseId: string;
  displayId: string;
  caseName: string;
  status: string;
  startDate: string;
  dischargeDate?: string;
  durationWeeks?: number;
  totalSessions: number;
  dischargeReason?: string;
  episodeSummary?: string;
  clinicalStatusAtDischarge?: string;
  isActiveEpisode: boolean;
  problemCounts: { total: number; resolved: number; active: number };
  goalCounts: { total: number; met: number; active: number };
  isArchived?: boolean;
  archiveReason?: string;
  archivedAt?: string;
}

export interface RenderedLongitudinalOutcomeEpisode {
  caseId: string;
  caseDisplayId: string;
  caseName: string;
  isClosed: boolean;
  startDate?: string;
  dischargeDate?: string;
  baselineDate?: string;
  baselineValue?: string | number;
  latestDate?: string;
  latestValue?: string | number;
  rawDelta?: string | number;
  targetValue?: string | number;
}

export interface RenderedLongitudinalOutcomeSeries {
  seriesKey: string;
  measureName: string;
  category: string;
  unit?: string;
  episodes: RenderedLongitudinalOutcomeEpisode[];
}

export interface AssembledLongitudinalPatientReport {
  id: string;
  reportType: LongitudinalReportType;
  config: LongitudinalReportConfig;
  header: RenderedReportHeader;
  patientInfo: RenderedPatientInfo;
  safety: RenderedSafetySection;
  episodes: RenderedEpisodeItem[];
  cumulativeProblems: CumulativeProblemItem[];
  outcomeSeries: RenderedLongitudinalOutcomeSeries[];
  historicalTreatments: HistoricalTreatmentContextItem[];
  timelineEvents: PatientTimelineEvent[];
  therapistDeclaration: {
    practitionerName: string;
    credentials: string;
    clinicName: string;
    licenseNumber?: string;
    declarationDate: string;
  };
}

