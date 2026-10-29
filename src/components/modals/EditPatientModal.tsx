import React, { useState, useEffect } from 'react';
import { X, UserCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useClinical } from '../../context/ClinicalContext';
import { Patient, PatientSex, PatientStatus } from '../../types';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  onClose,
  patient,
}) => {
  const { updatePatient } = useClinical();

  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<PatientSex | string>('Female');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [status, setStatus] = useState<PatientStatus>('active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (patient) {
      setFullName(patient.fullName || '');
      setPreferredName(patient.preferredName || '');
      setDateOfBirth(patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '');
      setSex(patient.sex || 'Female');
      setPhone(patient.phone || '');
      setEmail(patient.email || '');
      setReasonForVisit(patient.reasonForVisit || '');
      setStatus(patient.status || 'active');
      setErrors({});
    }
  }, [patient, isOpen]);

  if (!isOpen || !patient) return null;

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
      updatePatient(patient.id, {
        fullName: fullName.trim(),
        preferredName: preferredName.trim() || undefined,
        dateOfBirth,
        sex,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        reasonForVisit: reasonForVisit.trim(),
        status,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-patient-title"
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
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="edit-patient-title" className="text-base font-semibold text-[#1A221E]">
                Edit Patient Record
              </h2>
              <p className="text-xs text-[#6B726C]">
                {patient.patientNumber || 'PC-0001'} • Clinical & Contact Information
              </p>
            </div>
          </div>
          <button
            id="close-edit-patient-modal"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#6B726C] hover:text-[#1A221E] p-1.5 rounded-md hover:bg-[#E8E2D8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <Input
            id="edit-patient-full-name"
            label="Full Legal Name *"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            error={errors.fullName}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="edit-patient-preferred-name"
              label="Preferred Name (Optional)"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
            />
            <Input
              id="edit-patient-dob"
              label="Date of Birth *"
              type="date"
              value={dateOfBirth}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                if (errors.dateOfBirth) setErrors((prev) => ({ ...prev, dateOfBirth: '' }));
              }}
              error={errors.dateOfBirth}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-patient-sex"
                className="text-xs font-medium text-[#2E3530] tracking-wide"
              >
                Sex
              </label>
              <select
                id="edit-patient-sex"
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

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-patient-status"
                className="text-xs font-medium text-[#2E3530] tracking-wide"
              >
                Status
              </label>
              <select
                id="edit-patient-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PatientStatus)}
                className="w-full h-10 px-3 rounded-lg border border-[#DDD6CB] bg-[#FFFFFF] text-sm text-[#1C221E] hover:border-[#BFB7AA] focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] outline-none"
              >
                <option value="active">Active Caseload</option>
                <option value="discharged">Discharged</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="edit-patient-phone"
              label="Contact Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              id="edit-patient-email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-patient-reason"
              className="text-xs font-medium text-[#2E3530] tracking-wide"
            >
              Primary Complaint / Intake Note *
            </label>
            <textarea
              id="edit-patient-reason"
              rows={3}
              value={reasonForVisit}
              onChange={(e) => {
                setReasonForVisit(e.target.value);
                if (errors.reasonForVisit) setErrors((prev) => ({ ...prev, reasonForVisit: '' }));
              }}
              className="w-full bg-[#FFFFFF] text-[#1C221E] text-sm rounded-lg border border-[#DDD6CB] p-3 hover:border-[#BFB7AA] focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] placeholder:text-[#9A9F9B] outline-none resize-none transition-colors"
            />
            {errors.reasonForVisit && (
              <p className="text-xs text-[#DC2626] font-normal mt-0.5">
                {errors.reasonForVisit}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E2D8]">
            <Button
              id="cancel-edit-patient-btn"
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              id="submit-edit-patient-btn"
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
