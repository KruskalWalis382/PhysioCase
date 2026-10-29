import React, { useState } from 'react';
import {
  ClinicalProblem,
  ClinicalProblemStatus,
  ObjectiveFinding,
} from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { CLINICAL_PROBLEM_STATUS_CONFIG } from '../../utils/clinicalProblems';
import { Button } from '../common/Button';
import {
  Brain,
  Plus,
  Edit3,
  Link2,
  FileText,
  FileScan,
  AlertCircle,
  CheckCircle2,
  Archive,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { RADIOLOGICAL_MODALITY_CONFIG } from '../../utils/clinicalInvestigations';

interface ClinicalReasoningSectionProps {
  caseId: string;
  patientId: string;
}

export const ClinicalReasoningSection: React.FC<ClinicalReasoningSectionProps> = ({
  caseId,
  patientId,
}) => {
  const {
    getObjectiveAssessment,
    getClinicalProblemsForCase,
    saveClinicalProblem,
    updateClinicalProblemStatus,
    deleteClinicalProblem,
    getClinicalInvestigationsForCase,
  } = useClinical();

  const objectiveAssessment = getObjectiveAssessment(caseId);
  const documentedFindings: ObjectiveFinding[] = objectiveAssessment?.findings || [];
  const problems = getClinicalProblemsForCase(caseId);
  const investigations = getClinicalInvestigationsForCase(caseId);

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<ClinicalProblem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLinkedFindingIds, setFormLinkedFindingIds] = useState<string[]>([]);
  const [formLinkedInvestigationIds, setFormLinkedInvestigationIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<ClinicalProblemStatus>('active');
  const [formTherapistNotes, setFormTherapistNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // View filter
  const [showInactive, setShowInactive] = useState(false);
  const [isFindingsPanelOpen, setIsFindingsPanelOpen] = useState(true);
  const [isInvestigationsPanelOpen, setIsInvestigationsPanelOpen] = useState(false);

  // Open modal for new problem
  const handleOpenNewProblemModal = () => {
    setEditingProblem(null);
    setFormTitle('');
    setFormDescription('');
    setFormLinkedFindingIds([]);
    setFormLinkedInvestigationIds([]);
    setFormStatus('active');
    setFormTherapistNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing existing problem
  const handleOpenEditProblemModal = (problem: ClinicalProblem) => {
    setEditingProblem(problem);
    setFormTitle(problem.title);
    setFormDescription(problem.description || '');
    setFormLinkedFindingIds(problem.linkedFindingIds || []);
    setFormLinkedInvestigationIds(problem.linkedInvestigationIds || []);
    setFormStatus(problem.status);
    setFormTherapistNotes(problem.therapistNotes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProblem(null);
    setFormError(null);
  };

  // Toggle finding link in form
  const handleToggleFindingLink = (findingId: string) => {
    setFormLinkedFindingIds((prev) =>
      prev.includes(findingId)
        ? prev.filter((id) => id !== findingId)
        : [...prev, findingId]
    );
  };

  // Toggle investigation link in form
  const handleToggleInvestigationLink = (investigationId: string) => {
    setFormLinkedInvestigationIds((prev) =>
      prev.includes(investigationId)
        ? prev.filter((id) => id !== investigationId)
        : [...prev, investigationId]
    );
  };

  // Save problem handler (create or edit)
  const handleSaveProblem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError('Problem title is required.');
      return;
    }

    saveClinicalProblem({
      id: editingProblem?.id,
      caseId,
      patientId,
      title: trimmedTitle,
      description: formDescription.trim() || undefined,
      linkedFindingIds: formLinkedFindingIds,
      linkedInvestigationIds: formLinkedInvestigationIds,
      status: formStatus,
      therapistNotes: formTherapistNotes.trim() || undefined,
    });

    handleCloseModal();
  };

  // Filter problems for display
  const activeProblems = problems.filter((p) => p.status !== 'inactive');
  const inactiveProblems = problems.filter((p) => p.status === 'inactive');
  const displayedProblems = showInactive ? problems : activeProblems;

  // Group documented findings by examination area for reference panel
  const findingsByArea = documentedFindings.reduce<Record<string, ObjectiveFinding[]>>(
    (acc, f) => {
      const area = f.examinationArea || 'General';
      if (!acc[area]) acc[area] = [];
      acc[area].push(f);
      return acc;
    },
    {}
  );

  return (
    <section
      id="section-clinical-reasoning"
      className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs space-y-6 scroll-mt-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D8]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1B3B2B]">
              Stage 3 • Clinical Formulation
            </span>
          </div>

          <h2 className="text-xl font-semibold text-[#18201C] tracking-tight">
            Clinical Reasoning
          </h2>

          <p className="text-xs text-[#525954] leading-relaxed max-w-2xl">
            Review what you found, identify what matters clinically, and formulate the problems you want to address.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            id="add-clinical-problem-btn"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenNewProblemModal}
          >
            Add clinical problem
          </Button>
        </div>
      </div>

      {/* Reference: Documented Objective Findings */}
      <div className="bg-[#FDFCFA] border border-[#E5DFD4] rounded-lg p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsFindingsPanelOpen(!isFindingsPanelOpen)}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#1B3B2B]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#353C37] group-hover:text-[#18201C]">
              Documented Objective Findings Reference ({documentedFindings.length})
            </h3>
            {isFindingsPanelOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#7A817B]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#7A817B]" />
            )}
          </button>

          <span className="text-[11px] text-[#7A817B]">
            Documented in Stage 2 • Objective Assessment
          </span>
        </div>

        {isFindingsPanelOpen && (
          <div className="pt-2 border-t border-[#EFECE5]">
            {documentedFindings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(findingsByArea).map(([area, areaFindings], areaIdx) => (
                  <div
                    key={`finding-area-${area || 'general'}-${areaIdx}`}
                    className="p-3 rounded-md bg-[#FAF8F5] border border-[#E5DFD4] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-[#18201C]">
                        {area}
                      </span>
                      <span className="text-[10px] text-[#7A817B]">
                        {areaFindings.length} {areaFindings.length === 1 ? 'finding' : 'findings'}
                      </span>
                    </div>

                    <ul className="space-y-1 text-xs text-[#414843]">
                      {areaFindings.map((f, fIdx) => (
                        <li
                          key={f.id ? `f-${f.id}` : `f-${area}-${fIdx}`}
                          className="flex items-start gap-1.5 leading-snug pl-1.5 border-l-2 border-[#CAD8D0]"
                        >
                          <span className="break-words">
                            {f.finding.trim() || '(No text recorded)'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-md bg-[#FAF8F5] border border-dashed border-[#DDD6CB] text-xs text-[#6E756F] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#8C5E1A] shrink-0" />
                  <span>
                    No objective findings have been documented yet. Complete or continue the Objective Assessment to build your clinical picture.
                  </span>
                </div>
                <span className="text-[11px] text-[#7A817B]">
                  You can still formulate clinical problems.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reference: Documented Clinical Investigations (Stage 4F) */}
      <div className="bg-[#FDFCFA] border border-[#C8DCF0] rounded-lg p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsInvestigationsPanelOpen(!isInvestigationsPanelOpen)}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <FileScan className="w-4 h-4 text-[#1D4E89]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1D4E89] group-hover:text-[#13355E]">
              Documented Investigations Reference ({investigations.length})
            </h3>
            {isInvestigationsPanelOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#7A817B]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#7A817B]" />
            )}
          </button>

          <span className="text-[11px] text-[#7A817B]">
            Documented in Stage 4F • Clinical Investigations
          </span>
        </div>

        {isInvestigationsPanelOpen && (
          <div className="pt-2 border-t border-[#E8EEF5]">
            {investigations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {investigations.map((inv) => {
                  const modConfig =
                    RADIOLOGICAL_MODALITY_CONFIG[inv.modality] ||
                    RADIOLOGICAL_MODALITY_CONFIG.other;

                  return (
                    <div
                      key={`ref-inv-${inv.id}`}
                      className="p-3 rounded-md bg-[#FAFBFD] border border-[#D9E6F5] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-[#18201C] truncate">
                          {inv.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${modConfig.badgeClass}`}
                        >
                          {modConfig.shortLabel}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#555C56]">
                        <span>{inv.investigationDate}</span>
                        {inv.bodyRegion && <span> • {inv.bodyRegion}</span>}
                      </div>

                      {inv.impression ? (
                        <p className="text-xs text-[#2C3E30] bg-white p-1.5 rounded border border-[#E2E8F0] line-clamp-2">
                          <span className="font-medium text-[#1D4E89]">Impression:</span>{' '}
                          {inv.impression}
                        </p>
                      ) : inv.findings ? (
                        <p className="text-xs text-[#2C3E30] bg-white p-1.5 rounded border border-[#E2E8F0] line-clamp-2">
                          <span className="font-medium text-[#1D4E89]">Findings:</span>{' '}
                          {inv.findings}
                        </p>
                      ) : null}

                      {inv.clinicianRelevance && (
                        <p className="text-[11px] text-[#1B3B2B] italic line-clamp-2 pt-0.5">
                          Therapist: {inv.clinicianRelevance}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 rounded-md bg-[#FAFBFD] border border-dashed border-[#C8DCF0] text-xs text-[#555C56] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileScan className="w-4 h-4 text-[#1D4E89] shrink-0" />
                  <span>
                    No radiological investigations documented yet for this case. You can add them in Clinical Investigations above and link them here.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinical Problems List */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#353C37]">
              Formulated Clinical Problems ({activeProblems.length} active)
            </h3>
            <p className="text-xs text-[#636A64]">
              Problems formulated by the clinician.
            </p>
          </div>

          {inactiveProblems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className="inline-flex items-center gap-1.5 text-xs text-[#636A64] hover:text-[#18201C] font-medium cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>
                {showInactive
                  ? 'Hide inactive problems'
                  : `Show inactive problems (${inactiveProblems.length})`}
              </span>
            </button>
          )}
        </div>

        {displayedProblems.length > 0 ? (
          <div className="space-y-3">
            {displayedProblems.map((problem, problemIdx) => {
              const statusCfg =
                CLINICAL_PROBLEM_STATUS_CONFIG[problem.status] ||
                CLINICAL_PROBLEM_STATUS_CONFIG.active;

              // Resolve linked findings live from documentedFindings, deduplicating IDs
              const uniqueFindingIds = Array.from(
                new Set(problem.linkedFindingIds || [])
              );
              const linkedFindings = uniqueFindingIds
                .map((fId) => documentedFindings.find((df) => df.id === fId))
                .filter((f): f is ObjectiveFinding => f !== undefined);

              // Resolve linked investigations live from investigations
              const uniqueInvestigationIds = Array.from(
                new Set(problem.linkedInvestigationIds || [])
              );
              const linkedInvestigations = uniqueInvestigationIds
                .map((invId) => investigations.find((inv) => inv.id === invId))
                .filter((inv): inv is NonNullable<typeof inv> => inv !== undefined);

              const problemKey = problem.id || `problem-${problemIdx}`;

              return (
                <div
                  key={problemKey}
                  id={`clinical-problem-${problem.id || problemIdx}`}
                  className={`bg-[#FDFCFA] border rounded-lg p-4 space-y-3 shadow-2xs transition-all ${
                    problem.status === 'inactive'
                      ? 'border-[#E0D9CE] opacity-75'
                      : 'border-[#E2DDD3]'
                  }`}
                >
                  {/* Problem Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#EFECE5] pb-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full border ${statusCfg.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
                          />
                          <span>{statusCfg.label}</span>
                        </span>

                        <h4 className="text-sm font-semibold text-[#18201C] leading-snug">
                          {problem.title}
                        </h4>
                      </div>

                      {problem.description && (
                        <p className="text-xs text-[#525954] leading-relaxed pt-0.5">
                          {problem.description}
                        </p>
                      )}
                    </div>

                    {/* Quick status selector & edit button */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <select
                        aria-label="Change status"
                        value={problem.status}
                        onChange={(e) =>
                          updateClinicalProblemStatus(
                            problem.id,
                            e.target.value as ClinicalProblemStatus
                          )
                        }
                        className="text-[11px] py-1 px-2 bg-[#FAF8F5] border border-[#D5CFC4] rounded-md text-[#18201C] focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B]"
                      >
                        <option value="active">Active</option>
                        <option value="addressed">Addressed</option>
                        <option value="resolved">Resolved</option>
                        <option value="inactive">Inactive</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEditProblemModal(problem)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Linked Findings List */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#6E756F]">
                      <Link2 className="w-3.5 h-3.5 text-[#1B3B2B]" />
                      <span>Linked findings ({linkedFindings.length}):</span>
                    </div>

                    {linkedFindings.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedFindings.map((lf, lfIdx) => (
                          <div
                            key={
                              lf.id
                                ? `${problemKey}-lf-${lf.id}`
                                : `${problemKey}-lf-idx-${lfIdx}`
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#E5DFD4] text-xs text-[#353C37]"
                          >
                            <span className="font-semibold text-[#18201C] text-[11px]">
                              {lf.examinationArea}:
                            </span>
                            <span className="text-[#555C56]">
                              {lf.finding.trim() || '(Recorded)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#8C938E] italic">
                        No specific findings linked to this problem formulation yet.
                      </span>
                    )}
                  </div>

                  {/* Linked Investigations List (Stage 4F) */}
                  <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#1D4E89]">
                        <FileScan className="w-3.5 h-3.5 text-[#1D4E89]" />
                        <span>Linked investigations ({linkedInvestigations.length}):</span>
                      </div>

                      {linkedInvestigations.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {linkedInvestigations.map((li) => {
                            const modConfig =
                              RADIOLOGICAL_MODALITY_CONFIG[li.modality] ||
                              RADIOLOGICAL_MODALITY_CONFIG.other;

                            return (
                              <div
                                key={`${problemKey}-li-${li.id}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EEF4FB] border border-[#C8DCF0] text-xs text-[#1D4E89]"
                              >
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${modConfig.badgeClass}`}
                                >
                                  {modConfig.shortLabel}
                                </span>
                                <span className="font-semibold text-[#18201C] text-[11px]">
                                  {li.name}
                                </span>
                                {li.bodyRegion && (
                                  <span className="text-[#555C56] text-[11px]">
                                    ({li.bodyRegion})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8C938E] italic">
                          No investigations linked to this problem formulation.
                        </span>
                      )}
                    </div>

                  {/* Therapist Notes */}
                  {problem.therapistNotes && (
                    <div className="pt-2 border-t border-[#EFECE5] text-xs text-[#525954] space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-[#7A817B] tracking-wider">
                        Therapist Notes:
                      </span>
                      <p className="italic leading-relaxed">
                        {problem.therapistNotes}
                      </p>
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between text-[10px] text-[#8C938E] pt-1">
                    <span>
                      Created:{' '}
                      {new Date(problem.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {problem.resolvedAt && (
                      <span className="text-[#1B3B2B] font-medium">
                        Resolved:{' '}
                        {new Date(problem.resolvedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-[#FAF8F5] border border-dashed border-[#D5CFC4] text-center space-y-2">
            <p className="text-xs text-[#636A64]">
              No clinical problems formulated yet for this case.
            </p>
            <p className="text-[11px] text-[#7A817B] max-w-md mx-auto">
              Identify the key functional or impairment limitations from your assessment and connect them to documented objective findings.
            </p>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleOpenNewProblemModal}
              >
                Formulate first problem
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Problem Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141A16]/50 backdrop-blur-xs"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-xl bg-[#FAF8F5] border border-[#E0D9CE] rounded-xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#E8E2D8] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#18201C]">
                    {editingProblem ? 'Edit Clinical Problem' : 'Formulate Clinical Problem'}
                  </h3>
                </div>
                <p className="text-xs text-[#636A64]">
                  Identify what matters clinically and connect it to documented objective findings.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="text-[#7A817B] hover:text-[#18201C] p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProblem} className="space-y-4">
              {formError && (
                <div className="p-2.5 rounded-md bg-[#FDF2F2] border border-[#F8B4B4] text-xs text-[#9B1C1C] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="problem-title"
                  className="block text-xs font-semibold text-[#18201C]"
                >
                  Problem <span className="text-[#8F2D26]">*</span>
                </label>
                <input
                  id="problem-title"
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="What problem matters clinically? (e.g. Reduced right knee function during stair descent)"
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-white border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="problem-description"
                  className="block text-xs font-semibold text-[#18201C]"
                >
                  Description (Optional)
                </label>
                <input
                  id="problem-description"
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the problem in more detail..."
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-white border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label
                  htmlFor="problem-status"
                  className="block text-xs font-semibold text-[#18201C]"
                >
                  Status
                </label>
                <select
                  id="problem-status"
                  value={formStatus}
                  onChange={(e) =>
                    setFormStatus(e.target.value as ClinicalProblemStatus)
                  }
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-white border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                >
                  <option value="active">Active (Currently relevant to episode)</option>
                  <option value="addressed">Addressed (Intervention underway)</option>
                  <option value="resolved">Resolved (Therapist considers resolved)</option>
                  <option value="inactive">Inactive (Historical retention)</option>
                </select>
              </div>

              {/* Link Findings Selection */}
              <div className="space-y-2 pt-2 border-t border-[#EAE4DB]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#18201C]">
                    Link Documented Findings
                  </label>
                  <span className="text-[11px] text-[#7A817B]">
                    {formLinkedFindingIds.length} selected
                  </span>
                </div>
                <p className="text-[11px] text-[#636A64]">
                  Select the documented physical examination findings that substantiate or relate to this clinical problem:
                </p>

                {documentedFindings.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto p-2 bg-white border border-[#D5CFC4] rounded-lg space-y-2">
                    {Object.entries(findingsByArea).map(([area, areaFindings], areaIdx) => (
                      <div key={`modal-area-${area || 'general'}-${areaIdx}`} className="space-y-1">
                        <span className="text-[11px] font-semibold text-[#1B3B2B] uppercase tracking-wider block">
                          {area}
                        </span>
                        <div className="space-y-1 pl-2">
                          {areaFindings.map((f, fIdx) => {
                            const isChecked = f.id ? formLinkedFindingIds.includes(f.id) : false;
                            const findingKey = f.id
                              ? `modal-finding-${f.id}`
                              : `modal-finding-${area || 'gen'}-${fIdx}`;
                            return (
                              <label
                                key={findingKey}
                                className={`flex items-start gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-[#EBF2EE] text-[#18201C]'
                                    : 'hover:bg-[#FAF8F5] text-[#414843]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => f.id && handleToggleFindingLink(f.id)}
                                  className="mt-0.5 rounded-xs border-[#C8C2B5] text-[#1B3B2B] focus:ring-[#1B3B2B]"
                                />
                                <span className="leading-snug break-words">
                                  {f.finding.trim() || '(Blank finding)'}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#DDD6CB] rounded-md text-xs text-[#7A817B]">
                    No objective findings documented yet for this case. You can create the problem now and link findings later.
                  </div>
                )}
              </div>

              {/* Link Investigations Selection (Stage 4F) */}
              <div className="space-y-2 pt-2 border-t border-[#EAE4DB]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#18201C] flex items-center gap-1.5">
                    <FileScan className="w-3.5 h-3.5 text-[#1D4E89]" />
                    <span>Link Documented Investigations</span>
                  </label>
                  <span className="text-[11px] text-[#7A817B]">
                    {formLinkedInvestigationIds.length} selected
                  </span>
                </div>
                <p className="text-[11px] text-[#636A64]">
                  Select documented radiological investigations that substantiate or correlate with this problem formulation:
                </p>

                {investigations.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto p-2 bg-white border border-[#D5CFC4] rounded-lg space-y-1.5">
                    {investigations.map((inv) => {
                      const isChecked = formLinkedInvestigationIds.includes(inv.id);
                      const modConfig =
                        RADIOLOGICAL_MODALITY_CONFIG[inv.modality] ||
                        RADIOLOGICAL_MODALITY_CONFIG.other;

                      return (
                        <label
                          key={`modal-inv-${inv.id}`}
                          className={`flex items-start gap-2 p-2 rounded-md text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-[#EEF4FB] text-[#18201C] border border-[#C8DCF0]'
                              : 'hover:bg-[#FAF8F5] text-[#414843] border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleInvestigationLink(inv.id)}
                            className="mt-0.5 rounded-xs border-[#C8C2B5] text-[#1D4E89] focus:ring-[#1D4E89]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono font-bold text-[#555C56]">
                                {inv.id}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${modConfig.badgeClass}`}
                              >
                                {modConfig.shortLabel}
                              </span>
                              <span className="font-semibold text-[#18201C]">
                                {inv.name}
                              </span>
                              <span className="text-[11px] text-[#7A817B]">
                                ({inv.investigationDate})
                              </span>
                            </div>
                            {inv.impression && (
                              <p className="text-[11px] text-[#555C56] mt-0.5 line-clamp-1 italic">
                                Impression: {inv.impression}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#DDD6CB] rounded-md text-xs text-[#7A817B]">
                    No investigations documented yet for this case. You can create the problem now and associate investigations later.
                  </div>
                )}
              </div>

              {/* Therapist Notes */}
              <div className="space-y-1.5 pt-2 border-t border-[#EAE4DB]">
                <label
                  htmlFor="problem-notes"
                  className="block text-xs font-semibold text-[#18201C]"
                >
                  Therapist Notes (Optional)
                </label>
                <textarea
                  id="problem-notes"
                  rows={2}
                  value={formTherapistNotes}
                  onChange={(e) => setFormTherapistNotes(e.target.value)}
                  placeholder="Additional clinician reasoning, movement nuances, or contextual factors..."
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-white border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#E8E2D8] flex items-center justify-between gap-2">
                {editingProblem ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Are you sure you want to delete this clinical problem? Consider marking it Inactive to preserve historical record instead.'
                        )
                      ) {
                        deleteClinicalProblem(editingProblem.id);
                        handleCloseModal();
                      }
                    }}
                    className="text-xs text-[#8F2D26] hover:underline cursor-pointer"
                  >
                    Delete problem
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    {editingProblem ? 'Save changes' : 'Add problem'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
