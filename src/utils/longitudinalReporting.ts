/**
 * PhysioCase — Stage 11: Longitudinal Patient Reporting & Health Summary Export
 * Pure Assembler Module
 *
 * Rules:
 * 1. Pure functions only — NO mutations, NO localStorage access, NO external APIs.
 * 2. Composes existing Stage 10 selectors — does NOT recreate a second longitudinal engine.
 * 3. Descriptive only — NO manufactured clinical conclusions, improvement ratings, or efficacy labels.
 * 4. Provenance-preserving — keeps originating case display IDs, clinical dates, and recorded statuses.
 */

import {
  Patient,
  AppSettings,
} from '../types';
import {
  LongitudinalClinicalDataset,
  derivePatientSafetyAlerts,
  derivePatientTimeline,
  deriveHistoricalCaseSummaries,
  deriveCumulativeProblemHistory,
  deriveHistoricalTreatmentContext,
  deriveLongitudinalOutcomeSeries,
} from './longitudinalPatientHistory';
import {
  LongitudinalReportConfig,
  LongitudinalReportSectionConfig,
  AssembledLongitudinalPatientReport,
  RenderedReportHeader,
  RenderedPatientInfo,
  RenderedSafetySection,
  RenderedEpisodeItem,
  RenderedLongitudinalOutcomeSeries,
} from '../types/reporting';
import { formatClinicalDate, calculateAge } from './clinicalFormatters';

/**
 * Master catalog of available sections for the Longitudinal Patient Summary Report.
 */
export const AVAILABLE_LONGITUDINAL_REPORT_SECTIONS: LongitudinalReportSectionConfig[] = [
  {
    id: 'header',
    label: 'Clinic & Practitioner Header',
    description: 'Clinic contact details, authoring practitioner name, credentials, and date.',
    defaultIncluded: true,
    requiredForType: true,
  },
  {
    id: 'patient_identity',
    label: 'Patient Identification',
    description: 'Patient identifier, date of birth, age, biological sex, or de-identified equivalent.',
    defaultIncluded: true,
    requiredForType: true,
  },
  {
    id: 'safety_context',
    label: 'Documented Patient Safety Context',
    description: 'Patient-level allergies, persistent precautions, surgical history, and medical conditions.',
    defaultIncluded: true,
  },
  {
    id: 'episodes_history',
    label: 'Episodes of Care Directory',
    description: 'All documented episodes of care, statuses, encounter counts, and discharge summaries.',
    defaultIncluded: true,
  },
  {
    id: 'cumulative_problems',
    label: 'Cumulative Problem History',
    description: 'All clinician-formulated problems across episodes with originating case provenance.',
    defaultIncluded: true,
  },
  {
    id: 'cross_episode_outcomes',
    label: 'Cross-Episode Outcome Trajectories',
    description: 'Longitudinal outcome measures tracked across multiple care episodes with baseline vs. latest scores.',
    defaultIncluded: true,
  },
  {
    id: 'historical_treatments',
    label: 'Historical Treatment Context',
    description: 'Interventions delivered during prior episodes, dosage parameters, and documented tolerances.',
    defaultIncluded: true,
  },
  {
    id: 'clinical_timeline',
    label: 'Longitudinal Clinical Timeline',
    description: 'Chronological clinical milestones across all episodes and care transitions.',
    defaultIncluded: true,
  },
  {
    id: 'therapist_declaration',
    label: 'Clinician Signature & Declaration',
    description: 'Authenticating physiotherapist signature block and regulatory registration statement.',
    defaultIncluded: true,
    requiredForType: true,
  },
];

/**
 * Generates default transient configuration for the longitudinal report.
 */
export function createDefaultLongitudinalReportConfig(): LongitudinalReportConfig {
  return {
    reportType: 'longitudinal_patient_summary',
    includedSectionIds: AVAILABLE_LONGITUDINAL_REPORT_SECTIONS.map((s) => s.id),
    deIdentify: false,
    chronologicalOrder: 'newest_first',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Pure Selector: Assembles the complete Longitudinal Patient Summary Report.
 *
 * Composes existing Stage 10 longitudinal derivation selectors.
 * Zero LocalStorage access, zero mutations, zero autonomous interpretations.
 */
export function assembleLongitudinalPatientReport(
  patient: Patient,
  dataset: LongitudinalClinicalDataset,
  config: LongitudinalReportConfig,
  settings?: AppSettings
): AssembledLongitudinalPatientReport {
  const patientId = patient.id;
  const isDeIdentified = config.deIdentify;
  const isOldestFirst = config.chronologicalOrder === 'oldest_first';

  // 1. Header block
  const header: RenderedReportHeader = {
    clinicName: settings?.clinicName || 'Elevation Movement Physiotherapy',
    practitionerName: settings?.practitionerName || 'Dr. Sarah Jenkins',
    credentials: settings?.credentials || 'PT, DPT, OCS',
    licenseNumber: settings?.licenseNumber || 'PT-994182',
    reportTitle: 'Longitudinal Patient Summary Report',
    generatedDate: formatClinicalDate(config.generatedAt || new Date().toISOString()),
    deIdentified: isDeIdentified,
    recipientName: config.recipientName,
    recipientRole: config.recipientRole,
    facilityName: config.facilityName,
  };

  // 2. Patient Identity block (with non-mutating de-identification)
  const age = calculateAge(patient.dateOfBirth);
  const patientInfo: RenderedPatientInfo = {
    displayName: isDeIdentified
      ? `Patient #${patient.patientNumber || patient.id.slice(0, 8)}`
      : patient.fullName,
    patientNumber: patient.patientNumber || 'PC-0001',
    dateOfBirth: isDeIdentified ? undefined : patient.dateOfBirth,
    age: age || undefined,
    sex: patient.sex || 'Unspecified',
    phone: isDeIdentified ? undefined : patient.phone,
    email: isDeIdentified ? undefined : patient.email,
  };

  // 3. Documented Patient Safety Context (via derivePatientSafetyAlerts)
  const rawSafety = derivePatientSafetyAlerts(patient);
  const safety: RenderedSafetySection = {
    totalAlertCount: rawSafety.totalAlertCount,
    verifiedCount: rawSafety.verifiedCount,
    unverifiedCount: rawSafety.unverifiedCount,
    disputedCount: rawSafety.disputedCount,
    allergies: rawSafety.allergies.map((a) => ({
      id: a.id,
      allergen: a.allergen,
      reaction: a.reactionType,
      severity: a.severity,
      status: a.verificationStatus,
      clinicalNotes: a.clinicalNotes,
    })),
    persistentPrecautions: rawSafety.persistentPrecautions.map((p) => ({
      id: p.id,
      precaution: p.precaution,
      category: p.category,
      status: p.verificationStatus,
      details: p.details,
    })),
    surgicalHistory: rawSafety.surgicalHistory.map((s) => ({
      id: s.id,
      procedure: s.procedure,
      year: s.approximateDateOrYear,
      region: s.bodyRegion,
    })),
    persistentMedicalConditions: rawSafety.persistentMedicalConditions.map((c) => ({
      id: c.id,
      condition: c.conditionName,
      physioRelevance: c.clinicalRelevanceToPhysio,
      status: c.verificationStatus,
    })),
    mobilityContext: rawSafety.mobilityContext
      ? {
          baseline: rawSafety.mobilityContext.baselineMobilityStatus,
          assistiveDevices: rawSafety.mobilityContext.enduringAssistiveDevices || [],
        }
      : undefined,
  };

  // 4. Episodes of Care (via deriveHistoricalCaseSummaries)
  const rawCaseSummaries = deriveHistoricalCaseSummaries(patientId, dataset);
  const dischargeRecordMap = new Map(
    dataset.caseDischargeRecords.map((d) => [d.caseId, d])
  );

  const episodes: RenderedEpisodeItem[] = rawCaseSummaries.map((c) => {
    const discharge = dischargeRecordMap.get(c.caseId);
    return {
      caseId: c.caseId,
      displayId: c.displayId,
      caseName: c.caseName,
      status: c.status,
      startDate: c.startDate,
      dischargeDate: c.dischargeDate,
      durationWeeks: c.durationWeeks,
      totalSessions: c.totalSessions,
      dischargeReason: c.dischargeReason,
      episodeSummary: discharge?.episodeSummary || c.dischargeStatusSummary,
      clinicalStatusAtDischarge: discharge?.clinicalStatusAtDischarge,
      isActiveEpisode: c.status !== 'Discharged' && !c.isArchived,
      problemCounts: c.problemCounts,
      goalCounts: c.goalCounts,
      isArchived: c.isArchived,
      archiveReason: c.archiveReason,
      archivedAt: c.archivedAt,
    };
  });

  episodes.sort((a, b) => {
    const timeA = new Date(a.startDate).getTime();
    const timeB = new Date(b.startDate).getTime();
    return isOldestFirst ? timeA - timeB : timeB - timeA;
  });

  // 5. Cumulative Problems (via deriveCumulativeProblemHistory)
  const cumulativeProblems = deriveCumulativeProblemHistory(patientId, dataset);
  cumulativeProblems.sort((a, b) => {
    const timeA = new Date(a.formulatedDate).getTime();
    const timeB = new Date(b.formulatedDate).getTime();
    return isOldestFirst ? timeA - timeB : timeB - timeA;
  });

  // 6. Cross-Episode Outcomes (via deriveLongitudinalOutcomeSeries)
  const rawOutcomeSeries = deriveLongitudinalOutcomeSeries(patientId, dataset);
  const outcomeSeries: RenderedLongitudinalOutcomeSeries[] = rawOutcomeSeries.map((s) => ({
    seriesKey: s.seriesKey,
    measureName: s.measureName,
    category: s.category,
    unit: s.unit,
    episodes: s.episodes.map((ep) => {
      const baseNum = ep.baselinePoint?.scoreNumeric ?? ep.baselinePoint?.rawMeasurement?.numericValue;
      const latestNum = ep.latestPoint?.scoreNumeric ?? ep.latestPoint?.rawMeasurement?.numericValue;
      const rawDelta =
        baseNum !== undefined && latestNum !== undefined
          ? latestNum - baseNum
          : undefined;

      return {
        caseId: ep.caseId,
        caseDisplayId: ep.originatingCaseDisplayId || ep.caseName,
        caseName: ep.caseName,
        isClosed: ep.isClosed,
        startDate: ep.startDate,
        dischargeDate: ep.dischargeDate,
        baselineDate: ep.baselinePoint?.date,
        baselineValue: ep.baselinePoint?.scoreNumeric ?? ep.baselinePoint?.scoreText ?? ep.baselinePoint?.rawMeasurement?.numericValue,
        latestDate: ep.latestPoint?.date,
        latestValue: ep.latestPoint?.scoreNumeric ?? ep.latestPoint?.scoreText ?? ep.latestPoint?.rawMeasurement?.numericValue,
        rawDelta,
        targetValue: ep.latestPoint?.targetValue ?? ep.baselinePoint?.targetValue,
      };
    }),
  }));

  // 7. Historical Treatment Context (via deriveHistoricalTreatmentContext)
  const historicalTreatments = deriveHistoricalTreatmentContext(patientId, dataset);
  historicalTreatments.sort((a, b) => {
    const timeA = new Date(a.sessionDate).getTime();
    const timeB = new Date(b.sessionDate).getTime();
    return isOldestFirst ? timeA - timeB : timeB - timeA;
  });

  // 8. Longitudinal Clinical Timeline (via derivePatientTimeline)
  const rawTimelineEvents = derivePatientTimeline(patientId, dataset);
  const timelineEvents = isDeIdentified
    ? rawTimelineEvents.map((evt) => ({
        ...evt,
        summary: evt.summary.replace(patient.fullName, patientInfo.displayName),
      }))
    : rawTimelineEvents;

  if (isOldestFirst) {
    timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } else {
    timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // 9. Therapist Declaration
  const therapistDeclaration = {
    practitionerName: settings?.practitionerName || 'Dr. Sarah Jenkins',
    credentials: settings?.credentials || 'PT, DPT, OCS',
    clinicName: settings?.clinicName || 'Elevation Movement Physiotherapy',
    licenseNumber: settings?.licenseNumber || 'PT-994182',
    declarationDate: formatClinicalDate(config.generatedAt || new Date().toISOString()),
  };

  return {
    id: `rpt_long_${patient.id}_${new Date(config.generatedAt || Date.now()).getTime()}`,
    reportType: 'longitudinal_patient_summary',
    config,
    header,
    patientInfo,
    safety,
    episodes,
    cumulativeProblems,
    outcomeSeries,
    historicalTreatments,
    timelineEvents,
    therapistDeclaration,
  };
}

/**
 * Serializes the assembled longitudinal report model to structured JSON.
 * Preserves provenance, configured sections, and de-identification settings.
 */
export function exportLongitudinalReportToJSON(report: AssembledLongitudinalPatientReport): string {
  const exportPayload = {
    format: 'physiocase-longitudinal-summary',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    application: 'PhysioCase',
    reportId: report.id,
    reportType: report.reportType,
    config: report.config,
    header: report.header,
    patient: report.patientInfo,
    sections: {
      safety: report.config.includedSectionIds.includes('safety_context') ? report.safety : undefined,
      episodes: report.config.includedSectionIds.includes('episodes_history') ? report.episodes : undefined,
      cumulativeProblems: report.config.includedSectionIds.includes('cumulative_problems') ? report.cumulativeProblems : undefined,
      crossEpisodeOutcomes: report.config.includedSectionIds.includes('cross_episode_outcomes') ? report.outcomeSeries : undefined,
      historicalTreatments: report.config.includedSectionIds.includes('historical_treatments') ? report.historicalTreatments : undefined,
      clinicalTimeline: report.config.includedSectionIds.includes('clinical_timeline') ? report.timelineEvents : undefined,
    },
    therapistDeclaration: report.therapistDeclaration,
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Triggers a browser download of the structured JSON longitudinal report.
 */
export function downloadLongitudinalReportJSON(report: AssembledLongitudinalPatientReport): void {
  const jsonString = exportLongitudinalReportToJSON(report);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (report.patientInfo.displayName || 'patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `physiocase_longitudinal_summary_${safeName}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
