import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Search,
  ChevronRight,
  User,
  CalendarClock,
  ClockAlert,
  FileCheck2,
  AlertCircle,
  Filter,
  Archive,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { FilterPill } from '../components/common/FilterPill';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { ClinicalEmptyState } from '../components/common/ClinicalEmptyState';
import { useClinical } from '../context/ClinicalContext';
import { useCaseloadGovernance } from '../utils/useCaseloadGovernance';
import { CaseStatus } from '../types';
import { formatClinicalDate } from '../utils/clinicalFormatters';
import { formatArchiveReasonLabel } from '../components/modals/ArchiveCaseModal';

export type ExtendedCaseFilter =
  | 'all'
  | CaseStatus
  | 'reviews_due'
  | 'stalled'
  | 'doc_gaps'
  | 'archived';

interface CasesViewProps {
  initialFilter?: ExtendedCaseFilter;
  onNavigateToSection?: (caseId: string, patientId: string, section?: string) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({
  initialFilter,
  onNavigateToSection,
}) => {
  const {
    cases,
    patients,
    setIsAddPatientModalOpen,
    setSelectedPatientId,
    setSelectedCaseId,
  } = useClinical();

  const {
    governance,
  } = useCaseloadGovernance();

  const [activeFilter, setActiveFilter] = useState<ExtendedCaseFilter>(
    initialFilter || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Map of patientId -> patient
  const patientMap = useMemo(() => {
    const map = new Map<string, typeof patients[0]>();
    for (const p of patients) {
      map.set(p.id, p);
    }
    return map;
  }, [patients]);

  // Map of caseId -> CaseGovernanceSummary
  const governanceMap = useMemo(() => {
    const map = new Map<string, (typeof governance.caseSummaries)[0]>();
    for (const s of governance.caseSummaries) {
      map.set(s.caseId, s);
    }
    return map;
  }, [governance.caseSummaries]);

  // Primary Clinical Stage Filters
  const stageFilterOptions = [
    {
      value: 'all' as ExtendedCaseFilter,
      label: 'All Active',
      count: cases.filter((c) => !c.isArchived).length,
    },
    {
      value: 'Assessment' as ExtendedCaseFilter,
      label: 'Assessment',
      count: cases.filter(
        (c) => !c.isArchived && (c.status === 'Assessment' || c.stage === 'assessment')
      ).length,
    },
    {
      value: 'Treatment' as ExtendedCaseFilter,
      label: 'Treatment',
      count: cases.filter(
        (c) => !c.isArchived && (c.status === 'Treatment' || c.stage === 'treatment')
      ).length,
    },
    {
      value: 'Reassessment' as ExtendedCaseFilter,
      label: 'Reassessment',
      count: cases.filter(
        (c) => !c.isArchived && (c.status === 'Reassessment' || c.stage === 'reassessment')
      ).length,
    },
    {
      value: 'Discharged' as ExtendedCaseFilter,
      label: 'Discharged',
      count: cases.filter(
        (c) => !c.isArchived && (c.status === 'Discharged' || c.stage === 'discharged')
      ).length,
    },
    {
      value: 'archived' as ExtendedCaseFilter,
      label: 'Archived',
      count: cases.filter((c) => Boolean(c.isArchived)).length,
    },
  ];

  // Governance Signal Filter Pills
  const governanceFilterOptions = [
    {
      value: 'reviews_due' as ExtendedCaseFilter,
      label: 'Reviews Due',
      count: governance.reviewsDueCount,
    },
    {
      value: 'stalled' as ExtendedCaseFilter,
      label: 'Stalled Episodes',
      count: governance.stalledCasesCount,
    },
    {
      value: 'doc_gaps' as ExtendedCaseFilter,
      label: 'Documentation Gaps',
      count: governance.documentationGapsCount,
    },
  ];

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const gov = governanceMap.get(c.id);

      let matchesFilter = false;
      if (activeFilter === 'archived') {
        matchesFilter = Boolean(c.isArchived);
      } else if (c.isArchived) {
        // Exclude archived cases from all active clinical filter views
        matchesFilter = false;
      } else if (activeFilter === 'all') {
        matchesFilter = true;
      } else if (
        activeFilter === 'Assessment' ||
        activeFilter === 'Treatment' ||
        activeFilter === 'Reassessment' ||
        activeFilter === 'Discharged'
      ) {
        matchesFilter =
          c.status === activeFilter ||
          (c.stage && c.stage.toLowerCase() === activeFilter.toLowerCase());
      } else if (activeFilter === 'reviews_due') {
        matchesFilter = Boolean(
          gov &&
            !gov.isDischarged &&
            !gov.isArchived &&
            (gov.reviewStatus === 'overdue' ||
              gov.reviewStatus === 'due' ||
              gov.reviewStatus === 'due_soon')
        );
      } else if (activeFilter === 'stalled') {
        matchesFilter = Boolean(
          gov && !gov.isDischarged && !gov.isArchived && gov.activityStatus === 'stalled'
        );
      } else if (activeFilter === 'doc_gaps') {
        matchesFilter = Boolean(
          gov &&
            !gov.isDischarged &&
            !gov.isArchived &&
            (gov.documentationStatus === 'missing_documentation' ||
              gov.documentationStatus === 'partially_documented')
        );
      }

      const patient = patientMap.get(c.patientId);
      const patientName = patient ? patient.fullName.toLowerCase() : '';
      const patientNumber = patient?.patientNumber?.toLowerCase() || '';
      const caseName = (c.caseName || c.title || '').toLowerCase();
      const caseId = (c.caseId || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !query ||
        caseName.includes(query) ||
        caseId.includes(query) ||
        patientName.includes(query) ||
        patientNumber.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [cases, activeFilter, searchQuery, patientMap, governanceMap]);

  const handleOpenCase = (c: typeof cases[0], targetSection?: string) => {
    if (onNavigateToSection) {
      onNavigateToSection(c.id, c.patientId, targetSection);
    } else {
      setSelectedPatientId(c.patientId);
      setSelectedCaseId(c.id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title="Cases & Caseload Governance"
        supportingText="Follow each patient's rehabilitation journey, monitor review intervals, and identify documentation needs across your practice."
      />

      {/* Filter and Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
          <div className="w-full sm:max-w-sm">
            <Input
              id="search-cases-input"
              type="search"
              placeholder="Search by case name, CASE-ID, or patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Stage Filter Options */}
          <FilterPill<ExtendedCaseFilter>
            idPrefix="cases-stage"
            options={stageFilterOptions}
            activeValue={activeFilter}
            onChange={setActiveFilter}
          />
        </div>

        {/* Operational Governance Signals Sub-bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EDE7DE]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5A615C] flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#6B726C]" />
            <span>Governance Signals:</span>
          </span>

          {governanceFilterOptions.map((opt) => {
            const isActive = activeFilter === opt.value;
            return (
              <button
                key={opt.value}
                id={`gov-filter-${opt.value}`}
                type="button"
                onClick={() => setActiveFilter(isActive ? 'all' : opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'bg-[#F2EDE4] text-[#404742] hover:bg-[#EAE4DC] border border-[#DDD6CB]'
                }`}
              >
                {opt.value === 'reviews_due' && <CalendarClock className="w-3 h-3" />}
                {opt.value === 'stalled' && <ClockAlert className="w-3 h-3" />}
                {opt.value === 'doc_gaps' && <FileCheck2 className="w-3 h-3" />}
                <span>{opt.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-[#2E543E] text-white' : 'bg-[#E2DDD2] text-[#343B36]'
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {cases.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl py-14 px-6 shadow-xs">
          <ClinicalEmptyState
            id="cases-empty-workspace"
            icon={<FolderKanban className="w-6 h-6 text-[#1B3B2B]" />}
            title="No cases have been created yet."
            supportingText="Each rehabilitation episode progresses through assessment, clinical reasoning, targeted treatment, and reassessment. Start by registering a patient."
            primaryActionLabel="Add patient to start a case"
            onPrimaryAction={() => setIsAddPatientModalOpen(true)}
            note="Cases track specific clinical episodes rather than general paperwork, keeping the patient's journey front and center."
          />
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl py-12 px-6 shadow-xs">
          <ClinicalEmptyState
            id="cases-no-search-results"
            icon={<Search className="w-6 h-6 text-[#1B3B2B]" />}
            title="No cases match your filter."
            supportingText={
              searchQuery
                ? `No case records found matching "${searchQuery}". Clear your search term to see all cases.`
                : `No active cases currently match the selected governance filter.`
            }
            primaryActionLabel="Reset filters"
            onPrimaryAction={() => {
              setActiveFilter('all');
              setSearchQuery('');
            }}
          />
        </div>
      ) : (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-[#E8E2D9] bg-[#F7F4EE] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
              {filteredCases.length} Episode{filteredCases.length === 1 ? '' : 's'} displayed
            </span>
            <span className="text-xs text-[#6B726C]">
              Click any case row or action badge to navigate directly
            </span>
          </div>

          <div className="divide-y divide-[#EDE7DE]">
            {filteredCases.map((c) => {
              const patient = patientMap.get(c.patientId);
              const gov = governanceMap.get(c.id);

              return (
                <div
                  key={c.id}
                  id={`cases-row-${c.caseId}`}
                  onClick={() => handleOpenCase(c)}
                  className="p-5 hover:bg-[#F7F3EB] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-semibold text-[#18201C] group-hover:text-[#1B3B2B] transition-colors">
                        {c.caseName || c.title}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                        {c.caseId}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                        {c.status}
                      </span>
                      {c.isArchived && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#F4EFEB] text-[#6B4B3E] border border-[#DDD6CB]">
                          <Archive className="w-3 h-3" />
                          <span>Archived</span>
                        </span>
                      )}
                      {c.isArchived && c.archiveReason && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#555C56] border border-[#E3DDD2]">
                          {formatArchiveReasonLabel(c.archiveReason)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#525954]">
                      {patient && (
                        <span className="font-medium text-[#2E3530] flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#636A64]" />
                          {patient.fullName} ({patient.patientNumber || 'PC-0001'})
                        </span>
                      )}
                      <span>•</span>
                      <span>Started: {formatClinicalDate(c.startDate)}</span>
                      {c.referralSource && (
                        <>
                          <span>•</span>
                          <span>Ref: {c.referralSource}</span>
                        </>
                      )}
                    </div>

                    {c.presentingProblem && (
                      <p className="text-xs text-[#6B726C] italic truncate max-w-xl">
                        {c.presentingProblem}
                      </p>
                    )}

                    {/* Governance Summary Badges inline */}
                    {gov && !gov.isDischarged && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Review Status */}
                        {gov.reviewStatus === 'overdue' && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCase(c, 'progress');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#FDEEED] text-[#C93B2B] border border-[#F5C7C3] hover:bg-[#FBDCDA]"
                          >
                            <CalendarClock className="w-3 h-3" />
                            <span>Review Overdue</span>
                          </span>
                        )}
                        {gov.reviewStatus === 'due_soon' && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCase(c, 'progress');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#FEF6EC] text-[#8C5E1A] border border-[#F3DEC3] hover:bg-[#FCEFD9]"
                          >
                            <CalendarClock className="w-3 h-3" />
                            <span>Review Due Soon</span>
                          </span>
                        )}

                        {/* Stalled Status */}
                        {gov.activityStatus === 'stalled' && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCase(c, 'sessions');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#FFF9E6] text-[#7A5B0B] border border-[#F7E7A8] hover:bg-[#FDF4CF]"
                          >
                            <ClockAlert className="w-3 h-3" />
                            <span>Stalled ({gov.daysSinceClinicalActivity}d)</span>
                          </span>
                        )}

                        {/* Missing items badges */}
                        {gov.missingItems.slice(0, 2).map((m) => (
                          <span
                            key={m.item}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCase(c, m.targetSection);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB] hover:bg-[#EAE4DC]"
                          >
                            <AlertCircle className="w-3 h-3 text-[#7B827C]" />
                            <span>Missing {m.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      id={`open-case-btn-${c.caseId}`}
                      variant="secondary"
                      size="sm"
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCase(c);
                      }}
                    >
                      Open Case
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
