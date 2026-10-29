import React, { useState } from 'react';
import {
  X,
  Link as LinkIcon,
  Search,
  BookOpen,
  FileText,
  AlertCircle,
  Plus,
  Check,
} from 'lucide-react';
import {
  ConditionPresentation,
  EvidenceItem,
  EvidenceSource,
  ConditionEvidenceLink,
} from '../../types';
import {
  EVIDENCE_TYPE_CONFIG,
  EVIDENCE_SOURCE_STATUS_CONFIG,
} from '../../utils/evidenceKnowledge';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface LinkEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  condition: ConditionPresentation;
  allEvidenceItems: EvidenceItem[];
  allEvidenceSources: EvidenceSource[];
  existingLinks: ConditionEvidenceLink[];
  onLinkEvidence: (
    conditionId: string,
    evidenceItemId: string,
    relevanceNote?: string
  ) => void;
}

export const LinkEvidenceModal: React.FC<LinkEvidenceModalProps> = ({
  isOpen,
  onClose,
  condition,
  allEvidenceItems,
  allEvidenceSources,
  existingLinks,
  onLinkEvidence,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [relevanceNote, setRelevanceNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const linkedItemIds = new Set(existingLinks.map((l) => l.evidenceItemId));

  const filteredItems = allEvidenceItems.filter((item) => {
    if (linkedItemIds.has(item.id)) return false; // Hide already linked items or indicate linked
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const parentSource = allEvidenceSources.find((s) => s.id === item.sourceId);
    return (
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      (item.conditionOrPresentation || '').toLowerCase().includes(q) ||
      (item.treatmentApproach || '').toLowerCase().includes(q) ||
      (parentSource && parentSource.title.toLowerCase().includes(q)) ||
      (parentSource?.organization || '').toLowerCase().includes(q)
    );
  });

  const selectedItem = allEvidenceItems.find((i) => i.id === selectedItemId);
  const selectedItemSource = selectedItem
    ? allEvidenceSources.find((s) => s.id === selectedItem.sourceId)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError('Please select an evidence item to link.');
      return;
    }

    onLinkEvidence(
      condition.id,
      selectedItemId,
      relevanceNote.trim() || undefined
    );
    setSelectedItemId(null);
    setRelevanceNote('');
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-evidence-modal-title"
    >
      <div className="bg-[#FAF8F5] w-full max-w-2xl rounded-xl shadow-xl border border-[#E5DFD4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D7] bg-[#F7F4EF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#E2ECE7] text-[#1B3B2B]">
              <LinkIcon className="w-5 h-5" />
            </span>
            <div>
              <h2
                id="link-evidence-modal-title"
                className="text-lg font-semibold text-[#18201C] tracking-tight"
              >
                Link Evidence to {condition.name}
              </h2>
              <p className="text-xs text-[#5B635D]">
                Select an existing evidence item from the knowledge library to organize under this pathway.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6A716B] hover:text-[#18201C] hover:bg-[#EAE4D9] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C2] rounded-lg flex items-center gap-2 text-xs text-[#9B2C2C]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search available items */}
          <div className="space-y-1.5">
            <label
              htmlFor="search-evidence-item"
              className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
            >
              Search Evidence Library
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#79817B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-evidence-item"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, treatment approach, or parent source..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
              />
            </div>
          </div>

          {/* Item selection list */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]">
              Select Evidence Item ({filteredItems.length} available)
            </label>

            {filteredItems.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[#DCD5C9] rounded-lg text-xs text-[#6A716B] bg-[#F7F4EF]">
                {allEvidenceItems.length === 0
                  ? 'No evidence items exist in the library yet. Register sources and items first.'
                  : linkedItemIds.size === allEvidenceItems.length
                  ? 'All available evidence items in the library are already linked to this condition.'
                  : 'No unlinked evidence items match your search.'}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 border border-[#E5DFD4] rounded-lg p-2 bg-[#F9F7F3]">
                {filteredItems.map((item) => {
                  const parentSource = allEvidenceSources.find(
                    (s) => s.id === item.sourceId
                  );
                  const isSelected = selectedItemId === item.id;
                  const typeConfig = parentSource
                    ? EVIDENCE_TYPE_CONFIG[parentSource.evidenceType]
                    : null;
                  const statusConfig = parentSource
                    ? EVIDENCE_SOURCE_STATUS_CONFIG[parentSource.status]
                    : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setError(null);
                      }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'border-[#1B3B2B] bg-[#EBF3EE] shadow-xs'
                          : 'border-[#EAE4D9] bg-[#FAF8F5] hover:border-[#D5CEC2]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {typeConfig && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${typeConfig.badgeClass}`}
                              >
                                {typeConfig.shortLabel}
                              </span>
                            )}
                            {statusConfig && parentSource?.status !== 'current' && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusConfig.badgeClass}`}
                              >
                                {statusConfig.label}
                              </span>
                            )}
                            {parentSource && (
                              <span className="text-[11px] text-[#6A716B]">
                                {parentSource.publicationYear} ·{' '}
                                {parentSource.organization || parentSource.title}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-[#18201C] leading-snug">
                            {item.title}
                          </h4>
                          {item.treatmentApproach && (
                            <p className="text-xs text-[#2D5A3F] font-medium">
                              Approach: {item.treatmentApproach}
                            </p>
                          )}
                          <p className="text-xs text-[#5B635D] line-clamp-2">
                            {item.summary}
                          </p>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center border text-xs ${
                              isSelected
                                ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                                : 'border-[#C8C1B4] text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Item Preview & Context */}
          {selectedItem && (
            <div className="p-3 bg-[#F0ECE1] border border-[#DDD5C5] rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1B3B2B]">
                <FileText className="w-3.5 h-3.5" />
                <span>Selected: {selectedItem.title}</span>
              </div>
              {selectedItemSource && (
                <p className="text-[11px] text-[#555C56]">
                  Source: {selectedItemSource.title} ({selectedItemSource.publicationYear})
                </p>
              )}
            </div>
          )}

          {/* Relevance Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="relevance-note"
              className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
            >
              Curator Relevance Note (Optional)
            </label>
            <textarea
              id="relevance-note"
              value={relevanceNote}
              onChange={(e) => setRelevanceNote(e.target.value)}
              rows={2}
              placeholder="Contextual note describing why this evidence item is organized under this pathway..."
              className="w-full p-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] resize-y"
            />
            <p className="text-[11px] text-[#707872]">
              Provides transparent context for other therapists reviewing this condition pathway.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E8E2D7] flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!selectedItemId}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Link
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
