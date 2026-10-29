import React, { useState, useMemo } from 'react';
import { Patient, AppSettings } from '../../types';
import { LongitudinalClinicalDataset } from '../../utils/longitudinalPatientHistory';
import {
  LongitudinalReportSectionId,
  LongitudinalReportConfig,
} from '../../types/reporting';
import {
  AVAILABLE_LONGITUDINAL_REPORT_SECTIONS,
  assembleLongitudinalPatientReport,
  downloadLongitudinalReportJSON,
} from '../../utils/longitudinalReporting';
import { LongitudinalReportDocument } from './LongitudinalReportDocument';
import { Button } from '../common/Button';
import {
  X,
  Printer,
  Download,
  Eye,
  Sliders,
  CheckSquare,
  Square,
  FileText,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface LongitudinalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  dataset: LongitudinalClinicalDataset;
  settings?: AppSettings;
}

export const LongitudinalReportModal: React.FC<LongitudinalReportModalProps> = ({
  isOpen,
  onClose,
  patient,
  dataset,
  settings,
}) => {
  // Transient configuration state (never persisted to LocalStorage)
  const [includedSectionIds, setIncludedSectionIds] = useState<LongitudinalReportSectionId[]>(
    AVAILABLE_LONGITUDINAL_REPORT_SECTIONS.map((s) => s.id)
  );
  const [deIdentify, setDeIdentify] = useState<boolean>(false);
  const [chronologicalOrder, setChronologicalOrder] = useState<'newest_first' | 'oldest_first'>('newest_first');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientRole, setRecipientRole] = useState<string>('');
  const [facilityName, setFacilityName] = useState<string>('');
  const [customClinicalNotes, setCustomClinicalNotes] = useState<string>('');
  const [activeMobileView, setActiveMobileView] = useState<'preview' | 'config'>('preview');

  // Build report configuration object
  const reportConfig: LongitudinalReportConfig = useMemo(() => ({
    reportType: 'longitudinal_patient_summary',
    includedSectionIds,
    deIdentify,
    chronologicalOrder,
    generatedAt: new Date().toISOString(),
    recipientName: recipientName.trim() || undefined,
    recipientRole: recipientRole.trim() || undefined,
    facilityName: facilityName.trim() || undefined,
    customClinicalNotes: customClinicalNotes.trim() || undefined,
  }), [includedSectionIds, deIdentify, chronologicalOrder, recipientName, recipientRole, facilityName, customClinicalNotes]);

  // Purely assemble report model
  const assembledReport = useMemo(() => {
    return assembleLongitudinalPatientReport(patient, dataset, reportConfig, settings);
  }, [patient, dataset, reportConfig, settings]);

  if (!isOpen) return null;

  // Toggle individual section
  const handleToggleSection = (sectionId: LongitudinalReportSectionId) => {
    const section = AVAILABLE_LONGITUDINAL_REPORT_SECTIONS.find((s) => s.id === sectionId);
    if (section?.requiredForType) return; // Cannot toggle mandatory sections

    setIncludedSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Toggle all optional sections
  const handleToggleAll = (include: boolean) => {
    if (include) {
      setIncludedSectionIds(AVAILABLE_LONGITUDINAL_REPORT_SECTIONS.map((s) => s.id));
    } else {
      setIncludedSectionIds(
        AVAILABLE_LONGITUDINAL_REPORT_SECTIONS.filter((s) => s.requiredForType).map((s) => s.id)
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    downloadLongitudinalReportJSON(assembledReport);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="longitudinal-report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-[#18201C]/60 backdrop-blur-xs animate-in fade-in duration-150 print:p-0 print:bg-white print:static"
    >
      <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-none sm:rounded-2xl shadow-2xl w-full max-w-6xl h-full sm:h-[94vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:h-auto print:max-w-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white border-b border-[#E8E2D9] shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF2EE] border border-[#D5E2DA] flex items-center justify-center text-[#1B3B2B]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 id="longitudinal-report-modal-title" className="text-sm font-bold text-[#18201C]">
                Longitudinal Patient Summary Report
              </h2>
              <p className="text-[11px] text-[#636A64]">
                {patient.fullName} &bull; {patient.patientNumber || 'PC-0001'} &bull; Multi-Episode Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile View Toggle */}
            <div className="flex sm:hidden border border-[#E8E2D9] rounded-lg p-0.5 bg-[#FAF8F5]">
              <button
                type="button"
                onClick={() => setActiveMobileView('preview')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  activeMobileView === 'preview'
                    ? 'bg-white text-[#18201C] shadow-xs'
                    : 'text-[#636A64]'
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileView('config')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  activeMobileView === 'config'
                    ? 'bg-white text-[#18201C] shadow-xs'
                    : 'text-[#636A64]'
                }`}
              >
                Configure
              </button>
            </div>

            <Button
              id="report-export-json-btn"
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportJSON}
            >
              Export JSON
            </Button>

            <Button
              id="report-print-btn"
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              Print / PDF
            </Button>

            <button
              id="report-close-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#636A64] hover:text-[#18201C] hover:bg-[#F4EFE8] transition-colors cursor-pointer ml-1"
              aria-label="Close report modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden print:overflow-visible">
          {/* Configuration Sidebar (Hidden in Print) */}
          <div
            className={`w-full sm:w-80 md:w-96 bg-[#FAF8F5] border-r border-[#E8E2D9] p-4 sm:p-5 overflow-y-auto space-y-5 shrink-0 print:hidden ${
              activeMobileView === 'config' ? 'block' : 'hidden sm:block'
            }`}
          >
            {/* Section Toggles */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#18201C] uppercase tracking-wider">
                  Report Sections
                </span>
                <div className="flex items-center gap-2 text-[11px] text-[#1B3B2B]">
                  <button
                    type="button"
                    onClick={() => handleToggleAll(true)}
                    className="hover:underline cursor-pointer"
                  >
                    All
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAll(false)}
                    className="hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {AVAILABLE_LONGITUDINAL_REPORT_SECTIONS.map((section) => {
                  const isChecked = includedSectionIds.includes(section.id);
                  const isRequired = section.requiredForType;

                  return (
                    <label
                      key={section.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer text-xs ${
                        isChecked
                          ? 'bg-white border-[#D5E2DA] text-[#18201C]'
                          : 'bg-[#F4EFE8] border-transparent text-[#757C76]'
                      } ${isRequired ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isRequired}
                        onChange={() => handleToggleSection(section.id)}
                        className="sr-only"
                      />
                      <div className="shrink-0 mt-0.5 text-[#1B3B2B]">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#1B3B2B]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#757C76]" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-semibold block leading-tight">
                          {section.label}
                          {isRequired && (
                            <span className="text-[10px] text-[#757C76] font-normal ml-1.5">
                              (Required)
                            </span>
                          )}
                        </span>
                        <p className="text-[11px] text-[#636A64] leading-normal">
                          {section.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Presentation Options */}
            <div className="space-y-3 pt-4 border-t border-[#E8E2D9]">
              <span className="text-xs font-bold text-[#18201C] uppercase tracking-wider block">
                Presentation & Privacy
              </span>

              {/* De-identification */}
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E3DDD2] cursor-pointer text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#18201C] block">De-Identify Record</span>
                  <p className="text-[11px] text-[#636A64]">
                    Masks patient name, DOB, phone, and email for external review.
                  </p>
                </div>
                <input
                  id="report-deidentify-toggle"
                  type="checkbox"
                  checked={deIdentify}
                  onChange={(e) => setDeIdentify(e.target.checked)}
                  className="w-4 h-4 accent-[#1B3B2B] rounded cursor-pointer shrink-0"
                />
              </label>

              {/* Chronological Ordering */}
              <div className="p-2.5 rounded-lg bg-white border border-[#E3DDD2] space-y-1 text-xs">
                <span className="font-semibold text-[#18201C] block">Timeline & Episode Order</span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setChronologicalOrder('newest_first')}
                    className={`py-1 px-2 rounded text-xs font-medium border text-center transition-colors cursor-pointer ${
                      chronologicalOrder === 'newest_first'
                        ? 'bg-[#EBF2EE] text-[#1B3B2B] border-[#CAD8D0]'
                        : 'bg-[#F4EFE8] text-[#636A64] border-transparent'
                    }`}
                  >
                    Newest First
                  </button>
                  <button
                    type="button"
                    onClick={() => setChronologicalOrder('oldest_first')}
                    className={`py-1 px-2 rounded text-xs font-medium border text-center transition-colors cursor-pointer ${
                      chronologicalOrder === 'oldest_first'
                        ? 'bg-[#EBF2EE] text-[#1B3B2B] border-[#CAD8D0]'
                        : 'bg-[#F4EFE8] text-[#636A64] border-transparent'
                    }`}
                  >
                    Oldest First
                  </button>
                </div>
              </div>
            </div>

            {/* Recipient / Referral Metadata */}
            <div className="space-y-2.5 pt-4 border-t border-[#E8E2D9]">
              <span className="text-xs font-bold text-[#18201C] uppercase tracking-wider block">
                Recipient Context (Optional)
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] text-[#636A64] font-medium block mb-1">
                    Recipient Name / Physician
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Dr. Robert Davies"
                    className="w-full px-2.5 py-1.5 rounded border border-[#DDD6CB] bg-white text-xs focus:outline-none focus:border-[#1B3B2B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#636A64] font-medium block mb-1">
                    Role / Specialty
                  </label>
                  <input
                    type="text"
                    value={recipientRole}
                    onChange={(e) => setRecipientRole(e.target.value)}
                    placeholder="e.g. Consultant Orthopaedic Surgeon"
                    className="w-full px-2.5 py-1.5 rounded border border-[#DDD6CB] bg-white text-xs focus:outline-none focus:border-[#1B3B2B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#636A64] font-medium block mb-1">
                    Facility / Clinic Name
                  </label>
                  <input
                    type="text"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder="e.g. St. Jude Orthopaedic Hospital"
                    className="w-full px-2.5 py-1.5 rounded border border-[#DDD6CB] bg-white text-xs focus:outline-none focus:border-[#1B3B2B]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#636A64] font-medium block mb-1">
                    Custom Cover Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={customClinicalNotes}
                    onChange={(e) => setCustomClinicalNotes(e.target.value)}
                    placeholder="Optional therapist cover notes or instructions for recipient..."
                    className="w-full px-2.5 py-1.5 rounded border border-[#DDD6CB] bg-white text-xs focus:outline-none focus:border-[#1B3B2B] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Report Preview Document Canvas */}
          <div
            className={`flex-1 bg-[#EAE5DC]/50 p-4 sm:p-8 overflow-y-auto print:p-0 print:bg-white print:overflow-visible ${
              activeMobileView === 'preview' ? 'block' : 'hidden sm:block'
            }`}
          >
            <LongitudinalReportDocument report={assembledReport} />
          </div>
        </div>
      </div>
    </div>
  );
};
