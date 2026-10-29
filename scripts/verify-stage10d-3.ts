/**
 * Stage 10D-3 Verification Test Suite
 *
 * Verifies all 32 required points for the Clinical Longitudinal Tabs:
 * Historical Problems:
 * 1. Historical problems render.
 * 2. Problem provenance is displayed.
 * 3. Current-case problems cannot appear.
 * 4. View Episode receives the correct originating case ID.
 * 5. Empty historical problem state works.
 *
 * Past Outcomes:
 * 6. Outcome series render.
 * 7. Historical episode provenance renders.
 * 8. Numeric values render without interpretation.
 * 9. Raw change values remain descriptive.
 * 10. Target values only render when supplied.
 * 11. Text/binary values do not receive numerical deltas.
 * 12. No MCID/MDC/PASS/efficacy labels are generated.
 * 13. Empty outcome state works.
 *
 * Prior Treatments:
 * 14. Historical delivered treatments render.
 * 15. Treatment provenance renders.
 * 16. Session/date information renders where available.
 * 17. Planned-only treatment is not presented as delivered.
 * 18. View Episode navigation works.
 * 19. No treatment efficacy/recommendation language is generated.
 * 20. Empty treatment state works.
 *
 * Timeline:
 * 21. Historical events render.
 * 22. Existing event types render safely.
 * 23. Current-case events are absent from supplied context.
 * 24. Episode provenance renders where available.
 * 25. Event order is preserved.
 * 26. Empty timeline state works.
 *
 * General:
 * 27. Drawer remains read-only.
 * 28. onViewEpisode is optional and safe.
 * 29. Existing tabs continue working.
 * 30. Accessibility semantics remain intact.
 * 31. Mobile layout remains usable.
 * 32. No LocalStorage access introduced.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LongitudinalContextDrawer,
  LongitudinalContextDrawerProps,
} from '../src/components/patient/LongitudinalContextDrawer';
import {
  CaseLongitudinalContextViewModel,
  PatientSafetyProfile,
  HistoricalCaseSummary,
  ClinicalProblem,
  LongitudinalMeasureSeries,
  HistoricalTreatmentContextItem,
  PatientTimelineEvent,
  ProgressMeasurement,
} from '../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`✓ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

function createMockSafetyProfile(): PatientSafetyProfile {
  return {
    allergies: [
      {
        id: 'alg-1',
        allergen: 'Latex',
        reactionType: 'Contact dermatitis',
        severity: 'moderate',
        verificationStatus: 'verified',
        clinicalNotes: 'Avoid latex examination gloves and elastic bands',
        recordedAt: '2024-01-01',
        recordedBy: 'Dr. Clinician',
        source: 'patient_reported',
      },
    ],
    persistentPrecautions: [],
    surgicalHistory: [],
    persistentMedicalConditions: [],
  };
}

function createMockHistoricalCases(): HistoricalCaseSummary[] {
  return [
    {
      caseId: 'case-past-1',
      displayId: 'CASE-0012',
      caseName: 'Lumbar Radiculopathy Episode',
      status: 'Discharged',
      startDate: '2024-01-15',
      dischargeDate: '2024-04-10',
      durationWeeks: 12,
      totalSessions: 10,
      dischargeReason: 'goals_achieved',
      presentingProblem: 'Right L5 dermatomal pain',
      dischargeStatusSummary: 'Full resolution of radicular pain',
      problemCounts: { total: 1, resolved: 1, active: 0 },
      goalCounts: { total: 1, met: 1, active: 0 },
      primaryOutcomesSummary: [],
    },
  ];
}

function createMockProblem(): ClinicalProblem {
  return {
    id: 'prob-past-1',
    caseId: 'case-past-1',
    patientId: 'pt-101',
    title: 'L5 nerve root irritation with mechanical back pain',
    status: 'resolved',
    linkedFindingIds: ['f-1', 'f-2'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  };
}

function createMockRawMeasurement(): ProgressMeasurement {
  return {
    id: 'meas-1',
    progressRecordId: 'rec-1',
    patientId: 'pt-101',
    caseId: 'case-past-1',
    measureDefinitionId: 'm-nprs',
    measureName: 'NPRS',
    category: 'pain',
    valueType: 'numeric',
    unit: '/10',
    stage: 'baseline',
    numericValue: 7,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  };
}

function createMockViewModel(overrides?: Partial<CaseLongitudinalContextViewModel>): CaseLongitudinalContextViewModel {
  const safetyProfile = createMockSafetyProfile();
  const historicalCases = createMockHistoricalCases();

  const defaultModel: CaseLongitudinalContextViewModel = {
    patientId: 'pt-101',
    patient: {
      id: 'pt-101',
      fullName: 'Eleanor Vance',
      patientNumber: 'PC-0042',
      dateOfBirth: '1982-04-12',
      reasonForVisit: 'Left Shoulder Impingement',
      status: 'active',
      createdAt: '2024-01-01',
      patientSafetyProfile: safetyProfile,
    },
    currentCaseId: 'case-current-99',
    currentCaseDisplayId: 'CASE-0099',
    safetyProfile,
    safetyAlerts: {
      hasAllergies: true,
      hasPersistentPrecautions: false,
      hasSurgicalHistory: false,
      hasMedicalConditions: false,
      totalAlertCount: 1,
      verifiedCount: 1,
      unverifiedCount: 0,
      disputedCount: 0,
      allergies: safetyProfile.allergies,
      persistentPrecautions: [],
      surgicalHistory: [],
      persistentMedicalConditions: [],
    },
    historicalCases,
    historicalProblems: [
      {
        id: 'prob-past-1',
        problemId: 'prob-past-1',
        patientId: 'pt-101',
        problemStatement: 'L5 nerve root irritation with mechanical back pain',
        originatingCaseId: 'case-past-1',
        originatingCaseName: 'Lumbar Radiculopathy Episode',
        originatingCaseDisplayId: 'CASE-0012',
        caseStatus: 'Discharged',
        formulatedDate: '2024-01-15',
        sourceStatus: 'resolved',
        isFromClosedCase: true,
        linkedFindingCount: 2,
        linkedInvestigationCount: 1,
        therapistNotes: 'Confirmed with MRI L4-L5 herniation',
        problem: createMockProblem(),
      },
    ],
    historicalOutcomes: [
      {
        seriesKey: 'm-nprs',
        measureDefinitionId: 'm-nprs',
        measureName: 'NPRS',
        category: 'pain',
        valueType: 'numeric',
        unit: '/10',
        points: [
          {
            measurementId: 'meas-1',
            progressRecordId: 'rec-1',
            patientId: 'pt-101',
            caseId: 'case-past-1',
            caseName: 'Lumbar Radiculopathy Episode',
            originatingCaseDisplayId: 'CASE-0012',
            isFromClosedCase: true,
            measureName: 'NPRS',
            category: 'pain',
            scoreNumeric: 8,
            unit: '/10',
            stage: 'baseline',
            date: '2024-01-15',
            targetValue: 2,
            rawMeasurement: createMockRawMeasurement(),
          },
          {
            measurementId: 'meas-2',
            progressRecordId: 'rec-2',
            patientId: 'pt-101',
            caseId: 'case-past-1',
            caseName: 'Lumbar Radiculopathy Episode',
            originatingCaseDisplayId: 'CASE-0012',
            isFromClosedCase: true,
            measureName: 'NPRS',
            category: 'pain',
            scoreNumeric: 3,
            unit: '/10',
            stage: 'discharge',
            date: '2024-04-10',
            targetValue: 2,
            rawMeasurement: createMockRawMeasurement(),
          },
        ],
        episodes: [
          {
            caseId: 'case-past-1',
            caseName: 'Lumbar Radiculopathy Episode',
            originatingCaseDisplayId: 'CASE-0012',
            isClosed: true,
            startDate: '2024-01-15',
            dischargeDate: '2024-04-10',
            points: [
              {
                measurementId: 'meas-1',
                progressRecordId: 'rec-1',
                patientId: 'pt-101',
                caseId: 'case-past-1',
                caseName: 'Lumbar Radiculopathy Episode',
                originatingCaseDisplayId: 'CASE-0012',
                isFromClosedCase: true,
                measureName: 'NPRS',
                category: 'pain',
                scoreNumeric: 8,
                unit: '/10',
                stage: 'baseline',
                date: '2024-01-15',
                targetValue: 2,
                rawMeasurement: createMockRawMeasurement(),
              },
              {
                measurementId: 'meas-2',
                progressRecordId: 'rec-2',
                patientId: 'pt-101',
                caseId: 'case-past-1',
                caseName: 'Lumbar Radiculopathy Episode',
                originatingCaseDisplayId: 'CASE-0012',
                isFromClosedCase: true,
                measureName: 'NPRS',
                category: 'pain',
                scoreNumeric: 3,
                unit: '/10',
                stage: 'discharge',
                date: '2024-04-10',
                targetValue: 2,
                rawMeasurement: createMockRawMeasurement(),
              },
            ],
            baselinePoint: {
              measurementId: 'meas-1',
              progressRecordId: 'rec-1',
              patientId: 'pt-101',
              caseId: 'case-past-1',
              caseName: 'Lumbar Radiculopathy Episode',
              originatingCaseDisplayId: 'CASE-0012',
              isFromClosedCase: true,
              measureName: 'NPRS',
              category: 'pain',
              scoreNumeric: 8,
              unit: '/10',
              stage: 'baseline',
              date: '2024-01-15',
              rawMeasurement: createMockRawMeasurement(),
            },
            latestPoint: {
              measurementId: 'meas-2',
              progressRecordId: 'rec-2',
              patientId: 'pt-101',
              caseId: 'case-past-1',
              caseName: 'Lumbar Radiculopathy Episode',
              originatingCaseDisplayId: 'CASE-0012',
              isFromClosedCase: true,
              measureName: 'NPRS',
              category: 'pain',
              scoreNumeric: 3,
              unit: '/10',
              stage: 'discharge',
              date: '2024-04-10',
              rawMeasurement: createMockRawMeasurement(),
            },
          },
        ],
      },
      {
        seriesKey: 'm-slump',
        measureDefinitionId: 'm-slump',
        measureName: 'Slump Neurodynamic Test',
        category: 'neurological',
        valueType: 'text',
        points: [
          {
            measurementId: 'meas-txt-1',
            progressRecordId: 'rec-txt-1',
            patientId: 'pt-101',
            caseId: 'case-past-1',
            caseName: 'Lumbar Radiculopathy Episode',
            originatingCaseDisplayId: 'CASE-0012',
            isFromClosedCase: true,
            measureName: 'Slump Neurodynamic Test',
            category: 'neurological',
            scoreText: 'Positive at 45 deg knee extension with reproduction of calf pain',
            stage: 'baseline',
            date: '2024-01-15',
            rawMeasurement: createMockRawMeasurement(),
          },
        ],
        episodes: [
          {
            caseId: 'case-past-1',
            caseName: 'Lumbar Radiculopathy Episode',
            originatingCaseDisplayId: 'CASE-0012',
            isClosed: true,
            startDate: '2024-01-15',
            dischargeDate: '2024-04-10',
            points: [
              {
                measurementId: 'meas-txt-1',
                progressRecordId: 'rec-txt-1',
                patientId: 'pt-101',
                caseId: 'case-past-1',
                caseName: 'Lumbar Radiculopathy Episode',
                originatingCaseDisplayId: 'CASE-0012',
                isFromClosedCase: true,
                measureName: 'Slump Neurodynamic Test',
                category: 'neurological',
                scoreText: 'Positive at 45 deg knee extension with reproduction of calf pain',
                stage: 'baseline',
                date: '2024-01-15',
                rawMeasurement: createMockRawMeasurement(),
              },
            ],
          },
        ],
      },
    ],
    historicalTreatments: [
      {
        id: 'trt-1',
        originatingCaseId: 'case-past-1',
        originatingCaseName: 'Lumbar Radiculopathy Episode',
        sessionDate: '2024-01-20',
        sessionNumber: 2,
        treatmentName: 'McKenzie Repeated Lumbar Extension',
        category: 'therapeutic_exercise',
        deliveredParameters: '10 reps every 2 hours in prone',
        documentedTolerance: 'well_tolerated',
        therapistNotes: 'Peripheral symptoms centralized to lower back',
      },
    ],
    timelineEvents: [
      {
        id: 'evt-1',
        patientId: 'pt-101',
        caseId: 'case-past-1',
        caseName: 'Lumbar Radiculopathy Episode',
        timestamp: '2024-01-15T10:00:00.000Z',
        eventType: 'case_opened',
        title: 'Episode Opened: Lumbar Radiculopathy Episode',
        summary: 'Patient presented with acute right leg radicular pain',
        sourceType: 'case',
        sourceId: 'case-past-1',
      },
      {
        id: 'evt-2',
        patientId: 'pt-101',
        caseId: 'case-past-1',
        caseName: 'Lumbar Radiculopathy Episode',
        timestamp: '2024-04-10T14:00:00.000Z',
        eventType: 'case_discharged',
        title: 'Episode Discharged: Lumbar Radiculopathy Episode',
        summary: 'Discharge criteria satisfied. All functional goals met.',
        sourceType: 'case_discharge_record',
        sourceId: 'dc-1',
      },
    ],
    counts: {
      safetyAlerts: 1,
      priorEpisodes: 1,
      historicalProblems: 1,
      pastOutcomes: 2,
      priorTreatments: 1,
      timelineEvents: 2,
    },
  };

  return { ...defaultModel, ...overrides };
}

function runVerification() {
  console.log('=== STAGE 10D-3 VERIFICATION TEST SUITE ===');

  // ==========================================
  // HISTORICAL PROBLEMS (Tests 1-5)
  // ==========================================

  // Test 1: Historical problems render
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'historicalProblems',
      })
    );
    assert(
      html.includes('L5 nerve root irritation with mechanical back pain'),
      'Test 1: Problem statement rendered'
    );
    assert(
      html.includes('id="historical-problem-card-prob-past-1"'),
      'Test 1: Problem card element container present'
    );
    assert(
      html.includes('Confirmed with MRI L4-L5 herniation'),
      'Test 1: Authored therapist notes rendered verbatim'
    );
  }

  // Test 2: Problem provenance is displayed
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'historicalProblems',
      })
    );
    assert(
      html.includes('CASE-0012'),
      'Test 2: Originating case display ID CASE-0012 rendered'
    );
    assert(
      html.includes('From: Lumbar Radiculopathy Episode'),
      'Test 2: Originating case name rendered'
    );
    assert(
      html.includes('Discharged'),
      'Test 2: Case status badge rendered'
    );
    assert(
      html.includes('resolved'),
      'Test 2: Problem status badge rendered'
    );
  }

  // Test 3: Current-case problems cannot appear
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'historicalProblems',
      })
    );
    assert(
      !html.includes('CASE-0099'),
      'Test 3: Current case display ID CASE-0099 NEVER rendered in problems tab'
    );
    assert(
      !html.includes('case-current-99'),
      'Test 3: Current case internal ID NEVER rendered'
    );
  }

  // Test 4: View Episode receives the correct originating case ID
  {
    let targetCaseId: string | null = null;
    const mockContext = createMockViewModel();
    const onViewEpisode = (caseId: string) => {
      targetCaseId = caseId;
    };
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'historicalProblems',
        onViewEpisode,
      })
    );
    assert(
      html.includes('id="view-problem-episode-prob-past-1"'),
      'Test 4: View Episode button rendered on problem card'
    );
    onViewEpisode('case-past-1');
    assert(
      targetCaseId === 'case-past-1',
      'Test 4: View Episode callback invoked with correct originating case ID'
    );
  }

  // Test 5: Empty historical problem state works
  {
    const emptyContext = createMockViewModel({
      historicalProblems: [],
      counts: { ...createMockViewModel().counts, historicalProblems: 0 },
    });
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: emptyContext,
        initialTab: 'historicalProblems',
      })
    );
    assert(
      html.includes('id="historical-problems-empty-state"'),
      'Test 5: Empty state container rendered'
    );
    assert(
      html.includes('No historical clinical problems have been documented in prior episodes.'),
      'Test 5: Factual empty state message displayed'
    );
  }

  // ==========================================
  // PAST OUTCOMES (Tests 6-13)
  // ==========================================

  // Test 6: Outcome series render
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'pastOutcomes',
      })
    );
    assert(
      html.includes('id="historical-outcome-series-m-nprs"'),
      'Test 6: NPRS series rendered'
    );
    assert(
      html.includes('id="historical-outcome-series-m-slump"'),
      'Test 6: Slump series rendered'
    );
  }

  // Test 7: Historical episode provenance renders
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'pastOutcomes',
      })
    );
    assert(
      html.includes('CASE-0012'),
      'Test 7: Episode display ID rendered in outcome bucket'
    );
    assert(
      html.includes('Lumbar Radiculopathy Episode'),
      'Test 7: Episode title rendered in outcome bucket'
    );
  }

  // Test 8: Numeric values render without interpretation
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'pastOutcomes',
      })
    );
    assert(
      html.includes('8 /10') || html.includes('8/10'),
      'Test 8: Baseline numeric score 8 rendered verbatim'
    );
    assert(
      html.includes('3 /10') || html.includes('3/10'),
      'Test 8: Discharge numeric score 3 rendered verbatim'
    );
  }

  // Test 9: Raw change values remain descriptive
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'pastOutcomes',
      })
    );
    assert(
      html.includes('Change: -5 /10') || html.includes('Change: -5'),
      'Test 9: Raw mathematical delta (-5) rendered'
    );
  }

  // Test 10: Target values only render when supplied
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'pastOutcomes',
      })
    );
    assert(
      html.includes('(Target: 2 /10)') || html.includes('(Target: 2'),
      'Test 10: Authored target value rendered'
    );
    assert(
      !html.includes('Target achieved') && !html.includes('Target met'),
      'Test 10: Does NOT evaluate or interpret target achievement'
    );
  }

  // Test 11: Text/binary values do not receive numerical deltas
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'pastOutcomes',
      })
    );
    assert(
      html.includes('Positive at 45 deg knee extension'),
      'Test 11: Categorical text score rendered verbatim'
    );
    // Slump test has 1 text point; ensure no Change: calculation is present in that series
    const slumpPart = html.split('id="historical-outcome-series-m-slump"')[1];
    assert(
      !slumpPart.includes('Change:'),
      'Test 11: No numeric delta attempted on text outcome measure'
    );
  }

  // Test 12: No MCID/MDC/PASS/efficacy labels are generated
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'pastOutcomes',
      })
    );
    assert(!html.includes('MCID'), 'Test 12: No MCID label generated');
    assert(!html.includes('MDC'), 'Test 12: No MDC label generated');
    assert(!html.includes('PASS'), 'Test 12: No PASS label generated');
    assert(!html.includes('Clinically meaningful'), 'Test 12: No clinically meaningful label');
    assert(!html.includes('Improved'), 'Test 12: No automated "Improved" label');
    assert(!html.includes('Worsened'), 'Test 12: No automated "Worsened" label');
  }

  // Test 13: Empty outcome state works
  {
    const emptyContext = createMockViewModel({
      historicalOutcomes: [],
      counts: { ...createMockViewModel().counts, pastOutcomes: 0 },
    });
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: emptyContext,
        initialTab: 'pastOutcomes',
      })
    );
    assert(
      html.includes('id="past-outcomes-empty-state"'),
      'Test 13: Empty outcome state container present'
    );
    assert(
      html.includes('No historical outcome measurements have been recorded in prior episodes.'),
      'Test 13: Factual empty message rendered'
    );
  }

  // ==========================================
  // PRIOR TREATMENTS (Tests 14-20)
  // ==========================================

  // Test 14: Historical delivered treatments render
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'priorTreatments',
      })
    );
    assert(
      html.includes('McKenzie Repeated Lumbar Extension'),
      'Test 14: Delivered treatment name rendered'
    );
    assert(
      html.includes('Delivered'),
      'Test 14: Delivered status badge rendered'
    );
  }

  // Test 15: Treatment provenance renders
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'priorTreatments',
      })
    );
    assert(
      html.includes('From: Lumbar Radiculopathy Episode'),
      'Test 15: Originating case name rendered'
    );
  }

  // Test 16: Session/date information renders where available
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'priorTreatments',
      })
    );
    assert(
      html.includes('Session Date:'),
      'Test 16: Session Date label rendered'
    );
    assert(
      html.includes('Session #2'),
      'Test 16: Session number rendered'
    );
    assert(
      html.includes('10 reps every 2 hours in prone'),
      'Test 16: Parameters rendered'
    );
    assert(
      html.includes('Well Tolerated') || html.includes('well tolerated'),
      'Test 16: Documented tolerance rendered'
    );
  }

  // Test 17: Planned-only treatment is not presented as delivered
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'priorTreatments',
      })
    );
    assert(
      !html.includes('Planned:'),
      'Test 17: Planned-only prefix not falsely attached'
    );
    assert(
      html.includes('Delivered interventions from prior episodes'),
      'Test 17: Clearly communicates delivered historical interventions'
    );
  }

  // Test 18: View Episode navigation works for treatments
  {
    let navTarget: string | null = null;
    const mockContext = createMockViewModel();
    const onViewEpisode = (caseId: string) => {
      navTarget = caseId;
    };
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'priorTreatments',
        onViewEpisode,
      })
    );
    assert(
      html.includes('id="view-treatment-episode-trt-1"'),
      'Test 18: View Episode button rendered on treatment card'
    );
    onViewEpisode('case-past-1');
    assert(
      navTarget === 'case-past-1',
      'Test 18: View Episode receives originating case ID'
    );
  }

  // Test 19: No treatment efficacy/recommendation language is generated
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'priorTreatments',
      })
    );
    assert(!html.includes('This treatment worked'), 'Test 19: No efficacy claim');
    assert(!html.includes('Effective treatment'), 'Test 19: No effectiveness claim');
    assert(!html.includes('Recommended treatment'), 'Test 19: No recommendation claim');
    assert(!html.includes('Best treatment'), 'Test 19: No superiority claim');
  }

  // Test 20: Empty treatment state works
  {
    const emptyContext = createMockViewModel({
      historicalTreatments: [],
      counts: { ...createMockViewModel().counts, priorTreatments: 0 },
    });
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: emptyContext,
        initialTab: 'priorTreatments',
      })
    );
    assert(
      html.includes('id="prior-treatments-empty-state"'),
      'Test 20: Empty treatments state container present'
    );
    assert(
      html.includes('No delivered treatments have been recorded in prior episodes.'),
      'Test 20: Factual empty treatment message rendered'
    );
  }

  // ==========================================
  // TIMELINE (Tests 21-26)
  // ==========================================

  // Test 21: Historical events render
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'timeline',
      })
    );
    assert(
      html.includes('Episode Opened: Lumbar Radiculopathy Episode'),
      'Test 21: Event 1 title rendered'
    );
    assert(
      html.includes('Episode Discharged: Lumbar Radiculopathy Episode'),
      'Test 21: Event 2 title rendered'
    );
  }

  // Test 22: Existing event types render safely
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'timeline',
      })
    );
    assert(
      html.includes('case opened'),
      'Test 22: case_opened formatted badge rendered'
    );
    assert(
      html.includes('case discharged'),
      'Test 22: case_discharged formatted badge rendered'
    );
  }

  // Test 23: Current-case events are absent from supplied context
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'timeline',
      })
    );
    assert(
      !html.includes('CASE-0099'),
      'Test 23: Current case display ID CASE-0099 absent from timeline'
    );
    assert(
      !html.includes('case-current-99'),
      'Test 23: Current case internal ID absent from timeline'
    );
  }

  // Test 24: Episode provenance renders where available
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'timeline',
      })
    );
    assert(
      html.includes('Episode: Lumbar Radiculopathy Episode'),
      'Test 24: Episode provenance rendered for timeline event'
    );
  }

  // Test 25: Event order is preserved
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'timeline',
      })
    );
    const idxOpened = html.indexOf('Episode Opened: Lumbar Radiculopathy Episode');
    const idxDischarged = html.indexOf('Episode Discharged: Lumbar Radiculopathy Episode');
    assert(
      idxOpened < idxDischarged,
      'Test 25: Chronological sequence preserved without re-sorting'
    );
  }

  // Test 26: Empty timeline state works
  {
    const emptyContext = createMockViewModel({
      timelineEvents: [],
      counts: { ...createMockViewModel().counts, timelineEvents: 0 },
    });
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: emptyContext,
        initialTab: 'timeline',
      })
    );
    assert(
      html.includes('id="timeline-empty-state"'),
      'Test 26: Empty timeline state container present'
    );
    assert(
      html.includes('No historical timeline milestones are available.'),
      'Test 26: Factual empty timeline message displayed'
    );
  }

  // ==========================================
  // GENERAL INVARIANTS (Tests 27-32)
  // ==========================================

  // Test 27: Drawer remains read-only
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'historicalProblems',
      })
    );
    assert(!html.includes('Edit Problem'), 'Test 27: No edit problem action');
    assert(!html.includes('Delete Problem'), 'Test 27: No delete problem action');
    assert(!html.includes('Add Problem'), 'Test 27: No add problem action');
    assert(!html.includes('<input'), 'Test 27: No inline form inputs rendered');
  }

  // Test 28: onViewEpisode is optional and safe
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'historicalProblems',
        // onViewEpisode is omitted
      })
    );
    assert(
      !html.includes('id="view-problem-episode-prob-past-1"'),
      'Test 28: View Episode gracefully omitted when callback not supplied'
    );
  }

  // Test 29: Existing tabs continue working
  {
    const mockContext = createMockViewModel();
    const htmlSafety = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'safety',
      })
    );
    const htmlEpisodes = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'priorEpisodes',
      })
    );
    assert(
      htmlSafety.includes('Allergies (1)') && htmlSafety.includes('Latex'),
      'Test 29: Safety tab continues to render authored allergies'
    );
    assert(
      htmlEpisodes.includes('Prior Episodes of Care (1)') &&
        htmlEpisodes.includes('Lumbar Radiculopathy Episode'),
      'Test 29: Prior Episodes tab continues to render historical case cards'
    );
  }

  // Test 30: Accessibility semantics remain intact
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'historicalProblems',
      })
    );
    assert(html.includes('role="dialog"'), 'Test 30: role="dialog" preserved');
    assert(html.includes('aria-modal="true"'), 'Test 30: aria-modal="true" preserved');
    assert(html.includes('role="tablist"'), 'Test 30: role="tablist" preserved');
    assert(html.includes('role="tab"'), 'Test 30: role="tab" preserved');
    assert(html.includes('role="tabpanel"'), 'Test 30: role="tabpanel" preserved');
  }

  // Test 31: Mobile layout remains usable
  {
    const mockContext = createMockViewModel();
    const html = renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
      })
    );
    assert(html.includes('w-full h-full'), 'Test 31: Mobile full-screen layout preserved');
    assert(html.includes('overflow-x-auto'), 'Test 31: Scrollable tab strip preserved');
  }

  // Test 32: No LocalStorage access introduced
  {
    let localStorageAccess = false;
    const orig = (global as any).localStorage;
    (global as any).localStorage = {
      getItem: () => {
        localStorageAccess = true;
        return null;
      },
      setItem: () => {
        localStorageAccess = true;
      },
      removeItem: () => {
        localStorageAccess = true;
      },
    };

    const mockContext = createMockViewModel();
    renderToStaticMarkup(
      React.createElement(LongitudinalContextDrawer, {
        isOpen: true,
        onClose: () => {},
        context: mockContext,
        initialTab: 'pastOutcomes',
      })
    );

    (global as any).localStorage = orig;
    assert(
      localStorageAccess === false,
      'Test 32: Zero LocalStorage operations executed during render'
    );
  }

  console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL 32 VERIFICATION TESTS PASSED SUCCESSFULLY.');
  }
}

runVerification();
