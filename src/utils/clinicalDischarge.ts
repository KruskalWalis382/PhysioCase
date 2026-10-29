import { DischargeReason, CaseDischargeRecord } from '../types';

export const CASE_DISCHARGE_RECORDS_STORAGE_KEY =
  'physiocase_workspace_case_discharge_records';

export const DISCHARGE_REASONS_LABELS: Record<DischargeReason, string> = {
  goals_achieved: 'Goals Achieved',
  plateau_functional_independence: 'Plateau / Functional Independence',
  self_management_transition: 'Self-Management Transition',
  patient_choice_discontinued: 'Patient Choice / Discontinued',
  medical_transfer_referral: 'Medical Transfer / Specialist Referral',
  relocation: 'Patient Relocation',
  non_attendance: 'Non-Attendance / Lost to Follow-Up',
  other: 'Other Clinical Reason',
};

export const generateCaseDischargeRecordId = (): string => {
  return `discharge_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
};

export interface EpisodeDurationMetrics {
  totalWeeks: number;
  totalDays: number;
  startDateFormatted: string;
  dischargeDateFormatted: string;
  formattedText: string;
}

/**
 * Calculates human-readable duration between case start date and discharge date.
 * If either date is missing or invalid, returns null.
 */
export const calculateEpisodeDuration = (
  startDateStr?: string,
  dischargeDateStr?: string
): EpisodeDurationMetrics | null => {
  if (!startDateStr || !dischargeDateStr) return null;

  const start = new Date(startDateStr);
  const discharge = new Date(dischargeDateStr);

  if (isNaN(start.getTime()) || isNaN(discharge.getTime())) return null;

  const diffMs = discharge.getTime() - start.getTime();
  if (diffMs < 0) {
    // If dates are inverted or same day
    return {
      totalWeeks: 0,
      totalDays: 0,
      startDateFormatted: startDateStr,
      dischargeDateFormatted: dischargeDateStr,
      formattedText: 'Same-day discharge (0 days)',
    };
  }

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const remDays = diffDays % 7;

  let text = '';
  if (diffWeeks > 0) {
    text = `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'}`;
    if (remDays > 0) {
      text += `, ${remDays} ${remDays === 1 ? 'day' : 'days'}`;
    }
    text += ` (${diffDays} days)`;
  } else {
    text = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }

  return {
    totalWeeks: diffWeeks,
    totalDays: diffDays,
    startDateFormatted: startDateStr,
    dischargeDateFormatted: dischargeDateStr,
    formattedText: text,
  };
};
