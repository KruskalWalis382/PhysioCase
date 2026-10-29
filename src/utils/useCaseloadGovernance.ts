import { useMemo } from 'react';
import { useClinical } from '../context/ClinicalContext';
import {
  deriveCaseloadGovernance,
  CaseloadGovernanceSummary,
  CaseGovernanceSummary,
} from './clinicalGovernance';

/**
 * Custom hook providing memoized Caseload Governance metrics and case summaries.
 * Purely derived layer over existing ClinicalContext state.
 * Does not mutate context, does not write to localStorage, does not execute network calls.
 */
export function useCaseloadGovernance(): {
  governance: CaseloadGovernanceSummary;
  activeCaseSummaries: CaseGovernanceSummary[];
  reviewsDueCases: CaseGovernanceSummary[];
  reviewsOverdueCases: CaseGovernanceSummary[];
  stalledCases: CaseGovernanceSummary[];
  documentationGapCases: CaseGovernanceSummary[];
} {
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
  } = useClinical();

  const governance = useMemo(() => {
    return deriveCaseloadGovernance({
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
    });
  }, [
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
  ]);

  const activeCaseSummaries = useMemo(() => {
    return governance.caseSummaries.filter((c) => !c.isDischarged && !c.isArchived);
  }, [governance.caseSummaries]);

  const reviewsDueCases = useMemo(() => {
    return governance.caseSummaries.filter(
      (c) =>
        !c.isDischarged &&
        (c.reviewStatus === 'overdue' ||
          c.reviewStatus === 'due' ||
          c.reviewStatus === 'due_soon')
    );
  }, [governance.caseSummaries]);

  const reviewsOverdueCases = useMemo(() => {
    return governance.caseSummaries.filter(
      (c) => !c.isDischarged && c.reviewStatus === 'overdue'
    );
  }, [governance.caseSummaries]);

  const stalledCases = useMemo(() => {
    return governance.caseSummaries.filter(
      (c) => !c.isDischarged && c.activityStatus === 'stalled'
    );
  }, [governance.caseSummaries]);

  const documentationGapCases = useMemo(() => {
    return governance.caseSummaries.filter(
      (c) =>
        !c.isDischarged &&
        (c.documentationStatus === 'missing_documentation' ||
          c.documentationStatus === 'partially_documented')
    );
  }, [governance.caseSummaries]);

  return {
    governance,
    activeCaseSummaries,
    reviewsDueCases,
    reviewsOverdueCases,
    stalledCases,
    documentationGapCases,
  };
}
