import React, { useState, useEffect, useMemo } from 'react';
import { X, Archive, AlertTriangle, ShieldAlert, Info, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '../common/Button';
import { useClinical } from '../../context/ClinicalContext';
import { Case, CaseArchiveReason } from '../../types';
import {
  canArchiveCase,
  getCaseClinicalFootprint,
  CaseFootprintDataset,
} from '../../utils/clinicalAudit';

export interface ArchiveCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: Case | null;
  onSuccess?: () => void;
}

export const ARCHIVE_REASONS_CATALOGUE: Array<{
  value: CaseArchiveReason;
  label: string;
  category: 'pre_clinical' | 'clinical' | 'both';
  description: string;
  requiresNotes?: boolean;
}> = [
  {
    value: 'created_in_error',
    label: 'Created in Error (Accidental shell / empty record)',
    category: 'pre_clinical',
    description: 'Case was opened accidentally or prematurely without clinical documentation. Permitted only if no clinical notes or encounters exist.',
  },
  {
    value: 'test_or_demo',
    label: 'Test / Training / Demonstration Record',
    category: 'pre_clinical',
    description: 'Case was created for software testing, training, or demonstration purposes. Permitted only for pre-clinical shells.',
  },
  {
    value: 'duplicate_entry',
    label: 'Duplicate Entry',
    category: 'both',
    description: 'A duplicate case was created for this patient. Explanatory notes are required.',
    requiresNotes: true,
  },
  {
    value: 'wrong_patient',
    label: 'Wrong Patient Chart',
    category: 'both',
    description: 'Case was mistakenly opened under the wrong patient profile. Explanatory notes are strictly required.',
    requiresNotes: true,
  },
  {
    value: 'care_discontinued_uncontactable',
    label: 'Care Discontinued — Patient Uncontactable / Defaulted',
    category: 'clinical',
    description: 'Patient ceased attending, did not respond to follow-up contact, and formal discharge consultation could not be performed.',
  },
  {
    value: 'care_transferred_external',
    label: 'Care Transferred to External Provider / Facility',
    category: 'clinical',
    description: 'Patient care transitioned to another practice, specialist, hospital, or external clinician.',
  },
  {
    value: 'clinical_hold_inactive',
    label: 'Clinical Hold / Extended Inactivity',
    category: 'clinical',
    description: 'Episode paused or suspended for an extended interval without formal discharge.',
  },
  {
    value: 'administrative_closure',
    label: 'Administrative Closure',
    category: 'clinical',
    description: 'Administrative or insurance-mandated closure without full clinical discharge. Explanatory notes are required.',
    requiresNotes: true,
  },
];

export function formatArchiveReasonLabel(reason: CaseArchiveReason | string | undefined): string {
  if (!reason) return 'Unknown Reason';
  const found = ARCHIVE_REASONS_CATALOGUE.find((r) => r.value === reason);
  return found ? found.label : reason.replace(/_/g, ' ');
}

export const ArchiveCaseModal: React.FC<ArchiveCaseModalProps> = ({
  isOpen,
  onClose,
  caseItem,
  onSuccess,
}) => {
  const {
    clinicalSessions,
    sessionTreatmentDeliveries,
    progressRecords,
    progressMeasurements,
    caseDischargeRecords,
    subjectiveAssessments,
    objectiveAssessments,
    clinicalProblems,
    clinicalGoals,
    treatmentPlans,
    treatmentSelections,
    clinicalInvestigations,
    archiveCase,
  } = useClinical();

  const [selectedReason, setSelectedReason] = useState<CaseArchiveReason | ''>('');
  const [archiveNotes, setArchiveNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assemble footprint dataset
  const dataset: CaseFootprintDataset = useMemo(
    () => ({
      clinicalSessions,
      sessionTreatmentDeliveries,
      progressRecords,
      progressMeasurements,
      caseDischargeRecords,
      subjectiveAssessments,
      objectiveAssessments,
      clinicalProblems,
      clinicalGoals,
      treatmentPlans,
      treatmentSelections,
      clinicalInvestigations,
    }),
    [
      clinicalSessions,
      sessionTreatmentDeliveries,
      progressRecords,
      progressMeasurements,
      caseDischargeRecords,
      subjectiveAssessments,
      objectiveAssessments,
      clinicalProblems,
      clinicalGoals,
      treatmentPlans,
      treatmentSelections,
      clinicalInvestigations,
    ]
  );

  const footprint = useMemo(() => {
    if (!caseItem) return null;
    return getCaseClinicalFootprint(caseItem, dataset);
  }, [caseItem, dataset]);

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen && caseItem && footprint) {
      setError(null);
      setArchiveNotes('');
      if (footprint.isPreClinical) {
        setSelectedReason('created_in_error');
      } else {
        setSelectedReason('care_discontinued_uncontactable');
      }
    }
  }, [isOpen, caseItem, footprint]);

  if (!isOpen || !caseItem || !footprint) return null;

  const availableReasons = ARCHIVE_REASONS_CATALOGUE.filter((item) => {
    if (footprint.isPreClinical) {
      return item.category === 'pre_clinical' || item.category === 'both';
    } else {
      return item.category === 'clinical' || item.category === 'both';
    }
  });

  const selectedReasonMeta = ARCHIVE_REASONS_CATALOGUE.find((r) => r.value === selectedReason);
  const notesRequired = Boolean(
    selectedReason === 'wrong_patient' ||
      selectedReason === 'administrative_closure' ||
      selectedReason === 'duplicate_entry' ||
      !footprint.isPreClinical
  );

  const validationResult = selectedReason
    ? canArchiveCase(caseItem, dataset, selectedReason, archiveNotes)
    : { allowed: false, reason: 'Please select an archival reason.' };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError('Please select an archival reason.');
      return;
    }

    const check = canArchiveCase(caseItem, dataset, selectedReason, archiveNotes);
    if (!check.allowed) {
      setError(check.reason || 'Cannot archive case.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      archiveCase(caseItem.id, selectedReason, archiveNotes);
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to archive case.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-[#DED7CB] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-case-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#DED7CB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F4EFEB] border border-[#DED7CB] flex items-center justify-center text-[#555C56]">
              <Archive className="w-5 h-5 text-[#2C332E]" />
            </div>
            <div>
              <h2 id="archive-case-modal-title" className="text-base font-semibold text-[#2C332E]">
                Archive Patient Case
              </h2>
              <p className="text-xs text-[#555C56]">
                {caseItem.caseName} • Case ID: {caseItem.caseId || caseItem.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-[#636A64] hover:text-[#2C332E] hover:bg-[#F4EFEB] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Clinical Footprint Banner */}
          {footprint.isPreClinical ? (
            <div className="p-3.5 rounded-lg bg-[#F0F5F2] border border-[#CAD8D0] text-xs text-[#1B3B2B] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#1B3B2B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-[#1B3B2B] mb-0.5">
                  Pre-Clinical Record (Clerical Shell)
                </span>
                <p className="text-[#334D3F] leading-relaxed">
                  No encounters, clinical problems, goals, or outcome measurements are documented on this case.
                  Archiving will safely withdraw this accidental or duplicate case from your active caseload without clinical record destruction.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-[#FFF8EB] border border-[#F0D5A8] text-xs text-[#825313] flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#825313] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-[#825313] mb-0.5">
                  Documented Clinical Case ({footprint.summaryFootprintCount} clinical items documented)
                </span>
                <p className="text-[#6C420D] leading-relaxed mb-2">
                  Under Stage 13 Clinical Governance, documented cases represent permanent legal health records.
                  They cannot be hard-deleted or marked as &apos;Created in Error&apos;. Archiving preserves the complete record intact and moves it to read-only historical retention.
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#825313] bg-[#FEF4E2] p-2 rounded border border-[#F0D5A8]/60">
                  <span>• Sessions / Encounters: <strong>{footprint.sessionsCount}</strong></span>
                  <span>• Clinical Problems: <strong>{footprint.activeProblemsCount}</strong></span>
                  <span>• Clinical Goals: <strong>{footprint.activeGoalsCount}</strong></span>
                  <span>• Investigations: <strong>{footprint.investigationsCount}</strong></span>
                  <span>• Subjective Note: <strong>{footprint.hasDocumentedSubjective ? 'Documented' : 'None'}</strong></span>
                  <span>• Objective Exam: <strong>{footprint.hasDocumentedObjective ? 'Documented' : 'None'}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label htmlFor="archive-reason-select" className="block text-xs font-semibold text-[#2C332E]">
              Archival Reason <span className="text-[#C0392B]">*</span>
            </label>
            <select
              id="archive-reason-select"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value as CaseArchiveReason)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DED7CB] bg-white text-[#2C332E] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B]"
            >
              <option value="" disabled>
                -- Select Archival Reason --
              </option>
              {availableReasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {selectedReasonMeta && (
              <p className="text-[11px] text-[#636A64] mt-1 italic">
                {selectedReasonMeta.description}
              </p>
            )}
          </div>

          {/* Explanatory Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="archive-notes-input" className="block text-xs font-semibold text-[#2C332E]">
                Explanatory Archival Notes {notesRequired && <span className="text-[#C0392B]">*</span>}
              </label>
              <span className="text-[10px] text-[#636A64]">
                {notesRequired ? 'Mandatory for this archival reason' : 'Optional clinical remarks'}
              </span>
            </div>
            <textarea
              id="archive-notes-input"
              rows={3}
              value={archiveNotes}
              onChange={(e) => setArchiveNotes(e.target.value)}
              placeholder={
                notesRequired
                  ? 'State the clinical or administrative reason for archival (required for clinical audit)...'
                  : 'Optional contextual remarks...'
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DED7CB] bg-white text-[#2C332E] placeholder-[#9AA099] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] resize-y"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-[#FDF2F0] border border-[#F5C6CB] text-xs text-[#C0392B] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-[#DED7CB] flex items-center justify-between">
            <p className="text-[11px] text-[#636A64]">
              Archived cases can be restored at any time by the clinician.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Archive className="w-3.5 h-3.5" />}
                disabled={isSubmitting || !validationResult.allowed}
                className="bg-[#6B4B3E] hover:bg-[#573C31] text-white border-transparent"
              >
                {isSubmitting ? 'Archiving Case...' : 'Confirm Archival'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
