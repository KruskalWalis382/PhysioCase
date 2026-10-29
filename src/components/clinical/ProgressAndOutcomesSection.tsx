import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  CheckCircle2,
  FileText,
  Activity,
  Target,
  Sparkles,
  HelpCircle,
  Hash,
  Clock,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useClinical } from '../../context/ClinicalContext';
import {
  Case,
  Patient,
  ProgressRecord,
  ProgressMeasurement,
  ProgressRecordContextType,
  MeasurementStage,
  MeasurementValueType,
  OutcomeMeasureDefinition,
} from '../../types';
import { calculateSafeChange } from '../../utils/clinicalProgress';
import { UnifiedReassessmentModal } from './UnifiedReassessmentModal';

interface ProgressAndOutcomesSectionProps {
  caseItem: Case;
  patient: Patient;
}

const CONTEXT_TYPE_LABELS: Record<ProgressRecordContextType, string> = {
  routine_progress_review: 'Routine Progress Review',
  reassessment: 'Formal Reassessment',
  functional_update: 'Functional Milestone Update',
  outcome_measurement: 'Standardized Outcome Measurement',
  goal_review: 'Goal Review Checkpoint',
  milestone_review: 'Milestone Evaluation',
  discharge_evaluation: 'Discharge Evaluation',
  other: 'Clinical Review Note',
};

const STAGE_LABELS: Record<MeasurementStage, { label: string; bg: string; text: string; border: string }> = {
  baseline: { label: 'Baseline', bg: 'bg-[#F2ECE1]', text: 'text-[#5C4D3C]', border: 'border-[#E2D6C5]' },
  interim: { label: 'Interim', bg: 'bg-[#EBF3EE]', text: 'text-[#1B3B2B]', border: 'border-[#C8DDD0]' },
  reassessment: { label: 'Reassessment', bg: 'bg-[#EBF1F5]', text: 'text-[#204257]', border: 'border-[#C5D7E3]' },
  discharge: { label: 'Discharge', bg: 'bg-[#F5EDF0]', text: 'text-[#5E2B3D]', border: 'border-[#E6CDD5]' },
};

export const ProgressAndOutcomesSection: React.FC<ProgressAndOutcomesSectionProps> = ({
  caseItem,
  patient,
}) => {
  const {
    clinicalGoals,
    clinicalSessions,
    objectiveAssessments,
    getProgressRecordsForCase,
    getMeasurementsForRecord,
    getMeasurementsForCase,
    outcomeMeasureDefinitions,
    saveProgressRecord,
    deleteProgressRecord,
    saveProgressMeasurement,
    deleteProgressMeasurement,
    saveOutcomeMeasureDefinition,
    saveClinicalGoal,
  } = useClinical();

  // Case-scoped queries
  const progressRecords = useMemo(
    () => getProgressRecordsForCase(caseItem.id),
    [getProgressRecordsForCase, caseItem.id]
  );
  const caseGoals = useMemo(
    () => clinicalGoals.filter((g) => g.caseId === caseItem.id),
    [clinicalGoals, caseItem.id]
  );
  const caseSessions = useMemo(
    () => clinicalSessions.filter((s) => s.caseId === caseItem.id),
    [clinicalSessions, caseItem.id]
  );
  const caseAssessments = useMemo(
    () => objectiveAssessments.filter((oa) => oa.caseId === caseItem.id),
    [objectiveAssessments, caseItem.id]
  );
  const allCaseMeasurements = useMemo(
    () => getMeasurementsForCase(caseItem.id),
    [getMeasurementsForCase, caseItem.id]
  );

  // Expanded records state
  const [expandedRecordIds, setExpandedRecordIds] = useState<Record<string, boolean>>(() => {
    return progressRecords.length > 0 ? { [progressRecords[0].id]: true } : {};
  });

  const toggleExpand = (recordId: string) => {
    setExpandedRecordIds((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProgressRecord | null>(null);

  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
  const [measurementTargetRecordId, setMeasurementTargetRecordId] = useState<string | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<ProgressMeasurement | null>(null);

  const [isCustomMeasureModalOpen, setIsCustomMeasureModalOpen] = useState(false);
  const [isUnifiedReassessmentOpen, setIsUnifiedReassessmentOpen] = useState(false);

  // Active trend metric selection for visual sparkline
  const uniqueTrackedMeasureNames = useMemo(() => {
    const set = new Set<string>();
    allCaseMeasurements.forEach((m) => {
      if (m.numericValue !== undefined) {
        set.add(m.measureName);
      }
    });
    return Array.from(set);
  }, [allCaseMeasurements]);

  const [selectedTrendMeasure, setSelectedTrendMeasure] = useState<string>('');

  // Synchronize default selected metric for trend
  React.useEffect(() => {
    if (uniqueTrackedMeasureNames.length > 0 && !selectedTrendMeasure) {
      setSelectedTrendMeasure(uniqueTrackedMeasureNames[0]);
    }
  }, [uniqueTrackedMeasureNames, selectedTrendMeasure]);

  // Compute longitudinal points for selected metric
  const trendPoints = useMemo(() => {
    if (!selectedTrendMeasure) return [];
    return allCaseMeasurements
      .filter(
        (m) =>
          m.measureName.trim().toLowerCase() === selectedTrendMeasure.trim().toLowerCase() &&
          typeof m.numericValue === 'number'
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allCaseMeasurements, selectedTrendMeasure]);

  // Open create/edit record modal
  const handleOpenRecordModal = (record?: ProgressRecord) => {
    if (record) {
      setEditingRecord(record);
    } else {
      setEditingRecord(null);
    }
    setIsRecordModalOpen(true);
  };

  // Open add/edit measurement modal
  const handleOpenMeasurementModal = (recordId: string, measurement?: ProgressMeasurement) => {
    setMeasurementTargetRecordId(recordId);
    if (measurement) {
      setEditingMeasurement(measurement);
    } else {
      setEditingMeasurement(null);
    }
    setIsMeasurementModalOpen(true);
  };

  return (
    <section
      id="section-clinical-progress"
      className="mt-12 pt-8 border-t border-[#E5DFD4] space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1B3B2B] text-[#FAF8F5]">
              Stage 6
            </span>
            <h2 className="text-xl font-serif text-[#1C201D]">
              Clinical Progress &amp; Outcomes
            </h2>
          </div>
          <p className="text-xs text-[#5D645E] mt-1 max-w-2xl leading-relaxed">
            Document longitudinal changes in symptoms, joint mechanics, functional capacity, and goal achievement across clinical encounters without altering baseline prescriptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="start-reassessment-btn"
            variant="primary"
            size="sm"
            leftIcon={<Activity className="w-4 h-4" />}
            onClick={() => setIsUnifiedReassessmentOpen(true)}
          >
            Start Reassessment
          </Button>
          <Button
            id="new-progress-record-btn"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => handleOpenRecordModal()}
          >
            New Progress Review
          </Button>
        </div>
      </div>

      {/* Longitudinal Trend Visualizer (Neutral, purely mathematical) */}
      {uniqueTrackedMeasureNames.length > 0 && (
        <div className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#EDE8DF]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1B3B2B]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1C201D]">
                Longitudinal Metric Trend
              </h3>
              <span className="text-[11px] text-[#676E68]">
                (Descriptive progression display)
              </span>
            </div>

            {/* Metric Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="trend-measure-select" className="text-xs text-[#5D645E]">
                Metric:
              </label>
              <select
                id="trend-measure-select"
                value={selectedTrendMeasure}
                onChange={(e) => setSelectedTrendMeasure(e.target.value)}
                className="text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg px-2.5 py-1.5 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              >
                {uniqueTrackedMeasureNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {trendPoints.length >= 2 ? (
            <div className="space-y-3">
              {/* Neutral sparkline / timeline card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {trendPoints.map((pt, idx) => {
                  const isFirst = idx === 0;
                  const deltaResult = isFirst
                    ? null
                    : calculateSafeChange(trendPoints[0].numericValue, pt.numericValue, pt.unit);

                  return (
                    <div
                      key={pt.id}
                      className="bg-[#FFFFFF] border border-[#E5DFD4] rounded-lg p-3 text-center relative"
                    >
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-medium border ${
                          STAGE_LABELS[pt.stage]?.bg || 'bg-gray-100'
                        } ${STAGE_LABELS[pt.stage]?.text || 'text-gray-700'} ${
                          STAGE_LABELS[pt.stage]?.border || 'border-gray-300'
                        }`}
                      >
                        {STAGE_LABELS[pt.stage]?.label || pt.stage}
                      </span>
                      <div className="text-lg font-serif font-medium text-[#1C201D] mt-1.5">
                        {pt.numericValue}
                        {pt.unit && <span className="text-xs font-normal text-[#5D645E] ml-0.5">{pt.unit}</span>}
                      </div>
                      <div className="text-[10px] text-[#676E68] mt-0.5">
                        {new Date(pt.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>

                      {deltaResult && (
                        <div className="text-[10px] font-mono mt-1 pt-1 border-t border-[#F2ECE1] text-[#3C443E]">
                          Δ {deltaResult.formattedChangeText}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mathematical Summary Notice */}
              <div className="flex items-center justify-between text-[11px] text-[#676E68] bg-[#F6F2EB] px-3 py-2 rounded-md">
                <span>
                  <strong>Baseline:</strong> {trendPoints[0].numericValue} {trendPoints[0].unit || ''} ({new Date(trendPoints[0].createdAt).toLocaleDateString()})
                </span>
                <span>
                  <strong>Current:</strong> {trendPoints[trendPoints.length - 1].numericValue} {trendPoints[trendPoints.length - 1].unit || ''}
                </span>
                <span>
                  <strong>Net Change:</strong>{' '}
                  {calculateSafeChange(
                    trendPoints[0].numericValue,
                    trendPoints[trendPoints.length - 1].numericValue,
                    trendPoints[0].unit
                  ).formattedChangeText}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#676E68] italic py-2">
              Record at least two measurements for &quot;{selectedTrendMeasure}&quot; across progress reviews to visualize the chronological trajectory.
            </p>
          )}
        </div>
      )}

      {/* Progress Records Timeline */}
      {progressRecords.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-dashed border-[#D5CEC2] rounded-xl p-8 text-center">
          <TrendingUp className="w-8 h-8 text-[#676E68] mx-auto mb-2" />
          <h3 className="text-sm font-medium text-[#1C201D]">
            No progress reviews recorded yet
          </h3>
          <p className="text-xs text-[#5D645E] mt-1 max-w-md mx-auto">
            Create a progress record to document interval re-evaluations, track quantifiable joint angles or functional tests, and note clinical progress.
          </p>
          <div className="flex items-center justify-center gap-2.5 mt-4">
            <Button
              id="empty-start-reassessment-btn"
              variant="primary"
              size="sm"
              leftIcon={<Activity className="w-4 h-4" />}
              onClick={() => setIsUnifiedReassessmentOpen(true)}
            >
              Start Reassessment
            </Button>
            <Button
              id="empty-new-progress-btn"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenRecordModal()}
            >
              Routine Review
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {progressRecords.map((record, index) => {
            const isExpanded = expandedRecordIds[record.id] ?? false;
            const measurements = getMeasurementsForRecord(record.id);

            // Related linked entities for display
            const linkedGoal = record.linkedGoalId
              ? caseGoals.find((g) => g.id === record.linkedGoalId)
              : null;
            const linkedSession = record.linkedSessionId
              ? caseSessions.find((s) => s.id === record.linkedSessionId)
              : null;
            const linkedAssessment = record.linkedAssessmentId
              ? caseAssessments.find((oa) => oa.id === record.linkedAssessmentId)
              : null;

            return (
              <div
                key={record.id}
                className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl overflow-hidden shadow-xs transition-all"
              >
                {/* Record Card Header */}
                <div
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#F6F2EB] transition-colors"
                  onClick={() => toggleExpand(record.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#EBF3EE] text-[#1B3B2B] border border-[#C8DDD0] mt-0.5">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#1B3B2B]">
                          Review #{progressRecords.length - index}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#E5DFD4] text-[#3C443E] font-medium">
                          {CONTEXT_TYPE_LABELS[record.contextType] || record.contextType}
                        </span>
                        <span className="text-xs text-[#676E68] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {record.recordDate}
                        </span>
                      </div>

                      <p className="text-sm text-[#1C201D] font-medium mt-1">
                        {record.therapistSummary}
                      </p>

                      {/* Linked Relationships Pill Row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {linkedGoal && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#D5CEC2] text-[#3C443E] flex items-center gap-1">
                            <Target className="w-3 h-3 text-[#1B3B2B]" />
                            Goal: {linkedGoal.title}
                          </span>
                        )}
                        {linkedSession && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#D5CEC2] text-[#3C443E] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#204257]" />
                            Session #{linkedSession.sessionNumber} ({linkedSession.sessionDate})
                          </span>
                        )}
                        {linkedAssessment && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#D5CEC2] text-[#3C443E] flex items-center gap-1">
                            <Activity className="w-3 h-3 text-[#5C4D3C]" />
                            Assessment: {linkedAssessment.id.substring(0, 8)}
                          </span>
                        )}
                        <span className="text-[11px] text-[#676E68]">
                          {measurements.length} {measurements.length === 1 ? 'measurement' : 'measurements'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      aria-label="Edit review"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRecordModal(record);
                      }}
                      className="p-1.5 text-[#5D645E] hover:text-[#1B3B2B] hover:bg-[#EBE5DA] rounded-md transition-colors"
                      title="Edit review"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete review"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            'Are you sure you want to delete this progress review and its measurements? Linked sessions, assessments, and goals will not be affected.'
                          )
                        ) {
                          deleteProgressRecord(record.id);
                        }
                      }}
                      className="p-1.5 text-[#5D645E] hover:text-red-700 hover:bg-[#FBEBEB] rounded-md transition-colors"
                      title="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-1 text-[#5D645E]">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#E5DFD4] p-4 sm:p-5 space-y-5 bg-[#FFFFFF]">
                    {/* Clinical Interpretation / Notes */}
                    {record.clinicalInterpretation && (
                      <div className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-lg p-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1B3B2B] uppercase tracking-wider mb-1">
                          <FileText className="w-3.5 h-3.5" />
                          Therapist Clinical Reasoning &amp; Interpretation
                        </div>
                        <p className="text-xs text-[#3C443E] leading-relaxed whitespace-pre-wrap">
                          {record.clinicalInterpretation}
                        </p>
                      </div>
                    )}

                    {/* Measurements Table & Adder */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C201D] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#1B3B2B]" />
                          Recorded Measurements ({measurements.length})
                        </h4>
                        <Button
                          id={`add-meas-btn-${record.id}`}
                          variant="secondary"
                          size="sm"
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenMeasurementModal(record.id)}
                        >
                          Add Measurement
                        </Button>
                      </div>

                      {measurements.length === 0 ? (
                        <p className="text-xs text-[#676E68] italic py-2">
                          No specific measurements logged for this review yet. Click &quot;Add Measurement&quot; to log ROM, pain score, strength, or functional capacity.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {measurements.map((meas) => {
                            // Find baseline measurement for this specific measure across all records in the case
                            const matchingMeasurements = allCaseMeasurements
                              .filter(
                                (m) =>
                                  m.measureName.trim().toLowerCase() ===
                                  meas.measureName.trim().toLowerCase()
                              )
                              .sort(
                                (a, b) =>
                                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                              );

                            const baselineMeas =
                              matchingMeasurements.find((m) => m.stage === 'baseline') ||
                              matchingMeasurements[0];

                            const isBaseline = baselineMeas?.id === meas.id;

                            // Calculate safe delta against baseline if numeric
                            const deltaResult =
                              !isBaseline &&
                              typeof meas.numericValue === 'number' &&
                              typeof baselineMeas?.numericValue === 'number'
                                ? calculateSafeChange(
                                    baselineMeas.numericValue,
                                    meas.numericValue,
                                    meas.unit
                                  )
                                : null;

                            return (
                              <div
                                key={meas.id}
                                className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-lg p-3.5 space-y-2 relative group"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-medium border ${
                                          STAGE_LABELS[meas.stage]?.bg || 'bg-gray-100'
                                        } ${STAGE_LABELS[meas.stage]?.text || 'text-gray-700'} ${
                                          STAGE_LABELS[meas.stage]?.border || 'border-gray-300'
                                        }`}
                                      >
                                        {STAGE_LABELS[meas.stage]?.label || meas.stage}
                                      </span>
                                      <span className="text-xs font-semibold text-[#1C201D]">
                                        {meas.measureName}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-[#5D645E] capitalize mt-0.5">
                                      Category: {meas.category.replace(/_/g, ' ')}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      aria-label="Edit measurement"
                                      onClick={() => handleOpenMeasurementModal(record.id, meas)}
                                      className="p-1 text-[#5D645E] hover:text-[#1B3B2B] rounded"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Delete measurement"
                                      onClick={() => {
                                        if (window.confirm('Delete this measurement?')) {
                                          deleteProgressMeasurement(meas.id);
                                        }
                                      }}
                                      className="p-1 text-[#5D645E] hover:text-red-700 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Values Presentation */}
                                <div className="bg-[#FFFFFF] border border-[#EDE8DF] rounded p-2.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] text-[#676E68] uppercase font-medium block">
                                      Recorded Value
                                    </span>
                                    <span className="text-base font-serif font-medium text-[#1C201D]">
                                      {meas.numericValue !== undefined
                                        ? `${meas.numericValue} ${meas.unit || ''}`
                                        : meas.textValue || '—'}
                                    </span>
                                  </div>

                                  {deltaResult && (
                                    <div className="text-right">
                                      <span className="text-[10px] text-[#676E68] uppercase font-medium block">
                                        Change from Baseline
                                      </span>
                                      <span className="text-xs font-mono font-medium text-[#1B3B2B]">
                                        Δ {deltaResult.formattedChangeText}
                                        {deltaResult.percentageChange !== undefined && (
                                          <span className="text-[10px] text-[#5D645E] ml-1">
                                            ({deltaResult.percentageChange > 0 ? '+' : ''}
                                            {deltaResult.percentageChange}%)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Context / Notes */}
                                {(meas.context || meas.notes) && (
                                  <div className="text-[11px] text-[#5D645E] italic">
                                    {meas.context && <span>Method: {meas.context}. </span>}
                                    {meas.notes && <span>{meas.notes}</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          UNIFIED REASSESSMENT WORKFLOW MODAL
         ======================================================== */}
      {isUnifiedReassessmentOpen && (
        <UnifiedReassessmentModal
          isOpen={isUnifiedReassessmentOpen}
          onClose={() => setIsUnifiedReassessmentOpen(false)}
          caseItem={caseItem}
          patient={patient}
          caseGoals={caseGoals}
          caseSessions={caseSessions}
          caseAssessments={caseAssessments}
          outcomeMeasureDefinitions={outcomeMeasureDefinitions}
          allCaseMeasurements={allCaseMeasurements}
          onSaveRecord={saveProgressRecord}
          onSaveMeasurement={saveProgressMeasurement}
          onSaveGoal={saveClinicalGoal}
          onOpenCustomDefinition={() => setIsCustomMeasureModalOpen(true)}
        />
      )}

      {/* ========================================================
          MODAL 1: Create / Edit Progress Record
         ======================================================== */}
      {isRecordModalOpen && (
        <ProgressRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          recordToEdit={editingRecord}
          caseItem={caseItem}
          patient={patient}
          caseGoals={caseGoals}
          caseSessions={caseSessions}
          caseAssessments={caseAssessments}
          onSave={saveProgressRecord}
        />
      )}

      {/* ========================================================
          MODAL 2: Add / Edit Progress Measurement
         ======================================================== */}
      {isMeasurementModalOpen && measurementTargetRecordId && (
        <ProgressMeasurementModal
          isOpen={isMeasurementModalOpen}
          onClose={() => {
            setIsMeasurementModalOpen(false);
            setMeasurementTargetRecordId(null);
            setEditingMeasurement(null);
          }}
          progressRecordId={measurementTargetRecordId}
          measurementToEdit={editingMeasurement}
          caseItem={caseItem}
          patient={patient}
          caseGoals={caseGoals}
          outcomeMeasureDefinitions={outcomeMeasureDefinitions}
          onSave={saveProgressMeasurement}
          onOpenCustomDefinition={() => setIsCustomMeasureModalOpen(true)}
        />
      )}

      {/* ========================================================
          MODAL 3: Create Custom Outcome Measure Definition
         ======================================================== */}
      {isCustomMeasureModalOpen && (
        <CustomOutcomeMeasureModal
          isOpen={isCustomMeasureModalOpen}
          onClose={() => setIsCustomMeasureModalOpen(false)}
          onSave={saveOutcomeMeasureDefinition}
        />
      )}
    </section>
  );
};

// ============================================================
// SUB-COMPONENT: Progress Record Form Modal
// ============================================================
interface ProgressRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: ProgressRecord | null;
  caseItem: Case;
  patient: Patient;
  caseGoals: any[];
  caseSessions: any[];
  caseAssessments: any[];
  onSave: (data: any) => ProgressRecord;
}

const ProgressRecordModal: React.FC<ProgressRecordModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  caseItem,
  patient,
  caseGoals,
  caseSessions,
  caseAssessments,
  onSave,
}) => {
  const [recordDate, setRecordDate] = useState<string>(
    recordToEdit?.recordDate || new Date().toISOString().split('T')[0]
  );
  const [contextType, setContextType] = useState<ProgressRecordContextType>(
    recordToEdit?.contextType || 'routine_progress_review'
  );
  const [therapistSummary, setTherapistSummary] = useState<string>(
    recordToEdit?.therapistSummary || ''
  );
  const [clinicalInterpretation, setClinicalInterpretation] = useState<string>(
    recordToEdit?.clinicalInterpretation || ''
  );

  // Linkages
  const [linkedGoalId, setLinkedGoalId] = useState<string>(
    recordToEdit?.linkedGoalId || ''
  );
  const [linkedSessionId, setLinkedSessionId] = useState<string>(
    recordToEdit?.linkedSessionId || ''
  );
  const [linkedAssessmentId, setLinkedAssessmentId] = useState<string>(
    recordToEdit?.linkedAssessmentId || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapistSummary.trim()) {
      alert('Please enter a clinical progress summary.');
      return;
    }

    onSave({
      id: recordToEdit?.id,
      caseId: caseItem.id,
      patientId: patient.id,
      recordDate,
      contextType,
      therapistSummary: therapistSummary.trim(),
      clinicalInterpretation: clinicalInterpretation.trim() || undefined,
      linkedGoalId: linkedGoalId || undefined,
      linkedSessionId: linkedSessionId || undefined,
      linkedAssessmentId: linkedAssessmentId || undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#D5CEC2] rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-[#E5DFD4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1B3B2B]" />
            <h3 className="text-base font-serif font-medium text-[#1C201D]">
              {recordToEdit ? 'Edit Progress Review' : 'New Progress Review'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#676E68] hover:text-[#1C201D] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Review Date & Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#1C201D] block mb-1">
                Review Date *
              </label>
              <input
                type="date"
                required
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1C201D] block mb-1">
                Review Context Type *
              </label>
              <select
                value={contextType}
                onChange={(e) => setContextType(e.target.value as ProgressRecordContextType)}
                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              >
                {Object.entries(CONTEXT_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Factual Progress Summary */}
          <div>
            <label className="text-xs font-semibold text-[#1C201D] block mb-1">
              Factual Progress Summary *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g., Patient reports 40% reduction in night ache. Demonstrated improved knee flexion to 115° and independent sit-to-stand with minimal compensatory trunk lean."
              value={therapistSummary}
              onChange={(e) => setTherapistSummary(e.target.value)}
              className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2.5 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
            />
          </div>

          {/* Clinical Interpretation */}
          <div>
            <label className="text-xs font-semibold text-[#1C201D] block mb-1">
              Clinician Reasoning &amp; Interpretation (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Progress aligns with quadriceps hypertrophy timeline. Irritability remains low; ready to advance closed-chain loading."
              value={clinicalInterpretation}
              onChange={(e) => setClinicalInterpretation(e.target.value)}
              className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2.5 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
            />
          </div>

          {/* Relational References */}
          <div className="bg-[#F6F2EB] border border-[#E5DFD4] rounded-lg p-3.5 space-y-3">
            <span className="text-[11px] font-semibold text-[#3C443E] uppercase tracking-wider block">
              Link Clinical Context (Optional)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-[#5D645E] block mb-1">Related Goal</label>
                <select
                  value={linkedGoalId}
                  onChange={(e) => setLinkedGoalId(e.target.value)}
                  className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded p-1.5 text-[#1C201D]"
                >
                  <option value="">— None —</option>
                  {caseGoals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#5D645E] block mb-1">Related Session</label>
                <select
                  value={linkedSessionId}
                  onChange={(e) => setLinkedSessionId(e.target.value)}
                  className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded p-1.5 text-[#1C201D]"
                >
                  <option value="">— None —</option>
                  {caseSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      Session #{s.sessionNumber} ({s.sessionDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#5D645E] block mb-1">Related Assessment</label>
                <select
                  value={linkedAssessmentId}
                  onChange={(e) => setLinkedAssessmentId(e.target.value)}
                  className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded p-1.5 text-[#1C201D]"
                >
                  <option value="">— None —</option>
                  {caseAssessments.map((oa) => (
                    <option key={oa.id} value={oa.id}>
                      {oa.id.substring(0, 10)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5DFD4] flex items-center justify-end gap-2">
            <Button variant="secondary" size="md" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit">
              {recordToEdit ? 'Save Changes' : 'Record Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// SUB-COMPONENT: Progress Measurement Form Modal
// ============================================================
interface ProgressMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressRecordId: string;
  measurementToEdit: ProgressMeasurement | null;
  caseItem: Case;
  patient: Patient;
  caseGoals: any[];
  outcomeMeasureDefinitions: OutcomeMeasureDefinition[];
  onSave: (data: any) => ProgressMeasurement;
  onOpenCustomDefinition: () => void;
}

const ProgressMeasurementModal: React.FC<ProgressMeasurementModalProps> = ({
  isOpen,
  onClose,
  progressRecordId,
  measurementToEdit,
  caseItem,
  patient,
  caseGoals,
  outcomeMeasureDefinitions,
  onSave,
  onOpenCustomDefinition,
}) => {
  const [selectedDefId, setSelectedDefId] = useState<string>(
    measurementToEdit?.measureDefinitionId || ''
  );
  const [measureName, setMeasureName] = useState<string>(
    measurementToEdit?.measureName || ''
  );
  const [category, setCategory] = useState<string>(
    measurementToEdit?.category || 'pain'
  );
  const [valueType, setValueType] = useState<MeasurementValueType>(
    measurementToEdit?.valueType || 'numeric'
  );
  const [unit, setUnit] = useState<string>(measurementToEdit?.unit || '');
  const [stage, setStage] = useState<MeasurementStage>(
    measurementToEdit?.stage || 'interim'
  );

  const [numericValue, setNumericValue] = useState<string>(
    measurementToEdit?.numericValue !== undefined ? String(measurementToEdit.numericValue) : ''
  );
  const [textValue, setTextValue] = useState<string>(measurementToEdit?.textValue || '');

  const [linkedGoalId, setLinkedGoalId] = useState<string>(
    measurementToEdit?.linkedGoalId || ''
  );
  const [context, setContext] = useState<string>(measurementToEdit?.context || '');
  const [notes, setNotes] = useState<string>(measurementToEdit?.notes || '');

  // Update fields when selecting a preset definition
  const handleSelectDefinition = (defId: string) => {
    setSelectedDefId(defId);
    const def = outcomeMeasureDefinitions.find((d) => d.id === defId);
    if (def) {
      setMeasureName(def.name);
      setCategory(def.category);
      setValueType(def.valueType);
      setUnit(def.unit || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!measureName.trim()) {
      alert('Please select or enter a measurement name.');
      return;
    }

    const numVal = numericValue !== '' ? parseFloat(numericValue) : undefined;
    if (valueType !== 'text' && numericValue === '') {
      alert('Please enter a numeric measurement value.');
      return;
    }

    onSave({
      id: measurementToEdit?.id,
      progressRecordId,
      caseId: caseItem.id,
      patientId: patient.id,
      measureDefinitionId: selectedDefId || undefined,
      measureName: measureName.trim(),
      category: category.trim(),
      valueType,
      unit: unit.trim() || undefined,
      stage,
      numericValue: numVal,
      textValue: textValue.trim() || undefined,
      linkedGoalId: linkedGoalId || undefined,
      context: context.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#D5CEC2] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-[#E5DFD4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#1B3B2B]" />
            <h3 className="text-base font-serif font-medium text-[#1C201D]">
              {measurementToEdit ? 'Edit Measurement' : 'Log Measurement'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#676E68] hover:text-[#1C201D] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Definition Preset Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#1C201D]">
                Select Standard Measure Preset
              </label>
              <button
                type="button"
                onClick={onOpenCustomDefinition}
                className="text-[11px] text-[#1B3B2B] hover:underline flex items-center gap-1 font-medium"
              >
                + Define Custom Measure
              </button>
            </div>
            <select
              value={selectedDefId}
              onChange={(e) => handleSelectDefinition(e.target.value)}
              className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
            >
              <option value="">— Custom / Manual Entry —</option>
              {outcomeMeasureDefinitions.map((def) => (
                <option key={def.id} value={def.id}>
                  {def.name} ({def.unit || def.valueType})
                </option>
              ))}
            </select>
          </div>

          {/* Name & Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#1C201D] block mb-1">
                Measure Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Active Knee Flexion"
                value={measureName}
                onChange={(e) => setMeasureName(e.target.value)}
                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1C201D] block mb-1">
                Measurement Stage *
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as MeasurementStage)}
                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D]"
              >
                <option value="baseline">Baseline (Initial anchor)</option>
                <option value="interim">Interim (In-treatment progression)</option>
                <option value="reassessment">Formal Reassessment point</option>
                <option value="discharge">Discharge endpoint</option>
              </select>
            </div>
          </div>

          {/* Value & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[#1C201D] block mb-1">
                Numeric Value *
              </label>
              <input
                type="number"
                step="any"
                required={valueType !== 'text'}
                placeholder="e.g. 115"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] font-mono text-base"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1C201D] block mb-1">Unit</label>
              <input
                type="text"
                placeholder="e.g. °, /10, s, kg"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D]"
              />
            </div>
          </div>

          {/* Goal linkage */}
          <div>
            <label className="text-xs font-semibold text-[#1C201D] block mb-1">
              Link to Case Goal (Optional)
            </label>
            <select
              value={linkedGoalId}
              onChange={(e) => setLinkedGoalId(e.target.value)}
              className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D]"
            >
              <option value="">— No linked goal —</option>
              {caseGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} ({g.type})
                </option>
              ))}
            </select>
          </div>

          {/* Context / Method */}
          <div>
            <label className="text-xs font-semibold text-[#1C201D] block mb-1">
              Method / Context (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Measured in supine with long-arm goniometer, warm-up performed"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D]"
            />
          </div>

          <div className="pt-3 border-t border-[#E5DFD4] flex items-center justify-end gap-2">
            <Button variant="secondary" size="md" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit">
              {measurementToEdit ? 'Update Measurement' : 'Save Measurement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// SUB-COMPONENT: Custom Outcome Measure Definition Modal
// ============================================================
interface CustomOutcomeMeasureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => OutcomeMeasureDefinition;
}

const CustomOutcomeMeasureModal: React.FC<CustomOutcomeMeasureModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<OutcomeMeasureDefinition['category']>('custom');
  const [valueType, setValueType] = useState<MeasurementValueType>('numeric');
  const [unit, setUnit] = useState('');
  const [directionMeaning, setDirectionMeaning] =
    useState<OutcomeMeasureDefinition['directionMeaning']>('higher_is_better');
  const [shortDescription, setShortDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      category,
      valueType,
      unit: unit.trim() || undefined,
      directionMeaning,
      shortDescription: shortDescription.trim() || undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#D5CEC2] rounded-xl shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-[#E5DFD4] flex items-center justify-between">
          <h3 className="text-sm font-serif font-medium text-[#1C201D]">
            Define Custom Outcome Measure
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#676E68] hover:text-[#1C201D] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#1C201D] block mb-1">
              Measure Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Heel-to-Buttock Distance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-[#1C201D] block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded p-1.5"
              >
                <option value="pain">Pain</option>
                <option value="range_of_motion">Range of Motion</option>
                <option value="strength">Strength</option>
                <option value="functional_mobility">Functional Mobility</option>
                <option value="exercise_tolerance">Exercise Tolerance</option>
                <option value="patient_reported">Patient Reported</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1C201D] block mb-1">Unit</label>
              <input
                type="text"
                placeholder="cm, s, kg, pts"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded p-1.5"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1C201D] block mb-1">
              Direction Meaning
            </label>
            <select
              value={directionMeaning}
              onChange={(e) => setDirectionMeaning(e.target.value as any)}
              className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded p-1.5"
            >
              <option value="higher_is_better">Higher value represents improvement</option>
              <option value="lower_is_better">Lower value represents improvement</option>
              <option value="not_defined">Direction not clinically defined</option>
            </select>
          </div>

          <div className="pt-3 border-t border-[#E5DFD4] flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
