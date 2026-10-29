import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Patient,
  Case,
  CaseStatus,
  CaseArchiveReason,
  AppSettings,
  SubjectiveAssessment,
  ClinicalThread,
  ClinicalThreadStatus,
  ObjectiveAssessment,
  ObjectiveAssessmentStatus,
  ClinicalProblem,
  ClinicalProblemStatus,
  ClinicalGoal,
  ClinicalGoalStatus,
  ClinicalGoalType,
  TreatmentPlan,
  TreatmentPlanStatus,
  TreatmentSelection,
  TreatmentSelectionStatus,
  TreatmentCategory,
  TreatmentInterventionType,
  TreatmentEvidenceLink,
  TreatmentConditionLink,
  EvidenceSource,
  EvidenceItem,
  EvidenceType,
  EvidenceSourceStatus,
  ConditionPresentation,
  ConditionEvidenceLink,
  ConditionPresentationType,
  ConditionPresentationStatus,
  ClinicalSession,
  ClinicalSessionStatus,
  SessionToleranceRating,
  SessionTreatmentDelivery,
  DeliveryExecutionStatus,
  TreatmentModificationType,
  ProgressRecord,
  ProgressRecordContextType,
  ProgressMeasurement,
  OutcomeMeasureDefinition,
  CaseDischargeRecord,
  DischargeReason,
  InvestigationCategory,
  RadiologicalModality,
  ClinicalInvestigation,
  InvestigationAttachment,
  PatientSafetyProfile,
  ClinicalAuditEvent,
  ClinicalNoteAmendment,
  AuditActor,
  AuditActionType,
  AuditableEntityType,
  User,
} from '../types';
import { AuthoritativeWorkspaceDataset } from '../types/backup';
import {
  generateAuditId,
  getNextSequence,
  resolveAuditActor,
  createClinicalNoteAmendment,
  canDeleteTreatmentSelection,
  canDeleteTreatmentPlan,
  canDeleteEvidenceSource,
  globalAuditRetryQueue,
  canArchiveCase,
  getCaseClinicalFootprint,
  CaseFootprintDataset,
} from '../utils/clinicalAudit';
import {
  generateCandidateThreads,
  reconcileClinicalThreads,
} from '../utils/clinicalThreads';
import {
  OBJECTIVE_ASSESSMENTS_STORAGE_KEY,
  createEmptyObjectiveAssessment,
} from '../utils/objectiveAssessment';
import {
  CLINICAL_PROBLEMS_STORAGE_KEY,
  createEmptyClinicalProblem,
} from '../utils/clinicalProblems';
import {
  CLINICAL_GOALS_STORAGE_KEY,
  createEmptyClinicalGoal,
} from '../utils/clinicalGoals';
import {
  TREATMENT_PLANS_STORAGE_KEY,
  TREATMENT_SELECTIONS_STORAGE_KEY,
  TREATMENT_EVIDENCE_LINKS_STORAGE_KEY,
  TREATMENT_CONDITION_LINKS_STORAGE_KEY,
  createEmptyTreatmentPlan,
  createEmptyTreatmentSelection,
  generateTreatmentEvidenceLinkId,
  generateTreatmentConditionLinkId,
} from '../utils/treatmentPlans';
import {
  CLINICAL_SESSIONS_STORAGE_KEY,
  SESSION_TREATMENT_DELIVERIES_STORAGE_KEY,
  generateClinicalSessionId,
  generateSessionTreatmentDeliveryId,
  getNextSessionNumber,
} from '../utils/clinicalSessions';
import {
  EVIDENCE_SOURCES_STORAGE_KEY,
  EVIDENCE_ITEMS_STORAGE_KEY,
  INITIAL_EVIDENCE_SOURCES,
  INITIAL_EVIDENCE_ITEMS,
} from '../utils/evidenceKnowledge';
import {
  CONDITION_PRESENTATIONS_STORAGE_KEY,
  CONDITION_EVIDENCE_LINKS_STORAGE_KEY,
  INITIAL_CONDITION_PRESENTATIONS,
  INITIAL_CONDITION_EVIDENCE_LINKS,
} from '../utils/conditionPathways';
import {
  OUTCOME_MEASURE_DEFINITIONS_STORAGE_KEY,
  PROGRESS_RECORDS_STORAGE_KEY,
  PROGRESS_MEASUREMENTS_STORAGE_KEY,
  INITIAL_OUTCOME_MEASURE_DEFINITIONS,
  generateProgressRecordId,
  generateProgressMeasurementId,
  generateOutcomeMeasureDefinitionId,
} from '../utils/clinicalProgress';
import {
  CASE_DISCHARGE_RECORDS_STORAGE_KEY,
  generateCaseDischargeRecordId,
} from '../utils/clinicalDischarge';
import {
  CLINICAL_INVESTIGATIONS_STORAGE_KEY,
  generateInvestigationId,
  sortInvestigationsChronological,
} from '../utils/clinicalInvestigations';

interface ClinicalContextType {
  patients: Patient[];
  cases: Case[];
  reviewsTodayCount: number;
  addPatient: (patientData: Omit<Patient, 'id' | 'createdAt' | 'patientNumber'>) => Patient;
  updatePatient: (patientId: string, updates: Partial<Patient>) => void;
  updatePatientSafetyProfile: (patientId: string, profile: PatientSafetyProfile) => void;
  verifyPatientSafetyItem: (
    patientId: string,
    itemType: 'allergy' | 'precaution' | 'surgery' | 'condition' | 'mobility',
    itemId: string,
    clinicianName: string,
    verificationNotes?: string
  ) => void;
  addCase: (caseData: {
    patientId: string;
    caseName: string;
    presentingProblem?: string;
    dateOfOnset?: string;
    referralSource?: string;
    startDate?: string;
    status?: CaseStatus;
  }) => Case;
  updateCase: (caseId: string, updates: Partial<Case>) => void;
  archiveCase: (caseId: string, reason: CaseArchiveReason, notes?: string) => void;
  unarchiveCase: (caseId: string) => void;
  getCasesForPatient: (patientId: string) => Case[];
  
  // Subjective Assessment
  subjectiveAssessments: SubjectiveAssessment[];
  getSubjectiveAssessment: (caseId: string) => SubjectiveAssessment | null;
  saveSubjectiveAssessment: (
    caseId: string,
    patientId: string,
    data: Partial<SubjectiveAssessment>,
    markCompleted?: boolean
  ) => SubjectiveAssessment;
  activeAssessmentCaseId: string | null;
  setActiveAssessmentCaseId: (caseId: string | null) => void;
  openSubjectiveAssessment: (caseId: string) => void;
  closeSubjectiveAssessment: () => void;

  // Clinical Threads
  clinicalThreads: ClinicalThread[];
  getClinicalThreadsForCase: (caseId: string) => ClinicalThread[];
  getClinicalThread: (threadId: string) => ClinicalThread | null;
  generateClinicalThreadsForCase: (assessment: SubjectiveAssessment) => ClinicalThread[];
  updateClinicalThreadStatus: (threadId: string, status: ClinicalThreadStatus) => void;
  updateClinicalThreadNotes: (threadId: string, notes: string) => void;

  // Objective Assessment (Stage 2)
  objectiveAssessments: ObjectiveAssessment[];
  getObjectiveAssessment: (caseId: string) => ObjectiveAssessment | null;
  saveObjectiveAssessment: (
    caseId: string,
    patientId: string,
    data: Partial<ObjectiveAssessment>,
    markCompleted?: boolean
  ) => ObjectiveAssessment;

  // Clinical Reasoning (Stage 3B: Findings → Problems)
  clinicalProblems: ClinicalProblem[];
  getClinicalProblemsForCase: (caseId: string) => ClinicalProblem[];
  saveClinicalProblem: (
    problemData: Partial<ClinicalProblem> & { caseId: string; patientId: string }
  ) => ClinicalProblem;
  updateClinicalProblemStatus: (problemId: string, status: ClinicalProblemStatus) => void;
  deleteClinicalProblem: (problemId: string) => void;

  // Goals & Functional Outcomes Foundation (Stage 4A: Problems → Goals)
  clinicalGoals: ClinicalGoal[];
  getClinicalGoalsForCase: (caseId: string) => ClinicalGoal[];
  saveClinicalGoal: (
    goalData: Partial<ClinicalGoal> & { caseId: string; patientId: string }
  ) => ClinicalGoal;
  updateClinicalGoalStatus: (goalId: string, status: ClinicalGoalStatus) => void;
  deleteClinicalGoal: (goalId: string) => void;

  // Treatment Plan Architecture (Stage 4B: Treatment Plan & Selections)
  treatmentPlans: TreatmentPlan[];
  treatmentSelections: TreatmentSelection[];
  getTreatmentPlansForCase: (caseId: string) => TreatmentPlan[];
  getTreatmentPlanById: (planId: string) => TreatmentPlan | undefined;
  saveTreatmentPlan: (
    planData: Partial<TreatmentPlan> & { caseId: string; patientId: string }
  ) => TreatmentPlan;
  updateTreatmentPlanStatus: (
    planId: string,
    status: TreatmentPlanStatus
  ) => void;
  deleteTreatmentPlan: (planId: string) => void;

  getTreatmentSelectionsForCase: (caseId: string) => TreatmentSelection[];
  getTreatmentSelectionsForPlan: (
    treatmentPlanId: string
  ) => TreatmentSelection[];
  saveTreatmentSelection: (
    selectionData: Partial<TreatmentSelection> & {
      caseId: string;
      patientId: string;
      title: string;
      interventionType?: TreatmentInterventionType;
      treatmentPlanId?: string;
    }
  ) => TreatmentSelection;
  updateTreatmentSelectionStatus: (
    selectionId: string,
    status: TreatmentSelectionStatus
  ) => void;
  deleteTreatmentSelection: (selectionId: string) => void;

  // Stage 4E: Treatment Evidence & Condition Links
  treatmentEvidenceLinks: TreatmentEvidenceLink[];
  treatmentConditionLinks: TreatmentConditionLink[];
  getEvidenceLinksForTreatment: (
    treatmentSelectionId: string
  ) => TreatmentEvidenceLink[];
  getConditionLinksForTreatment: (
    treatmentSelectionId: string
  ) => TreatmentConditionLink[];
  linkEvidenceToTreatment: (
    treatmentSelectionId: string,
    evidenceItemId: string,
    therapistNote?: string
  ) => TreatmentEvidenceLink;
  unlinkEvidenceFromTreatment: (linkId: string) => void;
  linkConditionToTreatment: (
    treatmentSelectionId: string,
    conditionPresentationId: string
  ) => TreatmentConditionLink;
  unlinkConditionFromTreatment: (linkId: string) => void;

  // Evidence Knowledge Layer (Stage 4C)
  evidenceSources: EvidenceSource[];
  evidenceItems: EvidenceItem[];
  getEvidenceSourceById: (sourceId: string) => EvidenceSource | undefined;
  getEvidenceItemsForSource: (sourceId: string) => EvidenceItem[];
  saveEvidenceSource: (
    sourceData: Partial<EvidenceSource> & {
      title: string;
      publicationYear: number;
      evidenceType: EvidenceType;
      status: EvidenceSourceStatus;
    }
  ) => EvidenceSource;
  updateEvidenceSourceStatus: (
    sourceId: string,
    status: EvidenceSourceStatus
  ) => void;
  deleteEvidenceSource: (sourceId: string) => void;
  saveEvidenceItem: (
    itemData: Partial<EvidenceItem> & {
      sourceId: string;
      title: string;
      summary: string;
    }
  ) => EvidenceItem;
  deleteEvidenceItem: (itemId: string) => void;

  // Condition / Presentation Pathways (Stage 4D)
  conditionPresentations: ConditionPresentation[];
  conditionEvidenceLinks: ConditionEvidenceLink[];
  getConditionPresentationById: (id: string) => ConditionPresentation | undefined;
  getLinksForCondition: (conditionId: string) => ConditionEvidenceLink[];
  getEvidenceItemsForCondition: (conditionId: string) => EvidenceItem[];
  getConditionsForEvidenceItem: (evidenceItemId: string) => ConditionPresentation[];
  saveConditionPresentation: (
    conditionData: Partial<ConditionPresentation> & {
      name: string;
      type: ConditionPresentationType;
      status?: ConditionPresentationStatus;
    }
  ) => ConditionPresentation;
  updateConditionStatus: (
    conditionId: string,
    status: ConditionPresentationStatus
  ) => void;
  deleteConditionPresentation: (conditionId: string) => void;
  linkEvidenceToCondition: (
    conditionId: string,
    evidenceItemId: string,
    relevanceNote?: string
  ) => ConditionEvidenceLink;
  unlinkEvidenceFromCondition: (linkId: string) => void;
  unlinkEvidenceItemFromAllConditions: (evidenceItemId: string) => void;

  // Stage 4F: Clinical Investigations Layer
  clinicalInvestigations: ClinicalInvestigation[];
  getClinicalInvestigationsForCase: (caseId: string) => ClinicalInvestigation[];
  getClinicalInvestigationById: (id: string) => ClinicalInvestigation | undefined;
  saveClinicalInvestigation: (
    investigationData: Partial<ClinicalInvestigation> & {
      caseId: string;
      name: string;
      category: InvestigationCategory;
      modality: RadiologicalModality;
      investigationDate: string;
      bodyRegion: string;
    }
  ) => ClinicalInvestigation;
  deleteClinicalInvestigation: (id: string) => void;

  // Stage 5: Clinical Sessions Foundation
  clinicalSessions: ClinicalSession[];
  sessionTreatmentDeliveries: SessionTreatmentDelivery[];
  getSessionsForCase: (caseId: string) => ClinicalSession[];
  getSessionById: (sessionId: string) => ClinicalSession | undefined;
  getDeliveriesForSession: (sessionId: string) => SessionTreatmentDelivery[];
  getDeliveriesForTreatmentSelection: (treatmentSelectionId: string) => SessionTreatmentDelivery[];
  saveClinicalSession: (sessionData: Partial<ClinicalSession> & {
    caseId: string;
    patientId: string;
  }) => ClinicalSession;
  updateClinicalSessionStatus: (sessionId: string, status: ClinicalSessionStatus) => void;
  deleteClinicalSession: (sessionId: string) => void;
  saveSessionTreatmentDelivery: (deliveryData: Partial<SessionTreatmentDelivery> & {
    sessionId: string;
    caseId: string;
    patientId: string;
    title: string;
  }) => SessionTreatmentDelivery;
  deleteSessionTreatmentDelivery: (deliveryId: string) => void;

  // Stage 6: Clinical Progress & Outcomes Foundation
  progressRecords: ProgressRecord[];
  progressMeasurements: ProgressMeasurement[];
  outcomeMeasureDefinitions: OutcomeMeasureDefinition[];
  getProgressRecordsForCase: (caseId: string) => ProgressRecord[];
  getProgressRecordById: (recordId: string) => ProgressRecord | undefined;
  getMeasurementsForRecord: (recordId: string) => ProgressMeasurement[];
  getMeasurementsForCase: (caseId: string) => ProgressMeasurement[];
  getMeasurementsByMeasureName: (caseId: string, measureName: string) => ProgressMeasurement[];
  saveProgressRecord: (recordData: Partial<ProgressRecord> & {
    caseId: string;
    patientId: string;
    therapistSummary: string;
  }) => ProgressRecord;
  deleteProgressRecord: (recordId: string) => void;
  saveProgressMeasurement: (measurementData: Partial<ProgressMeasurement> & {
    progressRecordId: string;
    caseId: string;
    patientId: string;
    measureName: string;
    category: string;
    valueType: ProgressMeasurement['valueType'];
    stage: ProgressMeasurement['stage'];
  }) => ProgressMeasurement;
  deleteProgressMeasurement: (measurementId: string) => void;
  saveOutcomeMeasureDefinition: (definitionData: Partial<OutcomeMeasureDefinition> & {
    name: string;
    category: OutcomeMeasureDefinition['category'];
    valueType: OutcomeMeasureDefinition['valueType'];
    directionMeaning: OutcomeMeasureDefinition['directionMeaning'];
  }) => OutcomeMeasureDefinition;

  // Stage 7: Case Discharge & Clinical Summary Foundation
  caseDischargeRecords: CaseDischargeRecord[];
  getDischargeRecordForCase: (caseId: string) => CaseDischargeRecord | undefined;
  saveCaseDischargeRecord: (dischargeData: Partial<CaseDischargeRecord> & {
    caseId: string;
    patientId: string;
    dischargeReason: DischargeReason;
    episodeSummary: string;
    clinicalStatusAtDischarge: string;
  }) => CaseDischargeRecord;
  deleteCaseDischargeRecord: (dischargeId: string) => void;
  reopenCase: (caseId: string) => void;

  // Navigation & selection
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;

  // Modals
  isAddPatientModalOpen: boolean;
  setIsAddPatientModalOpen: (open: boolean) => void;
  isCreateCaseModalOpen: boolean;
  setIsCreateCaseModalOpen: (open: boolean) => void;
  activePatientForNewCase: Patient | null;
  openNewCaseModal: (patient: Patient) => void;
  isEditPatientModalOpen: boolean;
  setIsEditPatientModalOpen: (open: boolean) => void;
  activePatientForEdit: Patient | null;
  openEditPatientModal: (patient: Patient) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // Stage 12: Local-First Workspace Backup & Disaster Recovery Boundary
  getAuthoritativeWorkspaceDataset: () => AuthoritativeWorkspaceDataset;
  restoreWorkspaceDataset: (newDataset: AuthoritativeWorkspaceDataset) => void;

  // Stage 13: Clinical Audit, Finalization & Amendments
  auditEvents: ClinicalAuditEvent[];
  finalizeSubjectiveAssessment: (caseId: string) => void;
  finalizeObjectiveAssessment: (caseId: string) => void;
  finalizeClinicalSession: (sessionId: string) => void;
  finalizeCaseDischargeRecord: (dischargeId: string) => void;
  addSubjectiveAssessmentAmendment: (
    caseId: string,
    reason: 'correction' | 'late_entry' | 'clinical_update',
    text: string
  ) => void;
  addObjectiveAssessmentAmendment: (
    caseId: string,
    reason: 'correction' | 'late_entry' | 'clinical_update',
    text: string
  ) => void;
  addClinicalSessionAmendment: (
    sessionId: string,
    reason: 'correction' | 'late_entry' | 'clinical_update',
    text: string
  ) => void;
  addCaseDischargeRecordAmendment: (
    dischargeId: string,
    reason: 'correction' | 'late_entry' | 'clinical_update',
    text: string
  ) => void;
  pruneAuditLog: (olderThanDate: string, archiveChecksum: string) => number;
  auditStorageWarning?: string | null;
  auditRetryQueue?: ClinicalAuditEvent[];
}

const PATIENTS_STORAGE_KEY = 'physiocase_workspace_patients';
const CASES_STORAGE_KEY = 'physiocase_workspace_cases';
const SETTINGS_STORAGE_KEY = 'physiocase_workspace_settings';
const SUBJECTIVE_ASSESSMENTS_STORAGE_KEY = 'physiocase_workspace_subjective_assessments';
const CLINICAL_THREADS_STORAGE_KEY = 'physiocase_workspace_clinical_threads';
const AUDIT_EVENTS_STORAGE_KEY = 'physiocase_workspace_audit_events';

const defaultSettings: AppSettings = {
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
};

export const ClinicalContext = createContext<ClinicalContextType | undefined>(undefined);

export const ClinicalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with saved patients or empty state, ensuring patientNumber is backfilled safely
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem(PATIENTS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: Patient[] = JSON.parse(saved);
      let counter = 1;
      return parsed.map((p) => {
        if (!p.patientNumber) {
          const patientNumber = `PC-${String(counter++).padStart(4, '0')}`;
          return { ...p, patientNumber };
        }
        return p;
      });
    } catch {
      return [];
    }
  });

  const [cases, setCases] = useState<Case[]>(() => {
    try {
      const saved = localStorage.getItem(CASES_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      let counter = 1;
      return parsed.map((c: any) => {
        const caseId = c.caseId || `CASE-${String(counter++).padStart(4, '0')}`;
        const caseName = c.caseName || c.title || 'Rehabilitation Case';
        const status: CaseStatus =
          c.status ||
          (c.stage
            ? ((c.stage.charAt(0).toUpperCase() + c.stage.slice(1)) as CaseStatus)
            : 'Assessment');
        const startDate =
          c.startDate ||
          (c.createdAt ? c.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
        return {
          ...c,
          caseId,
          caseName,
          status,
          startDate,
          title: caseName,
        };
      });
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [subjectiveAssessments, setSubjectiveAssessments] = useState<SubjectiveAssessment[]>(() => {
    try {
      const saved = localStorage.getItem(SUBJECTIVE_ASSESSMENTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [clinicalThreads, setClinicalThreads] = useState<ClinicalThread[]>(() => {
    try {
      const saved = localStorage.getItem(CLINICAL_THREADS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [objectiveAssessments, setObjectiveAssessments] = useState<ObjectiveAssessment[]>(() => {
    try {
      const saved = localStorage.getItem(OBJECTIVE_ASSESSMENTS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ObjectiveAssessment[] = JSON.parse(saved);
      return parsed.map((oa) => ({
        ...oa,
        findings: (oa.findings || []).map((f, idx) => ({
          ...f,
          id: f.id || `f_${oa.id || 'oa'}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        })),
      }));
    } catch {
      return [];
    }
  });

  const [clinicalProblems, setClinicalProblems] = useState<ClinicalProblem[]>(() => {
    try {
      const saved = localStorage.getItem(CLINICAL_PROBLEMS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ClinicalProblem[] = JSON.parse(saved);
      return parsed.map((cp, idx) => ({
        ...cp,
        id: cp.id || `prob_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        linkedFindingIds: Array.from(new Set(cp.linkedFindingIds || [])),
      }));
    } catch {
      return [];
    }
  });

  const [clinicalGoals, setClinicalGoals] = useState<ClinicalGoal[]>(() => {
    try {
      const saved = localStorage.getItem(CLINICAL_GOALS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ClinicalGoal[] = JSON.parse(saved);
      return parsed.map((cg, idx) => ({
        ...cg,
        id: cg.id || `goal_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        linkedProblemIds: Array.from(new Set(cg.linkedProblemIds || [])),
      }));
    } catch {
      return [];
    }
  });

  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>(() => {
    try {
      const saved = localStorage.getItem(TREATMENT_PLANS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: TreatmentPlan[] = JSON.parse(saved);
      return parsed.map((tp, idx) => ({
        ...tp,
        id: tp.id || `plan_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      }));
    } catch {
      return [];
    }
  });

  const [treatmentSelections, setTreatmentSelections] = useState<TreatmentSelection[]>(() => {
    try {
      const saved = localStorage.getItem(TREATMENT_SELECTIONS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: TreatmentSelection[] = JSON.parse(saved);
      return parsed.map((ts, idx) => ({
        ...ts,
        id: ts.id || `tx_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        interventionType: ts.interventionType || (ts.category === 'exercise' ? 'therapeutic_exercise' : ts.category === 'manual_therapy' ? 'manual_therapy' : ts.category === 'education' ? 'education' : ts.category === 'activity_modification' ? 'activity_modification' : ts.category === 'functional_training' ? 'functional_training' : ts.category === 'neuromuscular_training' ? 'neuromuscular_training' : ts.category === 'aerobic_conditioning' ? 'cardiorespiratory_training' : 'other'),
        interventionDescription: ts.interventionDescription || ts.description || '',
        clinicalProblemId: ts.clinicalProblemId || (ts.linkedProblemIds && ts.linkedProblemIds[0]) || '',
        linkedProblemIds: Array.from(new Set(ts.linkedProblemIds || [])),
        goalId: ts.goalId || (ts.linkedGoalIds && ts.linkedGoalIds[0]) || '',
        linkedGoalIds: Array.from(new Set(ts.linkedGoalIds || [])),
        clinicalRationale: ts.clinicalRationale || ts.therapistRationale || '',
      }));
    } catch {
      return [];
    }
  });

  const [treatmentEvidenceLinks, setTreatmentEvidenceLinks] = useState<TreatmentEvidenceLink[]>(() => {
    try {
      const saved = localStorage.getItem(TREATMENT_EVIDENCE_LINKS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: TreatmentEvidenceLink[] = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.map((link, idx) => ({
            ...link,
            id: link.id || `tx_ev_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          }))
        : [];
    } catch {
      return [];
    }
  });

  const [treatmentConditionLinks, setTreatmentConditionLinks] = useState<TreatmentConditionLink[]>(() => {
    try {
      const saved = localStorage.getItem(TREATMENT_CONDITION_LINKS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: TreatmentConditionLink[] = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.map((link, idx) => ({
            ...link,
            id: link.id || `tx_cond_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          }))
        : [];
    } catch {
      return [];
    }
  });

  const [evidenceSources, setEvidenceSources] = useState<EvidenceSource[]>(() => {
    try {
      const saved = localStorage.getItem(EVIDENCE_SOURCES_STORAGE_KEY);
      if (!saved) return INITIAL_EVIDENCE_SOURCES;
      const parsed: EvidenceSource[] = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_EVIDENCE_SOURCES;
      return parsed.map((s, idx) => ({
        ...s,
        id: s.id || `src_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        authors: Array.isArray(s.authors) ? s.authors : [],
      }));
    } catch {
      return INITIAL_EVIDENCE_SOURCES;
    }
  });

  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(() => {
    try {
      const saved = localStorage.getItem(EVIDENCE_ITEMS_STORAGE_KEY);
      if (!saved) return INITIAL_EVIDENCE_ITEMS;
      const parsed: EvidenceItem[] = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_EVIDENCE_ITEMS;
      return parsed.map((item, idx) => ({
        ...item,
        id: item.id || `item_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      }));
    } catch {
      return INITIAL_EVIDENCE_ITEMS;
    }
  });

  // Condition / Presentation Pathways (Stage 4D)
  const [conditionPresentations, setConditionPresentations] = useState<ConditionPresentation[]>(() => {
    try {
      const saved = localStorage.getItem(CONDITION_PRESENTATIONS_STORAGE_KEY);
      if (!saved) return INITIAL_CONDITION_PRESENTATIONS;
      const parsed: ConditionPresentation[] = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_CONDITION_PRESENTATIONS;
      return parsed.map((cp, idx) => ({
        ...cp,
        id: cp.id || `cond_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        commonTerms: Array.isArray(cp.commonTerms) ? cp.commonTerms : [],
      }));
    } catch {
      return INITIAL_CONDITION_PRESENTATIONS;
    }
  });

  const [conditionEvidenceLinks, setConditionEvidenceLinks] = useState<ConditionEvidenceLink[]>(() => {
    try {
      const saved = localStorage.getItem(CONDITION_EVIDENCE_LINKS_STORAGE_KEY);
      if (!saved) return INITIAL_CONDITION_EVIDENCE_LINKS;
      const parsed: ConditionEvidenceLink[] = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_CONDITION_EVIDENCE_LINKS;
      return parsed.map((link, idx) => ({
        ...link,
        id: link.id || `link_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      }));
    } catch {
      return INITIAL_CONDITION_EVIDENCE_LINKS;
    }
  });

  // Stage 4F: Clinical Investigations State
  const [clinicalInvestigations, setClinicalInvestigations] = useState<ClinicalInvestigation[]>(() => {
    try {
      const saved = localStorage.getItem(CLINICAL_INVESTIGATIONS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ClinicalInvestigation[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Stage 5: Clinical Sessions & Deliveries State
  const [clinicalSessions, setClinicalSessions] = useState<ClinicalSession[]>(() => {
    try {
      const saved = localStorage.getItem(CLINICAL_SESSIONS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ClinicalSession[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [sessionTreatmentDeliveries, setSessionTreatmentDeliveries] = useState<SessionTreatmentDelivery[]>(() => {
    try {
      const saved = localStorage.getItem(SESSION_TREATMENT_DELIVERIES_STORAGE_KEY);
      if (!saved) return [];
      const parsed: SessionTreatmentDelivery[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Stage 6: Clinical Progress & Outcomes State
  const [outcomeMeasureDefinitions, setOutcomeMeasureDefinitions] = useState<OutcomeMeasureDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(OUTCOME_MEASURE_DEFINITIONS_STORAGE_KEY);
      if (!saved) return INITIAL_OUTCOME_MEASURE_DEFINITIONS;
      const parsed: OutcomeMeasureDefinition[] = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_OUTCOME_MEASURE_DEFINITIONS;
    } catch {
      return INITIAL_OUTCOME_MEASURE_DEFINITIONS;
    }
  });

  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_RECORDS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ProgressRecord[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [progressMeasurements, setProgressMeasurements] = useState<ProgressMeasurement[]>(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_MEASUREMENTS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ProgressMeasurement[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Stage 7: Case Discharge & Clinical Summary State
  const [caseDischargeRecords, setCaseDischargeRecords] = useState<CaseDischargeRecord[]>(() => {
    try {
      const saved = localStorage.getItem(CASE_DISCHARGE_RECORDS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: CaseDischargeRecord[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Stage 13: Append-Only Clinical Audit Ledger State
  const [auditEvents, setAuditEvents] = useState<ClinicalAuditEvent[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_EVENTS_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ClinicalAuditEvent[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [auditStorageWarning, setAuditStorageWarning] = useState<string | null>(null);

  // Navigation states for deep clinical drill-down
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeAssessmentCaseId, setActiveAssessmentCaseId] = useState<string | null>(null);

  // Modal states
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [activePatientForNewCase, setActivePatientForNewCase] = useState<Patient | null>(null);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [activePatientForEdit, setActivePatientForEdit] = useState<Patient | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
    } catch (e) {
      console.error('Failed to save patients:', e);
    }
  }, [patients]);

  useEffect(() => {
    try {
      localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(cases));
    } catch (e) {
      console.error('Failed to save cases:', e);
    }
  }, [cases]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SUBJECTIVE_ASSESSMENTS_STORAGE_KEY,
        JSON.stringify(subjectiveAssessments)
      );
    } catch (e) {
      console.error('Failed to save subjective assessments:', e);
    }
  }, [subjectiveAssessments]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLINICAL_THREADS_STORAGE_KEY,
        JSON.stringify(clinicalThreads)
      );
    } catch (e) {
      console.error('Failed to save clinical threads:', e);
    }
  }, [clinicalThreads]);

  useEffect(() => {
    try {
      localStorage.setItem(
        OBJECTIVE_ASSESSMENTS_STORAGE_KEY,
        JSON.stringify(objectiveAssessments)
      );
    } catch (e) {
      console.error('Failed to save objective assessments:', e);
    }
  }, [objectiveAssessments]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLINICAL_PROBLEMS_STORAGE_KEY,
        JSON.stringify(clinicalProblems)
      );
    } catch (e) {
      console.error('Failed to save clinical problems:', e);
    }
  }, [clinicalProblems]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLINICAL_GOALS_STORAGE_KEY,
        JSON.stringify(clinicalGoals)
      );
    } catch (e) {
      console.error('Failed to save clinical goals:', e);
    }
  }, [clinicalGoals]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TREATMENT_PLANS_STORAGE_KEY,
        JSON.stringify(treatmentPlans)
      );
    } catch (e) {
      console.error('Failed to save treatment plans:', e);
    }
  }, [treatmentPlans]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TREATMENT_SELECTIONS_STORAGE_KEY,
        JSON.stringify(treatmentSelections)
      );
    } catch (e) {
      console.error('Failed to save treatment selections:', e);
    }
  }, [treatmentSelections]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TREATMENT_EVIDENCE_LINKS_STORAGE_KEY,
        JSON.stringify(treatmentEvidenceLinks)
      );
    } catch (e) {
      console.error('Failed to save treatment evidence links:', e);
    }
  }, [treatmentEvidenceLinks]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TREATMENT_CONDITION_LINKS_STORAGE_KEY,
        JSON.stringify(treatmentConditionLinks)
      );
    } catch (e) {
      console.error('Failed to save treatment condition links:', e);
    }
  }, [treatmentConditionLinks]);

  useEffect(() => {
    try {
      localStorage.setItem(
        EVIDENCE_SOURCES_STORAGE_KEY,
        JSON.stringify(evidenceSources)
      );
    } catch (e) {
      console.error('Failed to save evidence sources:', e);
    }
  }, [evidenceSources]);

  useEffect(() => {
    try {
      localStorage.setItem(
        EVIDENCE_ITEMS_STORAGE_KEY,
        JSON.stringify(evidenceItems)
      );
    } catch (e) {
      console.error('Failed to save evidence items:', e);
    }
  }, [evidenceItems]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CONDITION_PRESENTATIONS_STORAGE_KEY,
        JSON.stringify(conditionPresentations)
      );
    } catch (e) {
      console.error('Failed to save condition presentations:', e);
    }
  }, [conditionPresentations]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CONDITION_EVIDENCE_LINKS_STORAGE_KEY,
        JSON.stringify(conditionEvidenceLinks)
      );
    } catch (e) {
      console.error('Failed to save condition evidence links:', e);
    }
  }, [conditionEvidenceLinks]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  // Stage 5: Sync Clinical Sessions & Deliveries to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        CLINICAL_SESSIONS_STORAGE_KEY,
        JSON.stringify(clinicalSessions)
      );
    } catch (e) {
      console.error('Failed to save clinical sessions:', e);
    }
  }, [clinicalSessions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SESSION_TREATMENT_DELIVERIES_STORAGE_KEY,
        JSON.stringify(sessionTreatmentDeliveries)
      );
    } catch (e) {
      console.error('Failed to save session treatment deliveries:', e);
    }
  }, [sessionTreatmentDeliveries]);

  // Stage 6: Sync Clinical Progress & Outcomes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        OUTCOME_MEASURE_DEFINITIONS_STORAGE_KEY,
        JSON.stringify(outcomeMeasureDefinitions)
      );
    } catch (e) {
      console.error('Failed to save outcome measure definitions:', e);
    }
  }, [outcomeMeasureDefinitions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_RECORDS_STORAGE_KEY,
        JSON.stringify(progressRecords)
      );
    } catch (e) {
      console.error('Failed to save progress records:', e);
    }
  }, [progressRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_MEASUREMENTS_STORAGE_KEY,
        JSON.stringify(progressMeasurements)
      );
    } catch (e) {
      console.error('Failed to save progress measurements:', e);
    }
  }, [progressMeasurements]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CASE_DISCHARGE_RECORDS_STORAGE_KEY,
        JSON.stringify(caseDischargeRecords)
      );
    } catch (e) {
      console.error('Failed to save case discharge records:', e);
    }
  }, [caseDischargeRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CLINICAL_INVESTIGATIONS_STORAGE_KEY,
        JSON.stringify(clinicalInvestigations)
      );
    } catch (e) {
      console.error('Failed to save clinical investigations:', e);
    }
  }, [clinicalInvestigations]);

  // Stage 13: Persistent Audit Events sync with Transient Retry Queue & Warning
  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_EVENTS_STORAGE_KEY, JSON.stringify(auditEvents));
      if (globalAuditRetryQueue.length > 0) {
        globalAuditRetryQueue.clear();
      }
      if (auditStorageWarning) {
        setAuditStorageWarning(null);
      }
    } catch (e: any) {
      console.error('Failed to save audit events to localStorage:', e);
      if (auditEvents.length > 0) {
        const lastEv = auditEvents[auditEvents.length - 1];
        globalAuditRetryQueue.enqueue(lastEv);
      }
      setAuditStorageWarning(
        `Audit storage warning: localStorage write failed (${e?.message || 'Storage quota exceeded'}). ${globalAuditRetryQueue.length} event(s) held in transient retry queue.`
      );
    }
  }, [auditEvents]);

  // Stage 13: Actor Resolution & Append-Only Audit Event Dispatcher
  const getCurrentActor = useCallback((): AuditActor => {
    let currentUser: User | null = null;
    try {
      const sessionStr = localStorage.getItem('physiocase_session_user');
      if (sessionStr) {
        currentUser = JSON.parse(sessionStr);
      }
    } catch {
      // fallback
    }
    return resolveAuditActor(currentUser, settings.practitionerName);
  }, [settings.practitionerName]);

  const appendAuditEvent = useCallback(
    (
      action: AuditActionType,
      entityType: AuditableEntityType,
      entityId: string,
      patientId?: string,
      caseId?: string,
      changedFields?: string[],
      reason?: string,
      metadata?: Record<string, string | number | boolean>
    ) => {
      const actor = getCurrentActor();
      const now = new Date().toISOString();
      setAuditEvents((prev) => {
        const nextSeq = getNextSequence(prev);
        const newEvent: ClinicalAuditEvent = {
          id: generateAuditId(nextSeq),
          sequence: nextSeq,
          occurredAt: now,
          actor,
          action,
          entityType,
          entityId,
          patientId,
          caseId,
          changedFields,
          reason,
          metadata,
        };
        return [...prev, newEvent];
      });
    },
    [getCurrentActor]
  );

  // Compute next PC-XXXX number
  const getNextPatientNumber = useCallback((currentPatients: Patient[]): string => {
    let maxNum = 0;
    for (const p of currentPatients) {
      if (p.patientNumber) {
        const match = p.patientNumber.match(/PC-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    }
    return `PC-${String(maxNum + 1).padStart(4, '0')}`;
  }, []);

  // Compute next CASE-XXXX number
  const getNextCaseNumber = useCallback((currentCases: Case[]): string => {
    let maxNum = 0;
    for (const c of currentCases) {
      const idToTest = c.caseId || c.id;
      const match = idToTest.match(/CASE-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `CASE-${String(maxNum + 1).padStart(4, '0')}`;
  }, []);

  const addPatient = (patientData: Omit<Patient, 'id' | 'createdAt' | 'patientNumber'>): Patient => {
    const patientNumber = getNextPatientNumber(patients);
    const newPatient: Patient = {
      ...patientData,
      id: 'pt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      patientNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPatients((prev) => [newPatient, ...prev]);
    appendAuditEvent('CREATE', 'patient', newPatient.id, newPatient.id);
    return newPatient;
  };

  const updatePatient = (patientId: string, updates: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
    appendAuditEvent('UPDATE', 'patient', patientId, patientId, undefined, Object.keys(updates));
  };

  const updatePatientSafetyProfile = (patientId: string, profile: PatientSafetyProfile) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              patientSafetyProfile: {
                ...profile,
                lastReviewedAt: profile.lastReviewedAt || new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
    appendAuditEvent('UPDATE', 'patient_safety_profile', patientId, patientId, undefined, ['patientSafetyProfile']);
  };

  const verifyPatientSafetyItem = (
    patientId: string,
    itemType: 'allergy' | 'precaution' | 'surgery' | 'condition' | 'mobility',
    itemId: string,
    clinicianName: string,
    verificationNotes?: string
  ) => {
    const now = new Date().toISOString();
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId || !p.patientSafetyProfile) return p;
        const profile = { ...p.patientSafetyProfile };

        if (itemType === 'allergy') {
          profile.allergies = (profile.allergies || []).map((a) =>
            a.id === itemId
              ? {
                  ...a,
                  verificationStatus: 'verified' as const,
                  verifiedAt: now,
                  verifiedBy: clinicianName,
                  ...(verificationNotes ? { verificationNotes } : {}),
                }
              : a
          );
        } else if (itemType === 'precaution') {
          profile.persistentPrecautions = (profile.persistentPrecautions || []).map((pr) =>
            pr.id === itemId
              ? {
                  ...pr,
                  verificationStatus: 'verified' as const,
                  verifiedAt: now,
                  verifiedBy: clinicianName,
                  ...(verificationNotes ? { verificationNotes } : {}),
                }
              : pr
          );
        } else if (itemType === 'surgery') {
          profile.surgicalHistory = (profile.surgicalHistory || []).map((s) =>
            s.id === itemId
              ? {
                  ...s,
                  verificationStatus: 'verified' as const,
                  verifiedAt: now,
                  verifiedBy: clinicianName,
                  ...(verificationNotes ? { verificationNotes } : {}),
                }
              : s
          );
        } else if (itemType === 'condition') {
          profile.persistentMedicalConditions = (profile.persistentMedicalConditions || []).map((c) =>
            c.id === itemId
              ? {
                  ...c,
                  verificationStatus: 'verified' as const,
                  verifiedAt: now,
                  verifiedBy: clinicianName,
                  ...(verificationNotes ? { verificationNotes } : {}),
                }
              : c
          );
        } else if (itemType === 'mobility' && profile.enduringMobilityContext) {
          profile.enduringMobilityContext = {
            ...profile.enduringMobilityContext,
            verificationStatus: 'verified' as const,
            verifiedAt: now,
            verifiedBy: clinicianName,
            ...(verificationNotes ? { verificationNotes } : {}),
          };
        }

        profile.lastReviewedAt = now;
        profile.lastReviewedBy = clinicianName;

        return {
          ...p,
          patientSafetyProfile: profile,
          updatedAt: now,
        };
      })
    );
  };

  const addCase = (caseData: {
    patientId: string;
    caseName: string;
    presentingProblem?: string;
    dateOfOnset?: string;
    referralSource?: string;
    startDate?: string;
    status?: CaseStatus;
  }): Case => {
    const generatedCaseId = getNextCaseNumber(cases);
    const now = new Date().toISOString();
    const todayDate = new Date().toISOString().split('T')[0];

    const newCase: Case = {
      id: 'case_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      caseId: generatedCaseId,
      patientId: caseData.patientId,
      caseName: caseData.caseName.trim(),
      presentingProblem: caseData.presentingProblem?.trim() || undefined,
      dateOfOnset: caseData.dateOfOnset?.trim() || undefined,
      referralSource: caseData.referralSource?.trim() || undefined,
      startDate: caseData.startDate?.trim() || todayDate,
      status: caseData.status || 'Assessment',
      createdAt: now,
      updatedAt: now,
      // Compatibility aliases
      title: caseData.caseName.trim(),
      stage: 'assessment',
    };

    setCases((prev) => [newCase, ...prev]);
    appendAuditEvent('CREATE', 'case', newCase.id, newCase.patientId, newCase.id);
    return newCase;
  };

  const assertCaseNotArchived = useCallback(
    (caseId: string, operationLabel: string) => {
      const targetCase = cases.find((c) => c.id === caseId || c.caseId === caseId);
      if (targetCase?.isArchived) {
        throw new Error(
          `Cannot ${operationLabel}: Case "${targetCase.caseId || caseId}" is archived and read-only.`
        );
      }
    },
    [cases]
  );

  const archiveCase = useCallback(
    (caseId: string, reason: CaseArchiveReason, notes?: string) => {
      const targetCase = cases.find((c) => c.id === caseId || c.caseId === caseId);
      if (!targetCase) {
        throw new Error(`Cannot archive case: Case "${caseId}" not found.`);
      }
      if (targetCase.isArchived) {
        throw new Error(`Cannot archive case: Case "${targetCase.caseId || caseId}" is already archived.`);
      }

      const footprintDataset: CaseFootprintDataset = {
        clinicalSessions,
        sessionTreatmentDeliveries,
        progressRecords,
        progressMeasurements,
        caseDischargeRecords,
        subjectiveAssessments,
        objectiveAssessments,
        clinicalProblems,
        clinicalGoals,
        treatmentPlans,
        treatmentSelections,
        clinicalInvestigations,
      };

      const check = canArchiveCase(targetCase, footprintDataset, reason, notes);
      if (!check.allowed) {
        throw new Error(`Cannot archive case: ${check.reason}`);
      }

      const actor = getCurrentActor();
      const now = new Date().toISOString();
      let updatedCase: Case | undefined;

      setCases((prev) =>
        prev.map((c) => {
          if (c.id === targetCase.id) {
            updatedCase = {
              ...c,
              isArchived: true,
              archivedAt: now,
              archivedBy: actor,
              archiveReason: reason,
              archiveNotes: notes?.trim() || undefined,
              updatedAt: now,
            };
            return updatedCase;
          }
          return c;
        })
      );

      appendAuditEvent(
        'SOFT_DELETE',
        'case',
        targetCase.id,
        targetCase.patientId,
        targetCase.id,
        ['isArchived', 'archivedAt', 'archivedBy', 'archiveReason', 'archiveNotes'],
        reason,
        {
          displayCaseId: targetCase.caseId,
          caseStatus: targetCase.status,
          isPreClinical: check.footprint.isPreClinical,
          archiveReason: reason,
        }
      );
    },
    [
      cases,
      clinicalSessions,
      sessionTreatmentDeliveries,
      progressRecords,
      progressMeasurements,
      caseDischargeRecords,
      subjectiveAssessments,
      objectiveAssessments,
      clinicalProblems,
      clinicalGoals,
      treatmentPlans,
      treatmentSelections,
      clinicalInvestigations,
      getCurrentActor,
      appendAuditEvent,
    ]
  );

  const unarchiveCase = useCallback(
    (caseId: string) => {
      const targetCase = cases.find((c) => c.id === caseId || c.caseId === caseId);
      if (!targetCase) {
        throw new Error(`Cannot unarchive case: Case "${caseId}" not found.`);
      }
      if (!targetCase.isArchived) {
        throw new Error(`Cannot unarchive case: Case "${targetCase.caseId || caseId}" is not archived.`);
      }

      const now = new Date().toISOString();
      let updatedCase: Case | undefined;

      setCases((prev) =>
        prev.map((c) => {
          if (c.id === targetCase.id) {
            updatedCase = {
              ...c,
              isArchived: false,
              archivedAt: undefined,
              archivedBy: undefined,
              archiveReason: undefined,
              archiveNotes: undefined,
              updatedAt: now,
            };
            return updatedCase;
          }
          return c;
        })
      );

      appendAuditEvent(
        'UPDATE',
        'case',
        targetCase.id,
        targetCase.patientId,
        targetCase.id,
        ['isArchived', 'archivedAt', 'archivedBy', 'archiveReason', 'archiveNotes'],
        'Case unarchived by clinician',
        {
          displayCaseId: targetCase.caseId,
          caseStatus: targetCase.status,
          previousArchiveReason: targetCase.archiveReason || 'unknown',
          previousArchivedAt: targetCase.archivedAt || 'unknown',
        }
      );
    },
    [cases, appendAuditEvent]
  );

  const updateCase = (caseId: string, updates: Partial<Case>) => {
    assertCaseNotArchived(caseId, 'update case');
    let targetCase: Case | undefined;
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId || c.caseId === caseId) {
          targetCase = { ...c, ...updates, updatedAt: new Date().toISOString() };
          return targetCase;
        }
        return c;
      })
    );
    appendAuditEvent(
      'UPDATE',
      'case',
      targetCase?.id || caseId,
      targetCase?.patientId,
      targetCase?.id || caseId,
      Object.keys(updates)
    );
  };

  const getCasesForPatient = useCallback(
    (patientId: string): Case[] => {
      return cases.filter((c) => c.patientId === patientId);
    },
    [cases]
  );

  const getSubjectiveAssessment = useCallback(
    (caseId: string): SubjectiveAssessment | null => {
      const found = subjectiveAssessments.find((a) => a.caseId === caseId);
      return found || null;
    },
    [subjectiveAssessments]
  );

  const generateClinicalThreadsForCase = useCallback(
    (assessment: SubjectiveAssessment): ClinicalThread[] => {
      const candidates = generateCandidateThreads(assessment);
      let updatedForThisCase: ClinicalThread[] = [];

      setClinicalThreads((prev) => {
        const otherThreads = prev.filter((t) => t.caseId !== assessment.caseId);
        const existingForCase = prev.filter((t) => t.caseId === assessment.caseId);
        updatedForThisCase = reconcileClinicalThreads(
          existingForCase,
          candidates,
          assessment.caseId
        );
        return [...otherThreads, ...updatedForThisCase];
      });

      return updatedForThisCase;
    },
    []
  );

  const getClinicalThreadsForCase = useCallback(
    (caseId: string): ClinicalThread[] => {
      return clinicalThreads.filter((t) => t.caseId === caseId);
    },
    [clinicalThreads]
  );

  const getClinicalThread = useCallback(
    (threadId: string): ClinicalThread | null => {
      return clinicalThreads.find((t) => t.id === threadId) || null;
    },
    [clinicalThreads]
  );

  const updateClinicalThreadStatus = useCallback(
    (threadId: string, status: ClinicalThreadStatus) => {
      const now = new Date().toISOString();
      setClinicalThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, status, updatedAt: now } : t))
      );
    },
    []
  );

  const updateClinicalThreadNotes = useCallback(
    (threadId: string, notes: string) => {
      const now = new Date().toISOString();
      setClinicalThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, therapistNotes: notes, updatedAt: now } : t
        )
      );
    },
    []
  );

  const saveSubjectiveAssessment = useCallback(
    (
      caseId: string,
      patientId: string,
      data: Partial<SubjectiveAssessment>,
      markCompleted: boolean = false
    ): SubjectiveAssessment => {
      assertCaseNotArchived(caseId, 'save Subjective Assessment');
      const now = new Date().toISOString();
      let resultRecord: SubjectiveAssessment;

      let isUpdate = false;
      setSubjectiveAssessments((prev) => {
        const existingIndex = prev.findIndex((a) => a.caseId === caseId);
        if (existingIndex >= 0) {
          isUpdate = true;
          const existing = prev[existingIndex];
          if (existing.isFinalized) {
            throw new Error(
              'Cannot directly modify finalized Subjective Assessment. Use addSubjectiveAssessmentAmendment instead.'
            );
          }
          const newStatus = markCompleted
            ? 'completed'
            : existing.status === 'completed'
            ? 'completed'
            : 'in_progress';

          resultRecord = {
            ...existing,
            ...data,
            caseId,
            patientId,
            status: newStatus,
            updatedAt: now,
            completedAt: markCompleted ? now : existing.completedAt,
          };
          const next = [...prev];
          next[existingIndex] = resultRecord;
          return next;
        } else {
          isUpdate = false;
          resultRecord = {
            id: 'subj_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            caseId,
            patientId,
            status: markCompleted ? 'completed' : 'in_progress',
            createdAt: now,
            updatedAt: now,
            completedAt: markCompleted ? now : undefined,
            patientStory: data.patientStory ?? '',
            symptomLocations: data.symptomLocations ?? [],
            symptomDescriptions: data.symptomDescriptions ?? [],
            symptomDescriptionOther: data.symptomDescriptionOther ?? '',
            onset: data.onset ?? '',
            dateOfOnset: data.dateOfOnset ?? '',
            howDidItStart: data.howDidItStart ?? '',
            aggravatingFactors: data.aggravatingFactors ?? [],
            aggravatingFactorsNotes: data.aggravatingFactorsNotes ?? '',
            easingFactors: data.easingFactors ?? [],
            easingFactorsNotes: data.easingFactorsNotes ?? '',
            frequency: data.frequency ?? '',
            painSeverity: data.painSeverity ?? { current: 0, best: 0, worst: 0 },
            durationAfterAggravation: data.durationAfterAggravation ?? '',
            functionalDifficulties: data.functionalDifficulties ?? [],
            functionalDifficultiesNotes: data.functionalDifficultiesNotes ?? '',
            mostImportantActivity: data.mostImportantActivity ?? '',
            previousSimilarEpisode: data.previousSimilarEpisode ?? '',
            previousSurgery: data.previousSurgery ?? '',
            previousInjury: data.previousInjury ?? '',
            currentMedication: data.currentMedication ?? '',
            relevantConditions: data.relevantConditions ?? '',
            previousPhysiotherapy: data.previousPhysiotherapy ?? '',
            safetyScreening: data.safetyScreening ?? '',
            safetyScreeningDetails: data.safetyScreeningDetails ?? '',
            patientGoals: data.patientGoals ?? '',
            therapistInitialNotes: data.therapistInitialNotes ?? '',
            ...data,
          };
          return [resultRecord, ...prev];
        }
      });

      if (markCompleted && resultRecord!) {
        generateClinicalThreadsForCase(resultRecord!);
      }

      if (resultRecord!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'subjective_assessment',
          resultRecord.id,
          patientId,
          caseId,
          isUpdate ? Object.keys(data) : undefined
        );
      }

      return resultRecord!;
    },
    [assertCaseNotArchived, generateClinicalThreadsForCase, appendAuditEvent]
  );

  const openSubjectiveAssessment = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveAssessmentCaseId(caseId);
  };

  const closeSubjectiveAssessment = () => {
    setActiveAssessmentCaseId(null);
  };

  const getObjectiveAssessment = useCallback(
    (caseId: string): ObjectiveAssessment | null => {
      const found = objectiveAssessments.find((a) => a.caseId === caseId);
      return found || null;
    },
    [objectiveAssessments]
  );

  const saveObjectiveAssessment = useCallback(
    (
      caseId: string,
      patientId: string,
      data: Partial<ObjectiveAssessment>,
      markCompleted: boolean = false
    ): ObjectiveAssessment => {
      assertCaseNotArchived(caseId, 'save Objective Assessment');
      const now = new Date().toISOString();
      let resultRecord: ObjectiveAssessment;

      // Ensure every finding has a valid unique id
      const sanitizedData: Partial<ObjectiveAssessment> = {
        ...data,
        findings: data.findings
          ? data.findings.map((f, idx) => ({
              ...f,
              id:
                f.id ||
                `finding_${caseId}_${idx}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
            }))
          : undefined,
      };

      let isUpdate = false;
      setObjectiveAssessments((prev) => {
        const existingIndex = prev.findIndex((a) => a.caseId === caseId);

        if (existingIndex >= 0) {
          isUpdate = true;
          const existing = prev[existingIndex];
          if (existing.isFinalized) {
            throw new Error(
              'Cannot directly modify finalized Objective Assessment. Use addObjectiveAssessmentAmendment instead.'
            );
          }
          const newStatus: ObjectiveAssessmentStatus = markCompleted
            ? 'completed'
            : existing.status === 'completed'
            ? 'completed'
            : 'in_progress';

          resultRecord = {
            ...existing,
            ...sanitizedData,
            caseId,
            patientId,
            status: newStatus,
            updatedAt: now,
            completedAt: markCompleted
              ? existing.completedAt || now
              : existing.completedAt,
          };

          const copy = [...prev];
          copy[existingIndex] = resultRecord;
          return copy;
        } else {
          isUpdate = false;
          const empty = createEmptyObjectiveAssessment(caseId, patientId);
          const newStatus: ObjectiveAssessmentStatus = markCompleted
            ? 'completed'
            : 'in_progress';

          resultRecord = {
            ...empty,
            ...sanitizedData,
            caseId,
            patientId,
            status: newStatus,
            updatedAt: now,
            completedAt: markCompleted ? now : undefined,
          };

          return [resultRecord, ...prev];
        }
      });

      if (resultRecord!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'objective_assessment',
          resultRecord.id,
          patientId,
          caseId,
          isUpdate ? Object.keys(data) : undefined
        );
      }

      return resultRecord!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const getClinicalProblemsForCase = useCallback(
    (caseId: string): ClinicalProblem[] => {
      return clinicalProblems.filter((p) => p.caseId === caseId);
    },
    [clinicalProblems]
  );

  const saveClinicalProblem = useCallback(
    (
      problemData: Partial<ClinicalProblem> & { caseId: string; patientId: string }
    ): ClinicalProblem => {
      assertCaseNotArchived(problemData.caseId, 'save Clinical Problem');
      const now = new Date().toISOString();
      let resultRecord: ClinicalProblem;
      let isUpdate = false;

      setClinicalProblems((prev) => {
        const existingIndex = problemData.id
          ? prev.findIndex((p) => p.id === problemData.id)
          : -1;

        if (existingIndex >= 0) {
          isUpdate = true;
          const existing = prev[existingIndex];
          const newStatus = problemData.status || existing.status;
          resultRecord = {
            ...existing,
            ...problemData,
            status: newStatus,
            updatedAt: now,
            resolvedAt:
              newStatus === 'resolved'
                ? existing.resolvedAt || now
                : undefined,
          };
          const copy = [...prev];
          copy[existingIndex] = resultRecord;
          return copy;
        } else {
          isUpdate = false;
          const empty = createEmptyClinicalProblem(
            problemData.caseId,
            problemData.patientId
          );
          resultRecord = {
            ...empty,
            ...problemData,
            status: problemData.status || 'active',
            updatedAt: now,
            resolvedAt: problemData.status === 'resolved' ? now : undefined,
          };
          return [resultRecord, ...prev];
        }
      });

      if (resultRecord!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'clinical_problem',
          resultRecord.id,
          resultRecord.patientId,
          resultRecord.caseId,
          isUpdate ? Object.keys(problemData) : undefined
        );
      }

      return resultRecord!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const updateClinicalProblemStatus = useCallback(
    (problemId: string, status: ClinicalProblemStatus) => {
      const targetProblem = clinicalProblems.find((p) => p.id === problemId);
      if (targetProblem) {
        assertCaseNotArchived(targetProblem.caseId, 'update Clinical Problem');
      }
      const now = new Date().toISOString();
      setClinicalProblems((prev) =>
        prev.map((p) => {
          if (p.id !== problemId) return p;
          return {
            ...p,
            status,
            updatedAt: now,
            resolvedAt:
              status === 'resolved'
                ? p.resolvedAt || now
                : undefined,
          };
        })
      );
    },
    [clinicalProblems, assertCaseNotArchived]
  );

  const deleteClinicalProblem = useCallback(
    (problemId: string, reason?: string) => {
      const targetProblem = clinicalProblems.find((p) => p.id === problemId);
      if (targetProblem) {
        assertCaseNotArchived(targetProblem.caseId, 'delete Clinical Problem');
      }
      const now = new Date().toISOString();
      const actor = getCurrentActor();
      setClinicalProblems((prev) =>
        prev.map((p) =>
          p.id === problemId
            ? {
                ...p,
                isArchived: true,
                archivedAt: now,
                archivedBy: actor,
                archiveReason: reason,
                updatedAt: now,
              }
            : p
        )
      );
      appendAuditEvent('SOFT_DELETE', 'clinical_problem', problemId, undefined, undefined, undefined, reason);
    },
    [clinicalProblems, assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  const getClinicalGoalsForCase = useCallback(
    (caseId: string): ClinicalGoal[] => {
      return clinicalGoals.filter((g) => g.caseId === caseId);
    },
    [clinicalGoals]
  );

  const saveClinicalGoal = useCallback(
    (
      goalData: Partial<ClinicalGoal> & { caseId: string; patientId: string }
    ): ClinicalGoal => {
      assertCaseNotArchived(goalData.caseId, 'save Clinical Goal');
      const now = new Date().toISOString();
      let resultRecord: ClinicalGoal;

      let isUpdate = false;
      setClinicalGoals((prev) => {
        const existingIndex = goalData.id
          ? prev.findIndex((g) => g.id === goalData.id)
          : -1;

        if (existingIndex >= 0) {
          isUpdate = true;
          const existing = prev[existingIndex];
          const newStatus = goalData.status || existing.status;
          resultRecord = {
            ...existing,
            ...goalData,
            status: newStatus,
            updatedAt: now,
            achievedAt:
              newStatus === 'met'
                ? existing.achievedAt || now
                : undefined,
          };
          const copy = [...prev];
          copy[existingIndex] = resultRecord;
          return copy;
        } else {
          isUpdate = false;
          const empty = createEmptyClinicalGoal(
            goalData.caseId,
            goalData.patientId,
            goalData.type || 'short_term'
          );
          resultRecord = {
            ...empty,
            ...goalData,
            status: goalData.status || 'active',
            updatedAt: now,
            achievedAt: goalData.status === 'met' ? now : undefined,
          };
          return [resultRecord, ...prev];
        }
      });

      if (resultRecord!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'clinical_goal',
          resultRecord.id,
          resultRecord.patientId,
          resultRecord.caseId,
          isUpdate ? Object.keys(goalData) : undefined
        );
      }

      return resultRecord!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const updateClinicalGoalStatus = useCallback(
    (goalId: string, status: ClinicalGoalStatus) => {
      const targetGoal = clinicalGoals.find((g) => g.id === goalId);
      if (targetGoal) {
        assertCaseNotArchived(targetGoal.caseId, 'update Clinical Goal');
      }
      const now = new Date().toISOString();
      setClinicalGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          return {
            ...g,
            status,
            updatedAt: now,
            achievedAt: status === 'met' ? g.achievedAt || now : undefined,
          };
        })
      );
    },
    [clinicalGoals, assertCaseNotArchived]
  );

  const deleteClinicalGoal = useCallback(
    (goalId: string, reason?: string) => {
      const targetGoal = clinicalGoals.find((g) => g.id === goalId);
      if (targetGoal) {
        assertCaseNotArchived(targetGoal.caseId, 'delete Clinical Goal');
      }
      const now = new Date().toISOString();
      const actor = getCurrentActor();
      setClinicalGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? {
                ...g,
                isArchived: true,
                archivedAt: now,
                archivedBy: actor,
                archiveReason: reason,
                updatedAt: now,
              }
            : g
        )
      );
      appendAuditEvent('SOFT_DELETE', 'clinical_goal', goalId, undefined, undefined, undefined, reason);
    },
    [clinicalGoals, assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  // Treatment Plan methods (Stage 4B)
  const getTreatmentPlansForCase = useCallback(
    (caseId: string) => {
      return treatmentPlans.filter((p) => p.caseId === caseId);
    },
    [treatmentPlans]
  );

  const getTreatmentPlanById = useCallback(
    (planId: string) => {
      return treatmentPlans.find((p) => p.id === planId);
    },
    [treatmentPlans]
  );

  const saveTreatmentPlan = useCallback(
    (
      planData: Partial<TreatmentPlan> & { caseId: string; patientId: string }
    ): TreatmentPlan => {
      assertCaseNotArchived(planData.caseId, 'save Treatment Plan');
      const now = new Date().toISOString();
      let resultRecord: TreatmentPlan;

      let isUpdate = false;
      setTreatmentPlans((prev) => {
        const existingIndex = planData.id
          ? prev.findIndex((p) => p.id === planData.id)
          : -1;

        if (existingIndex >= 0) {
          isUpdate = true;
          const existing = prev[existingIndex];
          resultRecord = {
            ...existing,
            ...planData,
            status: planData.status || existing.status,
            updatedAt: now,
          };
          const copy = [...prev];
          copy[existingIndex] = resultRecord;
          return copy;
        } else {
          isUpdate = false;
          const empty = createEmptyTreatmentPlan(
            planData.caseId,
            planData.patientId
          );
          resultRecord = {
            ...empty,
            ...planData,
            status: planData.status || 'active',
            updatedAt: now,
          };
          return [resultRecord, ...prev];
        }
      });

      if (resultRecord!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'treatment_plan',
          resultRecord.id,
          resultRecord.patientId,
          resultRecord.caseId,
          isUpdate ? Object.keys(planData) : undefined
        );
      }

      return resultRecord!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const updateTreatmentPlanStatus = useCallback(
    (planId: string, status: TreatmentPlanStatus) => {
      const target = treatmentPlans.find((p) => p.id === planId);
      if (target) {
        assertCaseNotArchived(target.caseId, 'update Treatment Plan');
      }
      const now = new Date().toISOString();
      setTreatmentPlans((prev) =>
        prev.map((p) => {
          if (p.id !== planId) return p;
          return {
            ...p,
            status,
            updatedAt: now,
            reviewedAt: now,
          };
        })
      );
    },
    [treatmentPlans, assertCaseNotArchived]
  );

  const deleteTreatmentPlan = useCallback(
    (planId: string) => {
      const target = treatmentPlans.find((p) => p.id === planId);
      if (target) {
        assertCaseNotArchived(target.caseId, 'delete Treatment Plan');
      }
      const check = canDeleteTreatmentPlan(planId, treatmentSelections, sessionTreatmentDeliveries);
      if (!check.allowed) {
        throw new Error(check.reason);
      }
      setTreatmentPlans((prev) => prev.filter((p) => p.id !== planId));
      setTreatmentSelections((prev) => prev.filter((ts) => ts.treatmentPlanId !== planId));
      appendAuditEvent('HARD_DELETE', 'treatment_plan', planId);
    },
    [treatmentPlans, treatmentSelections, sessionTreatmentDeliveries, assertCaseNotArchived, appendAuditEvent]
  );

  // Treatment Selection methods (Stage 4B & Stage 4E)
  const getTreatmentSelectionsForCase = useCallback(
    (caseId: string) => {
      return treatmentSelections.filter((ts) => ts.caseId === caseId);
    },
    [treatmentSelections]
  );

  const getTreatmentSelectionsForPlan = useCallback(
    (treatmentPlanId: string) => {
      return treatmentSelections.filter((ts) => ts.treatmentPlanId === treatmentPlanId);
    },
    [treatmentSelections]
  );

  const saveTreatmentSelection = useCallback(
    (
      selectionData: Partial<TreatmentSelection> & {
        caseId: string;
        patientId: string;
        title: string;
        interventionType?: TreatmentInterventionType;
        treatmentPlanId?: string;
      }
    ): TreatmentSelection => {
      assertCaseNotArchived(selectionData.caseId, 'save Treatment Selection');
      const now = new Date().toISOString();
      let resultRecord: TreatmentSelection;

      let isUpdate = false;
      setTreatmentSelections((prev) => {
        const existingIndex = selectionData.id
          ? prev.findIndex((s) => s.id === selectionData.id)
          : -1;

        if (existingIndex >= 0) {
          isUpdate = true;
          const existing = prev[existingIndex];
          const newStatus = selectionData.status || existing.status;
          resultRecord = {
            ...existing,
            ...selectionData,
            treatmentPlanId: selectionData.treatmentPlanId !== undefined ? selectionData.treatmentPlanId : existing.treatmentPlanId,
            caseId: existing.caseId,
            patientId: existing.patientId,
            title: (selectionData.title !== undefined ? selectionData.title : existing.title).trim(),
            interventionType: selectionData.interventionType || existing.interventionType || 'therapeutic_exercise',
            category: selectionData.category || existing.category || 'exercise',
            interventionDescription: selectionData.interventionDescription !== undefined ? selectionData.interventionDescription : (selectionData.description !== undefined ? selectionData.description : existing.interventionDescription || existing.description || ''),
            description: selectionData.description !== undefined ? selectionData.description : (selectionData.interventionDescription !== undefined ? selectionData.interventionDescription : existing.description),
            clinicalProblemId: selectionData.clinicalProblemId !== undefined ? selectionData.clinicalProblemId : (selectionData.linkedProblemIds && selectionData.linkedProblemIds[0]) || existing.clinicalProblemId,
            linkedProblemIds: selectionData.linkedProblemIds !== undefined ? selectionData.linkedProblemIds : existing.linkedProblemIds,
            goalId: selectionData.goalId !== undefined ? selectionData.goalId : (selectionData.linkedGoalIds && selectionData.linkedGoalIds[0]) || existing.goalId,
            linkedGoalIds: selectionData.linkedGoalIds !== undefined ? selectionData.linkedGoalIds : existing.linkedGoalIds,
            clinicalRationale: selectionData.clinicalRationale !== undefined ? selectionData.clinicalRationale : (selectionData.therapistRationale !== undefined ? selectionData.therapistRationale : existing.clinicalRationale || existing.therapistRationale),
            therapistRationale: selectionData.therapistRationale !== undefined ? selectionData.therapistRationale : (selectionData.clinicalRationale !== undefined ? selectionData.clinicalRationale : existing.therapistRationale),
            therapistNotes: selectionData.therapistNotes !== undefined ? selectionData.therapistNotes : existing.therapistNotes,
            status: newStatus,
            updatedAt: now,
            discontinuedAt:
              newStatus === 'discontinued'
                ? existing.discontinuedAt || now
                : undefined,
          };
          const copy = [...prev];
          copy[existingIndex] = resultRecord;
          return copy;
        } else {
          isUpdate = false;
          const empty = createEmptyTreatmentSelection(
            selectionData.caseId,
            selectionData.patientId,
            selectionData.treatmentPlanId
          );
          const newStatus = selectionData.status || 'planned';
          resultRecord = {
            ...empty,
            ...selectionData,
            title: selectionData.title.trim(),
            interventionType: selectionData.interventionType || 'therapeutic_exercise',
            category: selectionData.category || 'exercise',
            interventionDescription: selectionData.interventionDescription || selectionData.description || '',
            description: selectionData.description || selectionData.interventionDescription || '',
            clinicalProblemId: selectionData.clinicalProblemId || (selectionData.linkedProblemIds && selectionData.linkedProblemIds[0]) || '',
            linkedProblemIds: selectionData.linkedProblemIds || (selectionData.clinicalProblemId ? [selectionData.clinicalProblemId] : []),
            goalId: selectionData.goalId || (selectionData.linkedGoalIds && selectionData.linkedGoalIds[0]) || '',
            linkedGoalIds: selectionData.linkedGoalIds || (selectionData.goalId ? [selectionData.goalId] : []),
            clinicalRationale: selectionData.clinicalRationale || selectionData.therapistRationale || '',
            therapistRationale: selectionData.therapistRationale || selectionData.clinicalRationale || '',
            status: newStatus,
            updatedAt: now,
            discontinuedAt: newStatus === 'discontinued' ? now : undefined,
          };
          return [resultRecord, ...prev];
        }
      });

      if (resultRecord!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'treatment_selection',
          resultRecord.id,
          resultRecord.patientId,
          resultRecord.caseId,
          isUpdate ? Object.keys(selectionData) : undefined
        );
      }

      return resultRecord!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const updateTreatmentSelectionStatus = useCallback(
    (selectionId: string, status: TreatmentSelectionStatus) => {
      const target = treatmentSelections.find((ts) => ts.id === selectionId);
      if (target) {
        assertCaseNotArchived(target.caseId, 'update Treatment Selection');
      }
      const now = new Date().toISOString();
      setTreatmentSelections((prev) =>
        prev.map((ts) => {
          if (ts.id !== selectionId) return ts;
          return {
            ...ts,
            status,
            updatedAt: now,
            discontinuedAt:
              status === 'discontinued' ? ts.discontinuedAt || now : undefined,
          };
        })
      );
    },
    [treatmentSelections, assertCaseNotArchived]
  );

  const deleteTreatmentSelection = useCallback(
    (selectionId: string) => {
      const target = treatmentSelections.find((ts) => ts.id === selectionId);
      if (target) {
        assertCaseNotArchived(target.caseId, 'delete Treatment Selection');
      }
      const check = canDeleteTreatmentSelection(selectionId, sessionTreatmentDeliveries);
      if (!check.allowed) {
        throw new Error(check.reason);
      }
      // Delete the selection
      setTreatmentSelections((prev) => prev.filter((ts) => ts.id !== selectionId));
      // Clean up relational links (cascade link removal without touching base evidence or conditions)
      setTreatmentEvidenceLinks((prev) =>
        prev.filter((l) => l.treatmentSelectionId !== selectionId)
      );
      setTreatmentConditionLinks((prev) =>
        prev.filter((l) => l.treatmentSelectionId !== selectionId)
      );
      appendAuditEvent('HARD_DELETE', 'treatment_selection', selectionId);
    },
    [treatmentSelections, sessionTreatmentDeliveries, assertCaseNotArchived, appendAuditEvent]
  );

  // Stage 4E: Treatment Evidence & Condition Links Methods
  const getEvidenceLinksForTreatment = useCallback(
    (treatmentSelectionId: string): TreatmentEvidenceLink[] => {
      return treatmentEvidenceLinks.filter(
        (l) => l.treatmentSelectionId === treatmentSelectionId
      );
    },
    [treatmentEvidenceLinks]
  );

  const getConditionLinksForTreatment = useCallback(
    (treatmentSelectionId: string): TreatmentConditionLink[] => {
      return treatmentConditionLinks.filter(
        (l) => l.treatmentSelectionId === treatmentSelectionId
      );
    },
    [treatmentConditionLinks]
  );

  const linkEvidenceToTreatment = useCallback(
    (
      treatmentSelectionId: string,
      evidenceItemId: string,
      therapistNote?: string
    ): TreatmentEvidenceLink => {
      const targetSelection = treatmentSelections.find((ts) => ts.id === treatmentSelectionId);
      if (targetSelection) {
        assertCaseNotArchived(targetSelection.caseId, 'link Evidence to Treatment Selection');
      }
      const now = new Date().toISOString();
      let resultLink: TreatmentEvidenceLink;

      setTreatmentEvidenceLinks((prev) => {
        const existing = prev.find(
          (l) =>
            l.treatmentSelectionId === treatmentSelectionId &&
            l.evidenceItemId === evidenceItemId
        );
        if (existing) {
          resultLink = {
            ...existing,
            therapistNote: therapistNote !== undefined ? therapistNote.trim() : existing.therapistNote,
            updatedAt: now,
          };
          return prev.map((l) => (l.id === existing.id ? resultLink : l));
        }

        const newId = generateTreatmentEvidenceLinkId();
        resultLink = {
          id: newId,
          treatmentSelectionId,
          evidenceItemId,
          therapistNote: therapistNote?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        return [...prev, resultLink];
      });

      return resultLink!;
    },
    [treatmentSelections, assertCaseNotArchived]
  );

  const unlinkEvidenceFromTreatment = useCallback(
    (linkId: string) => {
      const targetLink = treatmentEvidenceLinks.find((l) => l.id === linkId);
      if (targetLink) {
        const targetSelection = treatmentSelections.find(
          (ts) => ts.id === targetLink.treatmentSelectionId
        );
        if (targetSelection) {
          assertCaseNotArchived(targetSelection.caseId, 'unlink Evidence from Treatment Selection');
        }
      }
      setTreatmentEvidenceLinks((prev) => prev.filter((l) => l.id !== linkId));
    },
    [treatmentEvidenceLinks, treatmentSelections, assertCaseNotArchived]
  );

  const linkConditionToTreatment = useCallback(
    (
      treatmentSelectionId: string,
      conditionPresentationId: string
    ): TreatmentConditionLink => {
      const targetSelection = treatmentSelections.find((ts) => ts.id === treatmentSelectionId);
      if (targetSelection) {
        assertCaseNotArchived(targetSelection.caseId, 'link Condition to Treatment Selection');
      }
      const now = new Date().toISOString();
      let resultLink: TreatmentConditionLink;

      setTreatmentConditionLinks((prev) => {
        const existing = prev.find(
          (l) =>
            l.treatmentSelectionId === treatmentSelectionId &&
            l.conditionPresentationId === conditionPresentationId
        );
        if (existing) {
          resultLink = existing;
          return prev;
        }

        const newId = generateTreatmentConditionLinkId();
        resultLink = {
          id: newId,
          treatmentSelectionId,
          conditionPresentationId,
          createdAt: now,
          updatedAt: now,
        };
        return [...prev, resultLink];
      });

      return resultLink!;
    },
    [treatmentSelections, assertCaseNotArchived]
  );

  const unlinkConditionFromTreatment = useCallback(
    (linkId: string) => {
      const targetLink = treatmentConditionLinks.find((l) => l.id === linkId);
      if (targetLink) {
        const targetSelection = treatmentSelections.find(
          (ts) => ts.id === targetLink.treatmentSelectionId
        );
        if (targetSelection) {
          assertCaseNotArchived(targetSelection.caseId, 'unlink Condition from Treatment Selection');
        }
      }
      setTreatmentConditionLinks((prev) => prev.filter((l) => l.id !== linkId));
    },
    [treatmentConditionLinks, treatmentSelections, assertCaseNotArchived]
  );

  // Evidence Knowledge Layer methods (Stage 4C)
  const getEvidenceSourceById = useCallback(
    (sourceId: string): EvidenceSource | undefined => {
      return evidenceSources.find((s) => s.id === sourceId);
    },
    [evidenceSources]
  );

  const getEvidenceItemsForSource = useCallback(
    (sourceId: string): EvidenceItem[] => {
      return evidenceItems.filter((item) => item.sourceId === sourceId);
    },
    [evidenceItems]
  );

  const saveEvidenceSource = useCallback(
    (
      sourceData: Partial<EvidenceSource> & {
        title: string;
        publicationYear: number;
        evidenceType: EvidenceType;
        status: EvidenceSourceStatus;
      }
    ): EvidenceSource => {
      const now = new Date().toISOString();
      let resultSource: EvidenceSource;

      setEvidenceSources((prev) => {
        if (sourceData.id) {
          const exists = prev.some((s) => s.id === sourceData.id);
          if (exists) {
            return prev.map((s) => {
              if (s.id !== sourceData.id) return s;
              resultSource = {
                ...s,
                ...sourceData,
                authors: Array.isArray(sourceData.authors) ? sourceData.authors : s.authors || [],
                updatedAt: now,
              } as EvidenceSource;
              return resultSource;
            });
          }
        }

        const newId = sourceData.id || `src_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        resultSource = {
          title: sourceData.title.trim(),
          authors: Array.isArray(sourceData.authors) ? sourceData.authors : [],
          organization: sourceData.organization?.trim() || undefined,
          publicationYear: Number(sourceData.publicationYear),
          evidenceType: sourceData.evidenceType,
          journalOrPublisher: sourceData.journalOrPublisher?.trim() || undefined,
          doi: sourceData.doi?.trim() || undefined,
          url: sourceData.url?.trim() || undefined,
          version: sourceData.version?.trim() || undefined,
          status: sourceData.status,
          publishedAt: sourceData.publishedAt || undefined,
          lastReviewedAt: sourceData.lastReviewedAt || undefined,
          supersededBySourceId: sourceData.supersededBySourceId || undefined,
          notes: sourceData.notes?.trim() || undefined,
          id: newId,
          createdAt: sourceData.createdAt || now,
          updatedAt: now,
        };
        return [resultSource, ...prev];
      });

      return resultSource!;
    },
    []
  );

  const updateEvidenceSourceStatus = useCallback(
    (sourceId: string, status: EvidenceSourceStatus) => {
      const now = new Date().toISOString();
      setEvidenceSources((prev) =>
        prev.map((s) => {
          if (s.id !== sourceId) return s;
          return {
            ...s,
            status,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const deleteEvidenceSource = useCallback(
    (sourceId: string) => {
      const check = canDeleteEvidenceSource(
        sourceId,
        evidenceItems,
        treatmentEvidenceLinks,
        conditionEvidenceLinks
      );
      if (!check.allowed) {
        throw new Error(check.reason);
      }
      setEvidenceSources((prev) => prev.filter((s) => s.id !== sourceId));
      setEvidenceItems((prev) => prev.filter((item) => item.sourceId !== sourceId));
      appendAuditEvent('HARD_DELETE', 'evidence_source', sourceId);
    },
    [evidenceItems, treatmentEvidenceLinks, conditionEvidenceLinks, appendAuditEvent]
  );

  const saveEvidenceItem = useCallback(
    (
      itemData: Partial<EvidenceItem> & {
        sourceId: string;
        title: string;
        summary: string;
      }
    ): EvidenceItem => {
      const now = new Date().toISOString();
      let resultItem: EvidenceItem;

      setEvidenceItems((prev) => {
        if (itemData.id) {
          const exists = prev.some((item) => item.id === itemData.id);
          if (exists) {
            return prev.map((item) => {
              if (item.id !== itemData.id) return item;
              resultItem = {
                ...item,
                ...itemData,
                updatedAt: now,
              } as EvidenceItem;
              return resultItem;
            });
          }
        }

        const newId = itemData.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        resultItem = {
          sourceId: itemData.sourceId,
          title: itemData.title.trim(),
          summary: itemData.summary.trim(),
          conditionOrPresentation: itemData.conditionOrPresentation?.trim() || undefined,
          population: itemData.population?.trim() || undefined,
          clinicalContext: itemData.clinicalContext?.trim() || undefined,
          treatmentApproach: itemData.treatmentApproach?.trim() || undefined,
          recommendation: itemData.recommendation?.trim() || undefined,
          recommendationStrength: itemData.recommendationStrength?.trim() || undefined,
          evidenceLevel: itemData.evidenceLevel?.trim() || undefined,
          limitations: itemData.limitations?.trim() || undefined,
          applicability: itemData.applicability?.trim() || undefined,
          id: newId,
          createdAt: itemData.createdAt || now,
          updatedAt: now,
        };
        return [resultItem, ...prev];
      });

      return resultItem!;
    },
    []
  );

  const deleteEvidenceItem = useCallback(
    (itemId: string) => {
      setEvidenceItems((prev) => prev.filter((item) => item.id !== itemId));
      // Clean up any condition evidence links referencing this deleted item
      setConditionEvidenceLinks((prev) =>
        prev.filter((link) => link.evidenceItemId !== itemId)
      );
      // Stage 13: Clean up treatment evidence links as well
      setTreatmentEvidenceLinks((prev) =>
        prev.filter((link) => link.evidenceItemId !== itemId)
      );
      appendAuditEvent('HARD_DELETE', 'evidence_item' as any, itemId);
    },
    [appendAuditEvent]
  );

  // Condition / Presentation Pathways helpers (Stage 4D)
  const getConditionPresentationById = useCallback(
    (id: string): ConditionPresentation | undefined => {
      return conditionPresentations.find((cp) => cp.id === id);
    },
    [conditionPresentations]
  );

  const getLinksForCondition = useCallback(
    (conditionId: string): ConditionEvidenceLink[] => {
      return conditionEvidenceLinks.filter(
        (link) => link.conditionPresentationId === conditionId
      );
    },
    [conditionEvidenceLinks]
  );

  const getEvidenceItemsForCondition = useCallback(
    (conditionId: string): EvidenceItem[] => {
      const links = conditionEvidenceLinks.filter(
        (link) => link.conditionPresentationId === conditionId
      );
      const itemIds = new Set(links.map((l) => l.evidenceItemId));
      return evidenceItems.filter((item) => itemIds.has(item.id));
    },
    [conditionEvidenceLinks, evidenceItems]
  );

  const getConditionsForEvidenceItem = useCallback(
    (evidenceItemId: string): ConditionPresentation[] => {
      const links = conditionEvidenceLinks.filter(
        (link) => link.evidenceItemId === evidenceItemId
      );
      const condIds = new Set(links.map((l) => l.conditionPresentationId));
      return conditionPresentations.filter((cp) => condIds.has(cp.id));
    },
    [conditionEvidenceLinks, conditionPresentations]
  );

  const saveConditionPresentation = useCallback(
    (
      conditionData: Partial<ConditionPresentation> & {
        name: string;
        type: ConditionPresentationType;
        status?: ConditionPresentationStatus;
      }
    ): ConditionPresentation => {
      const now = new Date().toISOString();
      let resultCondition: ConditionPresentation;

      setConditionPresentations((prev) => {
        if (conditionData.id) {
          const exists = prev.some((cp) => cp.id === conditionData.id);
          if (exists) {
            return prev.map((cp) => {
              if (cp.id !== conditionData.id) return cp;
              resultCondition = {
                ...cp,
                ...conditionData,
                commonTerms: Array.isArray(conditionData.commonTerms)
                  ? conditionData.commonTerms
                  : cp.commonTerms || [],
                updatedAt: now,
              } as ConditionPresentation;
              return resultCondition;
            });
          }
        }

        const newId =
          conditionData.id ||
          `cond_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        resultCondition = {
          id: newId,
          name: conditionData.name.trim(),
          type: conditionData.type,
          description: conditionData.description?.trim() || undefined,
          bodyRegion: conditionData.bodyRegion?.trim() || undefined,
          system: conditionData.system?.trim() || undefined,
          commonTerms: Array.isArray(conditionData.commonTerms)
            ? conditionData.commonTerms.map((t) => t.trim()).filter(Boolean)
            : [],
          notes: conditionData.notes?.trim() || undefined,
          status: conditionData.status || 'active',
          createdAt: conditionData.createdAt || now,
          updatedAt: now,
        };
        return [resultCondition, ...prev];
      });

      return resultCondition!;
    },
    []
  );

  const updateConditionStatus = useCallback(
    (conditionId: string, status: ConditionPresentationStatus) => {
      const now = new Date().toISOString();
      setConditionPresentations((prev) =>
        prev.map((cp) => {
          if (cp.id !== conditionId) return cp;
          return {
            ...cp,
            status,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const deleteConditionPresentation = useCallback(
    (conditionId: string) => {
      // Delete the condition presentation
      setConditionPresentations((prev) => prev.filter((cp) => cp.id !== conditionId));
      // Clean up its relational links (does NOT delete any EvidenceItem or EvidenceSource)
      setConditionEvidenceLinks((prev) =>
        prev.filter((link) => link.conditionPresentationId !== conditionId)
      );
      // Clean up treatment condition links to prevent dangling orphan pointers
      setTreatmentConditionLinks((prev) =>
        prev.filter((link) => link.conditionPresentationId !== conditionId)
      );
      appendAuditEvent('HARD_DELETE', 'condition_presentation' as any, conditionId);
    },
    [appendAuditEvent]
  );

  const linkEvidenceToCondition = useCallback(
    (
      conditionId: string,
      evidenceItemId: string,
      relevanceNote?: string
    ): ConditionEvidenceLink => {
      const now = new Date().toISOString();
      let resultLink: ConditionEvidenceLink;

      setConditionEvidenceLinks((prev) => {
        // Prevent duplicate link between same condition and evidence item
        const existing = prev.find(
          (l) =>
            l.conditionPresentationId === conditionId &&
            l.evidenceItemId === evidenceItemId
        );
        if (existing) {
          resultLink = {
            ...existing,
            relevanceNote: relevanceNote?.trim() || existing.relevanceNote,
            updatedAt: now,
          };
          return prev.map((l) => (l.id === existing.id ? resultLink : l));
        }

        const newId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        resultLink = {
          id: newId,
          conditionPresentationId: conditionId,
          evidenceItemId: evidenceItemId,
          relevanceNote: relevanceNote?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        return [...prev, resultLink];
      });

      return resultLink!;
    },
    []
  );

  const unlinkEvidenceFromCondition = useCallback((linkId: string) => {
    setConditionEvidenceLinks((prev) => prev.filter((l) => l.id !== linkId));
  }, []);

  const unlinkEvidenceItemFromAllConditions = useCallback((evidenceItemId: string) => {
    setConditionEvidenceLinks((prev) =>
      prev.filter((l) => l.evidenceItemId !== evidenceItemId)
    );
  }, []);

  // ==========================================
  // STAGE 4F: CLINICAL INVESTIGATIONS CRUD
  // ==========================================

  const getClinicalInvestigationsForCase = useCallback(
    (caseId: string): ClinicalInvestigation[] => {
      return sortInvestigationsChronological(
        clinicalInvestigations.filter((inv) => inv.caseId === caseId),
        false
      );
    },
    [clinicalInvestigations]
  );

  const getClinicalInvestigationById = useCallback(
    (id: string): ClinicalInvestigation | undefined => {
      return clinicalInvestigations.find((inv) => inv.id === id);
    },
    [clinicalInvestigations]
  );

  const saveClinicalInvestigation = useCallback(
    (
      investigationData: Partial<ClinicalInvestigation> & {
        caseId: string;
        name: string;
        category: InvestigationCategory;
        modality: RadiologicalModality;
        investigationDate: string;
        bodyRegion: string;
      }
    ): ClinicalInvestigation => {
      assertCaseNotArchived(investigationData.caseId, 'save Clinical Investigation');
      const now = new Date().toISOString();
      let resultInvestigation: ClinicalInvestigation;
      let isUpdate = false;

      setClinicalInvestigations((prev) => {
        if (investigationData.id) {
          const existingIndex = prev.findIndex((inv) => inv.id === investigationData.id);
          if (existingIndex >= 0) {
            isUpdate = true;
            const existing = prev[existingIndex];
            resultInvestigation = {
              ...existing,
              ...investigationData,
              id: existing.id,
              caseId: existing.caseId,
              createdAt: existing.createdAt,
              updatedAt: now,
              name: investigationData.name.trim(),
              bodyRegion: investigationData.bodyRegion.trim(),
              indication: investigationData.indication?.trim() || undefined,
              findings: investigationData.findings?.trim() || undefined,
              impression: investigationData.impression?.trim() || undefined,
              sourceType: investigationData.sourceType?.trim() || undefined,
              sourceName: investigationData.sourceName?.trim() || undefined,
              clinicianRelevance: investigationData.clinicianRelevance?.trim() || undefined,
            };
            const copy = [...prev];
            copy[existingIndex] = resultInvestigation;
            return copy;
          }
        }

        isUpdate = false;
        const newId = investigationData.id || generateInvestigationId(prev);
        resultInvestigation = {
          id: newId,
          caseId: investigationData.caseId,
          category: investigationData.category || 'radiological',
          modality: investigationData.modality,
          name: investigationData.name.trim(),
          bodyRegion: investigationData.bodyRegion.trim(),
          investigationDate: investigationData.investigationDate,
          indication: investigationData.indication?.trim() || undefined,
          findings: investigationData.findings?.trim() || undefined,
          impression: investigationData.impression?.trim() || undefined,
          sourceType: investigationData.sourceType?.trim() || undefined,
          sourceName: investigationData.sourceName?.trim() || undefined,
          clinicianRelevance: investigationData.clinicianRelevance?.trim() || undefined,
          attachment: investigationData.attachment || undefined,
          createdAt: investigationData.createdAt || now,
          updatedAt: now,
        };

        return [resultInvestigation, ...prev];
      });

      if (resultInvestigation!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'clinical_investigation',
          resultInvestigation.id,
          undefined,
          resultInvestigation.caseId,
          isUpdate ? Object.keys(investigationData) : undefined
        );
      }

      return resultInvestigation!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const deleteClinicalInvestigation = useCallback(
    (id: string, reason?: string) => {
      const target = clinicalInvestigations.find((ci) => ci.id === id);
      if (target) {
        assertCaseNotArchived(target.caseId, 'delete Clinical Investigation');
      }
      const now = new Date().toISOString();
      const actor = getCurrentActor();
      setClinicalInvestigations((prev) =>
        prev.map((ci) =>
          ci.id === id
            ? {
                ...ci,
                isArchived: true,
                archivedAt: now,
                archivedBy: actor,
                archiveReason: reason,
                updatedAt: now,
              }
            : ci
        )
      );
      appendAuditEvent('SOFT_DELETE', 'clinical_investigation', id, undefined, undefined, undefined, reason);
    },
    [clinicalInvestigations, assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  // ==========================================
  // STAGE 5: CLINICAL SESSIONS FOUNDATION CRUD
  // ==========================================

  const getSessionsForCase = useCallback(
    (caseId: string): ClinicalSession[] => {
      return clinicalSessions
        .filter((s) => s.caseId === caseId)
        .sort((a, b) => {
          // Sort by sessionNumber descending, or date descending
          if (b.sessionNumber !== a.sessionNumber) {
            return b.sessionNumber - a.sessionNumber;
          }
          return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
        });
    },
    [clinicalSessions]
  );

  const getSessionById = useCallback(
    (sessionId: string): ClinicalSession | undefined => {
      return clinicalSessions.find((s) => s.id === sessionId);
    },
    [clinicalSessions]
  );

  const getDeliveriesForSession = useCallback(
    (sessionId: string): SessionTreatmentDelivery[] => {
      return sessionTreatmentDeliveries.filter((d) => d.sessionId === sessionId);
    },
    [sessionTreatmentDeliveries]
  );

  const getDeliveriesForTreatmentSelection = useCallback(
    (treatmentSelectionId: string): SessionTreatmentDelivery[] => {
      return sessionTreatmentDeliveries.filter(
        (d) => d.treatmentSelectionId === treatmentSelectionId
      );
    },
    [sessionTreatmentDeliveries]
  );

  const saveClinicalSession = useCallback(
    (
      sessionData: Partial<ClinicalSession> & {
        caseId: string;
        patientId: string;
      }
    ): ClinicalSession => {
      assertCaseNotArchived(sessionData.caseId, 'save Clinical Session');
      const now = new Date().toISOString();
      let resultSession: ClinicalSession;
      let isUpdate = false;

      setClinicalSessions((prev) => {
        if (sessionData.id) {
          const exists = prev.find((s) => s.id === sessionData.id);
          if (exists) {
            isUpdate = true;
            if (exists.isFinalized) {
              throw new Error(
                'Cannot directly modify finalized Clinical Session. Use addClinicalSessionAmendment instead.'
              );
            }
            return prev.map((s) => {
              if (s.id !== sessionData.id) return s;
              resultSession = {
                ...s,
                ...sessionData,
                // Ensure caseId and patientId are strictly immutable once created
                caseId: s.caseId,
                patientId: s.patientId,
                updatedAt: now,
              } as ClinicalSession;
              return resultSession;
            });
          }
        }

        isUpdate = false;
        const newId = sessionData.id || generateClinicalSessionId();
        // Compute case-specific session number safely if not explicitly provided
        const caseSessions = prev.filter((s) => s.caseId === sessionData.caseId);
        const sessionNumber =
          typeof sessionData.sessionNumber === 'number' && sessionData.sessionNumber > 0
            ? sessionData.sessionNumber
            : getNextSessionNumber(caseSessions);

        resultSession = {
          id: newId,
          caseId: sessionData.caseId,
          patientId: sessionData.patientId,
          sessionNumber,
          sessionDate: sessionData.sessionDate || now.split('T')[0],
          startTime: sessionData.startTime || undefined,
          endTime: sessionData.endTime || undefined,
          status: sessionData.status || 'completed',
          overallTolerance: sessionData.overallTolerance || 'well_tolerated',
          therapistSessionNotes: sessionData.therapistSessionNotes?.trim() || '',
          patientSubjectiveResponse: sessionData.patientSubjectiveResponse?.trim() || '',
          immediateObservations: sessionData.immediateObservations?.trim() || '',
          modificationsSummary: sessionData.modificationsSummary?.trim() || '',
          createdAt: sessionData.createdAt || now,
          updatedAt: now,
        };

        return [resultSession, ...prev];
      });

      // Update case lastSessionDate if completed or newer
      if (sessionData.sessionDate) {
        updateCase(sessionData.caseId, {
          lastSessionDate: sessionData.sessionDate,
        });
      }

      if (resultSession!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'clinical_session',
          resultSession.id,
          sessionData.patientId,
          sessionData.caseId,
          isUpdate ? Object.keys(sessionData) : undefined
        );
      }

      return resultSession!;
    },
    [assertCaseNotArchived, updateCase, appendAuditEvent]
  );

  const updateClinicalSessionStatus = useCallback(
    (sessionId: string, status: ClinicalSessionStatus) => {
      const target = clinicalSessions.find((s) => s.id === sessionId);
      if (target) {
        assertCaseNotArchived(target.caseId, 'update Clinical Session');
      }
      const now = new Date().toISOString();
      setClinicalSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            status,
            updatedAt: now,
          };
        })
      );
    },
    [clinicalSessions, assertCaseNotArchived]
  );

  const deleteClinicalSession = useCallback(
    (sessionId: string) => {
      const existing = clinicalSessions.find((s) => s.id === sessionId);
      if (existing) {
        assertCaseNotArchived(existing.caseId, 'delete Clinical Session');
      }
      if (existing?.isFinalized) {
        throw new Error('Cannot delete a finalized Clinical Session.');
      }
      // Delete session
      setClinicalSessions((prev) => prev.filter((s) => s.id !== sessionId));
      // Cascade delete dependent session treatment deliveries without affecting treatment selections
      setSessionTreatmentDeliveries((prev) =>
        prev.filter((d) => d.sessionId !== sessionId)
      );
      appendAuditEvent('HARD_DELETE', 'clinical_session', sessionId, existing?.patientId, existing?.caseId);
    },
    [clinicalSessions, assertCaseNotArchived, appendAuditEvent]
  );

  const saveSessionTreatmentDelivery = useCallback(
    (
      deliveryData: Partial<SessionTreatmentDelivery> & {
        sessionId: string;
        caseId: string;
        patientId: string;
        title: string;
      }
    ): SessionTreatmentDelivery => {
      assertCaseNotArchived(deliveryData.caseId, 'save Session Treatment Delivery');
      const now = new Date().toISOString();
      let resultDelivery: SessionTreatmentDelivery;
      let isUpdate = false;

      setSessionTreatmentDeliveries((prev) => {
        if (deliveryData.id) {
          const exists = prev.some((d) => d.id === deliveryData.id);
          if (exists) {
            isUpdate = true;
            return prev.map((d) => {
              if (d.id !== deliveryData.id) return d;
              resultDelivery = {
                ...d,
                ...deliveryData,
                // Ensure session/case/patient relations cannot be mutated across boundaries
                sessionId: d.sessionId,
                caseId: d.caseId,
                patientId: d.patientId,
                updatedAt: now,
              } as SessionTreatmentDelivery;
              return resultDelivery;
            });
          }
        }

        isUpdate = false;
        const newId = deliveryData.id || generateSessionTreatmentDeliveryId();
        resultDelivery = {
          id: newId,
          sessionId: deliveryData.sessionId,
          caseId: deliveryData.caseId,
          patientId: deliveryData.patientId,
          treatmentSelectionId: deliveryData.treatmentSelectionId || undefined,
          title: deliveryData.title.trim(),
          interventionType: deliveryData.interventionType || 'other',
          actualDosage: deliveryData.actualDosage ? { ...deliveryData.actualDosage } : undefined,
          actualDurationMinutes:
            typeof deliveryData.actualDurationMinutes === 'number'
              ? deliveryData.actualDurationMinutes
              : undefined,
          deliveryStatus: deliveryData.deliveryStatus || 'completed_as_planned',
          modificationType: deliveryData.modificationType || 'none',
          modificationReason: deliveryData.modificationReason?.trim() || undefined,
          therapistExecutionNotes: deliveryData.therapistExecutionNotes?.trim() || undefined,
          immediateResponse: deliveryData.immediateResponse?.trim() || undefined,
          createdAt: deliveryData.createdAt || now,
          updatedAt: now,
        };

        return [...prev, resultDelivery];
      });

      if (resultDelivery!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'session_treatment_delivery',
          resultDelivery.id,
          deliveryData.patientId,
          deliveryData.caseId,
          isUpdate ? Object.keys(deliveryData) : undefined
        );
      }

      return resultDelivery!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const deleteSessionTreatmentDelivery = useCallback(
    (deliveryId: string) => {
      const delivery = sessionTreatmentDeliveries.find((d) => d.id === deliveryId);
      if (delivery) {
        assertCaseNotArchived(delivery.caseId, 'delete Session Treatment Delivery');
        const session = clinicalSessions.find((s) => s.id === delivery.sessionId);
        if (session?.isFinalized) {
          throw new Error('Cannot delete a treatment delivery from a finalized clinical session.');
        }
      }
      setSessionTreatmentDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
      appendAuditEvent('HARD_DELETE', 'session_treatment_delivery', deliveryId, delivery?.patientId, delivery?.caseId);
    },
    [sessionTreatmentDeliveries, clinicalSessions, assertCaseNotArchived, appendAuditEvent]
  );

  // ==========================================
  // STAGE 6: CLINICAL PROGRESS & OUTCOMES CRUD
  // ==========================================

  const getProgressRecordsForCase = useCallback(
    (caseId: string): ProgressRecord[] => {
      return progressRecords
        .filter((r) => r.caseId === caseId)
        .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
    },
    [progressRecords]
  );

  const getProgressRecordById = useCallback(
    (recordId: string): ProgressRecord | undefined => {
      return progressRecords.find((r) => r.id === recordId);
    },
    [progressRecords]
  );

  const getMeasurementsForRecord = useCallback(
    (recordId: string): ProgressMeasurement[] => {
      return progressMeasurements.filter((m) => m.progressRecordId === recordId);
    },
    [progressMeasurements]
  );

  const getMeasurementsForCase = useCallback(
    (caseId: string): ProgressMeasurement[] => {
      return progressMeasurements.filter((m) => m.caseId === caseId);
    },
    [progressMeasurements]
  );

  const getMeasurementsByMeasureName = useCallback(
    (caseId: string, measureName: string): ProgressMeasurement[] => {
      return progressMeasurements
        .filter(
          (m) =>
            m.caseId === caseId &&
            m.measureName.trim().toLowerCase() === measureName.trim().toLowerCase()
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    [progressMeasurements]
  );

  const saveProgressRecord = useCallback(
    (
      recordData: Partial<ProgressRecord> & {
        caseId: string;
        patientId: string;
        therapistSummary: string;
      }
    ): ProgressRecord => {
      assertCaseNotArchived(recordData.caseId, 'save Progress Record');
      const now = new Date().toISOString();
      let resultRecord: ProgressRecord;
      let isUpdate = false;

      setProgressRecords((prev) => {
        if (recordData.id) {
          const exists = prev.find((r) => r.id === recordData.id);
          if (exists) {
            isUpdate = true;
            if (exists.isFinalized) {
              throw new Error('Cannot directly modify finalized Progress Record.');
            }
            return prev.map((r) => {
              if (r.id !== recordData.id) return r;
              resultRecord = {
                ...r,
                ...recordData,
                // Ensure caseId and patientId remain strictly immutable
                caseId: r.caseId,
                patientId: r.patientId,
                updatedAt: now,
              } as ProgressRecord;
              return resultRecord;
            });
          }
        }

        isUpdate = false;
        const newId = recordData.id || generateProgressRecordId();
        resultRecord = {
          id: newId,
          caseId: recordData.caseId,
          patientId: recordData.patientId,
          recordDate: recordData.recordDate || now.split('T')[0],
          contextType: recordData.contextType || 'routine_progress_review',
          therapistSummary: recordData.therapistSummary.trim(),
          clinicalInterpretation: recordData.clinicalInterpretation?.trim() || undefined,
          linkedSessionId: recordData.linkedSessionId || undefined,
          linkedAssessmentId: recordData.linkedAssessmentId || undefined,
          linkedGoalId: recordData.linkedGoalId || undefined,
          createdAt: recordData.createdAt || now,
          updatedAt: now,
        };

        return [resultRecord, ...prev];
      });

      if (resultRecord!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'progress_record',
          resultRecord.id,
          recordData.patientId,
          recordData.caseId,
          isUpdate ? Object.keys(recordData) : undefined
        );
      }

      return resultRecord!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const deleteProgressRecord = useCallback(
    (recordId: string) => {
      const existing = progressRecords.find((r) => r.id === recordId);
      if (existing) {
        assertCaseNotArchived(existing.caseId, 'delete Progress Record');
      }
      if (existing?.isFinalized) {
        throw new Error('Cannot delete a finalized progress record.');
      }
      // Delete progress record
      setProgressRecords((prev) => prev.filter((r) => r.id !== recordId));
      // Cascade delete dependent measurements without affecting sessions, assessments, or goals
      setProgressMeasurements((prev) => prev.filter((m) => m.progressRecordId !== recordId));
      appendAuditEvent('HARD_DELETE', 'progress_record', recordId);
    },
    [progressRecords, assertCaseNotArchived, appendAuditEvent]
  );

  const saveProgressMeasurement = useCallback(
    (
      measurementData: Partial<ProgressMeasurement> & {
        progressRecordId: string;
        caseId: string;
        patientId: string;
        measureName: string;
        category: string;
        valueType: ProgressMeasurement['valueType'];
        stage: ProgressMeasurement['stage'];
      }
    ): ProgressMeasurement => {
      assertCaseNotArchived(measurementData.caseId, 'save Progress Measurement');
      const parentRecord = progressRecords.find((r) => r.id === measurementData.progressRecordId);
      if (parentRecord?.isFinalized) {
        throw new Error('Cannot add or modify measurements of a finalized progress record.');
      }
      const now = new Date().toISOString();
      let resultMeasurement: ProgressMeasurement;
      let isUpdate = false;

      setProgressMeasurements((prev) => {
        if (measurementData.id) {
          const exists = prev.some((m) => m.id === measurementData.id);
          if (exists) {
            isUpdate = true;
            return prev.map((m) => {
              if (m.id !== measurementData.id) return m;
              resultMeasurement = {
                ...m,
                ...measurementData,
                progressRecordId: m.progressRecordId,
                caseId: m.caseId,
                patientId: m.patientId,
                updatedAt: now,
              } as ProgressMeasurement;
              return resultMeasurement;
            });
          }
        }

        isUpdate = false;
        const newId = measurementData.id || generateProgressMeasurementId();
        resultMeasurement = {
          id: newId,
          progressRecordId: measurementData.progressRecordId,
          caseId: measurementData.caseId,
          patientId: measurementData.patientId,
          measureDefinitionId: measurementData.measureDefinitionId || undefined,
          measureName: measurementData.measureName.trim(),
          category: measurementData.category.trim(),
          valueType: measurementData.valueType || 'numeric',
          unit: measurementData.unit?.trim() || undefined,
          stage: measurementData.stage || 'interim',
          numericValue:
            typeof measurementData.numericValue === 'number' && !isNaN(measurementData.numericValue)
              ? measurementData.numericValue
              : undefined,
          textValue: measurementData.textValue?.trim() || undefined,
          linkedGoalId: measurementData.linkedGoalId || undefined,
          context: measurementData.context?.trim() || undefined,
          notes: measurementData.notes?.trim() || undefined,
          createdAt: measurementData.createdAt || now,
          updatedAt: now,
        };

        return [...prev, resultMeasurement];
      });

      if (resultMeasurement!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'progress_measurement',
          resultMeasurement.id,
          measurementData.patientId,
          measurementData.caseId,
          isUpdate ? Object.keys(measurementData) : undefined
        );
      }

      return resultMeasurement!;
    },
    [progressRecords, assertCaseNotArchived, appendAuditEvent]
  );

  const deleteProgressMeasurement = useCallback(
    (measurementId: string) => {
      const measurement = progressMeasurements.find((m) => m.id === measurementId);
      if (measurement) {
        assertCaseNotArchived(measurement.caseId, 'delete Progress Measurement');
      }
      if (measurement?.progressRecordId) {
        const parent = progressRecords.find((r) => r.id === measurement.progressRecordId);
        if (parent?.isFinalized) {
          throw new Error('Cannot delete measurement from a finalized progress record.');
        }
      }
      setProgressMeasurements((prev) => prev.filter((m) => m.id !== measurementId));
      appendAuditEvent('HARD_DELETE', 'progress_measurement', measurementId);
    },
    [progressMeasurements, progressRecords, assertCaseNotArchived, appendAuditEvent]
  );

  const saveOutcomeMeasureDefinition = useCallback(
    (
      definitionData: Partial<OutcomeMeasureDefinition> & {
        name: string;
        category: OutcomeMeasureDefinition['category'];
        valueType: OutcomeMeasureDefinition['valueType'];
        directionMeaning: OutcomeMeasureDefinition['directionMeaning'];
      }
    ): OutcomeMeasureDefinition => {
      let resultDefinition: OutcomeMeasureDefinition;

      setOutcomeMeasureDefinitions((prev) => {
        if (definitionData.id) {
          const exists = prev.some((d) => d.id === definitionData.id);
          if (exists) {
            return prev.map((d) => {
              if (d.id !== definitionData.id) return d;
              resultDefinition = {
                ...d,
                ...definitionData,
              } as OutcomeMeasureDefinition;
              return resultDefinition;
            });
          }
        }

        const newId = definitionData.id || generateOutcomeMeasureDefinitionId();
        resultDefinition = {
          id: newId,
          name: definitionData.name.trim(),
          shortDescription: definitionData.shortDescription?.trim() || undefined,
          category: definitionData.category || 'custom',
          valueType: definitionData.valueType || 'numeric',
          unit: definitionData.unit?.trim() || undefined,
          minValue: typeof definitionData.minValue === 'number' ? definitionData.minValue : undefined,
          maxValue: typeof definitionData.maxValue === 'number' ? definitionData.maxValue : undefined,
          directionMeaning: definitionData.directionMeaning || 'not_defined',
          isSystemStandard: false,
        };

        return [...prev, resultDefinition];
      });

      return resultDefinition!;
    },
    []
  );

  // ==========================================
  // STAGE 7: CASE DISCHARGE & CLINICAL SUMMARY
  // ==========================================

  const getDischargeRecordForCase = useCallback(
    (caseId: string): CaseDischargeRecord | undefined => {
      return caseDischargeRecords.find((r) => r.caseId === caseId);
    },
    [caseDischargeRecords]
  );

  const saveCaseDischargeRecord = useCallback(
    (
      dischargeData: Partial<CaseDischargeRecord> & {
        caseId: string;
        patientId: string;
        dischargeReason: DischargeReason;
        episodeSummary: string;
        clinicalStatusAtDischarge: string;
      }
    ): CaseDischargeRecord => {
      assertCaseNotArchived(dischargeData.caseId, 'save Case Discharge Record');
      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];
      let resultDischarge: CaseDischargeRecord;
      let isUpdate = false;

      setCaseDischargeRecords((prev) => {
        const existingIndex = prev.findIndex((r) => r.caseId === dischargeData.caseId);
        if (existingIndex >= 0) {
          isUpdate = true;
          const existing = prev[existingIndex];
          if (existing.isFinalized) {
            throw new Error(
              'Cannot directly modify finalized Case Discharge Record. Use addCaseDischargeRecordAmendment instead.'
            );
          }
          resultDischarge = {
            ...existing,
            ...dischargeData,
            caseId: existing.caseId,
            patientId: existing.patientId,
            dischargeDate: dischargeData.dischargeDate || existing.dischargeDate || todayDate,
            dischargeReason: dischargeData.dischargeReason || existing.dischargeReason,
            episodeSummary: dischargeData.episodeSummary.trim(),
            clinicalStatusAtDischarge: dischargeData.clinicalStatusAtDischarge.trim(),
            homeMaintenancePlan: dischargeData.homeMaintenancePlan?.trim() || undefined,
            precautionsAndWarningSigns: dischargeData.precautionsAndWarningSigns?.trim() || undefined,
            referralOrFollowUp: dischargeData.referralOrFollowUp?.trim() || undefined,
            updatedAt: now,
          };
          const updated = [...prev];
          updated[existingIndex] = resultDischarge;
          return updated;
        }

        isUpdate = false;
        const newId = dischargeData.id || generateCaseDischargeRecordId();
        resultDischarge = {
          id: newId,
          caseId: dischargeData.caseId,
          patientId: dischargeData.patientId,
          dischargeDate: dischargeData.dischargeDate || todayDate,
          dischargeReason: dischargeData.dischargeReason,
          episodeSummary: dischargeData.episodeSummary.trim(),
          clinicalStatusAtDischarge: dischargeData.clinicalStatusAtDischarge.trim(),
          homeMaintenancePlan: dischargeData.homeMaintenancePlan?.trim() || undefined,
          precautionsAndWarningSigns: dischargeData.precautionsAndWarningSigns?.trim() || undefined,
          referralOrFollowUp: dischargeData.referralOrFollowUp?.trim() || undefined,
          createdAt: dischargeData.createdAt || now,
          updatedAt: now,
        };

        return [resultDischarge, ...prev];
      });

      // Synchronize case status to 'Discharged' (using existing CaseStatus model)
      setCases((prevCases) =>
        prevCases.map((c) =>
          c.id === dischargeData.caseId || c.caseId === dischargeData.caseId
            ? {
                ...c,
                status: 'Discharged' as CaseStatus,
                stage: 'discharged',
                updatedAt: now,
              }
            : c
        )
      );

      if (resultDischarge!) {
        appendAuditEvent(
          isUpdate ? 'UPDATE' : 'CREATE',
          'case_discharge_record',
          resultDischarge.id,
          dischargeData.patientId,
          dischargeData.caseId,
          isUpdate ? Object.keys(dischargeData) : undefined
        );
      }

      return resultDischarge!;
    },
    [assertCaseNotArchived, appendAuditEvent]
  );

  const deleteCaseDischargeRecord = useCallback(
    (dischargeId: string) => {
      const existing = caseDischargeRecords.find((d) => d.id === dischargeId);
      if (existing) {
        assertCaseNotArchived(existing.caseId, 'delete Case Discharge Record');
      }
      if (existing?.isFinalized) {
        throw new Error('Cannot delete a finalized case discharge record.');
      }
      setCaseDischargeRecords((prev) => prev.filter((r) => r.id !== dischargeId));
      appendAuditEvent('HARD_DELETE', 'case_discharge_record', dischargeId);
    },
    [caseDischargeRecords, assertCaseNotArchived, appendAuditEvent]
  );

  const reopenCase = useCallback(
    (caseId: string) => {
      assertCaseNotArchived(caseId, 'reopen case');
      const now = new Date().toISOString();
      setCases((prevCases) =>
        prevCases.map((c) =>
          c.id === caseId || c.caseId === caseId
            ? {
                ...c,
                status: 'Treatment' as CaseStatus,
                stage: 'treatment',
                updatedAt: now,
              }
            : c
        )
      );
    },
    [assertCaseNotArchived]
  );

  const openNewCaseModal = (patient: Patient) => {
    setActivePatientForNewCase(patient);
    setIsCreateCaseModalOpen(true);
  };

  const openEditPatientModal = (patient: Patient) => {
    setActivePatientForEdit(patient);
    setIsEditPatientModalOpen(true);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    appendAuditEvent('UPDATE', 'workspace_settings', 'settings', undefined, undefined, Object.keys(newSettings));
  };

  // Stage 13: Finalization Actions
  const finalizeSubjectiveAssessment = useCallback(
    (caseId: string) => {
      assertCaseNotArchived(caseId, 'finalize Subjective Assessment');
      const actor = getCurrentActor();
      const now = new Date().toISOString();
      let updated: SubjectiveAssessment | undefined;

      setSubjectiveAssessments((prev) =>
        prev.map((s) => {
          if (s.caseId !== caseId) return s;
          if (s.isFinalized) return s;
          updated = {
            ...s,
            status: 'completed',
            isFinalized: true,
            finalizedAt: now,
            finalizedBy: actor,
            updatedAt: now,
          };
          return updated;
        })
      );

      if (updated) {
        appendAuditEvent('FINALIZE', 'subjective_assessment', updated.id, updated.patientId, caseId);
      }
    },
    [assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  const finalizeObjectiveAssessment = useCallback(
    (caseId: string) => {
      assertCaseNotArchived(caseId, 'finalize Objective Assessment');
      const actor = getCurrentActor();
      const now = new Date().toISOString();
      let updated: ObjectiveAssessment | undefined;

      setObjectiveAssessments((prev) =>
        prev.map((o) => {
          if (o.caseId !== caseId) return o;
          if (o.isFinalized) return o;
          updated = {
            ...o,
            status: 'completed',
            isFinalized: true,
            finalizedAt: now,
            finalizedBy: actor,
            updatedAt: now,
          };
          return updated;
        })
      );

      if (updated) {
        appendAuditEvent('FINALIZE', 'objective_assessment', updated.id, updated.patientId, caseId);
      }
    },
    [assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  const finalizeClinicalSession = useCallback(
    (sessionId: string) => {
      const targetSession = clinicalSessions.find((s) => s.id === sessionId);
      if (targetSession) {
        assertCaseNotArchived(targetSession.caseId, 'finalize Clinical Session');
      }
      const actor = getCurrentActor();
      const now = new Date().toISOString();
      let updated: ClinicalSession | undefined;

      setClinicalSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          if (s.isFinalized) return s;
          updated = {
            ...s,
            status: 'completed',
            isFinalized: true,
            finalizedAt: now,
            finalizedBy: actor,
            updatedAt: now,
          };
          return updated;
        })
      );

      if (updated) {
        appendAuditEvent('FINALIZE', 'clinical_session', updated.id, updated.patientId, updated.caseId);
      }
    },
    [clinicalSessions, assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  const finalizeCaseDischargeRecord = useCallback(
    (dischargeId: string) => {
      const targetRecord = caseDischargeRecords.find((d) => d.id === dischargeId);
      if (targetRecord) {
        assertCaseNotArchived(targetRecord.caseId, 'finalize Case Discharge Record');
      }
      const actor = getCurrentActor();
      const now = new Date().toISOString();
      let updated: CaseDischargeRecord | undefined;

      setCaseDischargeRecords((prev) =>
        prev.map((d) => {
          if (d.id !== dischargeId) return d;
          if (d.isFinalized) return d;
          updated = {
            ...d,
            status: 'completed',
            isFinalized: true,
            finalizedAt: now,
            finalizedBy: actor,
            updatedAt: now,
          };
          return updated;
        })
      );

      if (updated) {
        appendAuditEvent('FINALIZE', 'case_discharge_record', updated.id, updated.patientId, updated.caseId);
      }
    },
    [caseDischargeRecords, assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  // Stage 13: Clinical Amendments
  const addSubjectiveAssessmentAmendment = useCallback(
    (
      caseId: string,
      reason: 'correction' | 'late_entry' | 'clinical_update',
      text: string
    ) => {
      assertCaseNotArchived(caseId, 'amend Subjective Assessment');
      const actor = getCurrentActor();
      const amendment = createClinicalNoteAmendment(actor, reason, text);
      let target: SubjectiveAssessment | undefined;

      setSubjectiveAssessments((prev) =>
        prev.map((s) => {
          if (s.caseId !== caseId) return s;
          if (!s.isFinalized) {
            throw new Error(
              'Cannot add amendment to a non-finalized Subjective Assessment. Edit directly instead.'
            );
          }
          target = {
            ...s,
            amendments: [...(s.amendments || []), amendment],
            updatedAt: new Date().toISOString(),
          };
          return target;
        })
      );

      if (target) {
        appendAuditEvent(
          'AMEND',
          'subjective_assessment',
          target.id,
          target.patientId,
          caseId,
          ['amendments'],
          reason
        );
      }
    },
    [assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  const addObjectiveAssessmentAmendment = useCallback(
    (
      caseId: string,
      reason: 'correction' | 'late_entry' | 'clinical_update',
      text: string
    ) => {
      assertCaseNotArchived(caseId, 'amend Objective Assessment');
      const actor = getCurrentActor();
      const amendment = createClinicalNoteAmendment(actor, reason, text);
      let target: ObjectiveAssessment | undefined;

      setObjectiveAssessments((prev) =>
        prev.map((o) => {
          if (o.caseId !== caseId) return o;
          if (!o.isFinalized) {
            throw new Error(
              'Cannot add amendment to a non-finalized Objective Assessment. Edit directly instead.'
            );
          }
          target = {
            ...o,
            amendments: [...(o.amendments || []), amendment],
            updatedAt: new Date().toISOString(),
          };
          return target;
        })
      );

      if (target) {
        appendAuditEvent(
          'AMEND',
          'objective_assessment',
          target.id,
          target.patientId,
          caseId,
          ['amendments'],
          reason
        );
      }
    },
    [assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  const addClinicalSessionAmendment = useCallback(
    (
      sessionId: string,
      reason: 'correction' | 'late_entry' | 'clinical_update',
      text: string
    ) => {
      const targetSession = clinicalSessions.find((s) => s.id === sessionId);
      if (targetSession) {
        assertCaseNotArchived(targetSession.caseId, 'amend Clinical Session');
      }
      const actor = getCurrentActor();
      const amendment = createClinicalNoteAmendment(actor, reason, text);
      let target: ClinicalSession | undefined;

      setClinicalSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          if (!s.isFinalized) {
            throw new Error(
              'Cannot add amendment to a non-finalized Clinical Session. Edit directly instead.'
            );
          }
          target = {
            ...s,
            amendments: [...(s.amendments || []), amendment],
            updatedAt: new Date().toISOString(),
          };
          return target;
        })
      );

      if (target) {
        appendAuditEvent(
          'AMEND',
          'clinical_session',
          target.id,
          target.patientId,
          target.caseId,
          ['amendments'],
          reason
        );
      }
    },
    [clinicalSessions, assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  const addCaseDischargeRecordAmendment = useCallback(
    (
      dischargeId: string,
      reason: 'correction' | 'late_entry' | 'clinical_update',
      text: string
    ) => {
      const targetRecord = caseDischargeRecords.find((d) => d.id === dischargeId);
      if (targetRecord) {
        assertCaseNotArchived(targetRecord.caseId, 'amend Case Discharge Record');
      }
      const actor = getCurrentActor();
      const amendment = createClinicalNoteAmendment(actor, reason, text);
      let target: CaseDischargeRecord | undefined;

      setCaseDischargeRecords((prev) =>
        prev.map((d) => {
          if (d.id !== dischargeId) return d;
          if (!d.isFinalized) {
            throw new Error(
              'Cannot add amendment to a non-finalized Case Discharge Record. Edit directly instead.'
            );
          }
          target = {
            ...d,
            amendments: [...(d.amendments || []), amendment],
            updatedAt: new Date().toISOString(),
          };
          return target;
        })
      );

      if (target) {
        appendAuditEvent(
          'AMEND',
          'case_discharge_record',
          target.id,
          target.patientId,
          target.caseId,
          ['amendments'],
          reason
        );
      }
    },
    [caseDischargeRecords, assertCaseNotArchived, getCurrentActor, appendAuditEvent]
  );

  // Stage 13: Optional Prune Audit Log Maintenance (leaves anchor event)
  const pruneAuditLog = useCallback(
    (olderThanDate: string, archiveChecksum: string): number => {
      let prunedCount = 0;
      const actor = getCurrentActor();
      setAuditEvents((prev) => {
        const eligible = prev.filter((e) => e.occurredAt <= olderThanDate);
        prunedCount = eligible.length;
        if (prunedCount === 0) return prev;

        const retained = prev.filter((e) => e.occurredAt > olderThanDate);
        const nextSeq = getNextSequence(prev);
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
            prunedEventCount: prunedCount,
            archiveChecksum,
            cutoffDate: olderThanDate,
          },
        };
        return [...retained, anchorEvent];
      });
      return prunedCount;
    },
    [getCurrentActor]
  );

  // Stage 12: Local-First Workspace Backup & Disaster Recovery Boundary
  const getAuthoritativeWorkspaceDataset = useCallback((): AuthoritativeWorkspaceDataset => {
    return {
      settings,
      patients,
      cases,
      subjectiveAssessments,
      clinicalThreads,
      objectiveAssessments,
      clinicalProblems,
      clinicalGoals,
      treatmentPlans,
      treatmentSelections,
      treatmentEvidenceLinks,
      treatmentConditionLinks,
      evidenceSources,
      evidenceItems,
      conditionPresentations,
      conditionEvidenceLinks,
      clinicalInvestigations,
      clinicalSessions,
      sessionTreatmentDeliveries,
      outcomeMeasureDefinitions,
      progressRecords,
      progressMeasurements,
      caseDischargeRecords,
      auditEvents,
    };
  }, [
    settings,
    patients,
    cases,
    subjectiveAssessments,
    clinicalThreads,
    objectiveAssessments,
    clinicalProblems,
    clinicalGoals,
    treatmentPlans,
    treatmentSelections,
    treatmentEvidenceLinks,
    treatmentConditionLinks,
    evidenceSources,
    evidenceItems,
    conditionPresentations,
    conditionEvidenceLinks,
    clinicalInvestigations,
    clinicalSessions,
    sessionTreatmentDeliveries,
    outcomeMeasureDefinitions,
    progressRecords,
    progressMeasurements,
    caseDischargeRecords,
    auditEvents,
  ]);

  const restoreWorkspaceDataset = useCallback((newDataset: AuthoritativeWorkspaceDataset): void => {
    setSettings(newDataset.settings);
    setPatients(newDataset.patients);
    setCases(newDataset.cases);
    setSubjectiveAssessments(newDataset.subjectiveAssessments);
    setClinicalThreads(newDataset.clinicalThreads);
    setObjectiveAssessments(newDataset.objectiveAssessments);
    setClinicalProblems(newDataset.clinicalProblems);
    setClinicalGoals(newDataset.clinicalGoals);
    setTreatmentPlans(newDataset.treatmentPlans);
    setTreatmentSelections(newDataset.treatmentSelections);
    setTreatmentEvidenceLinks(newDataset.treatmentEvidenceLinks);
    setTreatmentConditionLinks(newDataset.treatmentConditionLinks);
    setEvidenceSources(newDataset.evidenceSources);
    setEvidenceItems(newDataset.evidenceItems);
    setConditionPresentations(newDataset.conditionPresentations);
    setConditionEvidenceLinks(newDataset.conditionEvidenceLinks);
    setClinicalInvestigations(newDataset.clinicalInvestigations);
    setClinicalSessions(newDataset.clinicalSessions);
    setSessionTreatmentDeliveries(newDataset.sessionTreatmentDeliveries);
    setOutcomeMeasureDefinitions(newDataset.outcomeMeasureDefinitions);
    setProgressRecords(newDataset.progressRecords);
    setProgressMeasurements(newDataset.progressMeasurements);
    setCaseDischargeRecords(newDataset.caseDischargeRecords);
    setAuditEvents(newDataset.auditEvents || []);

    // Reset transient navigation and selection pointers
    setSelectedPatientId(null);
    setSelectedCaseId(null);
    setActiveAssessmentCaseId(null);
  }, []);

  return (
    <ClinicalContext.Provider
      value={{
        patients,
        cases,
        reviewsTodayCount: 0,
        addPatient,
        updatePatient,
        updatePatientSafetyProfile,
        verifyPatientSafetyItem,
        addCase,
        updateCase,
        archiveCase,
        unarchiveCase,
        getCasesForPatient,
        subjectiveAssessments,
        getSubjectiveAssessment,
        saveSubjectiveAssessment,
        activeAssessmentCaseId,
        setActiveAssessmentCaseId,
        openSubjectiveAssessment,
        closeSubjectiveAssessment,
        clinicalThreads,
        getClinicalThreadsForCase,
        getClinicalThread,
        generateClinicalThreadsForCase,
        updateClinicalThreadStatus,
        updateClinicalThreadNotes,
        objectiveAssessments,
        getObjectiveAssessment,
        saveObjectiveAssessment,
        clinicalProblems,
        getClinicalProblemsForCase,
        saveClinicalProblem,
        updateClinicalProblemStatus,
        deleteClinicalProblem,
        clinicalGoals,
        getClinicalGoalsForCase,
        saveClinicalGoal,
        updateClinicalGoalStatus,
        deleteClinicalGoal,
        treatmentPlans,
        treatmentSelections,
        getTreatmentPlansForCase,
        getTreatmentPlanById,
        saveTreatmentPlan,
        updateTreatmentPlanStatus,
        deleteTreatmentPlan,
        getTreatmentSelectionsForCase,
        getTreatmentSelectionsForPlan,
        saveTreatmentSelection,
        updateTreatmentSelectionStatus,
        deleteTreatmentSelection,
        treatmentEvidenceLinks,
        treatmentConditionLinks,
        getEvidenceLinksForTreatment,
        getConditionLinksForTreatment,
        linkEvidenceToTreatment,
        unlinkEvidenceFromTreatment,
        linkConditionToTreatment,
        unlinkConditionFromTreatment,
        evidenceSources,
        evidenceItems,
        getEvidenceSourceById,
        getEvidenceItemsForSource,
        saveEvidenceSource,
        updateEvidenceSourceStatus,
        deleteEvidenceSource,
        saveEvidenceItem,
        deleteEvidenceItem,
        conditionPresentations,
        conditionEvidenceLinks,
        getConditionPresentationById,
        getLinksForCondition,
        getEvidenceItemsForCondition,
        getConditionsForEvidenceItem,
        saveConditionPresentation,
        updateConditionStatus,
        deleteConditionPresentation,
        linkEvidenceToCondition,
        unlinkEvidenceFromCondition,
        unlinkEvidenceItemFromAllConditions,
        clinicalInvestigations,
        getClinicalInvestigationsForCase,
        getClinicalInvestigationById,
        saveClinicalInvestigation,
        deleteClinicalInvestigation,
        clinicalSessions,
        sessionTreatmentDeliveries,
        getSessionsForCase,
        getSessionById,
        getDeliveriesForSession,
        getDeliveriesForTreatmentSelection,
        saveClinicalSession,
        updateClinicalSessionStatus,
        deleteClinicalSession,
        saveSessionTreatmentDelivery,
        deleteSessionTreatmentDelivery,
        progressRecords,
        progressMeasurements,
        outcomeMeasureDefinitions,
        getProgressRecordsForCase,
        getProgressRecordById,
        getMeasurementsForRecord,
        getMeasurementsForCase,
        getMeasurementsByMeasureName,
        saveProgressRecord,
        deleteProgressRecord,
        saveProgressMeasurement,
        deleteProgressMeasurement,
        saveOutcomeMeasureDefinition,
        caseDischargeRecords,
        getDischargeRecordForCase,
        saveCaseDischargeRecord,
        deleteCaseDischargeRecord,
        reopenCase,
        selectedPatientId,
        setSelectedPatientId,
        selectedCaseId,
        setSelectedCaseId,
        isAddPatientModalOpen,
        setIsAddPatientModalOpen,
        isCreateCaseModalOpen,
        setIsCreateCaseModalOpen,
        activePatientForNewCase,
        openNewCaseModal,
        isEditPatientModalOpen,
        setIsEditPatientModalOpen,
        activePatientForEdit,
        openEditPatientModal,
        settings,
        updateSettings,
        getAuthoritativeWorkspaceDataset,
        restoreWorkspaceDataset,
        auditEvents,
        finalizeSubjectiveAssessment,
        finalizeObjectiveAssessment,
        finalizeClinicalSession,
        finalizeCaseDischargeRecord,
        addSubjectiveAssessmentAmendment,
        addObjectiveAssessmentAmendment,
        addClinicalSessionAmendment,
        addCaseDischargeRecordAmendment,
        pruneAuditLog,
        auditStorageWarning,
      }}
    >
      {children}
    </ClinicalContext.Provider>
  );
};

export const useClinical = () => {
  const context = useContext(ClinicalContext);
  if (!context) {
    throw new Error('useClinical must be used within a ClinicalProvider');
  }
  return context;
};
