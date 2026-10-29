import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  FileText,
  AlertCircle,
  Brain,
  Target,
  ListTodo,
  TrendingUp,
  Activity,
  HeartPulse,
  Flame,
  Check,
  ChevronRight,
  LogOut,
  FileScan,
  History,
  Archive,
  RotateCcw,
} from 'lucide-react';
import {
  Patient,
  Case,
  CaseLongitudinalTab,
  CaseLongitudinalContextViewModel,
} from '../types';
import { useClinical } from '../context/ClinicalContext';
import { Button } from '../components/common/Button';
import {
  ArchiveCaseModal,
  formatArchiveReasonLabel,
} from '../components/modals/ArchiveCaseModal';
import { ClinicalJourneyStepper } from '../components/clinical/ClinicalJourneyStepper';
import { ClinicalThreadsSection } from '../components/clinical/ClinicalThreadsSection';
import { ObjectiveAssessmentSection } from '../components/clinical/ObjectiveAssessmentSection';
import { ClinicalInvestigationsSection } from '../components/clinical/ClinicalInvestigationsSection';
import { ClinicalReasoningSection } from '../components/clinical/ClinicalReasoningSection';
import { GoalSettingSection } from '../components/clinical/GoalSettingSection';
import { TreatmentPlanSection } from '../components/clinical/TreatmentPlanSection';
import { ClinicalSessionsSection } from '../components/clinical/ClinicalSessionsSection';
import { ProgressAndOutcomesSection } from '../components/clinical/ProgressAndOutcomesSection';
import { CaseDischargeSection } from '../components/clinical/CaseDischargeSection';
import { CaseReportingSection } from '../components/reporting/CaseReportingSection';
import { CaseClinicalDataset } from '../types/reporting';
import { formatClinicalDate } from '../utils/clinicalFormatters';
import { PatientSafetyBanner } from '../components/patient/PatientSafetyBanner';
import { EditPatientSafetyModal } from '../components/patient/EditPatientSafetyModal';
import { LongitudinalContextDrawer } from '../components/patient/LongitudinalContextDrawer';
import {
  deriveCaseLongitudinalContext,
  LongitudinalClinicalDataset,
} from '../utils/longitudinalPatientHistory';

interface CaseWorkspaceViewProps {
  caseItem: Case;
  patient: Patient;
  onBackToPatientHub: () => void;
  initialSection?: string;
  onNavigateToCase?: (caseId: string) => void;
}

export type WorkspaceTab = 'assessment' | 'care_plan' | 'sessions' | 'outcomes';

export const mapSectionToWorkspaceTab = (section?: string): WorkspaceTab => {
  if (!section) return 'assessment';
  switch (section) {
    case 'subjective':
    case 'objective':
    case 'investigations':
      return 'assessment';
    case 'reasoning':
    case 'goals':
    case 'plan':
      return 'care_plan';
    case 'sessions':
      return 'sessions';
    case 'progress':
    case 'discharge':
    case 'reporting':
      return 'outcomes';
    default:
      return 'assessment';
  }
};

export const CaseWorkspaceView: React.FC<CaseWorkspaceViewProps> = ({
  caseItem,
  patient,
  onBackToPatientHub,
  initialSection,
  onNavigateToCase,
}) => {
  const {
    patients,
    cases,
    subjectiveAssessments,
    objectiveAssessments,
    clinicalInvestigations: allClinicalInvestigations,
    clinicalProblems: allClinicalProblems,
    clinicalGoals: allClinicalGoals,
    clinicalSessions: allClinicalSessions,
    sessionTreatmentDeliveries,
    progressRecords: allProgressRecords,
    progressMeasurements: allProgressMeasurements,
    caseDischargeRecords,
    setSelectedCaseId,
    getSubjectiveAssessment,
    openSubjectiveAssessment,
    getClinicalThreadsForCase,
    generateClinicalThreadsForCase,
    getObjectiveAssessment,
    getClinicalProblemsForCase,
    getClinicalGoalsForCase,
    getTreatmentPlansForCase,
    getTreatmentSelectionsForCase,
    getSessionsForCase,
    getProgressRecordsForCase,
    getMeasurementsForCase,
    getDischargeRecordForCase,
    evidenceItems,
    settings,
    getClinicalInvestigationsForCase,
    saveClinicalInvestigation,
    deleteClinicalInvestigation,
    archiveCase,
    unarchiveCase,
  } = useClinical();

  const currentPatient = patients.find((p) => p.id === patient.id) || patient;
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [safetyModalTab, setSafetyModalTab] = useState<
    'allergies' | 'precautions' | 'surgeries' | 'conditions' | 'mobility'
  >('allergies');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  const handleUnarchiveCase = () => {
    if (
      window.confirm(
        `Are you sure you want to unarchive "${caseItem.caseName}" and return it to the active clinical caseload?`
      )
    ) {
      try {
        unarchiveCase(caseItem.id);
      } catch (err) {
        console.error('Failed to unarchive case:', err);
      }
    }
  };

  // Longitudinal Context Drawer state (Stage 10D-4)
  const [isLongitudinalDrawerOpen, setIsLongitudinalDrawerOpen] = useState(false);
  const [longitudinalInitialTab, setLongitudinalInitialTab] = useState<CaseLongitudinalTab>('safety');

  // Encapsulated dataset for longitudinal derivation (authoritative boundary)
  const longitudinalDataset = useMemo<LongitudinalClinicalDataset>(() => {
    return {
      patients,
      cases,
      subjectiveAssessments,
      objectiveAssessments,
      clinicalInvestigations: allClinicalInvestigations,
      clinicalProblems: allClinicalProblems,
      clinicalGoals: allClinicalGoals,
      clinicalSessions: allClinicalSessions,
      sessionTreatmentDeliveries,
      progressRecords: allProgressRecords,
      progressMeasurements: allProgressMeasurements,
      caseDischargeRecords,
    };
  }, [
    patients,
    cases,
    subjectiveAssessments,
    objectiveAssessments,
    allClinicalInvestigations,
    allClinicalProblems,
    allClinicalGoals,
    allClinicalSessions,
    sessionTreatmentDeliveries,
    allProgressRecords,
    allProgressMeasurements,
    caseDischargeRecords,
  ]);

  // Authoritative derivation of patient longitudinal context strictly excluding current case
  const longitudinalContext = useMemo<CaseLongitudinalContextViewModel>(() => {
    return deriveCaseLongitudinalContext(
      currentPatient.id,
      caseItem.id,
      longitudinalDataset
    );
  }, [currentPatient.id, caseItem.id, longitudinalDataset]);

  const handleViewEpisode = (historicalCaseId: string) => {
    setIsLongitudinalDrawerOpen(false);
    if (onNavigateToCase) {
      onNavigateToCase(historicalCaseId);
    } else {
      setSelectedCaseId(historicalCaseId);
    }
  };

  const subjectiveAssessment = getSubjectiveAssessment(caseItem.id);
  const objectiveAssessment = getObjectiveAssessment(caseItem.id);
  const objectiveFindings = objectiveAssessment?.findings || [];
  const clinicalProblems = getClinicalProblemsForCase(caseItem.id);
  const investigations = getClinicalInvestigationsForCase(caseItem.id);
  const goals = getClinicalGoalsForCase(caseItem.id);
  const treatmentPlans = getTreatmentPlansForCase(caseItem.id);
  const treatmentSelections = getTreatmentSelectionsForCase(caseItem.id);
  const sessions = getSessionsForCase(caseItem.id);
  const sessionDeliveries = sessionTreatmentDeliveries.filter((d) =>
    sessions.some((s) => s.id === d.sessionId)
  );
  const progressRecords = getProgressRecordsForCase(caseItem.id);
  const progressMeasurements = getMeasurementsForCase(caseItem.id);
  const dischargeRecord = getDischargeRecordForCase(caseItem.id);

  // Pure data container passed to reporting layer
  const clinicalDataset: CaseClinicalDataset = {
    patient: currentPatient,
    caseItem,
    subjectiveAssessment: subjectiveAssessment || undefined,
    objectiveAssessment: objectiveAssessment || undefined,
    objectiveFindings,
    clinicalProblems,
    clinicalInvestigations: investigations,
    goals,
    treatmentPlans,
    treatmentSelections,
    sessions,
    sessionDeliveries,
    progressRecords,
    progressMeasurements,
    dischargeRecord,
    evidenceItems,
    settings,
  };

  const threads = getClinicalThreadsForCase(caseItem.id);
  const assessmentStatus = subjectiveAssessment?.status || 'not_started';
  const isCompleted = assessmentStatus === 'completed';
  const isInProgress = assessmentStatus === 'in_progress';

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() =>
    mapSectionToWorkspaceTab(initialSection)
  );

  const navigateToSection = (tab: WorkspaceTab, sectionId: string) => {
    setActiveTab(tab);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const scrollToObjective = () => navigateToSection('assessment', 'section-objective-assessment');
  const scrollToInvestigations = () => navigateToSection('assessment', 'section-clinical-investigations');
  const scrollToReasoning = () => navigateToSection('care_plan', 'section-clinical-reasoning');
  const scrollToGoals = () => navigateToSection('care_plan', 'section-clinical-goals');
  const scrollToPlan = () => navigateToSection('care_plan', 'section-treatment-plan');
  const scrollToSessions = () => navigateToSection('sessions', 'section-clinical-sessions');
  const scrollToProgress = () => navigateToSection('outcomes', 'section-clinical-progress');
  const scrollToDischarge = () => navigateToSection('outcomes', 'section-case-discharge');
  const scrollToReports = () => navigateToSection('outcomes', 'section-clinical-reporting');

  // Ensure completed assessments have their threads generated if not already stored
  useEffect(() => {
    if (subjectiveAssessment && subjectiveAssessment.status === 'completed') {
      const existing = getClinicalThreadsForCase(caseItem.id);
      if (existing.length === 0) {
        generateClinicalThreadsForCase(subjectiveAssessment);
      }
    }
  }, [subjectiveAssessment, caseItem.id, getClinicalThreadsForCase, generateClinicalThreadsForCase]);

  // Deep-link scrolling and tab activation when entering case workspace with a targeted section
  useEffect(() => {
    if (!initialSection) return;
    const targetTab = mapSectionToWorkspaceTab(initialSection);
    setActiveTab(targetTab);

    const sectionMap: Record<string, string> = {
      subjective: 'section-subjective-assessment',
      objective: 'section-objective-assessment',
      investigations: 'section-clinical-investigations',
      reasoning: 'section-clinical-reasoning',
      goals: 'section-clinical-goals',
      plan: 'section-treatment-plan',
      sessions: 'section-clinical-sessions',
      progress: 'section-clinical-progress',
      discharge: 'section-case-discharge',
      reporting: 'section-clinical-reporting',
    };
    const targetId = sectionMap[initialSection] || `section-${initialSection}`;
    const timer = setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [initialSection]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E8E2D8]">
        <div className="space-y-2">
          <button
            id="back-to-hub-btn"
            type="button"
            onClick={onBackToPatientHub}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525954] hover:text-[#18201C] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to {patient.fullName} (Clinical Hub)</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-[26px] font-semibold text-[#18201C] tracking-tight">
              {caseItem.caseName}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
              {caseItem.caseId}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
              {caseItem.status}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-medium rounded-full bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Subjective Assessment — Completed</span>
              </span>
            )}
            {isInProgress && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB]">
                Subjective: In Progress
              </span>
            )}
            {caseItem.isArchived && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-semibold rounded-full bg-[#F4EFEB] text-[#6B4B3E] border border-[#DDD6CB]">
                <Archive className="w-3.5 h-3.5" />
                <span>Archived (Read-Only)</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#636A64]">
            <span className="font-medium text-[#2C332E]">
              Patient: {patient.fullName} ({patient.patientNumber || 'PC-0001'})
            </span>
            <span>•</span>
            <span>Started: {formatClinicalDate(caseItem.startDate)}</span>
            <span>•</span>
            <button
              id="workspace-longitudinal-context-btn"
              type="button"
              onClick={() => {
                setLongitudinalInitialTab('safety');
                setIsLongitudinalDrawerOpen(true);
              }}
              aria-label="Open longitudinal patient context"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#FAF8F5] text-[#1B3B2B] border border-[#D0DDD5] hover:bg-[#EAE5DC] hover:border-[#1B3B2B] transition-colors cursor-pointer shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <span>Longitudinal Context</span>
              {longitudinalContext.counts.priorEpisodes > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
                  {longitudinalContext.counts.priorEpisodes} prior {longitudinalContext.counts.priorEpisodes === 1 ? 'episode' : 'episodes'}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            id="workspace-begin-assessment-btn"
            variant="primary"
            size="md"
            leftIcon={<Stethoscope className="w-4 h-4" />}
            onClick={() => openSubjectiveAssessment(caseItem.id)}
          >
            {isCompleted
              ? 'Review / Edit Subjective'
              : isInProgress
              ? 'Continue Subjective Assessment'
              : 'Begin Assessment'}
          </Button>
          <Button
            id="workspace-objective-assessment-btn"
            variant="secondary"
            size="md"
            onClick={scrollToObjective}
          >
            Objective Assessment
          </Button>
          <Button
            id="workspace-clinical-reasoning-btn"
            variant="secondary"
            size="md"
            leftIcon={<Brain className="w-4 h-4" />}
            onClick={scrollToReasoning}
          >
            Clinical Reasoning
          </Button>
          <Button
            id="workspace-clinical-goals-btn"
            variant="secondary"
            size="md"
            leftIcon={<Target className="w-4 h-4" />}
            onClick={scrollToGoals}
          >
            Goals
          </Button>
          <Button
            id="workspace-treatment-plan-btn"
            variant="secondary"
            size="md"
            leftIcon={<ListTodo className="w-4 h-4" />}
            onClick={scrollToPlan}
          >
            Treatment Plan
          </Button>
          <Button
            id="workspace-clinical-sessions-btn"
            variant="secondary"
            size="md"
            leftIcon={<Calendar className="w-4 h-4" />}
            onClick={scrollToSessions}
          >
            Sessions
          </Button>
          <Button
            id="workspace-clinical-progress-btn"
            variant="secondary"
            size="md"
            leftIcon={<TrendingUp className="w-4 h-4" />}
            onClick={scrollToProgress}
          >
            Progress
          </Button>
          <Button
            id="workspace-case-discharge-btn"
            variant="secondary"
            size="md"
            leftIcon={<LogOut className="w-4 h-4" />}
            onClick={scrollToDischarge}
          >
            Discharge
          </Button>
          <Button
            id="workspace-case-reports-btn"
            variant="secondary"
            size="md"
            leftIcon={<FileText className="w-4 h-4" />}
            onClick={scrollToReports}
          >
            Reports
          </Button>
          {caseItem.isArchived ? (
            <Button
              id="workspace-unarchive-case-btn"
              variant="secondary"
              size="md"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={handleUnarchiveCase}
            >
              Unarchive Case
            </Button>
          ) : (
            <Button
              id="workspace-archive-case-btn"
              variant="secondary"
              size="md"
              leftIcon={<Archive className="w-4 h-4" />}
              onClick={() => setIsArchiveModalOpen(true)}
            >
              Archive Case
            </Button>
          )}
        </div>
      </div>

      {/* Governed Read-Only Banner for Archived Cases */}
      {caseItem.isArchived && (
        <div
          id="workspace-archived-case-banner"
          className="p-4 rounded-xl bg-[#FAF8F5] border border-[#DDD6CB] shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#EAE5DC] text-[#6B4B3E] shrink-0 mt-0.5 border border-[#DDD6CB]">
              <Archive className="w-5 h-5 text-[#6B4B3E]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#18201C]">
                  Case Record is Archived (Read-Only)
                </span>
                {caseItem.archiveReason && (
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EAE5DC] text-[#4F5650] border border-[#DDD6CB]">
                    Reason: {formatArchiveReasonLabel(caseItem.archiveReason)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#525954] leading-relaxed">
                Archived on {formatClinicalDate(caseItem.archivedAt)}
                {caseItem.archivedBy?.name ? ` by ${caseItem.archivedBy.name}` : ''}.
                This case has been removed from active caseload scheduling and metrics. All clinical documentation is permanently preserved for audit and historical continuity.
              </p>
              {caseItem.archiveNotes && (
                <p className="text-xs text-[#4F5650] italic bg-white/70 p-2 rounded border border-[#E8E2D8] mt-1">
                  &ldquo;{caseItem.archiveNotes}&rdquo;
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Button
              id="workspace-banner-unarchive-btn"
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleUnarchiveCase}
            >
              Unarchive Case
            </Button>
          </div>
        </div>
      )}

      {/* Clinical Journey Stepper for this case */}
      <ClinicalJourneyStepper
        hasActiveCase={true}
        assessmentStatus={assessmentStatus}
        hasReasoningActive={true}
        hasGoalsActive={true}
        hasPlanActive={true}
        hasSessionsActive={true}
        hasProgressActive={true}
        isDischarged={caseItem.status === 'Discharged'}
      />

      {/* Patient Safety & Persistent Medical Context */}
      <PatientSafetyBanner
        id="workspace-patient-safety-banner"
        patient={currentPatient}
        compactDefault={true}
        onOpenEditModal={(tab) => {
          setSafetyModalTab(tab || 'allergies');
          setIsSafetyModalOpen(true);
        }}
      />

      {/* Case Details Card */}
      <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE4DB]">
          <h2 className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
            Episode Details & Referral Context
          </h2>
          <span className="text-xs text-[#6A716B]">
            Status: <span className="font-medium text-[#1B3B2B]">{caseItem.status}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[#6A726C] font-medium">Date of Onset</span>
            <p className="font-medium text-[#18201C]">
              {caseItem.dateOfOnset ? formatClinicalDate(caseItem.dateOfOnset) : 'Not specified'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[#6A726C] font-medium">Referral Source</span>
            <p className="font-medium text-[#18201C]">
              {caseItem.referralSource || 'Self-referral / Direct access'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[#6A726C] font-medium">Last Session</span>
            <p className="font-medium text-[#18201C]">
              {caseItem.lastSessionDate ? formatClinicalDate(caseItem.lastSessionDate) : 'None recorded'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[#6A726C] font-medium">Next Scheduled Review</span>
            <p className="font-medium text-[#18201C]">
              {caseItem.nextReviewDate ? formatClinicalDate(caseItem.nextReviewDate) : 'None scheduled'}
            </p>
          </div>
        </div>

        {caseItem.presentingProblem && (
          <div className="pt-3 border-t border-[#EAE4DB] text-xs space-y-1">
            <span className="text-[#6A726C] font-medium">Presenting Problem / Reason for Referral</span>
            <p className="text-[#2C332E] leading-relaxed bg-[#F5F1EB] p-3 rounded-lg border border-[#E6E0D6]">
              {caseItem.presentingProblem}
            </p>
          </div>
        )}
      </div>

      {/* Primary Four-Tab Workspace Navigation */}
      <div
        role="tablist"
        aria-label="Case Workspace primary navigation"
        className="bg-[#F2ECE4] p-1.5 rounded-xl border border-[#E3DDD2] flex flex-wrap sm:flex-nowrap gap-1.5 shadow-2xs"
      >
        <button
          id="tab-assessment"
          role="tab"
          type="button"
          aria-selected={activeTab === 'assessment'}
          aria-controls="tabpanel-assessment"
          onClick={() => setActiveTab('assessment')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20 ${
            activeTab === 'assessment'
              ? 'bg-[#FAF8F5] text-[#1B3B2B] shadow-xs font-semibold border border-[#D5DDD7]'
              : 'text-[#5A625C] hover:text-[#18201C] hover:bg-[#EAE4DC] border border-transparent'
          }`}
        >
          <Stethoscope className="w-4 h-4 shrink-0" />
          <span>Assessment</span>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Done</span>
            </span>
          ) : isInProgress ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB]">
              Active
            </span>
          ) : null}
        </button>

        <button
          id="tab-care_plan"
          role="tab"
          type="button"
          aria-selected={activeTab === 'care_plan'}
          aria-controls="tabpanel-care_plan"
          onClick={() => setActiveTab('care_plan')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20 ${
            activeTab === 'care_plan'
              ? 'bg-[#FAF8F5] text-[#1B3B2B] shadow-xs font-semibold border border-[#D5DDD7]'
              : 'text-[#5A625C] hover:text-[#18201C] hover:bg-[#EAE4DC] border border-transparent'
          }`}
        >
          <Target className="w-4 h-4 shrink-0" />
          <span>Care Plan</span>
          {goals.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
              {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
            </span>
          )}
        </button>

        <button
          id="tab-sessions"
          role="tab"
          type="button"
          aria-selected={activeTab === 'sessions'}
          aria-controls="tabpanel-sessions"
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20 ${
            activeTab === 'sessions'
              ? 'bg-[#FAF8F5] text-[#1B3B2B] shadow-xs font-semibold border border-[#D5DDD7]'
              : 'text-[#5A625C] hover:text-[#18201C] hover:bg-[#EAE4DC] border border-transparent'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Sessions</span>
          {sessions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
              {sessions.length}
            </span>
          )}
        </button>

        <button
          id="tab-outcomes"
          role="tab"
          type="button"
          aria-selected={activeTab === 'outcomes'}
          aria-controls="tabpanel-outcomes"
          onClick={() => setActiveTab('outcomes')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20 ${
            activeTab === 'outcomes'
              ? 'bg-[#FAF8F5] text-[#1B3B2B] shadow-xs font-semibold border border-[#D5DDD7]'
              : 'text-[#5A625C] hover:text-[#18201C] hover:bg-[#EAE4DC] border border-transparent'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Outcomes &amp; Closure</span>
          {dischargeRecord ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Discharged</span>
            </span>
          ) : progressRecords.length > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
              {progressRecords.length} {progressRecords.length === 1 ? 'review' : 'reviews'}
            </span>
          ) : null}
        </button>
      </div>

      {/* Tab 1: Assessment Panel */}
      <div
        role="tabpanel"
        id="tabpanel-assessment"
        aria-labelledby="tab-assessment"
        tabIndex={0}
        className={activeTab === 'assessment' ? 'space-y-6 block focus:outline-none' : 'hidden'}
      >
        {/* Stage 1 Clinical Documentation Card: Subjective Assessment */}
        <div
          id="section-subjective-assessment"
          className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs space-y-5 scroll-mt-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE4DB]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#18201C]">
                    Stage 1: Subjective Assessment
                  </h3>
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B3B2B] bg-[#E2ECE6] px-2.5 py-0.5 rounded-full border border-[#CBD9D1]">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      Completed
                    </span>
                  ) : isInProgress ? (
                    <span className="text-[11px] font-medium text-[#5B635D] bg-[#F4EFEB] px-2.5 py-0.5 rounded-full border border-[#DDD6CB]">
                      In Progress
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-[#7D847F] bg-[#F4EFEB] px-2.5 py-0.5 rounded-full border border-[#DDD6CB]">
                      Not Started
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#636A64] mt-0.5">
                  Systematic documentation of the patient's story, symptoms, mechanical behavior, and goals.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                id="open-subjective-assessment-card-btn"
                variant="primary"
                size="sm"
                leftIcon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => openSubjectiveAssessment(caseItem.id)}
              >
                {isCompleted
                  ? 'Review / Edit Assessment'
                  : isInProgress
                  ? 'Continue Assessment'
                  : 'Begin Assessment'}
              </Button>
            </div>
          </div>

          {/* If assessment has findings documented, show clean clinical summary */}
          {subjectiveAssessment ? (
            <div className="space-y-4 text-xs">
              {subjectiveAssessment.patientStory && (
                <div className="space-y-1">
                  <span className="text-[#6A726C] font-semibold uppercase text-[10px] tracking-wider">
                    Patient's Story
                  </span>
                  <p className="p-3 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] text-[#2C332E] leading-relaxed italic">
                    "{subjectiveAssessment.patientStory}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] space-y-1">
                  <span className="text-[#6A726C] text-[10px] font-semibold uppercase tracking-wider">
                    Symptom Location(s)
                  </span>
                  <p className="font-medium text-[#18201C]">
                    {subjectiveAssessment.symptomLocations.length > 0
                      ? subjectiveAssessment.symptomLocations.join(', ')
                      : 'None specified'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] space-y-1">
                  <span className="text-[#6A726C] text-[10px] font-semibold uppercase tracking-wider">
                    Onset & Pattern
                  </span>
                  <p className="font-medium text-[#18201C]">
                    {subjectiveAssessment.onset || 'Onset not specified'}
                    {subjectiveAssessment.frequency ? ` • ${subjectiveAssessment.frequency}` : ''}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] space-y-1">
                  <span className="text-[#6A726C] text-[10px] font-semibold uppercase tracking-wider">
                    Pain / Severity (0–10)
                  </span>
                  <p className="font-medium text-[#18201C]">
                    Current: {subjectiveAssessment.painSeverity.current} • Best: {subjectiveAssessment.painSeverity.best} • Worst: {subjectiveAssessment.painSeverity.worst}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] space-y-1">
                  <span className="text-[#6A726C] text-[10px] font-semibold uppercase tracking-wider">
                    Safety Screening
                  </span>
                  <p className="font-medium text-[#18201C]">
                    {subjectiveAssessment.safetyScreening
                      ? `Requires Medical Assmt: ${subjectiveAssessment.safetyScreening}`
                      : 'Not screened'}
                  </p>
                </div>
              </div>

              {subjectiveAssessment.mostImportantActivity && (
                <div className="p-3 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] space-y-1">
                  <span className="text-[#6A726C] text-[10px] font-semibold uppercase tracking-wider">
                    Activity Mattering Most (Goals Foundation)
                  </span>
                  <p className="font-medium text-[#18201C]">
                    {subjectiveAssessment.mostImportantActivity}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] text-xs text-[#636A64] flex items-center justify-between">
              <span>No subjective findings recorded yet for this episode.</span>
              <button
                type="button"
                onClick={() => openSubjectiveAssessment(caseItem.id)}
                className="text-xs font-semibold text-[#1B3B2B] hover:underline cursor-pointer"
              >
                Start Subjective Assessment &rarr;
              </button>
            </div>
          )}

          {/* Workflow Progression Pathway */}
          <div className="pt-3 border-t border-[#EAE4DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#6E756F]">
              {isCompleted ? (
                <span className="text-[#1B3B2B] font-medium">
                  Subjective documentation complete. Ready for Objective Assessment.
                </span>
              ) : (
                <span>
                  Complete the subjective story before proceeding to physical testing.
                </span>
              )}
            </div>

            <Button
              id="workspace-proceed-objective-btn"
              variant="secondary"
              size="sm"
              leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
              onClick={scrollToObjective}
            >
              Next: Objective Assessment
            </Button>
          </div>
        </div>

        {/* Clinical Threads Section (Derived from Subjective Assessment) */}
        <ClinicalThreadsSection
          caseId={caseItem.id}
          assessment={subjectiveAssessment}
        />

        {/* Objective Assessment Section (Stage 2) */}
        <ObjectiveAssessmentSection
          caseId={caseItem.id}
          patientId={patient.id}
          threads={threads}
        />

        {/* Clinical Investigations Section (Stage 4F: Radiological & Diagnostic Layer) */}
        <ClinicalInvestigationsSection
          caseId={caseItem.id}
          investigations={investigations}
          onSaveInvestigation={saveClinicalInvestigation}
          onDeleteInvestigation={deleteClinicalInvestigation}
        />
      </div>

      {/* Tab 2: Care Plan Panel */}
      <div
        role="tabpanel"
        id="tabpanel-care_plan"
        aria-labelledby="tab-care_plan"
        tabIndex={0}
        className={activeTab === 'care_plan' ? 'space-y-6 block focus:outline-none' : 'hidden'}
      >
        {/* Clinical Reasoning Section (Stage 3B: Findings → Problems) */}
        <ClinicalReasoningSection
          caseId={caseItem.id}
          patientId={patient.id}
        />

        {/* Goal Setting Section (Stage 4A: Problems → Goals) */}
        <GoalSettingSection
          caseId={caseItem.id}
          patientId={patient.id}
        />

        {/* Treatment Plan Section (Stage 4B: Treatment Plan Architecture) */}
        <TreatmentPlanSection
          caseId={caseItem.id}
          patientId={patient.id}
        />
      </div>

      {/* Tab 3: Sessions Panel */}
      <div
        role="tabpanel"
        id="tabpanel-sessions"
        aria-labelledby="tab-sessions"
        tabIndex={0}
        className={activeTab === 'sessions' ? 'space-y-6 block focus:outline-none' : 'hidden'}
      >
        {/* Clinical Sessions Section (Stage 5: Clinical Sessions Foundation) */}
        <ClinicalSessionsSection
          caseId={caseItem.id}
          patientId={patient.id}
        />
      </div>

      {/* Tab 4: Outcomes & Closure Panel */}
      <div
        role="tabpanel"
        id="tabpanel-outcomes"
        aria-labelledby="tab-outcomes"
        tabIndex={0}
        className={activeTab === 'outcomes' ? 'space-y-6 block focus:outline-none' : 'hidden'}
      >
        {/* Clinical Progress & Outcomes Section (Stage 6: Clinical Progress Foundation) */}
        <ProgressAndOutcomesSection
          caseItem={caseItem}
          patient={patient}
        />

        {/* Case Discharge & Clinical Summary Section (Stage 7: Clinical Closure Foundation) */}
        <CaseDischargeSection
          caseItem={caseItem}
          patient={patient}
        />

        {/* Clinical Reporting & Export Section (Stage 8: Reporting & Export Foundation) */}
        <CaseReportingSection
          dataset={clinicalDataset}
        />
      </div>

      {/* Clinical Workflow Roadmap */}
      <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
          Clinical Pathway Roadmap
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <div
            onClick={scrollToObjective}
            className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] space-y-1.5 cursor-pointer hover:border-[#1B3B2B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#1B3B2B]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Objective Exam</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Examination areas derived from clinical threads and physical testing.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#414843]">
              Stage 2 • Findings
            </span>
          </div>

          <div
            onClick={scrollToInvestigations}
            className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] space-y-1.5 cursor-pointer hover:border-[#1D4E89] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileScan className="w-4 h-4 text-[#1D4E89]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Investigations</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Document radiological imaging, reported findings, and clinician correlation.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#1D4E89]">
              Stage 4F • Imaging
            </span>
          </div>

          <div
            onClick={scrollToReasoning}
            className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] space-y-1.5 cursor-pointer hover:border-[#1B3B2B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#1B3B2B]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Reasoning</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Synthesize documented findings into formulated clinical problems.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#414843]">
              Stage 3B • Problems
            </span>
          </div>

          <div
            onClick={scrollToGoals}
            className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] space-y-1.5 cursor-pointer hover:border-[#1B3B2B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#1B3B2B]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Goals</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Patient-centered functional goals linked to clinical problems.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#1B3B2B]">
              Stage 4A • Active Goals
            </span>
          </div>

          <div
            onClick={scrollToPlan}
            className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] space-y-1.5 cursor-pointer hover:border-[#1B3B2B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-[#1B3B2B]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Treatment Plan</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Therapist-selected interventions, dosage parameters, and progression criteria.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#1B3B2B]">
              Stage 4B • Plan
            </span>
          </div>

          <div
            onClick={scrollToSessions}
            className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] space-y-1.5 cursor-pointer hover:border-[#1B3B2B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1B3B2B]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Sessions</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Encounters, actual treatment delivery, modifications, and immediate patient response.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#1B3B2B]">
              Stage 5 • Deliveries
            </span>
          </div>

          <div
            onClick={scrollToProgress}
            className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] space-y-1.5 cursor-pointer hover:border-[#1B3B2B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1B3B2B]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Progress</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Longitudinal change over time, quantitative measurements, and delta trends.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#1B3B2B]">
              Stage 6 • Outcomes
            </span>
          </div>

          <div
            onClick={scrollToDischarge}
            className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] space-y-1.5 cursor-pointer hover:border-[#1B3B2B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-[#1B3B2B]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Discharge</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Formal episode conclusion, synthesis, and post-discharge self-management.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#1B3B2B]">
              Stage 7 • Closure
            </span>
          </div>

          <div
            onClick={scrollToReports}
            className="p-4 rounded-lg bg-[#EBF2EE] border border-[#CAD8D0] space-y-1.5 cursor-pointer hover:border-[#1B3B2B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1B3B2B]" />
              <h4 className="text-xs font-semibold text-[#18201C]">Reports</h4>
            </div>
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Pure clinical synthesis, referral communication, and discharge plans.
            </p>
            <span className="inline-block text-[10px] uppercase font-semibold text-[#1B3B2B]">
              Stage 8 • Reports & Export
            </span>
          </div>
        </div>
      </div>

      {/* Edit Patient Safety Modal */}
      <EditPatientSafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        patient={currentPatient}
        initialTab={safetyModalTab}
      />

      {/* Longitudinal Context Drawer (Stage 10D) */}
      <LongitudinalContextDrawer
        isOpen={isLongitudinalDrawerOpen}
        onClose={() => setIsLongitudinalDrawerOpen(false)}
        context={longitudinalContext}
        initialTab={longitudinalInitialTab}
        onViewEpisode={handleViewEpisode}
      />

      {/* Governed Case Archival Modal */}
      <ArchiveCaseModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        caseItem={caseItem}
      />
    </div>
  );
};
