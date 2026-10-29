import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Calendar,
  User,
  Phone,
  Mail,
  Edit3,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  FolderKanban,
  Target,
  TrendingUp,
  LayoutDashboard,
  ChevronRight,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Patient, Case } from '../types';
import { useClinical } from '../context/ClinicalContext';
import { Button } from '../components/common/Button';
import { ClinicalJourneyStepper } from '../components/clinical/ClinicalJourneyStepper';
import { calculateAge, formatClinicalDate } from '../utils/clinicalFormatters';
import { PatientSafetyBanner } from '../components/patient/PatientSafetyBanner';
import { EditPatientSafetyModal } from '../components/patient/EditPatientSafetyModal';
import { useLongitudinalHistory } from '../hooks/useLongitudinalHistory';
import { PatientCaseHistory } from '../components/patient/PatientCaseHistory';
import { PatientTimelineView } from '../components/patient/PatientTimelineView';
import { CumulativeProblemHistory } from '../components/patient/CumulativeProblemHistory';
import { CrossEpisodeOutcomesView } from '../components/patient/CrossEpisodeOutcomesView';
import { LongitudinalReportModal } from '../components/patient/LongitudinalReportModal';

interface PatientHubViewProps {
  patient: Patient;
  onBack: () => void;
  onOpenCase: (caseItem: Case, sectionId?: string) => void;
}

export const PatientHubView: React.FC<PatientHubViewProps> = ({
  patient,
  onBack,
  onOpenCase,
}) => {
  const {
    patients,
    cases,
    openNewCaseModal,
    openEditPatientModal,
    getSubjectiveAssessment,
    settings,
  } = useClinical();

  const currentPatient = patients.find((p) => p.id === patient.id) || patient;

  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [safetyModalTab, setSafetyModalTab] = useState<
    'allergies' | 'precautions' | 'surgeries' | 'conditions' | 'mobility'
  >('allergies');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Longitudinal patient history derivation (Stage 10C-A / Stage 10C-B1 / Stage 10C-B2 / Stage 10C-C / Stage 10E)
  const {
    activeCases: longitudinalActiveCases,
    closedCases: longitudinalClosedCases,
    archivedCases: longitudinalArchivedCases,
    totalEpisodesCount,
    timeline,
    cumulativeProblems,
    outcomeSeries,
    historicalCases,
    safetyAlerts,
    dataset,
  } = useLongitudinalHistory(currentPatient.id);

  const [longitudinalTab, setLongitudinalTab] = useState<
    'overview' | 'episodes' | 'timeline' | 'problems' | 'outcomes'
  >('overview');

  // Identify currently active case if one exists (first active non-discharged case)
  const activeCase = longitudinalActiveCases.length > 0
    ? cases.find(
        (c) =>
          c.id === longitudinalActiveCases[0].caseId ||
          c.caseId === longitudinalActiveCases[0].caseId
      ) || null
    : null;
  const activeCaseAssessment = activeCase ? getSubjectiveAssessment(activeCase.id) : null;

  // Overview calculations (pure factual derivations)
  const activeProblemsCount = cumulativeProblems.filter((p) => p.sourceStatus === 'active').length;
  const resolvedProblemsCount = cumulativeProblems.filter((p) => p.sourceStatus === 'resolved').length;
  const mostRecentEpisode = historicalCases.length > 0 ? historicalCases[0] : null;
  const mostRecentCase = mostRecentEpisode
    ? cases.find(
        (c) =>
          c.id === mostRecentEpisode.caseId ||
          c.caseId === mostRecentEpisode.caseId
      ) || null
    : null;

  const ageText = calculateAge(currentPatient.dateOfBirth);
  const [assessmentNotice, setAssessmentNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header: Clean and compact per requirements */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div className="space-y-2">
          {/* Back to Patients */}
          <button
            id="back-to-patients-btn"
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525954] hover:text-[#18201C] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Patients</span>
          </button>

          {/* Patient identity & vital tags */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-[26px] font-semibold text-[#18201C] tracking-tight">
              {patient.fullName}
            </h1>
            {patient.preferredName && (
              <span className="text-sm text-[#636A64] font-normal">
                (&ldquo;{patient.preferredName}&rdquo;)
              </span>
            )}

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                {patient.patientNumber || 'PC-0001'}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                {patient.sex || 'Sex: Unspecified'}
              </span>
              {ageText && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#F4EFE8] text-[#555C57] border border-[#E5DFD4]">
                  {ageText}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action: Longitudinal Report & + New Case */}
        <div className="shrink-0 flex items-center gap-2.5">
          <Button
            id="hub-longitudinal-report-btn"
            variant="secondary"
            size="md"
            leftIcon={<FileText className="w-4 h-4" />}
            onClick={() => setIsReportModalOpen(true)}
          >
            Longitudinal Report
          </Button>
          <Button
            id="hub-new-case-btn"
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => openNewCaseModal(patient)}
          >
            + New Case
          </Button>
        </div>
      </div>

      {/* Assessment notice message banner if triggered */}
      {assessmentNotice && (
        <div className="p-4 rounded-xl bg-[#EBF2EE] border border-[#CCDCD2] flex items-start justify-between gap-3 text-sm text-[#1B3B2B] animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#1B3B2B] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider text-[#1B3B2B]">
                Assessment Scheduled
              </p>
              <p className="text-xs text-[#2A4839] mt-0.5 leading-relaxed">
                {assessmentNotice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAssessmentNotice(null)}
            className="text-xs text-[#415D4E] hover:text-[#1B3B2B] font-medium p-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Clinical Journey Stepper */}
      <ClinicalJourneyStepper
        hasActiveCase={!!activeCase}
        assessmentStatus={activeCaseAssessment?.status || 'not_started'}
      />

      {/* 2b. Patient Safety & Persistent Medical Context */}
      <PatientSafetyBanner
        id="hub-patient-safety-banner"
        patient={currentPatient}
        compactDefault={false}
        onOpenEditModal={(tab) => {
          setSafetyModalTab(tab || 'allergies');
          setIsSafetyModalOpen(true);
        }}
      />

      {/* 3. Clinical Snapshot */}
      <div
        id="clinical-snapshot"
        className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs"
      >
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#EAE4DB]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1B3B2B]" />
            <h2 className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
              Clinical Snapshot
            </h2>
          </div>
          {activeCase && (
            <span className="text-xs text-[#636A64]">
              {totalEpisodesCount} episode{totalEpisodesCount === 1 ? '' : 's'} on record
            </span>
          )}
        </div>

        {activeCase ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#6A726C] uppercase tracking-wider">
                Active Case
              </span>
              <p className="text-sm font-semibold text-[#18201C] truncate" title={activeCase.caseName}>
                {activeCase.caseName}
              </p>
              <p className="text-xs font-mono text-[#525954]">{activeCase.caseId}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#6A726C] uppercase tracking-wider">
                Case Status
              </span>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                  {activeCase.status}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#6A726C] uppercase tracking-wider">
                Case Start Date
              </span>
              <p className="text-sm font-medium text-[#18201C]">
                {formatClinicalDate(activeCase.startDate)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#6A726C] uppercase tracking-wider">
                Last Session
              </span>
              <p className="text-sm text-[#525954]">
                {activeCase.lastSessionDate ? formatClinicalDate(activeCase.lastSessionDate) : 'None recorded'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#6A726C] uppercase tracking-wider">
                Next Review
              </span>
              <p className="text-sm text-[#525954]">
                {activeCase.nextReviewDate ? formatClinicalDate(activeCase.nextReviewDate) : 'None scheduled'}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6 px-4 text-center rounded-lg bg-[#F6F2EB] border border-[#E8E2D7] space-y-3">
            <p className="text-sm font-semibold text-[#2D3530]">No active case</p>
            <p className="text-xs text-[#636A64] max-w-md mx-auto">
              Create a case to begin the patient&apos;s rehabilitation journey.
            </p>
            <Button
              id="snapshot-create-case-btn"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => openNewCaseModal(patient)}
            >
              Create first case
            </Button>
          </div>
        )}
      </div>

      {/* 4. Longitudinal Records & History Hub (Stage 10C-A & Stage 10C-B1 & Stage 10E) */}
      <div id="longitudinal-records-hub" className="space-y-4">
        {/* Navigation Tabs for Longitudinal Care */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D9] pb-1">
          <div
            role="tablist"
            aria-label="Patient longitudinal sections"
            className="flex items-center gap-1.5"
          >
            <button
              id="hub-tab-overview"
              type="button"
              role="tab"
              aria-selected={longitudinalTab === 'overview'}
              onClick={() => setLongitudinalTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                longitudinalTab === 'overview'
                  ? 'border-[#1B3B2B] text-[#1B3B2B] bg-[#F4EFE8]'
                  : 'border-transparent text-[#636A64] hover:text-[#18201C] hover:bg-[#F8F5F0]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              id="hub-tab-episodes"
              type="button"
              role="tab"
              aria-selected={longitudinalTab === 'episodes'}
              onClick={() => setLongitudinalTab('episodes')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                longitudinalTab === 'episodes'
                  ? 'border-[#1B3B2B] text-[#1B3B2B] bg-[#F4EFE8]'
                  : 'border-transparent text-[#636A64] hover:text-[#18201C] hover:bg-[#F8F5F0]'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Episodes of Care</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#EAE5DC] text-[#343B36]">
                {totalEpisodesCount}
              </span>
            </button>

            <button
              id="hub-tab-timeline"
              type="button"
              role="tab"
              aria-selected={longitudinalTab === 'timeline'}
              onClick={() => setLongitudinalTab('timeline')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                longitudinalTab === 'timeline'
                  ? 'border-[#1B3B2B] text-[#1B3B2B] bg-[#F4EFE8]'
                  : 'border-transparent text-[#636A64] hover:text-[#18201C] hover:bg-[#F8F5F0]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Clinical Timeline</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#EAE5DC] text-[#343B36]">
                {timeline.length}
              </span>
            </button>

            <button
              id="hub-tab-problems"
              type="button"
              role="tab"
              aria-selected={longitudinalTab === 'problems'}
              onClick={() => setLongitudinalTab('problems')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                longitudinalTab === 'problems'
                  ? 'border-[#1B3B2B] text-[#1B3B2B] bg-[#F4EFE8]'
                  : 'border-transparent text-[#636A64] hover:text-[#18201C] hover:bg-[#F8F5F0]'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Cumulative Problems</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#EAE5DC] text-[#343B36]">
                {cumulativeProblems.length}
              </span>
            </button>

            <button
              id="hub-tab-outcomes"
              type="button"
              role="tab"
              aria-selected={longitudinalTab === 'outcomes'}
              onClick={() => setLongitudinalTab('outcomes')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                longitudinalTab === 'outcomes'
                  ? 'border-[#1B3B2B] text-[#1B3B2B] bg-[#F4EFE8]'
                  : 'border-transparent text-[#636A64] hover:text-[#18201C] hover:bg-[#F8F5F0]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Cross-Episode Outcomes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#EAE5DC] text-[#343B36]">
                {outcomeSeries.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="hub-export-longitudinal-summary-btn"
              variant="secondary"
              size="sm"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => setIsReportModalOpen(true)}
            >
              Export Health Summary
            </Button>
          </div>
        </div>

        {/* Tab 0: Longitudinal Overview (Stage 10E) */}
        {longitudinalTab === 'overview' && (
          <div id="hub-overview-panel" className="space-y-6 animate-in fade-in duration-150">
            {/* 1. Longitudinal Navigation Cards: 4 scannable orientation pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pillar 1: Episodes of Care */}
              <div
                id="overview-card-episodes"
                className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:border-[#CCD5CE] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-[#EBF2EE] border border-[#D5E2DA] flex items-center justify-center text-[#1B3B2B]">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EAE5DC] text-[#343B36]">
                      {totalEpisodesCount} total
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#636A64] uppercase tracking-wider">
                      Episodes of Care
                    </h3>
                    <p className="text-xl font-bold text-[#18201C] mt-1">
                      {totalEpisodesCount}{' '}
                      <span className="text-xs font-normal text-[#525954]">
                        Documented Episode{totalEpisodesCount === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#EAE4DB] text-xs text-[#525954] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Open:</span>
                      <span className="font-semibold text-[#18201C]">
                        {longitudinalActiveCases.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Closed:</span>
                      <span className="font-semibold text-[#18201C]">
                        {longitudinalClosedCases.length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-[#EAE4DB]">
                  <button
                    id="overview-nav-episodes-btn"
                    type="button"
                    onClick={() => setLongitudinalTab('episodes')}
                    className="w-full inline-flex items-center justify-between text-xs font-semibold text-[#1B3B2B] hover:text-[#12271D] py-1 cursor-pointer group"
                    aria-label="Navigate to Episodes of Care"
                  >
                    <span>View Episodes</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Pillar 2: Clinical Timeline */}
              <div
                id="overview-card-timeline"
                className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:border-[#CCD5CE] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-[#EBF2EE] border border-[#D5E2DA] flex items-center justify-center text-[#1B3B2B]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EAE5DC] text-[#343B36]">
                      {timeline.length} events
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#636A64] uppercase tracking-wider">
                      Clinical Timeline
                    </h3>
                    <p className="text-xl font-bold text-[#18201C] mt-1">
                      {timeline.length}{' '}
                      <span className="text-xs font-normal text-[#525954]">
                        Documented Event{timeline.length === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#EAE4DB] text-xs text-[#525954]">
                    {timeline.length > 0 ? (
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-[#757C76] block">Latest Event:</span>
                        <p className="font-medium text-[#18201C] truncate" title={timeline[0].title}>
                          {timeline[0].title}
                        </p>
                        <p className="text-[11px] text-[#525954]">
                          {formatClinicalDate(timeline[0].timestamp)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#636A64] italic">
                        No timeline events available.
                      </p>
                    )}
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-[#EAE4DB]">
                  <button
                    id="overview-nav-timeline-btn"
                    type="button"
                    onClick={() => setLongitudinalTab('timeline')}
                    className="w-full inline-flex items-center justify-between text-xs font-semibold text-[#1B3B2B] hover:text-[#12271D] py-1 cursor-pointer group"
                    aria-label="Navigate to Clinical Timeline"
                  >
                    <span>View Timeline</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Pillar 3: Cumulative Problems */}
              <div
                id="overview-card-problems"
                className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:border-[#CCD5CE] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-[#EBF2EE] border border-[#D5E2DA] flex items-center justify-center text-[#1B3B2B]">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EAE5DC] text-[#343B36]">
                      {cumulativeProblems.length} total
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#636A64] uppercase tracking-wider">
                      Cumulative Problems
                    </h3>
                    <p className="text-xl font-bold text-[#18201C] mt-1">
                      {cumulativeProblems.length}{' '}
                      <span className="text-xs font-normal text-[#525954]">
                        Documented Problem{cumulativeProblems.length === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#EAE4DB] text-xs text-[#525954] space-y-1">
                    {cumulativeProblems.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Active:</span>
                          <span className="font-semibold text-[#18201C]">
                            {activeProblemsCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Resolved:</span>
                          <span className="font-semibold text-[#18201C]">
                            {resolvedProblemsCount}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[#636A64] italic">
                        No problems documented.
                      </p>
                    )}
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-[#EAE4DB]">
                  <button
                    id="overview-nav-problems-btn"
                    type="button"
                    onClick={() => setLongitudinalTab('problems')}
                    className="w-full inline-flex items-center justify-between text-xs font-semibold text-[#1B3B2B] hover:text-[#12271D] py-1 cursor-pointer group"
                    aria-label="Navigate to Cumulative Problems"
                  >
                    <span>View Problems</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Pillar 4: Cross-Episode Outcomes */}
              <div
                id="overview-card-outcomes"
                className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:border-[#CCD5CE] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-[#EBF2EE] border border-[#D5E2DA] flex items-center justify-center text-[#1B3B2B]">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EAE5DC] text-[#343B36]">
                      {outcomeSeries.length} measures
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#636A64] uppercase tracking-wider">
                      Cross-Episode Outcomes
                    </h3>
                    <p className="text-xl font-bold text-[#18201C] mt-1">
                      {outcomeSeries.length}{' '}
                      <span className="text-xs font-normal text-[#525954]">
                        Measure{outcomeSeries.length === 1 ? '' : 's'} Tracked
                      </span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#EAE4DB] text-xs text-[#525954]">
                    {outcomeSeries.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#757C76] block">Tracked Metrics:</span>
                        <p className="font-medium text-[#18201C] truncate" title={outcomeSeries.map((s) => s.measureName).join(', ')}>
                          {outcomeSeries.map((s) => s.measureName).slice(0, 2).join(', ')}
                          {outcomeSeries.length > 2 && ` +${outcomeSeries.length - 2} more`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#636A64] italic">
                        No outcome measurements documented.
                      </p>
                    )}
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-[#EAE4DB]">
                  <button
                    id="overview-nav-outcomes-btn"
                    type="button"
                    onClick={() => setLongitudinalTab('outcomes')}
                    className="w-full inline-flex items-center justify-between text-xs font-semibold text-[#1B3B2B] hover:text-[#12271D] py-1 cursor-pointer group"
                    aria-label="Navigate to Cross-Episode Outcomes"
                  >
                    <span>View Outcomes</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Middle Row: Most Recent Episode & Documented Safety Context */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card A: Most Recent Documented Episode */}
              <div
                id="overview-recent-episode"
                className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4DB]">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-[#1B3B2B]" />
                      <h3 className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
                        Most Recent Episode
                      </h3>
                    </div>
                    {mostRecentEpisode && (
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                        {mostRecentEpisode.displayId}
                      </span>
                    )}
                  </div>

                  {mostRecentEpisode ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-base font-semibold text-[#18201C]">
                          {mostRecentEpisode.caseName}
                        </p>
                        <p className="text-xs text-[#636A64] mt-0.5 font-mono">
                          {mostRecentEpisode.displayId}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#F4EFE8] p-3 rounded-lg border border-[#E6E0D5]">
                        <div>
                          <span className="text-[#757C76] font-medium block">Status</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA] mt-0.5">
                            {mostRecentEpisode.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#757C76] font-medium block">Opened</span>
                          <p className="font-medium text-[#18201C] mt-0.5">
                            {formatClinicalDate(mostRecentEpisode.startDate)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#757C76] font-medium block">Recorded Sessions</span>
                          <p className="font-medium text-[#18201C] mt-0.5">
                            {mostRecentEpisode.totalSessions} session{mostRecentEpisode.totalSessions === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      {mostRecentEpisode.dischargeDate && (
                        <div className="text-xs text-[#525954]">
                          <span className="text-[#757C76] font-medium">Discharged: </span>
                          <span className="font-medium text-[#18201C]">
                            {formatClinicalDate(mostRecentEpisode.dischargeDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 px-4 text-center rounded-lg bg-[#F6F2EB] border border-[#E8E2D7] space-y-2">
                      <p className="text-sm font-semibold text-[#2D3530]">
                        No prior episodes documented.
                      </p>
                      <p className="text-xs text-[#636A64]">
                        Create an episode to begin documented care for this patient.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-[#EAE4DB] flex items-center justify-between">
                  {mostRecentEpisode && mostRecentCase ? (
                    <Button
                      id="overview-open-recent-case-btn"
                      variant="primary"
                      size="sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      onClick={() => onOpenCase(mostRecentCase)}
                    >
                      Open Episode
                    </Button>
                  ) : (
                    <Button
                      id="overview-create-case-btn"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => openNewCaseModal(patient)}
                    >
                      + New Case
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setLongitudinalTab('episodes')}
                    className="text-xs font-medium text-[#525954] hover:text-[#18201C] cursor-pointer"
                  >
                    View all episodes ({totalEpisodesCount}) →
                  </button>
                </div>
              </div>

              {/* Card B: Documented Safety Context Snapshot */}
              <div
                id="overview-safety-snapshot"
                className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4DB]">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#8C3B2B]" />
                      <h3 className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
                        Documented Safety Context
                      </h3>
                    </div>
                    {safetyAlerts.verifiedCount > 0 && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                        {safetyAlerts.verifiedCount} verified
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* Allergies */}
                    <div className="flex items-start justify-between gap-2 py-1 border-b border-[#F0EBE1]">
                      <span className="text-[#636A64] font-medium shrink-0">Allergies:</span>
                      <div className="text-right">
                        {safetyAlerts.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-end">
                            {safetyAlerts.allergies.map((alg) => (
                              <span
                                key={alg.id}
                                className="px-2 py-0.5 rounded text-[11px] bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]"
                              >
                                {alg.allergen}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#757C76] italic">No allergies recorded.</span>
                        )}
                      </div>
                    </div>

                    {/* Persistent Precautions */}
                    <div className="flex items-start justify-between gap-2 py-1 border-b border-[#F0EBE1]">
                      <span className="text-[#636A64] font-medium shrink-0">Persistent Precautions:</span>
                      <div className="text-right">
                        {safetyAlerts.persistentPrecautions.length > 0 ? (
                          <div className="space-y-0.5">
                            {safetyAlerts.persistentPrecautions.map((prc) => (
                              <p key={prc.id} className="text-[#18201C] font-medium">
                                {prc.precaution}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#757C76] italic">No persistent precautions recorded.</span>
                        )}
                      </div>
                    </div>

                    {/* Surgical History */}
                    <div className="flex items-start justify-between gap-2 py-1 border-b border-[#F0EBE1]">
                      <span className="text-[#636A64] font-medium shrink-0">Surgical History:</span>
                      <div className="text-right">
                        {safetyAlerts.surgicalHistory.length > 0 ? (
                          <div className="space-y-0.5">
                            {safetyAlerts.surgicalHistory.map((srg) => (
                              <p key={srg.id} className="text-[#18201C] font-medium">
                                {srg.procedure} ({srg.approximateDateOrYear})
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#757C76] italic">No surgical history recorded.</span>
                        )}
                      </div>
                    </div>

                    {/* Persistent Medical Conditions */}
                    <div className="flex items-start justify-between gap-2 py-1 border-b border-[#F0EBE1]">
                      <span className="text-[#636A64] font-medium shrink-0">Persistent Medical Conditions:</span>
                      <div className="text-right">
                        {safetyAlerts.persistentMedicalConditions.length > 0 ? (
                          <div className="space-y-0.5">
                            {safetyAlerts.persistentMedicalConditions.map((cnd) => (
                              <p key={cnd.id} className="text-[#18201C] font-medium">
                                {cnd.conditionName}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#757C76] italic">No persistent medical conditions recorded.</span>
                        )}
                      </div>
                    </div>

                    {/* Enduring Mobility Context */}
                    <div className="flex items-start justify-between gap-2 py-1">
                      <span className="text-[#636A64] font-medium shrink-0">Enduring Mobility:</span>
                      <div className="text-right">
                        {safetyAlerts.mobilityContext?.baselineMobilityStatus ? (
                          <p className="text-[#18201C] font-medium">
                            {safetyAlerts.mobilityContext.baselineMobilityStatus}
                          </p>
                        ) : (
                          <span className="text-[#757C76] italic">No enduring mobility context recorded.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-[#EAE4DB] flex items-center justify-between">
                  <button
                    id="overview-manage-safety-btn"
                    type="button"
                    onClick={() => {
                      setSafetyModalTab('allergies');
                      setIsSafetyModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3B2B] hover:text-[#12271D] cursor-pointer"
                  >
                    <span>Manage Safety Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-[#757C76]">
                    {safetyAlerts.totalAlertCount === 0
                      ? 'No persistent safety information recorded.'
                      : `${safetyAlerts.totalAlertCount} item${safetyAlerts.totalAlertCount === 1 ? '' : 's'} on record`}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Recent Clinical Activity Panel */}
            <div
              id="overview-recent-activity"
              className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE4DB]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1B3B2B]" />
                  <h3 className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
                    Recent Clinical Activity
                  </h3>
                </div>
                {timeline.length > 0 && (
                  <button
                    id="overview-view-all-timeline-btn"
                    type="button"
                    onClick={() => setLongitudinalTab('timeline')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B3B2B] hover:text-[#12271D] cursor-pointer group"
                  >
                    <span>View Full Timeline ({timeline.length})</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>

              {timeline.length > 0 ? (
                <div className="space-y-3">
                  {timeline.slice(0, 4).map((event) => {
                    const originatingCase = event.caseId
                      ? cases.find((c) => c.id === event.caseId || c.caseId === event.caseId)
                      : null;

                    return (
                      <div
                        key={event.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-[#FFFFFF] border border-[#E8E2D7] text-xs hover:border-[#CCD5CE] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#1B3B2B] shrink-0 mt-1.5" />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[#18201C]">
                                {event.title}
                              </span>
                              {event.caseName && (
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#F4EFE8] text-[#555C57] border border-[#E5DFD4]">
                                  {event.caseName}
                                </span>
                              )}
                            </div>
                            <p className="text-[#525954] text-xs leading-relaxed">
                              {event.summary}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 sm:pl-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#F4EFE8]">
                          <span className="text-[11px] font-mono text-[#757C76]">
                            {formatClinicalDate(event.timestamp)}
                          </span>
                          {originatingCase && (
                            <button
                              type="button"
                              onClick={() => onOpenCase(originatingCase, event.navigationTarget?.sectionId)}
                              className="text-[11px] font-semibold text-[#1B3B2B] hover:underline cursor-pointer"
                              aria-label={`Open case ${originatingCase.caseName} for ${event.title}`}
                            >
                              Open Case →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  id="overview-timeline-empty"
                  className="py-6 px-4 text-center rounded-lg bg-[#F6F2EB] border border-[#E8E2D7] text-xs text-[#636A64]"
                >
                  No timeline events available.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Episodes of Care (Stage 10C-A Locked) */}
        {longitudinalTab === 'episodes' && (
          <PatientCaseHistory
            patient={currentPatient}
            activeCases={longitudinalActiveCases}
            closedCases={longitudinalClosedCases}
            archivedCases={longitudinalArchivedCases}
            onOpenCase={onOpenCase}
            onNewCase={() => openNewCaseModal(currentPatient)}
          />
        )}

        {/* Tab 2: Longitudinal Clinical Timeline (Stage 10C-B1) */}
        {longitudinalTab === 'timeline' && (
          <div className="bg-[#F8F5F0] border border-[#E6E0D5] rounded-xl p-5 sm:p-6 shadow-xs">
            <PatientTimelineView
              patient={currentPatient}
              timeline={timeline}
              onOpenCase={onOpenCase}
            />
          </div>
        )}

        {/* Tab 3: Cumulative Problem History (Stage 10C-B2) */}
        {longitudinalTab === 'problems' && (
          <div className="bg-[#FAF8F5] border border-[#E6E0D5] rounded-xl p-5 sm:p-6 shadow-xs">
            <CumulativeProblemHistory
              patient={currentPatient}
              problems={cumulativeProblems}
              onOpenCase={onOpenCase}
            />
          </div>
        )}

        {/* Tab 4: Cross-Episode Outcomes & Trajectories (Stage 10C-C) */}
        {longitudinalTab === 'outcomes' && (
          <div className="bg-[#FAF8F5] border border-[#E6E0D5] rounded-xl p-5 sm:p-6 shadow-xs">
            <CrossEpisodeOutcomesView
              patient={currentPatient}
              outcomeSeries={outcomeSeries}
              onOpenCase={onOpenCase}
            />
          </div>
        )}
      </div>

      {/* 5. Patient Information: Visually secondary per Section 4 */}
      <div
        id="patient-demographic-section"
        className="bg-[#F8F5F0] border border-[#E6E0D5] rounded-xl p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE4DB]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#555C57]" />
            <h2 className="text-xs font-semibold text-[#555C57] uppercase tracking-wider">
              Patient Information (Demographics & Registration)
            </h2>
          </div>
          <Button
            id="hub-edit-patient-btn"
            variant="secondary"
            size="sm"
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => openEditPatientModal(patient)}
          >
            Edit Patient
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[#757C76] font-medium">Date of Birth / Age</span>
            <p className="font-medium text-[#18201C]">
              {formatClinicalDate(patient.dateOfBirth)} {ageText && `(${ageText})`}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[#757C76] font-medium">Biological / Clinical Sex</span>
            <p className="font-medium text-[#18201C]">{patient.sex || 'Not specified'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[#757C76] font-medium">Contact Phone</span>
            <p className="font-medium text-[#18201C] flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-[#757C76]" />
              {patient.phone || 'None provided'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[#757C76] font-medium">Email Address</span>
            <p className="font-medium text-[#18201C] flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 text-[#757C76]" />
              {patient.email || 'None provided'}
            </p>
          </div>
        </div>

        {currentPatient.reasonForVisit && (
          <div className="pt-3 border-t border-[#EAE4DB] text-xs space-y-1">
            <span className="text-[#757C76] font-medium">Initial Intake Complaint / Registration Reason</span>
            <p className="text-[#323934] leading-relaxed italic bg-[#FFFFFF]/60 p-2.5 rounded-lg border border-[#EDE7DE]">
              &ldquo;{currentPatient.reasonForVisit}&rdquo;
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 text-[11px] text-[#7A817B]">
          <span>Patient ID: {currentPatient.patientNumber || 'PC-0001'}</span>
          <span>Registered: {formatClinicalDate(currentPatient.createdAt)}</span>
        </div>
      </div>

      {/* Edit Patient Safety Profile Modal */}
      <EditPatientSafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        patient={currentPatient}
        initialTab={safetyModalTab}
      />

      {/* Longitudinal Patient Summary Report Modal (Stage 11B) */}
      <LongitudinalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        patient={currentPatient}
        dataset={dataset}
        settings={settings}
      />
    </div>
  );
};
