import {
  ReportSectionId,
  ReportSectionConfig,
  ClinicalReportType,
  ClinicalReportConfig,
  CaseClinicalDataset,
  AssembledClinicalReport,
  RenderedReportHeader,
  RenderedPatientInfo,
  RenderedCaseOverview,
  RenderedSubjective,
  RenderedObjectiveItem,
  RenderedProblemItem,
  RenderedGoalItem,
  RenderedTreatmentItem,
  RenderedSessionItem,
  RenderedOutcomeComparisonItem,
  RenderedDischargeSummary,
  RenderedEvidenceItem,
  StructuredCaseExport,
} from '../types/reporting';
import { Patient, Case, ProgressMeasurement } from '../types';
import { formatClinicalDate } from './clinicalFormatters';
import { calculateEpisodeDuration } from './clinicalDischarge';

// Available sections catalogue per report type
export const AVAILABLE_REPORT_SECTIONS: Record<ClinicalReportType, ReportSectionConfig[]> = {
  comprehensive_case: [
    {
      id: 'patient_demographics',
      label: 'Patient Demographics & Identification',
      description: 'Patient identifiers, age, sex, contact details, or de-identified equivalent.',
      defaultIncluded: true,
      requiredForType: true,
    },
    {
      id: 'case_overview',
      label: 'Episode Overview & Referral Context',
      description: 'Case reference, start date, onset date, referral source, status, and duration.',
      defaultIncluded: true,
      requiredForType: true,
    },
    {
      id: 'subjective_assessment',
      label: 'Subjective Assessment Findings',
      description: 'Chief complaint, body regions, 24-hr pain behavior, functional difficulties, medical history.',
      defaultIncluded: true,
    },
    {
      id: 'objective_findings',
      label: 'Objective Examination Findings',
      description: 'Physical examination findings organized by examination area.',
      defaultIncluded: true,
    },
    {
      id: 'clinical_reasoning_problems',
      label: 'Clinical Reasoning & Formulated Problems',
      description: 'Therapist synthesized problem formulation derived from clinical findings.',
      defaultIncluded: true,
    },
    {
      id: 'functional_goals',
      label: 'Functional SMART Goals',
      description: 'Patient-centered short-term and long-term goals and documented statuses.',
      defaultIncluded: true,
    },
    {
      id: 'treatment_plan_selections',
      label: 'Treatment Plan & Intervention Selections',
      description: 'Therapist-selected interventions, dosage parameters, and rationale.',
      defaultIncluded: true,
    },
    {
      id: 'session_history',
      label: 'Clinical Encounter History',
      description: 'Encounter dates, actual deliveries, modifications, and immediate patient responses.',
      defaultIncluded: true,
    },
    {
      id: 'progress_outcomes',
      label: 'Longitudinal Progress & Outcome Measures',
      description: 'Baseline vs. discharge/latest outcome measure comparison table and net changes.',
      defaultIncluded: true,
    },
    {
      id: 'discharge_summary',
      label: 'Discharge Summary & Clinical Status',
      description: 'Discharge reason, narrative course of care synthesis, and final clinical status.',
      defaultIncluded: true,
    },
    {
      id: 'home_maintenance_plan',
      label: 'Home Maintenance Programme (HEP)',
      description: 'Post-discharge self-management, exercises, and pacing recommendations.',
      defaultIncluded: true,
    },
    {
      id: 'precautions_warning_signs',
      label: 'Precautions & Warning Signs',
      description: 'Red flags, symptom exacerbation guidance, and activity contraindications.',
      defaultIncluded: true,
    },
    {
      id: 'follow_up_referral',
      label: 'Referral & Follow-Up Directions',
      description: 'Medical transfers, specialist referrals, or self-management review intervals.',
      defaultIncluded: true,
    },
    {
      id: 'evidence_citations',
      label: 'Linked Evidence & Clinical References',
      description: 'Evidence citations documented and linked to interventions in this case.',
      defaultIncluded: false,
    },
    {
      id: 'therapist_declaration',
      label: 'Therapist Signature & Declaration',
      description: 'Practitioner name, credentials, professional registration number, and date.',
      defaultIncluded: true,
      requiredForType: true,
    },
  ],

  referral_communication: [
    {
      id: 'patient_demographics',
      label: 'Patient Demographics & Identification',
      description: 'Patient identifiers and contact details.',
      defaultIncluded: true,
      requiredForType: true,
    },
    {
      id: 'case_overview',
      label: 'Episode Overview & Presenting Problem',
      description: 'Episode dates, presenting problem, and referral context.',
      defaultIncluded: true,
      requiredForType: true,
    },
    {
      id: 'subjective_assessment',
      label: 'Key Subjective & Medical History',
      description: 'Symptom characteristics, functional limitations, and relevant medical history.',
      defaultIncluded: true,
    },
    {
      id: 'objective_findings',
      label: 'Key Objective Examination Findings',
      description: 'Physical testing findings relevant to the referral.',
      defaultIncluded: true,
    },
    {
      id: 'clinical_reasoning_problems',
      label: 'Clinical Formulation / Diagnosis',
      description: 'Therapist clinical impression and problem formulation.',
      defaultIncluded: true,
    },
    {
      id: 'treatment_plan_selections',
      label: 'Interventions Provided',
      description: 'Summary of physiotherapy treatment interventions provided.',
      defaultIncluded: true,
    },
    {
      id: 'progress_outcomes',
      label: 'Clinical Response & Outcome Changes',
      description: 'Objective progress measurements and treatment response.',
      defaultIncluded: true,
    },
    {
      id: 'discharge_summary',
      label: 'Current Status / Discharge Evaluation',
      description: 'Current status or discharge evaluation for the referring physician.',
      defaultIncluded: true,
    },
    {
      id: 'follow_up_referral',
      label: 'Recommendations & Next Steps',
      description: 'Specific recommendations for the physician or specialist.',
      defaultIncluded: true,
    },
    {
      id: 'therapist_declaration',
      label: 'Therapist Signature & Credentials',
      description: 'Practitioner credentials and contact information.',
      defaultIncluded: true,
      requiredForType: true,
    },
  ],

  patient_discharge: [
    {
      id: 'patient_demographics',
      label: 'Patient Details',
      description: 'Patient name and care episode details.',
      defaultIncluded: true,
      requiredForType: true,
    },
    {
      id: 'case_overview',
      label: 'Episode Overview',
      description: 'Dates of care and encounter count.',
      defaultIncluded: true,
    },
    {
      id: 'discharge_summary',
      label: 'Summary of Your Care & Progress',
      description: 'Your therapist narrative summary of treatment and response.',
      defaultIncluded: true,
      requiredForType: true,
    },
    {
      id: 'functional_goals',
      label: 'Your Achievements & Goals',
      description: 'Review of the functional goals set during your care.',
      defaultIncluded: true,
    },
    {
      id: 'progress_outcomes',
      label: 'Your Measurement Improvements',
      description: 'Key physical and functional measurement improvements achieved.',
      defaultIncluded: true,
    },
    {
      id: 'home_maintenance_plan',
      label: 'Your Home Exercise & Self-Management Plan',
      description: 'Specific exercises, pacing guidelines, and activity advice.',
      defaultIncluded: true,
      requiredForType: true,
    },
    {
      id: 'precautions_warning_signs',
      label: 'Warning Signs & When to Contact Us',
      description: 'Symptoms that require contacting your physiotherapist or GP.',
      defaultIncluded: true,
      requiredForType: true,
    },
    {
      id: 'follow_up_referral',
      label: 'Follow-Up & Ongoing Support',
      description: 'Instructions for routine check-ins or returning to care.',
      defaultIncluded: true,
    },
    {
      id: 'therapist_declaration',
      label: 'Physiotherapist Information',
      description: 'Your treating physiotherapist details and clinic contact.',
      defaultIncluded: true,
      requiredForType: true,
    },
  ],
};

// Calculate age safely from ISO DOB string
function calculateAge(dateOfBirthString?: string): number | undefined {
  if (!dateOfBirthString) return undefined;
  try {
    const dob = new Date(dateOfBirthString);
    if (isNaN(dob.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : undefined;
  } catch {
    return undefined;
  }
}

// Pure Selector: Assemble the complete clinical report
export function assembleClinicalReport(
  dataset: CaseClinicalDataset,
  config: ClinicalReportConfig
): AssembledClinicalReport {
  const {
    patient,
    caseItem,
    subjectiveAssessment,
    objectiveFindings,
    clinicalProblems,
    goals,
    treatmentSelections,
    sessions,
    sessionDeliveries,
    progressMeasurements,
    dischargeRecord,
    evidenceItems,
    settings,
  } = dataset;

  const deIdentified = config.deIdentify;

  // 1. Header
  const reportTitles: Record<ClinicalReportType, string> = {
    comprehensive_case: 'Comprehensive Clinical Case Report',
    referral_communication: 'Physician / Referral Communication',
    patient_discharge: 'Patient Discharge & Self-Management Plan',
  };

  const header: RenderedReportHeader = {
    clinicName: settings?.clinicName || 'Physiotherapy Clinical Workspace',
    practitionerName: settings?.practitionerName || 'Physiotherapist',
    credentials: settings?.credentials || 'BSc (Hons) Physiotherapy, MCSP, HCPC Reg.',
    licenseNumber: settings?.licenseNumber,
    reportTitle: reportTitles[config.reportType],
    generatedDate: formatClinicalDate(config.generatedAt || new Date().toISOString()),
    deIdentified,
    recipientName: config.recipientName,
    recipientRole: config.recipientRole,
    facilityName: config.facilityName,
  };

  // 2. Patient Info (applying de-identification)
  const age = calculateAge(patient.dateOfBirth);
  const patientInfo: RenderedPatientInfo = {
    displayName: deIdentified
      ? `Patient #${patient.patientNumber || patient.id.slice(0, 8)}`
      : patient.fullName,
    patientNumber: patient.patientNumber,
    dateOfBirth: deIdentified ? undefined : formatClinicalDate(patient.dateOfBirth),
    age: age !== undefined ? `${age} yrs` : undefined,
    sex: patient.sex || undefined,
    phone: deIdentified ? undefined : patient.phone,
    email: deIdentified ? undefined : patient.email,
  };

  // 3. Case Overview
  const durationMetrics = dischargeRecord
    ? calculateEpisodeDuration(caseItem.startDate, dischargeRecord.dischargeDate)
    : calculateEpisodeDuration(caseItem.startDate, new Date().toISOString().split('T')[0]);
  const episodeDuration = durationMetrics?.formattedText || undefined;

  const caseOverview: RenderedCaseOverview = {
    caseId: caseItem.caseId || caseItem.id.slice(0, 8),
    caseName: caseItem.caseName,
    presentingProblem: caseItem.presentingProblem,
    dateOfOnset: caseItem.dateOfOnset ? formatClinicalDate(caseItem.dateOfOnset) : undefined,
    startDate: formatClinicalDate(caseItem.startDate),
    status: caseItem.status,
    referralSource: caseItem.referralSource || 'Direct Access / Self-Referral',
    episodeDuration,
    totalEncounters: sessions.length,
    isArchived: caseItem.isArchived,
    archiveReason: caseItem.archiveReason,
    archivedAt: caseItem.archivedAt ? formatClinicalDate(caseItem.archivedAt) : undefined,
  };

  // 4. Subjective
  let subjective: RenderedSubjective | undefined = undefined;
  if (subjectiveAssessment) {
    const painSec = subjectiveAssessment.painSeverity;
    const painIntensityStr = painSec
      ? `${painSec.current}/10 (Worst: ${painSec.worst ?? '-'}/10, Best: ${painSec.best ?? '-'}/10)`
      : undefined;

    const aggravatingStr = Array.isArray(subjectiveAssessment.aggravatingFactors)
      ? subjectiveAssessment.aggravatingFactors.join(', ')
      : '';
    const easingStr = Array.isArray(subjectiveAssessment.easingFactors)
      ? subjectiveAssessment.easingFactors.join(', ')
      : '';
    const symptomBehaviorStr = aggravatingStr || easingStr
      ? `Aggravating: ${aggravatingStr || 'None documented'}. Easing: ${easingStr || 'None documented'}`
      : undefined;

    subjective = {
      chiefComplaint: subjectiveAssessment.patientStory || undefined,
      painLocation: (subjectiveAssessment.symptomLocations || []).join(', ') || undefined,
      painIntensity: painIntensityStr,
      symptomBehavior: symptomBehaviorStr,
      functionalDifficulties: subjectiveAssessment.functionalDifficulties || [],
      medicalHistory: [
        subjectiveAssessment.previousSimilarEpisode ? `Previous episode: ${subjectiveAssessment.previousSimilarEpisode}` : '',
        subjectiveAssessment.previousSurgery ? `Previous surgery: ${subjectiveAssessment.previousSurgery}` : '',
        subjectiveAssessment.currentMedication ? `Medication: ${subjectiveAssessment.currentMedication}` : '',
        subjectiveAssessment.relevantConditions ? `Relevant conditions: ${subjectiveAssessment.relevantConditions}` : '',
      ].filter(Boolean).join('; ') || undefined,
      safetyScreeningStatus: subjectiveAssessment.safetyScreening || 'Cleared / No red flags documented',
      safetyDetails: subjectiveAssessment.safetyScreeningDetails,
    };
  }

  // 5. Objective Findings
  const renderedFindings: RenderedObjectiveItem[] = objectiveFindings.map((f) => ({
    examinationArea: f.examinationArea,
    finding: f.finding,
  }));

  // 6. Clinical Problems
  const problemMap: Record<string, string> = {};
  objectiveFindings.forEach((f) => {
    problemMap[f.id] = `${f.examinationArea}: ${f.finding}`;
  });

  const investigationMap: Record<string, string> = {};
  (dataset.clinicalInvestigations || []).forEach((inv) => {
    investigationMap[inv.id] = `[${inv.modality.toUpperCase()}] ${inv.name}${inv.impression ? ` — ${inv.impression}` : ''}`;
  });

  const problems: RenderedProblemItem[] = clinicalProblems.map((p) => ({
    title: p.title,
    description: p.description,
    status: p.status.toUpperCase(),
    linkedFindings: (p.linkedFindingIds || []).map((id) => problemMap[id] || 'Objective finding'),
    linkedInvestigations: (p.linkedInvestigationIds || []).map((id) => investigationMap[id] || 'Investigation'),
  }));

  // 7. Goals
  const goalsList: RenderedGoalItem[] = goals.map((g) => ({
    description: g.title || g.description || 'Clinical goal',
    type: g.type === 'short_term' ? 'Short-Term' : 'Long-Term',
    status: g.status.replace('_', ' ').toUpperCase(),
    targetDate: g.targetDate ? formatClinicalDate(g.targetDate) : undefined,
  }));

  // 8. Treatments
  const treatments: RenderedTreatmentItem[] = treatmentSelections.map((t) => {
    let paramsText = '';
    if (t.dosage) {
      const parts = [];
      if (t.dosage.sets && t.dosage.reps) parts.push(`${t.dosage.sets} sets × ${t.dosage.reps} reps`);
      if (t.dosage.frequency) parts.push(t.dosage.frequency);
      if (t.dosage.intensity) parts.push(`Intensity: ${t.dosage.intensity}`);
      if (t.dosage.holdTime) parts.push(`Hold: ${t.dosage.holdTime}`);
      if (t.dosage.parameters) parts.push(t.dosage.parameters);
      paramsText = parts.join(', ');
    }
    return {
      title: t.title,
      interventionType: t.interventionType.replace('_', ' '),
      parametersText: paramsText || undefined,
      rationale: t.clinicalRationale || t.therapistRationale,
      status: t.status.toUpperCase(),
    };
  });

  // 9. Sessions
  const renderedSessions: RenderedSessionItem[] = sessions
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
    .map((s) => {
      const deliveries = sessionDeliveries.filter((d) => d.sessionId === s.id);
      const deliverySummary = deliveries.length > 0
        ? deliveries.map((d) => `${d.title} (${d.deliveryStatus.replace('_', ' ')})`).join('; ')
        : undefined;

      return {
        sessionNumber: s.sessionNumber,
        date: formatClinicalDate(s.sessionDate),
        status: s.status.toUpperCase(),
        tolerance: s.overallTolerance.replace('_', ' ').toUpperCase(),
        subjectiveCheckIn: s.patientSubjectiveResponse,
        therapistNotes: s.therapistSessionNotes,
        deliveriesSummary: deliverySummary,
      };
    });

  // 10. Outcome Comparisons (Stage 6)
  // Pair measurements by measureName to evaluate baseline vs. discharge/latest
  const measurementsByMeasure: Record<string, ProgressMeasurement[]> = {};
  progressMeasurements.forEach((m) => {
    if (!measurementsByMeasure[m.measureName]) {
      measurementsByMeasure[m.measureName] = [];
    }
    measurementsByMeasure[m.measureName].push(m);
  });

  const progressOutcomes: RenderedOutcomeComparisonItem[] = Object.entries(measurementsByMeasure).map(
    ([name, mList]) => {
      const baseline = mList.find((m) => m.stage === 'baseline') || mList[0];
      const dischargeOrLatest =
        mList.find((m) => m.stage === 'discharge') ||
        mList.find((m) => m.stage === 'reassessment') ||
        (mList.length > 1 ? mList[mList.length - 1] : undefined);

      let baselineStr = '-';
      if (baseline) {
        baselineStr = baseline.numericValue !== undefined
          ? `${baseline.numericValue} ${baseline.unit || ''}`.trim()
          : baseline.textValue || '-';
      }

      let dischargeStr = '-';
      if (dischargeOrLatest && dischargeOrLatest !== baseline) {
        dischargeStr = dischargeOrLatest.numericValue !== undefined
          ? `${dischargeOrLatest.numericValue} ${dischargeOrLatest.unit || ''}`.trim()
          : dischargeOrLatest.textValue || '-';
      }

      let netChange = '-';
      if (
        baseline &&
        dischargeOrLatest &&
        baseline.numericValue !== undefined &&
        dischargeOrLatest.numericValue !== undefined
      ) {
        const delta = dischargeOrLatest.numericValue - baseline.numericValue;
        const prefix = delta > 0 ? '+' : '';
        netChange = `${prefix}${delta} ${baseline.unit || ''}`.trim();
      }

      return {
        measureName: name,
        category: baseline?.category || 'Clinical Outcome',
        baselineValue: baselineStr,
        dischargeValue: dischargeStr,
        netChange,
      };
    }
  );

  // 11. Discharge Summary
  let discharge: RenderedDischargeSummary | undefined = undefined;
  if (dischargeRecord) {
    const reasonLabels: Record<string, string> = {
      goals_achieved: 'Goals Achieved',
      plateau_functional_independence: 'Plateau / Functional Independence',
      self_management_transition: 'Self-Management Transition',
      patient_choice_discontinued: 'Patient Choice / Discontinued',
      medical_transfer_referral: 'Medical Transfer / Specialist Referral',
      relocation: 'Patient Relocation',
      non_attendance: 'Non-Attendance / Lost to Follow-Up',
      other: 'Other Clinical Reason',
    };

    discharge = {
      dischargeDate: formatClinicalDate(dischargeRecord.dischargeDate),
      dischargeReason: reasonLabels[dischargeRecord.dischargeReason] || dischargeRecord.dischargeReason,
      episodeSummary: dischargeRecord.episodeSummary,
      clinicalStatusAtDischarge: dischargeRecord.clinicalStatusAtDischarge,
      homeMaintenancePlan: dischargeRecord.homeMaintenancePlan,
      precautionsAndWarningSigns: dischargeRecord.precautionsAndWarningSigns,
      referralOrFollowUp: dischargeRecord.referralOrFollowUp,
    };
  }

  // 12. Evidence
  const evidence: RenderedEvidenceItem[] = evidenceItems.map((e) => ({
    title: e.title,
    authors: e.summary,
    year: undefined,
    levelOfEvidence: e.evidenceLevel,
    clinicalTakeaway: e.recommendation || e.summary,
  }));

  // 13. Declaration
  const therapistDeclaration = {
    practitionerName: settings?.practitionerName || 'Physiotherapist',
    credentials: settings?.credentials || 'MCSP, HCPC Reg.',
    clinicName: settings?.clinicName || 'Physiotherapy Clinic',
    licenseNumber: settings?.licenseNumber,
    date: formatClinicalDate(config.generatedAt || new Date().toISOString()),
  };

  return {
    id: `report_${Date.now()}`,
    reportType: config.reportType,
    config,
    header,
    patientInfo,
    caseOverview,
    subjective,
    objectiveFindings: renderedFindings,
    problems,
    goals: goalsList,
    treatments,
    sessions: renderedSessions,
    progressOutcomes,
    discharge,
    evidence,
    therapistDeclaration,
  };
}

// Pure Builder: Structured JSON Case Export
export function generateStructuredCaseExport(
  dataset: CaseClinicalDataset,
  format: 'full' | 'de_identified'
): StructuredCaseExport {
  const { patient, caseItem } = dataset;
  const isDeIdentified = format === 'de_identified';

  // Calculate age if dateOfBirth exists
  let derivedAge: number | undefined;
  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      derivedAge = age >= 0 ? age : undefined;
    }
  }

  const exportPatient: Partial<Patient> & { age?: number } = isDeIdentified
    ? {
        id: patient.id,
        patientNumber: patient.patientNumber || `P-${patient.id.slice(0, 6)}`,
        fullName: `Patient #${caseItem.caseId || patient.id.slice(0, 8)} (De-Identified)`,
        preferredName: undefined,
        dateOfBirth: '[Redacted - Age Preserved]',
        age: derivedAge,
        sex: patient.sex,
        phone: undefined,
        email: undefined,
        reasonForVisit: patient.reasonForVisit,
        status: patient.status,
        createdAt: patient.createdAt,
      }
    : {
        ...patient,
        age: derivedAge,
      };

  const exportCase: Case = isDeIdentified
    ? {
        ...caseItem,
        patientName: caseItem.patientName ? `Patient #${caseItem.caseId || 'De-Identified'}` : undefined,
      }
    : { ...caseItem };

  const rawCaseId = caseItem.caseId || caseItem.id.slice(0, 8);

  return {
    exportMetadata: {
      format: 'physiocase-case-archive',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      application: 'PhysioCase',
      caseId: rawCaseId,
      patientId: isDeIdentified ? `DEID-${patient.id.slice(0, 6)}` : patient.id,
      deidentified: isDeIdentified,
    },
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    exportFormat: format,
    patient: exportPatient,
    caseItem: exportCase,
    subjectiveAssessment: dataset.subjectiveAssessment ? { ...dataset.subjectiveAssessment } : undefined,
    objectiveAssessment: dataset.objectiveAssessment ? { ...dataset.objectiveAssessment } : undefined,
    objectiveFindings: dataset.objectiveFindings.map((f) => ({ ...f })),
    clinicalProblems: dataset.clinicalProblems.map((p) => ({ ...p })),
    goals: dataset.goals.map((g) => ({ ...g })),
    treatmentPlans: dataset.treatmentPlans.map((t) => ({ ...t })),
    treatmentSelections: dataset.treatmentSelections.map((s) => ({ ...s })),
    sessions: dataset.sessions.map((s) => ({ ...s })),
    sessionDeliveries: dataset.sessionDeliveries.map((d) => ({ ...d })),
    progressRecords: dataset.progressRecords.map((r) => ({ ...r })),
    progressMeasurements: dataset.progressMeasurements.map((m) => ({ ...m })),
    dischargeRecord: dataset.dischargeRecord ? { ...dataset.dischargeRecord } : undefined,
    evidenceItems: dataset.evidenceItems ? dataset.evidenceItems.map((e) => ({ ...e })) : [],
    clinicalInvestigations: dataset.clinicalInvestigations ? dataset.clinicalInvestigations.map((inv) => ({ ...inv })) : [],
  };
}

// Client-Side Browser Download Utility
export function downloadCaseJson(
  dataset: CaseClinicalDataset,
  format: 'full' | 'de_identified'
): { filename: string; sizeBytes: number } {
  const exportData = generateStructuredCaseExport(dataset, format);
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const rawCaseId = dataset.caseItem.caseId || dataset.caseItem.id.slice(0, 8);
  const cleanCaseId = rawCaseId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const formatSuffix = format === 'de_identified' ? 'Deidentified' : 'Full';
  const filename = `PhysioCase_${cleanCaseId}_${formatSuffix}.json`;

  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = url;
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);

  // Clean up URL object to avoid memory leaks
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { filename, sizeBytes: blob.size };
}
