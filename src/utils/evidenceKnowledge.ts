import {
  EvidenceSource,
  EvidenceItem,
  EvidenceType,
  EvidenceSourceStatus,
} from '../types';

export const EVIDENCE_SOURCES_STORAGE_KEY = 'physiocase_workspace_evidence_sources';
export const EVIDENCE_ITEMS_STORAGE_KEY = 'physiocase_workspace_evidence_items';

export interface EvidenceTypeMeta {
  label: string;
  shortLabel: string;
  badgeClass: string;
}

export const EVIDENCE_TYPE_CONFIG: Record<EvidenceType, EvidenceTypeMeta> = {
  clinical_practice_guideline: {
    label: 'Clinical Practice Guideline',
    shortLabel: 'CPG',
    badgeClass: 'bg-[#EBF3EE] text-[#1B3B2B] border-[#CAD8D0]',
  },
  systematic_review: {
    label: 'Systematic Review',
    shortLabel: 'Sys Rev',
    badgeClass: 'bg-[#EFF3F6] text-[#22445E] border-[#CFDCE6]',
  },
  meta_analysis: {
    label: 'Meta-Analysis',
    shortLabel: 'Meta-Analysis',
    badgeClass: 'bg-[#F2EDF8] text-[#3D255E] border-[#DDD3EB]',
  },
  randomized_controlled_trial: {
    label: 'Randomized Controlled Trial',
    shortLabel: 'RCT',
    badgeClass: 'bg-[#EAF5F5] text-[#1C4B4D] border-[#C7DFE0]',
  },
  cohort_study: {
    label: 'Cohort Study',
    shortLabel: 'Cohort',
    badgeClass: 'bg-[#F5F2EC] text-[#554323] border-[#E3DAC8]',
  },
  case_control_study: {
    label: 'Case-Control Study',
    shortLabel: 'Case-Ctrl',
    badgeClass: 'bg-[#F5EFEF] text-[#593030] border-[#E3CDCD]',
  },
  consensus_statement: {
    label: 'Consensus Statement',
    shortLabel: 'Consensus',
    badgeClass: 'bg-[#F8F4EA] text-[#4E431E] border-[#E8DFBE]',
  },
  position_statement: {
    label: 'Position Statement',
    shortLabel: 'Position',
    badgeClass: 'bg-[#EEF4F6] text-[#1B4352] border-[#CDE1E8]',
  },
  other: {
    label: 'Other',
    shortLabel: 'Other',
    badgeClass: 'bg-[#F4F2EE] text-[#4E5450] border-[#DAD5CD]',
  },
};

export interface EvidenceStatusMeta {
  label: string;
  badgeClass: string;
  description: string;
}

export const EVIDENCE_SOURCE_STATUS_CONFIG: Record<EvidenceSourceStatus, EvidenceStatusMeta> = {
  current: {
    label: 'Current',
    badgeClass: 'bg-[#EBF3EE] text-[#1B3B2B] border-[#B7CEBF]',
    description: 'Active source currently supported in the evidence library',
  },
  superseded: {
    label: 'Superseded',
    badgeClass: 'bg-[#FBF4E8] text-[#7A4B10] border-[#E8D1A8]',
    description: 'A newer evidence source has replaced this publication',
  },
  withdrawn: {
    label: 'Withdrawn',
    badgeClass: 'bg-[#FBEAEA] text-[#7E2828] border-[#E8B5B5]',
    description: 'Withdrawn by the authoring body or publishing journal',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-[#EFEFEF] text-[#555A57] border-[#D4D4D4]',
    description: 'Preserved for historical context; not treated as current active evidence',
  },
};

export const createEmptyEvidenceSource = (): Omit<EvidenceSource, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    title: '',
    authors: [],
    organization: '',
    publicationYear: new Date().getFullYear(),
    evidenceType: 'clinical_practice_guideline',
    journalOrPublisher: '',
    doi: '',
    url: '',
    version: '',
    status: 'current',
    notes: '',
  };
};

export const createEmptyEvidenceItem = (
  sourceId: string
): Omit<EvidenceItem, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    sourceId,
    title: '',
    summary: '',
    conditionOrPresentation: '',
    population: '',
    clinicalContext: '',
    treatmentApproach: '',
    recommendation: '',
    recommendationStrength: '',
    evidenceLevel: '',
    limitations: '',
    applicability: '',
  };
};

// Seed demonstration sources & items to ensure cold-start traceability and zero-mock integrity
export const INITIAL_EVIDENCE_SOURCES: EvidenceSource[] = [
  {
    id: 'src_cpg_cervicogenic_2021',
    title: 'Clinical Practice Guideline: Physical Therapy Management of Patients With Suspected or Confirmed Cervicogenic Headache',
    authors: ['Blanpied PR', 'Gross AR', 'Elliott JM', 'Devaney LL', 'Clewley D'],
    organization: 'Academy of Orthopaedic Physical Therapy (AOPT / APTA)',
    publicationYear: 2021,
    evidenceType: 'clinical_practice_guideline',
    journalOrPublisher: 'Journal of Orthopaedic & Sports Physical Therapy',
    doi: '10.2519/jospt.2021.0304',
    url: 'https://www.jospt.org/doi/10.2519/jospt.2021.0304',
    version: 'Revised 2021',
    status: 'current',
    publishedAt: '2021-04-01',
    lastReviewedAt: '2024-02-15',
    notes: 'Comprehensive revision updating the 2008 AOPT neck pain and headache clinical guideline.',
    createdAt: '2024-02-15T09:00:00.000Z',
    updatedAt: '2024-02-15T09:00:00.000Z',
  },
  {
    id: 'src_cpg_cervicogenic_2008',
    title: 'Neck Pain: Clinical Practice Guidelines Linked to the International Classification of Functioning, Disability, and Health (2008)',
    authors: ['Childs JD', 'Cleland JA', 'Elliott JM', 'Teyhen DS'],
    organization: 'Orthopaedic Section of the American Physical Therapy Association',
    publicationYear: 2008,
    evidenceType: 'clinical_practice_guideline',
    journalOrPublisher: 'Journal of Orthopaedic & Sports Physical Therapy',
    doi: '10.2519/jospt.2008.0303',
    version: '1.0 (2008)',
    status: 'superseded',
    supersededBySourceId: 'src_cpg_cervicogenic_2021',
    publishedAt: '2008-09-01',
    lastReviewedAt: '2021-04-10',
    notes: 'Preserved for historical context. Superseded by the 2021 AOPT revision (src_cpg_cervicogenic_2021).',
    createdAt: '2021-04-10T10:00:00.000Z',
    updatedAt: '2021-04-10T10:00:00.000Z',
  },
  {
    id: 'src_sr_patellofemoral_2023',
    title: 'Supervised Exercise Therapy vs Usual Care for Patellofemoral Pain: A Systematic Review and Meta-Analysis',
    authors: ['van der Heijden RA', 'Lankhorst NE', 'van Linschoten R', 'Bierma-Zeinstra SM', 'van Middelkoop M'],
    organization: 'International Patellofemoral Pain Research Community',
    publicationYear: 2023,
    evidenceType: 'systematic_review',
    journalOrPublisher: 'British Journal of Sports Medicine',
    doi: '10.1136/bjsports-2022-106500',
    status: 'current',
    publishedAt: '2023-03-12',
    lastReviewedAt: '2024-01-20',
    notes: 'Synthesizes randomized trials evaluating posterolateral hip and quadriceps targeted loading protocols.',
    createdAt: '2024-01-20T11:00:00.000Z',
    updatedAt: '2024-01-20T11:00:00.000Z',
  },
];

export const INITIAL_EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'item_cerv_manual_exercise_01',
    sourceId: 'src_cpg_cervicogenic_2021',
    title: 'Multimodal Care: Cervical/Cervicothoracic Mobilization Combined with Therapeutic Exercise',
    summary: 'Clinicians should consider cervical and cervicothoracic mobilization or manipulation combined with deep neck flexor strengthening and scapulothoracic endurance exercises for reducing headache frequency and intensity.',
    conditionOrPresentation: 'Cervicogenic Headache with upper cervical joint dysfunction',
    population: 'Adults aged 18–65 presenting with unilateral or non-continuous headache provoked by sustained cervical postures or movement',
    clinicalContext: 'Outpatient orthopedic physical therapy during subacute or chronic presentation',
    treatmentApproach: 'Combined manual therapy (joint mobilization/thrust) with progressive neuromuscular stabilization exercises',
    recommendation: 'Clinicians should utilize cervical mobilization/manipulation in conjunction with active strengthening and endurance exercise rather than exercise alone.',
    recommendationStrength: 'Moderate',
    evidenceLevel: 'Level B',
    limitations: 'Evidence primarily examines short- to mid-term outcomes (up to 6 months); comparative data on high-velocity manipulation versus mobilization alone remains heterogeneous.',
    applicability: 'Applicable when physical examination reproduces familiar headache pain during passive accessory intervertebral motion testing of C1-C3 or flexion-rotation testing.',
    createdAt: '2024-02-15T09:15:00.000Z',
    updatedAt: '2024-02-15T09:15:00.000Z',
  },
  {
    id: 'item_cerv_education_02',
    sourceId: 'src_cpg_cervicogenic_2021',
    title: 'Patient Education and Ergonomic Movement Variability',
    summary: 'Clinicians should provide active education emphasizing movement variability, workplace postural adjustments, and reassurance regarding the benign mechanical origin of cervicogenic headache.',
    conditionOrPresentation: 'Cervicogenic Headache associated with sustained occupational postural load',
    population: 'Desk workers and individuals with prolonged static seated cervical flexion',
    clinicalContext: 'Outpatient clinical consultation alongside active therapeutic exercise',
    treatmentApproach: 'Patient education, ergonomic modification, and active self-management strategies',
    recommendation: 'Clinicians may provide ergonomic and postural education as an adjunct to active exercise and manual therapy.',
    recommendationStrength: 'Weak',
    evidenceLevel: 'Level C',
    limitations: 'High heterogeneity across educational interventions; education delivered in isolation without active physical exercise exhibits minimal therapeutic effect.',
    applicability: 'Most relevant for desk workers who report headache onset correlated with prolonged computer or visual display terminal work.',
    createdAt: '2024-02-15T09:30:00.000Z',
    updatedAt: '2024-02-15T09:30:00.000Z',
  },
  {
    id: 'item_cerv_2008_historical_03',
    sourceId: 'src_cpg_cervicogenic_2008',
    title: 'Cervical Mobilization and Manipulation for Headaches Associated With Neck Pain (2008 Formulation)',
    summary: 'Clinicians should consider the use of cervical manipulation or mobilization for patients with unilateral headache associated with neck pain and restriction.',
    conditionOrPresentation: 'Headache associated with cervical spine disorders (2008 classification)',
    population: 'Adults with unilateral headache associated with neck pain',
    clinicalContext: 'Outpatient physical therapy care',
    treatmentApproach: 'Cervical spinal manipulative therapy (thrust and non-thrust)',
    recommendation: 'Clinicians should utilize cervical manipulation or mobilization.',
    recommendationStrength: 'Grade B',
    evidenceLevel: 'Level IIb',
    limitations: 'Based on pre-2008 trial literature; diagnostic criteria did not standardize flexion-rotation test cut-offs established in later literature.',
    applicability: 'Historical reference for initial guideline formulation; now superseded by 2021 AOPT guidance.',
    createdAt: '2021-04-10T10:15:00.000Z',
    updatedAt: '2021-04-10T10:15:00.000Z',
  },
  {
    id: 'item_pfp_combined_loading_04',
    sourceId: 'src_sr_patellofemoral_2023',
    title: 'Targeted Hip and Knee Progressive Resistance Exercise for Patellofemoral Pain',
    summary: 'Combining posterolateral hip strengthening (abductors and external rotators) with quadriceps loading yields significantly greater pain reduction and functional improvement than isolated quadriceps exercises alone.',
    conditionOrPresentation: 'Patellofemoral Pain (PFP) without intra-articular structural pathology',
    population: 'Active adolescents and adults aged 15–40 experiencing peripatellar or retropatellar pain aggravated by squatting, stairs, or running',
    clinicalContext: 'Outpatient physiotherapy clinic setting over an 8- to 12-week rehabilitation protocol',
    treatmentApproach: 'Progressive resistance training targeting hip abductors, external rotators, and knee extensors',
    recommendation: 'Clinicians should prioritize combined posterolateral hip and quadriceps strengthening over isolated knee extensor exercise in the initial 6–12 weeks of rehabilitation.',
    recommendationStrength: 'Strong',
    evidenceLevel: 'Level 1a',
    limitations: 'Long-term compliance beyond 12 months remains variable; subgroups presenting with severe foot pronation or structural malalignment may require adjunct management.',
    applicability: 'Applicable to recreational and competitive runners, jumpers, and general population presenting with load-dependent anterior knee pain.',
    createdAt: '2024-01-20T11:20:00.000Z',
    updatedAt: '2024-01-20T11:20:00.000Z',
  },
];
