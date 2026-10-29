/**
 * PhysioCase — Stage 10: Longitudinal Patient History & Cumulative Chart Foundation
 * Memoized React Hook
 *
 * Scoped to a specific patientId, extracting only that patient's data before derivation.
 * Leverages useMemo to avoid unnecessary recalculations on unrelated state updates.
 */

import { useMemo } from 'react';
import { useClinical } from '../context/ClinicalContext';
import {
  derivePatientSafetyAlerts,
  derivePatientTimeline,
  deriveHistoricalCaseSummaries,
  deriveCumulativeProblemHistory,
  deriveHistoricalTreatmentContext,
  deriveLongitudinalOutcomeSeries,
  LongitudinalClinicalDataset,
} from '../utils/longitudinalPatientHistory';
import {
  Patient,
  PatientSafetyAlertsSummary,
  PatientTimelineEvent,
  HistoricalCaseSummary,
  CumulativeProblemItem,
  HistoricalTreatmentContextItem,
  LongitudinalMeasureSeries,
} from '../types';

export interface UseLongitudinalHistoryResult {
  patient: Patient | undefined;
  safetyAlerts: PatientSafetyAlertsSummary;
  timeline: PatientTimelineEvent[];
  historicalCases: HistoricalCaseSummary[];
  activeCases: HistoricalCaseSummary[];
  closedCases: HistoricalCaseSummary[];
  archivedCases: HistoricalCaseSummary[];
  cumulativeProblems: CumulativeProblemItem[];
  treatmentContext: HistoricalTreatmentContextItem[];
  outcomeSeries: LongitudinalMeasureSeries[];
  hasHistory: boolean;
  totalEpisodesCount: number;
  dataset: LongitudinalClinicalDataset;
}

/**
 * Custom hook providing memoized longitudinal patient history for a given patientId.
 */
export function useLongitudinalHistory(patientId: string | undefined | null): UseLongitudinalHistoryResult {
  const {
    patients,
    cases,
    subjectiveAssessments,
    objectiveAssessments,
    clinicalInvestigations,
    clinicalProblems,
    clinicalGoals,
    clinicalSessions,
    sessionTreatmentDeliveries,
    progressRecords,
    progressMeasurements,
    caseDischargeRecords,
  } = useClinical();

  // Find the target patient
  const patient = useMemo(() => {
    if (!patientId) return undefined;
    return patients.find((p) => p.id === patientId);
  }, [patients, patientId]);

  // Build the dataset bundle for this patient
  const dataset = useMemo<LongitudinalClinicalDataset>(() => {
    return {
      patients,
      cases,
      subjectiveAssessments,
      objectiveAssessments,
      clinicalInvestigations,
      clinicalProblems,
      clinicalGoals,
      clinicalSessions,
      sessionTreatmentDeliveries,
      progressRecords,
      progressMeasurements,
      caseDischargeRecords,
    };
  }, [
    patients,
    cases,
    subjectiveAssessments,
    objectiveAssessments,
    clinicalInvestigations,
    clinicalProblems,
    clinicalGoals,
    clinicalSessions,
    sessionTreatmentDeliveries,
    progressRecords,
    progressMeasurements,
    caseDischargeRecords,
  ]);

  // 1. Patient safety alerts (allergies, persistent precautions, surgeries, conditions)
  const safetyAlerts = useMemo<PatientSafetyAlertsSummary>(() => {
    return derivePatientSafetyAlerts(patient);
  }, [patient]);

  // 2. Longitudinal timeline
  const timeline = useMemo<PatientTimelineEvent[]>(() => {
    if (!patientId) return [];
    return derivePatientTimeline(patientId, dataset);
  }, [patientId, dataset]);

  // 3. Historical case summaries
  const historicalCases = useMemo<HistoricalCaseSummary[]>(() => {
    if (!patientId) return [];
    return deriveHistoricalCaseSummaries(patientId, dataset);
  }, [patientId, dataset]);

  const activeCases = useMemo(() => {
    return historicalCases
      .filter((c) => c.status !== 'Discharged' && !c.isArchived)
      .sort((a, b) => {
        const timeB = new Date(b.updatedAt || b.startDate).getTime();
        const timeA = new Date(a.updatedAt || a.startDate).getTime();
        return timeB - timeA;
      });
  }, [historicalCases]);

  const closedCases = useMemo(() => {
    return historicalCases
      .filter((c) => c.status === 'Discharged' && !c.isArchived)
      .sort((a, b) => {
        const timeB = new Date(b.dischargeDate || b.startDate).getTime();
        const timeA = new Date(a.dischargeDate || a.startDate).getTime();
        return timeB - timeA;
      });
  }, [historicalCases]);

  const archivedCases = useMemo(() => {
    return historicalCases
      .filter((c) => Boolean(c.isArchived))
      .sort((a, b) => {
        const timeB = new Date(b.archivedAt || b.updatedAt || b.startDate).getTime();
        const timeA = new Date(a.archivedAt || a.updatedAt || a.startDate).getTime();
        return timeB - timeA;
      });
  }, [historicalCases]);

  // 4. Cumulative problem history
  const cumulativeProblems = useMemo<CumulativeProblemItem[]>(() => {
    if (!patientId) return [];
    return deriveCumulativeProblemHistory(patientId, dataset);
  }, [patientId, dataset]);

  // 5. Historical treatment context
  const treatmentContext = useMemo<HistoricalTreatmentContextItem[]>(() => {
    if (!patientId) return [];
    return deriveHistoricalTreatmentContext(patientId, dataset);
  }, [patientId, dataset]);

  // 6. Longitudinal outcome trajectories
  const outcomeSeries = useMemo<LongitudinalMeasureSeries[]>(() => {
    if (!patientId) return [];
    return deriveLongitudinalOutcomeSeries(patientId, dataset);
  }, [patientId, dataset]);

  return {
    patient,
    safetyAlerts,
    timeline,
    historicalCases,
    activeCases,
    closedCases,
    archivedCases,
    cumulativeProblems,
    treatmentContext,
    outcomeSeries,
    hasHistory: historicalCases.length > 0 || timeline.length > 0,
    totalEpisodesCount: historicalCases.length,
    dataset,
  };
}
