import React, { useState, useEffect } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useClinical } from '../../context/ClinicalContext';
import { Patient, Case } from '../../types';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess?: (createdCase: Case) => void;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSuccess,
}) => {
  const { addCase } = useClinical();

  const today = new Date().toISOString().split('T')[0];
  const [caseName, setCaseName] = useState('');
  const [presentingProblem, setPresentingProblem] = useState('');
  const [dateOfOnset, setDateOfOnset] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill or reset when opened
  useEffect(() => {
    if (isOpen) {
      setCaseName('');
      setPresentingProblem('');
      setDateOfOnset('');
      setReferralSource('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!caseName.trim()) {
      newErrors.caseName = 'Case name is required (e.g. "Right Knee Pain").';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = addCase({
        patientId: patient.id,
        caseName: caseName.trim(),
        presentingProblem: presentingProblem.trim() || undefined,
        dateOfOnset: dateOfOnset || undefined,
        referralSource: referralSource.trim() || undefined,
        startDate: startDate || today,
        status: 'Assessment',
      });

      onClose();
      if (onSuccess) {
        onSuccess(created);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-case-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141A16]/50 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-lg bg-[#FAF8F5] border border-[#E0D9CE] rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E8E2D8] bg-[#F5F1EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="create-case-title" className="text-base font-semibold text-[#1A221E]">
                New Rehabilitation Case
              </h2>
              <p className="text-xs text-[#6B726C]">
                Episode for {patient.fullName}{' '}
                <span className="text-[#3E4540] font-medium">({patient.patientNumber || 'PC-0001'})</span>
              </p>
            </div>
          </div>
          <button
            id="close-create-case-modal"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#6B726C] hover:text-[#1A221E] p-1.5 rounded-md hover:bg-[#E8E2D8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clinical Case Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Required: Case Name */}
          <Input
            id="case-name-input"
            label="Case Name *"
            placeholder="e.g. Right Knee Pain, Low Back Pain, Left Shoulder Impingement"
            value={caseName}
            onChange={(e) => {
              setCaseName(e.target.value);
              if (errors.caseName) setErrors((prev) => ({ ...prev, caseName: '' }));
            }}
            error={errors.caseName}
            supportingText="Describe the specific clinical episode or condition being treated."
          />

          {/* Optional: Presenting Problem / Reason for Referral */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="case-presenting-problem"
              className="text-xs font-medium text-[#2E3530] tracking-wide"
            >
              Presenting Problem / Reason for Referral (Optional)
            </label>
            <textarea
              id="case-presenting-problem"
              rows={3}
              placeholder="e.g. Anterior knee ache when descending stairs for 3 weeks following return to running."
              value={presentingProblem}
              onChange={(e) => setPresentingProblem(e.target.value)}
              className="w-full bg-[#FFFFFF] text-[#1C221E] text-sm rounded-lg border border-[#DDD6CB] p-3 hover:border-[#BFB7AA] focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] placeholder:text-[#9A9F9B] outline-none resize-none transition-colors"
            />
          </div>

          {/* Optional: Date of onset & Case start date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="case-date-of-onset"
              label="Date of Onset (Optional)"
              type="date"
              value={dateOfOnset}
              onChange={(e) => setDateOfOnset(e.target.value)}
              supportingText="Approximate onset of symptoms"
            />
            <Input
              id="case-start-date"
              label="Case Start Date (Optional)"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              supportingText="Default is today"
            />
          </div>

          {/* Optional: Referral source */}
          <Input
            id="case-referral-source"
            label="Referral Source (Optional)"
            placeholder="e.g. Self-referral, Dr. Taylor (GP), Orthopedic Clinic"
            value={referralSource}
            onChange={(e) => setReferralSource(e.target.value)}
          />

          {/* Note reinforcing no premature or automated diagnosis */}
          <div className="bg-[#F6F3ED] border border-[#E7E1D6] rounded-lg p-3 text-[11px] text-[#636A65] leading-relaxed">
            <span className="font-medium text-[#2D342F]">Initial Stage: Assessment</span>.
            Diagnostic reasoning occurs through systematic subjective and objective evaluation, not automated pre-selection.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E2D8]">
            <Button
              id="cancel-create-case-btn"
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              id="submit-create-case-btn"
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Create Case
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
