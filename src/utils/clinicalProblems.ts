import { ClinicalProblem, ClinicalProblemStatus } from '../types';

export const CLINICAL_PROBLEMS_STORAGE_KEY =
  'physiocase_workspace_clinical_problems';

export function createEmptyClinicalProblem(
  caseId: string,
  patientId: string
): ClinicalProblem {
  const now = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return {
    id: `problem_${Date.now()}_${randomSuffix}`,
    caseId,
    patientId,
    title: '',
    description: '',
    linkedFindingIds: [],
    linkedInvestigationIds: [],
    status: 'active',
    therapistNotes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export const CLINICAL_PROBLEM_STATUS_CONFIG: Record<
  ClinicalProblemStatus,
  {
    label: string;
    description: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  active: {
    label: 'Active',
    description: 'Currently relevant to the rehabilitation episode.',
    badgeClass: 'bg-[#FAF0E4] text-[#8C5E1A] border-[#E8D4BE]',
    dotClass: 'bg-[#8C5E1A]',
  },
  addressed: {
    label: 'Addressed',
    description: 'Worked on, requires monitoring or further intervention.',
    badgeClass: 'bg-[#EBF2EE] text-[#1B3B2B] border-[#CAD8D0]',
    dotClass: 'bg-[#1B3B2B]',
  },
  resolved: {
    label: 'Resolved',
    description: 'Considered resolved by the therapist.',
    badgeClass: 'bg-[#E2ECE6] text-[#1B3B2B] border-[#CAD8D0]',
    dotClass: 'bg-[#2E6B4D]',
  },
  inactive: {
    label: 'Inactive',
    description: 'Retained historically; no longer an active consideration.',
    badgeClass: 'bg-[#F4EFEB] text-[#6E756F] border-[#DDD6CB]',
    dotClass: 'bg-[#959D96]',
  },
};
