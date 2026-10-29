import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  FolderKanban,
  CheckCircle2,
  Stethoscope,
  FileText,
  Target,
  Activity,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Patient, Case, PatientTimelineEvent, PatientTimelineEventType } from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { Button } from '../common/Button';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface PatientTimelineViewProps {
  patient: Patient;
  timeline: PatientTimelineEvent[];
  onOpenCase?: (caseItem: Case, sectionId?: string) => void;
}

type TimelineFilterCategory =
  | 'all'
  | 'episodes'
  | 'assessments'
  | 'investigations'
  | 'problems'
  | 'progress'
  | 'safety';

export const PatientTimelineView: React.FC<PatientTimelineViewProps> = ({
  patient,
  timeline,
  onOpenCase,
}) => {
  const { cases } = useClinical();
  const [filterCategory, setFilterCategory] = useState<TimelineFilterCategory>('all');

  // Filter events based on active category
  const filteredEvents = useMemo(() => {
    if (filterCategory === 'all') return timeline;
    if (filterCategory === 'episodes') {
      return timeline.filter(
        (e) => e.eventType === 'case_opened' || e.eventType === 'case_discharged'
      );
    }
    if (filterCategory === 'assessments') {
      return timeline.filter((e) => e.eventType === 'assessment_finalized');
    }
    if (filterCategory === 'investigations') {
      return timeline.filter((e) => e.eventType === 'investigation_logged');
    }
    if (filterCategory === 'problems') {
      return timeline.filter((e) => e.eventType === 'clinical_problem_formulated');
    }
    if (filterCategory === 'progress') {
      return timeline.filter((e) => e.eventType === 'progress_evaluated');
    }
    if (filterCategory === 'safety') {
      return timeline.filter((e) => e.eventType === 'safety_profile_reviewed');
    }
    return timeline;
  }, [timeline, filterCategory]);

  // Quick count tallies for filter chips
  const counts = useMemo(() => {
    let episodes = 0;
    let assessments = 0;
    let investigations = 0;
    let problems = 0;
    let progress = 0;
    let safety = 0;

    for (const e of timeline) {
      if (e.eventType === 'case_opened' || e.eventType === 'case_discharged') episodes++;
      else if (e.eventType === 'assessment_finalized') assessments++;
      else if (e.eventType === 'investigation_logged') investigations++;
      else if (e.eventType === 'clinical_problem_formulated') problems++;
      else if (e.eventType === 'progress_evaluated') progress++;
      else if (e.eventType === 'safety_profile_reviewed') safety++;
    }

    return { episodes, assessments, investigations, problems, progress, safety };
  }, [timeline]);

  // Helper to resolve Case object from event.caseId
  const findCaseObject = (event: PatientTimelineEvent): Case | undefined => {
    if (!event.caseId) return undefined;
    return cases.find((c) => c.id === event.caseId || c.caseId === event.caseId);
  };

  const handleNavigate = (event: PatientTimelineEvent) => {
    if (!onOpenCase) return;
    const targetCase = findCaseObject(event);
    if (targetCase) {
      onOpenCase(targetCase, event.navigationTarget?.sectionId);
    }
  };

  // Event visual configuration according to event type
  const getEventVisuals = (type: PatientTimelineEventType) => {
    switch (type) {
      case 'case_opened':
        return {
          icon: <FolderKanban className="w-4 h-4 text-[#1B3B2B]" />,
          badgeClass: 'bg-[#EBF2EE] text-[#1B3B2B] border-[#D5E2DA]',
          label: 'Episode Opened',
          accentBorder: 'border-l-4 border-l-[#1B3B2B]',
        };
      case 'case_discharged':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-[#1B3B2B]" />,
          badgeClass: 'bg-[#E2EDE5] text-[#1B3B2B] border-[#B8D3C0]',
          label: 'Episode Discharged',
          accentBorder: 'border-l-4 border-l-[#2E543D]',
        };
      case 'assessment_finalized':
        return {
          icon: <Stethoscope className="w-4 h-4 text-[#1D4A54]" />,
          badgeClass: 'bg-[#E8EFF0] text-[#1D4A54] border-[#CFDFE2]',
          label: 'Assessment Finalized',
          accentBorder: 'border-l-4 border-l-[#1D4A54]',
        };
      case 'investigation_logged':
        return {
          icon: <FileText className="w-4 h-4 text-[#2C3E50]" />,
          badgeClass: 'bg-[#EDEFF2] text-[#2C3E50] border-[#D3D8E0]',
          label: 'Investigation Logged',
          accentBorder: 'border-l-4 border-l-[#2C3E50]',
        };
      case 'clinical_problem_formulated':
        return {
          icon: <Target className="w-4 h-4 text-[#5C4517]" />,
          badgeClass: 'bg-[#F7F2E8] text-[#5C4517] border-[#E8DCBF]',
          label: 'Problem Formulated',
          accentBorder: 'border-l-4 border-l-[#8A6A29]',
        };
      case 'progress_evaluated':
        return {
          icon: <Activity className="w-4 h-4 text-[#224A32]" />,
          badgeClass: 'bg-[#EDF2EE] text-[#224A32] border-[#D3E0D6]',
          label: 'Progress Evaluated',
          accentBorder: 'border-l-4 border-l-[#224A32]',
        };
      case 'safety_profile_reviewed':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-[#614A19]" />,
          badgeClass: 'bg-[#FAF3E6] text-[#614A19] border-[#EADBB8]',
          label: 'Safety Profile Reviewed',
          accentBorder: 'border-l-4 border-l-[#B38938]',
        };
      case 'patient_registered':
        return {
          icon: <UserCheck className="w-4 h-4 text-[#343B36]" />,
          badgeClass: 'bg-[#EAE5DC] text-[#343B36] border-[#DDD6CB]',
          label: 'Patient Registered',
          accentBorder: 'border-l-4 border-l-[#555C57]',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-[#555C57]" />,
          badgeClass: 'bg-[#EAE7DF] text-[#555C57] border-[#DDD6CB]',
          label: 'Clinical Event',
          accentBorder: 'border-l-4 border-l-[#7A817B]',
        };
    }
  };

  // Format time portion if present in ISO timestamp
  const formatEventTime = (isoString: string) => {
    if (!isoString.includes('T')) return null;
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  return (
    <div id="patient-timeline-view-root" className="space-y-4">
      {/* 1. Header & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E2D9]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EBF2EE] text-[#1B3B2B] flex items-center justify-center border border-[#D5E2DA]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#18201C] tracking-tight">
                Longitudinal Clinical Timeline
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                {timeline.length} milestone{timeline.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-[#636A64]">
              Chronological stream of clinical milestones across all care episodes for {patient.fullName}
            </p>
          </div>
        </div>

        {/* Category Filter Chips */}
        {timeline.length > 0 && (
          <div
            role="tablist"
            aria-label="Filter timeline events"
            className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-[#EFEAE2] border border-[#DFD8CC] text-xs"
          >
            <button
              id="timeline-filter-all"
              type="button"
              role="tab"
              aria-selected={filterCategory === 'all'}
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-white text-[#18201C] shadow-2xs font-semibold'
                  : 'text-[#636A64] hover:text-[#18201C]'
              }`}
            >
              All ({timeline.length})
            </button>
            {counts.episodes > 0 && (
              <button
                id="timeline-filter-episodes"
                type="button"
                role="tab"
                aria-selected={filterCategory === 'episodes'}
                onClick={() => setFilterCategory('episodes')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  filterCategory === 'episodes'
                    ? 'bg-white text-[#1B3B2B] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Episodes ({counts.episodes})
              </button>
            )}
            {counts.assessments > 0 && (
              <button
                id="timeline-filter-assessments"
                type="button"
                role="tab"
                aria-selected={filterCategory === 'assessments'}
                onClick={() => setFilterCategory('assessments')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  filterCategory === 'assessments'
                    ? 'bg-white text-[#1D4A54] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Assessments ({counts.assessments})
              </button>
            )}
            {counts.investigations > 0 && (
              <button
                id="timeline-filter-investigations"
                type="button"
                role="tab"
                aria-selected={filterCategory === 'investigations'}
                onClick={() => setFilterCategory('investigations')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  filterCategory === 'investigations'
                    ? 'bg-white text-[#2C3E50] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Investigations ({counts.investigations})
              </button>
            )}
            {counts.problems > 0 && (
              <button
                id="timeline-filter-problems"
                type="button"
                role="tab"
                aria-selected={filterCategory === 'problems'}
                onClick={() => setFilterCategory('problems')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  filterCategory === 'problems'
                    ? 'bg-white text-[#5C4517] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Problems ({counts.problems})
              </button>
            )}
            {counts.progress > 0 && (
              <button
                id="timeline-filter-progress"
                type="button"
                role="tab"
                aria-selected={filterCategory === 'progress'}
                onClick={() => setFilterCategory('progress')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  filterCategory === 'progress'
                    ? 'bg-white text-[#224A32] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Progress ({counts.progress})
              </button>
            )}
            {counts.safety > 0 && (
              <button
                id="timeline-filter-safety"
                type="button"
                role="tab"
                aria-selected={filterCategory === 'safety'}
                onClick={() => setFilterCategory('safety')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  filterCategory === 'safety'
                    ? 'bg-white text-[#614A19] shadow-2xs font-semibold'
                    : 'text-[#636A64] hover:text-[#18201C]'
                }`}
              >
                Safety ({counts.safety})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Total Empty State: No events recorded for patient */}
      {timeline.length === 0 && (
        <div
          id="timeline-total-empty-state"
          className="p-8 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-center space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EDE7DE] text-[#1B3B2B] flex items-center justify-center mx-auto">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#18201C]">
              No longitudinal events recorded yet.
            </h3>
            <p className="text-xs text-[#636A64] max-w-md mx-auto leading-relaxed">
              Historical events will appear here automatically as clinical records are documented across episodes of care (intakes, assessments, investigations, problem formulation, progress evaluations, and discharges).
            </p>
          </div>
        </div>
      )}

      {/* 3. Category Filter Empty State: Items exist but none match filter */}
      {timeline.length > 0 && filteredEvents.length === 0 && (
        <div
          id="timeline-filter-empty-state"
          className="p-6 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-center space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-[#EDE7DE] text-[#555C57] flex items-center justify-center mx-auto">
            <Filter className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-[#2D3530]">
            No timeline events match the selected category.
          </p>
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className="text-xs text-[#1B3B2B] hover:underline font-medium cursor-pointer"
          >
            Clear filter to view all {timeline.length} milestone{timeline.length === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {/* 4. Chronological Stream Rendering */}
      {filteredEvents.length > 0 && (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E0D9CD]">
          {filteredEvents.map((event) => {
            const visuals = getEventVisuals(event.eventType);
            const targetCase = findCaseObject(event);
            const timeString = formatEventTime(event.timestamp);

            return (
              <div
                key={event.id}
                id={`timeline-node-${event.id}`}
                className="relative group transition-all duration-150"
              >
                {/* Node Anchor Icon */}
                <div
                  aria-hidden="true"
                  className="absolute -left-6 sm:-left-8 top-3 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FAF8F5] border-2 border-[#D5CDBD] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform"
                >
                  <div className="scale-75 sm:scale-90">{visuals.icon}</div>
                </div>

                {/* Event Card */}
                <div
                  className={`bg-[#FAF8F5] border border-[#DCD6CA] hover:border-[#BFB7AA] rounded-xl p-4 shadow-2xs space-y-2.5 transition-colors ${visuals.accentBorder}`}
                >
                  {/* Card Header: Badges & Timing */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Event Type Badge */}
                      <span
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${visuals.badgeClass}`}
                      >
                        {visuals.label}
                      </span>

                      {/* Originating Case Pill */}
                      {event.caseName && (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB] max-w-[200px] truncate">
                          {event.caseName}
                        </span>
                      )}

                      {/* Explicit Source Entity Provenance */}
                      {event.sourceType && event.sourceId && (
                        <span
                          title={`Source: ${event.sourceType} (${event.sourceId})`}
                          className="px-1.5 py-0.5 text-[10px] font-mono text-[#757C76] bg-[#F1EDE6] border border-[#DFD8CC] rounded"
                        >
                          {event.sourceType}:{event.sourceId}
                        </span>
                      )}
                    </div>

                    {/* Defensible Timestamp Display */}
                    <div className="flex items-center gap-1.5 text-xs text-[#636A64] shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-[#7A817B]" />
                      <span className="font-medium text-[#222924]">
                        {formatClinicalDate(event.timestamp)}
                      </span>
                      {timeString && (
                        <span className="text-[#7A817B]">({timeString})</span>
                      )}
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#18201C] tracking-tight">
                      {event.title}
                    </h3>
                    <p className="text-xs text-[#3E4540] leading-relaxed">
                      {event.summary}
                    </p>
                  </div>

                  {/* Footer & Source Navigation */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#EDE7DC] text-xs text-[#636A64]">
                    <div>
                      {event.navigationTarget?.sectionId && (
                        <span className="text-[11px] text-[#7A817B]">
                          Section: <span className="font-medium capitalize text-[#484F4A]">{event.navigationTarget.sectionId}</span>
                        </span>
                      )}
                    </div>

                    {/* Navigation Button */}
                    {targetCase && onOpenCase ? (
                      <Button
                        id={`timeline-nav-${event.id}`}
                        variant="secondary"
                        size="xs"
                        rightIcon={<ChevronRight className="w-3 h-3" />}
                        onClick={() => handleNavigate(event)}
                      >
                        View in Case
                      </Button>
                    ) : event.eventType === 'patient_registered' ||
                      event.eventType === 'safety_profile_reviewed' ? (
                      <span className="text-[11px] text-[#7A817B] italic">
                        Patient Profile Record
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
