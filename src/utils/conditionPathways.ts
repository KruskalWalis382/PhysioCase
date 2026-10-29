import {
  ConditionPresentation,
  ConditionEvidenceLink,
  ConditionPresentationType,
  ConditionPresentationStatus,
} from '../types';

export const CONDITION_PRESENTATIONS_STORAGE_KEY =
  'physiocase_workspace_condition_presentations';
export const CONDITION_EVIDENCE_LINKS_STORAGE_KEY =
  'physiocase_workspace_condition_evidence_links';

export interface ConditionTypeMeta {
  label: string;
  badgeClass: string;
  description: string;
}

export const CONDITION_TYPE_CONFIG: Record<
  ConditionPresentationType,
  ConditionTypeMeta
> = {
  condition: {
    label: 'Condition',
    badgeClass: 'bg-[#EBF3EE] text-[#1B3B2B] border-[#CAD8D0]',
    description: 'Distinct pathological, anatomical, or medical diagnostic entity',
  },
  clinical_presentation: {
    label: 'Clinical Presentation',
    badgeClass: 'bg-[#EFF3F6] text-[#22445E] border-[#CFDCE6]',
    description: 'Syndromic presentation, biomechanical pattern, or clinical cluster',
  },
  symptom_pattern: {
    label: 'Symptom Pattern',
    badgeClass: 'bg-[#F2EDF8] text-[#3D255E] border-[#DDD3EB]',
    description: 'Directional, postural, or pain behavior pattern (e.g. directional preference)',
  },
  functional_presentation: {
    label: 'Functional Presentation',
    badgeClass: 'bg-[#EAF5F5] text-[#1C4B4D] border-[#C7DFE0]',
    description: 'Movement impairment or activity/participation restriction pattern',
  },
  other: {
    label: 'Other',
    badgeClass: 'bg-[#F4F2EE] text-[#4E5450] border-[#DAD5CD]',
    description: 'Uncategorized or multi-domain clinical pathway',
  },
};

export interface ConditionStatusMeta {
  label: string;
  badgeClass: string;
  description: string;
}

export const CONDITION_STATUS_CONFIG: Record<
  ConditionPresentationStatus,
  ConditionStatusMeta
> = {
  active: {
    label: 'Active',
    badgeClass: 'bg-[#EBF3EE] text-[#1B3B2B] border-[#B7D4C2]',
    description: 'Active clinical knowledge pathway available for reference',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-[#F4F2EE] text-[#6A716B] border-[#DDD8CF]',
    description: 'Archived historical pathway retained for reference',
  },
};

export const COMMON_BODY_REGIONS = [
  'Cervical Spine',
  'Thoracic Spine',
  'Lumbar Spine / Pelvis',
  'Shoulder Complex',
  'Elbow / Forearm',
  'Wrist / Hand',
  'Hip / Groin',
  'Knee',
  'Ankle / Foot',
  'Craniofacial / TMJ',
  'Multi-Region / Generalized',
];

export const COMMON_SYSTEMS = [
  'Musculoskeletal',
  'Neurological / Neurodynamic',
  'Cardiovascular / Pulmonary',
  'Integumentary',
  'Vestibular',
  'Biomechanical / Ergonomic',
];

// Initial baseline pathways referencing actual demonstration evidence items
export const INITIAL_CONDITION_PRESENTATIONS: ConditionPresentation[] = [
  {
    id: 'cond_cervicogenic_headache',
    name: 'Cervicogenic Headache',
    type: 'condition',
    description:
      'Secondary headache originating from musculoskeletal disorders of the upper cervical spine (C1–C3), commonly provoked by neck movement or sustained postures.',
    bodyRegion: 'Cervical Spine',
    system: 'Musculoskeletal',
    commonTerms: [
      'CGH',
      'cervical headache',
      'upper cervical dysfunction',
      'neck-related headache',
    ],
    notes:
      'Guideline-linked pathway reflecting APTA CPG and manual therapy evidence.',
    status: 'active',
    createdAt: '2024-02-15T09:00:00.000Z',
    updatedAt: '2024-02-15T09:00:00.000Z',
  },
  {
    id: 'cond_patellofemoral_pain',
    name: 'Patellofemoral Pain (PFP)',
    type: 'clinical_presentation',
    description:
      'Peripatellar or retropatellar pain aggravated by activities that load the patellofemoral joint (squatting, stair climbing, running) in the absence of other intra-articular pathology.',
    bodyRegion: 'Knee',
    system: 'Musculoskeletal',
    commonTerms: [
      'PFP',
      'anterior knee pain',
      'runner knee',
      'chondromalacia patellae',
    ],
    notes:
      'Organizes systematic review and consensus literature supporting combined hip and knee exercise therapy.',
    status: 'active',
    createdAt: '2024-01-20T11:00:00.000Z',
    updatedAt: '2024-01-20T11:00:00.000Z',
  },
];

export const INITIAL_CONDITION_EVIDENCE_LINKS: ConditionEvidenceLink[] = [
  {
    id: 'link_cgh_01',
    conditionPresentationId: 'cond_cervicogenic_headache',
    evidenceItemId: 'item_cerv_manual_exercise_01',
    relevanceNote:
      'Core recommendation for combined upper cervical mobilization and neuromuscular exercise.',
    createdAt: '2024-02-15T09:15:00.000Z',
    updatedAt: '2024-02-15T09:15:00.000Z',
  },
  {
    id: 'link_cgh_02',
    conditionPresentationId: 'cond_cervicogenic_headache',
    evidenceItemId: 'item_cerv_education_02',
    relevanceNote:
      'Adjunctive patient education and ergonomic movement variability for sustained posture triggers.',
    createdAt: '2024-02-15T09:30:00.000Z',
    updatedAt: '2024-02-15T09:30:00.000Z',
  },
  {
    id: 'link_cgh_03',
    conditionPresentationId: 'cond_cervicogenic_headache',
    evidenceItemId: 'item_cerv_2008_historical_03',
    relevanceNote:
      'Historical 2008 guidance reference (superseded by 2021 revision).',
    createdAt: '2024-02-15T09:40:00.000Z',
    updatedAt: '2024-02-15T09:40:00.000Z',
  },
  {
    id: 'link_pfp_01',
    conditionPresentationId: 'cond_patellofemoral_pain',
    evidenceItemId: 'item_pfp_combined_loading_04',
    relevanceNote:
      'High-quality systematic review synthesising posterolateral hip and quadriceps resistance protocols.',
    createdAt: '2024-01-20T11:20:00.000Z',
    updatedAt: '2024-01-20T11:20:00.000Z',
  },
];
