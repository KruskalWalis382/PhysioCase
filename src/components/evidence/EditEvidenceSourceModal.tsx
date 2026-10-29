import React, { useState, useEffect } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import {
  EvidenceSource,
  EvidenceType,
  EvidenceSourceStatus,
} from '../../types';
import {
  EVIDENCE_TYPE_CONFIG,
  EVIDENCE_SOURCE_STATUS_CONFIG,
  createEmptyEvidenceSource,
} from '../../utils/evidenceKnowledge';
import { Button } from '../common/Button';

interface EditEvidenceSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceToEdit?: EvidenceSource | null;
  onSave: (
    sourceData: Partial<EvidenceSource> & {
      title: string;
      publicationYear: number;
      evidenceType: EvidenceType;
      status: EvidenceSourceStatus;
    }
  ) => void;
  allSources: EvidenceSource[];
}

export const EditEvidenceSourceModal: React.FC<EditEvidenceSourceModalProps> = ({
  isOpen,
  onClose,
  sourceToEdit,
  onSave,
  allSources,
}) => {
  const [formData, setFormData] = useState<
    Omit<EvidenceSource, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      authorsInput: string;
    }
  >({
    ...createEmptyEvidenceSource(),
    authorsInput: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (sourceToEdit) {
        setFormData({
          id: sourceToEdit.id,
          title: sourceToEdit.title,
          authors: sourceToEdit.authors || [],
          authorsInput: (sourceToEdit.authors || []).join(', '),
          organization: sourceToEdit.organization || '',
          publicationYear: sourceToEdit.publicationYear || new Date().getFullYear(),
          evidenceType: sourceToEdit.evidenceType || 'clinical_practice_guideline',
          journalOrPublisher: sourceToEdit.journalOrPublisher || '',
          doi: sourceToEdit.doi || '',
          url: sourceToEdit.url || '',
          version: sourceToEdit.version || '',
          status: sourceToEdit.status || 'current',
          publishedAt: sourceToEdit.publishedAt || '',
          lastReviewedAt: sourceToEdit.lastReviewedAt || '',
          supersededBySourceId: sourceToEdit.supersededBySourceId || '',
          notes: sourceToEdit.notes || '',
        });
      } else {
        const empty = createEmptyEvidenceSource();
        setFormData({
          ...empty,
          authorsInput: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, sourceToEdit]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    const year = Number(formData.publicationYear);
    if (!year || isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
      newErrors.publicationYear = 'Please provide a valid publication year';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const parsedAuthors = formData.authorsInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    onSave({
      id: formData.id,
      title: formData.title.trim(),
      authors: parsedAuthors,
      organization: formData.organization?.trim() || undefined,
      publicationYear: Number(formData.publicationYear),
      evidenceType: formData.evidenceType,
      journalOrPublisher: formData.journalOrPublisher?.trim() || undefined,
      doi: formData.doi?.trim() || undefined,
      url: formData.url?.trim() || undefined,
      version: formData.version?.trim() || undefined,
      status: formData.status,
      publishedAt: formData.publishedAt?.trim() || undefined,
      lastReviewedAt: formData.lastReviewedAt?.trim() || undefined,
      supersededBySourceId: formData.supersededBySourceId?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
    });

    onClose();
  };

  // Potential replacement sources for supersession, excluding this source itself
  const candidateSupersedingSources = allSources.filter(
    (s) => s.id !== formData.id
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#141A16]/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D7] bg-[#F7F4EF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E2ECE7] text-[#1B3B2B] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#18201C]">
                {formData.id ? 'Edit Evidence Source' : 'New Evidence Source'}
              </h2>
              <p className="text-xs text-[#636A64]">
                Register publication metadata, evidence classification, and status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#69706A] hover:text-[#18201C] p-1.5 rounded-lg hover:bg-[#EAE4D9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
              Source Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Clinical Practice Guideline: Physical Therapy Management of..."
              className={`w-full px-3 py-2 text-sm bg-[#FDFCFA] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] ${
                errors.title ? 'border-rose-400' : 'border-[#D9D3C7]'
              }`}
            />
            {errors.title && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.title}
              </p>
            )}
          </div>

          {/* Grid: Evidence Type & Publication Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Evidence Type <span className="text-rose-600">*</span>
              </label>
              <select
                value={formData.evidenceType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    evidenceType: e.target.value as EvidenceType,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              >
                {Object.entries(EVIDENCE_TYPE_CONFIG).map(([typeKey, cfg]) => (
                  <option key={typeKey} value={typeKey}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Publication Year <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                value={formData.publicationYear}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    publicationYear: parseInt(e.target.value) || 0,
                  })
                }
                min="1900"
                max={new Date().getFullYear() + 2}
                className={`w-full px-3 py-2 text-sm bg-[#FDFCFA] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] ${
                  errors.publicationYear ? 'border-rose-400' : 'border-[#D9D3C7]'
                }`}
              />
              {errors.publicationYear && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.publicationYear}
                </p>
              )}
            </div>
          </div>

          {/* Grid: Status & Superseded By Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Evidence Status <span className="text-rose-600">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as EvidenceSourceStatus,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              >
                {Object.entries(EVIDENCE_SOURCE_STATUS_CONFIG).map(([stKey, cfg]) => (
                  <option key={stKey} value={stKey}>
                    {cfg.label} — {cfg.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Superseded By (Source)
              </label>
              <select
                value={formData.supersededBySourceId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    supersededBySourceId: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              >
                <option value="">None (Current / Independent)</option>
                {candidateSupersedingSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.publicationYear})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#69706A] mt-1">
                Link to replacement source if this publication has been superseded.
              </p>
            </div>
          </div>

          {/* Organization & Journal/Publisher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Organization / Authoring Body
              </label>
              <input
                type="text"
                value={formData.organization || ''}
                onChange={(e) =>
                  setFormData({ ...formData, organization: e.target.value })
                }
                placeholder="e.g. Academy of Orthopaedic Physical Therapy"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Journal or Publisher
              </label>
              <input
                type="text"
                value={formData.journalOrPublisher || ''}
                onChange={(e) =>
                  setFormData({ ...formData, journalOrPublisher: e.target.value })
                }
                placeholder="e.g. Journal of Orthopaedic & Sports Physical Therapy"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>
          </div>

          {/* Authors */}
          <div>
            <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
              Authors (comma-separated)
            </label>
            <input
              type="text"
              value={formData.authorsInput}
              onChange={(e) =>
                setFormData({ ...formData, authorsInput: e.target.value })
              }
              placeholder="e.g. Blanpied PR, Gross AR, Elliott JM, Clewley D"
              className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
            />
          </div>

          {/* Identifiers: DOI, URL & Version */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                DOI
              </label>
              <input
                type="text"
                value={formData.doi || ''}
                onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                placeholder="10.2519/jospt.2021.0304"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                URL / Web Link
              </label>
              <input
                type="url"
                value={formData.url || ''}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Version / Edition
              </label>
              <input
                type="text"
                value={formData.version || ''}
                onChange={(e) =>
                  setFormData({ ...formData, version: e.target.value })
                }
                placeholder="e.g. Revised 2021, v2.1"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>
          </div>

          {/* Dates: Published At & Last Reviewed At */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Published Date
              </label>
              <input
                type="date"
                value={formData.publishedAt || ''}
                onChange={(e) =>
                  setFormData({ ...formData, publishedAt: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Last Reviewed Date (Library Audit)
              </label>
              <input
                type="date"
                value={formData.lastReviewedAt || ''}
                onChange={(e) =>
                  setFormData({ ...formData, lastReviewedAt: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
              <p className="text-[11px] text-[#69706A] mt-1">
                Reflects library administrative curation audit, not automated validity.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
              Curation Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Contextual notes on methodology, scope, or publication revision history..."
              className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E2D7]">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {formData.id ? 'Save Changes' : 'Register Source'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
