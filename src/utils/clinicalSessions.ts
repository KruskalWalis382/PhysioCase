import {
  ClinicalSession,
  ClinicalSessionStatus,
  SessionToleranceRating,
  SessionTreatmentDelivery,
  DeliveryExecutionStatus,
  TreatmentModificationType,
  TreatmentSelection,
} from '../types';

export const CLINICAL_SESSIONS_STORAGE_KEY =
  'physiocase_workspace_clinical_sessions';
export const SESSION_TREATMENT_DELIVERIES_STORAGE_KEY =
  'physiocase_workspace_session_treatment_deliveries';

export const CLINICAL_SESSION_STATUS_CONFIG: Record<
  ClinicalSessionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  planned: {
    label: 'Planned',
    bg: 'bg-[#EFF3F6]',
    text: 'text-[#22445E]',
    border: 'border-[#CFDCE6]',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-[#FDF6E2]',
    text: 'text-[#8A6D1C]',
    border: 'border-[#F2E0A8]',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-[#EBF2EE]',
    text: 'text-[#1B3B2B]',
    border: 'border-[#D5E2DA]',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-[#F8EBEB]',
    text: 'text-[#8F2323]',
    border: 'border-[#E8C6C6]',
  },
  missed: {
    label: 'Did Not Attend / Missed',
    bg: 'bg-[#F2EDF8]',
    text: 'text-[#4F307E]',
    border: 'border-[#D9CBE8]',
  },
};

export const SESSION_TOLERANCE_CONFIG: Record<
  SessionToleranceRating,
  { label: string; badgeClass: string; description: string }
> = {
  well_tolerated: {
    label: 'Well Tolerated',
    badgeClass: 'bg-[#EBF3EE] text-[#1B3B2B] border-[#CAD8D0]',
    description: 'Patient tolerated all interventions without symptom aggravation or abnormal fatigue',
  },
  moderately_tolerated: {
    label: 'Moderately Tolerated',
    badgeClass: 'bg-[#FAF4E6] text-[#7A5B18] border-[#EADCBF]',
    description: 'Acceptable transient response; expected mild post-exercise fatigue or tightness',
  },
  poorly_tolerated: {
    label: 'Poorly Tolerated',
    badgeClass: 'bg-[#FDF0EC] text-[#913E22] border-[#F2D3C7]',
    description: 'Symptom provocation or excessive fatigue requiring premature cessation or heavy pacing',
  },
  adverse_response: {
    label: 'Adverse Response',
    badgeClass: 'bg-[#FDECEC] text-[#931D1D] border-[#F4C7C7]',
    description: 'Acute flare-up, joint effusion, severe pain spike, or adverse systemic response',
  },
  not_evaluated: {
    label: 'Not Evaluated',
    badgeClass: 'bg-[#F5F2EC] text-[#606762] border-[#DDD7CD]',
    description: 'Tolerance not formally evaluated during this encounter',
  },
};

export const DELIVERY_EXECUTION_STATUS_CONFIG: Record<
  DeliveryExecutionStatus,
  { label: string; badgeClass: string }
> = {
  completed_as_planned: {
    label: 'Completed as Planned',
    badgeClass: 'bg-[#EBF3EE] text-[#1B3B2B] border-[#CAD8D0]',
  },
  modified: {
    label: 'Modified',
    badgeClass: 'bg-[#FAF4E6] text-[#7A5B18] border-[#EADCBF]',
  },
  partially_completed: {
    label: 'Partially Completed',
    badgeClass: 'bg-[#F2EDF8] text-[#4F307E] border-[#D9CBE8]',
  },
  omitted: {
    label: 'Omitted Today',
    badgeClass: 'bg-[#F5F2EC] text-[#606762] border-[#DDD7CD]',
  },
  deferred: {
    label: 'Deferred to Next Session',
    badgeClass: 'bg-[#EFF3F6] text-[#22445E] border-[#CFDCE6]',
  },
};

export const TREATMENT_MODIFICATION_TYPE_CONFIG: Record<
  TreatmentModificationType,
  { label: string }
> = {
  none: { label: 'None (Delivered as Prescribed)' },
  dosage_modified: { label: 'Dosage Modified (Load, Sets, or Reps changed)' },
  intensity_modified: { label: 'Intensity / Resistance Modified' },
  duration_modified: { label: 'Duration / Time Modified' },
  repetitions_modified: { label: 'Repetitions Modified' },
  exercise_modified: { label: 'Technique / Biomechanics Adapted' },
  intervention_added: { label: 'Additional Intervention Delivered' },
  intervention_omitted: { label: 'Intervention Omitted' },
  intervention_stopped: { label: 'Intervention Stopped Prematurely' },
  intervention_substituted: { label: 'Intervention Substituted' },
  other: { label: 'Other Clinician Modification' },
};

/**
 * Generate a unique ID for a Clinical Session
 */
export function generateClinicalSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique ID for a Session Treatment Delivery record
 */
export function generateSessionTreatmentDeliveryId(): string {
  return `delivery-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Helper to compute next session number for a given case
 */
export function getNextSessionNumber(existingCaseSessions: ClinicalSession[]): number {
  if (existingCaseSessions.length === 0) return 1;
  const maxNumber = Math.max(...existingCaseSessions.map((s) => s.sessionNumber || 0));
  return maxNumber + 1;
}

/**
 * Factory for creating an empty Clinical Session
 */
export function createEmptyClinicalSession(
  caseId: string,
  patientId: string,
  sessionNumber: number
): ClinicalSession {
  const now = new Date();
  const isoDate = now.toISOString().split('T')[0];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return {
    id: generateClinicalSessionId(),
    caseId,
    patientId,
    sessionNumber,
    sessionDate: isoDate,
    startTime: `${hours}:${minutes}`,
    status: 'completed',
    overallTolerance: 'well_tolerated',
    therapistSessionNotes: '',
    patientSubjectiveResponse: '',
    immediateObservations: '',
    modificationsSummary: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Factory for creating a Session Treatment Delivery linked to an existing Treatment Selection
 */
export function createSessionTreatmentDeliveryFromSelection(
  sessionId: string,
  caseId: string,
  patientId: string,
  selection: TreatmentSelection
): SessionTreatmentDelivery {
  const now = new Date().toISOString();
  return {
    id: generateSessionTreatmentDeliveryId(),
    sessionId,
    caseId,
    patientId,
    treatmentSelectionId: selection.id,
    title: selection.title,
    interventionType: selection.interventionType,
    // Initialize actual dosage as a copy of planned dosage baseline
    actualDosage: selection.dosage ? { ...selection.dosage } : undefined,
    deliveryStatus: 'completed_as_planned',
    modificationType: 'none',
    modificationReason: '',
    therapistExecutionNotes: '',
    immediateResponse: '',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Factory for creating an ad-hoc Session Treatment Delivery (not previously in treatment selections)
 */
export function createAdHocSessionTreatmentDelivery(
  sessionId: string,
  caseId: string,
  patientId: string,
  title: string
): SessionTreatmentDelivery {
  const now = new Date().toISOString();
  return {
    id: generateSessionTreatmentDeliveryId(),
    sessionId,
    caseId,
    patientId,
    title,
    interventionType: 'other',
    deliveryStatus: 'completed_as_planned',
    modificationType: 'intervention_added',
    modificationReason: 'Ad-hoc clinical intervention added during encounter',
    therapistExecutionNotes: '',
    immediateResponse: '',
    createdAt: now,
    updatedAt: now,
  };
}
