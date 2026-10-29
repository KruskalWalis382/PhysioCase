import {
  Case,
  Patient,
  ClinicalSession,
  ProgressRecord,
  ProgressMeasurement,
  ClinicalGoal,
  TreatmentPlan,
  TreatmentSelection,
  ObjectiveAssessment,
  SubjectiveAssessment,
  AppSettings,
} from '../types';

/**
 * Standard governance configuration constants.
 * Exposed deterministically without scattered hardcoded values.
 */
export const DEFAULT_STALLED_CASE_DAYS = 28; // 4 weeks of silence indicates a stalled active case
export const DEFAULT_REVIEW_DUE_SOON_DAYS = 7; // Flagged as 'due_soon' within 7 days of review date

/**
 * Review status derived from review cadence and clinical records
 */
export type GovernanceReviewStatus =
  | 'not_due'
  | 'due_soon'
  | 'due'
  | 'overdue'
  | 'not_applicable'; // e.g. discharged

/**
 * Clinical activity/stall status derived from sessions, progress records, or assessments
 */
export type GovernanceActivityStatus =
  | 'active'
  | 'stalled'
  | 'not_applicable'; // e.g. discharged

/**
 * Stage-aware documentation status
 */
export type GovernanceDocumentationStatus =
  | 'complete'
  | 'partially_documented'
  | 'missing_documentation'
  | 'not_applicable';

/**
 * Categorized missing documentation items
 */
export type GovernanceMissingItem =
  | 'subjective_assessment'
  | 'objective_assessment'
  | 'clinical_problems'
  | 'clinical_goals'
  | 'treatment_plan'
  | 'treatment_selections'
  | 'baseline_outcome_measurement'
  | 'progress_evaluation';

export interface MissingDocumentationDetail {
  item: GovernanceMissingItem;
  label: string;
  targetSection:
    | 'subjective'
    | 'objective'
    | 'reasoning'
    | 'goals'
    | 'treatment'
    | 'sessions'
    | 'progress'
    | 'discharge';
}

/**
 * Derived governance summary for a single case
 */
export interface CaseGovernanceSummary {
  caseId: string; // The primary internal ID of the case
  displayCaseId: string; // e.g. CASE-0001
  caseName: string;
  patientId: string;
  patientName: string;
  patientNumber?: string;
  status: Case['status'];
  stage: Case['stage'] | string;
  isDischarged: boolean;
  isArchived: boolean;

  // Review status
  reviewStatus: GovernanceReviewStatus;
  reviewDueDate?: string; // ISO date YYYY-MM-DD
  reviewDaysRemaining?: number; // negative if overdue, positive if in future
  reviewCadenceWeeks: number;

  // Activity / Stalled status
  activityStatus: GovernanceActivityStatus;
  lastClinicalActivityDate?: string; // ISO date YYYY-MM-DD
  daysSinceClinicalActivity?: number;

  // Documentation completeness
  documentationStatus: GovernanceDocumentationStatus;
  missingItems: MissingDocumentationDetail[];

  // Counts for context
  sessionCount: number;
  progressRecordCount: number;
  goalCount: number;
  activeGoalCount: number;
  treatmentPlanCount: number;
  treatmentSelectionCount: number;
  hasBaselineOutcome: boolean;
}

/**
 * Aggregate caseload governance summary across all cases
 */
export interface CaseloadGovernanceSummary {
  totalPatients: number;
  totalCases: number;
  activeCasesCount: number;
  dischargedCasesCount: number;
  archivedCasesCount: number;

  // Key actionable governance metrics
  reviewsDueCount: number; // Includes both 'due' and 'due_soon'
  reviewsOverdueCount: number; // Specifically 'overdue'
  stalledCasesCount: number; // Active cases with no documented activity >= DEFAULT_STALLED_CASE_DAYS
  documentationGapsCount: number; // Active cases with 'missing_documentation' or 'partially_documented'

  // Stage distribution
  stageDistribution: {
    assessment: number;
    treatment: number;
    reassessment: number;
    discharged: number;
  };

  // Case summaries
  caseSummaries: CaseGovernanceSummary[];
}

/**
 * Computes date difference in calendar days (date2 - date1)
 */
function differenceInDays(laterDateIso: string, earlierDateIso: string): number {
  const d1 = new Date(earlierDateIso);
  const d2 = new Date(laterDateIso);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
function formatDateToIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Pure function to derive the governance summary for a single case.
 */
export function deriveCaseGovernanceSummary(
  caseItem: Case,
  patient: Patient | undefined,
  contextData: {
    subjectiveAssessment?: SubjectiveAssessment;
    objectiveAssessment?: ObjectiveAssessment;
    hasClinicalProblems: boolean;
    goals: ClinicalGoal[];
    treatmentPlans: TreatmentPlan[];
    treatmentSelections: TreatmentSelection[];
    sessions: ClinicalSession[];
    progressRecords: ProgressRecord[];
    progressMeasurements: ProgressMeasurement[];
    settings: AppSettings;
    todayIso?: string; // Allows deterministic testing
  }
): CaseGovernanceSummary {
  const today = contextData.todayIso ? new Date(contextData.todayIso) : new Date();
  const todayIso = formatDateToIso(today);
  const isDischarged =
    caseItem.status === 'Discharged' ||
    (caseItem.stage && caseItem.stage.toLowerCase() === 'discharged');
  const isArchived = Boolean(caseItem.isArchived);

  const cadenceWeeks = contextData.settings.reviewCadenceWeeks || 4;
  const cadenceDays = cadenceWeeks * 7;

  // 1. Gather all documented clinical activity timestamps
  const activityDates: string[] = [];
  if (caseItem.startDate) activityDates.push(caseItem.startDate.split('T')[0]);
  if (caseItem.lastSessionDate) activityDates.push(caseItem.lastSessionDate.split('T')[0]);
  if (caseItem.updatedAt) activityDates.push(caseItem.updatedAt.split('T')[0]);

  if (contextData.subjectiveAssessment?.updatedAt) {
    activityDates.push(contextData.subjectiveAssessment.updatedAt.split('T')[0]);
  }
  if (contextData.objectiveAssessment?.updatedAt) {
    activityDates.push(contextData.objectiveAssessment.updatedAt.split('T')[0]);
  }

  for (const s of contextData.sessions) {
    if (s.sessionDate) activityDates.push(s.sessionDate.split('T')[0]);
    if (s.updatedAt) activityDates.push(s.updatedAt.split('T')[0]);
  }

  for (const p of contextData.progressRecords) {
    if (p.recordDate) activityDates.push(p.recordDate.split('T')[0]);
    if (p.updatedAt) activityDates.push(p.updatedAt.split('T')[0]);
  }

  // Sort latest first
  activityDates.sort((a, b) => b.localeCompare(a));
  const latestActivityDate = activityDates[0] || (caseItem.createdAt ? caseItem.createdAt.split('T')[0] : todayIso);
  const daysSinceActivity = Math.max(0, differenceInDays(todayIso, latestActivityDate));

  // 2. Derive Review Status
  let reviewStatus: GovernanceReviewStatus = 'not_applicable';
  let reviewDueDate: string | undefined = undefined;
  let reviewDaysRemaining: number | undefined = undefined;

  if (!isDischarged && !isArchived) {
    // If case has explicit nextReviewDate, use it. Otherwise derive from latest review activity or startDate.
    if (caseItem.nextReviewDate) {
      reviewDueDate = caseItem.nextReviewDate.split('T')[0];
    } else {
      // Find latest progress review date or fallback to latest activity
      const latestProgressDate = contextData.progressRecords.map((p) => p.recordDate).sort((a, b) => b.localeCompare(a))[0];
      const baseReviewReference = latestProgressDate || latestActivityDate;
      const baseDate = new Date(baseReviewReference);
      baseDate.setDate(baseDate.getDate() + cadenceDays);
      reviewDueDate = formatDateToIso(baseDate);
    }

    if (reviewDueDate) {
      reviewDaysRemaining = differenceInDays(reviewDueDate, todayIso);
      if (reviewDaysRemaining < 0) {
        reviewStatus = 'overdue';
      } else if (reviewDaysRemaining === 0) {
        reviewStatus = 'due';
      } else if (reviewDaysRemaining <= DEFAULT_REVIEW_DUE_SOON_DAYS) {
        reviewStatus = 'due_soon';
      } else {
        reviewStatus = 'not_due';
      }
    } else {
      reviewStatus = 'not_due';
    }
  }

  // 3. Derive Activity / Stalled Status
  let activityStatus: GovernanceActivityStatus = 'not_applicable';
  if (!isDischarged && !isArchived) {
    if (daysSinceActivity >= DEFAULT_STALLED_CASE_DAYS) {
      activityStatus = 'stalled';
    } else {
      activityStatus = 'active';
    }
  }

  // 4. Derive Stage-Aware Documentation Completeness
  const missingItems: MissingDocumentationDetail[] = [];
  const normalizedStage = (caseItem.stage?.toLowerCase() || caseItem.status.toLowerCase()) as
    | 'assessment'
    | 'treatment'
    | 'reassessment'
    | 'discharged';

  const hasSubjective = Boolean(
    contextData.subjectiveAssessment &&
      (contextData.subjectiveAssessment.status === 'completed' ||
        contextData.subjectiveAssessment.patientStory?.trim().length > 0)
  );

  const hasObjective = Boolean(
    contextData.objectiveAssessment &&
      (contextData.objectiveAssessment.status === 'completed' ||
        (contextData.objectiveAssessment.findings &&
          contextData.objectiveAssessment.findings.length > 0))
  );

  const hasProblems = contextData.hasClinicalProblems;
  const activeGoals = contextData.goals.filter((g) => g.status === 'active');
  const hasActiveGoals = activeGoals.length > 0;
  const hasTreatmentPlan = contextData.treatmentPlans.some((p) => p.status === 'active');
  const hasTreatmentSelections = contextData.treatmentSelections.length > 0;
  const hasBaselineOutcome = contextData.progressMeasurements.some(
    (m) => m.stage === 'baseline'
  );
  const hasProgress = contextData.progressRecords.length > 0;

  if (!isDischarged && !isArchived) {
    // Stage-aware evaluation:
    if (normalizedStage === 'assessment') {
      if (!hasSubjective) {
        missingItems.push({
          item: 'subjective_assessment',
          label: 'Subjective Assessment',
          targetSection: 'subjective',
        });
      }
      if (!hasObjective) {
        missingItems.push({
          item: 'objective_assessment',
          label: 'Objective Examination',
          targetSection: 'objective',
        });
      }
      if (!hasProblems) {
        missingItems.push({
          item: 'clinical_problems',
          label: 'Clinical Reasoning / Problems',
          targetSection: 'reasoning',
        });
      }
    } else if (normalizedStage === 'treatment') {
      if (!hasSubjective) {
        missingItems.push({
          item: 'subjective_assessment',
          label: 'Subjective Assessment',
          targetSection: 'subjective',
        });
      }
      if (!hasObjective) {
        missingItems.push({
          item: 'objective_assessment',
          label: 'Objective Examination',
          targetSection: 'objective',
        });
      }
      if (!hasActiveGoals) {
        missingItems.push({
          item: 'clinical_goals',
          label: 'Active Clinical Goals',
          targetSection: 'goals',
        });
      }
      if (!hasTreatmentPlan) {
        missingItems.push({
          item: 'treatment_plan',
          label: 'Active Treatment Plan',
          targetSection: 'treatment',
        });
      }
      if (!hasTreatmentSelections) {
        missingItems.push({
          item: 'treatment_selections',
          label: 'Prescribed Interventions',
          targetSection: 'treatment',
        });
      }
    } else if (normalizedStage === 'reassessment') {
      if (!hasActiveGoals && contextData.goals.length === 0) {
        missingItems.push({
          item: 'clinical_goals',
          label: 'Clinical Goals',
          targetSection: 'goals',
        });
      }
      if (!hasProgress) {
        missingItems.push({
          item: 'progress_evaluation',
          label: 'Progress / Reassessment Review',
          targetSection: 'progress',
        });
      }
    }
  }

  let documentationStatus: GovernanceDocumentationStatus = 'not_applicable';
  if (!isDischarged && !isArchived) {
    if (missingItems.length === 0) {
      documentationStatus = 'complete';
    } else if (missingItems.length <= 2) {
      documentationStatus = 'partially_documented';
    } else {
      documentationStatus = 'missing_documentation';
    }
  }

  return {
    caseId: caseItem.id,
    displayCaseId: caseItem.caseId || caseItem.id,
    caseName: caseItem.caseName || caseItem.title || 'Untitled Case',
    patientId: caseItem.patientId,
    patientName: patient ? patient.fullName : caseItem.patientName || 'Unknown Patient',
    patientNumber: patient?.patientNumber,
    status: caseItem.status,
    stage: caseItem.stage || caseItem.status.toLowerCase(),
    isDischarged,
    isArchived,

    reviewStatus,
    reviewDueDate,
    reviewDaysRemaining,
    reviewCadenceWeeks: cadenceWeeks,

    activityStatus,
    lastClinicalActivityDate: latestActivityDate,
    daysSinceClinicalActivity: daysSinceActivity,

    documentationStatus,
    missingItems,

    sessionCount: contextData.sessions.length,
    progressRecordCount: contextData.progressRecords.length,
    goalCount: contextData.goals.length,
    activeGoalCount: activeGoals.length,
    treatmentPlanCount: contextData.treatmentPlans.length,
    treatmentSelectionCount: contextData.treatmentSelections.length,
    hasBaselineOutcome,
  };
}

/**
 * Pure function to derive caseload governance summary across all cases and patients.
 * Optimized with indexed maps for high performance.
 */
export function deriveCaseloadGovernance(data: {
  cases: Case[];
  patients: Patient[];
  subjectiveAssessments: SubjectiveAssessment[];
  objectiveAssessments: ObjectiveAssessment[];
  clinicalProblems: { caseId: string }[];
  clinicalGoals: ClinicalGoal[];
  treatmentPlans: TreatmentPlan[];
  treatmentSelections: TreatmentSelection[];
  clinicalSessions: ClinicalSession[];
  progressRecords: ProgressRecord[];
  progressMeasurements: ProgressMeasurement[];
  settings: AppSettings;
  todayIso?: string;
}): CaseloadGovernanceSummary {
  const {
    cases,
    patients,
    subjectiveAssessments,
    objectiveAssessments,
    clinicalProblems,
    clinicalGoals,
    treatmentPlans,
    treatmentSelections,
    clinicalSessions,
    progressRecords,
    progressMeasurements,
    settings,
    todayIso,
  } = data;

  // Build indexed lookup maps by caseId
  const patientMap = new Map<string, Patient>();
  for (const p of patients) {
    patientMap.set(p.id, p);
  }

  const subjectiveMap = new Map<string, SubjectiveAssessment>();
  for (const s of subjectiveAssessments) {
    subjectiveMap.set(s.caseId, s);
  }

  const objectiveMap = new Map<string, ObjectiveAssessment>();
  for (const o of objectiveAssessments) {
    objectiveMap.set(o.caseId, o);
  }

  const problemsSet = new Set<string>();
  for (const pr of clinicalProblems) {
    problemsSet.add(pr.caseId);
  }

  const goalsByCase = new Map<string, ClinicalGoal[]>();
  for (const g of clinicalGoals) {
    const list = goalsByCase.get(g.caseId) || [];
    list.push(g);
    goalsByCase.set(g.caseId, list);
  }

  const plansByCase = new Map<string, TreatmentPlan[]>();
  for (const tp of treatmentPlans) {
    const list = plansByCase.get(tp.caseId) || [];
    list.push(tp);
    plansByCase.set(tp.caseId, list);
  }

  const selectionsByCase = new Map<string, TreatmentSelection[]>();
  for (const ts of treatmentSelections) {
    const list = selectionsByCase.get(ts.caseId) || [];
    list.push(ts);
    selectionsByCase.set(ts.caseId, list);
  }

  const sessionsByCase = new Map<string, ClinicalSession[]>();
  for (const cs of clinicalSessions) {
    const list = sessionsByCase.get(cs.caseId) || [];
    list.push(cs);
    sessionsByCase.set(cs.caseId, list);
  }

  const progressByCase = new Map<string, ProgressRecord[]>();
  for (const pr of progressRecords) {
    const list = progressByCase.get(pr.caseId) || [];
    list.push(pr);
    progressByCase.set(pr.caseId, list);
  }

  const measurementsByCase = new Map<string, ProgressMeasurement[]>();
  for (const pm of progressMeasurements) {
    const list = measurementsByCase.get(pm.caseId) || [];
    list.push(pm);
    measurementsByCase.set(pm.caseId, list);
  }

  const caseSummaries: CaseGovernanceSummary[] = [];

  let activeCasesCount = 0;
  let dischargedCasesCount = 0;
  let archivedCasesCount = 0;
  let reviewsDueCount = 0;
  let reviewsOverdueCount = 0;
  let stalledCasesCount = 0;
  let documentationGapsCount = 0;

  const stageDistribution = {
    assessment: 0,
    treatment: 0,
    reassessment: 0,
    discharged: 0,
  };

  for (const c of cases) {
    const summary = deriveCaseGovernanceSummary(c, patientMap.get(c.patientId), {
      subjectiveAssessment: subjectiveMap.get(c.id),
      objectiveAssessment: objectiveMap.get(c.id),
      hasClinicalProblems: problemsSet.has(c.id),
      goals: goalsByCase.get(c.id) || [],
      treatmentPlans: plansByCase.get(c.id) || [],
      treatmentSelections: selectionsByCase.get(c.id) || [],
      sessions: sessionsByCase.get(c.id) || [],
      progressRecords: progressByCase.get(c.id) || [],
      progressMeasurements: measurementsByCase.get(c.id) || [],
      settings,
      todayIso,
    });

    caseSummaries.push(summary);

    if (summary.isDischarged) {
      dischargedCasesCount++;
      stageDistribution.discharged++;
    } else if (summary.isArchived) {
      archivedCasesCount++;
    } else {
      activeCasesCount++;
      const normStage = (c.stage?.toLowerCase() || c.status.toLowerCase()) as
        | 'assessment'
        | 'treatment'
        | 'reassessment';
      if (normStage === 'assessment') stageDistribution.assessment++;
      else if (normStage === 'treatment') stageDistribution.treatment++;
      else if (normStage === 'reassessment') stageDistribution.reassessment++;
      else stageDistribution.treatment++;

      if (summary.reviewStatus === 'overdue') {
        reviewsOverdueCount++;
        reviewsDueCount++;
      } else if (summary.reviewStatus === 'due' || summary.reviewStatus === 'due_soon') {
        reviewsDueCount++;
      }

      if (summary.activityStatus === 'stalled') {
        stalledCasesCount++;
      }

      if (
        summary.documentationStatus === 'missing_documentation' ||
        summary.documentationStatus === 'partially_documented'
      ) {
        documentationGapsCount++;
      }
    }
  }

  return {
    totalPatients: patients.length,
    totalCases: cases.length,
    activeCasesCount,
    dischargedCasesCount,
    archivedCasesCount,
    reviewsDueCount,
    reviewsOverdueCount,
    stalledCasesCount,
    documentationGapsCount,
    stageDistribution,
    caseSummaries,
  };
}
