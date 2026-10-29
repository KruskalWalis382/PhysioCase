import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  FolderKanban,
  AlertCircle,
  Activity,
  Sparkles,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  Archive,
  Info,
} from 'lucide-react';
import {
  CaseLongitudinalTab,
  CaseLongitudinalContextViewModel,
  SafetyVerificationStatus,
  AllergySeverity,
} from '../../types';
import { formatClinicalDate } from '../../utils/clinicalFormatters';
import { Button } from '../common/Button';

export interface LongitudinalContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: CaseLongitudinalContextViewModel;
  initialTab?: CaseLongitudinalTab;
  onViewEpisode?: (caseId: string) => void;
}

const TAB_CONFIG: Array<{
  id: CaseLongitudinalTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getCount: (context: CaseLongitudinalContextViewModel) => number;
}> = [
  {
    id: 'safety',
    label: 'Safety & Medical',
    icon: Shield,
    getCount: (ctx) => ctx.counts.safetyAlerts,
  },
  {
    id: 'priorEpisodes',
    label: 'Prior Episodes',
    icon: FolderKanban,
    getCount: (ctx) => ctx.counts.priorEpisodes,
  },
  {
    id: 'historicalProblems',
    label: 'Historical Problems',
    icon: AlertCircle,
    getCount: (ctx) => ctx.counts.historicalProblems,
  },
  {
    id: 'pastOutcomes',
    label: 'Past Outcomes',
    icon: Activity,
    getCount: (ctx) => ctx.counts.pastOutcomes,
  },
  {
    id: 'priorTreatments',
    label: 'Prior Treatments',
    icon: Sparkles,
    getCount: (ctx) => ctx.counts.priorTreatments,
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: Clock,
    getCount: (ctx) => ctx.counts.timelineEvents,
  },
];

// Visual styling helpers
const getVerificationBadge = (status: SafetyVerificationStatus) => {
  switch (status) {
    case 'verified':
      return {
        bg: 'bg-[#E2ECE6] text-[#1B3B2B] border-[#CAD8D0]',
        icon: CheckCircle2,
        label: 'Verified',
      };
    case 'disputed':
      return {
        bg: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]',
        icon: AlertTriangle,
        label: 'Disputed',
      };
    case 'unverified':
    default:
      return {
        bg: 'bg-[#FFF9EB] text-[#854D0E] border-[#FDE68A]',
        icon: HelpCircle,
        label: 'Unverified',
      };
  }
};

const getSeverityBadge = (severity: AllergySeverity) => {
  switch (severity) {
    case 'mild':
      return 'bg-[#F4EFEB] text-[#4A524C] border-[#DDD6CB]';
    case 'moderate':
      return 'bg-[#FFF9EB] text-[#854D0E] border-[#FDE68A]';
    case 'severe':
      return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]';
    case 'life_threatening':
      return 'bg-[#7F1D1D] text-[#FFFFFF] border-[#991B1B] font-bold';
    default:
      return 'bg-[#F4EFEB] text-[#4A524C] border-[#DDD6CB]';
  }
};

export const LongitudinalContextDrawer: React.FC<LongitudinalContextDrawerProps> = ({
  isOpen,
  onClose,
  context,
  initialTab = 'safety',
  onViewEpisode,
}) => {
  const [activeTab, setActiveTab] = useState<CaseLongitudinalTab>(() => initialTab ?? 'safety');

  // Sync activeTab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Keyboard accessibility: Escape key closes drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const { safetyProfile } = context;
  const hasAllergies = safetyProfile.allergies && safetyProfile.allergies.length > 0;
  const hasPrecautions = safetyProfile.persistentPrecautions && safetyProfile.persistentPrecautions.length > 0;
  const hasSurgeries = safetyProfile.surgicalHistory && safetyProfile.surgicalHistory.length > 0;
  const hasConditions = safetyProfile.persistentMedicalConditions && safetyProfile.persistentMedicalConditions.length > 0;
  const hasMobility = !!safetyProfile.enduringMobilityContext;
  const hasAnySafetyInfo = hasAllergies || hasPrecautions || hasSurgeries || hasConditions || hasMobility;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="longitudinal-context-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-end bg-[#141A16]/50 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:max-w-xl md:max-w-2xl bg-[#FAF8F5] border-l border-[#E0D9CE] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header (Fixed/Stable) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E2D8] bg-[#F5F1EB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center shrink-0 border border-[#C5DCD0]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="longitudinal-context-drawer-title"
                className="text-base font-semibold text-[#18201C] tracking-tight"
              >
                Longitudinal Context
              </h2>
              <p className="text-xs text-[#636A64]">
                {context.patient?.fullName || 'Patient'} • Patient history & prior episodes • Excludes current case
              </p>
            </div>
          </div>

          <button
            id="close-longitudinal-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#636A64] hover:text-[#18201C] hover:bg-[#EAE4DB] rounded-lg transition-colors cursor-pointer"
            aria-label="Close longitudinal context drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Tab Navigation (Horizontally scrollable on small screens) */}
        <div
          role="tablist"
          aria-label="Longitudinal context tabs"
          className="flex items-center gap-1 px-4 sm:px-5 pt-2 border-b border-[#E8E2D8] bg-[#FAF8F5] overflow-x-auto shrink-0 scrollbar-none"
        >
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const count = tab.getCount(context);
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`longitudinal-tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isSelected}
                aria-controls={`longitudinal-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
                    : 'border-transparent text-[#636A64] hover:text-[#18201C] hover:border-[#D5CEC2]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1B3B2B]' : 'text-[#7A817B]'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected
                      ? 'bg-[#E2ECE6] text-[#1B3B2B]'
                      : 'bg-[#EAE5DC] text-[#484F4A]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Content Panel (Independently scrollable) */}
        <div
          id={`longitudinal-panel-${activeTab}`}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`longitudinal-tab-${activeTab}`}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 focus:outline-none"
        >
          {/* TAB 1: SAFETY & MEDICAL */}
          {activeTab === 'safety' && (
            <div className="space-y-4">
              {!hasAnySafetyInfo ? (
                <div
                  id="safety-empty-state"
                  className="p-8 rounded-xl bg-[#F8F5EE] border border-[#E3DDD2] text-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAE4D9] text-[#636A64] mx-auto flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D3530]">
                    No persistent safety information has been recorded for this patient.
                  </h3>
                  <p className="text-xs text-[#636A64] max-w-sm mx-auto">
                    No patient-level allergies, precautions, surgical history, or persistent medical conditions have been documented in the patient safety profile.
                  </p>
                </div>
              ) : (
                <>
                  {/* Allergies Group */}
                  {hasAllergies && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#18201C] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
                          Allergies ({safetyProfile.allergies.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {safetyProfile.allergies.map((allergy) => {
                          const vBadge = getVerificationBadge(allergy.verificationStatus);
                          const VIcon = vBadge.icon;
                          return (
                            <div
                              key={allergy.id}
                              className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E0D9CE] space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#18201C]">
                                    {allergy.allergen}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-medium uppercase rounded-full border ${getSeverityBadge(
                                      allergy.severity
                                    )}`}
                                  >
                                    {allergy.severity.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${vBadge.bg}`}
                                >
                                  <VIcon className="w-3 h-3" />
                                  <span>{vBadge.label}</span>
                                </span>
                              </div>
                              <p className="text-xs text-[#484F4A]">
                                <span className="font-medium text-[#2D3530]">Reaction:</span>{' '}
                                {allergy.reactionType}
                              </p>
                              {allergy.clinicalNotes && (
                                <p className="text-xs text-[#636A64] italic">
                                  {allergy.clinicalNotes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Persistent Precautions Group */}
                  {hasPrecautions && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#18201C] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                          Persistent Precautions ({safetyProfile.persistentPrecautions.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {safetyProfile.persistentPrecautions.map((prec) => {
                          const vBadge = getVerificationBadge(prec.verificationStatus);
                          const VIcon = vBadge.icon;
                          return (
                            <div
                              key={prec.id}
                              className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E0D9CE] space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-[#18201C]">
                                    {prec.precaution}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                                    {prec.category.replace(/_/g, ' ')}
                                  </span>
                                  {prec.bodyRegion && (
                                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F3EFEA] text-[#636A64] border border-[#E0D9CE]">
                                      {prec.bodyRegion}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${vBadge.bg}`}
                                >
                                  <VIcon className="w-3 h-3" />
                                  <span>{vBadge.label}</span>
                                </span>
                              </div>
                              {prec.details && (
                                <p className="text-xs text-[#484F4A] leading-relaxed">
                                  {prec.details}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Surgical History Group */}
                  {hasSurgeries && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#18201C] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                          Surgical History ({safetyProfile.surgicalHistory.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {safetyProfile.surgicalHistory.map((surg) => {
                          const vBadge = getVerificationBadge(surg.verificationStatus);
                          const VIcon = vBadge.icon;
                          return (
                            <div
                              key={surg.id}
                              className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E0D9CE] space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-[#18201C]">
                                    {surg.procedure}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                                    {surg.approximateDateOrYear}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F3EFEA] text-[#636A64] border border-[#E0D9CE]">
                                    {surg.bodyRegion}
                                  </span>
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${vBadge.bg}`}
                                >
                                  <VIcon className="w-3 h-3" />
                                  <span>{vBadge.label}</span>
                                </span>
                              </div>
                              {surg.facilityOrSurgeon && (
                                <p className="text-xs text-[#636A64]">
                                  Surgeon/Facility: {surg.facilityOrSurgeon}
                                </p>
                              )}
                              {surg.relevantComplicationsOrNotes && (
                                <p className="text-xs text-[#484F4A] leading-relaxed">
                                  {surg.relevantComplicationsOrNotes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Persistent Medical Conditions Group */}
                  {hasConditions && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#18201C] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#059669]" />
                          Persistent Medical Conditions ({safetyProfile.persistentMedicalConditions.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {safetyProfile.persistentMedicalConditions.map((cond) => {
                          const vBadge = getVerificationBadge(cond.verificationStatus);
                          const VIcon = vBadge.icon;
                          return (
                            <div
                              key={cond.id}
                              className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E0D9CE] space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-[#18201C]">
                                    {cond.conditionName}
                                  </span>
                                  {cond.diagnosedYearOrDate && (
                                    <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                                      {cond.diagnosedYearOrDate}
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                                      cond.isActive
                                        ? 'bg-[#EBF2EE] text-[#1B3B2B] border-[#D5E2DA]'
                                        : 'bg-[#F4EFEB] text-[#636A64] border-[#DDD6CB]'
                                    }`}
                                  >
                                    {cond.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${vBadge.bg}`}
                                >
                                  <VIcon className="w-3 h-3" />
                                  <span>{vBadge.label}</span>
                                </span>
                              </div>
                              <p className="text-xs text-[#484F4A]">
                                <span className="font-medium text-[#2D3530]">Physio Relevance:</span>{' '}
                                {cond.clinicalRelevanceToPhysio}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mobility Context Group */}
                  {hasMobility && safetyProfile.enduringMobilityContext && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#18201C] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                          Enduring Mobility Context
                        </h4>
                      </div>
                      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E0D9CE] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#2D3530]">
                            Baseline Mobility Status
                          </span>
                          {(() => {
                            const vBadge = getVerificationBadge(
                              safetyProfile.enduringMobilityContext.verificationStatus
                            );
                            const VIcon = vBadge.icon;
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${vBadge.bg}`}
                              >
                                <VIcon className="w-3 h-3" />
                                <span>{vBadge.label}</span>
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-[#484F4A]">
                          {safetyProfile.enduringMobilityContext.baselineMobilityStatus}
                        </p>

                        {safetyProfile.enduringMobilityContext.enduringAssistiveDevices.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-[#2D3530] block mb-1">
                              Assistive Devices:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {safetyProfile.enduringMobilityContext.enduringAssistiveDevices.map(
                                (device, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-[11px] rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]"
                                  >
                                    {device}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {safetyProfile.enduringMobilityContext.relevantEnvironmentalBarriers && (
                          <div>
                            <span className="text-xs font-medium text-[#2D3530] block mb-0.5">
                              Environmental Barriers:
                            </span>
                            <p className="text-xs text-[#484F4A]">
                              {safetyProfile.enduringMobilityContext.relevantEnvironmentalBarriers}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: PRIOR EPISODES */}
          {activeTab === 'priorEpisodes' && (
            <div className="space-y-3">
              {context.historicalCases.length === 0 ? (
                <div
                  id="prior-episodes-empty-state"
                  className="p-8 rounded-xl bg-[#F8F5EE] border border-[#E3DDD2] text-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAE4D9] text-[#636A64] mx-auto flex items-center justify-center">
                    <Archive className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D3530]">
                    No prior episodes of care recorded for this patient.
                  </h3>
                  <p className="text-xs text-[#636A64] max-w-sm mx-auto">
                    Only the current case exists, or no prior episodes have been documented.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#636A64]">
                      Prior Episodes of Care ({context.historicalCases.length})
                    </span>
                    <span className="text-[11px] text-[#7A817B]">
                      Excludes active case
                    </span>
                  </div>

                  {context.historicalCases.map((histCase) => {
                    const isDischarged = histCase.status === 'Discharged';
                    return (
                      <div
                        key={histCase.caseId}
                        id={`prior-episode-card-${histCase.displayId}`}
                        className="p-4 rounded-xl bg-[#FAF8F5] border border-[#DFD9CE] hover:border-[#BFB7AA] transition-all duration-150 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-[#18201C] tracking-tight">
                                {histCase.caseName}
                              </h4>
                              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                                {histCase.displayId}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                                  isDischarged
                                    ? 'bg-[#EAE7DF] text-[#555C57] border-[#DDD6CB]'
                                    : 'bg-[#EBF2EE] text-[#1B3B2B] border-[#D5E2DA]'
                                }`}
                              >
                                {histCase.status}
                              </span>
                              {histCase.dischargeReason && (
                                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#E8EFEA] text-[#1B3B2B] border border-[#CFDFD4]">
                                  {histCase.dischargeReason.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>

                            {/* Dates, duration, sessions */}
                            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-[#636A64]">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[#7A817B]" />
                                <span>Opened: {formatClinicalDate(histCase.startDate)}</span>
                              </span>
                              {histCase.dischargeDate && (
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1B3B2B]" />
                                  <span>Discharged: {formatClinicalDate(histCase.dischargeDate)}</span>
                                </span>
                              )}
                              {histCase.durationWeeks !== undefined && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#7A817B]" />
                                  <span>
                                    {histCase.durationWeeks} wk{histCase.durationWeeks === 1 ? '' : 's'}
                                  </span>
                                </span>
                              )}
                              <span>• {histCase.totalSessions} session{histCase.totalSessions === 1 ? '' : 's'}</span>
                            </div>
                          </div>

                          {/* Navigation: View Episode (only if callback provided) */}
                          {onViewEpisode && (
                            <div className="shrink-0 self-end sm:self-start">
                              <Button
                                id={`view-episode-${histCase.displayId}`}
                                variant="secondary"
                                size="sm"
                                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                onClick={() => onViewEpisode(histCase.caseId)}
                                aria-label={`View Episode ${histCase.displayId}`}
                              >
                                View Episode
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Presenting problem if documented */}
                        {histCase.presentingProblem && (
                          <div className="p-2.5 rounded-lg bg-[#EFEAE1] border border-[#DFD8CC] text-xs text-[#484F4A]">
                            <span className="font-semibold text-[#2D3530] mr-1.5">
                              Presenting Problem:
                            </span>
                            <span className="leading-relaxed">{histCase.presentingProblem}</span>
                          </div>
                        )}

                        {/* Clinical status at discharge if documented */}
                        {histCase.dischargeStatusSummary && (
                          <div className="p-2.5 rounded-lg bg-[#EAEFEA] border border-[#D0DFD3] text-xs text-[#1B3B2B]">
                            <span className="font-semibold mr-1.5">
                              Status at Discharge:
                            </span>
                            <span className="leading-relaxed">
                              {histCase.dischargeStatusSummary}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORICAL PROBLEMS */}
          {activeTab === 'historicalProblems' && (
            <div className="space-y-3">
              {context.historicalProblems.length === 0 ? (
                <div
                  id="historical-problems-empty-state"
                  className="p-8 rounded-xl bg-[#F8F5EE] border border-[#E3DDD2] text-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAE4D9] text-[#636A64] mx-auto flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D3530]">
                    No historical clinical problems have been documented in prior episodes.
                  </h3>
                  <p className="text-xs text-[#636A64] max-w-sm mx-auto">
                    No clinical problems from previous episodes of care are on record for this patient.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#636A64]">
                      Historical Clinical Problems ({context.historicalProblems.length})
                    </span>
                    <span className="text-[11px] text-[#7A817B]">
                      Originating from prior episodes of care
                    </span>
                  </div>

                  {context.historicalProblems.map((problem) => (
                    <div
                      key={problem.id}
                      id={`historical-problem-card-${problem.id}`}
                      className="p-4 rounded-xl bg-[#FAF8F5] border border-[#DFD9CE] hover:border-[#BFB7AA] transition-all duration-150 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-[#18201C] tracking-tight">
                              {problem.problemStatement}
                            </h4>
                            <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                              {problem.originatingCaseDisplayId || 'Prior Episode'}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#F3EFEA] text-[#636A64] border border-[#E0D9CE]">
                              {problem.sourceStatus.replace(/_/g, ' ')}
                            </span>
                            {problem.caseStatus && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#EAE7DF] text-[#555C57] border border-[#DDD6CB]">
                                {problem.caseStatus}
                              </span>
                            )}
                          </div>

                          {/* Provenance & metadata row */}
                          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-[#636A64]">
                            <span className="inline-flex items-center gap-1">
                              <FolderKanban className="w-3.5 h-3.5 text-[#7A817B]" />
                              <span>From: {problem.originatingCaseName}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#7A817B]" />
                              <span>Formulated: {formatClinicalDate(problem.formulatedDate)}</span>
                            </span>
                            {problem.linkedFindingCount > 0 && (
                              <span>• {problem.linkedFindingCount} finding{problem.linkedFindingCount === 1 ? '' : 's'}</span>
                            )}
                            {problem.linkedInvestigationCount > 0 && (
                              <span>• {problem.linkedInvestigationCount} investigation{problem.linkedInvestigationCount === 1 ? '' : 's'}</span>
                            )}
                          </div>
                        </div>

                        {/* Navigation: View Episode (only if callback and caseId provided) */}
                        {onViewEpisode && problem.originatingCaseId && (
                          <div className="shrink-0 self-end sm:self-start">
                            <Button
                              id={`view-problem-episode-${problem.id}`}
                              variant="secondary"
                              size="sm"
                              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                              onClick={() => onViewEpisode(problem.originatingCaseId)}
                              aria-label={`View Episode ${problem.originatingCaseDisplayId || problem.originatingCaseName}`}
                            >
                              View Episode
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Therapist Notes if authored */}
                      {problem.therapistNotes && (
                        <div className="p-2.5 rounded-lg bg-[#EFEAE1] border border-[#DFD8CC] text-xs text-[#484F4A]">
                          <span className="font-semibold text-[#2D3530] mr-1.5">Clinical Note:</span>
                          <span className="leading-relaxed">{problem.therapistNotes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PAST OUTCOMES */}
          {activeTab === 'pastOutcomes' && (
            <div className="space-y-3">
              {context.historicalOutcomes.length === 0 ? (
                <div
                  id="past-outcomes-empty-state"
                  className="p-8 rounded-xl bg-[#F8F5EE] border border-[#E3DDD2] text-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAE4D9] text-[#636A64] mx-auto flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D3530]">
                    No historical outcome measurements have been recorded in prior episodes.
                  </h3>
                  <p className="text-xs text-[#636A64] max-w-sm mx-auto">
                    No outcome measurement series or historical progress points are on record from prior episodes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#636A64]">
                      Historical Outcome Measures ({context.historicalOutcomes.length})
                    </span>
                    <span className="text-[11px] text-[#7A817B]">
                      Prior episode measurements
                    </span>
                  </div>

                  {context.historicalOutcomes.map((series) => (
                    <div
                      key={series.seriesKey}
                      id={`historical-outcome-series-${series.seriesKey}`}
                      className="p-4 rounded-xl bg-[#FAF8F5] border border-[#DFD9CE] space-y-3 shadow-2xs"
                    >
                      {/* Series Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EAE3D6]">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#18201C] tracking-tight">
                            {series.measureName}
                          </h4>
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                            {series.category}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-[#F3EFEA] text-[#636A64] border border-[#E0D9CE]">
                            {series.valueType}
                          </span>
                          {series.unit && (
                            <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-[#EFEAE2] text-[#484F4A] border border-[#DFD8CC]">
                              Unit: {series.unit}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#636A64]">
                          {series.points.length} measurement{series.points.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      {/* Episode Buckets */}
                      <div className="space-y-3">
                        {series.episodes.map((ep) => {
                          const hasNumericPoints =
                            series.valueType === 'numeric' &&
                            ep.baselinePoint?.scoreNumeric !== undefined &&
                            ep.latestPoint?.scoreNumeric !== undefined &&
                            ep.points.length > 1;
                          const rawDelta = hasNumericPoints
                            ? ep.latestPoint!.scoreNumeric! - ep.baselinePoint!.scoreNumeric!
                            : null;

                          return (
                            <div
                              key={ep.caseId}
                              className="p-3 rounded-lg bg-[#F8F5EE] border border-[#E0D9CE] space-y-2.5"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                                    {ep.originatingCaseDisplayId || 'Prior Episode'}
                                  </span>
                                  <span className="text-xs font-semibold text-[#2D3530]">
                                    {ep.caseName}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EAE7DF] text-[#555C57] border border-[#DDD6CB]">
                                    {ep.isClosed ? 'Discharged' : 'Active'}
                                  </span>
                                </div>

                                {onViewEpisode && ep.caseId && (
                                  <Button
                                    id={`view-outcome-episode-${ep.caseId}`}
                                    variant="secondary"
                                    size="sm"
                                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                    onClick={() => onViewEpisode(ep.caseId)}
                                    aria-label={`View Episode ${ep.originatingCaseDisplayId || ep.caseName}`}
                                  >
                                    View Episode
                                  </Button>
                                )}
                              </div>

                              {/* Points List */}
                              <div className="space-y-1.5 pt-1">
                                {ep.points.map((pt) => {
                                  const displayValue =
                                    pt.scoreNumeric !== undefined
                                      ? `${pt.scoreNumeric}${pt.unit || series.unit ? ` ${pt.unit || series.unit}` : ''}`
                                      : pt.scoreText || '—';

                                  return (
                                    <div
                                      key={pt.measurementId}
                                      className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-md bg-[#FAF8F5] border border-[#EAE3D6] text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase rounded-sm bg-[#EAE5DC] text-[#484F4A]">
                                          {pt.stage}
                                        </span>
                                        <span className="text-[#636A64]">
                                          {formatClinicalDate(pt.date)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[#18201C] font-mono">
                                          {displayValue}
                                        </span>
                                        {pt.targetValue !== undefined && (
                                          <span className="text-[11px] text-[#636A64]">
                                            (Target: {pt.targetValue}{pt.unit || series.unit ? ` ${pt.unit || series.unit}` : ''})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Raw Mathematical Change (Strictly descriptive, no clinical direction/interpretation) */}
                              {hasNumericPoints && rawDelta !== null && (
                                <div className="flex items-center justify-end pt-1">
                                  <span className="text-xs text-[#484F4A] font-mono">
                                    Change: {rawDelta > 0 ? `+${rawDelta}` : rawDelta}
                                    {series.unit ? ` ${series.unit}` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PRIOR TREATMENTS */}
          {activeTab === 'priorTreatments' && (
            <div className="space-y-3">
              {context.historicalTreatments.length === 0 ? (
                <div
                  id="prior-treatments-empty-state"
                  className="p-8 rounded-xl bg-[#F8F5EE] border border-[#E3DDD2] text-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAE4D9] text-[#636A64] mx-auto flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D3530]">
                    No delivered treatments have been recorded in prior episodes.
                  </h3>
                  <p className="text-xs text-[#636A64] max-w-sm mx-auto">
                    No treatment interventions documented as delivered in previous episodes are on record for this patient.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#636A64]">
                      Historical Delivered Treatments ({context.historicalTreatments.length})
                    </span>
                    <span className="text-[11px] text-[#7A817B]">
                      Delivered interventions from prior episodes
                    </span>
                  </div>

                  {context.historicalTreatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      id={`historical-treatment-card-${treatment.id}`}
                      className="p-4 rounded-xl bg-[#FAF8F5] border border-[#DFD9CE] hover:border-[#BFB7AA] transition-all duration-150 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-[#18201C] tracking-tight">
                              {treatment.treatmentName}
                            </h4>
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                              Delivered
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                              {treatment.category.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Provenance & Session Date */}
                          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-[#636A64]">
                            <span className="inline-flex items-center gap-1">
                              <FolderKanban className="w-3.5 h-3.5 text-[#7A817B]" />
                              <span>From: {treatment.originatingCaseName}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#7A817B]" />
                              <span>Session Date: {formatClinicalDate(treatment.sessionDate)}</span>
                            </span>
                            {treatment.sessionNumber !== undefined && (
                              <span>• Session #{treatment.sessionNumber}</span>
                            )}
                          </div>
                        </div>

                        {/* Navigation: View Episode */}
                        {onViewEpisode && treatment.originatingCaseId && (
                          <div className="shrink-0 self-end sm:self-start">
                            <Button
                              id={`view-treatment-episode-${treatment.id}`}
                              variant="secondary"
                              size="sm"
                              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                              onClick={() => onViewEpisode(treatment.originatingCaseId)}
                              aria-label={`View Episode ${treatment.originatingCaseName}`}
                            >
                              View Episode
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Delivered Parameters / Dosage / Frequency */}
                      {treatment.deliveredParameters && (
                        <p className="text-xs text-[#484F4A]">
                          <span className="font-medium text-[#2D3530]">Parameters:</span>{' '}
                          {treatment.deliveredParameters}
                        </p>
                      )}

                      {/* Documented Tolerance */}
                      {treatment.documentedTolerance && (
                        <p className="text-xs text-[#484F4A]">
                          <span className="font-medium text-[#2D3530]">Documented Tolerance:</span>{' '}
                          <span className="capitalize">
                            {treatment.documentedTolerance.replace(/_/g, ' ')}
                          </span>
                        </p>
                      )}

                      {/* Therapist Notes */}
                      {treatment.therapistNotes && (
                        <div className="p-2.5 rounded-lg bg-[#EFEAE1] border border-[#DFD8CC] text-xs text-[#484F4A]">
                          <span className="font-semibold text-[#2D3530] mr-1.5">Therapist Note:</span>
                          <span className="leading-relaxed">{treatment.therapistNotes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TIMELINE MILESTONES */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {context.timelineEvents.length === 0 ? (
                <div
                  id="timeline-empty-state"
                  className="p-8 rounded-xl bg-[#F8F5EE] border border-[#E3DDD2] text-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAE4D9] text-[#636A64] mx-auto flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D3530]">
                    No historical timeline milestones are available.
                  </h3>
                  <p className="text-xs text-[#636A64] max-w-sm mx-auto">
                    No timeline milestones from previous episodes or patient events have been recorded.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D6]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#636A64]">
                      Longitudinal Timeline ({context.timelineEvents.length})
                    </span>
                    <span className="text-[11px] text-[#7A817B]">
                      Historical milestones across episodes
                    </span>
                  </div>

                  <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E0D9CE]">
                    {context.timelineEvents.map((evt) => (
                      <div
                        key={evt.id}
                        id={`timeline-event-${evt.id}`}
                        className="relative p-3.5 rounded-xl bg-[#FAF8F5] border border-[#DFD9CE] space-y-1.5 shadow-2xs"
                      >
                        {/* Dot on vertical rail */}
                        <div className="absolute -left-[1.35rem] top-4 w-2.5 h-2.5 rounded-full bg-[#1B3B2B] ring-4 ring-[#FAF8F5]" />

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-[#18201C] tracking-tight">
                                {evt.title}
                              </h4>
                              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EAE5DC] text-[#484F4A] border border-[#DDD6CB]">
                                {evt.eventType.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#636A64]">
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-[#7A817B]" />
                                <span>{formatClinicalDate(evt.timestamp)}</span>
                              </span>
                              {evt.caseName && (
                                <span className="inline-flex items-center gap-1">
                                  <FolderKanban className="w-3.5 h-3.5 text-[#7A817B]" />
                                  <span>Episode: {evt.caseName}</span>
                                </span>
                              )}
                              {evt.sourceType && (
                                <span className="text-[11px] text-[#7A817B]">
                                  • {evt.sourceType.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Navigation: View Episode */}
                          {onViewEpisode && evt.caseId && (
                            <div className="shrink-0 self-end sm:self-start">
                              <Button
                                id={`view-timeline-episode-${evt.id}`}
                                variant="secondary"
                                size="sm"
                                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                onClick={() => onViewEpisode(evt.caseId!)}
                                aria-label={`View Episode for ${evt.title}`}
                              >
                                View Episode
                              </Button>
                            </div>
                          )}
                        </div>

                        {evt.summary && (
                          <p className="text-xs text-[#484F4A] leading-relaxed">
                            {evt.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
