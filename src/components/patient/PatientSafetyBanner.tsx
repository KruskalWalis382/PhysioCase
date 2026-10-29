import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit3,
  Check,
  Activity,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { Patient, PatientAllergy, PatientPersistentPrecaution } from '../../types';
import { derivePatientSafetyAlerts } from '../../utils/longitudinalPatientHistory';
import { useClinical } from '../../context/ClinicalContext';
import { formatClinicalDate } from '../../utils/clinicalFormatters';
import { Button } from '../common/Button';

interface PatientSafetyBannerProps {
  patient: Patient;
  onOpenEditModal?: (tab?: 'allergies' | 'precautions' | 'surgeries' | 'conditions' | 'mobility') => void;
  compactDefault?: boolean;
  className?: string;
  id?: string;
}

export const PatientSafetyBanner: React.FC<PatientSafetyBannerProps> = ({
  patient,
  onOpenEditModal,
  compactDefault = false,
  className = '',
  id = 'patient-safety-banner',
}) => {
  const { verifyPatientSafetyItem, settings } = useClinical();
  const practitionerName = settings?.practitionerName || 'Treating Clinician';

  const [isExpanded, setIsExpanded] = useState(!compactDefault);
  const [justVerifiedIds, setJustVerifiedIds] = useState<Set<string>>(new Set());

  const alerts = derivePatientSafetyAlerts(patient);

  const hasAnyRecords =
    alerts.totalAlertCount > 0 || !!alerts.mobilityContext;

  const handleInlineVerify = (
    itemType: 'allergy' | 'precaution' | 'surgery' | 'condition' | 'mobility',
    itemId: string
  ) => {
    verifyPatientSafetyItem(patient.id, itemType, itemId, practitionerName);
    setJustVerifiedIds((prev) => new Set(prev).add(itemId));
    setTimeout(() => {
      setJustVerifiedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 2500);
  };

  // ========================================================
  // STATE A: NO SAFETY INFORMATION RECORDED
  // ========================================================
  if (!hasAnyRecords) {
    return (
      <section
        id={id}
        aria-label="Patient Safety Profile"
        className={`bg-[#F9F7F3] border border-[#E4DED3] rounded-xl p-4 sm:p-4.5 transition-all shadow-xs ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ECE5DA] text-[#4F5751] flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#353D37]">
                  Patient Safety & Persistent Medical Context
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ECE7DE] text-[#636B65]">
                  No records
                </span>
              </div>
              <p className="text-xs text-[#525954] mt-0.5">
                No persistent safety information recorded.
              </p>
              <p className="text-[11px] text-[#7C837D] mt-0.5">
                Absence of recorded items reflects no documented profile; not an absence of clinical risk.
              </p>
            </div>
          </div>

          {onOpenEditModal && (
            <div className="shrink-0 self-end sm:self-center">
              <Button
                id="record-safety-context-btn"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => onOpenEditModal('allergies')}
              >
                Record Safety Context
              </Button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ========================================================
  // STATES B, C, D: WITH PERSISTENT RECORDS
  // ========================================================
  const hasUnverified = alerts.unverifiedCount > 0;
  const hasDisputed = alerts.disputedCount > 0;
  const isAllVerified =
    alerts.totalAlertCount > 0 && !hasUnverified && !hasDisputed;

  // Determine top-level border and tone
  const containerStyle = hasDisputed
    ? 'bg-[#FCFAF8] border-[#E8D1C7]'
    : hasUnverified
    ? 'bg-[#FCFAF7] border-[#EADFCF]'
    : 'bg-[#FAF8F5] border-[#DCE4DE]';

  return (
    <section
      id={id}
      aria-label="Patient Safety Profile"
      className={`rounded-xl border transition-all shadow-xs overflow-hidden ${containerStyle} ${className}`}
    >
      {/* Banner Top Header */}
      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#EAE4DB]">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              hasDisputed
                ? 'bg-[#FBE8E8] text-[#991B1B]'
                : hasUnverified
                ? 'bg-[#FEF3E2] text-[#92400E]'
                : 'bg-[#E3EEE7] text-[#1B3B2B]'
            }`}
          >
            <Shield className="w-4 h-4" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C2420]">
                Patient Safety & Context
              </h3>

              {/* Status summary badges */}
              {isAllVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                  <CheckCircle2 className="w-3 h-3 text-[#1B3B2B]" />
                  <span>All Verified</span>
                </span>
              )}

              {hasUnverified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3E2] text-[#92400E] border border-[#FCD7AD]">
                  <AlertTriangle className="w-3 h-3 text-[#92400E]" />
                  <span>{alerts.unverifiedCount} Unverified</span>
                </span>
              )}

              {hasDisputed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF2F2] text-[#991B1B] border border-[#FCA5A5]">
                  <HelpCircle className="w-3 h-3 text-[#991B1B]" />
                  <span>{alerts.disputedCount} Disputed</span>
                </span>
              )}

              <span className="text-[11px] text-[#6A726C]">
                {alerts.totalAlertCount} item{alerts.totalAlertCount === 1 ? '' : 's'} recorded
              </span>
            </div>

            {alerts.lastReviewedAt && (
              <p className="text-[11px] text-[#636A64] mt-0.5">
                Reviewed {formatClinicalDate(alerts.lastReviewedAt)} by {alerts.lastReviewedBy || 'Clinician'}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {onOpenEditModal && (
            <button
              id="manage-safety-profile-btn"
              type="button"
              onClick={() => onOpenEditModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FFFFFF] border border-[#DDD6CB] text-[#2C342F] hover:bg-[#F5F1EB] transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#555C56]" />
              <span>Manage Profile</span>
            </button>
          )}

          <button
            id="toggle-safety-banner-expand-btn"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-[#555C56] hover:bg-[#EFE9E0] transition-colors cursor-pointer"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse safety details' : 'Expand safety details'}
          >
            <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* COMPACT VIEW (when not expanded) */}
      {!isExpanded && (
        <div className="px-4 py-2.5 bg-[#FAF7F2] flex flex-wrap items-center gap-2 text-xs">
          {alerts.allergies.slice(0, 2).map((a) => (
            <span
              key={a.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                a.verificationStatus === 'disputed'
                  ? 'bg-[#FDF2F2] border-[#F87171] text-[#991B1B]'
                  : a.verificationStatus === 'unverified'
                  ? 'bg-[#FFF9EB] border-[#FDE68A] text-[#854D0E]'
                  : 'bg-[#FFFFFF] border-[#D5E2DA] text-[#1B3B2B]'
              }`}
            >
              <span>Allergy: {a.allergen}</span>
              {a.verificationStatus === 'unverified' && <span className="font-bold">?</span>}
              {a.verificationStatus === 'disputed' && <span className="font-bold">⚠</span>}
            </span>
          ))}

          {alerts.persistentPrecautions.slice(0, 2).map((p) => (
            <span
              key={p.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                p.verificationStatus === 'disputed'
                  ? 'bg-[#FDF2F2] border-[#F87171] text-[#991B1B]'
                  : p.verificationStatus === 'unverified'
                  ? 'bg-[#FFF9EB] border-[#FDE68A] text-[#854D0E]'
                  : 'bg-[#FFFFFF] border-[#D5E2DA] text-[#1B3B2B]'
              }`}
            >
              <span>Precaution: {p.precaution}</span>
              {p.verificationStatus === 'unverified' && <span className="font-bold">?</span>}
              {p.verificationStatus === 'disputed' && <span className="font-bold">⚠</span>}
            </span>
          ))}

          {alerts.surgicalHistory.length > 0 && (
            <span className="text-[11px] text-[#6A726C]">
              • {alerts.surgicalHistory.length} surgery recorded
            </span>
          )}

          {alerts.persistentMedicalConditions.length > 0 && (
            <span className="text-[11px] text-[#6A726C]">
              • {alerts.persistentMedicalConditions.length} medical condition(s)
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-[11px] font-medium text-[#1B3B2B] hover:underline ml-auto cursor-pointer"
          >
            Expand full safety list ({alerts.totalAlertCount}) →
          </button>
        </div>
      )}

      {/* EXPANDED DETAILED VIEW */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 text-xs bg-[#FAF8F5]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. ALLERGIES SECTION */}
            {alerts.hasAllergies && (
              <div className="bg-[#FFFFFF] border border-[#E3DDD2] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#F0EBE2]">
                  <h4 className="text-xs font-bold text-[#1F2722] flex items-center gap-1.5 uppercase tracking-wider">
                    <span>Allergies ({alerts.allergies.length})</span>
                  </h4>
                  {onOpenEditModal && (
                    <button
                      type="button"
                      onClick={() => onOpenEditModal('allergies')}
                      className="text-[11px] text-[#1B3B2B] font-medium hover:underline cursor-pointer"
                    >
                      + Edit
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {alerts.allergies.map((alg) => {
                    const isDisputed = alg.verificationStatus === 'disputed';
                    const isVerified = alg.verificationStatus === 'verified';
                    const wasJustVerified = justVerifiedIds.has(alg.id);

                    return (
                      <div
                        key={alg.id}
                        className={`p-2.5 rounded-lg border text-xs ${
                          isDisputed
                            ? 'bg-[#FDF2F2] border-[#FCA5A5]'
                            : isVerified
                            ? 'bg-[#F9FAF9] border-[#E0E8E3]'
                            : 'bg-[#FFFDF9] border-[#EFE5D5]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-[#18201C]">{alg.allergen}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#F2EDE5] text-[#49504B]">
                                {alg.severity.replace('_', ' ')}
                              </span>

                              {isVerified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {!isVerified && !isDisputed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FFF9EB] text-[#854D0E] border border-[#FDE68A]">
                                  <AlertTriangle className="w-2.5 h-2.5 text-[#854D0E]" />
                                  <span>Unverified</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]">
                                  <HelpCircle className="w-2.5 h-2.5 text-[#991B1B]" />
                                  <span>Disputed</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#4A514B]">Reaction: {alg.reactionType}</p>
                            {alg.clinicalNotes && (
                              <p className="text-[11px] text-[#636A64] italic">{alg.clinicalNotes}</p>
                            )}
                            <div className="text-[10px] text-[#808882] pt-1">
                              Source: {alg.source.replace(/_/g, ' ')} • By {alg.recordedBy}
                            </div>
                          </div>

                          {!isVerified && (
                            <button
                              type="button"
                              onClick={() => handleInlineVerify('allergy', alg.id)}
                              className="px-2 py-1 text-[10px] font-semibold rounded bg-[#EBF2EE] text-[#1B3B2B] hover:bg-[#D8E6DE] transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                              title="Verify this allergy as treating clinician"
                            >
                              {wasJustVerified ? (
                                <>
                                  <Check className="w-3 h-3 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </>
                              ) : (
                                <span>Verify</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. PRECAUTIONS & IMPLANTS SECTION */}
            {alerts.hasPersistentPrecautions && (
              <div className="bg-[#FFFFFF] border border-[#E3DDD2] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#F0EBE2]">
                  <h4 className="text-xs font-bold text-[#1F2722] flex items-center gap-1.5 uppercase tracking-wider">
                    <span>Precautions & Implants ({alerts.persistentPrecautions.length})</span>
                  </h4>
                  {onOpenEditModal && (
                    <button
                      type="button"
                      onClick={() => onOpenEditModal('precautions')}
                      className="text-[11px] text-[#1B3B2B] font-medium hover:underline cursor-pointer"
                    >
                      + Edit
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {alerts.persistentPrecautions.map((prc) => {
                    const isDisputed = prc.verificationStatus === 'disputed';
                    const isVerified = prc.verificationStatus === 'verified';
                    const wasJustVerified = justVerifiedIds.has(prc.id);

                    return (
                      <div
                        key={prc.id}
                        className={`p-2.5 rounded-lg border text-xs ${
                          isDisputed
                            ? 'bg-[#FDF2F2] border-[#FCA5A5]'
                            : isVerified
                            ? 'bg-[#F9FAF9] border-[#E0E8E3]'
                            : 'bg-[#FFFDF9] border-[#EFE5D5]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-[#18201C]">{prc.precaution}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#EBF2EE] text-[#1B3B2B]">
                                {prc.category}
                              </span>
                              {prc.bodyRegion && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#F2EDE5] text-[#555C56]">
                                  {prc.bodyRegion}
                                </span>
                              )}

                              {isVerified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {!isVerified && !isDisputed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FFF9EB] text-[#854D0E] border border-[#FDE68A]">
                                  <AlertTriangle className="w-2.5 h-2.5 text-[#854D0E]" />
                                  <span>Unverified</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]">
                                  <HelpCircle className="w-2.5 h-2.5 text-[#991B1B]" />
                                  <span>Disputed</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#4A514B] leading-relaxed">{prc.details}</p>
                            <div className="text-[10px] text-[#808882] pt-1">
                              Source: {prc.source.replace(/_/g, ' ')} • By {prc.recordedBy}
                            </div>
                          </div>

                          {!isVerified && (
                            <button
                              type="button"
                              onClick={() => handleInlineVerify('precaution', prc.id)}
                              className="px-2 py-1 text-[10px] font-semibold rounded bg-[#EBF2EE] text-[#1B3B2B] hover:bg-[#D8E6DE] transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                              title="Verify this precaution as treating clinician"
                            >
                              {wasJustVerified ? (
                                <>
                                  <Check className="w-3 h-3 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </>
                              ) : (
                                <span>Verify</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. SURGICAL HISTORY SECTION */}
            {alerts.hasSurgicalHistory && (
              <div className="bg-[#FFFFFF] border border-[#E3DDD2] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#F0EBE2]">
                  <h4 className="text-xs font-bold text-[#1F2722] flex items-center gap-1.5 uppercase tracking-wider">
                    <span>Surgical History ({alerts.surgicalHistory.length})</span>
                  </h4>
                  {onOpenEditModal && (
                    <button
                      type="button"
                      onClick={() => onOpenEditModal('surgeries')}
                      className="text-[11px] text-[#1B3B2B] font-medium hover:underline cursor-pointer"
                    >
                      + Edit
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {alerts.surgicalHistory.map((srg) => {
                    const isDisputed = srg.verificationStatus === 'disputed';
                    const isVerified = srg.verificationStatus === 'verified';
                    const wasJustVerified = justVerifiedIds.has(srg.id);

                    return (
                      <div
                        key={srg.id}
                        className={`p-2.5 rounded-lg border text-xs ${
                          isDisputed
                            ? 'bg-[#FDF2F2] border-[#FCA5A5]'
                            : isVerified
                            ? 'bg-[#F9FAF9] border-[#E0E8E3]'
                            : 'bg-[#FFFDF9] border-[#EFE5D5]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-[#18201C]">{srg.procedure}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#EBF2EE] text-[#1B3B2B]">
                                {srg.approximateDateOrYear}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#F2EDE5] text-[#555C56]">
                                {srg.bodyRegion}
                              </span>

                              {isVerified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {!isVerified && !isDisputed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FFF9EB] text-[#854D0E] border border-[#FDE68A]">
                                  <AlertTriangle className="w-2.5 h-2.5 text-[#854D0E]" />
                                  <span>Unverified</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]">
                                  <HelpCircle className="w-2.5 h-2.5 text-[#991B1B]" />
                                  <span>Disputed</span>
                                </span>
                              )}
                            </div>
                            {srg.facilityOrSurgeon && (
                              <p className="text-[11px] text-[#555C56]">Surgeon/Facility: {srg.facilityOrSurgeon}</p>
                            )}
                            {srg.relevantComplicationsOrNotes && (
                              <p className="text-[11px] text-[#4A514B]">{srg.relevantComplicationsOrNotes}</p>
                            )}
                            <div className="text-[10px] text-[#808882] pt-1">
                              Source: {srg.source.replace(/_/g, ' ')} • Recorded by {srg.recordedBy}
                            </div>
                          </div>

                          {!isVerified && (
                            <button
                              type="button"
                              onClick={() => handleInlineVerify('surgery', srg.id)}
                              className="px-2 py-1 text-[10px] font-semibold rounded bg-[#EBF2EE] text-[#1B3B2B] hover:bg-[#D8E6DE] transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                              title="Verify this surgery record"
                            >
                              {wasJustVerified ? (
                                <>
                                  <Check className="w-3 h-3 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </>
                              ) : (
                                <span>Verify</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. MEDICAL CONDITIONS SECTION */}
            {alerts.hasMedicalConditions && (
              <div className="bg-[#FFFFFF] border border-[#E3DDD2] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#F0EBE2]">
                  <h4 className="text-xs font-bold text-[#1F2722] flex items-center gap-1.5 uppercase tracking-wider">
                    <span>Medical Conditions ({alerts.persistentMedicalConditions.length})</span>
                  </h4>
                  {onOpenEditModal && (
                    <button
                      type="button"
                      onClick={() => onOpenEditModal('conditions')}
                      className="text-[11px] text-[#1B3B2B] font-medium hover:underline cursor-pointer"
                    >
                      + Edit
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {alerts.persistentMedicalConditions.map((cnd) => {
                    const isDisputed = cnd.verificationStatus === 'disputed';
                    const isVerified = cnd.verificationStatus === 'verified';
                    const wasJustVerified = justVerifiedIds.has(cnd.id);

                    return (
                      <div
                        key={cnd.id}
                        className={`p-2.5 rounded-lg border text-xs ${
                          isDisputed
                            ? 'bg-[#FDF2F2] border-[#FCA5A5]'
                            : isVerified
                            ? 'bg-[#F9FAF9] border-[#E0E8E3]'
                            : 'bg-[#FFFDF9] border-[#EFE5D5]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-[#18201C]">{cnd.conditionName}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] ${
                                  cnd.isActive ? 'bg-[#EBF2EE] text-[#1B3B2B]' : 'bg-[#F2EDE5] text-[#6A726C]'
                                }`}
                              >
                                {cnd.isActive ? 'Active' : 'Inactive'}
                              </span>

                              {isVerified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {!isVerified && !isDisputed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FFF9EB] text-[#854D0E] border border-[#FDE68A]">
                                  <AlertTriangle className="w-2.5 h-2.5 text-[#854D0E]" />
                                  <span>Unverified</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]">
                                  <HelpCircle className="w-2.5 h-2.5 text-[#991B1B]" />
                                  <span>Disputed</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#4A514B]">
                              Relevance: {cnd.clinicalRelevanceToPhysio}
                            </p>
                            <div className="text-[10px] text-[#808882] pt-1">
                              Source: {cnd.source.replace(/_/g, ' ')} • Recorded by {cnd.recordedBy}
                            </div>
                          </div>

                          {!isVerified && (
                            <button
                              type="button"
                              onClick={() => handleInlineVerify('condition', cnd.id)}
                              className="px-2 py-1 text-[10px] font-semibold rounded bg-[#EBF2EE] text-[#1B3B2B] hover:bg-[#D8E6DE] transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                              title="Verify this medical condition"
                            >
                              {wasJustVerified ? (
                                <>
                                  <Check className="w-3 h-3 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </>
                              ) : (
                                <span>Verify</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. ENDURING MOBILITY CONTEXT */}
          {alerts.mobilityContext && (
            <div className="bg-[#FFFFFF] border border-[#E3DDD2] rounded-xl p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between pb-1 border-b border-[#F0EBE2]">
                <h4 className="text-xs font-bold text-[#1F2722] uppercase tracking-wider">
                  Enduring Mobility & Environmental Context
                </h4>
                {onOpenEditModal && (
                  <button
                    type="button"
                    onClick={() => onOpenEditModal('mobility')}
                    className="text-[11px] text-[#1B3B2B] font-medium hover:underline cursor-pointer"
                  >
                    + Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-medium text-[#6A726C] block">Baseline Mobility</span>
                  <p className="text-[#18201C] font-semibold mt-0.5">
                    {alerts.mobilityContext.baselineMobilityStatus}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-[#6A726C] block">Assistive Devices</span>
                  <p className="text-[#18201C] mt-0.5">
                    {alerts.mobilityContext.enduringAssistiveDevices?.length
                      ? alerts.mobilityContext.enduringAssistiveDevices.join(', ')
                      : 'None recorded'}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-[#6A726C] block">Environmental Barriers</span>
                  <p className="text-[#18201C] mt-0.5">
                    {alerts.mobilityContext.relevantEnvironmentalBarriers || 'None recorded'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Boundary Subtext */}
          <div className="text-[11px] text-[#6E7570] pt-1 flex items-center justify-between">
            <span>
              Longitudinal patient safety context. Case-specific red flags and session findings remain within episode documentation.
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
