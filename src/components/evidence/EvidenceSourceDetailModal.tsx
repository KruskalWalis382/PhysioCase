import React from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Building,
  User,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { EvidenceSource, EvidenceItem } from '../../types';
import {
  EVIDENCE_TYPE_CONFIG,
  EVIDENCE_SOURCE_STATUS_CONFIG,
} from '../../utils/evidenceKnowledge';
import { Button } from '../common/Button';

interface EvidenceSourceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: EvidenceSource | null;
  items: EvidenceItem[];
  allSources: EvidenceSource[];
  onEditSource: (source: EvidenceSource) => void;
  onAddItem: (sourceId: string) => void;
  onEditItem: (item: EvidenceItem) => void;
  onDeleteItem: (itemId: string) => void;
  onSelectOtherSource?: (sourceId: string) => void;
}

export const EvidenceSourceDetailModal: React.FC<EvidenceSourceDetailModalProps> = ({
  isOpen,
  onClose,
  source,
  items,
  allSources,
  onEditSource,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onSelectOtherSource,
}) => {
  if (!isOpen || !source) return null;

  const typeConfig =
    EVIDENCE_TYPE_CONFIG[source.evidenceType] || EVIDENCE_TYPE_CONFIG.other;
  const statusConfig =
    EVIDENCE_SOURCE_STATUS_CONFIG[source.status] ||
    EVIDENCE_SOURCE_STATUS_CONFIG.current;

  // Resolve replacement source if superseded
  const supersedingSource = source.supersededBySourceId
    ? allSources.find((s) => s.id === source.supersededBySourceId)
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#141A16]/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E8E2D7] bg-[#F7F4EF] flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${typeConfig.badgeClass}`}
              >
                {typeConfig.label}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusConfig.badgeClass}`}
              >
                {statusConfig.label}
              </span>
              {source.version && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFECE6] text-[#4F5651] border border-[#DCD7CE]">
                  {source.version}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#18201C] tracking-tight leading-snug">
              {source.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => onEditSource(source)}
            >
              Edit Source
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-[#69706A] hover:text-[#18201C] p-1.5 rounded-lg hover:bg-[#EAE4D9] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Supersession Banner */}
          {source.supersededBySourceId && (
            <div className="p-4 rounded-lg bg-[#FAF4E8] border border-[#E5D0A4] flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#8C5815] shrink-0 mt-0.5" />
              <div className="text-xs text-[#5D3A0E] space-y-1">
                <p className="font-semibold">
                  This publication has been superseded by a newer evidence source.
                </p>
                {supersedingSource ? (
                  <p>
                    Superseded by:{' '}
                    <button
                      type="button"
                      onClick={() =>
                        onSelectOtherSource && onSelectOtherSource(supersedingSource.id)
                      }
                      className="font-medium underline hover:text-[#1B3B2B] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>
                        {supersedingSource.title} ({supersedingSource.publicationYear})
                      </span>
                      <ArrowRight className="w-3 h-3 inline" />
                    </button>
                  </p>
                ) : (
                  <p className="text-[#7A4B10]">
                    Superseded by registered source reference:{' '}
                    <code className="bg-[#F0E6D2] px-1 py-0.5 rounded font-mono">
                      {source.supersededBySourceId}
                    </code>{' '}
                    (record not found in current library)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Source Metadata Grid */}
          <div className="p-4 bg-[#F7F4EF] rounded-lg border border-[#EAE4DA] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-4 text-xs">
            <div>
              <span className="text-[#6E756F] font-medium block">Publication Year:</span>
              <span className="text-[#18201C] font-semibold">{source.publicationYear}</span>
            </div>

            {source.organization && (
              <div>
                <span className="text-[#6E756F] font-medium block">Organization:</span>
                <span className="text-[#18201C]">{source.organization}</span>
              </div>
            )}

            {source.journalOrPublisher && (
              <div>
                <span className="text-[#6E756F] font-medium block">Journal / Publisher:</span>
                <span className="text-[#18201C]">{source.journalOrPublisher}</span>
              </div>
            )}

            {source.authors && source.authors.length > 0 && (
              <div className="sm:col-span-2">
                <span className="text-[#6E756F] font-medium block">Authors:</span>
                <span className="text-[#18201C]">{source.authors.join(', ')}</span>
              </div>
            )}

            {source.publishedAt && (
              <div>
                <span className="text-[#6E756F] font-medium block">Publication Date:</span>
                <span className="text-[#18201C]">{source.publishedAt}</span>
              </div>
            )}

            {source.lastReviewedAt && (
              <div>
                <span className="text-[#6E756F] font-medium block">Library Reviewed Date:</span>
                <span className="text-[#18201C] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#58615A]" />
                  {source.lastReviewedAt}
                </span>
              </div>
            )}

            {source.doi && (
              <div>
                <span className="text-[#6E756F] font-medium block">DOI:</span>
                <a
                  href={`https://doi.org/${source.doi}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1B3B2B] hover:underline font-mono inline-flex items-center gap-1"
                >
                  <span>{source.doi}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {source.url && (
              <div>
                <span className="text-[#6E756F] font-medium block">External Resource:</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1B3B2B] hover:underline inline-flex items-center gap-1"
                >
                  <span>Visit Publisher</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Notes */}
          {source.notes && (
            <div className="p-3.5 bg-[#FAF7F2] rounded-lg border border-[#E8E2D7] text-xs">
              <span className="font-semibold text-[#3C443E] block mb-1">
                Curator Notes & Scope:
              </span>
              <p className="text-[#555C56] leading-relaxed">{source.notes}</p>
            </div>
          )}

          {/* Associated Evidence Items */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#18201C] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1B3B2B]" />
                  Associated Evidence Items ({items.length})
                </h3>
                <p className="text-xs text-[#69706A]">
                  Individual clinical findings, recommendations, and contextual parameters
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => onAddItem(source.id)}
              >
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center bg-[#FDFCFA] border border-dashed border-[#DCD5C9] rounded-lg">
                <p className="text-xs text-[#69706A]">
                  No evidence items have been documented for this source yet.
                </p>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => onAddItem(source.id)}
                  >
                    Add First Evidence Item
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-[#FDFCFA] border border-[#E5DFD4] rounded-lg space-y-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-[#18201C] leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-[#4A514B] mt-1.5 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="p-1.5 text-[#5D645F] hover:text-[#18201C] hover:bg-[#EFE9DF] rounded transition-colors"
                          title="Edit Evidence Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete evidence item "${item.title}"?`
                              )
                            ) {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="p-1.5 text-[#8A5B5B] hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Evidence Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Context Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F8F5F0] rounded border border-[#ECE6DB] text-xs">
                      {item.conditionOrPresentation && (
                        <div>
                          <span className="font-semibold text-[#5A625C] block">
                            Condition / Presentation:
                          </span>
                          <span className="text-[#1F2622]">
                            {item.conditionOrPresentation}
                          </span>
                        </div>
                      )}
                      {item.treatmentApproach && (
                        <div>
                          <span className="font-semibold text-[#5A625C] block">
                            Treatment Approach:
                          </span>
                          <span className="text-[#1F2622]">
                            {item.treatmentApproach}
                          </span>
                        </div>
                      )}
                      {item.population && (
                        <div>
                          <span className="font-semibold text-[#5A625C] block">
                            Studied Population:
                          </span>
                          <span className="text-[#1F2622]">{item.population}</span>
                        </div>
                      )}
                      {item.clinicalContext && (
                        <div>
                          <span className="font-semibold text-[#5A625C] block">
                            Clinical Context:
                          </span>
                          <span className="text-[#1F2622]">
                            {item.clinicalContext}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Recommendation and Strength block */}
                    {(item.recommendation ||
                      item.recommendationStrength ||
                      item.evidenceLevel) && (
                      <div className="p-3 bg-[#EBF3EE]/50 border border-[#CFDFD6] rounded text-xs space-y-1.5">
                        {item.recommendation && (
                          <div>
                            <span className="font-semibold text-[#1B3B2B] block">
                              Source Recommendation:
                            </span>
                            <p className="text-[#254636] italic">
                              "{item.recommendation}"
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                          {item.recommendationStrength && (
                            <span className="inline-flex items-center gap-1 font-medium text-[#1B3B2B] bg-[#E2ECE7] px-2 py-0.5 rounded border border-[#B7CEBF]">
                              Strength: {item.recommendationStrength}
                            </span>
                          )}
                          {item.evidenceLevel && (
                            <span className="inline-flex items-center gap-1 font-medium text-[#22445E] bg-[#EFF3F6] px-2 py-0.5 rounded border border-[#CFDCE6]">
                              Level: {item.evidenceLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Applicability & Limitations */}
                    {(item.applicability || item.limitations) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {item.applicability && (
                          <div className="p-2.5 bg-[#FAF7F2] rounded border border-[#ECE6DC]">
                            <span className="font-semibold text-[#525954] block mb-0.5">
                              Clinical Applicability:
                            </span>
                            <p className="text-[#363B37] leading-relaxed">
                              {item.applicability}
                            </p>
                          </div>
                        )}
                        {item.limitations && (
                          <div className="p-2.5 bg-[#FAF7F2] rounded border border-[#ECE6DC]">
                            <span className="font-semibold text-[#525954] block mb-0.5">
                              Methodological Limitations:
                            </span>
                            <p className="text-[#363B37] leading-relaxed">
                              {item.limitations}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E2D7] bg-[#F7F4EF]">
          <span className="text-xs text-[#69706A]">
            Source ID: <code className="font-mono text-[11px]">{source.id}</code>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
