import React, { useState } from 'react';
import {
  ClinicalThread,
  ClinicalThreadStatus,
  ClinicalThreadCategory,
  SubjectiveAssessment,
} from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { Button } from '../common/Button';
import {
  Compass,
  CheckCircle2,
  XCircle,
  FileEdit,
  Activity,
  ShieldAlert,
  Zap,
  Target,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ClinicalThreadsSectionProps {
  caseId: string;
  assessment: SubjectiveAssessment | null;
}

export const ClinicalThreadsSection: React.FC<ClinicalThreadsSectionProps> = ({
  caseId,
  assessment,
}) => {
  const {
    getClinicalThreadsForCase,
    updateClinicalThreadStatus,
    updateClinicalThreadNotes,
    generateClinicalThreadsForCase,
  } = useClinical();

  const threads = getClinicalThreadsForCase(caseId);
  const isAssessmentCompleted = assessment?.status === 'completed';

  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);

  const handleStartEditNote = (thread: ClinicalThread) => {
    setEditingNotesId(thread.id);
    setNoteDraft(thread.therapistNotes || '');
  };

  const handleSaveNote = (threadId: string) => {
    updateClinicalThreadNotes(threadId, noteDraft.trim());
    setEditingNotesId(null);
  };

  const handleStatusChange = (
    threadId: string,
    newStatus: ClinicalThreadStatus
  ) => {
    updateClinicalThreadStatus(threadId, newStatus);
  };

  const getCategoryIcon = (category: ClinicalThreadCategory) => {
    switch (category) {
      case 'neurological':
        return <Zap className="w-4 h-4 text-[#3C5645]" />;
      case 'safety':
        return <ShieldAlert className="w-4 h-4 text-[#8F2D26]" />;
      case 'trauma':
        return <Activity className="w-4 h-4 text-[#8C5E2A]" />;
      case 'functional':
        return <Target className="w-4 h-4 text-[#2A526E]" />;
      case 'mechanical':
        return <Layers className="w-4 h-4 text-[#445E3B]" />;
      default:
        return <Compass className="w-4 h-4 text-[#1B3B2B]" />;
    }
  };

  const getStatusBadge = (status: ClinicalThreadStatus) => {
    switch (status) {
      case 'suggested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4EFEB] text-[#555C56] border border-[#DDD6CB]">
            Suggested
          </span>
        );
      case 'exploring':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#CAD8D0]">
            <Compass className="w-3 h-3 text-[#1B3B2B]" />
            Exploring
          </span>
        );
      case 'supported':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E2ECE6] text-[#1B3B2B] border border-[#B8CCC0]">
            <CheckCircle2 className="w-3 h-3 text-[#1B3B2B]" />
            Supported
          </span>
        );
      case 'not_supported':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0ECE6] text-[#6E756F] border border-[#DDD6CB]">
            <XCircle className="w-3 h-3 text-[#7D847F]" />
            Not Supported
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EAE5DD] text-[#555C56] border border-[#D5CEC4]">
            Resolved
          </span>
        );
      case 'not_pursued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4EFEB] text-[#7A817B] border border-[#DDD6CB]">
            Not Pursued
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      id="case-clinical-threads-section"
      className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs space-y-5"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE4DB]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-[#18201C]">
                Clinical Threads
              </h3>
              {threads.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                  {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#636A64] mt-0.5">
              Clinically relevant patterns identified from documented subjective findings to guide physical examination.
            </p>
          </div>
        </div>

        {/* If assessment is completed and for any reason threads are empty or re-check is desired */}
        {isAssessmentCompleted && (
          <Button
            id="refresh-threads-btn"
            variant="ghost"
            size="sm"
            onClick={() => assessment && generateClinicalThreadsForCase(assessment)}
            title="Reconcile threads with latest completed subjective findings"
          >
            Refresh Threads
          </Button>
        )}
      </div>

      {/* State 1: Assessment not completed yet */}
      {!isAssessmentCompleted && threads.length === 0 && (
        <div className="p-4 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] text-xs text-[#636A64] space-y-1">
          <p className="font-medium text-[#2C332E]">
            Clinical Threads will be generated when the Subjective Assessment is completed.
          </p>
          <p className="text-[#6E756F] leading-relaxed">
            As you document symptoms, onset, aggravating factors, functional difficulties, and safety screening, PhysioCase will compile evidence-linked clinical threads for your consideration.
          </p>
        </div>
      )}

      {/* State 2: Assessment completed but no threads triggered (Test F) */}
      {isAssessmentCompleted && threads.length === 0 && (
        <div className="p-4 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] text-xs text-[#636A64] space-y-1">
          <p className="font-medium text-[#2C332E]">
            No structured clinical threads were triggered.
          </p>
          <p className="text-[#6E756F] leading-relaxed">
            The documented subjective findings did not meet specific rule thresholds for neurological, trauma, safety, functional, or mechanical triggers. You may proceed directly to the Objective Examination with standard physical assessment protocols.
          </p>
        </div>
      )}

      {/* State 3: Display Threads */}
      {threads.length > 0 && (
        <div className="space-y-4">
          <div className="text-[11px] text-[#6E756F]">
            Showing patterns derived deterministically from documented findings. You retain full control over which threads to explore, support, or set aside.
          </div>

          <div className="space-y-3.5">
            {threads.map((thread) => {
              const isExpanded =
                expandedThreadId === thread.id ||
                thread.status === 'exploring' ||
                thread.status === 'suggested';
              const isEditingNotes = editingNotesId === thread.id;

              return (
                <div
                  key={thread.id}
                  id={`thread-card-${thread.id}`}
                  className="bg-[#FAF8F5] border border-[#E0D9CE] hover:border-[#BFB7AA] rounded-xl p-4 sm:p-5 transition-colors space-y-4 shadow-2xs"
                >
                  {/* Top Bar: Title, Category, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(thread.category)}
                        <h4 className="text-sm font-semibold text-[#18201C]">
                          {thread.title}
                        </h4>
                        {getStatusBadge(thread.status)}
                      </div>
                      <p className="text-xs text-[#4E5650] leading-relaxed max-w-3xl">
                        {thread.rationale}
                      </p>
                    </div>

                    {/* Toggle Details Chevron */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedThreadId(isExpanded ? null : thread.id)
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-[#636A64] hover:text-[#18201C] self-end sm:self-auto cursor-pointer"
                    >
                      <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Evidence / Triggered By */}
                  <div className="p-3 rounded-lg bg-[#F5F1EB] border border-[#E6E0D5] space-y-1.5 text-xs">
                    <div className="text-[10px] uppercase font-semibold text-[#636A64] tracking-wider">
                      Triggered By (Documented Findings)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {thread.triggeredBy.map((signal, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#2C332E] border border-[#DDD6CB]"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expanded Section: Suggested Areas & Therapist Notes */}
                  {isExpanded && (
                    <div className="space-y-3.5 pt-1 text-xs animate-in fade-in duration-150">
                      {/* Suggested Examination Areas */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#373F3A]">
                          Consider exploring during Objective Examination:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                          {thread.suggestedAreas.map((area, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-[#4A524C]"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1B3B2B] shrink-0" />
                              <span>{area}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Therapist Clinical Notes */}
                      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E3DDD2] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#2C332E] flex items-center gap-1.5">
                            <FileEdit className="w-3.5 h-3.5 text-[#636A64]" />
                            <span>Therapist Notes</span>
                          </span>
                          {!isEditingNotes && (
                            <button
                              type="button"
                              onClick={() => handleStartEditNote(thread)}
                              className="text-xs text-[#1B3B2B] hover:underline cursor-pointer"
                            >
                              {thread.therapistNotes ? 'Edit note' : '+ Add note'}
                            </button>
                          )}
                        </div>

                        {isEditingNotes ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Record clinical reasoning, planned tests, or hypotheses..."
                              className="w-full text-xs p-2.5 rounded-lg border border-[#D5CEC4] bg-white text-[#18201C] focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingNotesId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSaveNote(thread.id)}
                              >
                                Save Note
                              </Button>
                            </div>
                          </div>
                        ) : thread.therapistNotes ? (
                          <p className="text-xs text-[#343B36] italic leading-relaxed">
                            "{thread.therapistNotes}"
                          </p>
                        ) : (
                          <p className="text-xs text-[#838A84] italic">
                            No notes recorded for this thread yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Therapist Action Controls */}
                  <div className="pt-3 border-t border-[#EAE4DB] flex flex-wrap items-center justify-between gap-2.5">
                    <div className="text-[11px] text-[#6E756F]">
                      Status: <strong className="text-[#18201C]">{thread.status.replace('_', ' ')}</strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Transition actions for 'suggested' */}
                      {thread.status === 'suggested' && (
                        <>
                          <Button
                            id={`thread-explore-btn-${thread.id}`}
                            variant="primary"
                            size="sm"
                            leftIcon={<Compass className="w-3.5 h-3.5" />}
                            onClick={() => handleStatusChange(thread.id, 'exploring')}
                          >
                            Explore
                          </Button>
                          <Button
                            id={`thread-not-pursue-btn-${thread.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(thread.id, 'not_pursued')}
                          >
                            Not pursue
                          </Button>
                        </>
                      )}

                      {/* Transition actions for 'exploring' */}
                      {thread.status === 'exploring' && (
                        <>
                          <Button
                            id={`thread-support-btn-${thread.id}`}
                            variant="primary"
                            size="sm"
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => handleStatusChange(thread.id, 'supported')}
                          >
                            Support
                          </Button>
                          <Button
                            id={`thread-not-support-btn-${thread.id}`}
                            variant="secondary"
                            size="sm"
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                            onClick={() => handleStatusChange(thread.id, 'not_supported')}
                          >
                            Not supported
                          </Button>
                          <Button
                            id={`thread-revert-suggested-btn-${thread.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(thread.id, 'suggested')}
                          >
                            Revert
                          </Button>
                        </>
                      )}

                      {/* Transition actions for 'supported' */}
                      {thread.status === 'supported' && (
                        <>
                          <Button
                            id={`thread-resolve-btn-${thread.id}`}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStatusChange(thread.id, 'resolved')}
                          >
                            Resolve
                          </Button>
                          <Button
                            id={`thread-reopen-exploring-btn-${thread.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(thread.id, 'exploring')}
                          >
                            Re-explore
                          </Button>
                        </>
                      )}

                      {/* Transition actions for 'not_supported' or 'not_pursued' or 'resolved' */}
                      {(thread.status === 'not_supported' ||
                        thread.status === 'not_pursued' ||
                        thread.status === 'resolved') && (
                        <Button
                          id={`thread-reopen-btn-${thread.id}`}
                          variant="ghost"
                          size="sm"
                          leftIcon={<Compass className="w-3.5 h-3.5" />}
                          onClick={() => handleStatusChange(thread.id, 'exploring')}
                        >
                          Re-open / Explore
                        </Button>
                      )}
                    </div>
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
