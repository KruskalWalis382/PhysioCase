import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Activity,
  Layers,
  Calendar,
  X,
  Plus,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  Case,
  Patient,
  ClinicalGoal,
  ClinicalGoalStatus,
  ClinicalSession,
  ObjectiveAssessment,
  OutcomeMeasureDefinition,
  ProgressMeasurement,
  ProgressRecord,
  MeasurementValueType,
} from '../../types';
import { calculateSafeChange } from '../../utils/clinicalProgress';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface UnifiedReassessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: Case;
  patient: Patient;
  caseGoals: ClinicalGoal[];
  caseSessions: ClinicalSession[];
  caseAssessments: ObjectiveAssessment[];
  outcomeMeasureDefinitions: OutcomeMeasureDefinition[];
  allCaseMeasurements: ProgressMeasurement[];
  onSaveRecord: (data: any) => ProgressRecord;
  onSaveMeasurement: (data: any) => ProgressMeasurement;
  onSaveGoal?: (data: any) => ClinicalGoal;
  onOpenCustomDefinition?: () => void;
}

interface ReassessmentMeasureRow {
  key: string;
  definitionId?: string;
  measureName: string;
  category: string;
  valueType: MeasurementValueType;
  unit?: string;
  baselineScore?: number | string;
  baselineDate?: string;
  numericInput: string;
  textInput: string;
  contextInput: string;
  notesInput: string;
  isIncluded: boolean;
}

interface GoalReviewItem {
  status: ClinicalGoalStatus;
  notes: string;
  modified: boolean;
}

const GOAL_STATUS_OPTIONS: { value: ClinicalGoalStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'met', label: 'Achieved' },
  { value: 'partially_met', label: 'Partially Achieved' },
  { value: 'not_met', label: 'Not Achieved' },
  { value: 'discontinued', label: 'Discontinued' },
];

export const UnifiedReassessmentModal: React.FC<UnifiedReassessmentModalProps> = ({
  isOpen,
  onClose,
  caseItem,
  patient,
  caseGoals,
  caseSessions,
  caseAssessments,
  outcomeMeasureDefinitions,
  allCaseMeasurements,
  onSaveRecord,
  onSaveMeasurement,
  onSaveGoal,
  onOpenCustomDefinition,
}) => {
  const [recordDate, setRecordDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );
  const [therapistSummary, setTherapistSummary] = useState('');
  const [clinicalInterpretation, setClinicalInterpretation] = useState('');
  const [linkedSessionId, setLinkedSessionId] = useState('');
  const [linkedAssessmentId, setLinkedAssessmentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Active goals list (non-discontinued by default)
  const activeCaseGoals = useMemo(
    () => caseGoals.filter((g) => g.status !== 'discontinued'),
    [caseGoals]
  );

  // Goal review local state map: [goalId] -> { status, notes, modified }
  const [goalReviews, setGoalReviews] = useState<
    Record<string, { status: ClinicalGoalStatus; notes: string; modified: boolean }>
  >({});

  // Initialize goal review state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialMap: Record<
        string,
        { status: ClinicalGoalStatus; notes: string; modified: boolean }
      > = {};
      caseGoals.forEach((g) => {
        initialMap[g.id] = {
          status: g.status,
          notes: g.therapistNotes || '',
          modified: false,
        };
      });
      setGoalReviews(initialMap);
      setRecordDate(new Date().toISOString().split('T')[0]);
      setTherapistSummary('');
      setClinicalInterpretation('');
      setLinkedSessionId('');
      setLinkedAssessmentId('');
      setFormError(null);
    }
  }, [isOpen, caseGoals]);

  // Derive previously captured measures in this case
  const previousMeasuresList = useMemo(() => {
    const map = new Map<string, ProgressMeasurement[]>();
    allCaseMeasurements.forEach((m) => {
      const key = m.measureName.trim().toLowerCase();
      const existing = map.get(key) || [];
      existing.push(m);
      map.set(key, existing);
    });

    const rows: ReassessmentMeasureRow[] = [];
    map.forEach((measureList, key) => {
      // Sort chronologically
      const sorted = [...measureList].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const baseline = sorted.find((m) => m.stage === 'baseline') || sorted[0];
      const latest = sorted[sorted.length - 1];

      rows.push({
        key,
        definitionId: latest.measureDefinitionId,
        measureName: latest.measureName,
        category: latest.category,
        valueType: latest.valueType,
        unit: latest.unit,
        baselineScore: baseline ? (baseline.numericValue ?? baseline.textValue) : undefined,
        baselineDate: baseline ? baseline.createdAt.split('T')[0] : undefined,
        numericInput: '',
        textInput: '',
        contextInput: '',
        notesInput: '',
        isIncluded: true,
      });
    });

    return rows;
  }, [allCaseMeasurements]);

  const [measureRows, setMeasureRows] = useState<ReassessmentMeasureRow[]>([]);
  const [selectedNewDefId, setSelectedNewDefId] = useState('');

  // Synchronize measure rows when modal opens or previousMeasuresList changes
  useEffect(() => {
    if (isOpen) {
      setMeasureRows(previousMeasuresList);
      setSelectedNewDefId('');
    }
  }, [isOpen, previousMeasuresList]);

  // Handle adding an unlisted measure from definitions
  const handleAddDefinitionToReassessment = () => {
    if (!selectedNewDefId) return;
    const def = outcomeMeasureDefinitions.find((d) => d.id === selectedNewDefId);
    if (!def) return;

    // Check if already in measureRows
    const alreadyPresent = measureRows.some(
      (r) => r.measureName.toLowerCase() === def.name.toLowerCase()
    );
    if (alreadyPresent) {
      // Just ensure it's marked as included
      setMeasureRows((prev) =>
        prev.map((r) =>
          r.measureName.toLowerCase() === def.name.toLowerCase()
            ? { ...r, isIncluded: true }
            : r
        )
      );
      setSelectedNewDefId('');
      return;
    }

    const newRow: ReassessmentMeasureRow = {
      key: `custom_${Date.now()}_${def.name.toLowerCase()}`,
      definitionId: def.id,
      measureName: def.name,
      category: def.category,
      valueType: def.valueType,
      unit: def.unit,
      baselineScore: undefined,
      baselineDate: undefined,
      numericInput: '',
      textInput: '',
      contextInput: '',
      notesInput: '',
      isIncluded: true,
    };

    setMeasureRows((prev) => [...prev, newRow]);
    setSelectedNewDefId('');
  };

  const handleUpdateMeasureRow = (
    key: string,
    updates: Partial<ReassessmentMeasureRow>
  ) => {
    setMeasureRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...updates } : r))
    );
  };

  const handleGoalStatusChange = (goalId: string, newStatus: ClinicalGoalStatus) => {
    setGoalReviews((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        status: newStatus,
        modified: true,
      },
    }));
  };

  const handleGoalNotesChange = (goalId: string, newNotes: string) => {
    setGoalReviews((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        notes: newNotes,
        modified: true,
      },
    }));
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapistSummary.trim()) {
      setFormError('Clinical Progress Summary is required for a formal reassessment.');
      return;
    }

    try {
      // 1. Save ProgressRecord with contextType = 'reassessment'
      const newRecord = onSaveRecord({
        caseId: caseItem.id,
        patientId: patient.id,
        recordDate,
        contextType: 'reassessment',
        therapistSummary: therapistSummary.trim(),
        clinicalInterpretation: clinicalInterpretation.trim() || undefined,
        linkedSessionId: linkedSessionId || undefined,
        linkedAssessmentId: linkedAssessmentId || undefined,
      });

      // 2. Save any measurements entered with a value
      measureRows.forEach((row) => {
        if (!row.isIncluded) return;

        const hasNumeric =
          row.valueType !== 'text' &&
          row.numericInput !== '' &&
          !isNaN(Number(row.numericInput));
        const hasText = row.textInput.trim().length > 0;

        if (hasNumeric || hasText) {
          onSaveMeasurement({
            progressRecordId: newRecord.id,
            caseId: caseItem.id,
            patientId: patient.id,
            measureDefinitionId: row.definitionId,
            measureName: row.measureName.trim(),
            category: row.category,
            valueType: row.valueType,
            unit: row.unit,
            stage: 'reassessment',
            numericValue: hasNumeric ? Number(row.numericInput) : undefined,
            textValue: hasText ? row.textInput.trim() : undefined,
            context: row.contextInput.trim() || undefined,
            notes: row.notesInput.trim() || undefined,
          });
        }
      });

      // 3. Update modified goals
      if (onSaveGoal) {
        (Object.entries(goalReviews) as [string, GoalReviewItem][]).forEach(([goalId, review]) => {
          if (review.modified) {
            const originalGoal = caseGoals.find((g) => g.id === goalId);
            if (originalGoal) {
              onSaveGoal({
                id: originalGoal.id,
                caseId: originalGoal.caseId,
                patientId: originalGoal.patientId,
                title: originalGoal.title,
                type: originalGoal.type,
                status: review.status,
                therapistNotes: review.notes.trim() || undefined,
              });
            }
          }
        });
      }

      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save reassessment record.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unified-reassessment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-[#FAF8F5] border border-[#D5CEC2] rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E5DFD4] bg-[#FFFFFF] rounded-t-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3EE] text-[#1B3B2B] border border-[#C8DDD0] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="unified-reassessment-modal-title"
                  className="text-base font-serif font-semibold text-[#1C201D]"
                >
                  Clinical Reassessment
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#1B3B2B] text-[#FAF8F5]">
                  Interval Checkpoint
                </span>
              </div>
              <p className="text-xs text-[#5D645E] mt-0.5">
                Episode: <span className="font-semibold text-[#1C201D]">{caseItem.caseName}</span> • Patient:{' '}
                <span className="font-semibold text-[#1C201D]">{patient.fullName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            id="reassessment-modal-close-btn"
            onClick={onClose}
            aria-label="Close reassessment modal"
            className="p-1.5 text-[#676E68] hover:text-[#1C201D] hover:bg-[#F2ECE1] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {formError && (
            <div
              id="reassessment-form-error"
              className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-lg text-xs font-medium"
            >
              {formError}
            </div>
          )}

          {/* ========================================================
              SECTION 1: REASSESSMENT CONTEXT & REVIEW DATE
             ======================================================== */}
          <section className="bg-[#FFFFFF] border border-[#E5DFD4] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F0EBE1]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1B3B2B]" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C201D]">
                  1. Review Details &amp; Context
                </h4>
              </div>
              <span className="text-[11px] font-mono text-[#676E68]">
                Context: Formal Reassessment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="reassessment-date-input"
                  className="text-xs font-semibold text-[#1C201D] block mb-1"
                >
                  Review Date *
                </label>
                <input
                  id="reassessment-date-input"
                  type="date"
                  required
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full text-xs bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              <div>
                <label
                  htmlFor="reassessment-session-select"
                  className="text-xs font-semibold text-[#1C201D] block mb-1"
                >
                  Linked Clinical Session
                </label>
                <select
                  id="reassessment-session-select"
                  value={linkedSessionId}
                  onChange={(e) => setLinkedSessionId(e.target.value)}
                  className="w-full text-xs bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                >
                  <option value="">None / Standalone Reassessment</option>
                  {caseSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      Session #{s.sessionNumber} ({s.sessionDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reassessment-assessment-select"
                  className="text-xs font-semibold text-[#1C201D] block mb-1"
                >
                  Linked Examination Baseline
                </label>
                <select
                  id="reassessment-assessment-select"
                  value={linkedAssessmentId}
                  onChange={(e) => setLinkedAssessmentId(e.target.value)}
                  className="w-full text-xs bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                >
                  <option value="">None / Routine</option>
                  {caseAssessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      Objective Exam ({a.id.substring(0, 8)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ========================================================
              SECTION 2: CLINICAL PROGRESS & REASONING SUMMARY
             ======================================================== */}
          <section className="bg-[#FFFFFF] border border-[#E5DFD4] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="pb-2.5 border-b border-[#F0EBE1]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1B3B2B]" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C201D]">
                  2. Clinical Progress &amp; Interpretation
                </h4>
              </div>
              <p className="text-[11px] text-[#676E68] mt-0.5">
                Document observed interval progress, functional changes, and clinical reasoning.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="reassessment-summary-input"
                  className="text-xs font-semibold text-[#1C201D] block mb-1"
                >
                  Factual Progress Summary *
                </label>
                <textarea
                  id="reassessment-summary-input"
                  required
                  rows={3}
                  value={therapistSummary}
                  onChange={(e) => setTherapistSummary(e.target.value)}
                  placeholder="e.g. Patient reports pain frequency reduced from constant to intermittent. Able to walk 25 minutes prior to onset of symptoms..."
                  className="w-full text-xs bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg p-2.5 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] leading-relaxed"
                />
              </div>

              <div>
                <label
                  htmlFor="reassessment-interpretation-input"
                  className="text-xs font-semibold text-[#1C201D] block mb-1"
                >
                  Therapist Clinical Reasoning &amp; Interpretation{' '}
                  <span className="text-[11px] font-normal text-[#676E68]">(Optional)</span>
                </label>
                <textarea
                  id="reassessment-interpretation-input"
                  rows={2}
                  value={clinicalInterpretation}
                  onChange={(e) => setClinicalInterpretation(e.target.value)}
                  placeholder="e.g. Directional loading response confirms extension bias. Neural mechanosensitivity improving. Plan progression of loading volume..."
                  className="w-full text-xs bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg p-2.5 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] leading-relaxed"
                />
              </div>
            </div>
          </section>

          {/* ========================================================
              SECTION 3: OUTCOME MEASUREMENTS (Interval Re-evaluation)
             ======================================================== */}
          <section className="bg-[#FFFFFF] border border-[#E5DFD4] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#F0EBE1]">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#1B3B2B]" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C201D]">
                    3. Outcome Measurements (Reassessment Stage)
                  </h4>
                </div>
                <p className="text-[11px] text-[#676E68] mt-0.5">
                  Record re-test scores directly against established baseline values.
                </p>
              </div>

              {/* Add unlisted measure selector */}
              <div className="flex items-center gap-2">
                <select
                  id="reassessment-add-measure-select"
                  aria-label="Select outcome measure definition to add"
                  value={selectedNewDefId}
                  onChange={(e) => setSelectedNewDefId(e.target.value)}
                  className="text-xs bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg px-2.5 py-1.5 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                >
                  <option value="">+ Add Outcome Measure...</option>
                  {outcomeMeasureDefinitions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
                <Button
                  id="reassessment-add-measure-btn"
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!selectedNewDefId}
                  onClick={handleAddDefinitionToReassessment}
                >
                  Add
                </Button>
                {onOpenCustomDefinition && (
                  <button
                    type="button"
                    onClick={onOpenCustomDefinition}
                    className="text-[11px] text-[#1B3B2B] hover:underline font-semibold cursor-pointer shrink-0"
                  >
                    + Define Custom
                  </button>
                )}
              </div>
            </div>

            {measureRows.length === 0 ? (
              <p className="text-xs text-[#676E68] italic py-2">
                No previous measures recorded for this case. Use the dropdown above to add an outcome measure to this reassessment.
              </p>
            ) : (
              <div className="space-y-3">
                {measureRows.map((row) => {
                  const baselineNumeric =
                    typeof row.baselineScore === 'number'
                      ? row.baselineScore
                      : undefined;
                  const currentNum =
                    row.numericInput !== '' ? Number(row.numericInput) : undefined;
                  const deltaResult =
                    baselineNumeric !== undefined &&
                    currentNum !== undefined &&
                    !isNaN(currentNum)
                      ? calculateSafeChange(baselineNumeric, currentNum, row.unit)
                      : null;

                  return (
                    <div
                      key={row.key}
                      className={`border rounded-lg p-3.5 transition-colors ${
                        row.isIncluded
                          ? 'bg-[#FAF8F5] border-[#D5CEC2]'
                          : 'bg-[#F2ECE1]/40 border-[#E5DFD4] opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8E2D8]">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.isIncluded}
                              onChange={(e) =>
                                handleUpdateMeasureRow(row.key, {
                                  isIncluded: e.target.checked,
                                })
                              }
                              className="rounded border-[#D5CEC2] text-[#1B3B2B] focus:ring-[#1B3B2B]"
                            />
                            <span className="text-xs font-semibold text-[#1C201D]">
                              {row.measureName}
                            </span>
                          </label>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#ECE7DE] text-[#555C56]">
                            {row.category.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Factual Baseline Anchor Reference */}
                        <div className="text-[11px] text-[#5D645E]">
                          {row.baselineScore !== undefined ? (
                            <span>
                              <strong>Baseline:</strong> {row.baselineScore} {row.unit || ''}{' '}
                              {row.baselineDate && `(${row.baselineDate})`}
                            </span>
                          ) : (
                            <span className="italic">No prior baseline recorded</span>
                          )}
                        </div>
                      </div>

                      {row.isIncluded && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2.5 items-end">
                          {/* Value Input */}
                          <div className="sm:col-span-4">
                            <label className="text-[11px] font-medium text-[#3C443E] block mb-1">
                              Reassessment Value {row.unit ? `(${row.unit})` : ''}
                            </label>
                            {row.valueType === 'text' ? (
                              <input
                                type="text"
                                value={row.textInput}
                                onChange={(e) =>
                                  handleUpdateMeasureRow(row.key, {
                                    textInput: e.target.value,
                                  })
                                }
                                placeholder="Enter qualitative score..."
                                className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                              />
                            ) : (
                              <div className="relative">
                                <input
                                  type="number"
                                  step="any"
                                  value={row.numericInput}
                                  onChange={(e) =>
                                    handleUpdateMeasureRow(row.key, {
                                      numericInput: e.target.value,
                                    })
                                  }
                                  placeholder={
                                    row.baselineScore !== undefined
                                      ? `Prev: ${row.baselineScore}`
                                      : 'Enter score...'
                                  }
                                  className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                                />
                                {row.unit && (
                                  <span className="absolute right-2.5 top-2 text-[10px] text-[#676E68]">
                                    {row.unit}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Raw Mathematical Delta Display (Neutral, factual) */}
                          <div className="sm:col-span-3">
                            <label className="text-[11px] font-medium text-[#3C443E] block mb-1">
                              Net Change vs Baseline
                            </label>
                            <div className="text-xs font-mono p-2 bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg text-[#1C201D] min-h-[34px] flex items-center">
                              {deltaResult ? (
                                <span>Δ {deltaResult.formattedChangeText}</span>
                              ) : (
                                <span className="text-[#848B85] italic text-[10px]">
                                  {row.baselineScore !== undefined
                                    ? 'Awaiting value'
                                    : 'Baseline reference only'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Testing Context & Notes */}
                          <div className="sm:col-span-5">
                            <label className="text-[11px] font-medium text-[#3C443E] block mb-1">
                              Testing Context / Procedure Note
                            </label>
                            <input
                              type="text"
                              value={row.contextInput}
                              onChange={(e) =>
                                handleUpdateMeasureRow(row.key, {
                                  contextInput: e.target.value,
                                })
                              }
                              placeholder="e.g. Active sitting, painful arc noted..."
                              className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg p-2 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ========================================================
              SECTION 4: GOAL REVIEW (Checkpoint Evaluation)
             ======================================================== */}
          <section className="bg-[#FFFFFF] border border-[#E5DFD4] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="pb-2.5 border-b border-[#F0EBE1]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#1B3B2B]" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C201D]">
                  4. Clinical Goal Review Checkpoint
                </h4>
              </div>
              <p className="text-[11px] text-[#676E68] mt-0.5">
                Evaluate active case goals in conjunction with reassessment findings. Clinician assigns status manually.
              </p>
            </div>

            {activeCaseGoals.length === 0 ? (
              <p className="text-xs text-[#676E68] italic py-2">
                No active clinical goals recorded for this case. Goals can be formulated in the Goal Setting section.
              </p>
            ) : (
              <div className="space-y-3">
                {activeCaseGoals.map((goal) => {
                  const currentReview = goalReviews[goal.id] || {
                    status: goal.status,
                    notes: goal.therapistNotes || '',
                    modified: false,
                  };

                  return (
                    <div
                      key={goal.id}
                      className="bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#E8E2D8] text-[#3C443E]">
                              {goal.type === 'short_term' ? 'Short-Term' : 'Long-Term'}
                            </span>
                            <span className="text-xs font-semibold text-[#1C201D]">
                              {goal.title}
                            </span>
                          </div>
                          {goal.targetValue && (
                            <p className="text-[11px] text-[#5D645E] mt-1">
                              <strong>Target:</strong> {goal.targetValue}{' '}
                              {goal.targetDate && `(By ${formatClinicalDate(goal.targetDate)})`}
                            </p>
                          )}
                        </div>

                        {/* Status Selector Pills */}
                        <div className="flex flex-wrap gap-1">
                          {GOAL_STATUS_OPTIONS.map((opt) => {
                            const isSelected = currentReview.status === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleGoalStatusChange(goal.id, opt.value)}
                                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#1B3B2B] text-[#FAF8F5] shadow-xs'
                                    : 'bg-[#FFFFFF] text-[#3C443E] border border-[#D5CEC2] hover:bg-[#F2ECE1]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Therapist Goal Review Note */}
                      <div>
                        <input
                          type="text"
                          value={currentReview.notes}
                          onChange={(e) => handleGoalNotesChange(goal.id, e.target.value)}
                          placeholder="Reassessment note on goal progression (e.g. 80% achieved, independent with home program)..."
                          className="w-full text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-lg px-2.5 py-1.5 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-[#E5DFD4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-[#676E68]">
              Saving will create a formal progress review and log interval outcome measurements under this case.
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                id="reassessment-cancel-btn"
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                id="reassessment-save-btn"
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save Reassessment
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
