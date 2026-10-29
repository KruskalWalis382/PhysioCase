import React, { useState } from 'react';
import {
  ClinicalReportType,
  ReportSectionId,
  ClinicalReportConfig,
  CaseClinicalDataset,
} from '../../types/reporting';
import {
  AVAILABLE_REPORT_SECTIONS,
  assembleClinicalReport,
  downloadCaseJson,
} from '../../utils/clinicalReporting';
import { RenderedReportDocument } from './RenderedReportDocument';
import { Button } from '../common/Button';
import {
  FileText,
  Eye,
  Shield,
  Send,
  UserCheck,
  CheckSquare,
  Square,
  ArrowLeft,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

interface CaseReportingSectionProps {
  dataset: CaseClinicalDataset;
}

export const CaseReportingSection: React.FC<CaseReportingSectionProps> = ({ dataset }) => {
  const { caseItem } = dataset;

  // 1. Configuration State (Ephemeral derive-only configuration)
  const [reportType, setReportType] = useState<ClinicalReportType>('comprehensive_case');
  const [deIdentify, setDeIdentify] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientRole, setRecipientRole] = useState<string>('General Practitioner');
  const [facilityName, setFacilityName] = useState<string>('');

  // Included sections mapping per report type
  const availableSections = AVAILABLE_REPORT_SECTIONS[reportType];
  const [selectedSectionIds, setSelectedSectionIds] = useState<Record<ClinicalReportType, ReportSectionId[]>>({
    comprehensive_case: AVAILABLE_REPORT_SECTIONS.comprehensive_case.filter((s) => s.defaultIncluded).map((s) => s.id),
    referral_communication: AVAILABLE_REPORT_SECTIONS.referral_communication.filter((s) => s.defaultIncluded).map((s) => s.id),
    patient_discharge: AVAILABLE_REPORT_SECTIONS.patient_discharge.filter((s) => s.defaultIncluded).map((s) => s.id),
  });

  // Preview Mode Toggle
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);

  // Stage 8B: Export Download Feedback Notification
  const [exportNotice, setExportNotice] = useState<{
    message: string;
    format: 'full' | 'de_identified';
  } | null>(null);

  const currentIncludedSections = selectedSectionIds[reportType];

  const handleToggleSection = (sectionId: ReportSectionId) => {
    const isRequired = availableSections.find((s) => s.id === sectionId)?.requiredForType;
    if (isRequired) return; // Cannot toggle strictly required sections

    setSelectedSectionIds((prev) => {
      const current = prev[reportType];
      const next = current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId];
      return { ...prev, [reportType]: next };
    });
  };

  const handleSelectAllSections = () => {
    setSelectedSectionIds((prev) => ({
      ...prev,
      [reportType]: availableSections.map((s) => s.id),
    }));
  };

  const handleDeselectOptional = () => {
    setSelectedSectionIds((prev) => ({
      ...prev,
      [reportType]: availableSections.filter((s) => s.requiredForType).map((s) => s.id),
    }));
  };

  // Stage 8B: Browser Print Workflow
  const handlePrintReport = () => {
    if (!isPreviewActive) {
      setIsPreviewActive(true);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Stage 8B: JSON Case Archive Download Workflow
  const handleExportJson = (format: 'full' | 'de_identified') => {
    try {
      const { filename, sizeBytes } = downloadCaseJson(dataset, format);
      const sizeKb = (sizeBytes / 1024).toFixed(1);
      setExportNotice({
        message: `Successfully exported ${filename} (${sizeKb} KB)`,
        format,
      });
      setTimeout(() => {
        setExportNotice(null);
      }, 6000);
    } catch (err) {
      console.error('Failed to export case JSON:', err);
    }
  };

  // Compile active report object via pure assembly function
  const reportConfig: ClinicalReportConfig = {
    reportType,
    includedSectionIds: currentIncludedSections,
    deIdentify,
    includeEvidence: currentIncludedSections.includes('evidence_citations'),
    generatedAt: new Date().toISOString(),
    recipientName: recipientName.trim() || undefined,
    recipientRole: recipientRole.trim() || undefined,
    facilityName: facilityName.trim() || undefined,
  };

  const compiledReport = assembleClinicalReport(dataset, reportConfig);

  return (
    <div id="section-clinical-reporting" className="space-y-6">
      {/* Stage 8B: Export Download Notification Banner */}
      {exportNotice && (
        <div className="p-3.5 bg-[#EBF2EE] border border-[#CAD8D0] rounded-xl text-xs flex items-center justify-between text-[#1B3B2B] shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#1B3B2B] shrink-0" />
            <div>
              <p className="font-semibold">{exportNotice.message}</p>
              <p className="text-[11px] text-[#414843] mt-0.5">
                {exportNotice.format === 'de_identified'
                  ? 'Direct patient identifiers are masked for education, audit, or presentation use.'
                  : 'Full clinical case archive containing original identifiers. Handle according to your clinical privacy requirements.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-[#636A64] hover:text-[#18201C] p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE4DB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EBF2EE] border border-[#CAD8D0] flex items-center justify-center text-[#1B3B2B]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#18201C]">
                  Clinical Reporting & Export Foundation
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded bg-[#EBF2EE] text-[#1B3B2B] border border-[#CAD8D0]">
                  Stage 8 • Output & Export
                </span>
              </div>
              <p className="text-xs text-[#636A64] mt-0.5">
                Assemble structured clinical reports, format for print-to-PDF, and export portable full or de-identified JSON case archives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              id="btn-quick-print"
              variant="secondary"
              size="md"
              leftIcon={<Printer className="w-4 h-4 text-[#1B3B2B]" />}
              onClick={handlePrintReport}
            >
              Print / Save PDF
            </Button>

            {!isPreviewActive ? (
              <Button
                id="btn-preview-report"
                variant="primary"
                size="md"
                leftIcon={<Eye className="w-4 h-4" />}
                onClick={() => setIsPreviewActive(true)}
              >
                Generate Report Preview
              </Button>
            ) : (
              <Button
                id="btn-back-to-builder"
                variant="secondary"
                size="md"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => setIsPreviewActive(false)}
              >
                Configure Sections & Options
              </Button>
            )}
          </div>
        </div>

        {/* Builder Controls View */}
        {!isPreviewActive ? (
          <div className="space-y-6 pt-2">
            {/* Step 1: Report Type Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#414843] uppercase tracking-wider block">
                1. Select Report Template
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  id="report-type-comprehensive-btn"
                  onClick={() => setReportType('comprehensive_case')}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    reportType === 'comprehensive_case'
                      ? 'bg-white border-[#1B3B2B] shadow-sm ring-1 ring-[#1B3B2B]'
                      : 'bg-white/60 border-[#EAE4DB] hover:border-[#CAD8D0]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className={`w-4 h-4 ${reportType === 'comprehensive_case' ? 'text-[#1B3B2B]' : 'text-[#636A64]'}`} />
                    <span className="text-xs font-bold text-[#18201C]">
                      Comprehensive Case Report
                    </span>
                  </div>
                  <p className="text-[11px] text-[#636A64] leading-relaxed">
                    Complete structured case record synthesizing assessment, clinical reasoning, goals, plan, sessions, progress measurements, and discharge.
                  </p>
                </button>

                <button
                  type="button"
                  id="report-type-referral-btn"
                  onClick={() => setReportType('referral_communication')}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    reportType === 'referral_communication'
                      ? 'bg-white border-[#1B3B2B] shadow-sm ring-1 ring-[#1B3B2B]'
                      : 'bg-white/60 border-[#EAE4DB] hover:border-[#CAD8D0]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Send className={`w-4 h-4 ${reportType === 'referral_communication' ? 'text-[#1B3B2B]' : 'text-[#636A64]'}`} />
                    <span className="text-xs font-bold text-[#18201C]">
                      Physician / Referral Communication
                    </span>
                  </div>
                  <p className="text-[11px] text-[#636A64] leading-relaxed">
                    Concise clinical communication for referring physicians, consultants, or specialists emphasizing documented findings, response to care, and status.
                  </p>
                </button>

                <button
                  type="button"
                  id="report-type-discharge-btn"
                  onClick={() => setReportType('patient_discharge')}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    reportType === 'patient_discharge'
                      ? 'bg-white border-[#1B3B2B] shadow-sm ring-1 ring-[#1B3B2B]'
                      : 'bg-white/60 border-[#EAE4DB] hover:border-[#CAD8D0]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <UserCheck className={`w-4 h-4 ${reportType === 'patient_discharge' ? 'text-[#1B3B2B]' : 'text-[#636A64]'}`} />
                    <span className="text-xs font-bold text-[#18201C]">
                      Patient Discharge & Self-Management
                    </span>
                  </div>
                  <p className="text-[11px] text-[#636A64] leading-relaxed">
                    Patient-facing summary strictly reflecting documented care, home exercise maintenance, precautions, warning signs, and follow-up advice.
                  </p>
                </button>
              </div>
            </div>

            {/* Recipient Details (if Referral Communication) */}
            {reportType === 'referral_communication' && (
              <div className="bg-white border border-[#E3DDD2] rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-[#414843] uppercase tracking-wider block">
                  Intended Recipient Information (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[#636A64] block mb-1 font-medium">Physician / Clinician Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Jane Smith, MD"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#DDD6CB] bg-[#FAF8F5] text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    />
                  </div>
                  <div>
                    <label className="text-[#636A64] block mb-1 font-medium">Role / Specialty</label>
                    <input
                      type="text"
                      placeholder="e.g. Consultant Orthopedic Surgeon"
                      value={recipientRole}
                      onChange={(e) => setRecipientRole(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#DDD6CB] bg-[#FAF8F5] text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    />
                  </div>
                  <div>
                    <label className="text-[#636A64] block mb-1 font-medium">Facility / Hospital Practice</label>
                    <input
                      type="text"
                      placeholder="e.g. St. Jude Medical Centre"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#DDD6CB] bg-[#FAF8F5] text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Privacy & De-identification Controls */}
            <div className="bg-white border border-[#E3DDD2] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#1B3B2B]" />
                  <span className="text-xs font-bold text-[#18201C]">
                    Report Privacy & De-Identification
                  </span>
                </div>
                <p className="text-[11px] text-[#636A64]">
                  Mask direct identifiers (patient full name, phone, email, address, full DOB) in the generated report while retaining age, sex, and clinical data for peer discussions or audit. Does not alter underlying patient records.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  id="btn-toggle-deidentify"
                  onClick={() => setDeIdentify(!deIdentify)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border ${
                    deIdentify
                      ? 'bg-[#FAF3E0] text-[#8B6B23] border-[#EBD79B]'
                      : 'bg-[#FAF8F5] text-[#414843] border-[#DDD6CB] hover:border-[#1B3B2B]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${deIdentify ? 'bg-[#8B6B23]' : 'bg-[#A3AAA4]'}`} />
                  {deIdentify ? 'De-Identification ON' : 'De-Identification OFF'}
                </button>
              </div>
            </div>

            {/* Step 3: Section Customization */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#414843] uppercase tracking-wider block">
                  2. Choose Report Sections ({currentIncludedSections.length} of {availableSections.length} active)
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllSections}
                    className="text-[#1B3B2B] hover:underline font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-[#DDD6CB]">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectOptional}
                    className="text-[#636A64] hover:underline"
                  >
                    Required Only
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {availableSections.map((sec) => {
                  const isChecked = currentIncludedSections.includes(sec.id);
                  const isRequired = sec.requiredForType;

                  return (
                    <div
                      key={sec.id}
                      id={`section-toggle-${sec.id}`}
                      onClick={() => handleToggleSection(sec.id)}
                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-white border-[#CAD8D0] shadow-2xs'
                          : 'bg-[#FAF8F5]/60 border-[#EAE4DB] text-[#868D88]'
                      } ${isRequired ? 'cursor-default' : ''}`}
                    >
                      <div className="pt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#1B3B2B]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#A3AAA4]" />
                        )}
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${isChecked ? 'text-[#18201C]' : 'text-[#868D88]'}`}>
                            {sec.label}
                          </span>
                          {isRequired && (
                            <span className="text-[10px] uppercase font-semibold text-[#636A64] bg-[#EAE4DB] px-1.5 py-0.2 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#636A64] leading-normal line-clamp-2">
                          {sec.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Output & Export Actions (Stage 8B) */}
            <div className="pt-3 border-t border-[#EAE4DB] space-y-3">
              <label className="text-xs font-semibold text-[#414843] uppercase tracking-wider block">
                4. Output & Export Actions (Stage 8B)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Print Report / Save as PDF */}
                <div className="bg-white p-4 rounded-xl border border-[#CAD8D0] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1B3B2B]">
                      <Printer className="w-4 h-4 text-[#1B3B2B]" />
                      <span>Print / Save as PDF</span>
                    </div>
                    <p className="text-[11px] text-[#525953] leading-relaxed">
                      Launches the browser's native print dialog. In the print destination, choose <strong className="font-semibold text-[#18201C]">Save as PDF</strong> to generate a clean clinical document.
                    </p>
                  </div>
                  <Button
                    id="btn-print-report-card"
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                    onClick={handlePrintReport}
                  >
                    Print Report / Save PDF
                  </Button>
                </div>

                {/* Export Full Case JSON */}
                <div className="bg-white p-4 rounded-xl border border-[#E3DDD2] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#18201C]">
                      <Download className="w-4 h-4 text-[#1B3B2B]" />
                      <span>Export Full Case JSON</span>
                    </div>
                    <p className="text-[11px] text-[#525953] leading-relaxed">
                      Exports complete structured case records including original patient identifiers.
                    </p>
                    <p className="text-[10px] text-[#8B6B23] bg-[#FAF8F5] p-2 rounded border border-[#EAE4DB]">
                      ⚠️ <strong>Privacy Note:</strong> Full export contains patient-identifying information. Handle according to your clinical privacy requirements.
                    </p>
                  </div>
                  <Button
                    id="btn-export-full-json-card"
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    leftIcon={<Download className="w-3.5 h-3.5 text-[#1B3B2B]" />}
                    onClick={() => handleExportJson('full')}
                  >
                    Export Full JSON
                  </Button>
                </div>

                {/* Export De-Identified Case JSON */}
                <div className="bg-white p-4 rounded-xl border border-[#E3DDD2] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#18201C]">
                      <Shield className="w-4 h-4 text-[#8B6B23]" />
                      <span>Export De-Identified JSON</span>
                    </div>
                    <p className="text-[11px] text-[#525953] leading-relaxed">
                      Exports structured case records with direct identifiers (name, contacts, DOB) masked.
                    </p>
                    <p className="text-[10px] text-[#525953] bg-[#FAF8F5] p-2 rounded border border-[#EAE4DB]">
                      🛡️ <strong>De-Identified:</strong> Direct patient identifiers are masked for education, audit, or presentation use.
                    </p>
                  </div>
                  <Button
                    id="btn-export-deidentified-json-card"
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    leftIcon={<Shield className="w-3.5 h-3.5 text-[#8B6B23]" />}
                    onClick={() => handleExportJson('de_identified')}
                  >
                    Export De-Identified JSON
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Live Report Preview Toolbar */
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#18201C]">
                Previewing: <span className="text-[#1B3B2B]">{compiledReport.header.reportTitle}</span>
              </span>
              <span className="text-xs text-[#636A64]">
                ({currentIncludedSections.length} sections active
                {deIdentify ? ' • De-Identified' : ' • Full Identifiers'})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                id="btn-preview-print"
                variant="primary"
                size="sm"
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrintReport}
              >
                Print / Save as PDF
              </Button>

              <Button
                id="btn-preview-export-full"
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5 text-[#1B3B2B]" />}
                onClick={() => handleExportJson('full')}
              >
                Export Full JSON
              </Button>

              <Button
                id="btn-preview-export-deid"
                variant="secondary"
                size="sm"
                leftIcon={<Shield className="w-3.5 h-3.5 text-[#8B6B23]" />}
                onClick={() => handleExportJson('de_identified')}
              >
                Export De-Identified JSON
              </Button>

              <Button
                id="btn-edit-report-config"
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5 text-[#636A64]" />}
                onClick={() => setIsPreviewActive(false)}
              >
                Modify Sections
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Live Assembled Report Document Preview */}
      {isPreviewActive && (
        <div className="space-y-6">
          <RenderedReportDocument report={compiledReport} />

          {/* Bottom Action Footer (hidden during printing) */}
          <div className="no-print bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="text-xs text-[#636A64]">
              Ready for review or export • Case Ref: <span className="font-mono text-[#18201C] font-semibold">{caseItem.caseId || caseItem.id.slice(0, 8)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrintReport}
              >
                Print / Save as PDF
              </Button>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5 text-[#1B3B2B]" />}
                onClick={() => handleExportJson('full')}
              >
                Export Full JSON
              </Button>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Shield className="w-3.5 h-3.5 text-[#8B6B23]" />}
                onClick={() => handleExportJson('de_identified')}
              >
                Export De-Identified JSON
              </Button>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => setIsPreviewActive(false)}
              >
                Return to Options
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

