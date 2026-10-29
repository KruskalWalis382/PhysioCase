import React, { useState, useMemo } from 'react';
import {
  Network,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Tag,
  Link as LinkIcon,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  BookOpen,
} from 'lucide-react';
import {
  ConditionPresentation,
  ConditionPresentationType,
  ConditionPresentationStatus,
  ConditionEvidenceLink,
  EvidenceItem,
  EvidenceSource,
} from '../../types';
import {
  CONDITION_TYPE_CONFIG,
  CONDITION_STATUS_CONFIG,
  COMMON_BODY_REGIONS,
  COMMON_SYSTEMS,
} from '../../utils/conditionPathways';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ClinicalEmptyState } from '../common/ClinicalEmptyState';

interface ConditionPathwaysSectionProps {
  conditions: ConditionPresentation[];
  conditionLinks: ConditionEvidenceLink[];
  evidenceItems: EvidenceItem[];
  evidenceSources: EvidenceSource[];
  onOpenCreateCondition: () => void;
  onOpenEditCondition: (condition: ConditionPresentation) => void;
  onSelectCondition: (condition: ConditionPresentation) => void;
  onOpenLinkEvidenceModal: (condition: ConditionPresentation) => void;
}

export const ConditionPathwaysSection: React.FC<ConditionPathwaysSectionProps> = ({
  conditions,
  conditionLinks,
  evidenceItems,
  evidenceSources,
  onOpenCreateCondition,
  onOpenEditCondition,
  onSelectCondition,
  onOpenLinkEvidenceModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');

  // Derive unique body regions present in conditions
  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    conditions.forEach((c) => {
      if (c.bodyRegion) regions.add(c.bodyRegion);
    });
    return Array.from(regions).sort();
  }, [conditions]);

  // Derive unique systems present in conditions
  const availableSystems = useMemo(() => {
    const systems = new Set<string>();
    conditions.forEach((c) => {
      if (c.system) systems.add(c.system);
    });
    return Array.from(systems).sort();
  }, [conditions]);

  // Filtered conditions
  const filteredConditions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return conditions.filter((condition) => {
      if (selectedType !== 'all' && condition.type !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'all' && condition.status !== selectedStatus) {
        return false;
      }
      if (selectedRegion !== 'all' && condition.bodyRegion !== selectedRegion) {
        return false;
      }
      if (selectedSystem !== 'all' && condition.system !== selectedSystem) {
        return false;
      }

      if (q) {
        const nameMatch = condition.name.toLowerCase().includes(q);
        const descMatch = (condition.description || '').toLowerCase().includes(q);
        const regionMatch = (condition.bodyRegion || '').toLowerCase().includes(q);
        const systemMatch = (condition.system || '').toLowerCase().includes(q);
        const commonTermsMatch = (condition.commonTerms || []).some((term) =>
          term.toLowerCase().includes(q)
        );

        // Also match linked evidence item titles or approaches
        const links = conditionLinks.filter(
          (l) => l.conditionPresentationId === condition.id
        );
        const linkedItems = evidenceItems.filter((item) =>
          links.some((l) => l.evidenceItemId === item.id)
        );
        const linkedMatch = linkedItems.some(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.treatmentApproach || '').toLowerCase().includes(q)
        );

        if (
          !nameMatch &&
          !descMatch &&
          !regionMatch &&
          !systemMatch &&
          !commonTermsMatch &&
          !linkedMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    conditions,
    conditionLinks,
    evidenceItems,
    searchQuery,
    selectedType,
    selectedStatus,
    selectedRegion,
    selectedSystem,
  ]);

  const hasActiveFilters =
    selectedType !== 'all' ||
    selectedStatus !== 'all' ||
    selectedRegion !== 'all' ||
    selectedSystem !== 'all' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedRegion('all');
    setSelectedSystem('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5">
      {/* Search & Multi-Attribute Filter Toolbar */}
      <div className="p-4 bg-[#F5F2EB] border border-[#E5DFD4] rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#79817B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pathways by name, common terms, body region, or system..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#FAF8F5] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] text-[#333A35]"
            >
              <option value="all">All Classifications</option>
              {(
                Object.keys(CONDITION_TYPE_CONFIG) as ConditionPresentationType[]
              ).map((key) => (
                <option key={key} value={key}>
                  {CONDITION_TYPE_CONFIG[key].label}
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
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>

            {/* Region */}
            {availableRegions.length > 0 && (
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-2.5 py-2 text-xs bg-[#FAF8F5] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] text-[#333A35]"
              >
                <option value="all">All Body Regions</option>
                {availableRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            )}

            {/* System */}
            {availableSystems.length > 0 && (
              <select
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value)}
                className="px-2.5 py-2 text-xs bg-[#FAF8F5] border border-[#D9D3C7] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] text-[#333A35]"
              >
                <option value="all">All Systems</option>
                {availableSystems.map((sys) => (
                  <option key={sys} value={sys}>
                    {sys}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#ECE5DA] text-xs text-[#5C645E]">
            <span>Active filters:</span>
            {selectedType !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-[#E4DDD1] text-[#303732] flex items-center gap-1">
                Type:{' '}
                {CONDITION_TYPE_CONFIG[
                  selectedType as ConditionPresentationType
                ]?.label || selectedType}
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
            {selectedRegion !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-[#E4DDD1] text-[#303732] flex items-center gap-1">
                Region: {selectedRegion}
                <button
                  type="button"
                  onClick={() => setSelectedRegion('all')}
                  className="hover:text-black font-semibold ml-0.5"
                >
                  ×
                </button>
              </span>
            )}
            {selectedSystem !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-[#E4DDD1] text-[#303732] flex items-center gap-1">
                System: {selectedSystem}
                <button
                  type="button"
                  onClick={() => setSelectedSystem('all')}
                  className="hover:text-black font-semibold ml-0.5"
                >
                  ×
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[#1B3B2B] hover:underline font-medium ml-auto cursor-pointer"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Pathways List / Cards */}
      {conditions.length === 0 ? (
        <ClinicalEmptyState
          id="empty-condition-pathways"
          icon={<Network className="w-7 h-7" />}
          title="No Condition Pathways Created"
          supportingText="Organize clinical guidelines, systematic reviews, and trial evidence under recognizable physiotherapy conditions or clinical presentation patterns."
          primaryActionLabel="Create First Pathway"
          onPrimaryAction={onOpenCreateCondition}
        />
      ) : filteredConditions.length === 0 ? (
        <div className="p-12 text-center bg-[#FDFCFA] border border-dashed border-[#DCD5C9] rounded-xl space-y-3">
          <Network className="w-8 h-8 text-[#98A09A] mx-auto" />
          <p className="text-sm font-medium text-[#2E3530]">
            No condition or presentation pathways match the current search filters.
          </p>
          <p className="text-xs text-[#69706A]">
            Try adjusting your search query or clearing active filters.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredConditions.map((condition) => {
            const typeCfg =
              CONDITION_TYPE_CONFIG[condition.type] ||
              CONDITION_TYPE_CONFIG.other;
            const statusCfg =
              CONDITION_STATUS_CONFIG[condition.status] ||
              CONDITION_STATUS_CONFIG.active;

            const links = conditionLinks.filter(
              (l) => l.conditionPresentationId === condition.id
            );
            const linkedEvidenceCount = links.length;

            return (
              <div
                key={condition.id}
                className="p-5 rounded-xl border border-[#E5DFD4] bg-[#FAF8F5] hover:border-[#D5CEC2] transition-all flex flex-col justify-between shadow-xs space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeCfg.badgeClass}`}
                      >
                        {typeCfg.label}
                      </span>
                      {condition.status === 'archived' && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.badgeClass}`}
                        >
                          {statusCfg.label}
                        </span>
                      )}
                      {condition.bodyRegion && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-[#EDE8DF] text-[#4A514B]">
                          {condition.bodyRegion}
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-[#1B3B2B] bg-[#E2ECE7] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {linkedEvidenceCount} linked evidence item
                      {linkedEvidenceCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Name & Description */}
                  <div className="space-y-1.5">
                    <h3
                      onClick={() => onSelectCondition(condition)}
                      className="text-base font-semibold text-[#18201C] hover:text-[#1B3B2B] transition-colors cursor-pointer"
                    >
                      {condition.name}
                    </h3>
                    {condition.description ? (
                      <p className="text-xs text-[#5B635D] line-clamp-2 leading-relaxed">
                        {condition.description}
                      </p>
                    ) : (
                      <p className="text-xs text-[#848B85] italic">
                        No description provided.
                      </p>
                    )}
                  </div>

                  {/* Common terms chips */}
                  {condition.commonTerms && condition.commonTerms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <Tag className="w-3 h-3 text-[#79817B] mr-0.5" />
                      {condition.commonTerms.slice(0, 3).map((term, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-1.5 py-0.2 rounded bg-[#EDE7DD] text-[#3D443F]"
                        >
                          {term}
                        </span>
                      ))}
                      {condition.commonTerms.length > 3 && (
                        <span className="text-[10px] text-[#79817B]">
                          +{condition.commonTerms.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-[#ECE6DB] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => onOpenEditCondition(condition)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<LinkIcon className="w-3.5 h-3.5" />}
                      onClick={() => onOpenLinkEvidenceModal(condition)}
                    >
                      Link
                    </Button>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => onSelectCondition(condition)}
                  >
                    View Pathway
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
