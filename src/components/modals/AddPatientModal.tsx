import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useClinical } from '../../context/ClinicalContext';
import { PatientSex } from '../../types';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addPatient } = useClinical();

  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<PatientSex | string>('Female');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Patient full name is required.';
    }
    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required.';
    }
    if (!reasonForVisit.trim()) {
      newErrors.reasonForVisit = 'Primary complaint or reason for visit is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      addPatient({
        fullName: fullName.trim(),
        preferredName: preferredName.trim() || undefined,
        dateOfBirth,
        sex,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        reasonForVisit: reasonForVisit.trim(),
        status: 'active',
      });

      // Reset form
      setFullName('');
      setPreferredName('');
      setDateOfBirth('');
      setSex('Female');
      setPhone('');
      setEmail('');
      setReasonForVisit('');
      setErrors({});
      onClose();
      if (onSuccess) onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-patient-title"
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
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="add-patient-title" className="text-base font-semibold text-[#1A221E]">
                Add Patient
              </h2>
              <p className="text-xs text-[#6B726C]">Register a patient to begin clinical documentation</p>
            </div>
          </div>
          <button
            id="close-add-patient-modal"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#6B726C] hover:text-[#1A221E] p-1.5 rounded-md hover:bg-[#E8E2D8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <Input
            id="patient-full-name"
            label="Full Legal Name *"
            placeholder="e.g. Margaret Evans"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            error={errors.fullName}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              id="patient-preferred-name"
              label="Preferred Name (Optional)"
              placeholder="e.g. Maggie"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
            />
            <Input
              id="patient-dob"
              label="Date of Birth *"
              type="date"
              value={dateOfBirth}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                if (errors.dateOfBirth) setErrors((prev) => ({ ...prev, dateOfBirth: '' }));
              }}
              error={errors.dateOfBirth}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="patient-sex"
                className="text-xs font-medium text-[#2E3530] tracking-wide"
              >
                Sex
              </label>
              <select
                id="patient-sex"
                value={sex}
                onChange={(e) => setSex(e.target.value as PatientSex)}
                className="w-full h-10 px-3 rounded-lg border border-[#DDD6CB] bg-[#FFFFFF] text-sm text-[#1C221E] hover:border-[#BFB7AA] focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] outline-none"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="patient-phone"
              label="Contact Phone (Optional)"
              type="tel"
              placeholder="+1 (555) 019-2834"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              id="patient-email"
              label="Email Address (Optional)"
              type="email"
              placeholder="patient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="patient-reason" className="text-xs font-medium text-[#2E3530] tracking-wide">
              Primary Complaint / Reason for Visit *
            </label>
            <textarea
              id="patient-reason"
              rows={3}
              placeholder="e.g. Right shoulder pain exacerbated by overhead reach for 6 weeks; gradual onset."
              value={reasonForVisit}
              onChange={(e) => {
                setReasonForVisit(e.target.value);
                if (errors.reasonForVisit) setErrors((prev) => ({ ...prev, reasonForVisit: '' }));
              }}
              className={`w-full bg-[#FFFFFF] text-[#1C221E] text-sm rounded-lg border p-3 transition-colors duration-150 ${
                errors.reasonForVisit
                  ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
                  : 'border-[#DDD6CB] hover:border-[#BFB7AA] focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]'
              } placeholder:text-[#9A9F9B] outline-none resize-none`}
            />
            {errors.reasonForVisit && (
              <p className="text-xs text-[#DC2626] font-normal leading-tight mt-0.5">
                {errors.reasonForVisit}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E2D8]">
            <Button
              id="cancel-add-patient-btn"
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              id="submit-add-patient-btn"
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Create Patient Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
