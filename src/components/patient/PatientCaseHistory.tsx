import React, { useState } from 'react';
import {
  FolderKanban,
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  Stethoscope,
  CheckCircle2,
  Archive,
  Target,
  FileText,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { Patient, Case, HistoricalCaseSummary } from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { Button } from '../common/Button';
import { formatClinicalDate } from '../../utils/clinicalFormatters';
import { formatArchiveReasonLabel } from '../modals/ArchiveCaseModal';

interface PatientCaseHistoryProps {
  patient: Patient;
  activeCases: HistoricalCaseSummary[];
  closedCases: HistoricalCaseSummary[];
  archivedCases?: HistoricalCaseSummary[];
  onOpenCase: (caseItem: Case) => void;
  onNewCase: () => void;
}

export const PatientCaseHistory: React.FC<PatientCaseHistoryProps> = ({
  patient,
  activeCases,
  closedCases,
  archivedCases = [],
  onOpenCase,
  onNewCase,
}) => {
  const { cases, getSubjectiveAssessment, openSubjectiveAssessment } = useClinical();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'past' | 'archived'>('all');

  const totalEpisodes = activeCases.length + closedCases.length;

  // Helper to resolve the underlying Case object from cases state
  const findCaseObject = (summary: HistoricalCaseSummary): Case | undefined => {
    return cases.find((c) => c.id === summary.caseId || c.caseId === summary.caseId || c.id === summary.displayId);
  };

  const handleBeginAssessment = (c: Case) => {
    onOpenCase(c);
    openSubjectiveAssessment(c.id);
  };

  return (
    <div id="patient-case-history-root" className="space-y-4">
      {/* 1. Header & Navigation Foundation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E2D9]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EBF2EE] text-[#1B3B2B] flex items-center justify-center border border-[#D5E2DA]">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#18201C] tracking-tight">
                Episode History
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                {totalEpisodes} episode{totalEpisodes === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-[#636A64]">
              Longitudinal episodes of care for {patient.fullName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Longitudinal view filter tabs */}
          <div
            role="tablist"
            aria-label="Filter case episodes"
            className="inline-flex p-0.5 rounded-lg bg-[#EFEAE2] border border-[#DFD8CC] text-xs"
          >
            <button
              id="filter-all-episodes-btn"
              role="tab"
              type="button"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-[#18201C] shadow-2xs font-semibold'
                  : 'text-[#636A64] hover:text-[#18201C]'
              }`}
            >
              All ({totalEpisodes})
            </button>
            <button
              id="filter-active-cases-btn"
              role="tab"
              type="button"
              aria-selected={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-[#1B3B2B] shadow-2xs font-semibold'
                  : 'text-[#636A64] hover:text-[#18201C]'
              }`}
            >
              Active ({activeCases.length})
            </button>
            <button
              id="filter-past-cases-btn"
              role="tab"
              type="button"
              aria-selected={activeTab === 'past'}
              onClick={() => setActiveTab('past')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'past'
                  ? 'bg-white text-[#525954] shadow-2xs font-semibold'
                  : 'text-[#636A64] hover:text-[#18201C]'
              }`}
            >
              Past ({closedCases.length})
            </button>
            {archivedCases.length > 0 && (
              <button
                id="filter-archived-cases-btn"
                role="tab"
                type="button"
                aria-selected={activeTab === 'archived'}
                onClick={() => setActiveTab('archived')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'archived'
                    ? 'bg-white text-[#6B4B3E] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Archived ({archivedCases.length})
              </button>
            )}
          </div>

          <Button
            id="case-history-new-case-btn"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={onNewCase}
          >
            + New Case
          </Button>
        </div>
      </div>

      {/* 2. Total Empty State: If no cases at all on record */}
      {totalEpisodes === 0 && (
        <div
          id="case-history-total-empty"
          className="p-8 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-center space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EDE7DE] text-[#1B3B2B] flex items-center justify-center mx-auto">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#18201C]">
              No clinical cases recorded for this patient yet.
            </h3>
            <p className="text-xs text-[#636A64] max-w-md mx-auto leading-relaxed">
              A patient can have multiple independent episodes of care over time (e.g. Right Knee Pain, Low Back Pain). Create the first case to begin assessment and rehabilitation documentation.
            </p>
          </div>
          <Button
            id="empty-cases-create-case-btn"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={onNewCase}
          >
            + Create Case
          </Button>
        </div>
      )}

      {/* 3. Active Cases Section */}
      {totalEpisodes > 0 && (activeTab === 'all' || activeTab === 'active') && (
        <div id="section-active-cases" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1B3B2B]" />
              <h3 className="text-xs font-semibold text-[#18201C] uppercase tracking-wider">
                Active Cases ({activeCases.length})
              </h3>
            </div>
            {activeCases.length > 0 && (
              <span className="text-[11px] text-[#636A64]">
                Episodes currently in progress
              </span>
            )}
          </div>

          {activeCases.length === 0 ? (
            <div
              id="active-cases-empty-state"
              className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-center space-y-2"
            >
              <p className="text-xs font-semibold text-[#2D3530]">
                No active cases recorded.
              </p>
              <p className="text-[11px] text-[#636A64] max-w-sm mx-auto">
                No active episodes of care are currently underway for this patient. All previous episodes may have been discharged, or a new case can be opened.
              </p>
              <button
                id="active-empty-new-case-btn"
                type="button"
                onClick={onNewCase}
                className="text-xs font-medium text-[#1B3B2B] hover:text-[#0E2017] inline-flex items-center gap-1 cursor-pointer pt-1"
              >
                <Plus className="w-3 h-3" />
                <span>Open a new case</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCases.map((c) => {
                const caseObj = findCaseObject(c);
                const caseAssessment = caseObj ? getSubjectiveAssessment(caseObj.id) : null;
                const isCaseAssessmentCompleted = caseAssessment?.status === 'completed';
                const isCaseAssessmentInProgress = caseAssessment?.status === 'in_progress';

                return (
                  <div
                    key={c.caseId}
                    id={`active-case-card-${c.displayId}`}
                    className="bg-[#FAF8F5] border border-[#DCD6CA] hover:border-[#BFB7AA] rounded-xl p-4 sm:p-5 shadow-2xs transition-all duration-150 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-[#18201C] tracking-tight">
                            {c.caseName}
                          </h4>
                          <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                            {c.displayId}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                            {c.status}
                          </span>
                          {c.stage && (
                            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#F3EFE9] text-[#555C57] border border-[#E3DCD1]">
                              Stage: {c.stage}
                            </span>
                          )}
                          {isCaseAssessmentCompleted && (
                            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
                              Subjective: Completed
                            </span>
                          )}
                          {isCaseAssessmentInProgress && (
                            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB]">
                              Subjective: In Progress
                            </span>
                          )}
                        </div>

                        {/* Metadata row: dates, duration, sessions */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#636A64]">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#7A817B]" />
                            <span>Opened: {formatClinicalDate(c.startDate)}</span>
                          </span>
                          {c.durationWeeks !== undefined && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#7A817B]" />
                              <span>Duration: {c.durationWeeks} wk{c.durationWeeks === 1 ? '' : 's'}</span>
                            </span>
                          )}
                          <span>• {c.totalSessions} session{c.totalSessions === 1 ? '' : 's'}</span>
                          {c.referralSource && <span>• Ref: {c.referralSource}</span>}
                        </div>
                      </div>

                      {/* Navigation & Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                        {caseObj && (
                          <Button
                            id={`begin-assessment-${c.displayId}`}
                            variant="secondary"
                            size="sm"
                            leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                            onClick={() => handleBeginAssessment(caseObj)}
                          >
                            {isCaseAssessmentCompleted
                              ? 'Review Assessment'
                              : isCaseAssessmentInProgress
                              ? 'Continue Assessment'
                              : 'Begin Assessment'}
                          </Button>
                        )}
                        <Button
                          id={`open-case-${c.displayId}`}
                          variant="primary"
                          size="sm"
                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (caseObj) {
                              onOpenCase(caseObj);
                            }
                          }}
                        >
                          Open Case
                        </Button>
                      </div>
                    </div>

                    {/* Presenting Problem box if documented */}
                    {c.presentingProblem && (
                      <div className="p-2.5 rounded-lg bg-[#F5F1EB] border border-[#E6E0D6] text-xs text-[#3E4540]">
                        <span className="font-semibold text-[#222924] mr-1.5">Presenting problem:</span>
                        <span className="leading-relaxed">{c.presentingProblem}</span>
                      </div>
                    )}

                    {/* Problem and Goal counts if present */}
                    {(c.problemCounts.total > 0 || c.goalCounts.total > 0) && (
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#525954] border-t border-[#EDE7DC]">
                        {c.problemCounts.total > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-medium text-[#222924]">Problems:</span>
                            <span>{c.problemCounts.active} active</span>
                            {c.problemCounts.resolved > 0 && (
                              <span className="text-[#636A64]">({c.problemCounts.resolved} resolved)</span>
                            )}
                          </span>
                        )}
                        {c.goalCounts.total > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-medium text-[#222924]">Goals:</span>
                            <span>{c.goalCounts.active} active</span>
                            {c.goalCounts.met > 0 && (
                              <span className="text-[#1B3B2B] font-medium">({c.goalCounts.met} met)</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Past Cases Section */}
      {totalEpisodes > 0 && (activeTab === 'all' || activeTab === 'past') && (
        <div id="section-past-cases" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#555C57]" />
              <h3 className="text-xs font-semibold text-[#555C57] uppercase tracking-wider">
                Past Cases ({closedCases.length})
              </h3>
            </div>
            {closedCases.length > 0 && (
              <span className="text-[11px] text-[#636A64]">
                Discharged episodes of care
              </span>
            )}
          </div>

          {closedCases.length === 0 ? (
            <div
              id="past-cases-empty-state"
              className="p-5 rounded-xl bg-[#F7F4EE] border border-[#E3DDD2] text-center space-y-1.5"
            >
              <p className="text-xs font-semibold text-[#484F4A]">
                No past cases recorded.
              </p>
              <p className="text-[11px] text-[#6A726C] max-w-sm mx-auto">
                No previously discharged episodes of care exist in this patient&apos;s clinical record.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {closedCases.map((c) => {
                const caseObj = findCaseObject(c);

                return (
                  <div
                    key={c.caseId}
                    id={`past-case-card-${c.displayId}`}
                    className="bg-[#F8F5EE] border border-[#DFD9CE] hover:border-[#C9C2B5] rounded-xl p-4 sm:p-5 shadow-2xs transition-all duration-150 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-[#2D3530] tracking-tight">
                            {c.caseName}
                          </h4>
                          <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                            {c.displayId}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#EAE7DF] text-[#555C57] border border-[#DDD6CB]">
                            Discharged
                          </span>
                          {c.dischargeReason && (
                            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#E8EFEA] text-[#1B3B2B] border border-[#CFDFD4]">
                              {c.dischargeReason.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

                        {/* Metadata row: opened date, discharged date, duration, sessions */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#636A64]">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#7A817B]" />
                            <span>Opened: {formatClinicalDate(c.startDate)}</span>
                          </span>
                          {c.dischargeDate && (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#1B3B2B]" />
                              <span>Discharged: {formatClinicalDate(c.dischargeDate)}</span>
                            </span>
                          )}
                          {c.durationWeeks !== undefined && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#7A817B]" />
                              <span>Duration: {c.durationWeeks} wk{c.durationWeeks === 1 ? '' : 's'}</span>
                            </span>
                          )}
                          <span>• {c.totalSessions} session{c.totalSessions === 1 ? '' : 's'} delivered</span>
                        </div>
                      </div>

                      {/* Navigation: View Case */}
                      <div className="shrink-0 self-end sm:self-start">
                        <Button
                          id={`view-past-case-${c.displayId}`}
                          variant="secondary"
                          size="sm"
                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (caseObj) {
                              onOpenCase(caseObj);
                            }
                          }}
                        >
                          View Case
                        </Button>
                      </div>
                    </div>

                    {/* Presenting Problem if documented */}
                    {c.presentingProblem && (
                      <div className="p-2.5 rounded-lg bg-[#EFEAE1] border border-[#DFD8CC] text-xs text-[#484F4A]">
                        <span className="font-semibold text-[#2D3530] mr-1.5">Initial presentation:</span>
                        <span className="leading-relaxed">{c.presentingProblem}</span>
                      </div>
                    )}

                    {/* Clinical Status at Discharge summary */}
                    {c.dischargeStatusSummary && (
                      <div className="p-2.5 rounded-lg bg-[#EAEFEA] border border-[#D0DFD3] text-xs text-[#1B3B2B]">
                        <span className="font-semibold mr-1.5">Clinical status at discharge:</span>
                        <span className="leading-relaxed">{c.dischargeStatusSummary}</span>
                      </div>
                    )}

                    {/* Outcomes: problems resolved / goals met / primary outcomes */}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#555C57] border-t border-[#EAE4D9]">
                      {c.problemCounts.total > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium text-[#2D3530]">Problems:</span>
                          <span>
                            {c.problemCounts.resolved} resolved of {c.problemCounts.total} formulated
                          </span>
                        </span>
                      )}
                      {c.goalCounts.total > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium text-[#2D3530]">Goals:</span>
                          <span className="text-[#1B3B2B] font-medium">
                            {c.goalCounts.met} met of {c.goalCounts.total} targeted
                          </span>
                        </span>
                      )}
                      {c.primaryOutcomesSummary.length > 0 && (
                        <div className="inline-flex items-center gap-2">
                          <span className="font-medium text-[#2D3530]">Outcomes:</span>
                          {c.primaryOutcomesSummary.slice(0, 2).map((po, idx) => (
                            <span key={idx} className="text-[#555C57]">
                              {po.measureName}: {po.baselineScore ?? '—'} → {po.finalScore ?? '—'}{po.unit ? ` ${po.unit}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Archived Cases Section */}
      {archivedCases.length > 0 && (activeTab === 'all' || activeTab === 'archived') && (
        <div id="section-archived-cases" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#6B4B3E]" />
              <h3 className="text-xs font-semibold text-[#18201C] uppercase tracking-wider">
                Archived Cases ({archivedCases.length})
              </h3>
            </div>
            <span className="text-[11px] text-[#636A64]">
              Inactive, withdrawn, or administratively closed records
            </span>
          </div>

          <div className="space-y-3">
            {archivedCases.map((c) => {
              const caseObj = findCaseObject(c);
              return (
                <div
                  key={c.caseId}
                  id={`archived-case-card-${c.displayId}`}
                  className="bg-[#FAF8F5] border border-[#DDD6CB] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3 opacity-90 hover:opacity-100 transition-opacity"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-[#EAE5DC] text-[#4F5650] border border-[#DDD6CB]">
                          {c.displayId}
                        </span>
                        <h4 className="text-sm font-semibold text-[#18201C]">
                          {c.caseName}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#F4EFEB] text-[#6B4B3E] font-medium border border-[#DDD6CB]">
                          <Archive className="w-3 h-3" />
                          <span>Archived</span>
                        </span>
                        {c.archiveReason && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#555C56] border border-[#E3DDD2]">
                            {formatArchiveReasonLabel(c.archiveReason)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#636A64] pt-0.5">
                        <span>Opened: {formatClinicalDate(c.startDate)}</span>
                        {c.archivedAt && (
                          <span>• Archived: {formatClinicalDate(c.archivedAt)}</span>
                        )}
                        <span>• {c.totalSessions} session{c.totalSessions === 1 ? '' : 's'} recorded</span>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-start">
                      <Button
                        id={`view-archived-case-${c.displayId}`}
                        variant="secondary"
                        size="sm"
                        rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                        onClick={() => {
                          if (caseObj) {
                            onOpenCase(caseObj);
                          }
                        }}
                      >
                        View Record
                      </Button>
                    </div>
                  </div>

                  {c.archiveNotes && (
                    <div className="p-2.5 rounded-lg bg-[#F4EFEB] border border-[#DDD6CB] text-xs text-[#555C56] italic">
                      <span className="font-semibold text-[#2C332E] not-italic mr-1.5">Archive notes:</span>
                      &ldquo;{c.archiveNotes}&rdquo;
                    </div>
                  )}

                  {c.presentingProblem && (
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E8E2D8] text-xs text-[#636A64]">
                      <span className="font-semibold text-[#2C332E] mr-1.5">Presenting problem:</span>
                      <span>{c.presentingProblem}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
