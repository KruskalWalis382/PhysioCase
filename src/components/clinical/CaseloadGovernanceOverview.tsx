import React from 'react';
import {
  CalendarClock,
  ClockAlert,
  FileCheck2,
  FolderKanban,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  CaseloadGovernanceSummary,
  CaseGovernanceSummary,
} from '../../utils/clinicalGovernance';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface CaseloadGovernanceOverviewProps {
  governance: CaseloadGovernanceSummary;
  onOpenCase: (caseId: string, patientId: string, targetSection?: string) => void;
  onViewAllCases: (filter?: string) => void;
}

export const CaseloadGovernanceOverview: React.FC<CaseloadGovernanceOverviewProps> = ({
  governance,
  onOpenCase,
  onViewAllCases,
}) => {
  const {
    activeCasesCount,
    reviewsDueCount,
    reviewsOverdueCount,
    stalledCasesCount,
    documentationGapsCount,
    stageDistribution,
    caseSummaries,
  } = governance;

  // Active cases sorted by urgency: Overdue review > Stalled > Documentation gaps > Normal
  const prioritizedCases = React.useMemo(() => {
    return caseSummaries
      .filter((c) => !c.isDischarged)
      .sort((a, b) => {
        // 1. Overdue reviews first
        if (a.reviewStatus === 'overdue' && b.reviewStatus !== 'overdue') return -1;
        if (b.reviewStatus === 'overdue' && a.reviewStatus !== 'overdue') return 1;

        // 2. Stalled cases next
        if (a.activityStatus === 'stalled' && b.activityStatus !== 'stalled') return -1;
        if (b.activityStatus === 'stalled' && a.activityStatus !== 'stalled') return 1;

        // 3. Documentation gaps
        if (
          a.documentationStatus === 'missing_documentation' &&
          b.documentationStatus !== 'missing_documentation'
        )
          return -1;
        if (
          b.documentationStatus === 'missing_documentation' &&
          a.documentationStatus !== 'missing_documentation'
        )
          return 1;

        // 4. Due soon
        if (a.reviewStatus === 'due_soon' && b.reviewStatus !== 'due_soon') return -1;
        if (b.reviewStatus === 'due_soon' && a.reviewStatus !== 'due_soon') return 1;

        return 0;
      })
      .slice(0, 5); // Concise top actionable rows
  }, [caseSummaries]);

  if (activeCasesCount === 0) {
    return null;
  }

  return (
    <div
      id="caseload-governance-section"
      className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E8E2D9]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#EBF2EE] text-[#1B3B2B]">
              <FolderKanban className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1B3B2B]">
              Practice Governance & Oversight
            </span>
          </div>
          <h2 className="text-lg font-semibold text-[#18201C] tracking-tight">
            Caseload & Documentation Health
          </h2>
          <p className="text-xs text-[#5A615C] leading-relaxed">
            Derived operational signals identifying clinical review cadences, activity continuity, and documentation completeness across your active caseload.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            id="view-all-governance-cases-btn"
            variant="outline"
            size="sm"
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            onClick={() => onViewAllCases('all')}
          >
            All Cases ({activeCasesCount} Active)
          </Button>
        </div>
      </div>

      {/* 4 Governance Signal Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Reviews Due / Overdue */}
        <div
          id="governance-metric-reviews"
          onClick={() => onViewAllCases('reviews')}
          className={`p-4 rounded-xl border transition-all cursor-pointer group ${
            reviewsOverdueCount > 0
              ? 'bg-[#FFF8F7] border-[#F1D0CD] hover:border-[#D9534F]'
              : reviewsDueCount > 0
              ? 'bg-[#FDF9F3] border-[#F2E4D0] hover:border-[#B57C32]'
              : 'bg-[#F7F4EE] border-[#E8E2D8] hover:border-[#CAD8D0]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A615C]">
              Reviews Due
            </span>
            <CalendarClock
              className={`w-4 h-4 ${
                reviewsOverdueCount > 0
                  ? 'text-[#C93B2B]'
                  : reviewsDueCount > 0
                  ? 'text-[#8C5E1A]'
                  : 'text-[#5A615C]'
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                reviewsOverdueCount > 0 ? 'text-[#A8281A]' : 'text-[#18201C]'
              }`}
            >
              {reviewsDueCount}
            </span>
            {reviewsOverdueCount > 0 && (
              <span className="text-xs font-medium text-[#C93B2B]">
                ({reviewsOverdueCount} Overdue)
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#6B726C] mt-1 leading-normal">
            Based on configured review cadence
          </p>
        </div>

        {/* Metric 2: Stalled Episodes */}
        <div
          id="governance-metric-stalled"
          onClick={() => onViewAllCases('stalled')}
          className={`p-4 rounded-xl border transition-all cursor-pointer group ${
            stalledCasesCount > 0
              ? 'bg-[#FDF8F3] border-[#F1DFC8] hover:border-[#B57C32]'
              : 'bg-[#F7F4EE] border-[#E8E2D8] hover:border-[#CAD8D0]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A615C]">
              Stalled Episodes
            </span>
            <ClockAlert
              className={`w-4 h-4 ${
                stalledCasesCount > 0 ? 'text-[#8C5E1A]' : 'text-[#5A615C]'
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                stalledCasesCount > 0 ? 'text-[#8C5E1A]' : 'text-[#18201C]'
              }`}
            >
              {stalledCasesCount}
            </span>
            <span className="text-xs text-[#6B726C]">Episodes</span>
          </div>
          <p className="text-[11px] text-[#6B726C] mt-1 leading-normal">
            No activity in &gt; 28 days
          </p>
        </div>

        {/* Metric 3: Documentation Gaps */}
        <div
          id="governance-metric-docgaps"
          onClick={() => onViewAllCases('documentation')}
          className={`p-4 rounded-xl border transition-all cursor-pointer group ${
            documentationGapsCount > 0
              ? 'bg-[#FAF8F5] border-[#E8E2D8] hover:border-[#1B3B2B]'
              : 'bg-[#F7F4EE] border-[#E8E2D8] hover:border-[#CAD8D0]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A615C]">
              Documentation Gaps
            </span>
            <FileCheck2 className="w-4 h-4 text-[#5A615C]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#18201C] tracking-tight">
              {documentationGapsCount}
            </span>
            <span className="text-xs text-[#6B726C]">Active cases</span>
          </div>
          <p className="text-[11px] text-[#6B726C] mt-1 leading-normal">
            Missing stage-specific records
          </p>
        </div>

        {/* Metric 4: Stage Distribution Preview */}
        <div className="p-4 rounded-xl border border-[#E8E2D8] bg-[#F7F4EE] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A615C]">
              Rehab Stages
            </span>
            <TrendingUp className="w-4 h-4 text-[#5A615C]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-[#404742]">
              <span>Assessment:</span>
              <span className="font-semibold text-[#18201C]">
                {stageDistribution.assessment}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#404742]">
              <span>Treatment:</span>
              <span className="font-semibold text-[#18201C]">
                {stageDistribution.treatment}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#404742]">
              <span>Reassessment:</span>
              <span className="font-semibold text-[#18201C]">
                {stageDistribution.reassessment}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Prioritized Actionable Caseload Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#414843]">
            Actionable Clinical Attention ({prioritizedCases.length})
          </h3>
          <span className="text-[11px] text-[#717872]">
            Click row or issue tag to navigate directly
          </span>
        </div>

        <div className="divide-y divide-[#EDE7DE] border border-[#E8E2D8] rounded-xl bg-white overflow-hidden">
          {prioritizedCases.map((summary) => {
            return (
              <div
                key={summary.caseId}
                id={`governance-row-${summary.displayCaseId}`}
                onClick={() => onOpenCase(summary.caseId, summary.patientId)}
                className="p-4 hover:bg-[#F9F7F2] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
              >
                {/* Left: Patient & Case Info */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#18201C] group-hover:text-[#1B3B2B] transition-colors">
                      {summary.caseName}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                      {summary.displayCaseId}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                      {summary.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#5A615C]">
                    <span className="font-medium text-[#2E3530]">
                      {summary.patientName} {summary.patientNumber ? `(${summary.patientNumber})` : ''}
                    </span>
                    <span>•</span>
                    <span>Last activity: {formatClinicalDate(summary.lastClinicalActivityDate || '')}</span>
                    {summary.daysSinceClinicalActivity !== undefined && (
                      <span className="text-[#788079]">
                        ({summary.daysSinceClinicalActivity}d ago)
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Operational Governance Signals with Direct Action Badges */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Review Status Badge */}
                  {summary.reviewStatus === 'overdue' && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCase(summary.caseId, summary.patientId, 'progress');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-[#FDEEED] text-[#C93B2B] border border-[#F5C7C3] hover:bg-[#FBDCDA] transition-colors"
                      title="Review overdue. Click to navigate to Progress Review."
                    >
                      <CalendarClock className="w-3 h-3" />
                      <span>Review Overdue</span>
                    </span>
                  )}

                  {summary.reviewStatus === 'due_soon' && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCase(summary.caseId, summary.patientId, 'progress');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-[#FEF6EC] text-[#8C5E1A] border border-[#F3DEC3] hover:bg-[#FCEFD9] transition-colors"
                      title="Review due soon. Click to open Progress."
                    >
                      <CalendarClock className="w-3 h-3" />
                      <span>Review Due Soon</span>
                    </span>
                  )}

                  {/* Stalled Badge */}
                  {summary.activityStatus === 'stalled' && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCase(summary.caseId, summary.patientId, 'sessions');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-[#FFF9E6] text-[#7A5B0B] border border-[#F7E7A8] hover:bg-[#FDF4CF] transition-colors"
                      title="No clinical activity recorded in > 28 days. Click to log a session."
                    >
                      <ClockAlert className="w-3 h-3" />
                      <span>Stalled ({summary.daysSinceClinicalActivity}d)</span>
                    </span>
                  )}

                  {/* Documentation Gaps Badges */}
                  {summary.missingItems.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {summary.missingItems.slice(0, 2).map((m) => (
                        <span
                          key={m.item}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCase(summary.caseId, summary.patientId, m.targetSection);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB] hover:bg-[#EAE4DC] hover:text-[#18201C] transition-colors"
                          title={`Missing: ${m.label}. Click to jump to section.`}
                        >
                          <AlertCircle className="w-3 h-3 text-[#7B827C]" />
                          <span>Missing {m.label}</span>
                        </span>
                      ))}
                      {summary.missingItems.length > 2 && (
                        <span className="text-[10px] text-[#7B827C] font-medium">
                          +{summary.missingItems.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                      <FileCheck2 className="w-3 h-3" />
                      <span>Complete</span>
                    </span>
                  )}

                  <ChevronRight className="w-4 h-4 text-[#8C938D] group-hover:text-[#18201C] group-hover:translate-x-0.5 transition-all ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
