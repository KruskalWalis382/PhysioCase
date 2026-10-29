import React, { useState, useRef } from 'react';
import {
  FileScan,
  Plus,
  Calendar,
  Building2,
  Paperclip,
  Trash2,
  Edit3,
  Eye,
  X,
  AlertCircle,
  FileText,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ClinicalInvestigation,
  RadiologicalModality,
  InvestigationAttachment,
} from '../../types';
import {
  RADIOLOGICAL_MODALITY_CONFIG,
  createEmptyInvestigation,
  validateClinicalInvestigation,
} from '../../utils/clinicalInvestigations';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface ClinicalInvestigationsSectionProps {
  caseId: string;
  investigations: ClinicalInvestigation[];
  onSaveInvestigation: (
    data: Partial<ClinicalInvestigation> & {
      caseId: string;
      name: string;
      category: 'radiological';
      modality: RadiologicalModality;
      investigationDate: string;
      bodyRegion: string;
    }
  ) => void;
  onDeleteInvestigation: (id: string) => void;
}

export const ClinicalInvestigationsSection: React.FC<
  ClinicalInvestigationsSectionProps
> = ({ caseId, investigations, onSaveInvestigation, onDeleteInvestigation }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>(null);

  // Detail View State
  const [viewingInvestigation, setViewingInvestigation] =
    useState<ClinicalInvestigation | null>(null);

  // Delete Confirmation State
  const [deletingInvestigation, setDeletingInvestigation] =
    useState<ClinicalInvestigation | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    modality: 'xray' as RadiologicalModality,
    bodyRegion: '',
    investigationDate: new Date().toISOString().split('T')[0],
    indication: '',
    findings: '',
    impression: '',
    sourceType: '',
    sourceName: '',
    clinicianRelevance: '',
  });

  const [attachment, setAttachment] = useState<InvestigationAttachment | undefined>(undefined);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreateModal = () => {
    const empty = createEmptyInvestigation(caseId);
    setFormData({
      name: '',
      modality: 'xray',
      bodyRegion: '',
      investigationDate: empty.investigationDate,
      indication: '',
      findings: '',
      impression: '',
      sourceType: '',
      sourceName: '',
      clinicianRelevance: '',
    });
    setAttachment(undefined);
    setFormErrors({});
    setModalMode('create');
    setActiveInvestigationId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (inv: ClinicalInvestigation) => {
    setFormData({
      name: inv.name,
      modality: inv.modality,
      bodyRegion: inv.bodyRegion || '',
      investigationDate: inv.investigationDate,
      indication: inv.indication || '',
      findings: inv.findings || '',
      impression: inv.impression || '',
      sourceType: inv.sourceType || '',
      sourceName: inv.sourceName || '',
      clinicianRelevance: inv.clinicianRelevance || '',
    });
    setAttachment(inv.attachment);
    setFormErrors({});
    setModalMode('edit');
    setActiveInvestigationId(inv.id);
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional client-side reading for metadata
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        id: `att_${Date.now()}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachment(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      id: modalMode === 'edit' && activeInvestigationId ? activeInvestigationId : undefined,
      caseId,
      category: 'radiological' as const,
      modality: formData.modality,
      name: formData.name,
      bodyRegion: formData.bodyRegion,
      investigationDate: formData.investigationDate,
      indication: formData.indication,
      findings: formData.findings,
      impression: formData.impression,
      sourceType: formData.sourceType,
      sourceName: formData.sourceName,
      clinicianRelevance: formData.clinicianRelevance,
      attachment,
    };

    const validation = validateClinicalInvestigation(payload);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    onSaveInvestigation(payload);
    setIsModalOpen(false);

    // If currently viewing this record, update the view modal
    if (viewingInvestigation && viewingInvestigation.id === payload.id) {
      setViewingInvestigation({
        ...viewingInvestigation,
        ...payload,
        name: payload.name.trim(),
        bodyRegion: payload.bodyRegion.trim(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingInvestigation) return;
    onDeleteInvestigation(deletingInvestigation.id);
    if (viewingInvestigation?.id === deletingInvestigation.id) {
      setViewingInvestigation(null);
    }
    setDeletingInvestigation(null);
  };

  return (
    <section
      id="section-clinical-investigations"
      className="bg-white rounded-xl border border-[#E2E8E4] p-6 shadow-sm mb-8 transition-all"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8E4]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#EEF4FB] text-[#1D4E89] rounded-lg border border-[#C8DCF0] mt-0.5">
            <FileScan className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[#1A2E22]">
                Clinical Investigations
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF2EE] text-[#1B3B2B] font-medium border border-[#CAD8D0]">
                Stage 4F
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F8F6] text-[#555C56] font-mono border border-[#E2E8E4]">
                {investigations.length}{' '}
                {investigations.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-sm text-[#555C56] mt-0.5">
              Case-associated radiological investigations and diagnostic reports with clear
              distinction between reported findings and therapist interpretation.
            </p>
          </div>
        </div>

        <button
          id="btn-add-investigation"
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1B3B2B] hover:bg-[#254F3A] text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Investigation
        </button>
      </div>

      {/* Empty State */}
      {investigations.length === 0 ? (
        <div className="py-12 px-4 text-center border-2 border-dashed border-[#E2E8E4] rounded-xl my-6 bg-[#FAFBF9]">
          <div className="w-12 h-12 rounded-full bg-[#EEF4FB] text-[#1D4E89] mx-auto flex items-center justify-center mb-3">
            <FileScan className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-[#1A2E22] mb-1">
            No investigations have been recorded for this case
          </h3>
          <p className="text-sm text-[#555C56] max-w-md mx-auto mb-5">
            Document diagnostic imaging reports such as X-rays, MRI, CT, or Ultrasound to correlate reported findings with clinical presentation.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B3B2B] hover:bg-[#254F3A] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Investigation
          </button>
        </div>
      ) : (
        /* Investigations List (Chronological, newest first) */
        <div className="divide-y divide-[#E2E8E4] mt-4">
          {investigations.map((inv) => {
            const modConfig =
              RADIOLOGICAL_MODALITY_CONFIG[inv.modality] ||
              RADIOLOGICAL_MODALITY_CONFIG.other;

            return (
              <div
                key={inv.id}
                className="py-4 hover:bg-[#F9FAF9] transition-colors rounded-lg px-3 group"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Badges and ID */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-[#555C56] bg-[#F0F2F0] px-2 py-0.5 rounded border border-[#E2E8E4]">
                        {inv.id}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${modConfig.badgeClass}`}
                      >
                        {modConfig.shortLabel}
                      </span>
                      {inv.bodyRegion && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#F5F8F6] text-[#2C3E30] font-medium border border-[#E2E8E4]">
                          {inv.bodyRegion}
                        </span>
                      )}
                      <span className="text-xs text-[#555C56] flex items-center gap-1 ml-auto md:ml-0">
                        <Calendar className="w-3.5 h-3.5 text-[#555C56]" />
                        {formatClinicalDate(inv.investigationDate)}
                      </span>
                    </div>

                    {/* Investigation Name */}
                    <h3 className="text-base font-semibold text-[#1A2E22] group-hover:text-[#1B3B2B] transition-colors">
                      {inv.name}
                    </h3>

                    {/* Facility / Source */}
                    {(inv.sourceName || inv.sourceType) && (
                      <div className="text-xs text-[#555C56] flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-[#88908A]" />
                        <span>
                          {inv.sourceName}
                          {inv.sourceType && (
                            <span className="text-[#88908A]"> ({inv.sourceType})</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Indication / Context if present */}
                    {inv.indication && (
                      <p className="text-xs text-[#555C56] mt-2 line-clamp-1 italic">
                        <span className="font-medium text-[#2C3E30] not-italic">
                          Indication:
                        </span>{' '}
                        {inv.indication}
                      </p>
                    )}

                    {/* Reported Impression Preview */}
                    {inv.impression ? (
                      <div className="mt-2.5 p-2.5 bg-[#F8F9FA] rounded-md border border-[#E6E8E7] text-xs">
                        <span className="font-semibold text-[#1A2E22] uppercase tracking-wider text-[10px] block mb-0.5 text-neutral-600">
                          Reported Impression
                        </span>
                        <p className="text-[#2C3E30] line-clamp-2">{inv.impression}</p>
                      </div>
                    ) : inv.findings ? (
                      <div className="mt-2.5 p-2.5 bg-[#F8F9FA] rounded-md border border-[#E6E8E7] text-xs">
                        <span className="font-semibold text-[#1A2E22] uppercase tracking-wider text-[10px] block mb-0.5 text-neutral-600">
                          Reported Findings
                        </span>
                        <p className="text-[#2C3E30] line-clamp-2">{inv.findings}</p>
                      </div>
                    ) : null}

                    {/* Clinician Relevance / Notes Preview */}
                    {inv.clinicianRelevance && (
                      <div className="mt-2 p-2.5 bg-[#F0F5F2] rounded-md border border-[#D5E2D9] text-xs">
                        <span className="font-semibold text-[#1B3B2B] uppercase tracking-wider text-[10px] block mb-0.5">
                          Therapist Interpretation & Clinical Relevance
                        </span>
                        <p className="text-[#1B3B2B] line-clamp-2">
                          {inv.clinicianRelevance}
                        </p>
                      </div>
                    )}

                    {/* Attachment preview if present */}
                    {inv.attachment && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#CAD8D0] rounded text-xs text-[#1B3B2B]">
                        <Paperclip className="w-3.5 h-3.5 text-[#1B3B2B]" />
                        <span className="font-medium truncate max-w-[220px]">
                          {inv.attachment.name || 'Attached Report'}
                        </span>
                        {inv.attachment.size && (
                          <span className="text-[#555C56] text-[11px]">
                            ({(inv.attachment.size / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 self-start shrink-0 pt-1">
                    <button
                      type="button"
                      title="View Details"
                      onClick={() => setViewingInvestigation(inv)}
                      className="p-1.5 text-[#555C56] hover:text-[#1B3B2B] hover:bg-[#EBF2EE] rounded-md transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Edit Investigation"
                      onClick={() => openEditModal(inv)}
                      className="p-1.5 text-[#555C56] hover:text-[#1D4E89] hover:bg-[#EEF4FB] rounded-md transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete Investigation"
                      onClick={() => setDeletingInvestigation(inv)}
                      className="p-1.5 text-[#555C56] hover:text-[#B3261E] hover:bg-[#FDF2F2] rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* CREATE / EDIT MODAL                                       */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-[#E2E8E4] my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8E4] bg-[#FAFBF9]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#EEF4FB] text-[#1D4E89] rounded-lg border border-[#C8DCF0]">
                  <FileScan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1A2E22]">
                    {modalMode === 'create'
                      ? 'Add Clinical Investigation'
                      : 'Edit Clinical Investigation'}
                  </h3>
                  <p className="text-xs text-[#555C56]">
                    Record radiological findings, reported impressions, and therapist-authored correlation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#555C56] hover:text-[#1A2E22] p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Section 1: Investigation & Modality */}
              <div className="bg-[#FAFBF9] p-4 rounded-lg border border-[#E2E8E4] space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1A2E22] uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-[#1B3B2B]" />
                  <span>Investigation Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                      Investigation Name <span className="text-[#B3261E]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MRI Lumbar Spine (Without Contrast)"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full text-sm px-3 py-2 rounded-lg border ${
                        formErrors.name ? 'border-[#B3261E]' : 'border-[#CAD8D0]'
                      } focus:outline-hidden focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] bg-white`}
                    />
                    {formErrors.name && (
                      <p className="text-xs text-[#B3261E] mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Modality */}
                  <div>
                    <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                      Modality <span className="text-[#B3261E]">*</span>
                    </label>
                    <select
                      value={formData.modality}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          modality: e.target.value as RadiologicalModality,
                        })
                      }
                      className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] bg-white"
                    >
                      <option value="xray">X-ray (Plain Radiograph)</option>
                      <option value="mri">MRI (Magnetic Resonance Imaging)</option>
                      <option value="ct">CT (Computed Tomography)</option>
                      <option value="ultrasound">Ultrasound (Diagnostic Sonography)</option>
                      <option value="other">Other Imaging Modality</option>
                    </select>
                  </div>

                  {/* Body Region */}
                  <div>
                    <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                      Body Region / Anatomical Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lumbar Spine, Right Knee, Cervical"
                      value={formData.bodyRegion}
                      onChange={(e) =>
                        setFormData({ ...formData, bodyRegion: e.target.value })
                      }
                      className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] bg-white"
                    />
                  </div>

                  {/* Investigation Date */}
                  <div>
                    <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                      Investigation Date <span className="text-[#B3261E]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.investigationDate}
                      onChange={(e) =>
                        setFormData({ ...formData, investigationDate: e.target.value })
                      }
                      className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] bg-white"
                    />
                    {formErrors.investigationDate && (
                      <p className="text-xs text-[#B3261E] mt-1">
                        {formErrors.investigationDate}
                      </p>
                    )}
                  </div>

                  {/* Indication */}
                  <div>
                    <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                      Clinical Indication / Context
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Refractory radicular leg pain, suspicion of disc bulge"
                      value={formData.indication}
                      onChange={(e) =>
                        setFormData({ ...formData, indication: e.target.value })
                      }
                      className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Reported Findings & Impression (FROM REPORT) */}
              <div className="bg-[#F8F9FA] p-4 rounded-lg border border-[#E2E8E4] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1A2E22] uppercase tracking-wider">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#1D4E89]" />
                    <span>Reported Information (From Diagnostic Report)</span>
                  </div>
                  <span className="text-[11px] text-[#555C56]">
                    Formal report documentation
                  </span>
                </div>

                {/* Findings */}
                <div>
                  <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                    Reported Findings
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document factual findings recorded in the imaging report (e.g. L4-L5 disc desiccation with mild central posterior protrusion, no canal stenosis)..."
                    value={formData.findings}
                    onChange={(e) =>
                      setFormData({ ...formData, findings: e.target.value })
                    }
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1D4E89]/20 focus:border-[#1D4E89] bg-white font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Impression */}
                <div>
                  <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                    Reported Impression
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Formal diagnostic conclusion or radiologist impression (e.g. Broad-based L4-L5 disc protrusion without significant neural compression)..."
                    value={formData.impression}
                    onChange={(e) =>
                      setFormData({ ...formData, impression: e.target.value })
                    }
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1D4E89]/20 focus:border-[#1D4E89] bg-white font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* Section 3: Facility / Source */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                    Source Facility / Service Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. St. Jude Diagnostic Radiology"
                    value={formData.sourceName}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceName: e.target.value })
                    }
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2C3E30] mb-1">
                    Source Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hospital Radiology, Private Clinic, External"
                    value={formData.sourceType}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceType: e.target.value })
                    }
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] bg-white"
                  />
                </div>
              </div>

              {/* Section 4: Therapist-Authored Clinical Relevance (SAFETY DISTINCTION) */}
              <div className="bg-[#F0F5F2] p-4 rounded-lg border border-[#CAD8D0] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1B3B2B] uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    <span>Clinical Relevance & Therapist Notes</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#1B3B2B]">
                    Physiotherapist Interpretation
                  </span>
                </div>
                <p className="text-xs text-[#555C56]">
                  Document how these reported imaging findings correlate with physical examination, symptom reproduction, concordant pain, and treatment direction.
                </p>
                <textarea
                  rows={3}
                  placeholder="e.g. Findings correlate with subjective L5 dermatomal pain and concordant straight leg raise test on the right side. Reassuring absence of high-grade canal compromise supports progressive active lumbar rehab."
                  value={formData.clinicianRelevance}
                  onChange={(e) =>
                    setFormData({ ...formData, clinicianRelevance: e.target.value })
                  }
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[#CAD8D0] focus:outline-hidden focus:ring-2 focus:ring-[#1B3B2B]/20 focus:border-[#1B3B2B] bg-white text-xs leading-relaxed"
                />
              </div>

              {/* Section 5: Optional Report Attachment */}
              <div className="border border-dashed border-[#CAD8D0] rounded-lg p-4 bg-[#FAFBF9]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#2C3E30] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#555C56]" />
                    Optional Report Attachment (PDF or Image)
                  </label>
                  {attachment && (
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="text-xs text-[#B3261E] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {attachment ? (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-[#E2E8E4] rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#1D4E89] shrink-0" />
                      <span className="font-medium text-[#1A2E22] truncate">
                        {attachment.name || 'Report file'}
                      </span>
                      {attachment.size && (
                        <span className="text-[#555C56]">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#1B3B2B] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1B3B2B]" />
                      Attached
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="text-xs text-[#555C56] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#EBF2EE] file:text-[#1B3B2B] hover:file:bg-[#D5E2D9] file:cursor-pointer"
                    />
                    <p className="text-[11px] text-[#555C56] mt-1">
                      Attach digital scan or radiology report copy (metadata preserved locally).
                    </p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8E4]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#555C56] hover:text-[#1A2E22] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-investigation-submit"
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-[#1B3B2B] hover:bg-[#254F3A] rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {modalMode === 'create' ? 'Save Investigation' : 'Update Investigation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DETAIL VIEW MODAL                                         */}
      {/* ========================================================= */}
      {viewingInvestigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-[#E2E8E4] my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-[#E2E8E4] bg-[#FAFBF9]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-[#555C56] bg-[#F0F2F0] px-2 py-0.5 rounded border border-[#E2E8E4]">
                    {viewingInvestigation.id}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                      RADIOLOGICAL_MODALITY_CONFIG[viewingInvestigation.modality]
                        ?.badgeClass || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {RADIOLOGICAL_MODALITY_CONFIG[viewingInvestigation.modality]?.label ||
                      viewingInvestigation.modality}
                  </span>
                  {viewingInvestigation.bodyRegion && (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#F5F8F6] text-[#2C3E30] font-medium border border-[#E2E8E4]">
                      {viewingInvestigation.bodyRegion}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-[#1A2E22]">
                  {viewingInvestigation.name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#555C56] mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#555C56]" />
                    Date: {formatClinicalDate(viewingInvestigation.investigationDate)}
                  </span>
                  {viewingInvestigation.sourceName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#555C56]" />
                      Source: {viewingInvestigation.sourceName}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingInvestigation(null)}
                className="text-[#555C56] hover:text-[#1A2E22] p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Indication */}
              {viewingInvestigation.indication && (
                <div>
                  <h4 className="text-xs font-semibold text-[#555C56] uppercase tracking-wider mb-1">
                    Clinical Indication
                  </h4>
                  <p className="text-sm text-[#1A2E22] bg-[#FAFBF9] p-3 rounded-lg border border-[#E2E8E4]">
                    {viewingInvestigation.indication}
                  </p>
                </div>
              )}

              {/* Reported Findings */}
              {viewingInvestigation.findings && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-[#1D4E89]" />
                    <h4 className="text-xs font-semibold text-[#1D4E89] uppercase tracking-wider">
                      Reported Findings (From Imaging Report)
                    </h4>
                  </div>
                  <div className="text-xs text-[#1A2E22] bg-[#F8F9FA] p-3.5 rounded-lg border border-[#C8DCF0] font-mono leading-relaxed whitespace-pre-line">
                    {viewingInvestigation.findings}
                  </div>
                </div>
              )}

              {/* Reported Impression */}
              {viewingInvestigation.impression && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#1D4E89]" />
                    <h4 className="text-xs font-semibold text-[#1D4E89] uppercase tracking-wider">
                      Reported Impression (Formal Diagnostic Conclusion)
                    </h4>
                  </div>
                  <div className="text-xs font-semibold text-[#1A2E22] bg-[#F8F9FA] p-3.5 rounded-lg border border-[#C8DCF0] font-mono leading-relaxed whitespace-pre-line">
                    {viewingInvestigation.impression}
                  </div>
                </div>
              )}

              {/* Clinician Interpretation */}
              {viewingInvestigation.clinicianRelevance && (
                <div className="bg-[#F0F5F2] p-4 rounded-lg border border-[#CAD8D0]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Activity className="w-4 h-4 text-[#1B3B2B]" />
                    <h4 className="text-xs font-semibold text-[#1B3B2B] uppercase tracking-wider">
                      Therapist Clinical Relevance & Correlation
                    </h4>
                  </div>
                  <p className="text-xs text-[#1B3B2B] leading-relaxed whitespace-pre-line">
                    {viewingInvestigation.clinicianRelevance}
                  </p>
                </div>
              )}

              {/* Attachment if present */}
              {viewingInvestigation.attachment && (
                <div className="p-3 bg-[#FAFBF9] border border-[#E2E8E4] rounded-lg">
                  <h4 className="text-xs font-semibold text-[#555C56] uppercase tracking-wider mb-2">
                    Attached Report File
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Paperclip className="w-4 h-4 text-[#1B3B2B]" />
                      <span className="font-medium text-[#1A2E22]">
                        {viewingInvestigation.attachment.name || 'Investigation Report'}
                      </span>
                      {viewingInvestigation.attachment.size && (
                        <span className="text-[#555C56]">
                          ({(viewingInvestigation.attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    {viewingInvestigation.attachment.dataUrl && (
                      <a
                        href={viewingInvestigation.attachment.dataUrl}
                        download={viewingInvestigation.attachment.name || 'Report'}
                        className="text-xs text-[#1B3B2B] hover:underline font-medium"
                      >
                        Download File
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata Timestamps */}
              <div className="pt-2 text-[11px] text-[#555C56] flex items-center justify-between border-t border-[#E2E8E4]">
                <span>Created: {new Date(viewingInvestigation.createdAt).toLocaleString()}</span>
                <span>Last Updated: {new Date(viewingInvestigation.updatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8E4] bg-[#FAFBF9]">
              <button
                type="button"
                onClick={() => {
                  setDeletingInvestigation(viewingInvestigation);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#B3261E] hover:bg-[#FDF2F2] rounded-md transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(viewingInvestigation)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1D4E89] bg-[#EEF4FB] hover:bg-[#DEECFA] border border-[#C8DCF0] rounded-md transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvestigation(null)}
                  className="px-4 py-1.5 text-xs font-medium text-[#555C56] hover:text-[#1A2E22] hover:bg-black/5 rounded-md transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL                                 */}
      {/* ========================================================= */}
      {deletingInvestigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-[#E2E8E4] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#FDF2F2] text-[#B3261E] rounded-full shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1A2E22]">
                  Delete Clinical Investigation?
                </h3>
                <p className="text-xs text-[#555C56] mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-[#1A2E22]">{deletingInvestigation.name}</span> ({deletingInvestigation.id})?
                </p>
                <p className="text-xs text-[#555C56] mt-2 bg-[#FAFBF9] p-2.5 rounded border border-[#E2E8E4]">
                  Note: Any clinical problem formulations linking to this investigation will simply be unlinked without affecting the problem itself.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeletingInvestigation(null)}
                className="px-3 py-1.5 text-xs font-medium text-[#555C56] hover:text-[#1A2E22] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#B3261E] hover:bg-[#8F1F18] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
