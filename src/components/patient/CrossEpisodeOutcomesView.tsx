import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  FolderKanban,
  Calendar,
  ChevronRight,
  Target,
  ArrowRight,
  Info,
  Layers,
  FileText,
} from 'lucide-react';
import { Patient, Case, LongitudinalMeasureSeries, LongitudinalOutcomePoint, MeasurementStage } from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { Button } from '../common/Button';
import { calculateSafeChange } from '../../utils/clinicalProgress';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface CrossEpisodeOutcomesViewProps {
  patient: Patient;
  outcomeSeries: LongitudinalMeasureSeries[];
  onOpenCase?: (caseItem: Case, sectionId?: string) => void;
}

const STAGE_BADGES: Record<
  MeasurementStage,
  { label: string; bg: string; text: string; border: string }
> = {
  baseline: {
    label: 'Baseline',
    bg: 'bg-[#F2ECE1]',
    text: 'text-[#5C4D3C]',
    border: 'border-[#E2D6C5]',
  },
  interim: {
    label: 'Interim',
    bg: 'bg-[#EBF3EE]',
    text: 'text-[#1B3B2B]',
    border: 'border-[#C8DDD0]',
  },
  reassessment: {
    label: 'Reassessment',
    bg: 'bg-[#EBF1F5]',
    text: 'text-[#204257]',
    border: 'border-[#C5D7E3]',
  },
  discharge: {
    label: 'Discharge',
    bg: 'bg-[#F5EDF0]',
    text: 'text-[#5E2B3D]',
    border: 'border-[#E6CDD5]',
  },
};

export const CrossEpisodeOutcomesView: React.FC<CrossEpisodeOutcomesViewProps> = ({
  patient,
  outcomeSeries,
  onOpenCase,
}) => {
  const { cases } = useClinical();

  // Active selected instrument key
  const [selectedKey, setSelectedKey] = useState<string>(() => {
    return outcomeSeries.length > 0 ? outcomeSeries[0].seriesKey : '';
  });

  // Keep selected key synchronized if outcomeSeries updates
  const activeSeries = useMemo(() => {
    if (outcomeSeries.length === 0) return null;
    const found = outcomeSeries.find((s) => s.seriesKey === selectedKey);
    return found || outcomeSeries[0];
  }, [outcomeSeries, selectedKey]);

  // Case lookup helper
  const findCaseObject = (caseId: string): Case | undefined => {
    return cases.find((c) => c.id === caseId || c.caseId === caseId);
  };

  const handleNavigateToCase = (point: LongitudinalOutcomePoint) => {
    if (!onOpenCase) return;
    const targetCase = findCaseObject(point.caseId);
    if (targetCase) {
      onOpenCase(targetCase, 'progress');
    }
  };

  return (
    <div id="cross-episode-outcomes-root" className="space-y-6">
      {/* 1. Header & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E2D9]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EBF3EE] text-[#1B3B2B] flex items-center justify-center border border-[#C8DDD0]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#18201C] tracking-tight">
                Cross-Episode Outcomes &amp; Trajectories
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                {outcomeSeries.length} instrument{outcomeSeries.length === 1 ? '' : 's'} tracked
              </span>
            </div>
            <p className="text-xs text-[#636A64]">
              Descriptive longitudinal record of standardized measurements and intra-episode progress across care episodes for {patient.fullName}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Total Empty State (Zero instruments across all episodes) */}
      {outcomeSeries.length === 0 && (
        <div
          id="cross-episode-outcomes-total-empty"
          className="p-8 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-center space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EDE7DE] text-[#555C57] flex items-center justify-center mx-auto">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#18201C]">
              No standardized outcome measurements have been documented across this patient&apos;s episodes of care.
            </h3>
            <p className="text-xs text-[#636A64] max-w-md mx-auto leading-relaxed">
              Standardized physical tests, functional mobility instruments, and patient-reported outcome measures documented during progress reviews will appear here with cross-episode tracking.
            </p>
          </div>
        </div>
      )}

      {/* 3. Instrument Selector & Active Trajectory View */}
      {outcomeSeries.length > 0 && activeSeries && (
        <div className="space-y-5">
          {/* Instrument Selector Tabs */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#636A64]">
              Select Outcome Measure:
            </label>
            <div
              role="tablist"
              aria-label="Standardized outcome measure selector"
              className="flex flex-wrap gap-2"
            >
              {outcomeSeries.map((series) => {
                const isSelected = series.seriesKey === activeSeries.seriesKey;
                return (
                  <button
                    key={series.seriesKey}
                    id={`measure-tab-${series.seriesKey}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedKey(series.seriesKey)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-2xs font-semibold'
                        : 'bg-white text-[#3E4540] border-[#D5CEC2] hover:bg-[#F5F1EB] hover:text-[#18201C]'
                    }`}
                  >
                    <span>{series.measureName}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isSelected
                          ? 'bg-[#2E543F] text-[#FAF8F5]'
                          : 'bg-[#EAE5DC] text-[#4F5752]'
                      }`}
                    >
                      {series.points.length} pt{series.points.length === 1 ? '' : 's'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Instrument Metadata Card */}
          <div className="bg-[#FAF8F5] border border-[#DDD6CB] rounded-xl p-4 space-y-2 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-semibold text-[#18201C]">
                  {activeSeries.measureName}
                </h3>
                {activeSeries.unit && (
                  <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-[#EFEAE2] text-[#4F5752] border border-[#DDD6CB]">
                    Unit: {activeSeries.unit}
                  </span>
                )}
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EAE5DC] text-[#4F5752] border border-[#DDD6CB] capitalize">
                  {activeSeries.category.replace('_', ' ')}
                </span>
              </div>

              <div className="text-xs text-[#636A64]">
                Total documented points:{' '}
                <span className="font-mono font-semibold text-[#18201C]">
                  {activeSeries.points.length}
                </span>{' '}
                across{' '}
                <span className="font-mono font-semibold text-[#18201C]">
                  {activeSeries.episodes.length}
                </span>{' '}
                episode{activeSeries.episodes.length === 1 ? '' : 's'}
              </div>
            </div>

            {/* Authoritative Scale Direction Reference (Only when present in authoritative definition) */}
            {activeSeries.directionMeaning && activeSeries.directionMeaning !== 'not_defined' && (
              <div className="flex items-center gap-1.5 text-xs text-[#555C57] pt-1 border-t border-[#EAE4DB]">
                <Info className="w-3.5 h-3.5 text-[#7A817B]" />
                <span>
                  Authoritative scale specification:{' '}
                  <span className="font-medium text-[#222924]">
                    {activeSeries.directionMeaning === 'lower_is_better'
                      ? 'Lower score indicates less symptom severity or impairment.'
                      : 'Higher score indicates greater functional capacity or excursion.'}
                  </span>{' '}
                  <span className="text-[#7A817B] italic">
                    (Clinical significance is evaluated contextually by the attending therapist.)
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* 4. Episode-Segmented Trajectories */}
          {activeSeries.points.length === 0 ? (
            <div
              id="cross-episode-outcomes-instrument-empty"
              className="p-6 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-center space-y-2"
            >
              <p className="text-xs text-[#636A64]">
                No measurements recorded for the selected instrument.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeSeries.episodes.map((episode, epIndex) => {
                const isNumeric = activeSeries.valueType !== 'text' && activeSeries.valueType !== 'binary';
                const epBaselineValue = episode.baselinePoint?.scoreNumeric;
                const prevEpisode = epIndex > 0 ? activeSeries.episodes[epIndex - 1] : null;

                // Neutral cross-episode transition delta
                let crossEpisodeTransitionDelta: {
                  prevDischargeValue: number;
                  currBaselineValue: number;
                  deltaText: string;
                } | null = null;

                if (
                  prevEpisode &&
                  isNumeric &&
                  episode.baselinePoint?.scoreNumeric !== undefined &&
                  (prevEpisode.latestPoint?.scoreNumeric !== undefined)
                ) {
                  const prevVal = prevEpisode.latestPoint.scoreNumeric;
                  const currVal = episode.baselinePoint.scoreNumeric;
                  const safeDiff = calculateSafeChange(prevVal, currVal, activeSeries.unit);
                  crossEpisodeTransitionDelta = {
                    prevDischargeValue: prevVal,
                    currBaselineValue: currVal,
                    deltaText: safeDiff.formattedChangeText,
                  };
                }

                return (
                  <React.Fragment key={episode.caseId}>
                    {/* Cross-Episode Mathematical Transition Divider (Section 16) */}
                    {crossEpisodeTransitionDelta && (
                      <div
                        id={`cross-episode-divider-${epIndex}`}
                        className="p-3 rounded-lg bg-[#F4EFEA] border border-[#DDD6CB] space-y-1"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#555C57] gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#18201C]">
                              Episode Boundary:
                            </span>
                            <span>
                              {prevEpisode?.caseName} (End:{' '}
                              {crossEpisodeTransitionDelta.prevDischargeValue}
                              {activeSeries.unit ? ` ${activeSeries.unit}` : ''})
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#7A817B]" />
                            <span>
                              {episode.caseName} (Start:{' '}
                              {crossEpisodeTransitionDelta.currBaselineValue}
                              {activeSeries.unit ? ` ${activeSeries.unit}` : ''})
                            </span>
                          </div>

                          <div className="font-mono text-xs text-[#222924] bg-white px-2 py-0.5 rounded border border-[#DDD6CB] shrink-0">
                            Raw mathematical difference: Δ {crossEpisodeTransitionDelta.deltaText}
                          </div>
                        </div>
                        <p className="text-[11px] text-[#7A817B] italic">
                          Calculated strictly as numerical subtraction between episodes. Clinical continuity or divergence is determined solely by the attending therapist.
                        </p>
                      </div>
                    )}

                    {/* Episode Container Card */}
                    <div
                      id={`outcome-episode-card-${episode.caseId}`}
                      className="bg-[#FAF8F5] border border-[#D5CEC2] rounded-xl overflow-hidden shadow-2xs space-y-0"
                    >
                      {/* Episode Header */}
                      <div className="bg-[#EFEAE2] border-b border-[#D5CEC2] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <FolderKanban className="w-4 h-4 text-[#1B3B2B]" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-[#18201C] uppercase tracking-wide">
                                Episode: {episode.caseName}
                              </h4>
                              {episode.originatingCaseDisplayId && episode.originatingCaseDisplayId !== episode.caseName && (
                                <span className="text-[11px] font-mono text-[#757C76]">
                                  ({episode.originatingCaseDisplayId})
                                </span>
                              )}
                              {episode.isClosed ? (
                                <span className="px-2 py-0.2 text-[10px] font-medium rounded-full bg-[#EAE5DC] text-[#4F5752] border border-[#DDD6CB]">
                                  Closed Episode
                                </span>
                              ) : (
                                <span className="px-2 py-0.2 text-[10px] font-medium rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  Active Episode
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#636A64] mt-0.5">
                              {episode.startDate && (
                                <span>Start: {formatClinicalDate(episode.startDate)}</span>
                              )}
                              {episode.dischargeDate && (
                                <span>Discharged: {formatClinicalDate(episode.dischargeDate)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-[#636A64]">
                          {episode.points.length} measurement{episode.points.length === 1 ? '' : 's'} in this episode
                        </div>
                      </div>

                      {/* Episode Measurements Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#EAE4DB] bg-[#F7F3EC] text-[#555C57] font-semibold text-[11px] uppercase tracking-wider">
                              <th className="py-2.5 px-3">Stage</th>
                              <th className="py-2.5 px-3">Clinical Date</th>
                              <th className="py-2.5 px-3">Measured Value</th>
                              <th className="py-2.5 px-3">Intra-Episode Δ</th>
                              <th className="py-2.5 px-3">Documented Target</th>
                              <th className="py-2.5 px-3">Notes &amp; Context</th>
                              <th className="py-2.5 px-3 text-right">Originating Case</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EAE4DB]">
                            {episode.points.map((pt, ptIdx) => {
                              const stageBadge = STAGE_BADGES[pt.stage] || {
                                label: pt.stage,
                                bg: 'bg-[#F2ECE1]',
                                text: 'text-[#5C4D3C]',
                                border: 'border-[#E2D6C5]',
                              };

                              // Calculate intra-episode delta safely
                              let deltaText = '—';
                              if (isNumeric && pt.scoreNumeric !== undefined) {
                                if (pt === episode.baselinePoint) {
                                  deltaText = 'Baseline';
                                } else if (epBaselineValue !== undefined) {
                                  const changeResult = calculateSafeChange(
                                    epBaselineValue,
                                    pt.scoreNumeric,
                                    pt.unit
                                  );
                                  deltaText = changeResult.formattedChangeText;
                                }
                              }

                              const targetCase = findCaseObject(pt.caseId);

                              return (
                                <tr
                                  key={pt.measurementId}
                                  id={`outcome-row-${pt.measurementId}`}
                                  className="hover:bg-[#F5F0E8] transition-colors"
                                >
                                  {/* Stage */}
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span
                                      className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${stageBadge.bg} ${stageBadge.text} ${stageBadge.border}`}
                                    >
                                      {stageBadge.label}
                                    </span>
                                  </td>

                                  {/* Clinical Date */}
                                  <td className="py-2.5 px-3 whitespace-nowrap text-[#18201C] font-medium">
                                    {formatClinicalDate(pt.date)}
                                  </td>

                                  {/* Measured Value */}
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {isNumeric && pt.scoreNumeric !== undefined ? (
                                      <span className="font-mono font-semibold text-sm text-[#18201C]">
                                        {pt.scoreNumeric}
                                        {pt.unit && (
                                          <span className="text-xs font-normal text-[#636A64] ml-1">
                                            {pt.unit}
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-[#18201C] font-medium">
                                        {pt.scoreText || '—'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Intra-Episode Delta */}
                                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
                                    {deltaText === 'Baseline' ? (
                                      <span className="text-[#7A817B] italic font-sans text-[11px]">
                                        Baseline
                                      </span>
                                    ) : deltaText !== '—' ? (
                                      <span className="text-[#222924] font-semibold">
                                        Δ {deltaText}
                                      </span>
                                    ) : (
                                      <span className="text-[#969D98]">—</span>
                                    )}
                                  </td>

                                  {/* Documented Target */}
                                  <td className="py-2.5 px-3 whitespace-nowrap text-xs text-[#555C57]">
                                    {pt.targetValue !== undefined ? (
                                      <span className="font-mono text-[#1B3B2B] font-medium">
                                        Target: {pt.targetValue}
                                        {pt.unit ? ` ${pt.unit}` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-[#969D98]">—</span>
                                    )}
                                  </td>

                                  {/* Notes & Context */}
                                  <td className="py-2.5 px-3 text-xs text-[#4F5752] max-w-xs truncate">
                                    {pt.therapistAuthoredNotes || <span className="text-[#969D98]">—</span>}
                                  </td>

                                  {/* Navigation Action */}
                                  <td className="py-2.5 px-3 whitespace-nowrap text-right">
                                    {targetCase && onOpenCase && (
                                      <Button
                                        id={`nav-case-btn-${pt.measurementId}`}
                                        variant="secondary"
                                        size="xs"
                                        rightIcon={<ChevronRight className="w-3 h-3" />}
                                        onClick={() => handleNavigateToCase(pt)}
                                      >
                                        View Case
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
