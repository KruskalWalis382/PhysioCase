import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  FileText,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Layers,
  Archive,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Building,
  Calendar,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useClinical } from '../context/ClinicalContext';
import {
  EvidenceSource,
  EvidenceItem,
  EvidenceType,
  EvidenceSourceStatus,
  ConditionPresentation,
} from '../types';
import {
  EVIDENCE_TYPE_CONFIG,
  EVIDENCE_SOURCE_STATUS_CONFIG,
} from '../utils/evidenceKnowledge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { FilterPill } from '../components/common/FilterPill';
import { ClinicalEmptyState } from '../components/common/ClinicalEmptyState';
import { EditEvidenceSourceModal } from '../components/evidence/EditEvidenceSourceModal';
import { EditEvidenceItemModal } from '../components/evidence/EditEvidenceItemModal';
import { EvidenceSourceDetailModal } from '../components/evidence/EvidenceSourceDetailModal';
import { ConditionPathwaysSection } from '../components/evidence/ConditionPathwaysSection';
import { EditConditionPresentationModal } from '../components/evidence/EditConditionPresentationModal';
import { ConditionPresentationDetailModal } from '../components/evidence/ConditionPresentationDetailModal';
import { LinkEvidenceModal } from '../components/evidence/LinkEvidenceModal';
import { Network } from 'lucide-react';

type ViewMode = 'sources' | 'items' | 'pathways';

export const EvidenceKnowledgeView: React.FC = () => {
  const {
    evidenceSources,
    evidenceItems,
    saveEvidenceSource,
    deleteEvidenceSource,
    saveEvidenceItem,
    deleteEvidenceItem,
    getEvidenceItemsForSource,
    getEvidenceSourceById,
    conditionPresentations,
    conditionEvidenceLinks,
    saveConditionPresentation,
    deleteConditionPresentation,
    linkEvidenceToCondition,
    unlinkEvidenceFromCondition,
    getLinksForCondition,
  } = useClinical();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('sources');

  // Modals state
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<EvidenceSource | null>(null);

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<EvidenceItem | null>(null);
  const [defaultSourceIdForNewItem, setDefaultSourceIdForNewItem] = useState<string | undefined>(undefined);

  const [detailSourceId, setDetailSourceId] = useState<string | null>(null);

  // Stage 4D Pathway Modals state
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [conditionToEdit, setConditionToEdit] = useState<ConditionPresentation | null>(null);

  const [detailConditionId, setDetailConditionId] = useState<string | null>(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [conditionForLinking, setConditionForLinking] = useState<ConditionPresentation | null>(null);

  // Available unique years in sources for filter
  const availableYears = useMemo(() => {
    const rawYears = evidenceSources
      .map((s) => Number(s.publicationYear))
      .filter((y) => typeof y === 'number' && !isNaN(y) && y > 0);
    const uniqueYears = Array.from(new Set(rawYears));
    return uniqueYears.sort((a: number, b: number) => b - a);
  }, [evidenceSources]);

  // Filtered sources
  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return evidenceSources.filter((source) => {
      // Type filter
      if (selectedType !== 'all' && source.evidenceType !== selectedType) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && source.status !== selectedStatus) {
        return false;
      }
      // Year filter
      if (selectedYear !== 'all' && source.publicationYear.toString() !== selectedYear) {
        return false;
      }

      // Search query across source & child items
      if (q) {
        const titleMatch = (source.title || '').toLowerCase().includes(q);
        const orgMatch = (source.organization || '').toLowerCase().includes(q);
        const journalMatch = (source.journalOrPublisher || '').toLowerCase().includes(q);
        const authorsMatch = (source.authors || []).some((a) =>
          a.toLowerCase().includes(q)
        );

        // Check matching child items
        const childItems = evidenceItems.filter((i) => i.sourceId === source.id);
        const itemsMatch = childItems.some(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.summary.toLowerCase().includes(q) ||
            (item.conditionOrPresentation || '').toLowerCase().includes(q) ||
            (item.treatmentApproach || '').toLowerCase().includes(q) ||
            (item.population || '').toLowerCase().includes(q)
        );

        if (!titleMatch && !orgMatch && !journalMatch && !authorsMatch && !itemsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [evidenceSources, evidenceItems, selectedType, selectedStatus, selectedYear, searchQuery]);

  // Filtered items (for 'items' view mode)
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return evidenceItems.filter((item) => {
      const parentSource = getEvidenceSourceById(item.sourceId);

      // Type filter
      if (selectedType !== 'all' && parentSource && parentSource.evidenceType !== selectedType) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && parentSource && parentSource.status !== selectedStatus) {
        return false;
      }
      // Year filter
      if (
        selectedYear !== 'all' &&
        parentSource &&
        parentSource.publicationYear.toString() !== selectedYear
      ) {
        return false;
      }

      if (q) {
        const itemMatch =
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          (item.conditionOrPresentation || '').toLowerCase().includes(q) ||
          (item.treatmentApproach || '').toLowerCase().includes(q) ||
          (item.population || '').toLowerCase().includes(q) ||
          (item.clinicalContext || '').toLowerCase().includes(q);

        const sourceMatch =
          parentSource &&
          (parentSource.title.toLowerCase().includes(q) ||
            (parentSource.organization || '').toLowerCase().includes(q));

        if (!itemMatch && !sourceMatch) {
          return false;
        }
      }

      return true;
    });
  }, [evidenceItems, evidenceSources, selectedType, selectedStatus, selectedYear, searchQuery, getEvidenceSourceById]);

  // Detail source active object
  const activeDetailSource = detailSourceId
    ? getEvidenceSourceById(detailSourceId) || null
    : null;
  const activeDetailItems = activeDetailSource
    ? getEvidenceItemsForSource(activeDetailSource.id)
    : [];

  const handleOpenAddSource = () => {
    setSourceToEdit(null);
    setIsAddSourceModalOpen(true);
  };

  const handleOpenEditSource = (source: EvidenceSource) => {
    setSourceToEdit(source);
    setIsAddSourceModalOpen(true);
  };

  const handleOpenAddItem = (sourceId?: string) => {
    setItemToEdit(null);
    setDefaultSourceIdForNewItem(sourceId);
    setIsAddItemModalOpen(true);
  };

  const handleOpenEditItem = (item: EvidenceItem) => {
    setItemToEdit(item);
    setDefaultSourceIdForNewItem(item.sourceId);
    setIsAddItemModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF8F5] overflow-y-auto">
      {/* Top Banner / Page Header */}
      <header className="px-6 py-6 border-b border-[#E8E2D7] bg-[#F7F4EF]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-[#E2ECE7] text-[#1B3B2B]">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-semibold text-[#18201C] tracking-tight">
                Evidence Knowledge
              </h1>
            </div>
            <p className="text-sm text-[#5B635D]">
              Review and organize clinical evidence with its source, context, applicability, and publication status.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {viewMode === 'pathways' ? (
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setConditionToEdit(null);
                  setIsConditionModalOpen(true);
                }}
              >
                New Pathway
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => handleOpenAddItem()}
                  disabled={evidenceSources.length === 0}
                >
                  Add Item
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenAddSource}
                >
                  Register Source
                </Button>
              </>
            )}
          </div>
        </div>

        {/* View switcher tabs */}
        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={() => setViewMode('pathways')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'pathways'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#EAE4D9] text-[#4A524C] hover:bg-[#E2DBCF]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Condition Pathways ({conditionPresentations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('sources')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'sources'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#EAE4D9] text-[#4A524C] hover:bg-[#E2DBCF]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Evidence Sources ({evidenceSources.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('items')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'items'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#EAE4D9] text-[#4A524C] hover:bg-[#E2DBCF]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Evidence Items ({evidenceItems.length})</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6 space-y-6">
        {/* View Mode: PATHWAYS (Stage 4D) */}
        {viewMode === 'pathways' && (
          <ConditionPathwaysSection
            conditions={conditionPresentations}
            conditionLinks={conditionEvidenceLinks}
            evidenceItems={evidenceItems}
            evidenceSources={evidenceSources}
            onOpenCreateCondition={() => {
              setConditionToEdit(null);
              setIsConditionModalOpen(true);
            }}
            onOpenEditCondition={(condition) => {
              setConditionToEdit(condition);
              setIsConditionModalOpen(true);
            }}
            onSelectCondition={(condition) => {
              setDetailConditionId(condition.id);
            }}
            onOpenLinkEvidenceModal={(condition) => {
              setConditionForLinking(condition);
              setIsLinkModalOpen(true);
            }}
          />
        )}

        {/* Search & Filter Toolbar for Sources and Items */}
        {viewMode !== 'pathways' && (
          <div className="p-4 bg-[#F5F2EB] border border-[#E5DFD4] rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#79817B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, condition, treatment approach, or organization..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-[#FAF8F5] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] placeholder:text-[#8E968F]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#79817B] hover:text-[#18201C]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Evidence Type */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-2 text-xs bg-[#FAF8F5] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] text-[#333A35]"
              >
                <option value="all">All Types</option>
                {Object.entries(EVIDENCE_TYPE_CONFIG).map(([tKey, cfg]) => (
                  <option key={tKey} value={tKey}>
                    {cfg.label}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-2 text-xs bg-[#FAF8F5] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] text-[#333A35]"
              >
                <option value="all">All Statuses</option>
                <option value="current">Current</option>
                <option value="superseded">Superseded</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="archived">Archived</option>
              </select>

              {/* Publication Year */}
              {availableYears.length > 0 && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-[#FAF8F5] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] text-[#333A35]"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr.toString()}>
                      {yr}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Active Filter Indicators */}
          {(selectedType !== 'all' ||
            selectedStatus !== 'all' ||
            selectedYear !== 'all' ||
            searchQuery.trim() !== '') && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#ECE5DA] text-xs text-[#5C645E]">
              <span>Active filters:</span>
              {selectedType !== 'all' && (
                <span className="px-2 py-0.5 rounded bg-[#E4DDD1] text-[#303732] flex items-center gap-1">
                  Type: {EVIDENCE_TYPE_CONFIG[selectedType as EvidenceType]?.label || selectedType}
                  <button
                    type="button"
                    onClick={() => setSelectedType('all')}
                    className="hover:text-black font-semibold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="px-2 py-0.5 rounded bg-[#E4DDD1] text-[#303732] flex items-center gap-1">
                  Status: {selectedStatus}
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('all')}
                    className="hover:text-black font-semibold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedYear !== 'all' && (
                <span className="px-2 py-0.5 rounded bg-[#E4DDD1] text-[#303732] flex items-center gap-1">
                  Year: {selectedYear}
                  <button
                    type="button"
                    onClick={() => setSelectedYear('all')}
                    className="hover:text-black font-semibold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedType('all');
                  setSelectedStatus('all');
                  setSelectedYear('all');
                  setSearchQuery('');
                }}
                className="text-[#1B3B2B] hover:underline font-medium ml-auto"
              >
                Reset all
              </button>
            </div>
          )}
        </div>
        )}

        {/* View Mode: SOURCES */}
        {viewMode === 'sources' && (
          <div className="space-y-4">
            {filteredSources.length === 0 ? (
              <div className="p-12 text-center bg-[#FDFCFA] border border-dashed border-[#DCD5C9] rounded-xl space-y-3">
                <BookOpen className="w-8 h-8 text-[#98A09A] mx-auto" />
                <p className="text-sm font-medium text-[#2E3530]">
                  No evidence sources match the search and filter criteria.
                </p>
                <p className="text-xs text-[#69706A]">
                  Register clinical guidelines, systematic reviews, or trials, or adjust the filter parameters.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedType('all');
                      setSelectedStatus('all');
                      setSelectedYear('all');
                      setSearchQuery('');
                    }}
                  >
                    Clear Search Filters
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSources.map((source) => {
                  const typeCfg =
                    EVIDENCE_TYPE_CONFIG[source.evidenceType] ||
                    EVIDENCE_TYPE_CONFIG.other;
                  const statusCfg =
                    EVIDENCE_SOURCE_STATUS_CONFIG[source.status] ||
                    EVIDENCE_SOURCE_STATUS_CONFIG.current;
                  const childCount = getEvidenceItemsForSource(source.id).length;

                  // Distinct visual styling for non-current status (Section 27)
                  const isSuperseded = source.status === 'superseded';
                  const isWithdrawn = source.status === 'withdrawn';
                  const isArchived = source.status === 'archived';

                  let cardBorderClass = 'border-[#E5DFD4] bg-[#FDFCFA]';
                  if (isSuperseded) {
                    cardBorderClass = 'border-[#E6D4B5] bg-[#FCFBF8]';
                  } else if (isWithdrawn) {
                    cardBorderClass = 'border-[#E6C6C6] bg-[#FCF9F9]';
                  } else if (isArchived) {
                    cardBorderClass = 'border-[#D9D4CC] bg-[#F7F5F0]';
                  }

                  return (
                    <div
                      key={source.id}
                      className={`p-5 rounded-xl border ${cardBorderClass} shadow-xs space-y-4 flex flex-col justify-between hover:border-[#C4BEB2] transition-colors`}
                    >
                      <div className="space-y-3">
                        {/* Status & Type Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${typeCfg.badgeClass}`}
                            >
                              {typeCfg.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${statusCfg.badgeClass}`}
                            >
                              {statusCfg.label}
                            </span>
                            {source.version && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFECE6] text-[#4F5651] border border-[#DCD7CE]">
                                {source.version}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-[#484F49]">
                            {source.publicationYear}
                          </span>
                        </div>

                        {/* Title */}
                        <div>
                          <h2
                            onClick={() => setDetailSourceId(source.id)}
                            className="text-base font-semibold text-[#18201C] hover:text-[#1B3B2B] cursor-pointer leading-snug tracking-tight"
                          >
                            {source.title}
                          </h2>
                          {source.organization && (
                            <p className="text-xs text-[#5D645E] mt-1 flex items-center gap-1">
                              <Building className="w-3 h-3 text-[#79817B]" />
                              {source.organization}
                            </p>
                          )}
                        </div>

                        {/* Supersession Callout if applicable */}
                        {source.supersededBySourceId && (
                          <div className="p-2.5 rounded bg-[#FAF3E6] border border-[#E8D4AE] text-xs text-[#694411] flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Superseded by:{' '}
                              <strong>
                                {getEvidenceSourceById(source.supersededBySourceId)
                                  ?.title || `Source (${source.supersededBySourceId})`}
                              </strong>
                            </span>
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-[#6E756F]">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {childCount} {childCount === 1 ? 'item' : 'items'}
                          </span>
                          {source.lastReviewedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Reviewed {source.lastReviewedAt}
                            </span>
                          )}
                          {source.doi && (
                            <span className="font-mono text-[10px]">
                              DOI: {source.doi}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-[#ECE5DA] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAddItem(source.id)}
                            className="px-2.5 py-1 text-xs text-[#1B3B2B] hover:bg-[#E9F0EC] rounded font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Item
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSource(source)}
                            className="p-1 text-[#656C66] hover:text-[#18201C] hover:bg-[#EAE4D9] rounded transition-colors"
                            title="Edit Source"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete evidence source "${source.title}" and its ${childCount} associated items?`
                                )
                              ) {
                                deleteEvidenceSource(source.id);
                              }
                            }}
                            className="p-1 text-[#8A5B5B] hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Source"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                          onClick={() => setDetailSourceId(source.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View Mode: ALL EVIDENCE ITEMS */}
        {viewMode === 'items' && (
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center bg-[#FDFCFA] border border-dashed border-[#DCD5C9] rounded-xl space-y-3">
                <FileText className="w-8 h-8 text-[#98A09A] mx-auto" />
                <p className="text-sm font-medium text-[#2E3530]">
                  No evidence items match the search and filter criteria.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedType('all');
                      setSelectedStatus('all');
                      setSelectedYear('all');
                      setSearchQuery('');
                    }}
                  >
                    Clear Search Filters
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const parentSource = getEvidenceSourceById(item.sourceId);

                  return (
                    <div
                      key={item.id}
                      className="p-5 bg-[#FDFCFA] border border-[#E5DFD4] rounded-xl space-y-3 shadow-xs"
                    >
                      {/* Source attribution header (Section 18: must never appear detached from source context) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#ECE6DB] text-xs">
                        {parentSource ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#1B3B2B] flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-[#1B3B2B]" />
                              {parentSource.title} ({parentSource.publicationYear})
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] border ${
                                EVIDENCE_SOURCE_STATUS_CONFIG[parentSource.status]
                                  ?.badgeClass || ''
                              }`}
                            >
                              {EVIDENCE_SOURCE_STATUS_CONFIG[parentSource.status]?.label || parentSource.status}
                            </span>
                          </div>
                        ) : (
                          /* Section 31: graceful handling of missing parent source */
                          <div className="flex items-center gap-2 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>
                              Parent Source Missing (ID: <code className="font-mono">{item.sourceId}</code>)
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1 text-[#656C66] hover:text-[#18201C] hover:bg-[#EAE4D9] rounded transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete evidence item "${item.title}"?`)) {
                                deleteEvidenceItem(item.id);
                              }
                            }}
                            className="p-1 text-[#8A5B5B] hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Content */}
                      <div>
                        <h3 className="text-base font-semibold text-[#18201C] leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#3E4540] mt-1.5 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>

                      {/* Parameters Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F8F5F0] rounded-lg border border-[#ECE6DB] text-xs">
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
                              Population:
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

                      {/* Recommendation block if present */}
                      {(item.recommendation ||
                        item.recommendationStrength ||
                        item.evidenceLevel) && (
                        <div className="p-3 bg-[#EBF3EE]/50 border border-[#CFDFD6] rounded-lg text-xs space-y-1">
                          {item.recommendation && (
                            <p className="text-[#254636] italic">
                              "{item.recommendation}"
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                            {item.recommendationStrength && (
                              <span className="font-medium text-[#1B3B2B] bg-[#E2ECE7] px-2 py-0.5 rounded border border-[#B7CEBF]">
                                Strength: {item.recommendationStrength}
                              </span>
                            )}
                            {item.evidenceLevel && (
                              <span className="font-medium text-[#22445E] bg-[#EFF3F6] px-2 py-0.5 rounded border border-[#CFDCE6]">
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
                                Applicability:
                              </span>
                              <p className="text-[#363B37] leading-relaxed">
                                {item.applicability}
                              </p>
                            </div>
                          )}
                          {item.limitations && (
                            <div className="p-2.5 bg-[#FAF7F2] rounded border border-[#ECE6DC]">
                              <span className="font-semibold text-[#525954] block mb-0.5">
                                Limitations:
                              </span>
                              <p className="text-[#363B37] leading-relaxed">
                                {item.limitations}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <EditEvidenceSourceModal
        isOpen={isAddSourceModalOpen}
        onClose={() => {
          setIsAddSourceModalOpen(false);
          setSourceToEdit(null);
        }}
        sourceToEdit={sourceToEdit}
        allSources={evidenceSources}
        onSave={(data) => {
          saveEvidenceSource(data);
        }}
      />

      <EditEvidenceItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => {
          setIsAddItemModalOpen(false);
          setItemToEdit(null);
          setDefaultSourceIdForNewItem(undefined);
        }}
        itemToEdit={itemToEdit}
        defaultSourceId={defaultSourceIdForNewItem}
        allSources={evidenceSources}
        onSave={(data) => {
          saveEvidenceItem(data);
        }}
      />

      <EvidenceSourceDetailModal
        isOpen={Boolean(detailSourceId && activeDetailSource)}
        onClose={() => setDetailSourceId(null)}
        source={activeDetailSource}
        items={activeDetailItems}
        allSources={evidenceSources}
        onEditSource={(source) => {
          setDetailSourceId(null);
          handleOpenEditSource(source);
        }}
        onAddItem={(sourceId) => {
          handleOpenAddItem(sourceId);
        }}
        onEditItem={(item) => {
          handleOpenEditItem(item);
        }}
        onDeleteItem={(itemId) => {
          deleteEvidenceItem(itemId);
        }}
        onSelectOtherSource={(otherId) => {
          setDetailSourceId(otherId);
        }}
      />

      {/* Stage 4D Pathway Modals */}
      <EditConditionPresentationModal
        isOpen={isConditionModalOpen}
        onClose={() => {
          setIsConditionModalOpen(false);
          setConditionToEdit(null);
        }}
        conditionToEdit={conditionToEdit}
        onSave={(data) => {
          saveConditionPresentation(data);
        }}
      />

      {detailConditionId && (
        <ConditionPresentationDetailModal
          isOpen={Boolean(detailConditionId)}
          onClose={() => setDetailConditionId(null)}
          condition={
            conditionPresentations.find((cp) => cp.id === detailConditionId) ||
            null
          }
          links={getLinksForCondition(detailConditionId)}
          allEvidenceItems={evidenceItems}
          allEvidenceSources={evidenceSources}
          onEditCondition={(cond) => {
            setDetailConditionId(null);
            setConditionToEdit(cond);
            setIsConditionModalOpen(true);
          }}
          onOpenLinkEvidenceModal={(cond) => {
            setConditionForLinking(cond);
            setIsLinkModalOpen(true);
          }}
          onUnlinkEvidence={(linkId) => {
            unlinkEvidenceFromCondition(linkId);
          }}
          onSelectEvidenceSource={(sourceId) => {
            setDetailConditionId(null);
            setDetailSourceId(sourceId);
          }}
        />
      )}

      {conditionForLinking && (
        <LinkEvidenceModal
          isOpen={isLinkModalOpen}
          onClose={() => {
            setIsLinkModalOpen(false);
            setConditionForLinking(null);
          }}
          condition={conditionForLinking}
          allEvidenceItems={evidenceItems}
          allEvidenceSources={evidenceSources}
          existingLinks={getLinksForCondition(conditionForLinking.id)}
          onLinkEvidence={(condId, itemId, note) => {
            linkEvidenceToCondition(condId, itemId, note);
          }}
        />
      )}
    </div>
  );
};
