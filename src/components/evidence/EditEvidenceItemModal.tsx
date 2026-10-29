import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { EvidenceItem, EvidenceSource } from '../../types';
import { createEmptyEvidenceItem } from '../../utils/evidenceKnowledge';
import { Button } from '../common/Button';

interface EditEvidenceItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: EvidenceItem | null;
  defaultSourceId?: string;
  allSources: EvidenceSource[];
  onSave: (
    itemData: Partial<EvidenceItem> & {
      sourceId: string;
      title: string;
      summary: string;
    }
  ) => void;
}

export const EditEvidenceItemModal: React.FC<EditEvidenceItemModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
  defaultSourceId,
  allSources,
  onSave,
}) => {
  const [formData, setFormData] = useState<
    Omit<EvidenceItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  >(createEmptyEvidenceItem(defaultSourceId || allSources[0]?.id || ''));

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setFormData({
          id: itemToEdit.id,
          sourceId: itemToEdit.sourceId,
          title: itemToEdit.title,
          summary: itemToEdit.summary,
          conditionOrPresentation: itemToEdit.conditionOrPresentation || '',
          population: itemToEdit.population || '',
          clinicalContext: itemToEdit.clinicalContext || '',
          treatmentApproach: itemToEdit.treatmentApproach || '',
          recommendation: itemToEdit.recommendation || '',
          recommendationStrength: itemToEdit.recommendationStrength || '',
          evidenceLevel: itemToEdit.evidenceLevel || '',
          limitations: itemToEdit.limitations || '',
          applicability: itemToEdit.applicability || '',
        });
      } else {
        const targetSourceId = defaultSourceId || allSources[0]?.id || '';
        setFormData(createEmptyEvidenceItem(targetSourceId));
      }
      setErrors({});
    }
  }, [isOpen, itemToEdit, defaultSourceId, allSources]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.sourceId) {
      newErrors.sourceId = 'Parent evidence source is required';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      id: formData.id,
      sourceId: formData.sourceId,
      title: formData.title.trim(),
      summary: formData.summary.trim(),
      conditionOrPresentation: formData.conditionOrPresentation?.trim() || undefined,
      population: formData.population?.trim() || undefined,
      clinicalContext: formData.clinicalContext?.trim() || undefined,
      treatmentApproach: formData.treatmentApproach?.trim() || undefined,
      recommendation: formData.recommendation?.trim() || undefined,
      recommendationStrength: formData.recommendationStrength?.trim() || undefined,
      evidenceLevel: formData.evidenceLevel?.trim() || undefined,
      limitations: formData.limitations?.trim() || undefined,
      applicability: formData.applicability?.trim() || undefined,
    });

    onClose();
  };

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
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#18201C]">
                {formData.id ? 'Edit Evidence Item' : 'New Evidence Item'}
              </h2>
              <p className="text-xs text-[#636A64]">
                Document contextual clinical findings, recommendations, and applicability
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
          {/* Parent Source Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
              Parent Evidence Source <span className="text-rose-600">*</span>
            </label>
            <select
              value={formData.sourceId}
              onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
              className={`w-full px-3 py-2 text-sm bg-[#FDFCFA] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] ${
                errors.sourceId ? 'border-rose-400' : 'border-[#D9D3C7]'
              }`}
            >
              {allSources.length === 0 ? (
                <option value="">No sources available</option>
              ) : (
                allSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.publicationYear}) [{s.status}]
                  </option>
                ))
              )}
            </select>
            {errors.sourceId && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.sourceId}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
              Evidence Item Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Combined Manual Therapy and Deep Cervical Flexor Training"
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

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
              Evidence Summary <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="State what the evidence finding or statement demonstrates in clear clinical terms..."
              className={`w-full px-3 py-2 text-sm bg-[#FDFCFA] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] ${
                errors.summary ? 'border-rose-400' : 'border-[#D9D3C7]'
              }`}
            />
            {errors.summary && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.summary}
              </p>
            )}
          </div>

          {/* Clinical Scope & Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Condition or Presentation
              </label>
              <input
                type="text"
                value={formData.conditionOrPresentation || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    conditionOrPresentation: e.target.value,
                  })
                }
                placeholder="e.g. Cervicogenic Headache with upper cervical dysfunction"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Treatment Approach
              </label>
              <input
                type="text"
                value={formData.treatmentApproach || ''}
                onChange={(e) =>
                  setFormData({ ...formData, treatmentApproach: e.target.value })
                }
                placeholder="e.g. Combined manual therapy and targeted progressive exercise"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>
          </div>

          {/* Population & Clinical Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Studied Population
              </label>
              <input
                type="text"
                value={formData.population || ''}
                onChange={(e) =>
                  setFormData({ ...formData, population: e.target.value })
                }
                placeholder="e.g. Adults 18-65 with unilateral headache provoked by neck motion"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Clinical Context
              </label>
              <input
                type="text"
                value={formData.clinicalContext || ''}
                onChange={(e) =>
                  setFormData({ ...formData, clinicalContext: e.target.value })
                }
                placeholder="e.g. Outpatient physical therapy setting, subacute or chronic phase"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>
          </div>

          {/* Recommendation & Strength */}
          <div className="space-y-4 p-4 bg-[#F5F1EB] rounded-lg border border-[#E5DFD4]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#3C443E]">
              Source Recommendation & Rating
            </p>

            <div>
              <label className="block text-xs font-medium text-[#2D332F] mb-1">
                Source Recommendation Statement
              </label>
              <textarea
                rows={2}
                value={formData.recommendation || ''}
                onChange={(e) =>
                  setFormData({ ...formData, recommendation: e.target.value })
                }
                placeholder="Exact statement from the guideline or paper (e.g. Clinicians should utilize cervical mobilization...)"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#2D332F] mb-1">
                  Recommendation Strength (as provided by source)
                </label>
                <input
                  type="text"
                  value={formData.recommendationStrength || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recommendationStrength: e.target.value,
                    })
                  }
                  placeholder="e.g. Strong, Moderate, Grade B, Conditional"
                  className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2D332F] mb-1">
                  Evidence Level (as provided by source)
                </label>
                <input
                  type="text"
                  value={formData.evidenceLevel || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, evidenceLevel: e.target.value })
                  }
                  placeholder="e.g. Level 1a, Level B, Level II"
                  className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#69706A]">
              Faithfully preserve the original source's taxonomy; do not invent proprietary scores.
            </p>
          </div>

          {/* Applicability & Limitations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Clinical Applicability
              </label>
              <textarea
                rows={2}
                value={formData.applicability || ''}
                onChange={(e) =>
                  setFormData({ ...formData, applicability: e.target.value })
                }
                placeholder="When is this evidence applicable to clinical practice?"
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D332F] uppercase tracking-wider mb-1.5">
                Methodological Limitations
              </label>
              <textarea
                rows={2}
                value={formData.limitations || ''}
                onChange={(e) =>
                  setFormData({ ...formData, limitations: e.target.value })
                }
                placeholder="Boundaries, follow-up constraints, or population exclusions..."
                className="w-full px-3 py-2 text-sm bg-[#FDFCFA] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E2D7]">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {formData.id ? 'Save Changes' : 'Create Evidence Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
