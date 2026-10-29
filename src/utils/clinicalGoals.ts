import { ClinicalGoal, ClinicalGoalStatus, ClinicalGoalType } from '../types';

export const CLINICAL_GOALS_STORAGE_KEY =
  'physiocase_workspace_clinical_goals';

export function createEmptyClinicalGoal(
  caseId: string,
  patientId: string,
  type: ClinicalGoalType = 'short_term'
): ClinicalGoal {
  const now = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return {
    id: `goal_${Date.now()}_${randomSuffix}`,
    caseId,
    patientId,
    title: '',
    description: '',
    type,
    linkedProblemIds: [],
    targetValue: '',
    targetDate: '',
    status: 'active',
    therapistNotes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export const CLINICAL_GOAL_STATUS_CONFIG: Record<
  ClinicalGoalStatus,
  {
    label: string;
    description: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  active: {
    label: 'Active',
    description: 'Currently being pursued in this clinical episode.',
    badgeClass: 'bg-[#FAF0E4] text-[#8C5E1A] border-[#E8D4BE]',
    dotClass: 'bg-[#8C5E1A]',
  },
  met: {
    label: 'Met',
    description: 'Goal considered achieved by the therapist.',
    badgeClass: 'bg-[#E2ECE6] text-[#1B3B2B] border-[#CAD8D0]',
    dotClass: 'bg-[#2E6B4D]',
  },
  partially_met: {
    label: 'Partially Met',
    description: 'Meaningful progress achieved, still being monitored.',
    badgeClass: 'bg-[#EBF2EE] text-[#1B3B2B] border-[#CAD8D0]',
    dotClass: 'bg-[#1B3B2B]',
  },
  not_met: {
    label: 'Not Met',
    description: 'Not achieved within the target timeframe.',
    badgeClass: 'bg-[#FDF2F2] text-[#991B1B] border-[#F87171]/30',
    dotClass: 'bg-[#DC2626]',
  },
  discontinued: {
    label: 'Discontinued',
    description: 'No longer being pursued; retained historically.',
    badgeClass: 'bg-[#F4EFEB] text-[#6E756F] border-[#DDD6CB]',
    dotClass: 'bg-[#959D96]',
  },
};

export const CLINICAL_GOAL_TYPE_CONFIG: Record<
  ClinicalGoalType,
  {
    label: string;
    description: string;
    badgeClass: string;
  }
> = {
  short_term: {
    label: 'Short-Term',
    description: 'Interim functional or physical milestone.',
    badgeClass: 'bg-[#EBF2EE] text-[#1B3B2B] border-[#CAD8D0]',
  },
  long_term: {
    label: 'Long-Term',
    description: 'Functional discharge or activity target.',
    badgeClass: 'bg-[#F4EFEB] text-[#414843] border-[#DDD6CB]',
  },
};
