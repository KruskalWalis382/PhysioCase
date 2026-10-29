import {
  OutcomeMeasureDefinition,
  ProgressMeasurement,
  ProgressRecord,
} from '../types';

export const OUTCOME_MEASURE_DEFINITIONS_STORAGE_KEY =
  'physiocase_workspace_outcome_measure_definitions';
export const PROGRESS_RECORDS_STORAGE_KEY =
  'physiocase_workspace_progress_records';
export const PROGRESS_MEASUREMENTS_STORAGE_KEY =
  'physiocase_workspace_progress_measurements';

export const INITIAL_OUTCOME_MEASURE_DEFINITIONS: OutcomeMeasureDefinition[] = [
  {
    id: 'measure-def-nprs',
    name: 'Numeric Pain Rating Scale (NPRS)',
    shortDescription: '11-point pain scale from 0 (no pain) to 10 (worst imaginable pain)',
    category: 'pain',
    valueType: 'scale_10',
    unit: '/10',
    minValue: 0,
    maxValue: 10,
    directionMeaning: 'lower_is_better',
    isSystemStandard: true,
  },
  {
    id: 'measure-def-active-rom',
    name: 'Active Range of Motion (Goniometry)',
    shortDescription: 'Goniometric measurement of physiological joint excursion',
    category: 'range_of_motion',
    valueType: 'degrees',
    unit: '°',
    directionMeaning: 'higher_is_better',
    isSystemStandard: true,
  },
  {
    id: 'measure-def-mmt',
    name: 'Manual Muscle Testing (Oxford Scale)',
    shortDescription: 'Graded manual resistance strength assessment (0–5)',
    category: 'strength',
    valueType: 'grade_5',
    unit: '/5',
    minValue: 0,
    maxValue: 5,
    directionMeaning: 'higher_is_better',
    isSystemStandard: true,
  },
  {
    id: 'measure-def-tug',
    name: 'Timed Up & Go (TUG)',
    shortDescription: 'Functional mobility test: stand from chair, walk 3m, turn, walk back, sit down',
    category: 'functional_mobility',
    valueType: 'duration_seconds',
    unit: 's',
    directionMeaning: 'lower_is_better',
    isSystemStandard: true,
  },
  {
    id: 'measure-def-6mwt',
    name: '6-Minute Walk Test (6MWT)',
    shortDescription: 'Submaximal aerobic exercise capacity and functional walking distance',
    category: 'exercise_tolerance',
    valueType: 'distance_metres',
    unit: 'm',
    directionMeaning: 'higher_is_better',
    isSystemStandard: true,
  },
  {
    id: 'measure-def-psfs',
    name: 'Patient-Specific Functional Scale (PSFS)',
    shortDescription: 'Patient-selected activity difficulty rating from 0 (unable) to 10 (able at pre-injury level)',
    category: 'patient_reported',
    valueType: 'scale_10',
    unit: '/10',
    minValue: 0,
    maxValue: 10,
    directionMeaning: 'higher_is_better',
    isSystemStandard: true,
  },
  {
    id: 'measure-def-grip-strength',
    name: 'Grip Strength Dynamometry',
    shortDescription: 'Isometric handgrip force measured with Jamar hydraulic dynamometer',
    category: 'strength',
    valueType: 'weight_kg',
    unit: 'kg',
    directionMeaning: 'higher_is_better',
    isSystemStandard: true,
  },
  {
    id: 'measure-def-sit-to-stand-30s',
    name: '30-Second Chair Stand Test',
    shortDescription: 'Number of full sit-to-stand repetitions completed in 30 seconds',
    category: 'functional_mobility',
    valueType: 'repetitions',
    unit: 'reps',
    directionMeaning: 'higher_is_better',
    isSystemStandard: true,
  },
];

export function generateProgressRecordId(): string {
  return `progress-rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function generateProgressMeasurementId(): string {
  return `progress-meas-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function generateOutcomeMeasureDefinitionId(): string {
  return `outcome-def-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Calculates absolute and percentage change safely.
 * Returns absolute delta and optional percentage delta when mathematically meaningful.
 * Does NOT generate clinical judgements (e.g. improved/worsened).
 */
export interface SafeChangeCalculationResult {
  hasNumericChange: boolean;
  absoluteChange?: number;
  percentageChange?: number;
  formattedChangeText: string;
}

export function calculateSafeChange(
  baselineValue?: number,
  currentValue?: number,
  unit?: string
): SafeChangeCalculationResult {
  if (
    baselineValue === undefined ||
    baselineValue === null ||
    isNaN(baselineValue) ||
    currentValue === undefined ||
    currentValue === null ||
    isNaN(currentValue)
  ) {
    return {
      hasNumericChange: false,
      formattedChangeText: '—',
    };
  }

  const delta = Number((currentValue - baselineValue).toFixed(2));
  const sign = delta > 0 ? '+' : '';
  const unitSuffix = unit ? ` ${unit}` : '';

  let pctChange: number | undefined = undefined;
  // Only calculate percentage change if baseline is non-zero and absolute value is sufficiently stable
  if (baselineValue !== 0) {
    pctChange = Number((((currentValue - baselineValue) / Math.abs(baselineValue)) * 100).toFixed(1));
  }

  return {
    hasNumericChange: true,
    absoluteChange: delta,
    percentageChange: pctChange,
    formattedChangeText: `${sign}${delta}${unitSuffix}`,
  };
}
