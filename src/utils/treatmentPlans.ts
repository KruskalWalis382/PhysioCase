import {
  TreatmentPlan,
  TreatmentPlanStatus,
  TreatmentSelection,
  TreatmentSelectionStatus,
  TreatmentCategory,
  TreatmentInterventionType,
} from '../types';

export const TREATMENT_PLANS_STORAGE_KEY =
  'physiocase_workspace_treatment_plans';
export const TREATMENT_SELECTIONS_STORAGE_KEY =
  'physiocase_workspace_treatment_selections';
export const TREATMENT_EVIDENCE_LINKS_STORAGE_KEY =
  'physiocase_workspace_treatment_evidence_links';
export const TREATMENT_CONDITION_LINKS_STORAGE_KEY =
  'physiocase_workspace_treatment_condition_links';

export const TREATMENT_INTERVENTION_TYPE_CONFIG: Record<
  TreatmentInterventionType,
  { label: string; description: string; badgeClass: string }
> = {
  therapeutic_exercise: {
    label: 'Therapeutic Exercise',
    description: 'Active, passive, resisted, or motor control therapeutic movement protocols',
    badgeClass: 'bg-[#EBF3EE] text-[#1B3B2B] border-[#CAD8D0]',
  },
  manual_therapy: {
    label: 'Manual Therapy',
    description: 'Joint mobilization, manipulation, soft tissue release, neural mobilization',
    badgeClass: 'bg-[#EFF3F6] text-[#22445E] border-[#CFDCE6]',
  },
  education: {
    label: 'Patient Education',
    description: 'Pain neuroscience, pathology explanation, ergonomic advice, coping strategies',
    badgeClass: 'bg-[#F2EDF8] text-[#3D255E] border-[#DDD3EB]',
  },
  activity_modification: {
    label: 'Activity Modification',
    description: 'Temporary movement adaptations, load management, biomechanical pacing',
    badgeClass: 'bg-[#F7F2E7] text-[#634E1B] border-[#E5DAC3]',
  },
  functional_training: {
    label: 'Functional Training',
    description: 'Task-specific movement retraining, ADL/work transfer, gait retraining',
    badgeClass: 'bg-[#EAF5F5] text-[#1C4B4D] border-[#C7DFE0]',
  },
  neuromuscular_training: {
    label: 'Neuromuscular Training',
    description: 'Proprioception, balance, perturbation, sensorimotor rehabilitation',
    badgeClass: 'bg-[#F5EDF0] text-[#542036] border-[#E3CDD5]',
  },
  cardiorespiratory_training: {
    label: 'Cardiorespiratory Training',
    description: 'Aerobic reconditioning, pacing, metabolic conditioning, work capacity',
    badgeClass: 'bg-[#EFF5EA] text-[#2F4D18] border-[#D0E2C5]',
  },
  electrotherapy: {
    label: 'Electrotherapy',
    description: 'TENS, NMES, or other electrical stimulation modalities as adjunctive care',
    badgeClass: 'bg-[#F4F2EE] text-[#4E5450] border-[#DAD5CD]',
  },
  hydrotherapy: {
    label: 'Hydrotherapy',
    description: 'Aquatic therapy, unloading, resistance in thermal buoyancy pool',
    badgeClass: 'bg-[#E9F3F7] text-[#17465C] border-[#C4DDE7]',
  },
  orthotic_or_assistive_strategy: {
    label: 'Orthotic / Assistive Strategy',
    description: 'Taping, bracing, splints, crutches, walking aids, adaptive equipment',
    badgeClass: 'bg-[#F3EFEA] text-[#524134] border-[#DDD5C9]',
  },
  self_management: {
    label: 'Self-Management Program',
    description: 'Independent home programs, symptom monitoring, flare-up action plans',
    badgeClass: 'bg-[#EBF3EE] text-[#244E38] border-[#CAD8D0]',
  },
  other: {
    label: 'Other Intervention',
    description: 'Therapist-specified adjunct or non-categorized clinical modality',
    badgeClass: 'bg-[#F4F2EE] text-[#4E5450] border-[#DAD5CD]',
  },
};

export const TREATMENT_PLAN_STATUS_CONFIG: Record<
  TreatmentPlanStatus,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  active: {
    label: 'Active',
    bg: 'bg-[#EBF2EE]',
    text: 'text-[#1B3B2B]',
    border: 'border-[#CAD8D0]',
    desc: 'Currently implemented and guiding care',
  },
  modified: {
    label: 'Modified',
    bg: 'bg-[#F2EFE9]',
    text: 'text-[#5C5549]',
    border: 'border-[#D9D2C5]',
    desc: 'Adapted following reassessment',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-[#F0F5F2]',
    text: 'text-[#23533C]',
    border: 'border-[#C2D6CC]',
    desc: 'All planned interventions and goals fulfilled',
  },
  discontinued: {
    label: 'Discontinued',
    bg: 'bg-[#F7F6F3]',
    text: 'text-[#7A817B]',
    border: 'border-[#E0DDD7]',
    desc: 'Ceased or replaced prior to completion',
  },
};

export const TREATMENT_SELECTION_STATUS_CONFIG: Record<
  TreatmentSelectionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  planned: {
    label: 'Planned',
    bg: 'bg-[#F5F2EB]',
    text: 'text-[#635A4D]',
    border: 'border-[#DDD6C8]',
  },
  active: {
    label: 'Active',
    bg: 'bg-[#EBF2EE]',
    text: 'text-[#1B3B2B]',
    border: 'border-[#CAD8D0]',
  },
  modified: {
    label: 'Modified',
    bg: 'bg-[#F2EFE9]',
    text: 'text-[#5C5549]',
    border: 'border-[#D9D2C5]',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-[#F0F5F2]',
    text: 'text-[#23533C]',
    border: 'border-[#C2D6CC]',
  },
  discontinued: {
    label: 'Discontinued',
    bg: 'bg-[#F7F6F3]',
    text: 'text-[#7A817B]',
    border: 'border-[#E0DDD7]',
  },
};

export const TREATMENT_CATEGORY_CONFIG: Record<
  TreatmentCategory,
  { label: string; description: string; shortBadge: string }
> = {
  exercise: {
    label: 'Exercise Therapy',
    description: 'Therapeutic exercises, progressive loading, range of motion, and strengthening',
    shortBadge: 'Exercise',
  },
  manual_therapy: {
    label: 'Manual Therapy',
    description: 'Joint mobilizations, soft tissue techniques, passive accessory movements',
    shortBadge: 'Manual Therapy',
  },
  education: {
    label: 'Patient Education',
    description: 'Pain neuroscience, pathology education, ergonomic advice, self-management strategies',
    shortBadge: 'Education',
  },
  functional_training: {
    label: 'Functional Training',
    description: 'Task-specific motor retraining, transfer training, gait rehabilitation',
    shortBadge: 'Functional',
  },
  activity_modification: {
    label: 'Activity Modification',
    description: 'Load management, temporary movement adaptation, occupational or sports pacing',
    shortBadge: 'Activity Mod',
  },
  aerobic_conditioning: {
    label: 'Aerobic Conditioning',
    description: 'Cardiovascular endurance training, metabolic conditioning, work capacity',
    shortBadge: 'Aerobic',
  },
  neuromuscular_training: {
    label: 'Neuromuscular Training',
    description: 'Proprioception, perturbation training, motor control, balance exercises',
    shortBadge: 'Neuromuscular',
  },
  other: {
    label: 'Other Intervention',
    description: 'Therapist-specified adjunct or non-categorized clinical modality',
    shortBadge: 'Other',
  },
};

export function generateTreatmentPlanId(): string {
  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateTreatmentSelectionId(): string {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function createEmptyTreatmentPlan(
  caseId: string,
  patientId: string
): TreatmentPlan {
  const now = new Date().toISOString();
  return {
    id: generateTreatmentPlanId(),
    caseId,
    patientId,
    title: '',
    clinicalRationale: '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export function generateTreatmentEvidenceLinkId(): string {
  return `tx_ev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateTreatmentConditionLinkId(): string {
  return `tx_cond_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function createEmptyTreatmentSelection(
  caseId: string,
  patientId: string,
  treatmentPlanId?: string
): TreatmentSelection {
  const now = new Date().toISOString();
  return {
    id: generateTreatmentSelectionId(),
    treatmentPlanId: treatmentPlanId || '',
    caseId,
    patientId,
    title: '',
    interventionType: 'therapeutic_exercise',
    category: 'exercise',
    interventionDescription: '',
    description: '',
    clinicalProblemId: '',
    linkedProblemIds: [],
    goalId: '',
    linkedGoalIds: [],
    clinicalRationale: '',
    therapistRationale: '',
    dosage: {
      frequency: '',
      intensity: '',
      duration: '',
      volume: '',
      parameters: '',
      notes: '',
    },
    progression: {
      plannedChange: '',
      progressionCriteria: '',
      regressionCriteria: '',
      reviewDate: '',
      notes: '',
    },
    status: 'planned',
    therapistNotes: '',
    createdAt: now,
    updatedAt: now,
  };
}
