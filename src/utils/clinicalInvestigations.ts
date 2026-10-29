import {
  ClinicalInvestigation,
  RadiologicalModality,
  InvestigationCategory,
} from '../types';

export const CLINICAL_INVESTIGATIONS_STORAGE_KEY =
  'physiocase_workspace_clinical_investigations';

export interface ModalityConfig {
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  tagClass: string;
  accentColor: string;
}

export const RADIOLOGICAL_MODALITY_CONFIG: Record<
  RadiologicalModality,
  ModalityConfig
> = {
  xray: {
    label: 'X-ray (Plain Radiograph)',
    shortLabel: 'X-ray',
    description: 'Plain film projection radiography for osseous alignment, fractures, and joint spaces.',
    badgeClass: 'bg-[#EBF2EE] text-[#1B3B2B] border-[#CAD8D0]',
    tagClass: 'bg-[#F0F5F2] text-[#1B3B2B]',
    accentColor: '#1B3B2B',
  },
  mri: {
    label: 'MRI (Magnetic Resonance Imaging)',
    shortLabel: 'MRI',
    description: 'Cross-sectional soft tissue, ligamentous, cartilaginous, and neural neural canal visualization.',
    badgeClass: 'bg-[#EEF4FB] text-[#1D4E89] border-[#C8DCF0]',
    tagClass: 'bg-[#F2F7FC] text-[#1D4E89]',
    accentColor: '#1D4E89',
  },
  ct: {
    label: 'CT (Computed Tomography)',
    shortLabel: 'CT',
    description: 'High-resolution computerized axial tomography for bony architecture and complex joint structures.',
    badgeClass: 'bg-[#F6EEFB] text-[#6A2B86] border-[#DEC5EE]',
    tagClass: 'bg-[#FAF4FC] text-[#6A2B86]',
    accentColor: '#6A2B86',
  },
  ultrasound: {
    label: 'Ultrasound (Diagnostic Sonography)',
    shortLabel: 'Ultrasound',
    description: 'Dynamic real-time soft tissue, tendon excursion, bursal distension, and Doppler vascular assessment.',
    badgeClass: 'bg-[#FDF3E7] text-[#8C5511] border-[#EAD2B4]',
    tagClass: 'bg-[#FAF5EE] text-[#8C5511]',
    accentColor: '#8C5511',
  },
  other: {
    label: 'Other Imaging Modality',
    shortLabel: 'Other',
    description: 'Other specialized diagnostic imaging or radiological investigations.',
    badgeClass: 'bg-[#F4EFEB] text-[#555C56] border-[#DED7CB]',
    tagClass: 'bg-[#F6F2EE] text-[#555C56]',
    accentColor: '#555C56',
  },
};

/**
 * Generates an investigation ID following PhysioCase identifier convention: INV-XXXX
 * Automatically scans existing investigations to guarantee uniqueness.
 */
export function generateInvestigationId(
  existingInvestigations: ClinicalInvestigation[] = []
): string {
  let maxNumber = 0;
  for (const inv of existingInvestigations) {
    if (!inv || !inv.id) continue;
    const match = inv.id.match(/^INV-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  const nextNum = maxNumber + 1;
  return `INV-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Creates an empty investigation template for form initialization.
 */
export function createEmptyInvestigation(
  caseId: string
): Omit<ClinicalInvestigation, 'id' | 'createdAt' | 'updatedAt'> {
  const today = new Date().toISOString().split('T')[0];
  return {
    caseId,
    category: 'radiological',
    modality: 'xray',
    name: '',
    bodyRegion: '',
    investigationDate: today,
    indication: '',
    findings: '',
    impression: '',
    sourceType: '',
    sourceName: '',
    clinicianRelevance: '',
  };
}

/**
 * Validates a clinical investigation payload according to Stage 4F rules:
 * - name must not be empty / whitespace-only
 * - category must be valid
 * - modality must be one of the supported modalities
 * - investigationDate must be valid
 * - caseId must be provided
 */
export function validateClinicalInvestigation(
  data: Partial<ClinicalInvestigation>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Investigation name is required.';
  }

  if (!data.modality || !['xray', 'mri', 'ct', 'ultrasound', 'other'].includes(data.modality)) {
    errors.modality = 'A valid radiological modality must be selected.';
  }

  if (!data.investigationDate || !data.investigationDate.trim()) {
    errors.investigationDate = 'Investigation date is required.';
  } else {
    const timestamp = Date.parse(data.investigationDate);
    if (isNaN(timestamp)) {
      errors.investigationDate = 'Please provide a valid date (YYYY-MM-DD).';
    }
  }

  if (!data.caseId || !data.caseId.trim()) {
    errors.caseId = 'Investigation must be associated with a valid Case.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Chronologically sorts investigations (default newest first).
 */
export function sortInvestigationsChronological(
  investigations: ClinicalInvestigation[],
  ascending: boolean = false
): ClinicalInvestigation[] {
  return [...investigations].sort((a, b) => {
    const dateA = new Date(a.investigationDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.investigationDate || b.createdAt || 0).getTime();
    if (dateA !== dateB) {
      return ascending ? dateA - dateB : dateB - dateA;
    }
    // Secondary tie-breaker on createdAt
    const createdA = new Date(a.createdAt || 0).getTime();
    const createdB = new Date(b.createdAt || 0).getTime();
    return ascending ? createdA - createdB : createdB - createdA;
  });
}
