import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Link2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Archive,
  X,
  FileText,
  Activity,
} from 'lucide-react';
import { useClinical } from '../../context/ClinicalContext';
import {
  ClinicalGoal,
  ClinicalGoalStatus,
  ClinicalGoalType,
  ClinicalProblem,
} from '../../types';
import {
  CLINICAL_GOAL_STATUS_CONFIG,
  CLINICAL_GOAL_TYPE_CONFIG,
  createEmptyClinicalGoal,
} from '../../utils/clinicalGoals';
import { CLINICAL_PROBLEM_STATUS_CONFIG } from '../../utils/clinicalProblems';

interface GoalSettingSectionProps {
  caseId: string;
  patientId: string;
}

export const GoalSettingSection: React.FC<GoalSettingSectionProps> = ({
  caseId,
  patientId,
}) => {
  const {
    getClinicalGoalsForCase,
    saveClinicalGoal,
    updateClinicalGoalStatus,
    deleteClinicalGoal,
    getClinicalProblemsForCase,
  } = useClinical();

  // Active goals and problems for this case
  const caseGoals = getClinicalGoalsForCase(caseId);
  const caseProblems = getClinicalProblemsForCase(caseId);

  // Filter & view states
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | ClinicalGoalType>('all');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [isProblemsPanelOpen, setIsProblemsPanelOpen] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ClinicalGoal | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<ClinicalGoalType>('short_term');
  const [formLinkedProblemIds, setFormLinkedProblemIds] = useState<string[]>([]);
  const [formTargetValue, setFormTargetValue] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formStatus, setFormStatus] = useState<ClinicalGoalStatus>('active');
  const [formTherapistNotes, setFormTherapistNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Segregate active vs discontinued goals
  const activeGoals = useMemo(
    () => caseGoals.filter((g) => g.status !== 'discontinued'),
    [caseGoals]
  );
  const discontinuedGoals = useMemo(
    () => caseGoals.filter((g) => g.status === 'discontinued'),
    [caseGoals]
  );

  const displayedGoals = useMemo(() => {
    let list = showDiscontinued ? caseGoals : activeGoals;
    if (selectedTypeFilter !== 'all') {
      list = list.filter((g) => g.type === selectedTypeFilter);
    }
    return list;
  }, [caseGoals, activeGoals, showDiscontinued, selectedTypeFilter]);

  // Open Create Modal
  const handleOpenCreateModal = (defaultType: ClinicalGoalType = 'short_term') => {
    const empty = createEmptyClinicalGoal(caseId, patientId, defaultType);
    setEditingGoal(empty);
    setFormTitle('');
    setFormDescription('');
    setFormType(defaultType);
    setFormLinkedProblemIds([]);
    setFormTargetValue('');
    setFormTargetDate('');
    setFormStatus('active');
    setFormTherapistNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (goal: ClinicalGoal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDescription(goal.description || '');
    setFormType(goal.type);
    setFormLinkedProblemIds(goal.linkedProblemIds || []);
    setFormTargetValue(goal.targetValue || '');
    setFormTargetDate(goal.targetDate || '');
    setFormStatus(goal.status);
    setFormTherapistNotes(goal.therapistNotes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save Goal
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Goal title is required.');
      return;
    }

    saveClinicalGoal({
      id: editingGoal?.id,
      caseId,
      patientId,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      type: formType,
      linkedProblemIds: formLinkedProblemIds,
      targetValue: formTargetValue.trim() || undefined,
      targetDate: formTargetDate || undefined,
      status: formStatus,
      therapistNotes: formTherapistNotes.trim() || undefined,
    });

    setIsModalOpen(false);
    setEditingGoal(null);
  };

  // Toggle problem link in form
  const handleToggleProblemLink = (problemId: string) => {
    setFormLinkedProblemIds((prev) =>
      prev.includes(problemId)
        ? prev.filter((id) => id !== problemId)
        : [...prev, problemId]
    );
  };

  return (
    <section
      id="section-clinical-goals"
      className="bg-[#FDFCFA] border border-[#E3DDD2] rounded-xl p-5 md:p-6 shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBE5DA] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#EBF2EE] text-[#1B3B2B] border border-[#CAD8D0]">
              <Target className="w-3 h-3 text-[#1B3B2B]" />
              Stage 4A • Goals & Functional Outcomes
            </span>
            <span className="text-xs text-[#7A817B]">
              Active Clinical Stage
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#18201C] tracking-tight">
            Goals
          </h2>
          <p className="text-xs sm:text-sm text-[#525953] max-w-2xl">
            Define the changes you and the patient are working toward.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => handleOpenCreateModal('short_term')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1B3B2B] text-[#FAF8F5] hover:bg-[#254F3A] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Goal
          </button>
        </div>
      </div>

      {/* Clinical Problems Reference Panel */}
      <div className="border border-[#E5DFD4] rounded-lg bg-[#FAF8F5] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsProblemsPanelOpen(!isProblemsPanelOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F4EFEB] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#1B3B2B]" />
            <div>
              <span className="text-xs font-semibold text-[#18201C] uppercase tracking-wider">
                Formulated Clinical Problems Reference
              </span>
              <span className="ml-2 text-xs text-[#636A64]">
                ({caseProblems.length} available)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#636A64]">
            <span>{isProblemsPanelOpen ? 'Hide' : 'Show'} Reference</span>
            {isProblemsPanelOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {isProblemsPanelOpen && (
          <div className="px-4 py-3.5 border-t border-[#E5DFD4] bg-[#FDFCFA] space-y-3">
            <p className="text-[11px] text-[#636A64] leading-relaxed">
              Use these clinical problems to anchor patient-centered functional goals. Problems are not automatically linked; select which problems apply when formulating each goal.
            </p>

            {caseProblems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {caseProblems.map((problem, pIdx) => {
                  const statusConf =
                    CLINICAL_PROBLEM_STATUS_CONFIG[problem.status];
                  return (
                    <div
                      key={problem.id || `ref-problem-${pIdx}`}
                      className="p-2.5 rounded-lg border border-[#EBE5DA] bg-[#FAF8F5] flex flex-col justify-between gap-1.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-[#18201C] line-clamp-1">
                            {problem.title}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusConf.badgeClass} shrink-0`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusConf.dotClass}`}
                            />
                            {statusConf.label}
                          </span>
                        </div>
                        {problem.description && (
                          <p className="text-[11px] text-[#636A64] line-clamp-1">
                            {problem.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#7A817B]">
                        <Link2 className="w-3 h-3" />
                        <span>
                          {problem.linkedFindingIds?.length || 0} linked finding
                          {problem.linkedFindingIds?.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-dashed border-[#DDD6CB] bg-[#FAF8F5] text-xs text-[#636A64] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#8C5E1A] shrink-0" />
                <span>
                  No clinical problems have been formulated yet. You can still formulate goals now, and link them to clinical problems at any time.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goal Filter & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Classification Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#E5DFD4] rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              selectedTypeFilter === 'all'
                ? 'bg-[#1B3B2B] text-[#FAF8F5]'
                : 'text-[#525953] hover:text-[#18201C]'
            }`}
          >
            All Goals ({displayedGoals.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('short_term')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              selectedTypeFilter === 'short_term'
                ? 'bg-[#1B3B2B] text-[#FAF8F5]'
                : 'text-[#525953] hover:text-[#18201C]'
            }`}
          >
            Short-Term
          </button>
          <button
            type="button"
            onClick={() => setSelectedTypeFilter('long_term')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              selectedTypeFilter === 'long_term'
                ? 'bg-[#1B3B2B] text-[#FAF8F5]'
                : 'text-[#525953] hover:text-[#18201C]'
            }`}
          >
            Long-Term
          </button>
        </div>

        {/* Toggle Discontinued */}
        {discontinuedGoals.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDiscontinued(!showDiscontinued)}
            className="inline-flex items-center gap-1.5 text-xs text-[#636A64] hover:text-[#18201C] transition-colors self-start sm:self-auto"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>
              {showDiscontinued ? 'Hide' : 'Show'} discontinued goals (
              {discontinuedGoals.length})
            </span>
          </button>
        )}
      </div>

      {/* Goals List */}
      {displayedGoals.length > 0 ? (
        <div className="space-y-3.5">
          {displayedGoals.map((goal, goalIdx) => {
            const statusConfig = CLINICAL_GOAL_STATUS_CONFIG[goal.status];
            const typeConfig = CLINICAL_GOAL_TYPE_CONFIG[goal.type];

            // Resolve linked clinical problems safely
            const uniqueProblemIds = Array.from(
              new Set(goal.linkedProblemIds || [])
            );
            const linkedProblems = uniqueProblemIds
              .map((pId) => caseProblems.find((cp) => cp.id === pId))
              .filter((p): p is ClinicalProblem => p !== undefined);

            const goalKey = goal.id || `goal-${goalIdx}`;

            return (
              <div
                key={goalKey}
                className="p-4 rounded-xl border border-[#E5DFD4] bg-[#FAF8F5] hover:border-[#CAD8D0] transition-colors space-y-3.5"
              >
                {/* Top Row: Type, Status & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Goal Type Badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${typeConfig.badgeClass}`}
                    >
                      {typeConfig.label}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.badgeClass}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}
                      />
                      {statusConfig.label}
                    </span>

                    {/* Achieved Timestamp Note */}
                    {goal.achievedAt && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#2E6B4D]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Achieved{' '}
                        {new Date(goal.achievedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Quick status dropdown */}
                    <select
                      value={goal.status}
                      onChange={(e) =>
                        updateClinicalGoalStatus(
                          goal.id,
                          e.target.value as ClinicalGoalStatus
                        )
                      }
                      className="text-xs bg-white border border-[#DDD6CB] rounded-md px-2 py-1 text-[#353C37] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    >
                      <option value="active">Active</option>
                      <option value="partially_met">Partially Met</option>
                      <option value="met">Met</option>
                      <option value="not_met">Not Met</option>
                      <option value="discontinued">Discontinued</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(goal)}
                      className="p-1.5 text-[#636A64] hover:text-[#18201C] rounded-md hover:bg-[#EBE5DA] transition-colors"
                      title="Edit Goal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete goal "${goal.title}"? This cannot be undone.`
                          )
                        ) {
                          deleteClinicalGoal(goal.id);
                        }
                      }}
                      className="p-1.5 text-[#636A64] hover:text-[#991B1B] rounded-md hover:bg-[#FDF2F2] transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-semibold text-[#18201C] leading-snug">
                    {goal.title}
                  </h4>
                  {goal.description && (
                    <p className="text-xs text-[#525953] leading-relaxed">
                      {goal.description}
                    </p>
                  )}
                </div>

                {/* Target Value & Date row */}
                {(goal.targetValue || goal.targetDate) && (
                  <div className="flex items-center gap-4 flex-wrap text-xs text-[#353C37] bg-[#FDFCFA] border border-[#EBE5DA] px-3 py-2 rounded-lg">
                    {goal.targetValue && (
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#1B3B2B]" />
                        <span className="text-[#636A64]">Target:</span>
                        <span className="font-medium text-[#18201C]">
                          {goal.targetValue}
                        </span>
                      </div>
                    )}
                    {goal.targetDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#1B3B2B]" />
                        <span className="text-[#636A64]">Target Date:</span>
                        <span className="font-medium text-[#18201C]">
                          {new Date(goal.targetDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Linked Clinical Problems */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#525953] uppercase tracking-wider">
                    <Link2 className="w-3 h-3 text-[#1B3B2B]" />
                    <span>Linked Clinical Problems ({linkedProblems.length})</span>
                  </div>

                  {linkedProblems.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {linkedProblems.map((prob, probIdx) => {
                        const probStatus =
                          CLINICAL_PROBLEM_STATUS_CONFIG[prob.status];
                        return (
                          <div
                            key={
                              prob.id
                                ? `${goalKey}-prob-${prob.id}`
                                : `${goalKey}-prob-idx-${probIdx}`
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FDFCFA] border border-[#E0D9CD] text-xs text-[#18201C]"
                          >
                            <span className="font-medium">{prob.title}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-medium border ${probStatus.badgeClass}`}
                            >
                              {probStatus.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#7A817B] italic">
                      No clinical problems currently linked.
                    </p>
                  )}
                </div>

                {/* Therapist Notes */}
                {goal.therapistNotes && (
                  <div className="bg-[#FDFCFA] border-l-2 border-[#1B3B2B] p-2.5 rounded-r-md space-y-0.5">
                    <span className="text-[10px] font-semibold text-[#636A64] uppercase tracking-wider block">
                      Therapist Notes
                    </span>
                    <p className="text-xs text-[#353C37] leading-relaxed">
                      {goal.therapistNotes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 rounded-xl border border-dashed border-[#DDD6CB] bg-[#FAF8F5] text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#EBF2EE] text-[#1B3B2B] flex items-center justify-center mx-auto">
            <Target className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#18201C]">
              No goals have been formulated for this case yet.
            </h3>
            <p className="text-xs text-[#636A64] max-w-md mx-auto">
              Define functional and clinical outcomes for this patient, with optional targets, dates, and links to formulated clinical problems.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreateModal('short_term')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#1B3B2B] text-[#FAF8F5] hover:bg-[#254F3A] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Goal
          </button>
        </div>
      )}

      {/* Add / Edit Goal Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18201C]/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl w-full max-w-xl shadow-xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#E5DFD4] flex items-center justify-between bg-[#FDFCFA]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#1B3B2B]" />
                <h3 className="text-sm font-bold text-[#18201C]">
                  {editingGoal?.id && caseGoals.some((g) => g.id === editingGoal.id)
                    ? 'Edit Clinical Goal'
                    : 'Formulate Clinical Goal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-[#636A64] hover:text-[#18201C] hover:bg-[#EBE5DA] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveGoal} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-[#FDF2F2] border border-[#F87171]/40 text-[#991B1B] text-xs">
                  {formError}
                </div>
              )}

              {/* Goal Type Selector */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#18201C] uppercase tracking-wider text-[11px]">
                  Goal Classification <span className="text-[#991B1B]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormType('short_term')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      formType === 'short_term'
                        ? 'border-[#1B3B2B] bg-[#EBF2EE] text-[#1B3B2B]'
                        : 'border-[#DDD6CB] bg-[#FDFCFA] text-[#525953] hover:border-[#CAD8D0]'
                    }`}
                  >
                    <span className="block font-semibold text-xs">Short-Term Goal</span>
                    <span className="block text-[10px] text-[#636A64] mt-0.5">
                      Interim milestone (days to weeks)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('long_term')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      formType === 'long_term'
                        ? 'border-[#1B3B2B] bg-[#EBF2EE] text-[#1B3B2B]'
                        : 'border-[#DDD6CB] bg-[#FDFCFA] text-[#525953] hover:border-[#CAD8D0]'
                    }`}
                  >
                    <span className="block font-semibold text-xs">Long-Term Goal</span>
                    <span className="block text-[10px] text-[#636A64] mt-0.5">
                      Discharge target / functional outcome
                    </span>
                  </button>
                </div>
              </div>

              {/* Goal Title */}
              <div className="space-y-1">
                <label
                  htmlFor="goal-title-input"
                  className="block font-semibold text-[#18201C] uppercase tracking-wider text-[11px]"
                >
                  Goal Statement <span className="text-[#991B1B]">*</span>
                </label>
                <input
                  id="goal-title-input"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Ascend 12 stairs reciprocally without railing or pain"
                  className="w-full px-3 py-2 text-xs bg-[#FDFCFA] border border-[#DDD6CB] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label
                  htmlFor="goal-desc-input"
                  className="block font-semibold text-[#18201C] uppercase tracking-wider text-[11px]"
                >
                  Context & Details (Optional)
                </label>
                <textarea
                  id="goal-desc-input"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional detail regarding patient preferences, assist level, or functional circumstances"
                  className="w-full px-3 py-2 text-xs bg-[#FDFCFA] border border-[#DDD6CB] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              {/* Target Value & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="goal-target-val-input"
                    className="block font-semibold text-[#18201C] uppercase tracking-wider text-[11px]"
                  >
                    Target Value (Optional)
                  </label>
                  <input
                    id="goal-target-val-input"
                    type="text"
                    value={formTargetValue}
                    onChange={(e) => setFormTargetValue(e.target.value)}
                    placeholder="e.g. 120°, 20 mins, independent"
                    className="w-full px-3 py-2 text-xs bg-[#FDFCFA] border border-[#DDD6CB] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="goal-target-date-input"
                    className="block font-semibold text-[#18201C] uppercase tracking-wider text-[11px]"
                  >
                    Target Date (Optional)
                  </label>
                  <input
                    id="goal-target-date-input"
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FDFCFA] border border-[#DDD6CB] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                  />
                </div>
              </div>

              {/* Linked Clinical Problems Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#18201C] uppercase tracking-wider text-[11px]">
                    Linked Clinical Problems
                  </label>
                  <span className="text-[10px] text-[#636A64]">
                    {formLinkedProblemIds.length} selected
                  </span>
                </div>
                <p className="text-[10px] text-[#7A817B]">
                  Link zero, one, or multiple clinical problems that this goal addresses.
                </p>

                {caseProblems.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto border border-[#DDD6CB] rounded-lg bg-[#FDFCFA] p-2 space-y-1">
                    {caseProblems.map((prob, pIdx) => {
                      const isSelected = prob.id
                        ? formLinkedProblemIds.includes(prob.id)
                        : false;
                      return (
                        <label
                          key={prob.id || `goal-modal-prob-${pIdx}`}
                          className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#EBF2EE] text-[#18201C]'
                              : 'hover:bg-[#FAF8F5] text-[#353C37]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProblemLink(prob.id)}
                            className="mt-0.5 rounded text-[#1B3B2B] focus:ring-[#1B3B2B]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-xs block truncate">
                              {prob.title}
                            </span>
                            {prob.description && (
                              <span className="text-[10px] text-[#7A817B] block truncate">
                                {prob.description}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-dashed border-[#DDD6CB] text-[#7A817B] text-[11px]">
                    No clinical problems formulated for this case yet. You can still create the goal.
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label
                  htmlFor="goal-status-select"
                  className="block font-semibold text-[#18201C] uppercase tracking-wider text-[11px]"
                >
                  Status
                </label>
                <select
                  id="goal-status-select"
                  value={formStatus}
                  onChange={(e) =>
                    setFormStatus(e.target.value as ClinicalGoalStatus)
                  }
                  className="w-full px-3 py-2 text-xs bg-[#FDFCFA] border border-[#DDD6CB] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                >
                  <option value="active">Active — Currently being pursued</option>
                  <option value="partially_met">
                    Partially Met — Meaningful progress achieved
                  </option>
                  <option value="met">Met — Goal considered achieved</option>
                  <option value="not_met">
                    Not Met — Not achieved in period
                  </option>
                  <option value="discontinued">
                    Discontinued — No longer pursued; historically retained
                  </option>
                </select>
              </div>

              {/* Therapist Notes */}
              <div className="space-y-1">
                <label
                  htmlFor="goal-notes-input"
                  className="block font-semibold text-[#18201C] uppercase tracking-wider text-[11px]"
                >
                  Therapist Notes (Optional)
                </label>
                <textarea
                  id="goal-notes-input"
                  rows={2}
                  value={formTherapistNotes}
                  onChange={(e) => setFormTherapistNotes(e.target.value)}
                  placeholder="Optional clinical rationale, baseline context, or monitoring notes"
                  className="w-full px-3 py-2 text-xs bg-[#FDFCFA] border border-[#DDD6CB] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#E5DFD4] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg text-[#636A64] hover:bg-[#EBE5DA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1B3B2B] text-[#FAF8F5] hover:bg-[#254F3A] transition-colors shadow-xs"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
