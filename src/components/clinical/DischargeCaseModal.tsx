import React, { useState } from 'react';
import {
  LogOut,
  X,
  AlertCircle,
  Calendar,
  Layers,
  FileText,
  Activity,
  ShieldAlert,
  Send,
  Home,
} from 'lucide-react';
import {
  CaseDischargeRecord,
  DischargeReason,
} from '../../types';
import {
  DISCHARGE_REASONS_LABELS,
} from '../../utils/clinicalDischarge';

interface DischargeCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  patientId: string;
  existingRecord?: CaseDischargeRecord;
  onSave: (recordData: Partial<CaseDischargeRecord> & {
    caseId: string;
    patientId: string;
    dischargeReason: DischargeReason;
    episodeSummary: string;
    clinicalStatusAtDischarge: string;
  }) => void;
}

export const DischargeCaseModal: React.FC<DischargeCaseModalProps> = ({
  isOpen,
  onClose,
  caseId,
  patientId,
  existingRecord,
  onSave,
}) => {
  const todayDate = new Date().toISOString().split('T')[0];

  const [dischargeDate, setDischargeDate] = useState<string>(
    existingRecord?.dischargeDate || todayDate
  );
  const [dischargeReason, setDischargeReason] = useState<DischargeReason>(
    existingRecord?.dischargeReason || 'goals_achieved'
  );
  const [episodeSummary, setEpisodeSummary] = useState<string>(
    existingRecord?.episodeSummary || ''
  );
  const [clinicalStatusAtDischarge, setClinicalStatusAtDischarge] = useState<string>(
    existingRecord?.clinicalStatusAtDischarge || ''
  );
  const [homeMaintenancePlan, setHomeMaintenancePlan] = useState<string>(
    existingRecord?.homeMaintenancePlan || ''
  );
  const [precautionsAndWarningSigns, setPrecautionsAndWarningSigns] = useState<string>(
    existingRecord?.precautionsAndWarningSigns || ''
  );
  const [referralOrFollowUp, setReferralOrFollowUp] = useState<string>(
    existingRecord?.referralOrFollowUp || ''
  );

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!dischargeDate) {
      setError('Please provide a valid discharge date.');
      return;
    }
    if (!episodeSummary.trim()) {
      setError('Please provide a narrative synthesis of the episode of care.');
      return;
    }
    if (!clinicalStatusAtDischarge.trim()) {
      setError('Please describe the patient clinical status at discharge.');
      return;
    }

    onSave({
      id: existingRecord?.id,
      caseId,
      patientId,
      dischargeDate,
      dischargeReason,
      episodeSummary: episodeSummary.trim(),
      clinicalStatusAtDischarge: clinicalStatusAtDischarge.trim(),
      homeMaintenancePlan: homeMaintenancePlan.trim() || undefined,
      precautionsAndWarningSigns: precautionsAndWarningSigns.trim() || undefined,
      referralOrFollowUp: referralOrFollowUp.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="discharge-case-modal-content"
        className="bg-white rounded-xl shadow-xl border border-[#E3DDD2] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#1B3B2B]/10 text-[#1B3B2B]">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#18201C]">
                {existingRecord ? 'Edit Case Discharge Record' : 'Discharge Case & Author Clinical Summary'}
              </h3>
              <p className="text-xs text-[#636A64]">
                Formally conclude this episode of care and document final clinical outcomes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#636A64] hover:text-[#18201C] hover:bg-[#EAE5DC] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-lg bg-[#FDF2F2] border border-[#F8D7DA] text-xs text-[#991B1B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Discharge Date & Reason Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#343B36] uppercase tracking-wider">
                Discharge Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#D5CEC2] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#343B36] uppercase tracking-wider">
                Reason for Discharge *
              </label>
              <select
                value={dischargeReason}
                onChange={(e) => setDischargeReason(e.target.value as DischargeReason)}
                className="w-full text-xs px-3 py-2 bg-white border border-[#D5CEC2] rounded-lg text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              >
                {Object.entries(DISCHARGE_REASONS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Episode Summary */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#343B36] uppercase tracking-wider flex items-center justify-between">
              <span>Episode Course Narrative Synthesis *</span>
              <span className="text-[10px] text-[#636A64] font-normal normal-case">
                Summary of presenting problem, course of care, and overall response
              </span>
            </label>
            <textarea
              value={episodeSummary}
              onChange={(e) => setEpisodeSummary(e.target.value)}
              rows={3}
              placeholder="e.g., Patient presented with 6-week history of subacromial pain. Completed 6 sessions of progressive rotator cuff strengthening, manual joint mobilization, and scapular stabilization. Successfully transitioned from acute pain management to functional overhead conditioning."
              className="w-full text-xs p-3 bg-white border border-[#D5CEC2] rounded-lg text-[#18201C] placeholder:text-[#919992] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              required
            />
          </div>

          {/* Clinical Status at Discharge */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#343B36] uppercase tracking-wider flex items-center justify-between">
              <span>Clinical Status at Discharge *</span>
              <span className="text-[10px] text-[#636A64] font-normal normal-case">
                Status of symptoms, impairments, range of motion, strength, and function
              </span>
            </label>
            <textarea
              value={clinicalStatusAtDischarge}
              onChange={(e) => setClinicalStatusAtDischarge(e.target.value)}
              rows={3}
              placeholder="e.g., Full, pain-free active shoulder abduction (180°) and external rotation. Shoulder abductor strength restored to 5/5 bilaterally. QuickDASH score improved from 48/100 to 8/100. Patient reports complete return to work and recreational swimming without recurrence."
              className="w-full text-xs p-3 bg-white border border-[#D5CEC2] rounded-lg text-[#18201C] placeholder:text-[#919992] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              required
            />
          </div>

          {/* Post-Discharge & Self-Management Plan Grid */}
          <div className="space-y-3 pt-2 border-t border-[#EAE5DC]">
            <h4 className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
              Post-Discharge & Self-Management Planning (Optional)
            </h4>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#414843]">
                Home Maintenance Program / Self-Management
              </label>
              <textarea
                value={homeMaintenancePlan}
                onChange={(e) => setHomeMaintenancePlan(e.target.value)}
                rows={2}
                placeholder="e.g., Maintain independent home exercise program 2-3x weekly: resistance band external rotation, push-up plus, and thoracic mobility. Continue progressive loading for gym activities."
                className="w-full text-xs p-3 bg-white border border-[#D5CEC2] rounded-lg text-[#18201C] placeholder:text-[#919992] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#414843]">
                Precautions & Warning Signs (Red Flags)
              </label>
              <textarea
                value={precautionsAndWarningSigns}
                onChange={(e) => setPrecautionsAndWarningSigns(e.target.value)}
                rows={2}
                placeholder="e.g., Advised to seek medical review or re-contact clinic if severe night pain returns, progressive weakness develops, or sudden traumatic flare-up occurs."
                className="w-full text-xs p-3 bg-white border border-[#D5CEC2] rounded-lg text-[#18201C] placeholder:text-[#919992] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#414843]">
                Referral or Follow-Up Details
              </label>
              <input
                type="text"
                value={referralOrFollowUp}
                onChange={(e) => setReferralOrFollowUp(e.target.value)}
                placeholder="e.g., Discharge summary letter dispatched to referring GP (Dr. Jenkins). Open self-referral for 3 months if needed."
                className="w-full text-xs px-3 py-2 bg-white border border-[#D5CEC2] rounded-lg text-[#18201C] placeholder:text-[#919992] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE5DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#414843] hover:text-[#18201C] hover:bg-[#EAE5DC] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-discharge-btn"
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1B3B2B] hover:bg-[#152F22] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {existingRecord ? 'Save Changes' : 'Confirm Discharge & Complete Episode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
