import React, { useState } from 'react';
import {
  X,
  Network,
  Calendar,
  Building,
  Tag,
  BookOpen,
  FileText,
  Link as LinkIcon,
  Trash2,
  Edit2,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  Plus,
  Unlink,
} from 'lucide-react';
import {
  ConditionPresentation,
  ConditionEvidenceLink,
  EvidenceItem,
  EvidenceSource,
} from '../../types';
import {
  CONDITION_TYPE_CONFIG,
  CONDITION_STATUS_CONFIG,
} from '../../utils/conditionPathways';
import {
  EVIDENCE_TYPE_CONFIG,
  EVIDENCE_SOURCE_STATUS_CONFIG,
} from '../../utils/evidenceKnowledge';
import { Button } from '../common/Button';

interface ConditionPresentationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  condition: ConditionPresentation | null;
  links: ConditionEvidenceLink[];
  allEvidenceItems: EvidenceItem[];
  allEvidenceSources: EvidenceSource[];
  onEditCondition: (condition: ConditionPresentation) => void;
  onOpenLinkEvidenceModal: (condition: ConditionPresentation) => void;
  onUnlinkEvidence: (linkId: string) => void;
  onSelectEvidenceSource?: (sourceId: string) => void;
}

export const ConditionPresentationDetailModal: React.FC<
  ConditionPresentationDetailModalProps
> = ({
  isOpen,
  onClose,
  condition,
  links,
  allEvidenceItems,
  allEvidenceSources,
  onEditCondition,
  onOpenLinkEvidenceModal,
  onUnlinkEvidence,
  onSelectEvidenceSource,
}) => {
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState<string>('all');
  const [sourceStatusFilter, setSourceStatusFilter] = useState<string>('all');

  if (!isOpen || !condition) return null;

  const typeMeta =
    CONDITION_TYPE_CONFIG[condition.type] || CONDITION_TYPE_CONFIG.other;
  const statusMeta =
    CONDITION_STATUS_CONFIG[condition.status] || CONDITION_STATUS_CONFIG.active;

  // Resolve links -> evidence item -> evidence source
  const resolvedItems = links.map((link) => {
    const item = allEvidenceItems.find((i) => i.id === link.evidenceItemId);
    const source = item
      ? allEvidenceSources.find((s) => s.id === item.sourceId)
      : undefined;
    return {
      link,
      item,
      source,
    };
  });

  // Filter evidence items if requested
  const filteredResolvedItems = resolvedItems.filter(({ item, source }) => {
    if (!item) return true; // keep missing reference visible so user knows
    if (evidenceTypeFilter !== 'all' && source?.evidenceType !== evidenceTypeFilter) {
      return false;
    }
    if (sourceStatusFilter !== 'all' && source?.status !== sourceStatusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="condition-detail-title"
    >
      <div className="bg-[#FAF8F5] w-full max-w-4xl rounded-xl shadow-xl border border-[#E5DFD4] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-[#E8E2D7] bg-[#F7F4EF] flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${typeMeta.badgeClass}`}
              >
                {typeMeta.label}
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
              {condition.bodyRegion && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#EDE8DF] text-[#4A514B] font-medium">
                  {condition.bodyRegion}
                </span>
              )}
              {condition.system && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#EDE8DF] text-[#4A514B] font-medium">
                  {condition.system}
                </span>
              )}
            </div>

            <h2
              id="condition-detail-title"
              className="text-xl sm:text-2xl font-bold text-[#18201C] tracking-tight"
            >
              {condition.name}
            </h2>
            <p className="text-xs text-[#6A716B]">
              Clinical Knowledge Pathway · {links.length} linked evidence item
              {links.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => onEditCondition(condition)}
            >
              Edit Pathway
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6A716B] hover:text-[#18201C] hover:bg-[#EAE4D9] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Pathway Overview Grid */}
          <div className="bg-[#F6F3EB] border border-[#E5DFD4] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4A514B]">
              Pathway Overview
            </h3>

            {condition.description ? (
              <p className="text-sm text-[#242C27] leading-relaxed">
                {condition.description}
              </p>
            ) : (
              <p className="text-sm text-[#79817B] italic">
                No detailed description provided for this pathway.
              </p>
            )}

            {condition.commonTerms && condition.commonTerms.length > 0 && (
              <div className="pt-2 border-t border-[#E8E2D7] flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-[#5B635D] flex items-center gap-1 mr-1">
                  <Tag className="w-3.5 h-3.5" />
                  Synonyms / Common Terms:
                </span>
                {condition.commonTerms.map((term, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#DDD6C9] text-[#2C332F]"
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}

            {condition.notes && (
              <div className="pt-2 border-t border-[#E8E2D7] text-xs text-[#5B635D]">
                <span className="font-semibold text-[#3A413C]">Curator Notes: </span>
                {condition.notes}
              </div>
            )}
          </div>

          {/* Section: Linked Clinical Evidence Items */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#18201C] tracking-tight">
                  Linked Evidence & Treatment Options ({links.length})
                </h3>
                <p className="text-xs text-[#6A716B]">
                  Evidence items organized under this pathway. Review original contexts, recommendation statements, and source status.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => onOpenLinkEvidenceModal(condition)}
                >
                  Link Evidence
                </Button>
              </div>
            </div>

            {/* Quick Neutral Filters if links exist */}
            {links.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-[#F4EFEA] border border-[#E2DBD0] rounded-lg text-xs">
                <span className="font-medium text-[#4A514B]">Filter Evidence:</span>
                <select
                  value={evidenceTypeFilter}
                  onChange={(e) => setEvidenceTypeFilter(e.target.value)}
                  className="px-2 py-1 rounded bg-[#FAF8F5] border border-[#D5CEC2] text-xs text-[#18201C] focus:outline-none"
                >
                  <option value="all">All Evidence Types</option>
                  {(
                    Object.keys(EVIDENCE_TYPE_CONFIG) as (keyof typeof EVIDENCE_TYPE_CONFIG)[]
                  ).map((key) => (
                    <option key={key} value={key}>
                      {EVIDENCE_TYPE_CONFIG[key].label}
                    </option>
                  ))}
                </select>

                <select
                  value={sourceStatusFilter}
                  onChange={(e) => setSourceStatusFilter(e.target.value)}
                  className="px-2 py-1 rounded bg-[#FAF8F5] border border-[#D5CEC2] text-xs text-[#18201C] focus:outline-none"
                >
                  <option value="all">All Source Statuses</option>
                  <option value="current">Current</option>
                  <option value="superseded">Superseded</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="archived">Archived</option>
                </select>

                {(evidenceTypeFilter !== 'all' || sourceStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceTypeFilter('all');
                      setSourceStatusFilter('all');
                    }}
                    className="text-[#1B3B2B] hover:underline font-semibold cursor-pointer ml-auto"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}

            {/* Evidence items list */}
            {links.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#DCD5C9] rounded-xl bg-[#F9F7F3] space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#EAE3D6] text-[#4A514B] flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-[#18201C]">
                  No evidence items linked
                </h4>
                <p className="text-xs text-[#6A716B] max-w-md mx-auto leading-relaxed">
                  No evidence items are currently linked to this condition or presentation in the PhysioCase knowledge base.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => onOpenLinkEvidenceModal(condition)}
                >
                  Link Existing Evidence Item
                </Button>
              </div>
            ) : filteredResolvedItems.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[#DCD5C9] rounded-xl bg-[#F9F7F3] text-xs text-[#6A716B]">
                No linked evidence items match the selected filters.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResolvedItems.map(({ link, item, source }) => {
                  if (!item) {
                    return (
                      <div
                        key={link.id}
                        className="p-4 bg-[#FDF2F2] border border-[#F5C2C2] rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 text-xs text-[#9B2C2C]">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>
                            Linked evidence item reference (ID: {link.evidenceItemId}) no longer exists in the library.
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Unlink className="w-3.5 h-3.5 text-[#9B2C2C]" />}
                          onClick={() => onUnlinkEvidence(link.id)}
                        >
                          Remove Link
                        </Button>
                      </div>
                    );
                  }

                  const typeConfig = source
                    ? EVIDENCE_TYPE_CONFIG[source.evidenceType]
                    : null;
                  const statusConfig = source
                    ? EVIDENCE_SOURCE_STATUS_CONFIG[source.status]
                    : null;
                  const isNonCurrent = source && source.status !== 'current';

                  return (
                    <div
                      key={link.id}
                      className={`p-5 rounded-xl border transition-all ${
                        isNonCurrent
                          ? 'bg-[#FCFBF8] border-[#E8DEC8]'
                          : 'bg-[#FAF8F5] border-[#E5DFD4]'
                      }`}
                    >
                      {/* Item Top Meta */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-[#ECE6DB]">
                        <div className="flex flex-wrap items-center gap-2">
                          {typeConfig && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${typeConfig.badgeClass}`}
                            >
                              {typeConfig.label}
                            </span>
                          )}
                          {statusConfig && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusConfig.badgeClass}`}
                            >
                              Source: {statusConfig.label}
                            </span>
                          )}
                          {source ? (
                            <button
                              type="button"
                              onClick={() =>
                                onSelectEvidenceSource &&
                                onSelectEvidenceSource(source.id)
                              }
                              className="text-xs font-medium text-[#1B3B2B] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>
                                {source.title} ({source.publicationYear})
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-[#9B2C2C] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Parent Source Missing (ID: {item.sourceId})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onUnlinkEvidence(link.id)}
                            className="text-xs text-[#7A827C] hover:text-[#9B2C2C] px-2 py-1 rounded hover:bg-[#F3EDE5] transition-colors cursor-pointer flex items-center gap-1"
                            title="Unlink from this condition pathway"
                          >
                            <Unlink className="w-3 h-3" />
                            <span>Unlink</span>
                          </button>
                        </div>
                      </div>

                      {/* Title & Summary */}
                      <div className="space-y-2 mb-4">
                        <h4 className="text-base font-semibold text-[#18201C]">
                          {item.title}
                        </h4>
                        <p className="text-sm text-[#3E4641] leading-relaxed">
                          {item.summary}
                        </p>
                      </div>

                      {/* Treatment Approach & Recommendation Statement */}
                      {(item.treatmentApproach || item.recommendation) && (
                        <div className="p-3.5 bg-[#F3EFE6] border border-[#DDD5C5] rounded-lg space-y-2 mb-3">
                          {item.treatmentApproach && (
                            <div className="text-xs">
                              <span className="font-semibold text-[#1B3B2B]">
                                Treatment Approach:
                              </span>{' '}
                              <span className="text-[#2C332E]">
                                {item.treatmentApproach}
                              </span>
                            </div>
                          )}
                          {item.recommendation && (
                            <div className="text-xs leading-relaxed">
                              <span className="font-semibold text-[#18201C]">
                                Source Recommendation Statement:
                              </span>{' '}
                              <span className="text-[#3A423D] italic">
                                "{item.recommendation}"
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#555C56]">
                            {item.recommendationStrength && (
                              <span>
                                <strong>Strength:</strong> {item.recommendationStrength}
                              </span>
                            )}
                            {item.evidenceLevel && (
                              <span>
                                <strong>Level:</strong> {item.evidenceLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Clinical Context & Population */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#4F5651] mb-3">
                        {item.population && (
                          <div className="p-2.5 rounded bg-[#FAF8F5] border border-[#E5DFD4]">
                            <span className="font-semibold text-[#2C332E] block mb-0.5">
                              Studied Population:
                            </span>
                            <span>{item.population}</span>
                          </div>
                        )}
                        {item.clinicalContext && (
                          <div className="p-2.5 rounded bg-[#FAF8F5] border border-[#E5DFD4]">
                            <span className="font-semibold text-[#2C332E] block mb-0.5">
                              Clinical Context:
                            </span>
                            <span>{item.clinicalContext}</span>
                          </div>
                        )}
                      </div>

                      {/* Applicability & Limitations */}
                      {(item.applicability || item.limitations) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                          {item.applicability && (
                            <div className="p-2.5 rounded bg-[#EBF3EE] border border-[#CAD8D0] text-[#1B3B2B]">
                              <span className="font-semibold block mb-0.5">
                                Applicability:
                              </span>
                              <span>{item.applicability}</span>
                            </div>
                          )}
                          {item.limitations && (
                            <div className="p-2.5 rounded bg-[#F8F4EA] border border-[#E8DFBE] text-[#4E431E]">
                              <span className="font-semibold block mb-0.5">
                                Limitations:
                              </span>
                              <span>{item.limitations}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Relevance Note if author specified */}
                      {link.relevanceNote && (
                        <div className="p-2.5 rounded bg-[#F4F1EA] border border-[#DFD8CC] text-xs text-[#4A514B]">
                          <span className="font-semibold text-[#18201C]">
                            Pathway Curator Relevance Note:
                          </span>{' '}
                          <span>{link.relevanceNote}</span>
                        </div>
                      )}

                      {/* Non-current source alert banner */}
                      {isNonCurrent && source && (
                        <div className="mt-3 p-2.5 rounded bg-[#FDFBF2] border border-[#ECE2C5] text-xs text-[#6A5A28] flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              This evidence originates from a {source.status} publication. Review superseding literature.
                            </span>
                          </div>
                          {onSelectEvidenceSource && (
                            <button
                              type="button"
                              onClick={() => onSelectEvidenceSource(source.id)}
                              className="font-medium text-[#1B3B2B] hover:underline shrink-0 ml-2 cursor-pointer flex items-center gap-1"
                            >
                              <span>View Source Lineage</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E8E2D7] bg-[#F7F4EF] flex items-center justify-between">
          <p className="text-[11px] text-[#6A716B]">
            PhysioCase Knowledge Pathway · Preserves clinical context and source lineage.
          </p>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
