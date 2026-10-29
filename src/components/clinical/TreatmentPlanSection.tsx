import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  Brain,
  Layers,
  ArrowRight,
  Info,
  Dumbbell,
  BookOpen,
  Activity,
  Sliders,
  FileText,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Link2,
  Unlink,
} from 'lucide-react';
import {
  TreatmentPlan,
  TreatmentPlanStatus,
  TreatmentSelection,
  TreatmentSelectionStatus,
  TreatmentCategory,
  TreatmentInterventionType,
  ClinicalProblem,
  ClinicalGoal,
  EvidenceItem,
  EvidenceSource,
  ConditionPresentation,
} from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { Button } from '../common/Button';
import {
  TREATMENT_PLAN_STATUS_CONFIG,
  TREATMENT_SELECTION_STATUS_CONFIG,
  TREATMENT_CATEGORY_CONFIG,
  TREATMENT_INTERVENTION_TYPE_CONFIG,
} from '../../utils/treatmentPlans';
import { CLINICAL_PROBLEM_STATUS_CONFIG } from '../../utils/clinicalProblems';
import { CLINICAL_GOAL_STATUS_CONFIG, CLINICAL_GOAL_TYPE_CONFIG } from '../../utils/clinicalGoals';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface TreatmentPlanSectionProps {
  caseId: string;
  patientId: string;
}

export const TreatmentPlanSection: React.FC<TreatmentPlanSectionProps> = ({
  caseId,
  patientId,
}) => {
  const {
    getTreatmentPlansForCase,
    getTreatmentSelectionsForCase,
    saveTreatmentPlan,
    updateTreatmentPlanStatus,
    deleteTreatmentPlan,
    saveTreatmentSelection,
    updateTreatmentSelectionStatus,
    deleteTreatmentSelection,
    getClinicalProblemsForCase,
    getClinicalGoalsForCase,
    evidenceSources,
    evidenceItems,
    conditionPresentations,
    treatmentEvidenceLinks,
    treatmentConditionLinks,
    getEvidenceLinksForTreatment,
    getConditionLinksForTreatment,
    linkEvidenceToTreatment,
    unlinkEvidenceFromTreatment,
    linkConditionToTreatment,
    unlinkConditionFromTreatment,
  } = useClinical();

  // Reference data for this case
  const caseProblems = useClinical().getClinicalProblemsForCase(caseId);
  const caseGoals = useClinical().getClinicalGoalsForCase(caseId);

  // Treatment plans and selections
  const casePlans = getTreatmentPlansForCase(caseId);
  const caseSelections = getTreatmentSelectionsForCase(caseId);

  // Current selected active plan (default to first or active plan)
  const activePlan: TreatmentPlan | undefined = useMemo(() => {
    if (casePlans.length === 0) return undefined;
    return casePlans.find((p) => p.status === 'active') || casePlans[0];
  }, [casePlans]);

  // Selections belonging to this case/plan
  const planSelections = useMemo(() => {
    if (!activePlan) return [];
    return caseSelections.filter((s) => s.treatmentPlanId === activePlan.id);
  }, [caseSelections, activePlan]);

  // UI state for filters
  const [statusFilter, setStatusFilter] = useState<TreatmentSelectionStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TreatmentCategory | 'all'>('all');

  // UI state for collapsible reference panels
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [editingSelection, setEditingSelection] = useState<TreatmentSelection | null>(null);

  // Form state for Treatment Plan Modal
  const [planFormTitle, setPlanFormTitle] = useState('');
  const [planFormRationale, setPlanFormRationale] = useState('');
  const [planFormStatus, setPlanFormStatus] = useState<TreatmentPlanStatus>('active');

  // Form state for Treatment Selection Modal (Stage 4E)
  const [selFormTitle, setSelFormTitle] = useState('');
  const [selFormInterventionType, setSelFormInterventionType] = useState<TreatmentInterventionType>('therapeutic_exercise');
  const [selFormCategory, setSelFormCategory] = useState<TreatmentCategory>('exercise');
  const [selFormDescription, setSelFormDescription] = useState('');
  const [selFormStatus, setSelFormStatus] = useState<TreatmentSelectionStatus>('planned');
  const [selFormClinicalProblemId, setSelFormClinicalProblemId] = useState<string>('');
  const [selFormLinkedProblemIds, setSelFormLinkedProblemIds] = useState<string[]>([]);
  const [selFormGoalId, setSelFormGoalId] = useState<string>('');
  const [selFormLinkedGoalIds, setSelFormLinkedGoalIds] = useState<string[]>([]);
  const [selFormRationale, setSelFormRationale] = useState('');

  // Stage 4E: Modal Evidence & Condition Selection Links
  const [selFormEvidenceLinks, setSelFormEvidenceLinks] = useState<Array<{ evidenceItemId: string; therapistNote?: string }>>([]);
  const [selFormConditionPresentationIds, setSelFormConditionPresentationIds] = useState<string[]>([]);
  const [isEvidenceSelectorOpen, setIsEvidenceSelectorOpen] = useState(false);
  const [isConditionSelectorOpen, setIsConditionSelectorOpen] = useState(false);

  // Dosage form fields
  const [selFormFrequency, setSelFormFrequency] = useState('');
  const [selFormIntensity, setSelFormIntensity] = useState('');
  const [selFormDuration, setSelFormDuration] = useState('');
  const [selFormVolume, setSelFormVolume] = useState('');
  const [selFormParameters, setSelFormParameters] = useState('');
  const [selFormDosageNotes, setSelFormDosageNotes] = useState('');

  // Progression form fields
  const [selFormPlannedChange, setSelFormPlannedChange] = useState('');
  const [selFormProgCriteria, setSelFormProgCriteria] = useState('');
  const [selFormRegCriteria, setSelFormRegCriteria] = useState('');
  const [selFormReviewDate, setSelFormReviewDate] = useState('');
  const [selFormProgNotes, setSelFormProgNotes] = useState('');

  // General therapist notes
  const [selFormTherapistNotes, setSelFormTherapistNotes] = useState('');

  // Accordion toggles inside modal
  const [isDosageExpanded, setIsDosageExpanded] = useState(true);
  const [isProgressionExpanded, setIsProgressionExpanded] = useState(false);

  // Open Plan Modal
  const handleOpenPlanModal = () => {
    if (activePlan) {
      setPlanFormTitle(activePlan.title || '');
      setPlanFormRationale(activePlan.clinicalRationale || '');
      setPlanFormStatus(activePlan.status);
    } else {
      setPlanFormTitle('');
      setPlanFormRationale('');
      setPlanFormStatus('active');
    }
    setIsPlanModalOpen(true);
  };

  // Submit Plan Form
  const handleSubmitPlanForm = (e: React.FormEvent) => {
    e.preventDefault();
    saveTreatmentPlan({
      id: activePlan?.id,
      caseId,
      patientId,
      title: planFormTitle.trim() || undefined,
      clinicalRationale: planFormRationale.trim() || undefined,
      status: planFormStatus,
    });
    setIsPlanModalOpen(false);
  };

  // Helper mapping intervention type to category for backward compatibility
  const mapTypeToCategory = (type: TreatmentInterventionType): TreatmentCategory => {
    switch (type) {
      case 'therapeutic_exercise':
        return 'exercise';
      case 'manual_therapy':
        return 'manual_therapy';
      case 'education':
        return 'education';
      case 'activity_modification':
        return 'activity_modification';
      case 'functional_training':
        return 'functional_training';
      case 'neuromuscular_training':
        return 'neuromuscular_training';
      case 'cardiorespiratory_training':
        return 'aerobic_conditioning';
      default:
        return 'other';
    }
  };

  // Open Selection Modal (Create or Edit)
  const handleOpenSelectionModal = (existing?: TreatmentSelection) => {
    // If no master plan exists yet, create an initial default one first
    let planIdToUse = activePlan?.id;
    if (!planIdToUse) {
      const createdPlan = saveTreatmentPlan({
        caseId,
        patientId,
        title: 'Initial Physiotherapy Treatment Plan',
        status: 'active',
      });
      planIdToUse = createdPlan.id;
    }

    if (existing) {
      setEditingSelection(existing);
      setSelFormTitle(existing.title);
      const intType = existing.interventionType || (existing.category === 'exercise' ? 'therapeutic_exercise' : existing.category === 'manual_therapy' ? 'manual_therapy' : existing.category === 'education' ? 'education' : existing.category === 'activity_modification' ? 'activity_modification' : existing.category === 'functional_training' ? 'functional_training' : existing.category === 'neuromuscular_training' ? 'neuromuscular_training' : existing.category === 'aerobic_conditioning' ? 'cardiorespiratory_training' : 'other');
      setSelFormInterventionType(intType);
      setSelFormCategory(existing.category || mapTypeToCategory(intType));
      setSelFormDescription(existing.interventionDescription || existing.description || '');
      setSelFormStatus(existing.status);
      const probId = existing.clinicalProblemId || (existing.linkedProblemIds && existing.linkedProblemIds[0]) || '';
      setSelFormClinicalProblemId(probId);
      setSelFormLinkedProblemIds(existing.linkedProblemIds || (probId ? [probId] : []));
      const gId = existing.goalId || (existing.linkedGoalIds && existing.linkedGoalIds[0]) || '';
      setSelFormGoalId(gId);
      setSelFormLinkedGoalIds(existing.linkedGoalIds || (gId ? [gId] : []));
      setSelFormRationale(existing.clinicalRationale || existing.therapistRationale || '');

      // Load existing evidence & condition links
      const existingEvLinks = getEvidenceLinksForTreatment(existing.id);
      setSelFormEvidenceLinks(
        existingEvLinks.map((l) => ({
          evidenceItemId: l.evidenceItemId,
          therapistNote: l.therapistNote || '',
        }))
      );
      const existingCondLinks = getConditionLinksForTreatment(existing.id);
      setSelFormConditionPresentationIds(
        existingCondLinks.map((l) => l.conditionPresentationId)
      );

      // Dosage
      setSelFormFrequency(existing.dosage?.frequency || '');
      setSelFormIntensity(existing.dosage?.intensity || '');
      setSelFormDuration(existing.dosage?.duration || '');
      setSelFormVolume(existing.dosage?.volume || '');
      setSelFormParameters(existing.dosage?.parameters || '');
      setSelFormDosageNotes(existing.dosage?.notes || '');

      // Progression
      setSelFormPlannedChange(existing.progression?.plannedChange || '');
      setSelFormProgCriteria(existing.progression?.progressionCriteria || '');
      setSelFormRegCriteria(existing.progression?.regressionCriteria || '');
      setSelFormReviewDate(existing.progression?.reviewDate || '');
      setSelFormProgNotes(existing.progression?.notes || '');

      // Notes
      setSelFormTherapistNotes(existing.therapistNotes || '');
    } else {
      setEditingSelection(null);
      setSelFormTitle('');
      setSelFormInterventionType('therapeutic_exercise');
      setSelFormCategory('exercise');
      setSelFormDescription('');
      setSelFormStatus('planned');
      setSelFormClinicalProblemId('');
      setSelFormLinkedProblemIds([]);
      setSelFormGoalId('');
      setSelFormLinkedGoalIds([]);
      setSelFormRationale('');
      setSelFormEvidenceLinks([]);
      setSelFormConditionPresentationIds([]);

      // Dosage
      setSelFormFrequency('');
      setSelFormIntensity('');
      setSelFormDuration('');
      setSelFormVolume('');
      setSelFormParameters('');
      setSelFormDosageNotes('');

      // Progression
      setSelFormPlannedChange('');
      setSelFormProgCriteria('');
      setSelFormRegCriteria('');
      setSelFormReviewDate('');
      setSelFormProgNotes('');

      // Notes
      setSelFormTherapistNotes('');
    }

    setIsEvidenceSelectorOpen(false);
    setIsConditionSelectorOpen(false);
    setIsDosageExpanded(true);
    setIsProgressionExpanded(false);
    setIsSelectionModalOpen(true);
  };

  // Submit Selection Form
  const handleSubmitSelectionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selFormTitle.trim()) return;

    let targetPlanId = activePlan?.id;
    if (!targetPlanId) {
      const createdPlan = saveTreatmentPlan({
        caseId,
        patientId,
        title: 'Initial Physiotherapy Treatment Plan',
        status: 'active',
      });
      targetPlanId = createdPlan.id;
    }

    const hasDosage =
      selFormFrequency.trim() ||
      selFormIntensity.trim() ||
      selFormDuration.trim() ||
      selFormVolume.trim() ||
      selFormParameters.trim() ||
      selFormDosageNotes.trim();

    const dosage = hasDosage
      ? {
          frequency: selFormFrequency.trim() || undefined,
          intensity: selFormIntensity.trim() || undefined,
          duration: selFormDuration.trim() || undefined,
          volume: selFormVolume.trim() || undefined,
          parameters: selFormParameters.trim() || undefined,
          notes: selFormDosageNotes.trim() || undefined,
        }
      : undefined;

    const hasProgression =
      selFormPlannedChange.trim() ||
      selFormProgCriteria.trim() ||
      selFormRegCriteria.trim() ||
      selFormReviewDate.trim() ||
      selFormProgNotes.trim();

    const progression = hasProgression
      ? {
          plannedChange: selFormPlannedChange.trim() || undefined,
          progressionCriteria: selFormProgCriteria.trim() || undefined,
          regressionCriteria: selFormRegCriteria.trim() || undefined,
          reviewDate: selFormReviewDate.trim() || undefined,
          notes: selFormProgNotes.trim() || undefined,
        }
      : undefined;

    // Derived multi-links from explicit links or checkboxes
    const linkedProbIds = selFormClinicalProblemId
      ? Array.from(new Set([selFormClinicalProblemId, ...selFormLinkedProblemIds]))
      : Array.from(new Set(selFormLinkedProblemIds));

    const linkedGIds = selFormGoalId
      ? Array.from(new Set([selFormGoalId, ...selFormLinkedGoalIds]))
      : Array.from(new Set(selFormLinkedGoalIds));

    const saved = saveTreatmentSelection({
      id: editingSelection?.id,
      treatmentPlanId: editingSelection?.treatmentPlanId || targetPlanId,
      caseId,
      patientId,
      title: selFormTitle.trim(),
      interventionType: selFormInterventionType,
      category: selFormCategory || mapTypeToCategory(selFormInterventionType),
      interventionDescription: selFormDescription.trim() || undefined,
      description: selFormDescription.trim() || undefined,
      status: selFormStatus,
      clinicalProblemId: selFormClinicalProblemId || undefined,
      linkedProblemIds: linkedProbIds,
      goalId: selFormGoalId || undefined,
      linkedGoalIds: linkedGIds,
      clinicalRationale: selFormRationale.trim() || undefined,
      therapistRationale: selFormRationale.trim() || undefined,
      dosage,
      progression,
      therapistNotes: selFormTherapistNotes.trim() || undefined,
    });

    // Synchronize Evidence Links
    if (saved && saved.id) {
      const currentEvLinks = getEvidenceLinksForTreatment(saved.id);
      // Remove links no longer in selFormEvidenceLinks
      currentEvLinks.forEach((curr) => {
        if (!selFormEvidenceLinks.some((l) => l.evidenceItemId === curr.evidenceItemId)) {
          unlinkEvidenceFromTreatment(curr.id);
        }
      });
      // Add or update links
      selFormEvidenceLinks.forEach((linkItem) => {
        linkEvidenceToTreatment(saved.id, linkItem.evidenceItemId, linkItem.therapistNote);
      });

      // Synchronize Condition Links
      const currentCondLinks = getConditionLinksForTreatment(saved.id);
      currentCondLinks.forEach((curr) => {
        if (!selFormConditionPresentationIds.includes(curr.conditionPresentationId)) {
          unlinkConditionFromTreatment(curr.id);
        }
      });
      selFormConditionPresentationIds.forEach((condId) => {
        linkConditionToTreatment(saved.id, condId);
      });
    }

    setIsSelectionModalOpen(false);
  };

  // Toggle problem link
  const toggleProblemLink = (problemId: string) => {
    setSelFormLinkedProblemIds((prev) =>
      prev.includes(problemId)
        ? prev.filter((id) => id !== problemId)
        : [...prev, problemId]
    );
  };

  // Toggle goal link
  const toggleGoalLink = (goalId: string) => {
    setSelFormLinkedGoalIds((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  // Filtered selections
  const filteredSelections = useMemo(() => {
    return planSelections.filter((s) => {
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchCategory =
        categoryFilter === 'all' || s.category === categoryFilter;
      return matchStatus && matchCategory;
    });
  }, [planSelections, statusFilter, categoryFilter]);

  // Counts
  const activeCount = planSelections.filter((s) => s.status === 'active').length;
  const plannedCount = planSelections.filter((s) => s.status === 'planned').length;
  const modifiedCount = planSelections.filter((s) => s.status === 'modified').length;
  const completedCount = planSelections.filter((s) => s.status === 'completed').length;
  const discontinuedCount = planSelections.filter((s) => s.status === 'discontinued').length;

  return (
    <div
      id="section-treatment-plan"
      className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-6 animate-in fade-in duration-200"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-[#EAE4DB]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#1B3B2B] bg-[#EBF2EE] px-2.5 py-0.5 rounded-full border border-[#CAD8D0] uppercase tracking-wider">
              Stage 4B • Treatment Plan
            </span>
            {activePlan && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  TREATMENT_PLAN_STATUS_CONFIG[activePlan.status].bg
                } ${TREATMENT_PLAN_STATUS_CONFIG[activePlan.status].text} ${
                  TREATMENT_PLAN_STATUS_CONFIG[activePlan.status].border
                }`}
              >
                Plan {TREATMENT_PLAN_STATUS_CONFIG[activePlan.status].label}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-[#18201C] tracking-tight">
            Treatment Plan
          </h2>
          <p className="text-xs text-[#525954]">
            Define and document the therapeutic approaches selected for this case.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activePlan && (
            <Button
              id="edit-treatment-plan-btn"
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={handleOpenPlanModal}
            >
              Edit Plan Details
            </Button>
          )}

          <Button
            id="add-treatment-selection-btn"
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => handleOpenSelectionModal()}
          >
            + Add Treatment
          </Button>
        </div>
      </div>

      {/* Reference Panels (Clinical Problems & Clinical Goals of Current Case) */}
      <div className="border border-[#E5DFD4] rounded-lg bg-[#FDFCFA] overflow-hidden">
        <button
          id="toggle-treatment-references-btn"
          type="button"
          onClick={() => setIsReferenceOpen(!isReferenceOpen)}
          className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#F7F4EE] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#EBF2EE] border border-[#CAD8D0] flex items-center justify-center text-[#1B3B2B]">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#18201C]">
                Clinical Context Reference Panel
              </span>
              <span className="text-[11px] text-[#606762] ml-2">
                ({caseProblems.length} formulated problem{caseProblems.length === 1 ? '' : 's'}, {caseGoals.length} goal{caseGoals.length === 1 ? '' : 's'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#414843]">
            <span>{isReferenceOpen ? 'Collapse Reference' : 'Expand Reference'}</span>
            {isReferenceOpen ? (
              <ChevronUp className="w-4 h-4 text-[#7A817B]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#7A817B]" />
            )}
          </div>
        </button>

        {isReferenceOpen && (
          <div className="p-4 border-t border-[#EAE4DB] bg-[#FAF8F5] space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formulated Problems */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#18201C] flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    Formulated Clinical Problems ({caseProblems.length})
                  </span>
                  <span className="text-[10px] text-[#7A817B]">Stage 3B</span>
                </div>

                {caseProblems.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {caseProblems.map((prob, idx) => {
                      const probStatus = CLINICAL_PROBLEM_STATUS_CONFIG[prob.status];
                      return (
                        <div
                          key={prob.id || `ref-prob-${idx}`}
                          className="p-2.5 rounded-md border border-[#E5DFD4] bg-[#FDFCFA] space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-[#18201C]">
                              {prob.title}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-medium ${probStatus?.badgeClass || 'bg-[#FAF0E4] text-[#8C5E1A] border-[#E8D4BE]'}`}
                            >
                              {probStatus?.label}
                            </span>
                          </div>
                          {prob.formulation && (
                            <p className="text-[11px] text-[#606762] line-clamp-2">
                              {prob.formulation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-md bg-[#FDFCFA] border border-[#E5DFD4] text-[#7A817B] text-center italic">
                    No clinical problems formulated yet for this case.
                  </div>
                )}
              </div>

              {/* Formulated Goals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#18201C] flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    Formulated Goals ({caseGoals.length})
                  </span>
                  <span className="text-[10px] text-[#7A817B]">Stage 4A</span>
                </div>

                {caseGoals.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {caseGoals.map((g, idx) => {
                      const gStatus = CLINICAL_GOAL_STATUS_CONFIG[g.status];
                      const gType = CLINICAL_GOAL_TYPE_CONFIG[g.type];
                      return (
                        <div
                          key={g.id || `ref-goal-${idx}`}
                          className="p-2.5 rounded-md border border-[#E5DFD4] bg-[#FDFCFA] space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#18201C]">
                                {g.title}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded-xs border font-medium ${gType.badgeClass}`}
                              >
                                {gType.label}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-medium ${gStatus?.badgeClass || 'bg-[#FAF0E4] text-[#8C5E1A] border-[#E8D4BE]'}`}
                            >
                              {gStatus?.label}
                            </span>
                          </div>
                          {g.targetValue && (
                            <p className="text-[11px] text-[#1B3B2B] font-medium">
                              Target: {g.targetValue}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-md bg-[#FDFCFA] border border-[#E5DFD4] text-[#7A817B] text-center italic">
                    No clinical goals documented yet for this case.
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#7A817B] italic border-t border-[#EAE4DB] pt-2">
              Note: The therapist explicitly decides which Clinical Problems and Goals each treatment selection addresses. Links are not automatically assigned.
            </p>
          </div>
        )}
      </div>

      {/* Master Treatment Plan Banner / Details */}
      {activePlan ? (
        <div
          id={`treatment-plan-card-${activePlan.id}`}
          className="p-4 rounded-lg bg-[#FDFCFA] border border-[#E0D9CD] shadow-2xs space-y-2.5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#18201C]">
                {activePlan.title || 'Therapeutic Rehabilitation Plan'}
              </h3>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  TREATMENT_PLAN_STATUS_CONFIG[activePlan.status].bg
                } ${TREATMENT_PLAN_STATUS_CONFIG[activePlan.status].text} ${
                  TREATMENT_PLAN_STATUS_CONFIG[activePlan.status].border
                }`}
              >
                {TREATMENT_PLAN_STATUS_CONFIG[activePlan.status].label}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#6E756F]">
              <span>Created {formatClinicalDate(activePlan.createdAt)}</span>
              <span>•</span>
              <span>Updated {formatClinicalDate(activePlan.updatedAt)}</span>
              {activePlan.reviewedAt && (
                <>
                  <span>•</span>
                  <span>Reviewed {formatClinicalDate(activePlan.reviewedAt)}</span>
                </>
              )}
            </div>
          </div>

          {activePlan.clinicalRationale && (
            <div className="text-xs text-[#353C37] bg-[#FAF8F5] p-2.5 rounded-md border border-[#EAE4DB] leading-relaxed">
              <span className="font-semibold text-[#18201C] block text-[11px] mb-0.5">
                Clinical Rationale:
              </span>
              {activePlan.clinicalRationale}
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-lg border-2 border-dashed border-[#DDD6CB] bg-[#FDFCFA] text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#EBF2EE] border border-[#CAD8D0] flex items-center justify-center mx-auto text-[#1B3B2B]">
            <ListTodo className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-[#18201C]">
              No Treatment Plan Established Yet
            </h3>
            <p className="text-xs text-[#636A64]">
              Establish a structured treatment plan to document the therapist-selected interventions, parameters, and progression criteria for this case.
            </p>
          </div>
          <Button
            id="establish-initial-plan-btn"
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenPlanModal}
          >
            Establish Treatment Plan
          </Button>
        </div>
      )}

      {/* Filter and Count Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[#6E756F] font-medium mr-1 text-[11px]">
            Filter Status:
          </span>
          <button
            id="filter-status-all"
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#1B3B2B] text-white'
                : 'bg-[#F2EFE9] text-[#414843] hover:bg-[#EAE4DB]'
            }`}
          >
            All ({planSelections.length})
          </button>
          <button
            id="filter-status-active"
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'active'
                ? 'bg-[#1B3B2B] text-white'
                : 'bg-[#F2EFE9] text-[#414843] hover:bg-[#EAE4DB]'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            id="filter-status-planned"
            type="button"
            onClick={() => setStatusFilter('planned')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'planned'
                ? 'bg-[#1B3B2B] text-white'
                : 'bg-[#F2EFE9] text-[#414843] hover:bg-[#EAE4DB]'
            }`}
          >
            Planned ({plannedCount})
          </button>
          <button
            id="filter-status-modified"
            type="button"
            onClick={() => setStatusFilter('modified')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'modified'
                ? 'bg-[#1B3B2B] text-white'
                : 'bg-[#F2EFE9] text-[#414843] hover:bg-[#EAE4DB]'
            }`}
          >
            Modified ({modifiedCount})
          </button>
          <button
            id="filter-status-completed"
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'completed'
                ? 'bg-[#1B3B2B] text-white'
                : 'bg-[#F2EFE9] text-[#414843] hover:bg-[#EAE4DB]'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            id="filter-status-discontinued"
            type="button"
            onClick={() => setStatusFilter('discontinued')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'discontinued'
                ? 'bg-[#1B3B2B] text-white'
                : 'bg-[#F2EFE9] text-[#414843] hover:bg-[#EAE4DB]'
            }`}
          >
            Discontinued ({discontinuedCount})
          </button>
        </div>

        {/* Category Filter dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#6E756F] font-medium">Category:</span>
          <select
            id="filter-treatment-category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="text-xs bg-[#FDFCFA] border border-[#DDD6CB] rounded-md px-2 py-1 text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
          >
            <option value="all">All Categories</option>
            <option value="exercise">Exercise Therapy</option>
            <option value="manual_therapy">Manual Therapy</option>
            <option value="education">Patient Education</option>
            <option value="functional_training">Functional Training</option>
            <option value="activity_modification">Activity Modification</option>
            <option value="aerobic_conditioning">Aerobic Conditioning</option>
            <option value="neuromuscular_training">Neuromuscular Training</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Treatment Selections Cards List */}
      {filteredSelections.length > 0 ? (
        <div className="space-y-4">
          {filteredSelections.map((selection, idx) => {
            const categoryCfg =
              TREATMENT_CATEGORY_CONFIG[selection.category] ||
              TREATMENT_CATEGORY_CONFIG.other;
            const statusCfg =
              TREATMENT_SELECTION_STATUS_CONFIG[selection.status] ||
              TREATMENT_SELECTION_STATUS_CONFIG.planned;

            // Resolve linked problems safely
            const uniqueProblemIds = Array.from(new Set(
              selection.clinicalProblemId
                ? [selection.clinicalProblemId, ...(selection.linkedProblemIds || [])]
                : (selection.linkedProblemIds || [])
            ));
            const linkedProblems = uniqueProblemIds
              .map((pId) => caseProblems.find((cp) => cp.id === pId))
              .filter((p): p is ClinicalProblem => p !== undefined);

            // Resolve linked goals safely
            const uniqueGoalIds = Array.from(new Set(
              selection.goalId
                ? [selection.goalId, ...(selection.linkedGoalIds || [])]
                : (selection.linkedGoalIds || [])
            ));
            const linkedGoals = uniqueGoalIds
              .map((gId) => caseGoals.find((cg) => cg.id === gId))
              .filter((g): g is ClinicalGoal => g !== undefined);

            // Stage 4E: Resolve linked evidence items and linked condition pathways
            const treatmentEvLinks = getEvidenceLinksForTreatment(selection.id);
            const resolvedEvidenceItems = treatmentEvLinks
              .map((link) => {
                const item = evidenceItems.find((e) => e.id === link.evidenceItemId);
                return item ? { link, item } : null;
              })
              .filter((pair): pair is { link: typeof treatmentEvLinks[0]; item: EvidenceItem } => pair !== null);

            const treatmentCondLinks = getConditionLinksForTreatment(selection.id);
            const resolvedConditions = treatmentCondLinks
              .map((link) => {
                const cond = conditionPresentations.find((c) => c.id === link.conditionPresentationId);
                return cond ? { link, cond } : null;
              })
              .filter((pair): pair is { link: typeof treatmentCondLinks[0]; cond: ConditionPresentation } => pair !== null);

            const interventionCfg = selection.interventionType
              ? TREATMENT_INTERVENTION_TYPE_CONFIG[selection.interventionType]
              : null;

            const selectionKey = selection.id || `selection-${idx}`;

            return (
              <div
                key={selectionKey}
                id={`treatment-card-${selection.id || idx}`}
                className={`p-4 rounded-xl border bg-[#FDFCFA] transition-all space-y-3.5 shadow-2xs ${
                  selection.status === 'discontinued'
                    ? 'border-[#E0D9CD] opacity-75 bg-[#F9F8F6]'
                    : selection.status === 'completed'
                    ? 'border-[#C2D6CC] bg-[#F8FBF9]'
                    : 'border-[#E0D9CD] hover:border-[#CAD8D0]'
                }`}
              >
                {/* Card Top Row: Category, Intervention Type, Title, Status & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {interventionCfg ? (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${interventionCfg.badgeClass}`}>
                          {interventionCfg.label}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#EBF2EE] text-[#1B3B2B] border border-[#CAD8D0]">
                          {categoryCfg.shortBadge}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                      {selection.status === 'discontinued' && selection.discontinuedAt && (
                        <span className="text-[10px] text-[#7A817B]">
                          (Discontinued {formatClinicalDate(selection.discontinuedAt)})
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-[#18201C] pt-0.5">
                      {selection.title}
                    </h4>

                    {(selection.interventionDescription || selection.description) && (
                      <p className="text-xs text-[#525954] leading-relaxed">
                        {selection.interventionDescription || selection.description}
                      </p>
                    )}
                  </div>

                  {/* Actions & Status selector */}
                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                    <select
                      id={`status-select-${selection.id || idx}`}
                      value={selection.status}
                      onChange={(e) =>
                        updateTreatmentSelectionStatus(
                          selection.id,
                          e.target.value as TreatmentSelectionStatus
                        )
                      }
                      className="text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md px-2 py-1 text-[#353C37] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    >
                      <option value="planned">Planned</option>
                      <option value="active">Active</option>
                      <option value="modified">Modified</option>
                      <option value="completed">Completed</option>
                      <option value="discontinued">Discontinued</option>
                    </select>

                    <Button
                      id={`edit-selection-${selection.id || idx}`}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenSelectionModal(selection)}
                      className="p-1.5 text-[#555C56] hover:text-[#18201C]"
                      title="Edit Treatment Selection"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      id={`delete-selection-${selection.id || idx}`}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete treatment "${selection.title}" from this plan?`
                          )
                        ) {
                          deleteTreatmentSelection(selection.id);
                        }
                      }}
                      className="p-1.5 text-[#A34343] hover:text-[#7A2222] hover:bg-[#FBEBEB]"
                      title="Delete Treatment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Therapist Rationale (Why selected) */}
                {selection.therapistRationale && (
                  <div className="p-2.5 rounded-md bg-[#FAF8F5] border border-[#EAE4DB] text-xs text-[#2C332E] leading-relaxed">
                    <span className="font-semibold text-[#18201C] text-[11px] block mb-0.5">
                      Therapist Clinical Rationale:
                    </span>
                    {selection.therapistRationale}
                  </div>
                )}

                {/* Clinical Linkage (Problems & Goals) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[#EFECE5]">
                  {/* Linked Problems */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6A726C] block">
                      Addressed Clinical Problems ({linkedProblems.length})
                    </span>
                    {linkedProblems.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedProblems.map((prob, pIdx) => {
                          const probStatus =
                            CLINICAL_PROBLEM_STATUS_CONFIG[prob.status];
                          return (
                            <div
                              key={
                                prob.id
                                  ? `${selectionKey}-prob-${prob.id}`
                                  : `${selectionKey}-prob-idx-${pIdx}`
                              }
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E2DDD3] text-xs text-[#18201C]"
                            >
                              <span className="font-medium text-[11px]">{prob.title}</span>
                              <span
                                className={`text-[9px] px-1 py-0.1 rounded-xs border font-medium ${probStatus?.badgeClass || 'bg-[#FAF0E4] text-[#8C5E1A] border-[#E8D4BE]'}`}
                              >
                                {probStatus?.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#8C938E] italic">
                        Not linked to a specific problem formulation.
                      </span>
                    )}
                  </div>

                  {/* Linked Goals */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6A726C] block">
                      Targeted Clinical Goals ({linkedGoals.length})
                    </span>
                    {linkedGoals.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedGoals.map((g, gIdx) => {
                          const gType = CLINICAL_GOAL_TYPE_CONFIG[g.type];
                          return (
                            <div
                              key={
                                g.id
                                  ? `${selectionKey}-goal-${g.id}`
                                  : `${selectionKey}-goal-idx-${gIdx}`
                              }
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E2DDD3] text-xs text-[#18201C]"
                            >
                              <span className="font-medium text-[11px]">{g.title}</span>
                              <span
                                className={`text-[9px] px-1 py-0.1 rounded-xs border font-medium ${gType?.badgeClass}`}
                              >
                                {gType?.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#8C938E] italic">
                        Not linked to a specific goal outcome.
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage 4E: Linked Evidence & Condition Presentation Pathways */}
                {(resolvedEvidenceItems.length > 0 || resolvedConditions.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#EFECE5]">
                    {/* Linked Evidence Items */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1B3B2B] flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-[#1B3B2B]" />
                        Linked Evidence ({resolvedEvidenceItems.length})
                      </span>
                      {resolvedEvidenceItems.length > 0 ? (
                        <div className="space-y-1.5">
                          {resolvedEvidenceItems.map(({ link, item }) => {
                            const source = evidenceSources.find((s) => s.id === item.sourceId);
                            return (
                              <div
                                key={link.id}
                                className="p-2 rounded-md bg-[#FAF8F5] border border-[#E2DDD3] text-xs space-y-1"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-semibold text-[#18201C] text-[11px] leading-snug">
                                    {item.claimOrFinding}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-[#EBF2EE] text-[#1B3B2B] border border-[#CAD8D0] font-medium shrink-0">
                                    {item.evidenceType.replace('_', ' ')}
                                  </span>
                                </div>
                                {source && (
                                  <div className="text-[10px] text-[#6A726C] italic">
                                    Source: {source.title} ({source.year || source.publicationStatus})
                                  </div>
                                )}
                                {link.therapistNote && (
                                  <div className="text-[10px] text-[#353C37] bg-white p-1 rounded border border-[#EDE8E0]">
                                    <strong className="text-[#18201C]">Clinician Context: </strong>
                                    {link.therapistNote}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8C938E] italic">
                          No evidence items linked.
                        </span>
                      )}
                    </div>

                    {/* Linked Condition Pathways */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#22445E] flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-[#22445E]" />
                        Linked Condition Pathway ({resolvedConditions.length})
                      </span>
                      {resolvedConditions.length > 0 ? (
                        <div className="space-y-1.5">
                          {resolvedConditions.map(({ link, cond }) => (
                            <div
                              key={link.id}
                              className="p-2 rounded-md bg-[#FAF8F5] border border-[#E2DDD3] text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[#18201C] text-[11px]">
                                  {cond.name}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-[#EFF3F6] text-[#22445E] border border-[#CFDCE6] font-medium capitalize">
                                  {cond.bodyRegion}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#555C56] line-clamp-2">
                                {cond.description}
                              </p>
                              {cond.clinicalHallmarks && cond.clinicalHallmarks.length > 0 && (
                                <div className="text-[9px] text-[#6A726C] flex flex-wrap gap-1 pt-0.5">
                                  {cond.clinicalHallmarks.slice(0, 2).map((h, hIdx) => (
                                    <span key={hIdx} className="bg-white px-1 py-0.5 rounded border border-[#DDD6CB]">
                                      {h}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8C938E] italic">
                          No condition pathway linked.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Dosage Information (when present) */}
                {selection.dosage &&
                  (selection.dosage.frequency ||
                    selection.dosage.intensity ||
                    selection.dosage.duration ||
                    selection.dosage.volume ||
                    selection.dosage.parameters ||
                    selection.dosage.notes) && (
                    <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DFD4] space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#1B3B2B]" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#18201C]">
                          Dosage & Parameters
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {selection.dosage.frequency && (
                          <div>
                            <span className="text-[10px] text-[#6A726C] font-semibold block">
                              Frequency
                            </span>
                            <span className="font-medium text-[#18201C]">
                              {selection.dosage.frequency}
                            </span>
                          </div>
                        )}
                        {selection.dosage.intensity && (
                          <div>
                            <span className="text-[10px] text-[#6A726C] font-semibold block">
                              Intensity / Load
                            </span>
                            <span className="font-medium text-[#18201C]">
                              {selection.dosage.intensity}
                            </span>
                          </div>
                        )}
                        {selection.dosage.volume && (
                          <div>
                            <span className="text-[10px] text-[#6A726C] font-semibold block">
                              Volume / Sets & Reps
                            </span>
                            <span className="font-medium text-[#18201C]">
                              {selection.dosage.volume}
                            </span>
                          </div>
                        )}
                        {selection.dosage.duration && (
                          <div>
                            <span className="text-[10px] text-[#6A726C] font-semibold block">
                              Duration
                            </span>
                            <span className="font-medium text-[#18201C]">
                              {selection.dosage.duration}
                            </span>
                          </div>
                        )}
                      </div>

                      {selection.dosage.parameters && (
                        <div className="text-xs pt-1 border-t border-[#EAE4DB]">
                          <span className="text-[10px] text-[#6A726C] font-semibold block">
                            Specific Parameters / Execution Cue:
                          </span>
                          <span className="text-[#353C37]">
                            {selection.dosage.parameters}
                          </span>
                        </div>
                      )}

                      {selection.dosage.notes && (
                        <p className="text-[11px] text-[#555C56] italic">
                          Notes: {selection.dosage.notes}
                        </p>
                      )}
                    </div>
                  )}

                {/* Progression & Regression Criteria (when present) */}
                {selection.progression &&
                  (selection.progression.plannedChange ||
                    selection.progression.progressionCriteria ||
                    selection.progression.regressionCriteria ||
                    selection.progression.reviewDate ||
                    selection.progression.notes) && (
                    <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DFD4] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-[#1B3B2B]" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#18201C]">
                            Planned Progression & Criteria
                          </span>
                        </div>

                        {selection.progression.reviewDate && (
                          <div className="flex items-center gap-1 text-[11px] text-[#1B3B2B] font-semibold">
                            <Calendar className="w-3 h-3" />
                            <span>Review: {formatClinicalDate(selection.progression.reviewDate)}</span>
                          </div>
                        )}
                      </div>

                      {selection.progression.plannedChange && (
                        <div className="text-xs">
                          <span className="text-[10px] text-[#6A726C] font-semibold block">
                            Planned Progression:
                          </span>
                          <span className="font-medium text-[#18201C]">
                            {selection.progression.plannedChange}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {selection.progression.progressionCriteria && (
                          <div className="p-2 rounded bg-white border border-[#E5DFD4] space-y-0.5">
                            <span className="text-[10px] text-[#1B3B2B] font-semibold block">
                              Advance / Progression Criteria
                            </span>
                            <p className="text-[#2C332E]">
                              {selection.progression.progressionCriteria}
                            </p>
                          </div>
                        )}

                        {selection.progression.regressionCriteria && (
                          <div className="p-2 rounded bg-white border border-[#E5DFD4] space-y-0.5">
                            <span className="text-[10px] text-[#8C3A3A] font-semibold block">
                              Regress / Modification Criteria
                            </span>
                            <p className="text-[#2C332E]">
                              {selection.progression.regressionCriteria}
                            </p>
                          </div>
                        )}
                      </div>

                      {selection.progression.notes && (
                        <p className="text-[11px] text-[#555C56] italic pt-1">
                          Progression notes: {selection.progression.notes}
                        </p>
                      )}
                    </div>
                  )}

                {/* General Therapist Notes */}
                {selection.therapistNotes && (
                  <div className="text-xs text-[#555C56] border-t border-[#EFECE5] pt-2 flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#7A817B] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#353C37]">Clinician Note: </strong>
                      {selection.therapistNotes}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-dashed border-[#DDD6CB] bg-[#FDFCFA] text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#DDD6CB] flex items-center justify-center mx-auto text-[#7A817B]">
            <ListTodo className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-[#18201C]">
              {statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'No matching treatments for current filter'
                : 'No Treatments Added Yet'}
            </h4>
            <p className="text-xs text-[#636A64]">
              {statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting or clearing your status or category filters.'
                : 'Select "+ Add Treatment" to document an exercise, manual therapy, education, or functional intervention for this patient.'}
            </p>
          </div>

          <Button
            id="add-treatment-empty-state-btn"
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => handleOpenSelectionModal()}
          >
            + Add Treatment
          </Button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: TREATMENT PLAN MASTER MODAL */}
      {/* ========================================================= */}
      {isPlanModalOpen && (
        <div
          id="treatment-plan-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            id="treatment-plan-modal"
            className="bg-[#FAF8F5] border border-[#DDD6CB] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#EAE4DB] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#18201C]">
                  {activePlan ? 'Edit Treatment Plan' : 'Establish Treatment Plan'}
                </h3>
                <p className="text-xs text-[#525954]">
                  Therapist overall rehabilitation plan details.
                </p>
              </div>
              <button
                id="close-plan-modal-btn"
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 rounded-md text-[#7A817B] hover:text-[#18201C] hover:bg-[#EFECE5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPlanForm} className="space-y-4 text-xs">
              {/* Plan Title */}
              <div className="space-y-1">
                <label className="font-semibold text-[#18201C] block">
                  Plan Title (Optional)
                </label>
                <input
                  id="plan-title-input"
                  type="text"
                  value={planFormTitle}
                  onChange={(e) => setPlanFormTitle(e.target.value)}
                  placeholder="e.g. Shoulder Impingement & Rotator Cuff Active Rehabilitation Plan"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="font-semibold text-[#18201C] block">
                  Plan Status
                </label>
                <select
                  id="plan-status-select"
                  value={planFormStatus}
                  onChange={(e) => setPlanFormStatus(e.target.value as TreatmentPlanStatus)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                >
                  <option value="active">Active (Currently guiding care)</option>
                  <option value="modified">Modified (Adapted following re-evaluation)</option>
                  <option value="completed">Completed (Interventions fulfilled)</option>
                  <option value="discontinued">Discontinued (Ceased prior to completion)</option>
                </select>
              </div>

              {/* Clinical Rationale */}
              <div className="space-y-1">
                <label className="font-semibold text-[#18201C] block">
                  Clinical Rationale & Overall Strategy
                </label>
                <textarea
                  id="plan-rationale-textarea"
                  rows={4}
                  value={planFormRationale}
                  onChange={(e) => setPlanFormRationale(e.target.value)}
                  placeholder="Summarize the primary strategic intent, tissue healing considerations, mechanical priorities, and overall approach guiding this episode of care..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4DB]">
                <Button
                  id="cancel-plan-modal-btn"
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPlanModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  id="save-plan-modal-btn"
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Save Treatment Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: TREATMENT SELECTION FORM (ADD / EDIT) */}
      {/* ========================================================= */}
      {isSelectionModalOpen && (
        <div
          id="treatment-selection-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            id="treatment-selection-modal"
            className="bg-[#FAF8F5] border border-[#DDD6CB] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EAE4DB] bg-[#FAF8F5] rounded-t-xl shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#18201C]">
                  {editingSelection ? 'Edit Treatment Selection' : 'Add Treatment Selection'}
                </h3>
                <p className="text-xs text-[#525954]">
                  Therapist-chosen therapeutic intervention, parameters, and clinical linkage.
                </p>
              </div>
              <button
                id="close-selection-modal-btn"
                type="button"
                onClick={() => setIsSelectionModalOpen(false)}
                className="p-1 rounded-md text-[#7A817B] hover:text-[#18201C] hover:bg-[#EFECE5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="treatment-selection-form"
              onSubmit={handleSubmitSelectionForm}
              className="p-5 overflow-y-auto space-y-4 text-xs flex-1"
            >
              {/* Treatment Title, Intervention Type & Category */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#18201C] block">
                    Treatment Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="selection-title-input"
                    type="text"
                    required
                    value={selFormTitle}
                    onChange={(e) => setSelFormTitle(e.target.value)}
                    placeholder="e.g. Scapular Retraction & Lower Trapezius Isometrics"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#18201C] block">
                      Intervention Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="selection-intervention-type-select"
                      value={selFormInterventionType}
                      onChange={(e) => {
                        const val = e.target.value as TreatmentInterventionType;
                        setSelFormInterventionType(val);
                        setSelFormCategory(mapTypeToCategory(val));
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    >
                      {Object.entries(TREATMENT_INTERVENTION_TYPE_CONFIG).map(([typeKey, cfg]) => (
                        <option key={typeKey} value={typeKey}>
                          {cfg.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-[#6A726C] block">
                      {TREATMENT_INTERVENTION_TYPE_CONFIG[selFormInterventionType]?.description}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#18201C] block">
                      Treatment Category
                    </label>
                    <select
                      id="selection-category-select"
                      value={selFormCategory}
                      onChange={(e) =>
                        setSelFormCategory(e.target.value as TreatmentCategory)
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    >
                      <option value="exercise">Exercise Therapy</option>
                      <option value="manual_therapy">Manual Therapy</option>
                      <option value="education">Patient Education</option>
                      <option value="functional_training">Functional Training</option>
                      <option value="activity_modification">Activity Modification</option>
                      <option value="aerobic_conditioning">Aerobic Conditioning</option>
                      <option value="neuromuscular_training">Neuromuscular Training</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-[#18201C] block">
                    Description / Specific Technique
                  </label>
                  <input
                    id="selection-desc-input"
                    type="text"
                    value={selFormDescription}
                    onChange={(e) => setSelFormDescription(e.target.value)}
                    placeholder="Brief description of the technique, posture, or movement pattern..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#18201C] block">
                    Status
                  </label>
                  <select
                    id="selection-status-select"
                    value={selFormStatus}
                    onChange={(e) =>
                      setSelFormStatus(e.target.value as TreatmentSelectionStatus)
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="modified">Modified</option>
                    <option value="completed">Completed</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Therapist Rationale */}
              <div className="space-y-1">
                <label className="font-semibold text-[#18201C] block">
                  Therapist Clinical Rationale (Why selected for this case)
                </label>
                <textarea
                  id="selection-rationale-textarea"
                  rows={2}
                  value={selFormRationale}
                  onChange={(e) => setSelFormRationale(e.target.value)}
                  placeholder="Explain why you chose this specific approach for this patient's presentation..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              {/* Clinical Linkage Checklists & Stage 4E Evidence / Condition Linking */}
              <div className="p-3.5 rounded-lg bg-[#F5F1EB] border border-[#E5DFD4] space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#18201C] block">
                  Clinical Relationship Linkage (Stage 4E)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Problems Linkage */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#18201C] block text-[11px]">
                      Primary Problem Link:
                    </label>
                    <select
                      id="selection-primary-problem-select"
                      value={selFormClinicalProblemId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelFormClinicalProblemId(val);
                        if (val && !selFormLinkedProblemIds.includes(val)) {
                          setSelFormLinkedProblemIds((prev) => [...prev, val]);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD6CB] rounded-md text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    >
                      <option value="">-- No specific problem --</option>
                      {caseProblems.map((prob) => (
                        <option key={prob.id} value={prob.id}>
                          {prob.title}
                        </option>
                      ))}
                    </select>

                    {caseProblems.length > 1 && (
                      <div className="pt-1">
                        <span className="text-[10px] text-[#6A726C] block font-medium mb-1">
                          Also addresses secondary problem(s):
                        </span>
                        <div className="max-h-24 overflow-y-auto border border-[#DDD6CB] rounded-md bg-white p-2 space-y-1">
                          {caseProblems.map((prob, pIdx) => {
                            const isChecked = selFormLinkedProblemIds.includes(prob.id);
                            return (
                              <label
                                key={prob.id || `sel-modal-prob-${pIdx}`}
                                className={`flex items-start gap-2 p-1 rounded cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-[#EBF2EE] text-[#18201C]'
                                    : 'hover:bg-[#FAF8F5] text-[#414843]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleProblemLink(prob.id)}
                                  className="mt-0.5 rounded-xs border-[#C8C2B5] text-[#1B3B2B] focus:ring-[#1B3B2B]"
                                />
                                <span className="leading-snug text-xs">
                                  {prob.title}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Goals Linkage */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#18201C] block text-[11px]">
                      Primary Goal Link:
                    </label>
                    <select
                      id="selection-primary-goal-select"
                      value={selFormGoalId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelFormGoalId(val);
                        if (val && !selFormLinkedGoalIds.includes(val)) {
                          setSelFormLinkedGoalIds((prev) => [...prev, val]);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD6CB] rounded-md text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    >
                      <option value="">-- No specific goal --</option>
                      {caseGoals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>

                    {caseGoals.length > 1 && (
                      <div className="pt-1">
                        <span className="text-[10px] text-[#6A726C] block font-medium mb-1">
                          Also supports secondary goal(s):
                        </span>
                        <div className="max-h-24 overflow-y-auto border border-[#DDD6CB] rounded-md bg-white p-2 space-y-1">
                          {caseGoals.map((g, gIdx) => {
                            const isChecked = selFormLinkedGoalIds.includes(g.id);
                            return (
                              <label
                                key={g.id || `sel-modal-goal-${gIdx}`}
                                className={`flex items-start gap-2 p-1 rounded cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-[#EBF2EE] text-[#18201C]'
                                    : 'hover:bg-[#FAF8F5] text-[#414843]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleGoalLink(g.id)}
                                  className="mt-0.5 rounded-xs border-[#C8C2B5] text-[#1B3B2B] focus:ring-[#1B3B2B]"
                                />
                                <span className="leading-snug text-xs">
                                  {g.title}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence Knowledge Base Linkage */}
                <div className="pt-2 border-t border-[#DDD6CB] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[#18201C] block text-[11px] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#1B3B2B]" />
                      Link Supporting Evidence Item(s) ({selFormEvidenceLinks.length} linked)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEvidenceSelectorOpen(!isEvidenceSelectorOpen)}
                      className="text-[11px] text-[#1B3B2B] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isEvidenceSelectorOpen ? 'Close Evidence Picker' : '+ Add/Edit Evidence Links'}
                    </button>
                  </div>

                  {/* List of currently selected evidence links */}
                  {selFormEvidenceLinks.length > 0 ? (
                    <div className="space-y-1.5">
                      {selFormEvidenceLinks.map((linkItem) => {
                        const ev = evidenceItems.find((e) => e.id === linkItem.evidenceItemId);
                        if (!ev) return null;
                        const src = evidenceSources.find((s) => s.id === ev.sourceId);
                        return (
                          <div
                            key={linkItem.evidenceItemId}
                            className="p-2 rounded bg-white border border-[#DDD6CB] text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-[#18201C] text-[11px]">
                                {ev.claimOrFinding}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelFormEvidenceLinks((prev) =>
                                    prev.filter((l) => l.evidenceItemId !== linkItem.evidenceItemId)
                                  );
                                }}
                                className="text-red-500 hover:text-red-700 text-[10px] shrink-0 font-medium"
                              >
                                Remove
                              </button>
                            </div>
                            {src && (
                              <span className="text-[10px] text-[#6A726C] italic">
                                Source: {src.title} ({src.year || src.publicationStatus})
                              </span>
                            )}
                            <input
                              type="text"
                              value={linkItem.therapistNote || ''}
                              onChange={(e) => {
                                const newNote = e.target.value;
                                setSelFormEvidenceLinks((prev) =>
                                  prev.map((l) =>
                                    l.evidenceItemId === linkItem.evidenceItemId
                                      ? { ...l, therapistNote: newNote }
                                      : l
                                  )
                                );
                              }}
                              placeholder="Optional clinician rationale/context for applying this evidence..."
                              className="w-full px-2 py-1 text-[11px] bg-[#FAF8F5] border border-[#DDD6CB] rounded focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#7A817B] italic">
                      No evidence items linked. Click above to explicitly connect supporting literature.
                    </p>
                  )}

                  {/* Evidence Selector Drawer */}
                  {isEvidenceSelectorOpen && (
                    <div className="p-2.5 rounded-lg bg-white border border-[#CAD8D0] space-y-2 max-h-48 overflow-y-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6A726C] block">
                        Select Evidence from Knowledge Base:
                      </span>
                      {evidenceItems.length > 0 ? (
                        evidenceItems.map((ev) => {
                          const isLinked = selFormEvidenceLinks.some(
                            (l) => l.evidenceItemId === ev.id
                          );
                          const src = evidenceSources.find((s) => s.id === ev.sourceId);
                          return (
                            <div
                              key={ev.id}
                              className={`p-2 rounded border transition-colors flex items-start justify-between gap-2 ${
                                isLinked
                                  ? 'bg-[#EBF2EE] border-[#CAD8D0]'
                                  : 'bg-[#FAF8F5] border-[#DDD6CB] hover:bg-white'
                              }`}
                            >
                              <div className="space-y-0.5 flex-1">
                                <span className="font-medium text-[#18201C] text-[11px] block">
                                  {ev.claimOrFinding}
                                </span>
                                {src && (
                                  <span className="text-[10px] text-[#6A726C] block">
                                    {src.title} ({src.year || src.publicationStatus})
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isLinked) {
                                    setSelFormEvidenceLinks((prev) =>
                                      prev.filter((l) => l.evidenceItemId !== ev.id)
                                    );
                                  } else {
                                    setSelFormEvidenceLinks((prev) => [
                                      ...prev,
                                      { evidenceItemId: ev.id, therapistNote: '' },
                                    ]);
                                  }
                                }}
                                className={`px-2 py-1 text-[10px] rounded font-semibold cursor-pointer shrink-0 ${
                                  isLinked
                                    ? 'bg-[#1B3B2B] text-white'
                                    : 'bg-white border border-[#DDD6CB] text-[#18201C] hover:bg-[#EAE4DB]'
                                }`}
                              >
                                {isLinked ? 'Linked ✓' : '+ Link'}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-[#7A817B] italic">
                          No evidence items registered in the Knowledge Base yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Condition / Presentation Pathway Linkage */}
                <div className="pt-2 border-t border-[#DDD6CB] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[#18201C] block text-[11px] flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-[#22445E]" />
                      Link Condition / Presentation Pathway ({selFormConditionPresentationIds.length} linked)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsConditionSelectorOpen(!isConditionSelectorOpen)}
                      className="text-[11px] text-[#22445E] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isConditionSelectorOpen ? 'Close Condition Picker' : '+ Add/Edit Condition Links'}
                    </button>
                  </div>

                  {/* List of currently selected condition links */}
                  {selFormConditionPresentationIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selFormConditionPresentationIds.map((condId) => {
                        const cond = conditionPresentations.find((c) => c.id === condId);
                        if (!cond) return null;
                        return (
                          <div
                            key={condId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-[#DDD6CB] text-xs"
                          >
                            <span className="font-medium text-[#18201C] text-[11px]">{cond.name}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#EFF3F6] text-[#22445E] border border-[#CFDCE6] capitalize">
                              {cond.bodyRegion}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelFormConditionPresentationIds((prev) =>
                                  prev.filter((id) => id !== condId)
                                );
                              }}
                              className="text-red-500 hover:text-red-700 text-[10px] ml-1 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#7A817B] italic">
                      No condition presentation pathway linked.
                    </p>
                  )}

                  {/* Condition Selector Drawer */}
                  {isConditionSelectorOpen && (
                    <div className="p-2.5 rounded-lg bg-white border border-[#CFDCE6] space-y-2 max-h-48 overflow-y-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6A726C] block">
                        Select Pathway from Clinical Conditions:
                      </span>
                      {conditionPresentations.length > 0 ? (
                        conditionPresentations.map((cond) => {
                          const isLinked = selFormConditionPresentationIds.includes(cond.id);
                          return (
                            <div
                              key={cond.id}
                              className={`p-2 rounded border transition-colors flex items-start justify-between gap-2 ${
                                isLinked
                                  ? 'bg-[#EFF3F6] border-[#CFDCE6]'
                                  : 'bg-[#FAF8F5] border-[#DDD6CB] hover:bg-white'
                              }`}
                            >
                              <div className="space-y-0.5 flex-1">
                                <span className="font-medium text-[#18201C] text-[11px] block">
                                  {cond.name}
                                </span>
                                <span className="text-[10px] text-[#6A726C] block capitalize">
                                  Region: {cond.bodyRegion}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isLinked) {
                                    setSelFormConditionPresentationIds((prev) =>
                                      prev.filter((id) => id !== cond.id)
                                    );
                                  } else {
                                    setSelFormConditionPresentationIds((prev) => [...prev, cond.id]);
                                  }
                                }}
                                className={`px-2 py-1 text-[10px] rounded font-semibold cursor-pointer shrink-0 ${
                                  isLinked
                                    ? 'bg-[#22445E] text-white'
                                    : 'bg-white border border-[#DDD6CB] text-[#18201C] hover:bg-[#EAE4DB]'
                                }`}
                              >
                                {isLinked ? 'Linked ✓' : '+ Link'}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-[#7A817B] italic">
                          No condition pathways registered yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Dosage & Parameters */}
              <div className="border border-[#DDD6CB] rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsDosageExpanded(!isDosageExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-[#FAF8F5] text-left hover:bg-[#F5F2EB] transition-colors cursor-pointer"
                >
                  <span className="font-bold text-xs text-[#18201C] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    Dosage & Delivery Parameters
                  </span>
                  {isDosageExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#7A817B]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#7A817B]" />
                  )}
                </button>

                {isDosageExpanded && (
                  <div className="p-3.5 space-y-3 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-medium text-[#18201C] block text-[11px]">
                          Frequency
                        </label>
                        <input
                          id="dosage-frequency-input"
                          type="text"
                          value={selFormFrequency}
                          onChange={(e) => setSelFormFrequency(e.target.value)}
                          placeholder="e.g. 3x weekly, Daily, 2x per day"
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-[#18201C] block text-[11px]">
                          Intensity / Load
                        </label>
                        <input
                          id="dosage-intensity-input"
                          type="text"
                          value={selFormIntensity}
                          onChange={(e) => setSelFormIntensity(e.target.value)}
                          placeholder="e.g. RPE 4-5/10, Grade III, 50% 1RM"
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-[#18201C] block text-[11px]">
                          Volume / Sets & Reps
                        </label>
                        <input
                          id="dosage-volume-input"
                          type="text"
                          value={selFormVolume}
                          onChange={(e) => setSelFormVolume(e.target.value)}
                          placeholder="e.g. 3 sets x 10 reps, 5 holds x 30s"
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-[#18201C] block text-[11px]">
                          Duration
                        </label>
                        <input
                          id="dosage-duration-input"
                          type="text"
                          value={selFormDuration}
                          onChange={(e) => setSelFormDuration(e.target.value)}
                          placeholder="e.g. 15 minutes, 4 weeks"
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#18201C] block text-[11px]">
                        Execution Parameters & Movement Cues
                      </label>
                      <input
                        id="dosage-parameters-input"
                        type="text"
                        value={selFormParameters}
                        onChange={(e) => setSelFormParameters(e.target.value)}
                        placeholder="e.g. Supine, 3-second isometric hold, avoid compensatory hiking"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-[#18201C] block text-[11px]">
                        Dosage Notes
                      </label>
                      <input
                        id="dosage-notes-input"
                        type="text"
                        value={selFormDosageNotes}
                        onChange={(e) => setSelFormDosageNotes(e.target.value)}
                        placeholder="Any additional dosage qualifications..."
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Progression & Regression */}
              <div className="border border-[#DDD6CB] rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsProgressionExpanded(!isProgressionExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-[#FAF8F5] text-left hover:bg-[#F5F2EB] transition-colors cursor-pointer"
                >
                  <span className="font-bold text-xs text-[#18201C] flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    Planned Progression & Criteria
                  </span>
                  {isProgressionExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#7A817B]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#7A817B]" />
                  )}
                </button>

                {isProgressionExpanded && (
                  <div className="p-3.5 space-y-3 bg-white">
                    <div className="space-y-1">
                      <label className="font-medium text-[#18201C] block text-[11px]">
                        Planned Change / Next Step
                      </label>
                      <input
                        id="progression-planned-change-input"
                        type="text"
                        value={selFormPlannedChange}
                        onChange={(e) => setSelFormPlannedChange(e.target.value)}
                        placeholder="e.g. Progress to standing resistance band external rotation at 45 deg"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-medium text-[#18201C] block text-[11px]">
                          Progression Criteria
                        </label>
                        <textarea
                          id="progression-criteria-textarea"
                          rows={2}
                          value={selFormProgCriteria}
                          onChange={(e) => setSelFormProgCriteria(e.target.value)}
                          placeholder="e.g. 3x12 completed with pain <= 2/10 across 2 sessions"
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-[#18201C] block text-[11px]">
                          Regression Criteria
                        </label>
                        <textarea
                          id="regression-criteria-textarea"
                          rows={2}
                          value={selFormRegCriteria}
                          onChange={(e) => setSelFormRegCriteria(e.target.value)}
                          placeholder="e.g. Delayed soreness > 24 hours or night waking"
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-medium text-[#18201C] block text-[11px]">
                          Planned Review Date
                        </label>
                        <input
                          id="progression-review-date-input"
                          type="date"
                          value={selFormReviewDate}
                          onChange={(e) => setSelFormReviewDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-[#18201C] block text-[11px]">
                          Progression Notes
                        </label>
                        <input
                          id="progression-notes-input"
                          type="text"
                          value={selFormProgNotes}
                          onChange={(e) => setSelFormProgNotes(e.target.value)}
                          placeholder="Specific clinician progression cues..."
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CB] rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Therapist Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-[#18201C] block">
                  Therapist Notes (General Observations)
                </label>
                <textarea
                  id="selection-therapist-notes-textarea"
                  rows={2}
                  value={selFormTherapistNotes}
                  onChange={(e) => setSelFormTherapistNotes(e.target.value)}
                  placeholder="Additional observations, patient preferences, or execution cautions..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D5CFC4] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE4DB]">
                <Button
                  id="cancel-selection-modal-btn"
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSelectionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  id="save-selection-modal-btn"
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  {editingSelection ? 'Update Treatment' : 'Add Treatment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
