import React, { useState, useMemo } from 'react';
import {
  Target,
  FolderKanban,
  Calendar,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';
import { Patient, Case, CumulativeProblemItem } from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { Button } from '../common/Button';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface CumulativeProblemHistoryProps {
  patient: Patient;
  problems: CumulativeProblemItem[];
  onOpenCase?: (caseItem: Case, sectionId?: string) => void;
}

type EpisodeFilter = 'all' | 'active_episodes' | 'previous_episodes';

export const CumulativeProblemHistory: React.FC<CumulativeProblemHistoryProps> = ({
  patient,
  problems,
  onOpenCase,
}) => {
  const { cases } = useClinical();
  const [filter, setFilter] = useState<EpisodeFilter>('all');

  // Filter problems by originating episode status
  const filteredProblems = useMemo(() => {
    if (filter === 'active_episodes') {
      return problems.filter((p) => !p.isFromClosedCase);
    }
    if (filter === 'previous_episodes') {
      return problems.filter((p) => p.isFromClosedCase);
    }
    return problems;
  }, [problems, filter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let activeEpisodeCount = 0;
    let previousEpisodeCount = 0;
    for (const p of problems) {
      if (p.isFromClosedCase) {
        previousEpisodeCount++;
      } else {
        activeEpisodeCount++;
      }
    }
    return { activeEpisodeCount, previousEpisodeCount };
  }, [problems]);

  // Resolve authoritative Case object
  const findCaseObject = (caseId: string): Case | undefined => {
    return cases.find((c) => c.id === caseId || c.caseId === caseId);
  };

  const handleNavigateToCase = (item: CumulativeProblemItem) => {
    if (!onOpenCase) return;
    const targetCase = findCaseObject(item.originatingCaseId);
    if (targetCase) {
      // Focus on the clinical reasoning / problems section in the case workspace
      onOpenCase(targetCase, 'reasoning');
    }
  };

  // Format source documented status verbatim from ClinicalProblem
  const getSourceStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Source Status: Active',
          classes: 'bg-[#F7F2E8] text-[#5C4517] border-[#E8DCBF]',
        };
      case 'resolved':
        return {
          label: 'Source Status: Resolved',
          classes: 'bg-[#EDF2EE] text-[#224A32] border-[#D3E0D6]',
        };
      case 'addressed':
        return {
          label: 'Source Status: Addressed',
          classes: 'bg-[#EBF2EE] text-[#1B3B2B] border-[#D5E2DA]',
        };
      case 'inactive':
        return {
          label: 'Source Status: Inactive',
          classes: 'bg-[#EAE5DC] text-[#4F5752] border-[#DDD6CB]',
        };
      default:
        return null;
    }
  };

  return (
    <div id="cumulative-problem-history-root" className="space-y-4">
      {/* 1. Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E2D9]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F7F2E8] text-[#5C4517] flex items-center justify-center border border-[#E8DCBF]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#18201C] tracking-tight">
                Cumulative Problem History
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                {problems.length} documented problem{problems.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-[#636A64]">
              Longitudinal record of clinical problems formulated during episodes of care for {patient.fullName}
            </p>
          </div>
        </div>

        {/* Episode Status Filter Tabs */}
        {problems.length > 0 && (
          <div
            role="tablist"
            aria-label="Filter documented problems by episode status"
            className="flex items-center gap-1.5 p-1 rounded-lg bg-[#EFEAE2] border border-[#DFD8CC] text-xs"
          >
            <button
              id="problem-filter-all"
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-[#18201C] shadow-2xs font-semibold'
                  : 'text-[#636A64] hover:text-[#18201C]'
              }`}
            >
              All ({problems.length})
            </button>
            {counts.activeEpisodeCount > 0 && (
              <button
                id="problem-filter-active-episodes"
                type="button"
                role="tab"
                aria-selected={filter === 'active_episodes'}
                onClick={() => setFilter('active_episodes')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  filter === 'active_episodes'
                    ? 'bg-white text-[#1B3B2B] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Active Episode ({counts.activeEpisodeCount})
              </button>
            )}
            {counts.previousEpisodeCount > 0 && (
              <button
                id="problem-filter-previous-episodes"
                type="button"
                role="tab"
                aria-selected={filter === 'previous_episodes'}
                onClick={() => setFilter('previous_episodes')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  filter === 'previous_episodes'
                    ? 'bg-white text-[#4F5752] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Previous Episodes ({counts.previousEpisodeCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Total Empty State: Honest clinical absence messaging */}
      {problems.length === 0 && (
        <div
          id="cumulative-problems-total-empty"
          className="p-8 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-center space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EDE7DE] text-[#555C57] flex items-center justify-center mx-auto">
            <Target className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#18201C]">
              No clinical problems have been documented across this patient's episodes of care.
            </h3>
            <p className="text-xs text-[#636A64] max-w-md mx-auto leading-relaxed">
              Clinical problems formulated during physical examination and diagnostic reasoning within care episodes will appear here in chronological order with complete case provenance.
            </p>
          </div>
        </div>
      )}

      {/* 3. Filter Empty State: Problems exist but none match selected filter */}
      {problems.length > 0 && filteredProblems.length === 0 && (
        <div
          id="cumulative-problems-filter-empty"
          className="p-6 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-center space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-[#EDE7DE] text-[#555C57] flex items-center justify-center mx-auto">
            <Filter className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-[#2D3530]">
            No documented problems match the selected episode filter.
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="text-xs text-[#1B3B2B] hover:underline font-medium cursor-pointer"
          >
            Clear filter to view all {problems.length} documented problem{problems.length === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {/* 4. Documented Problem List */}
      {filteredProblems.length > 0 && (
        <div className="space-y-3">
          {filteredProblems.map((item) => {
            const targetCase = findCaseObject(item.originatingCaseId);
            const sourceStatusBadge = getSourceStatusBadge(item.sourceStatus);

            return (
              <div
                key={item.id}
                id={`problem-card-${item.id}`}
                className="bg-[#FAF8F5] border border-[#DCD6CA] hover:border-[#BFB7AA] rounded-xl p-4 shadow-2xs space-y-3 transition-colors border-l-4 border-l-[#8A6A29]"
              >
                {/* Header Row: Problem Title & Provenance Badges */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#18201C] tracking-tight">
                        {item.problemStatement}
                      </h3>

                      {/* Episode Context (Derived purely from case status) */}
                      {!item.isFromClosedCase ? (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                          Documented in active case
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EAE5DC] text-[#4F5752] border border-[#DDD6CB]">
                          Documented in previous case
                        </span>
                      )}

                      {/* Source-documented status (verbatim from ClinicalProblem.status) */}
                      {sourceStatusBadge && (
                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${sourceStatusBadge.classes}`}
                        >
                          {sourceStatusBadge.label}
                        </span>
                      )}

                      {/* Problem Record ID Provenance Tag */}
                      <span
                        title={`Authoritative Problem ID: ${item.problemId}`}
                        className="px-1.5 py-0.5 text-[10px] font-mono text-[#757C76] bg-[#F1EDE6] border border-[#DFD8CC] rounded"
                      >
                        ID: {item.problemId}
                      </span>
                    </div>

                    {/* Originating Episode Identification */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#636A64] pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-[#7A817B]" />
                        <span className="text-[#3E4540]">
                          Episode:{' '}
                          <span className="font-medium text-[#18201C]">
                            {item.originatingCaseName}
                          </span>
                          {item.originatingCaseDisplayId && item.originatingCaseDisplayId !== item.originatingCaseName && (
                            <span className="text-[#757C76] font-mono ml-1">
                              ({item.originatingCaseDisplayId})
                            </span>
                          )}
                        </span>
                      </div>

                      {item.formulatedDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#7A817B]" />
                          <span>
                            Documented:{' '}
                            <span className="font-medium text-[#222924]">
                              {formatClinicalDate(item.formulatedDate)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation to Case Workspace */}
                  {targetCase && onOpenCase && (
                    <Button
                      id={`problem-nav-${item.id}`}
                      variant="secondary"
                      size="xs"
                      rightIcon={<ChevronRight className="w-3 h-3" />}
                      onClick={() => handleNavigateToCase(item)}
                      className="shrink-0 self-start"
                    >
                      View Case
                    </Button>
                  )}
                </div>

                {/* Therapist Notes / Narrative Description */}
                {item.therapistNotes && (
                  <p className="text-xs text-[#3E4540] leading-relaxed bg-[#F3EFE8] border border-[#E4DDD0] rounded-lg p-2.5">
                    {item.therapistNotes}
                  </p>
                )}

                {/* Evidence Linkage Details */}
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#EDE7DC] text-[11px] text-[#7A817B]">
                  <span>
                    Linked findings:{' '}
                    <span className="font-medium text-[#484F4A]">
                      {item.linkedFindingCount}
                    </span>
                  </span>
                  {item.linkedInvestigationCount > 0 && (
                    <span>
                      Linked investigations:{' '}
                      <span className="font-medium text-[#484F4A]">
                        {item.linkedInvestigationCount}
                      </span>
                    </span>
                  )}
                  <span className="text-[#969D98]">
                    Source entity: <span className="font-mono">ClinicalProblem</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
