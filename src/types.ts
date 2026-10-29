import { AuditActor, ClinicalNoteAmendment } from './types/audit';
export * from './types/audit';

export type NavigationTab = 'home' | 'patients' | 'cases' | 'evidence' | 'progress' | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  title: string;
  clinicName: string;
  registrationNumber?: string;
  initials: string;
}

export type PatientStatus = 'active' | 'discharged';
export type PatientSex = 'Female' | 'Male' | 'Other' | 'Prefer not to say';

export interface Patient {
  id: string;
  patientNumber?: string; // e.g. PC-0001
  fullName: string;
  preferredName?: string;
  dateOfBirth: string;
  sex?: PatientSex | string;
  phone?: string;
  email?: string;
  reasonForVisit: string;
  status: PatientStatus;
  createdAt: string;
  updatedAt?: string;

  // Stage 10: Longitudinal Patient History & Cumulative Chart Foundation
  patientSafetyProfile?: PatientSafetyProfile;
}

export type CaseStatus = 'Assessment' | 'Treatment' | 'Reassessment' | 'Discharged';
export type CaseStage = 'assessment' | 'treatment' | 'reassessment' | 'discharged';

export type CaseArchiveReason =
  | 'created_in_error'
  | 'duplicate_entry'
  | 'wrong_patient'
  | 'test_or_demo'
  | 'care_discontinued_uncontactable'
  | 'care_transferred_external'
  | 'administrative_closure'
  | 'clinical_hold_inactive';

export interface Case {
  id: string;
  caseId: string; // e.g. CASE-0001
  patientId: string;
  caseName: string;
  presentingProblem?: string;
  dateOfOnset?: string;
  referralSource?: string;
  startDate: string;
  status: CaseStatus;
  lastSessionDate?: string;
  nextReviewDate?: string;
  createdAt: string;
  updatedAt?: string;

  // Compatibility fields for existing views
  title?: string;
  stage?: CaseStage;
  patientName?: string;
  bodyRegion?: string;

  // Stage 13 & Lifecycle: Governed Administrative Archival
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: AuditActor;
  archiveReason?: CaseArchiveReason;
  archiveNotes?: string;
}

export interface AppSettings {
  practitionerName: string;
  credentials: string;
  clinicName: string;
  licenseNumber: string;
  email: string;
  theme: 'warm-clinical' | 'soft-stone';
  density: 'comfortable' | 'compact';
  measurementSystem: 'metric' | 'imperial';
  framework: 'journey' | 'soap';
  reviewCadenceWeeks: number;
}

export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed';
export type OnsetType = 'Sudden' | 'Gradual' | 'Unknown';
export type SymptomFrequency = 'Constant' | 'Intermittent';
export type SafetyScreeningAnswer = 'Yes' | 'No' | 'Unsure';

export type ClinicalThreadCategory =
  | 'neurological'
  | 'safety'
  | 'trauma'
  | 'functional'
  | 'mechanical';

export type ClinicalThreadStatus =
  | 'suggested'
  | 'exploring'
  | 'supported'
  | 'not_supported'
  | 'resolved'
  | 'not_pursued';

export interface ClinicalThread {
  id: string;
  caseId: string;
  ruleId?: string;
  title: string;
  category: ClinicalThreadCategory;
  status: ClinicalThreadStatus;
  triggeredBy: string[];
  rationale: string;
  suggestedAreas: string[];
  therapistNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectiveAssessment {
  id: string;
  caseId: string;
  patientId: string;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: AuditActor;
  amendments?: ClinicalNoteAmendment[];

  // A. Patient's Story
  patientStory: string;

  // B. Symptoms
  symptomLocations: string[];
  symptomDescriptions: string[];
  symptomDescriptionOther?: string;
  onset?: OnsetType | '';
  dateOfOnset?: string;
  howDidItStart?: string;

  // C. Aggravating & Easing Factors
  aggravatingFactors: string[];
  aggravatingFactorsNotes?: string;
  easingFactors: string[];
  easingFactorsNotes?: string;

  // D. Symptom Behaviour
  frequency?: SymptomFrequency | '';
  painSeverity: {
    current: number; // 0-10
    best: number;    // 0-10
    worst: number;   // 0-10
  };
  durationAfterAggravation?: string;

  // E. Functional Impact
  functionalDifficulties: string[];
  functionalDifficultiesNotes?: string;
  mostImportantActivity?: string;

  // F. Relevant Medical History
  previousSimilarEpisode?: string;
  previousSurgery?: string;
  previousInjury?: string;
  currentMedication?: string;
  relevantConditions?: string;
  previousPhysiotherapy?: string;

  // G. Safety Screening
  safetyScreening?: SafetyScreeningAnswer | '';
  safetyScreeningDetails?: string;

  // H. Patient Goals
  patientGoals?: string;

  // I. Therapist's Initial Notes
  therapistInitialNotes?: string;
}

// ==========================================
// STAGE 2: OBJECTIVE ASSESSMENT DATA MODEL
// ==========================================

export type ObjectiveAssessmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed';

export interface ObjectiveAssessment {
  id: string;
  caseId: string;
  patientId: string;

  status: ObjectiveAssessmentStatus;

  selectedAreas: string[];

  findings: ObjectiveFinding[];

  therapistNotes?: string;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: AuditActor;
  amendments?: ClinicalNoteAmendment[];
}

export interface ObjectiveFinding {
  id: string;
  assessmentId: string;

  examinationArea: string;
  finding: string;

  createdAt: string;
  updatedAt: string;
}

// Stage 3B: Clinical Reasoning (Findings → Problems)
export type ClinicalProblemStatus =
  | 'active'
  | 'addressed'
  | 'resolved'
  | 'inactive';

export interface ClinicalProblem {
  id: string;
  caseId: string;
  patientId: string;

  title: string;
  description?: string;

  linkedFindingIds: string[];
  linkedInvestigationIds?: string[];

  status: ClinicalProblemStatus;

  therapistNotes?: string;

  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;

  // Stage 13: Governed Soft Deletion
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: AuditActor;
  archiveReason?: string;
}

// Stage 4A: Goals & Functional Outcomes Foundation (Problems → Goals)
export type ClinicalGoalStatus =
  | 'active'
  | 'met'
  | 'partially_met'
  | 'not_met'
  | 'discontinued';

export type ClinicalGoalType =
  | 'short_term'
  | 'long_term';

export interface ClinicalGoal {
  id: string;

  caseId: string;
  patientId: string;

  title: string;
  description?: string;

  type: ClinicalGoalType;

  linkedProblemIds: string[];

  targetValue?: string;
  targetDate?: string;

  status: ClinicalGoalStatus;

  therapistNotes?: string;

  createdAt: string;
  updatedAt: string;
  achievedAt?: string;

  // Stage 13: Governed Soft Deletion
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: AuditActor;
  archiveReason?: string;
}

// ==========================================
// STAGE 4B: TREATMENT PLAN & SELECTION TYPES
// ==========================================

export type TreatmentPlanStatus =
  | 'active'
  | 'modified'
  | 'completed'
  | 'discontinued';

export interface TreatmentPlan {
  id: string;

  caseId: string;
  patientId: string;

  title?: string;
  clinicalRationale?: string;

  status: TreatmentPlanStatus;

  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export type TreatmentInterventionType =
  | 'therapeutic_exercise'
  | 'manual_therapy'
  | 'education'
  | 'activity_modification'
  | 'functional_training'
  | 'neuromuscular_training'
  | 'cardiorespiratory_training'
  | 'electrotherapy'
  | 'hydrotherapy'
  | 'orthotic_or_assistive_strategy'
  | 'self_management'
  | 'other';

export type TreatmentCategory =
  | 'exercise'
  | 'manual_therapy'
  | 'education'
  | 'functional_training'
  | 'activity_modification'
  | 'aerobic_conditioning'
  | 'neuromuscular_training'
  | 'other';

export interface TreatmentDosage {
  frequency?: string;
  intensity?: string;
  duration?: string;
  volume?: string;
  parameters?: string;
  sets?: number;
  reps?: number;
  holdTime?: string;
  restPeriod?: string;
  notes?: string;
}

export interface TreatmentProgression {
  plannedChange?: string;
  progressionCriteria?: string;
  regressionCriteria?: string;
  reviewDate?: string;
  notes?: string;
}

export type TreatmentSelectionStatus =
  | 'planned'
  | 'active'
  | 'modified'
  | 'completed'
  | 'discontinued';

export interface TreatmentSelection {
  id: string;

  caseId: string;
  patientId: string;

  treatmentPlanId?: string;

  // Specific single clinical problem (Stage 4E) or array for backward compatibility
  clinicalProblemId?: string;
  linkedProblemIds?: string[];

  // Specific single goal (Stage 4E) or array for backward compatibility
  goalId?: string;
  linkedGoalIds?: string[];

  title: string;

  // Stage 4E canonical intervention type
  interventionType: TreatmentInterventionType;
  // Category alias for Stage 4B backward compatibility
  category?: TreatmentCategory;

  interventionDescription: string;
  // Description alias for Stage 4B backward compatibility
  description?: string;

  clinicalRationale?: string;
  // Rationale alias for Stage 4B backward compatibility
  therapistRationale?: string;

  therapistNotes?: string;

  status: TreatmentSelectionStatus;

  // Optional dosage & progression references (Stage 4B structure preserved)
  dosage?: TreatmentDosage;
  progression?: TreatmentProgression;

  createdAt: string;
  updatedAt: string;
  discontinuedAt?: string;
}

// Stage 4E Relational Models
export interface TreatmentEvidenceLink {
  id: string;
  treatmentSelectionId: string;
  evidenceItemId: string;
  therapistNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentConditionLink {
  id: string;
  treatmentSelectionId: string;
  conditionPresentationId: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// STAGE 4C: EVIDENCE KNOWLEDGE LAYER
// ==========================================

export type EvidenceType =
  | 'clinical_practice_guideline'
  | 'systematic_review'
  | 'meta_analysis'
  | 'randomized_controlled_trial'
  | 'cohort_study'
  | 'case_control_study'
  | 'consensus_statement'
  | 'position_statement'
  | 'other';

export type EvidenceSourceStatus =
  | 'current'
  | 'superseded'
  | 'withdrawn'
  | 'archived';

export interface EvidenceSource {
  id: string;

  title: string;

  authors?: string[];

  organization?: string;

  publicationYear: number;

  evidenceType: EvidenceType;

  journalOrPublisher?: string;

  doi?: string;

  url?: string;

  version?: string;

  status: EvidenceSourceStatus;

  publishedAt?: string;

  lastReviewedAt?: string;

  supersededBySourceId?: string;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;

  sourceId: string;

  title: string;

  summary: string;

  conditionOrPresentation?: string;

  population?: string;

  clinicalContext?: string;

  treatmentApproach?: string;

  recommendation?: string;

  recommendationStrength?: string;

  evidenceLevel?: string;

  limitations?: string;

  applicability?: string;

  createdAt: string;
  updatedAt: string;
}

// ==========================================
// STAGE 4D: CONDITION / PRESENTATION PATHWAYS
// ==========================================

export type ConditionPresentationType =
  | 'condition'
  | 'clinical_presentation'
  | 'symptom_pattern'
  | 'functional_presentation'
  | 'other';

export type ConditionPresentationStatus = 'active' | 'archived';

export interface ConditionPresentation {
  id: string;
  name: string;
  type: ConditionPresentationType;
  description?: string;
  bodyRegion?: string;
  system?: string;
  commonTerms?: string[];
  notes?: string;
  status: ConditionPresentationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConditionEvidenceLink {
  id: string;
  conditionPresentationId: string;
  evidenceItemId: string;
  relevanceNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// STAGE 4F: CLINICAL INVESTIGATIONS LAYER
// ==========================================

export type InvestigationCategory = 'radiological';

export type RadiologicalModality =
  | 'xray'
  | 'mri'
  | 'ct'
  | 'ultrasound'
  | 'other';

export interface InvestigationAttachment {
  id?: string;
  name?: string;
  type?: string;
  size?: number;
  storageReference?: string;
  dataUrl?: string;
}

export interface ClinicalInvestigation {
  id: string; // e.g. INV-0001
  caseId: string;

  category: InvestigationCategory;
  modality: RadiologicalModality;

  name: string;
  bodyRegion: string;
  investigationDate: string; // YYYY-MM-DD

  indication?: string;

  findings?: string;
  impression?: string;

  sourceType?: string;
  sourceName?: string;

  clinicianRelevance?: string;

  attachment?: InvestigationAttachment;

  createdAt: string;
  updatedAt: string;

  // Stage 13: Governed Soft Deletion
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: AuditActor;
  archiveReason?: string;
}
// ==========================================

export type ClinicalSessionStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'missed';

export type SessionToleranceRating =
  | 'well_tolerated'
  | 'moderately_tolerated'
  | 'poorly_tolerated'
  | 'adverse_response'
  | 'not_evaluated';

export interface ClinicalSession {
  id: string;
  caseId: string;
  patientId: string;
  sessionNumber: number; // Case-specific 1-indexed sequential encounter number
  sessionDate: string;   // ISO YYYY-MM-DD
  startTime?: string;    // e.g. "09:30" or ISO timestamp
  endTime?: string;      // e.g. "10:15" or ISO timestamp
  status: ClinicalSessionStatus;

  // Session Context & Narrative
  therapistSessionNotes?: string;        // Clinical observations, manual technique details, objective findings today
  patientSubjectiveResponse?: string;    // Check-in / symptom report since last session / pre-treatment state
  overallTolerance: SessionToleranceRating; // Patient immediate tolerance rating
  immediateObservations?: string;        // Immediate post-treatment response / signs / functional test re-check
  modificationsSummary?: string;         // Summary of modifications made today

  createdAt: string;
  updatedAt: string;

  // Stage 13: Finalization & Amendments
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: AuditActor;
  amendments?: ClinicalNoteAmendment[];
}

export type DeliveryExecutionStatus =
  | 'completed_as_planned'
  | 'modified'
  | 'partially_completed'
  | 'omitted'
  | 'deferred';

export type TreatmentModificationType =
  | 'none'
  | 'dosage_modified'
  | 'intensity_modified'
  | 'duration_modified'
  | 'repetitions_modified'
  | 'exercise_modified'
  | 'intervention_added'
  | 'intervention_omitted'
  | 'intervention_stopped'
  | 'intervention_substituted'
  | 'other';

export interface SessionTreatmentDelivery {
  id: string;
  sessionId: string;
  caseId: string;
  patientId: string;

  // Relation to planned TreatmentSelection (nullable for ad-hoc interventions delivered)
  treatmentSelectionId?: string;

  // Snapshot identification
  title: string;
  interventionType: TreatmentInterventionType;

  // Actual parameters delivered during this specific encounter
  actualDosage?: TreatmentDosage;
  actualDurationMinutes?: number;

  // Execution status & modification tracking
  deliveryStatus: DeliveryExecutionStatus;
  modificationType?: TreatmentModificationType;
  modificationReason?: string; // e.g., "Increased patellar tendon irritability on 3rd set; reduced resistance"
  therapistExecutionNotes?: string; // Biomechanical cues, patient positioning, assistance level

  // Immediate response specific to this intervention
  immediateResponse?: string; // e.g., "0/10 pain during movement; mild quadriceps fatigue"

  createdAt: string;
  updatedAt: string;
}

// ==========================================
// STAGE 6: CLINICAL PROGRESS & OUTCOMES TYPES
// ==========================================

export type ProgressRecordContextType =
  | 'routine_progress_review'
  | 'reassessment'
  | 'functional_update'
  | 'outcome_measurement'
  | 'goal_review'
  | 'milestone_review'
  | 'discharge_evaluation'
  | 'other';

export type MeasurementValueType =
  | 'numeric'
  | 'percentage'
  | 'scale_10'
  | 'degrees'
  | 'repetitions'
  | 'duration_seconds'
  | 'distance_metres'
  | 'weight_kg'
  | 'grade_5'
  | 'text'
  | 'binary';

export type MeasurementStage =
  | 'baseline'
  | 'interim'
  | 'reassessment'
  | 'discharge';

export type MeasurementDirectionMeaning =
  | 'higher_is_better'
  | 'lower_is_better'
  | 'not_defined';

export interface OutcomeMeasureDefinition {
  id: string;
  name: string;
  shortDescription?: string;
  category:
    | 'pain'
    | 'range_of_motion'
    | 'strength'
    | 'functional_mobility'
    | 'exercise_tolerance'
    | 'patient_reported'
    | 'neurological'
    | 'custom';
  valueType: MeasurementValueType;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  directionMeaning: MeasurementDirectionMeaning;
  isSystemStandard?: boolean;
}

export interface ProgressMeasurement {
  id: string;
  progressRecordId: string;
  caseId: string;
  patientId: string;

  // Measurement Definition & Identification
  measureDefinitionId?: string;
  measureName: string;
  category: string;
  valueType: MeasurementValueType;
  unit?: string;

  // Longitudinal Semantics
  stage: MeasurementStage; // baseline, interim, reassessment, discharge

  // Value storage
  numericValue?: number;
  textValue?: string;

  // Optional Reference Links
  linkedGoalId?: string;

  // Clinical Context
  context?: string; // e.g. "Active goniometry in supine", "Reported at end of walking test"
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ProgressRecord {
  id: string;
  caseId: string;
  patientId: string;

  recordDate: string; // ISO date YYYY-MM-DD
  contextType: ProgressRecordContextType;

  // Therapist Narrative Summary & Clinical Interpretation
  therapistSummary: string; // Factual summary of progress observed
  clinicalInterpretation?: string; // Clinician-owned clinical reasoning/notes

  // Optional Relational References to other clinical entities
  linkedSessionId?: string;
  linkedAssessmentId?: string;
  linkedGoalId?: string;

  createdAt: string;
  updatedAt: string;

  // Stage 13: Finalization & Amendments
  status?: 'in_progress' | 'completed';
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: AuditActor;
  amendments?: ClinicalNoteAmendment[];
}

// ==========================================
// STAGE 7: CASE DISCHARGE & CLINICAL SUMMARY
// ==========================================

export type DischargeReason =
  | 'goals_achieved'
  | 'plateau_functional_independence'
  | 'self_management_transition'
  | 'patient_choice_discontinued'
  | 'medical_transfer_referral'
  | 'relocation'
  | 'non_attendance'
  | 'other';

export interface CaseDischargeRecord {
  id: string;
  caseId: string;
  patientId: string;

  dischargeDate: string; // ISO YYYY-MM-DD
  dischargeReason: DischargeReason;

  // Stage 13: Finalization & Amendments
  status?: 'in_progress' | 'completed';
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: AuditActor;
  amendments?: ClinicalNoteAmendment[];

  // Therapist-authored episode synthesis & final clinical status
  episodeSummary: string; // Narrative synthesis of presenting problem, course of care, and overall response
  clinicalStatusAtDischarge: string; // Final status of symptoms, impairments, mobility, strength, and function

  // Post-Discharge & Self-Management Plan
  homeMaintenancePlan?: string; // Home exercise programme, activity pacing, ergonomic & lifestyle advice
  precautionsAndWarningSigns?: string; // Red flags, symptoms requiring re-consultation, specific precautions
  referralOrFollowUp?: string; // GP letter, specialist referral, community physiotherapy, self-referral details

  createdAt: string;
  updatedAt: string;
}

// ==========================================
// STAGE 8: CLINICAL REPORTING & EXPORT
// ==========================================
export * from './types/reporting';

// ==========================================
// STAGE 10: LONGITUDINAL PATIENT HISTORY & CUMULATIVE CHART FOUNDATION
// ==========================================

export type SafetyVerificationStatus =
  | 'unverified'
  | 'verified'
  | 'disputed';

export type SafetyProvenanceSource =
  | 'clinician_entry'
  | 'patient_reported'
  | 'referral_letter'
  | 'external_medical_record';

export interface SafetyItemProvenance {
  recordedAt: string; // ISO 8601
  recordedBy: string; // Clinician identifier/name
  source: SafetyProvenanceSource;
  verificationStatus: SafetyVerificationStatus;
  verifiedAt?: string; // ISO 8601
  verifiedBy?: string; // Clinician identifier/name
  verificationNotes?: string;
}

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';

export interface PatientAllergy extends SafetyItemProvenance {
  id: string; // e.g. alg-xxxx
  allergen: string; // e.g. "Latex", "Adhesive tape", "Penicillin", "NSAIDs"
  reactionType: string; // e.g. "Contact dermatitis", "Anaphylaxis", "Bronchospasm"
  severity: AllergySeverity;
  clinicalNotes?: string;
}

export type PersistentPrecautionCategory =
  | 'implant'
  | 'surgical'
  | 'systemic'
  | 'medication'
  | 'neurological'
  | 'biomechanical'
  | 'other';

export interface PatientPersistentPrecaution extends SafetyItemProvenance {
  id: string; // e.g. prc-xxxx
  precaution: string; // e.g. "Avoid cervical manipulation", "Total hip replacement precautions (no flex > 90°)"
  category: PersistentPrecautionCategory;
  bodyRegion?: string;
  details: string;
}

export interface PatientSurgicalHistoryItem extends SafetyItemProvenance {
  id: string; // e.g. srg-xxxx
  procedure: string; // e.g. "Right Knee ACL Reconstruction (Hamstring autograft)"
  approximateDateOrYear: string; // e.g. "2019" or "2019-06"
  bodyRegion: string;
  facilityOrSurgeon?: string;
  relevantComplicationsOrNotes?: string;
}

export interface PatientMedicalCondition extends SafetyItemProvenance {
  id: string; // e.g. cnd-xxxx
  conditionName: string; // e.g. "Type 1 Diabetes Mellitus", "Severe Osteoporosis"
  diagnosedYearOrDate?: string; // e.g. "2014"
  clinicalRelevanceToPhysio: string; // e.g. "Impaired peripheral sensation; altered bone mineral density"
  isActive: boolean;
}

export interface PatientMobilityContext extends SafetyItemProvenance {
  baselineMobilityStatus: string; // e.g. "Independent community ambulation with single point stick"
  enduringAssistiveDevices: string[]; // e.g. ["Single point stick", "Rigid AFO left ankle"]
  relevantEnvironmentalBarriers?: string; // e.g. "Lives in 2nd floor flat without lift (24 stairs)"
}

export interface PatientSafetyProfile {
  allergies: PatientAllergy[];
  persistentPrecautions: PatientPersistentPrecaution[];
  surgicalHistory: PatientSurgicalHistoryItem[];
  persistentMedicalConditions: PatientMedicalCondition[];
  enduringMobilityContext?: PatientMobilityContext;
  lastReviewedAt?: string;
  lastReviewedBy?: string;
}

// Derived Longitudinal View Models (Read-Only / Pure Selectors)

export type PatientTimelineEventType =
  | 'patient_registered'
  | 'case_opened'
  | 'assessment_finalized'
  | 'investigation_logged'
  | 'clinical_problem_formulated'
  | 'progress_evaluated'
  | 'milestone_session_logged'
  | 'case_discharged'
  | 'safety_profile_reviewed';

export type TimelineSourceType =
  | 'patient'
  | 'case'
  | 'subjective_assessment'
  | 'objective_assessment'
  | 'clinical_investigation'
  | 'clinical_problem'
  | 'clinical_session'
  | 'progress_record'
  | 'case_discharge_record'
  | 'patient_safety_profile';

export interface PatientTimelineEvent {
  id: string;
  patientId: string;
  caseId?: string;
  caseName?: string;
  timestamp: string; // ISO 8601
  eventType: PatientTimelineEventType;
  title: string;
  summary: string;
  sourceType?: TimelineSourceType | string;
  sourceId?: string;
  navigationTarget?: {
    tab: 'cases' | 'patient-hub';
    caseId?: string;
    sectionId?: string;
  };
}

export interface HistoricalCaseSummary {
  caseId: string;
  displayId: string;
  caseName: string;
  status: CaseStatus;
  stage?: CaseStage;
  startDate: string;
  dischargeDate?: string;
  durationWeeks?: number;
  referralSource?: string;
  presentingProblem?: string;
  totalSessions: number;
  problemCounts: { total: number; resolved: number; active: number };
  goalCounts: { total: number; met: number; active: number };
  primaryOutcomesSummary: Array<{
    measureName: string;
    baselineScore?: string | number;
    finalScore?: string | number;
    unit?: string;
  }>;
  dischargeReason?: string;
  dischargeStatusSummary?: string;
  updatedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: CaseArchiveReason;
  archiveNotes?: string;
}

export interface CumulativeProblemItem {
  id: string;
  problemId: string;
  patientId: string;
  problemStatement: string;
  originatingCaseId: string;
  originatingCaseName: string;
  originatingCaseDisplayId?: string;
  caseStatus?: CaseStatus;
  formulatedDate: string;
  sourceStatus: ClinicalProblemStatus;
  isFromClosedCase: boolean;
  linkedFindingCount: number;
  linkedInvestigationCount: number;
  therapistNotes?: string;
  problem: ClinicalProblem;
}

export interface HistoricalTreatmentContextItem {
  id: string;
  originatingCaseId: string;
  originatingCaseName: string;
  sessionDate: string;
  sessionNumber?: number;
  treatmentName: string;
  category: string;
  deliveredParameters?: string;
  documentedTolerance?: SessionToleranceRating | string;
  therapistNotes?: string;
}

export interface LongitudinalOutcomePoint {
  measurementId: string;
  progressRecordId: string;
  patientId: string;
  caseId: string;
  caseName: string;
  originatingCaseDisplayId?: string;
  isFromClosedCase: boolean;

  measureDefinitionId?: string;
  measureName: string;
  category: string;

  scoreNumeric?: number;
  scoreText?: string;
  unit?: string;

  stage: MeasurementStage;
  date: string;

  linkedGoalId?: string;
  targetValue?: string | number;

  therapistAuthoredNotes?: string;

  rawMeasurement: ProgressMeasurement;
}

export interface LongitudinalMeasureSeries {
  seriesKey: string;

  measureDefinitionId?: string;
  measureName: string;
  category: string;
  unit?: string;
  valueType: MeasurementValueType;

  directionMeaning?: MeasurementDirectionMeaning;

  points: LongitudinalOutcomePoint[];

  episodes: Array<{
    caseId: string;
    caseName: string;
    originatingCaseDisplayId?: string;
    isClosed: boolean;

    startDate?: string;
    dischargeDate?: string;

    points: LongitudinalOutcomePoint[];

    baselinePoint?: LongitudinalOutcomePoint;
    latestPoint?: LongitudinalOutcomePoint;
  }>;
}

export interface PatientSafetyAlertsSummary {
  hasAllergies: boolean;
  hasPersistentPrecautions: boolean;
  hasSurgicalHistory: boolean;
  hasMedicalConditions: boolean;
  totalAlertCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  disputedCount: number;
  allergies: PatientAllergy[];
  persistentPrecautions: PatientPersistentPrecaution[];
  surgicalHistory: PatientSurgicalHistoryItem[];
  persistentMedicalConditions: PatientMedicalCondition[];
  mobilityContext?: PatientMobilityContext;
  lastReviewedAt?: string;
  lastReviewedBy?: string;
}

// ==========================================
// STAGE 10D: CASEWORKSPACE LONGITUDINAL CONTEXT
// ==========================================

export type CaseLongitudinalTab =
  | 'safety'
  | 'priorEpisodes'
  | 'historicalProblems'
  | 'pastOutcomes'
  | 'priorTreatments'
  | 'timeline';

export interface CaseLongitudinalContextViewModel {
  patientId: string;
  patient?: Patient;
  currentCaseId: string;
  currentCaseDisplayId?: string;

  // 1. Safety & Medical Profile (Patient-level)
  safetyProfile: PatientSafetyProfile;
  safetyAlerts: PatientSafetyAlertsSummary;

  // 2. Prior Episodes (Strictly excluding current case)
  historicalCases: HistoricalCaseSummary[];

  // 3. Historical Problems (Originating from prior cases)
  historicalProblems: CumulativeProblemItem[];

  // 4. Past Outcomes (Measurements from prior cases)
  historicalOutcomes: LongitudinalMeasureSeries[];

  // 5. Prior Treatments (Delivered interventions from prior cases)
  historicalTreatments: HistoricalTreatmentContextItem[];

  // 6. Timeline Milestones (Events from prior cases or patient-level)
  timelineEvents: PatientTimelineEvent[];

  // Summary counts for badges
  counts: {
    safetyAlerts: number;
    priorEpisodes: number;
    historicalProblems: number;
    pastOutcomes: number;
    priorTreatments: number;
    timelineEvents: number;
  };
}


