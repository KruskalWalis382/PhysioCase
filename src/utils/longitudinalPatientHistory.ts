/**
 * PhysioCase — Stage 10: Longitudinal Patient History & Cumulative Chart Foundation
 * Pure Selector & Derivation Module
 *
 * Rules:
 * 1. Pure functions only — NO mutations, NO localStorage access, NO external APIs.
 * 2. Source-backed only — timeline events and summaries reflect documented records only.
 * 3. Descriptive only — NO manufactured clinical interpretations, efficacy claims, or artificial recovery scores.
 * 4. Patient-isolated — selectors operate strictly on records belonging to the specified patient.
 */

import {
  Patient,
  Case,
  CaseStatus,
  SubjectiveAssessment,
  ObjectiveAssessment,
  ClinicalInvestigation,
  ClinicalProblem,
  ClinicalGoal,
  ClinicalSession,
  SessionTreatmentDelivery,
  ProgressRecord,
  ProgressMeasurement,
  CaseDischargeRecord,
  PatientSafetyProfile,
  PatientSafetyAlertsSummary,
  PatientTimelineEvent,
  HistoricalCaseSummary,
  CumulativeProblemItem,
  HistoricalTreatmentContextItem,
  LongitudinalMeasureSeries,
  LongitudinalOutcomePoint,
  OutcomeMeasureDefinition,
  MeasurementValueType,
  MeasurementDirectionMeaning,
  CaseLongitudinalContextViewModel,
} from '../types';
import { INITIAL_OUTCOME_MEASURE_DEFINITIONS } from './clinicalProgress';

/**
 * Encapsulated dataset containing all clinical collections required for derivation.
 * Pure references only — zero duplication of underlying data.
 */
export interface LongitudinalClinicalDataset {
  patients: Patient[];
  cases: Case[];
  subjectiveAssessments: SubjectiveAssessment[];
  objectiveAssessments: ObjectiveAssessment[];
  clinicalInvestigations: ClinicalInvestigation[];
  clinicalProblems: ClinicalProblem[];
  clinicalGoals: ClinicalGoal[];
  clinicalSessions: ClinicalSession[];
  sessionTreatmentDeliveries: SessionTreatmentDelivery[];
  progressRecords: ProgressRecord[];
  progressMeasurements: ProgressMeasurement[];
  caseDischargeRecords: CaseDischargeRecord[];
}

// ==========================================
// 1. PATIENT SAFETY ALERTS DERIVATION
// ==========================================

export const DEFAULT_PATIENT_SAFETY_PROFILE: PatientSafetyProfile = {
  allergies: [],
  persistentPrecautions: [],
  surgicalHistory: [],
  persistentMedicalConditions: [],
};

/**
 * Derives a structured summary of persistent patient safety items.
 * Strictly patient-level (allergies, enduring precautions, surgical history, persistent medical conditions).
 * Red flags from individual cases are NOT converted into persistent alerts.
 */
export function derivePatientSafetyAlerts(patient: Patient | undefined | null): PatientSafetyAlertsSummary {
  const profile = patient?.patientSafetyProfile || DEFAULT_PATIENT_SAFETY_PROFILE;
  const allergies = profile.allergies || [];
  const persistentPrecautions = profile.persistentPrecautions || [];
  const surgicalHistory = profile.surgicalHistory || [];
  const persistentMedicalConditions = profile.persistentMedicalConditions || [];

  const allItems = [
    ...allergies,
    ...persistentPrecautions,
    ...surgicalHistory,
    ...persistentMedicalConditions,
    ...(profile.enduringMobilityContext ? [profile.enduringMobilityContext] : []),
  ];

  let verifiedCount = 0;
  let unverifiedCount = 0;
  let disputedCount = 0;

  for (const item of allItems) {
    if (item.verificationStatus === 'verified') {
      verifiedCount++;
    } else if (item.verificationStatus === 'disputed') {
      disputedCount++;
    } else {
      unverifiedCount++;
    }
  }

  return {
    hasAllergies: allergies.length > 0,
    hasPersistentPrecautions: persistentPrecautions.length > 0,
    hasSurgicalHistory: surgicalHistory.length > 0,
    hasMedicalConditions: persistentMedicalConditions.length > 0,
    totalAlertCount: allItems.length,
    verifiedCount,
    unverifiedCount,
    disputedCount,
    allergies,
    persistentPrecautions,
    surgicalHistory,
    persistentMedicalConditions,
    mobilityContext: profile.enduringMobilityContext,
    lastReviewedAt: profile.lastReviewedAt,
    lastReviewedBy: profile.lastReviewedBy,
  };
}

// ==========================================
// 2. TIMELINE DERIVATION (SOURCE-BACKED ONLY)
// ==========================================

/**
 * Derives a chronological, source-backed timeline of clinical milestones for a patient.
 *
 * Requirements:
 * - Deterministic reverse-chronological ordering (newest first).
 * - No manufactured events:
 *   - assessment_finalized ONLY when status === 'completed' AND completedAt exists.
 *   - milestone_session_logged derived ONLY from existing sessions (1st, 5th, 10th, 15th, etc., or final).
 *   - case_discharged ONLY when an actual CaseDischargeRecord exists.
 *   - safety_profile_reviewed ONLY when lastReviewedAt exists.
 */
export function derivePatientTimeline(
  patientId: string,
  dataset: LongitudinalClinicalDataset
): PatientTimelineEvent[] {
  const events: PatientTimelineEvent[] = [];

  const patient = dataset.patients.find((p) => p.id === patientId);
  if (!patient) return events;

  // 1. Patient registered
  if (patient.createdAt) {
    events.push({
      id: `evt_pt_reg_${patient.id}`,
      patientId,
      timestamp: patient.createdAt,
      eventType: 'patient_registered',
      title: 'Patient Registered',
      summary: `Patient profile created for ${patient.fullName} (${patient.patientNumber || 'No PC Number'}).`,
      sourceType: 'patient',
      sourceId: patient.id,
      navigationTarget: {
        tab: 'patient-hub',
      },
    });
  }

  // Find all cases for this patient
  const patientCases = dataset.cases.filter((c) => c.patientId === patientId);
  const caseMap = new Map<string, Case>();
  for (const c of patientCases) {
    caseMap.set(c.id, c);
    caseMap.set(c.caseId, c);
  }

  // 2. Cases opened
  for (const c of patientCases) {
    const caseTimestamp = c.startDate || c.createdAt;
    events.push({
      id: `evt_case_open_${c.id}`,
      patientId,
      caseId: c.id,
      caseName: c.caseName,
      timestamp: caseTimestamp,
      eventType: 'case_opened',
      title: `Episode Opened: ${c.caseName}`,
      summary: c.presentingProblem
        ? `Episode started. Presenting problem: ${c.presentingProblem}`
        : `Episode of care initiated. Case status: ${c.status}.`,
      sourceType: 'case',
      sourceId: c.id,
      navigationTarget: {
        tab: 'cases',
        caseId: c.id,
      },
    });
  }

  // 3. Subjective & Objective Assessments finalized (strictly when completed with completedAt)
  for (const sa of dataset.subjectiveAssessments) {
    if (sa.patientId === patientId && sa.status === 'completed' && sa.completedAt) {
      const c = caseMap.get(sa.caseId);
      events.push({
        id: `evt_subj_fin_${sa.id}`,
        patientId,
        caseId: sa.caseId,
        caseName: c?.caseName,
        timestamp: sa.completedAt,
        eventType: 'assessment_finalized',
        title: `Subjective Assessment Finalized`,
        summary: c ? `Comprehensive subjective history recorded for ${c.caseName}.` : 'Subjective assessment finalized.',
        sourceType: 'subjective_assessment',
        sourceId: sa.id,
        navigationTarget: {
          tab: 'cases',
          caseId: sa.caseId,
          sectionId: 'subjective',
        },
      });
    }
  }

  for (const oa of dataset.objectiveAssessments) {
    if (oa.patientId === patientId && oa.status === 'completed' && oa.completedAt) {
      const c = caseMap.get(oa.caseId);
      events.push({
        id: `evt_obj_fin_${oa.id}`,
        patientId,
        caseId: oa.caseId,
        caseName: c?.caseName,
        timestamp: oa.completedAt,
        eventType: 'assessment_finalized',
        title: `Objective Examination Finalized`,
        summary: c ? `Physical examination baseline established for ${c.caseName}.` : 'Objective assessment finalized.',
        sourceType: 'objective_assessment',
        sourceId: oa.id,
        navigationTarget: {
          tab: 'cases',
          caseId: oa.caseId,
          sectionId: 'objective',
        },
      });
    }
  }

  // 4. Clinical investigations logged (actual existing records)
  for (const inv of dataset.clinicalInvestigations) {
    const c = caseMap.get(inv.caseId);
    if (c) {
      const invTimestamp = inv.investigationDate || inv.createdAt;
      events.push({
        id: `evt_inv_${inv.id}`,
        patientId,
        caseId: inv.caseId,
        caseName: c.caseName,
        timestamp: invTimestamp,
        eventType: 'investigation_logged',
        title: `Investigation: ${inv.modality.toUpperCase()} - ${inv.name}`,
        summary: `${inv.bodyRegion}. Findings: ${inv.findings ? (inv.findings.length > 100 ? inv.findings.substring(0, 97) + '...' : inv.findings) : 'Recorded.'}`,
        sourceType: 'clinical_investigation',
        sourceId: inv.id,
        navigationTarget: {
          tab: 'cases',
          caseId: inv.caseId,
          sectionId: 'investigations',
        },
      });
    }
  }

  // 5. Clinical problems formulated
  for (const cp of dataset.clinicalProblems) {
    if (cp.patientId === patientId && cp.createdAt) {
      const c = caseMap.get(cp.caseId);
      events.push({
        id: `evt_prob_${cp.id}`,
        patientId,
        caseId: cp.caseId,
        caseName: c?.caseName,
        timestamp: cp.createdAt,
        eventType: 'clinical_problem_formulated',
        title: `Problem Formulated: ${cp.title}`,
        summary: cp.description
          ? cp.description
          : `Clinical problem recorded (Status: ${cp.status}) with ${cp.linkedFindingIds?.length || 0} linked finding(s).`,
        sourceType: 'clinical_problem',
        sourceId: cp.id,
        navigationTarget: {
          tab: 'cases',
          caseId: cp.caseId,
          sectionId: 'reasoning',
        },
      });
    }
  }

  // 6. Milestone sessions:
  // Strict rule per Stage 10C-B1 Section 11:
  // ClinicalSession does not contain an explicit milestone field; do not fabricate milestones.

  // 7. Formal progress evaluated
  for (const pr of dataset.progressRecords) {
    if (pr.patientId === patientId) {
      const c = caseMap.get(pr.caseId);
      const prTimestamp = pr.recordDate || pr.createdAt;
      events.push({
        id: `evt_prog_${pr.id}`,
        patientId,
        caseId: pr.caseId,
        caseName: c?.caseName,
        timestamp: prTimestamp,
        eventType: 'progress_evaluated',
        title: `Progress Evaluation (${pr.contextType ? pr.contextType.replace('_', ' ') : 'Reassessment'})`,
        summary: pr.therapistSummary || 'Reassessment recorded.',
        sourceType: 'progress_record',
        sourceId: pr.id,
        navigationTarget: {
          tab: 'cases',
          caseId: pr.caseId,
          sectionId: 'progress',
        },
      });
    }
  }

  // 8. Case discharged (strictly from CaseDischargeRecord)
  for (const cdr of dataset.caseDischargeRecords) {
    if (cdr.patientId === patientId) {
      const c = caseMap.get(cdr.caseId);
      const dcTimestamp = cdr.dischargeDate || cdr.createdAt;
      events.push({
        id: `evt_dc_${cdr.id}`,
        patientId,
        caseId: cdr.caseId,
        caseName: c?.caseName,
        timestamp: dcTimestamp,
        eventType: 'case_discharged',
        title: `Episode Discharged: ${c?.caseName || cdr.caseId}`,
        summary: `Reason: ${cdr.dischargeReason.replace(/_/g, ' ')}. ${cdr.clinicalStatusAtDischarge}`,
        sourceType: 'case_discharge_record',
        sourceId: cdr.id,
        navigationTarget: {
          tab: 'cases',
          caseId: cdr.caseId,
          sectionId: 'discharge',
        },
      });
    }
  }

  // 9. Safety profile reviewed
  if (patient.patientSafetyProfile?.lastReviewedAt) {
    events.push({
      id: `evt_safe_rev_${patient.id}_${patient.patientSafetyProfile.lastReviewedAt}`,
      patientId,
      timestamp: patient.patientSafetyProfile.lastReviewedAt,
      eventType: 'safety_profile_reviewed',
      title: 'Safety Profile Formally Reviewed',
      summary: patient.patientSafetyProfile.lastReviewedBy
        ? `Persistent safety and medical profile verified by ${patient.patientSafetyProfile.lastReviewedBy}.`
        : 'Persistent safety and medical profile verified.',
      sourceType: 'patient_safety_profile',
      sourceId: patient.id,
      navigationTarget: {
        tab: 'patient-hub',
      },
    });
  }

  // Sort deterministically: newest first (ISO string comparison), with id tie-breaker
  return events.sort((a, b) => {
    const timeDiff = b.timestamp.localeCompare(a.timestamp);
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

// ==========================================
// 3. HISTORICAL CASE SUMMARIES
// ==========================================

/**
 * Derives high-density summaries for all cases belonging to a patient.
 * Read-only aggregation — zero duplication of clinical records.
 */
export function deriveHistoricalCaseSummaries(
  patientId: string,
  dataset: LongitudinalClinicalDataset
): HistoricalCaseSummary[] {
  const patientCases = dataset.cases.filter((c) => {
    if (c.patientId !== patientId) return false;
    // Pre-clinical archived cases (created in error / duplicate / test / wrong patient with no clinical footprint)
    // MUST NOT pollute clinical longitudinal episodes.
    if (c.isArchived) {
      const isPreClinicalReason =
        c.archiveReason === 'created_in_error' ||
        c.archiveReason === 'test_or_demo' ||
        c.archiveReason === 'wrong_patient' ||
        c.archiveReason === 'duplicate_entry';
      if (isPreClinicalReason) {
        const matchesCase = (cId: string | undefined) => cId === c.id || (c.caseId && cId === c.caseId);
        const sessions = dataset.clinicalSessions.filter((s) => matchesCase(s.caseId));
        const measurements = dataset.progressMeasurements.filter((m) => matchesCase(m.caseId));
        const problems = dataset.clinicalProblems.filter((p) => matchesCase(p.caseId) && !p.isArchived);
        const discharge = dataset.caseDischargeRecords.find((d) => matchesCase(d.caseId));
        if (sessions.length === 0 && measurements.length === 0 && problems.length === 0 && !discharge) {
          return false;
        }
      }
    }
    return true;
  });

  return patientCases.map((c) => {
    // Sessions
    const sessions = dataset.clinicalSessions.filter((s) => s.caseId === c.id || s.caseId === c.caseId);
    
    // Problems
    const problems = dataset.clinicalProblems.filter((p) => p.caseId === c.id || p.caseId === c.caseId);
    const resolvedProblems = problems.filter((p) => p.status === 'resolved');
    const activeProblems = problems.filter((p) => p.status === 'active');

    // Goals
    const goals = dataset.clinicalGoals.filter((g) => g.caseId === c.id || g.caseId === c.caseId);
    const metGoals = goals.filter((g) => g.status === 'met');
    const activeGoals = goals.filter((g) => g.status === 'active');

    // Discharge
    const discharge = dataset.caseDischargeRecords.find(
      (d) => d.caseId === c.id || d.caseId === c.caseId
    );

    // Duration calculation in weeks if dates are valid
    let durationWeeks: number | undefined;
    const start = new Date(c.startDate || c.createdAt);
    const end = discharge?.dischargeDate ? new Date(discharge.dischargeDate) : new Date();
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      durationWeeks = Math.max(1, Math.round(diffDays / 7));
    }

    // Primary outcome summary (find baseline and latest/final measurements)
    const measurements = dataset.progressMeasurements.filter(
      (m) => m.caseId === c.id || m.caseId === c.caseId
    );
    const measurementsByDefinition = new Map<string, ProgressMeasurement[]>();
    for (const m of measurements) {
      const key = m.measureDefinitionId || m.measureName;
      const list = measurementsByDefinition.get(key) || [];
      list.push(m);
      measurementsByDefinition.set(key, list);
    }

    const primaryOutcomesSummary: HistoricalCaseSummary['primaryOutcomesSummary'] = [];
    for (const [, mList] of measurementsByDefinition.entries()) {
      const baseline = mList.find((m) => m.stage === 'baseline');
      const dischargeOrLatest =
        mList.find((m) => m.stage === 'discharge') ||
        mList.find((m) => m.stage === 'reassessment') ||
        mList[mList.length - 1];

      primaryOutcomesSummary.push({
        measureName: mList[0].measureName,
        baselineScore: baseline?.numericValue ?? baseline?.textValue,
        finalScore: dischargeOrLatest?.numericValue ?? dischargeOrLatest?.textValue,
        unit: mList[0].unit,
      });
    }

    return {
      caseId: c.id,
      displayId: c.caseId || c.id,
      caseName: c.caseName,
      status: c.status,
      stage: c.stage,
      startDate: c.startDate || c.createdAt,
      updatedAt: c.updatedAt || c.createdAt,
      dischargeDate: discharge?.dischargeDate,
      durationWeeks,
      referralSource: c.referralSource,
      presentingProblem: c.presentingProblem,
      totalSessions: sessions.length,
      problemCounts: {
        total: problems.length,
        resolved: resolvedProblems.length,
        active: activeProblems.length,
      },
      goalCounts: {
        total: goals.length,
        met: metGoals.length,
        active: activeGoals.length,
      },
      primaryOutcomesSummary,
      dischargeReason: discharge?.dischargeReason,
      dischargeStatusSummary: discharge?.clinicalStatusAtDischarge,
      isArchived: c.isArchived,
      archivedAt: c.archivedAt,
      archiveReason: c.archiveReason,
      archiveNotes: c.archiveNotes,
    };
  });
}

// ==========================================
// 4. CUMULATIVE PROBLEM HISTORY
// ==========================================

/**
 * Derives a cumulative diagnostic and problem history across all cases for a patient.
 *
 * Requirements:
 * - Retains originating case and case name.
 * - Distinguishes whether the originating case is currently closed/discharged.
 * - Historical problems remain historical and are NOT copied into active cases.
 */
export function deriveCumulativeProblemHistory(
  patientId: string,
  dataset: LongitudinalClinicalDataset
): CumulativeProblemItem[] {
  // Step 1: Identify cases strictly belonging to the selected patient
  const patientCases = dataset.cases.filter((c) => c.patientId === patientId);
  const patientCaseIds = new Set<string>();
  const caseMap = new Map<string, Case>();

  for (const c of patientCases) {
    patientCaseIds.add(c.id);
    if (c.caseId) {
      patientCaseIds.add(c.caseId);
    }
    caseMap.set(c.id, c);
    if (c.caseId) {
      caseMap.set(c.caseId, c);
    }
  }

  // Step 2: Identify Clinical Problems belonging to those verified cases and patient
  const patientProblems = dataset.clinicalProblems.filter(
    (p) => p.patientId === patientId && patientCaseIds.has(p.caseId)
  );

  return patientProblems
    .map((p) => {
      const c = caseMap.get(p.caseId);
      const isFromClosedCase = c?.status === 'Discharged';
      const documentedAt = p.createdAt || c?.startDate || c?.createdAt || '';

      return {
        id: p.id,
        problemId: p.id,
        patientId,
        problemStatement: p.title,
        originatingCaseId: p.caseId,
        originatingCaseName: c?.caseName || p.caseId,
        originatingCaseDisplayId: c?.caseId,
        caseStatus: c?.status,
        formulatedDate: documentedAt,
        sourceStatus: p.status,
        isFromClosedCase,
        linkedFindingCount: p.linkedFindingIds?.length || 0,
        linkedInvestigationCount: p.linkedInvestigationIds?.length || 0,
        therapistNotes: p.therapistNotes || p.description,
        problem: p,
      };
    })
    .sort((a, b) => {
      // Deterministic primary sort: newest documented first
      const timeDiff = b.formulatedDate.localeCompare(a.formulatedDate);
      if (timeDiff !== 0) return timeDiff;
      // Deterministic tie-breaker by problem id
      return a.id.localeCompare(b.id);
    });
}

// ==========================================
// 5. HISTORICAL TREATMENT CONTEXT
// ==========================================

/**
 * Derives documented historical treatments across all previous and current encounters.
 *
 * Requirements:
 * - Descriptive ONLY: exposes delivered parameters, tolerance ratings, and clinician notes.
 * - Absolutely NO implied efficacy claims (e.g. "effective", "worked previously", "recommended").
 * - Tolerance is an immediate response, not an efficacy judgment.
 */
export function deriveHistoricalTreatmentContext(
  patientId: string,
  dataset: LongitudinalClinicalDataset
): HistoricalTreatmentContextItem[] {
  const patientCases = dataset.cases.filter((c) => c.patientId === patientId);
  const caseMap = new Map<string, Case>();
  for (const c of patientCases) {
    caseMap.set(c.id, c);
    caseMap.set(c.caseId, c);
  }

  const sessionMap = new Map<string, ClinicalSession>();
  for (const s of dataset.clinicalSessions) {
    if (s.patientId === patientId) {
      sessionMap.set(s.id, s);
    }
  }

  const deliveries = dataset.sessionTreatmentDeliveries.filter((d) => d.patientId === patientId);

  return deliveries
    .map((d) => {
      const s = sessionMap.get(d.sessionId);
      const c = caseMap.get(d.caseId);

      let dosageString: string | undefined;
      if (d.actualDosage) {
        const parts: string[] = [];
        if (d.actualDosage.sets) parts.push(`${d.actualDosage.sets} sets`);
        if (d.actualDosage.reps) parts.push(`${d.actualDosage.reps} reps`);
        if (d.actualDosage.intensity) parts.push(`@ ${d.actualDosage.intensity}`);
        if (d.actualDosage.holdTime) parts.push(`${d.actualDosage.holdTime} hold`);
        if (d.actualDosage.parameters) parts.push(d.actualDosage.parameters);
        dosageString = parts.length > 0 ? parts.join(' × ') : undefined;
      }

      return {
        id: d.id,
        originatingCaseId: d.caseId,
        originatingCaseName: c?.caseName || d.caseId,
        sessionDate: s?.sessionDate || '',
        sessionNumber: s?.sessionNumber,
        treatmentName: d.title,
        category: d.interventionType,
        deliveredParameters: dosageString,
        documentedTolerance: s?.overallTolerance,
        therapistNotes: d.therapistExecutionNotes || d.immediateResponse || s?.therapistSessionNotes,
      };
    })
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
}

// ==========================================
// 6. LONGITUDINAL OUTCOME TRAJECTORIES
// ==========================================

/**
 * Groups outcome measurements across all episodes by measure definition.
 *
 * Requirements:
 * - Strict patient isolation: case.patientId === patientId AND m.caseId verified.
 * - Grouped strictly by instrument (measureDefinitionId or composite key: name + valueType + unit).
 * - Authoritative clinical date from ProgressRecord.recordDate (fallback to createdAt).
 * - Explicit episode segmentation with intra-episode chronology and baseline identification.
 * - Direction meaning only populated from authoritative definitions, NEVER inferred.
 * - Descriptive ONLY: preserves scores, units, stages, and clinician notes.
 * - NO artificial recovery scores, NO automated "improved / worsened" judgments.
 */
export function deriveLongitudinalOutcomeSeries(
  patientId: string,
  dataset: LongitudinalClinicalDataset
): LongitudinalMeasureSeries[] {
  // Step 1: Identify cases strictly belonging to the selected patient
  const patientCases = dataset.cases.filter((c) => c.patientId === patientId);
  const patientCaseIds = new Set<string>();
  const caseMap = new Map<string, Case>();

  for (const c of patientCases) {
    patientCaseIds.add(c.id);
    if (c.caseId) {
      patientCaseIds.add(c.caseId);
    }
    caseMap.set(c.id, c);
    if (c.caseId) {
      caseMap.set(c.caseId, c);
    }
  }

  // Step 2: Index patient progress records, goals, and discharge records
  const recordMap = new Map<string, ProgressRecord>();
  for (const r of dataset.progressRecords) {
    if (r.patientId === patientId && patientCaseIds.has(r.caseId)) {
      recordMap.set(r.id, r);
    }
  }

  const goalMap = new Map<string, ClinicalGoal>();
  for (const g of dataset.clinicalGoals) {
    if (g.patientId === patientId && patientCaseIds.has(g.caseId)) {
      goalMap.set(g.id, g);
    }
  }

  const dischargeMap = new Map<string, CaseDischargeRecord>();
  for (const d of dataset.caseDischargeRecords) {
    if (d.patientId === patientId && patientCaseIds.has(d.caseId)) {
      dischargeMap.set(d.caseId, d);
    }
  }

  // Step 3: Strict patient isolation - Clinical measurements must belong to patient AND verified patient case
  const measurements = dataset.progressMeasurements.filter(
    (m) => m.patientId === patientId && patientCaseIds.has(m.caseId)
  );

  // Authoritative definition lookup map for directionMeaning
  const standardDefMap = new Map<string, OutcomeMeasureDefinition>();
  for (const def of INITIAL_OUTCOME_MEASURE_DEFINITIONS) {
    standardDefMap.set(def.id, def);
  }

  // Step 4: Group measurements by defensible comparability key
  // Preferred: measureDefinitionId; Fallback composite: name + valueType + unit
  const seriesMap = new Map<string, LongitudinalOutcomePoint[]>();
  const metaMap = new Map<
    string,
    {
      definitionId?: string;
      name: string;
      category: string;
      unit?: string;
      valueType: MeasurementValueType;
      directionMeaning?: MeasurementDirectionMeaning;
    }
  >();

  for (const m of measurements) {
    const key = m.measureDefinitionId
      ? m.measureDefinitionId
      : `${m.measureName.trim().toLowerCase()}__${m.valueType}__${(m.unit || '').trim().toLowerCase()}`;

    if (!seriesMap.has(key)) {
      seriesMap.set(key, []);
      const standardDef = m.measureDefinitionId
        ? standardDefMap.get(m.measureDefinitionId)
        : undefined;

      metaMap.set(key, {
        definitionId: m.measureDefinitionId,
        name: standardDef?.name || m.measureName,
        category: standardDef?.category || m.category,
        unit: m.unit || standardDef?.unit,
        valueType: m.valueType || standardDef?.valueType || 'numeric',
        // Direction meaning: ONLY populated if authoritative definition explicitly provides it
        directionMeaning: standardDef?.directionMeaning,
      });
    }

    const c = caseMap.get(m.caseId);
    const parentRecord = recordMap.get(m.progressRecordId);
    const clinicalDate = parentRecord?.recordDate || m.createdAt.split('T')[0] || '';
    const isFromClosedCase = c?.status === 'Discharged';
    const linkedGoal = m.linkedGoalId ? goalMap.get(m.linkedGoalId) : undefined;

    seriesMap.get(key)!.push({
      measurementId: m.id,
      progressRecordId: m.progressRecordId,
      patientId: m.patientId,
      caseId: m.caseId,
      caseName: c?.caseName || m.caseId,
      originatingCaseDisplayId: c?.caseId,
      isFromClosedCase: Boolean(isFromClosedCase),
      measureDefinitionId: m.measureDefinitionId,
      measureName: m.measureName,
      category: m.category,
      scoreNumeric: m.numericValue,
      scoreText: m.textValue,
      unit: m.unit,
      stage: m.stage,
      date: clinicalDate,
      linkedGoalId: m.linkedGoalId,
      targetValue: linkedGoal?.targetValue,
      therapistAuthoredNotes: m.notes || m.context,
      rawMeasurement: m,
    });
  }

  // Step 5: Construct series with explicit episode buckets
  const result: LongitudinalMeasureSeries[] = [];

  for (const [key, points] of seriesMap.entries()) {
    const meta = metaMap.get(key)!;

    // Deterministic sort comparator for points
    const pointSortFn = (a: LongitudinalOutcomePoint, b: LongitudinalOutcomePoint) => {
      // 1. Authoritative clinical date ascending
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;

      // 2. Creation timestamp ascending
      const createdDiff = a.rawMeasurement.createdAt.localeCompare(b.rawMeasurement.createdAt);
      if (createdDiff !== 0) return createdDiff;

      // 3. ID localeCompare deterministic tie-breaker
      return a.measurementId.localeCompare(b.measurementId);
    };

    // Sort all points chronologically
    const allSortedPoints = [...points].sort(pointSortFn);

    // Group points by episode (caseId)
    const episodePointsMap = new Map<string, LongitudinalOutcomePoint[]>();
    for (const pt of allSortedPoints) {
      if (!episodePointsMap.has(pt.caseId)) {
        episodePointsMap.set(pt.caseId, []);
      }
      episodePointsMap.get(pt.caseId)!.push(pt);
    }

    const episodeBuckets: LongitudinalMeasureSeries['episodes'] = [];

    for (const [caseId, epPoints] of episodePointsMap.entries()) {
      const c = caseMap.get(caseId);
      const dischargeRec = dischargeMap.get(caseId);
      const isClosed = c?.status === 'Discharged';

      // Identify baseline point: first with stage === 'baseline', or first chronological point
      const explicitBaseline = epPoints.find((p) => p.stage === 'baseline');
      const baselinePoint = explicitBaseline || epPoints[0];
      const latestPoint = epPoints[epPoints.length - 1];

      episodeBuckets.push({
        caseId,
        caseName: c?.caseName || caseId,
        originatingCaseDisplayId: c?.caseId,
        isClosed,
        startDate: c?.startDate,
        dischargeDate: dischargeRec?.dischargeDate,
        points: epPoints,
        baselinePoint,
        latestPoint,
      });
    }

    // Sort episode buckets chronologically by earliest point or case start date
    episodeBuckets.sort((a, b) => {
      const aDate = a.startDate || a.points[0]?.date || '';
      const bDate = b.startDate || b.points[0]?.date || '';
      return aDate.localeCompare(bDate);
    });

    result.push({
      seriesKey: key,
      measureDefinitionId: meta.definitionId,
      measureName: meta.name,
      category: meta.category,
      unit: meta.unit,
      valueType: meta.valueType,
      directionMeaning: meta.directionMeaning,
      points: allSortedPoints,
      episodes: episodeBuckets,
    });
  }

  // Return series alphabetically by measureName
  return result.sort((a, b) => a.measureName.localeCompare(b.measureName));
}

// ==========================================
// 7. CASEWORKSPACE LONGITUDINAL CONTEXT SELECTOR
// ==========================================

/**
 * STAGE 10D: CaseWorkspace Longitudinal Context Selector
 *
 * Derives a read-only view model representing patient-level context and
 * historical records from prior episodes of care.
 *
 * Invariants:
 * 1. Strict Patient Isolation: Only records belonging to the specified patientId are processed.
 * 2. Strict Current-Case Exclusion: The active case (matching currentCaseId or currentCaseDisplayId)
 *    is strictly excluded from historical cases, problems, outcomes, treatments, and episode timeline events.
 * 3. Cross-Episode Patient Safety: Persistent patient-level safety information (allergies, precautions,
 *    surgeries, conditions, mobility) is maintained across all episodes.
 * 4. Descriptive Only: Zero automated clinical efficacy, recurrence, or chronicity inferences.
 * 5. Deterministic Ordering: Consistent chronological sorting with deterministic tie-breaking.
 * 6. Pure & Immutable: Zero mutations, zero LocalStorage access, zero external side effects.
 */
export function deriveCaseLongitudinalContext(
  patientId: string,
  currentCaseId: string,
  dataset: LongitudinalClinicalDataset
): CaseLongitudinalContextViewModel {
  // Empty state fallback helper
  const createEmptyViewModel = (
    resolvedPatient?: Patient,
    resolvedDisplayId?: string
  ): CaseLongitudinalContextViewModel => {
    const safetyProfile = resolvedPatient?.patientSafetyProfile || DEFAULT_PATIENT_SAFETY_PROFILE;
    const safetyAlerts = derivePatientSafetyAlerts(resolvedPatient);
    return {
      patientId,
      patient: resolvedPatient,
      currentCaseId,
      currentCaseDisplayId: resolvedDisplayId,
      safetyProfile,
      safetyAlerts,
      historicalCases: [],
      historicalProblems: [],
      historicalOutcomes: [],
      historicalTreatments: [],
      timelineEvents: [],
      counts: {
        safetyAlerts: safetyAlerts.totalAlertCount,
        priorEpisodes: 0,
        historicalProblems: 0,
        pastOutcomes: 0,
        priorTreatments: 0,
        timelineEvents: 0,
      },
    };
  };

  if (!patientId || !dataset) {
    return createEmptyViewModel();
  }

  // 1. Strict Patient Isolation
  const patient = dataset.patients?.find((p) => p.id === patientId);
  if (!patient) {
    return createEmptyViewModel();
  }

  // 2. Resolve Current Case Identity (internal ID and display ID)
  const currentCase = dataset.cases?.find(
    (c) => c.patientId === patientId && (c.id === currentCaseId || c.caseId === currentCaseId)
  );
  const resolvedCurrentId = currentCase?.id || currentCaseId;
  const resolvedCurrentDisplayId = currentCase?.caseId;

  const isCurrentCase = (id?: string): boolean => {
    if (!id) return false;
    return (
      id === resolvedCurrentId ||
      id === currentCaseId ||
      (!!resolvedCurrentDisplayId && id === resolvedCurrentDisplayId)
    );
  };

  // 3. Patient-Level Safety Profile (inherently cross-episode)
  const safetyProfile = patient.patientSafetyProfile || DEFAULT_PATIENT_SAFETY_PROFILE;
  const safetyAlerts = derivePatientSafetyAlerts(patient);

  // 4. Historical Cases (strictly excluding current case)
  const allSummaries = deriveHistoricalCaseSummaries(patientId, dataset);
  const historicalCases = allSummaries
    .filter((c) => !isCurrentCase(c.caseId) && !isCurrentCase(c.displayId))
    .sort((a, b) => {
      const dateA = a.startDate || a.updatedAt;
      const dateB = b.startDate || b.updatedAt;
      const cmp = dateB.localeCompare(dateA);
      if (cmp !== 0) return cmp;
      return a.caseId.localeCompare(b.caseId);
    });

  // 5. Historical Problems (strictly from prior episodes)
  const allCumulativeProblems = deriveCumulativeProblemHistory(patientId, dataset);
  const historicalProblems = allCumulativeProblems
    .filter((p) => !isCurrentCase(p.originatingCaseId))
    .sort((a, b) => {
      const cmp = b.formulatedDate.localeCompare(a.formulatedDate);
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });

  // 6. Past Outcomes (measurements from prior episodes)
  const allOutcomeSeries = deriveLongitudinalOutcomeSeries(patientId, dataset);
  const historicalOutcomes: LongitudinalMeasureSeries[] = [];

  for (const series of allOutcomeSeries) {
    // Filter points to exclude current case measurements
    const priorPoints = series.points.filter((pt) => !isCurrentCase(pt.caseId));
    // Filter episode buckets to exclude current case
    const priorEpisodes = series.episodes.filter(
      (ep) => !isCurrentCase(ep.caseId) && !isCurrentCase(ep.originatingCaseDisplayId)
    );

    // Only include series that have documented measurements in prior episodes
    if (priorPoints.length > 0) {
      historicalOutcomes.push({
        ...series,
        points: priorPoints,
        episodes: priorEpisodes,
      });
    }
  }
  // Sort outcomes alphabetically by measure name
  historicalOutcomes.sort((a, b) => a.measureName.localeCompare(b.measureName));

  // 7. Prior Treatments (strictly from prior episodes)
  const allTreatments = deriveHistoricalTreatmentContext(patientId, dataset);
  const historicalTreatments = allTreatments
    .filter((t) => !isCurrentCase(t.originatingCaseId))
    .sort((a, b) => {
      const cmp = b.sessionDate.localeCompare(a.sessionDate);
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });

  // 8. Timeline Milestones (prior-episode milestones, strictly excluding current case)
  const allTimelineEvents = derivePatientTimeline(patientId, dataset);
  const timelineEvents = allTimelineEvents
    .filter((e) => !!e.caseId && !isCurrentCase(e.caseId))
    .sort((a, b) => {
      const cmp = b.timestamp.localeCompare(a.timestamp);
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });

  // 9. Summary Counts for Badges
  const counts = {
    safetyAlerts: safetyAlerts.totalAlertCount,
    priorEpisodes: historicalCases.length,
    historicalProblems: historicalProblems.length,
    pastOutcomes: historicalOutcomes.length,
    priorTreatments: historicalTreatments.length,
    timelineEvents: timelineEvents.length,
  };

  return {
    patientId,
    patient,
    currentCaseId: resolvedCurrentId,
    currentCaseDisplayId: resolvedCurrentDisplayId,
    safetyProfile,
    safetyAlerts,
    historicalCases,
    historicalProblems,
    historicalOutcomes,
    historicalTreatments,
    timelineEvents,
    counts,
  };
}
