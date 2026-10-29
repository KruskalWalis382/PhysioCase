import {
  Case,
  CaseDischargeRecord,
} from '../src/types';
import {
  LongitudinalClinicalDataset,
  deriveLongitudinalOutcomeSeries,
} from '../src/utils/longitudinalPatientHistory';
import { calculateSafeChange } from '../src/utils/clinicalProgress';

function createBaseDataset(): LongitudinalClinicalDataset {
  return {
    patients: [],
    cases: [],
    subjectiveAssessments: [],
    objectiveAssessments: [],
    clinicalInvestigations: [],
    clinicalProblems: [],
    clinicalGoals: [],
    clinicalSessions: [],
    sessionTreatmentDeliveries: [],
    progressRecords: [],
    progressMeasurements: [],
    caseDischargeRecords: [],
  };
}

function mockCase(c: {
  id: string;
  patientId: string;
  caseId?: string;
  caseName?: string;
  status?: Case['status'];
  startDate?: string;
}): Case {
  return {
    id: c.id,
    caseId: c.caseId || c.id.toUpperCase(),
    patientId: c.patientId,
    caseName: c.caseName || 'Clinical Case',
    status: c.status || 'Treatment',
    startDate: c.startDate || '2025-01-01',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`✓ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

console.log('=== STAGE 10C-C VERIFICATION SUITE ===\n');

// -----------------------------------------------------------
// TEST 1: Patient with zero cases
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  const series = deriveLongitudinalOutcomeSeries('pt-none', dataset);
  assert(series.length === 0, 'Test 1: Patient with zero cases returns zero outcome series');
}

// -----------------------------------------------------------
// TEST 2: Patient with one case and multiple measurements
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', caseId: 'CASE-001', patientId: 'pt-1', caseName: 'Lumbar Spine' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Baseline evaluation',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push(
    {
      id: 'm-1',
      progressRecordId: 'rec-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureDefinitionId: 'measure-def-nprs',
      measureName: 'Numeric Pain Rating Scale (NPRS)',
      category: 'pain',
      valueType: 'scale_10',
      unit: '/10',
      stage: 'baseline',
      numericValue: 8,
      createdAt: '2025-01-10T10:05:00Z',
      updatedAt: '2025-01-10T10:05:00Z',
    },
    {
      id: 'm-2',
      progressRecordId: 'rec-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureDefinitionId: 'measure-def-nprs',
      measureName: 'Numeric Pain Rating Scale (NPRS)',
      category: 'pain',
      valueType: 'scale_10',
      unit: '/10',
      stage: 'interim',
      numericValue: 5,
      createdAt: '2025-01-10T10:10:00Z',
      updatedAt: '2025-01-10T10:10:00Z',
    }
  );

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series.length === 1, 'Test 2: One correctly grouped series for single measure');
  assert(series[0].points.length === 2, 'Test 2: All measurements preserved');
  assert(series[0].episodes.length === 1, 'Test 2: Single episode bucket');
}

// -----------------------------------------------------------
// TEST 3: Patient with multiple cases (correct episode segmentation)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(
    mockCase({
      id: 'case-1',
      caseId: 'CASE-001',
      patientId: 'pt-1',
      caseName: 'Lumbar Episode 1',
      status: 'Discharged',
      startDate: '2025-01-01',
    }),
    mockCase({
      id: 'case-2',
      caseId: 'CASE-002',
      patientId: 'pt-1',
      caseName: 'Lumbar Episode 2',
      status: 'Treatment',
      startDate: '2025-06-01',
    })
  );
  dataset.progressRecords.push(
    {
      id: 'rec-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      recordDate: '2025-01-10',
      contextType: 'routine_progress_review',
      therapistSummary: 'Ep 1 Eval',
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    },
    {
      id: 'rec-2',
      caseId: 'case-2',
      patientId: 'pt-1',
      recordDate: '2025-06-05',
      contextType: 'routine_progress_review',
      therapistSummary: 'Ep 2 Eval',
      createdAt: '2025-06-05T10:00:00Z',
      updatedAt: '2025-06-05T10:00:00Z',
    }
  );
  dataset.progressMeasurements.push(
    {
      id: 'm-1',
      progressRecordId: 'rec-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureDefinitionId: 'measure-def-nprs',
      measureName: 'Numeric Pain Rating Scale (NPRS)',
      category: 'pain',
      valueType: 'scale_10',
      unit: '/10',
      stage: 'baseline',
      numericValue: 8,
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    },
    {
      id: 'm-2',
      progressRecordId: 'rec-2',
      caseId: 'case-2',
      patientId: 'pt-1',
      measureDefinitionId: 'measure-def-nprs',
      measureName: 'Numeric Pain Rating Scale (NPRS)',
      category: 'pain',
      valueType: 'scale_10',
      unit: '/10',
      stage: 'baseline',
      numericValue: 6,
      createdAt: '2025-06-05T10:00:00Z',
      updatedAt: '2025-06-05T10:00:00Z',
    }
  );

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series.length === 1, 'Test 3: Single series across episodes');
  assert(series[0].episodes.length === 2, 'Test 3: Correct episode segmentation into 2 buckets');
  assert(series[0].episodes[0].caseId === 'case-1', 'Test 3: First episode bucket is case-1');
  assert(series[0].episodes[1].caseId === 'case-2', 'Test 3: Second episode bucket is case-2');
}

// -----------------------------------------------------------
// TEST 4: Two similar measure names (no unsafe semantic merging)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Cervical' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Eval',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push(
    {
      id: 'm-1',
      progressRecordId: 'rec-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureName: 'NPRS',
      category: 'pain',
      valueType: 'scale_10',
      unit: '/10',
      stage: 'baseline',
      numericValue: 7,
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    },
    {
      id: 'm-2',
      progressRecordId: 'rec-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureName: 'NPRS Pain',
      category: 'pain',
      valueType: 'scale_10',
      unit: '/10',
      stage: 'baseline',
      numericValue: 6,
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    }
  );

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series.length === 2, 'Test 4: No unsafe semantic merging of NPRS and NPRS Pain');
}

// -----------------------------------------------------------
// TEST 5: Patient isolation (zero cross-patient leakage)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(
    mockCase({ id: 'case-pt1', patientId: 'pt-1', caseName: 'Pt 1 Case' }),
    mockCase({ id: 'case-pt2', patientId: 'pt-2', caseName: 'Pt 2 Case' })
  );
  dataset.progressRecords.push(
    {
      id: 'rec-pt1',
      caseId: 'case-pt1',
      patientId: 'pt-1',
      recordDate: '2025-01-10',
      contextType: 'routine_progress_review',
      therapistSummary: 'Pt 1',
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    },
    {
      id: 'rec-pt2',
      caseId: 'case-pt2',
      patientId: 'pt-2',
      recordDate: '2025-01-10',
      contextType: 'routine_progress_review',
      therapistSummary: 'Pt 2',
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    }
  );
  dataset.progressMeasurements.push(
    {
      id: 'm-pt1',
      progressRecordId: 'rec-pt1',
      caseId: 'case-pt1',
      patientId: 'pt-1',
      measureDefinitionId: 'measure-def-tug',
      measureName: 'Timed Up & Go (TUG)',
      category: 'functional_mobility',
      valueType: 'duration_seconds',
      unit: 's',
      stage: 'baseline',
      numericValue: 12,
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    },
    {
      id: 'm-pt2',
      progressRecordId: 'rec-pt2',
      caseId: 'case-pt2',
      patientId: 'pt-2',
      measureDefinitionId: 'measure-def-tug',
      measureName: 'Timed Up & Go (TUG)',
      category: 'functional_mobility',
      valueType: 'duration_seconds',
      unit: 's',
      stage: 'baseline',
      numericValue: 18,
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    }
  );

  const seriesPt1 = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(seriesPt1.length === 1 && seriesPt1[0].points.length === 1, 'Test 5: Pt 1 receives only their measurement');
  assert(seriesPt1[0].points[0].scoreNumeric === 12, 'Test 5: Zero cross-patient leakage into Pt 1');

  const seriesPt2 = deriveLongitudinalOutcomeSeries('pt-2', dataset);
  assert(seriesPt2.length === 1 && seriesPt2[0].points.length === 1, 'Test 5: Pt 2 receives only their measurement');
  assert(seriesPt2[0].points[0].scoreNumeric === 18, 'Test 5: Zero cross-patient leakage into Pt 2');
}

// -----------------------------------------------------------
// TEST 6: Malformed measurement pointer
// (patientId is pt-1, but caseId belongs to pt-2)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(
    mockCase({ id: 'case-pt1', patientId: 'pt-1', caseName: 'Pt 1 Case' }),
    mockCase({ id: 'case-pt2', patientId: 'pt-2', caseName: 'Pt 2 Case' })
  );
  dataset.progressRecords.push({
    id: 'rec-pt2',
    caseId: 'case-pt2',
    patientId: 'pt-2',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Pt 2',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-malformed',
    progressRecordId: 'rec-pt2',
    caseId: 'case-pt2', // Belongs to pt-2!
    patientId: 'pt-1', // Claims to belong to pt-1!
    measureDefinitionId: 'measure-def-tug',
    measureName: 'Timed Up & Go (TUG)',
    category: 'functional_mobility',
    valueType: 'duration_seconds',
    unit: 's',
    stage: 'baseline',
    numericValue: 99,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series.length === 0, 'Test 6: Malformed measurement pointer excluded by two-tier patient isolation');
}

// -----------------------------------------------------------
// TEST 7: ProgressRecord date precedence
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-15', // Authoritative clinical evaluation date
    contextType: 'routine_progress_review',
    therapistSummary: 'Progress Review',
    createdAt: '2025-02-01T10:00:00Z', // Later system timestamp
    updatedAt: '2025-02-01T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-1',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'Grip Strength',
    category: 'strength',
    valueType: 'weight_kg',
    unit: 'kg',
    stage: 'baseline',
    numericValue: 35,
    createdAt: '2025-02-01T10:05:00Z',
    updatedAt: '2025-02-01T10:05:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series[0].points[0].date === '2025-01-15', 'Test 7: ProgressRecord.recordDate used instead of createdAt');
}

// -----------------------------------------------------------
// TEST 8: Missing parent ProgressRecord (fallback to createdAt)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressMeasurements.push({
    id: 'm-orphan',
    progressRecordId: 'non-existent-rec',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'Grip Strength',
    category: 'strength',
    valueType: 'weight_kg',
    unit: 'kg',
    stage: 'baseline',
    numericValue: 35,
    createdAt: '2025-03-20T14:30:00Z',
    updatedAt: '2025-03-20T14:30:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series[0].points[0].date === '2025-03-20', 'Test 8: Safe fallback to measurement.createdAt');
}

// -----------------------------------------------------------
// TEST 9: Duplicate same-day measurements
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Repetition tests',
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-01-10T09:00:00Z',
  });
  dataset.progressMeasurements.push(
    {
      id: 'm-b',
      progressRecordId: 'rec-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureName: 'Active ROM',
      category: 'range_of_motion',
      valueType: 'degrees',
      unit: '°',
      stage: 'baseline',
      numericValue: 110,
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z',
    },
    {
      id: 'm-a',
      progressRecordId: 'rec-1',
      caseId: 'case-1',
      patientId: 'pt-1',
      measureName: 'Active ROM',
      category: 'range_of_motion',
      valueType: 'degrees',
      unit: '°',
      stage: 'baseline',
      numericValue: 115,
      createdAt: '2025-01-10T09:30:00Z',
      updatedAt: '2025-01-10T09:30:00Z',
    }
  );

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series[0].points.length === 2, 'Test 9: Both duplicate same-day measurements preserved');
  assert(series[0].points[0].measurementId === 'm-a', 'Test 9: Deterministic chronological ordering preserved (m-a before m-b)');
}

// -----------------------------------------------------------
// TEST 10: Numeric baseline/current (calculateSafeChange output)
// -----------------------------------------------------------
{
  const result = calculateSafeChange(8, 3, '/10');
  assert(result.hasNumericChange === true, 'Test 10: Safe numeric change calculated');
  assert(result.formattedChangeText === '-5 /10' || result.formattedChangeText === '-5.00 /10', 'Test 10: Formatted delta is correct', result.formattedChangeText);
}

// -----------------------------------------------------------
// TEST 11: No baseline (delta is —)
// -----------------------------------------------------------
{
  const result = calculateSafeChange(undefined, 5, '°');
  assert(result.hasNumericChange === false && result.formattedChangeText === '—', 'Test 11: Missing baseline produces delta —');
}

// -----------------------------------------------------------
// TEST 12: Categorical/text measurement
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Gait assessment',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-text',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'Gait Deviation Pattern',
    category: 'functional_mobility',
    valueType: 'text',
    stage: 'baseline',
    textValue: 'Antalgic gait with reduced right stance phase',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series[0].points[0].scoreText === 'Antalgic gait with reduced right stance phase', 'Test 12: Categorical text preserved verbatim');
  assert(series[0].valueType === 'text', 'Test 12: Series valueType marked text');
}

// -----------------------------------------------------------
// TEST 13: Goal target (displayed when authoritative targetValue exists)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.clinicalGoals.push({
    id: 'goal-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    title: 'Achieve 130° shoulder flexion',
    type: 'short_term',
    linkedProblemIds: [],
    targetValue: '130',
    status: 'active',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  });
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Goal tracking',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-1',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'Shoulder Flexion',
    category: 'range_of_motion',
    valueType: 'degrees',
    unit: '°',
    stage: 'interim',
    numericValue: 110,
    linkedGoalId: 'goal-1',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series[0].points[0].targetValue === '130', 'Test 13: Documented goal target resolved from linkedGoalId');
}

// -----------------------------------------------------------
// TEST 14: No goal target (target is undefined)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Tracking',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-1',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'Shoulder Flexion',
    category: 'range_of_motion',
    valueType: 'degrees',
    unit: '°',
    stage: 'interim',
    numericValue: 110,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series[0].points[0].targetValue === undefined, 'Test 14: Unlinked measurement has targetValue undefined');
}

// -----------------------------------------------------------
// TEST 15: Measurement mutation (immediate reflection)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Tracking',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-1',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'TUG',
    category: 'functional_mobility',
    valueType: 'duration_seconds',
    unit: 's',
    stage: 'baseline',
    numericValue: 14,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  const series1 = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series1[0].points[0].scoreNumeric === 14, 'Test 15: Initial value 14');

  // Mutate measurement in dataset
  dataset.progressMeasurements[0].numericValue = 11;
  const series2 = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series2[0].points[0].scoreNumeric === 11, 'Test 15: Mutated value 11 immediately reflected upon derivation');
}

// -----------------------------------------------------------
// TEST 16: Measurement deletion
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Tracking',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-1',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'TUG',
    category: 'functional_mobility',
    valueType: 'duration_seconds',
    unit: 's',
    stage: 'baseline',
    numericValue: 14,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  dataset.progressMeasurements = [];
  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series.length === 0, 'Test 16: Deleted measurement disappears from series');
}

// -----------------------------------------------------------
// TEST 17: Case deletion
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Tracking',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-1',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'TUG',
    category: 'functional_mobility',
    valueType: 'duration_seconds',
    unit: 's',
    stage: 'baseline',
    numericValue: 14,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  // Delete case
  dataset.cases = [];
  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series.length === 0, 'Test 17: Deleted case automatically excludes its measurements');
}

// -----------------------------------------------------------
// TEST 18: Case navigation provenance
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', caseId: 'CASE-001', patientId: 'pt-1', caseName: 'Lumbar Strain' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Tracking',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-1',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'NPRS',
    category: 'pain',
    valueType: 'scale_10',
    unit: '/10',
    stage: 'baseline',
    numericValue: 7,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  const pt = series[0].points[0];
  assert(pt.caseId === 'case-1' && pt.originatingCaseDisplayId === 'CASE-001', 'Test 18: Full provenance for case navigation preserved');
}

// -----------------------------------------------------------
// TEST 19: Closed case representation
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(
    mockCase({
      id: 'case-closed',
      caseId: 'CASE-DISCHARGED',
      patientId: 'pt-1',
      caseName: 'Past Episode',
      status: 'Discharged',
      startDate: '2025-01-01',
    })
  );
  dataset.caseDischargeRecords.push({
    id: 'dis-1',
    caseId: 'case-closed',
    patientId: 'pt-1',
    dischargeDate: '2025-02-28',
    dischargeReason: 'goals_achieved',
    episodeSummary: 'Treatment complete',
    clinicalStatusAtDischarge: 'Full ROM restored',
    createdAt: '2025-02-28T12:00:00Z',
    updatedAt: '2025-02-28T12:00:00Z',
  });
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-closed',
    patientId: 'pt-1',
    recordDate: '2025-02-28',
    contextType: 'discharge_evaluation',
    therapistSummary: 'Discharge outcome',
    createdAt: '2025-02-28T10:00:00Z',
    updatedAt: '2025-02-28T10:00:00Z',
  });
  dataset.progressMeasurements.push({
    id: 'm-closed',
    progressRecordId: 'rec-1',
    caseId: 'case-closed',
    patientId: 'pt-1',
    measureName: 'NPRS',
    category: 'pain',
    valueType: 'scale_10',
    unit: '/10',
    stage: 'discharge',
    numericValue: 1,
    createdAt: '2025-02-28T10:00:00Z',
    updatedAt: '2025-02-28T10:00:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  assert(series[0].points[0].isFromClosedCase === true, 'Test 19: Point isFromClosedCase marked true');
  assert(series[0].episodes[0].isClosed === true, 'Test 19: Episode bucket marked isClosed true');
  assert(series[0].episodes[0].dischargeDate === '2025-02-28', 'Test 19: Discharge date resolved on episode bucket');
}

// -----------------------------------------------------------
// TEST 20: Direction meaning (never inferred from name; only from authoritative definition)
// -----------------------------------------------------------
{
  const dataset = createBaseDataset();
  dataset.cases.push(mockCase({ id: 'case-1', patientId: 'pt-1', caseName: 'Case 1' }));
  dataset.progressRecords.push({
    id: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    recordDate: '2025-01-10',
    contextType: 'routine_progress_review',
    therapistSummary: 'Tracking',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  // Custom measure with name containing "Pain" but no definitionId
  dataset.progressMeasurements.push({
    id: 'm-custom-pain',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureName: 'Custom Lumbar Pain Score',
    category: 'pain',
    valueType: 'scale_10',
    unit: '/10',
    stage: 'baseline',
    numericValue: 6,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });
  // Standard measure with authoritative definition
  dataset.progressMeasurements.push({
    id: 'm-standard-nprs',
    progressRecordId: 'rec-1',
    caseId: 'case-1',
    patientId: 'pt-1',
    measureDefinitionId: 'measure-def-nprs',
    measureName: 'Numeric Pain Rating Scale (NPRS)',
    category: 'pain',
    valueType: 'scale_10',
    unit: '/10',
    stage: 'baseline',
    numericValue: 6,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  });

  const series = deriveLongitudinalOutcomeSeries('pt-1', dataset);
  const customSeries = series.find((s) => s.measureName === 'Custom Lumbar Pain Score');
  const standardSeries = series.find((s) => s.measureName === 'Numeric Pain Rating Scale (NPRS)');

  assert(customSeries?.directionMeaning === undefined, 'Test 20: Custom measure directionMeaning is undefined (never inferred from "Pain")');
  assert(standardSeries?.directionMeaning === 'lower_is_better', 'Test 20: Standard measure directionMeaning populated from authoritative definition');
}

console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL 20 VERIFICATION TESTS PASSED SUCCESSFULLY.');
}
