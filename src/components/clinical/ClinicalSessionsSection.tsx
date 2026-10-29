import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Activity,
  Layers,
  AlertTriangle,
  User,
  Check,
  ArrowRight,
  Info,
  Dumbbell,
  ShieldCheck,
  Stethoscope,
  ListTodo,
  Copy,
} from 'lucide-react';
import {
  ClinicalSession,
  ClinicalSessionStatus,
  SessionToleranceRating,
  SessionTreatmentDelivery,
  DeliveryExecutionStatus,
  TreatmentModificationType,
  TreatmentSelection,
  TreatmentDosage,
} from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { Button } from '../common/Button';
import {
  CLINICAL_SESSION_STATUS_CONFIG,
  SESSION_TOLERANCE_CONFIG,
  DELIVERY_EXECUTION_STATUS_CONFIG,
  TREATMENT_MODIFICATION_TYPE_CONFIG,
} from '../../utils/clinicalSessions';
import { TREATMENT_INTERVENTION_TYPE_CONFIG } from '../../utils/treatmentPlans';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface ClinicalSessionsSectionProps {
  caseId: string;
  patientId: string;
}

export const ClinicalSessionsSection: React.FC<ClinicalSessionsSectionProps> = ({
  caseId,
  patientId,
}) => {
  const {
    getSessionsForCase,
    getDeliveriesForSession,
    saveClinicalSession,
    updateClinicalSessionStatus,
    deleteClinicalSession,
    saveSessionTreatmentDelivery,
    deleteSessionTreatmentDelivery,
    getTreatmentSelectionsForCase,
    cases,
  } = useClinical();

  const currentCase = cases?.find((c) => c.id === caseId);
  const isCaseArchived = currentCase?.isArchived === true;

  // Queries
  const sessions = getSessionsForCase(caseId);
  const plannedSelections = getTreatmentSelectionsForCase(caseId);

  // Expanded cards state
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>(() => {
    // Expand the most recent session by default if available
    const initial: Record<string, boolean> = {};
    if (sessions.length > 0) {
      initial[sessions[0].id] = true;
    }
    return initial;
  });

  const toggleExpandSession = (sessionId: string) => {
    setExpandedSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  // ==========================================
  // MODAL STATE: Create / Edit Session
  // ==========================================
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClinicalSession | null>(null);

  // Form fields for Session
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sessionStatus, setSessionStatus] = useState<ClinicalSessionStatus>('completed');
  const [overallTolerance, setOverallTolerance] = useState<SessionToleranceRating>('well_tolerated');
  const [patientSubjectiveResponse, setPatientSubjectiveResponse] = useState('');
  const [therapistSessionNotes, setTherapistSessionNotes] = useState('');
  const [immediateObservations, setImmediateObservations] = useState('');
  const [modificationsSummary, setModificationsSummary] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Narrative recall state (ephemeral, local draft only)
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [showNarrativeRecallNotice, setShowNarrativeRecallNotice] = useState(false);

  // Identify most recent eligible previous session for the CURRENT case only
  const eligiblePreviousSession = useMemo(() => {
    if (isCaseArchived) return null;
    if (editingSession) {
      return (
        sessions.find(
          (s) =>
            s.caseId === caseId &&
            s.id !== editingSession.id &&
            (s.sessionNumber < editingSession.sessionNumber ||
              new Date(s.sessionDate).getTime() < new Date(editingSession.sessionDate).getTime()) &&
            !!s.therapistSessionNotes?.trim()
        ) || null
      );
    }
    return (
      sessions.find(
        (s) => s.caseId === caseId && !!s.therapistSessionNotes?.trim()
      ) || null
    );
  }, [sessions, caseId, editingSession, isCaseArchived]);

  const handleCopyPreviousNotes = () => {
    if (!eligiblePreviousSession?.therapistSessionNotes?.trim()) return;

    if (therapistSessionNotes.trim().length > 0) {
      setShowRecallConfirm(true);
    } else {
      setTherapistSessionNotes(eligiblePreviousSession.therapistSessionNotes);
      setShowNarrativeRecallNotice(true);
    }
  };

  const handleConfirmReplaceNotes = () => {
    if (eligiblePreviousSession?.therapistSessionNotes) {
      setTherapistSessionNotes(eligiblePreviousSession.therapistSessionNotes);
      setShowNarrativeRecallNotice(true);
    }
    setShowRecallConfirm(false);
  };

  const handleCancelReplaceNotes = () => {
    setShowRecallConfirm(false);
  };

  // Selected treatment selections to deliver in this encounter
  const [selectedPlanIdsToDeliver, setSelectedPlanIdsToDeliver] = useState<string[]>([]);

  // Open Create Session Modal
  const handleOpenCreateSession = () => {
    if (isCaseArchived) return;
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    setEditingSession(null);
    setSessionDate(isoDate);
    setStartTime(`${hours}:${minutes}`);
    setEndTime('');
    setSessionStatus('completed');
    setOverallTolerance('well_tolerated');
    setPatientSubjectiveResponse('');
    setTherapistSessionNotes('');
    setImmediateObservations('');
    setModificationsSummary('');
    setShowRecallConfirm(false);
    setShowNarrativeRecallNotice(false);
    // Pre-select active planned interventions so therapist can document what was delivered
    const activePlanIds = plannedSelections
      .filter((s) => s.status === 'active' || s.status === 'planned')
      .map((s) => s.id);
    setSelectedPlanIdsToDeliver(activePlanIds);
    setFormError(null);
    setIsSessionModalOpen(true);
  };

  // Open Edit Session Modal
  const handleOpenEditSession = (session: ClinicalSession) => {
    if (isCaseArchived) return;
    setEditingSession(session);
    setSessionDate(session.sessionDate);
    setStartTime(session.startTime || '');
    setEndTime(session.endTime || '');
    setSessionStatus(session.status);
    setOverallTolerance(session.overallTolerance);
    setPatientSubjectiveResponse(session.patientSubjectiveResponse || '');
    setTherapistSessionNotes(session.therapistSessionNotes || '');
    setImmediateObservations(session.immediateObservations || '');
    setModificationsSummary(session.modificationsSummary || '');
    setShowRecallConfirm(false);
    setShowNarrativeRecallNotice(false);
    setSelectedPlanIdsToDeliver([]); // When editing existing session, deliveries are edited via their own controls
    setFormError(null);
    setIsSessionModalOpen(true);
  };

  // Save Session
  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionDate) {
      setFormError('Session date is required.');
      return;
    }

    try {
      const saved = saveClinicalSession({
        id: editingSession ? editingSession.id : undefined,
        caseId,
        patientId,
        sessionDate,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        status: sessionStatus,
        overallTolerance,
        patientSubjectiveResponse,
        therapistSessionNotes,
        immediateObservations,
        modificationsSummary,
      });

      // If new session and user selected planned treatments, auto-seed deliveries linked to selections
      if (!editingSession && selectedPlanIdsToDeliver.length > 0) {
        selectedPlanIdsToDeliver.forEach((selId) => {
          const sel = plannedSelections.find((s) => s.id === selId);
          if (sel) {
            saveSessionTreatmentDelivery({
              sessionId: saved.id,
              caseId,
              patientId,
              treatmentSelectionId: sel.id,
              title: sel.title,
              interventionType: sel.interventionType,
              actualDosage: sel.dosage ? { ...sel.dosage } : undefined,
              deliveryStatus: 'completed_as_planned',
              modificationType: 'none',
              modificationReason: '',
              therapistExecutionNotes: '',
              immediateResponse: '',
            });
          }
        });
      }

      setIsSessionModalOpen(false);
      // Auto expand newly saved session
      setExpandedSessionIds((prev) => ({ ...prev, [saved.id]: true }));
    } catch (err: any) {
      setFormError(err.message || 'Failed to save clinical session.');
    }
  };

  // Delete Session
  const handleDeleteSession = (sessionId: string, sessionNumber: number) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Session #${sessionNumber}? This will remove all associated treatment delivery records for this encounter. Planned treatment selections will not be deleted.`
    );
    if (confirmDelete) {
      deleteClinicalSession(sessionId);
    }
  };

  // ==========================================
  // MODAL STATE: Add / Edit Treatment Delivery
  // ==========================================
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [activeSessionForDelivery, setActiveSessionForDelivery] = useState<ClinicalSession | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<SessionTreatmentDelivery | null>(null);

  // Form fields for Treatment Delivery
  const [deliverySelectionId, setDeliverySelectionId] = useState<string>('custom');
  const [deliveryTitle, setDeliveryTitle] = useState('');
  const [deliveryInterventionType, setDeliveryInterventionType] = useState<string>('therapeutic_exercise');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryExecutionStatus>('completed_as_planned');
  const [modificationType, setModificationType] = useState<TreatmentModificationType>('none');
  const [modificationReason, setModificationReason] = useState('');
  const [actualDurationMinutes, setActualDurationMinutes] = useState<string>('');
  const [therapistExecutionNotes, setTherapistExecutionNotes] = useState('');
  const [immediateResponse, setImmediateResponse] = useState('');

  // Actual Dosage fields
  const [hasDosage, setHasDosage] = useState(false);
  const [dosageFrequency, setDosageFrequency] = useState('');
  const [dosageIntensity, setDosageIntensity] = useState('');
  const [dosageSets, setDosageSets] = useState('');
  const [dosageReps, setDosageReps] = useState('');
  const [dosageHoldTime, setDosageHoldTime] = useState('');
  const [dosageRestPeriod, setDosageRestPeriod] = useState('');
  const [dosageNotes, setDosageNotes] = useState('');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Open Add Delivery Modal
  const handleOpenAddDelivery = (session: ClinicalSession) => {
    setActiveSessionForDelivery(session);
    setEditingDelivery(null);
    setDeliverySelectionId('custom');
    setDeliveryTitle('');
    setDeliveryInterventionType('therapeutic_exercise');
    setDeliveryStatus('completed_as_planned');
    setModificationType('none');
    setModificationReason('');
    setActualDurationMinutes('');
    setTherapistExecutionNotes('');
    setImmediateResponse('');
    setHasDosage(false);
    setDosageFrequency('');
    setDosageIntensity('');
    setDosageSets('');
    setDosageReps('');
    setDosageHoldTime('');
    setDosageRestPeriod('');
    setDosageNotes('');
    setDeliveryError(null);
    setIsDeliveryModalOpen(true);
  };

  // Open Edit Delivery Modal
  const handleOpenEditDelivery = (session: ClinicalSession, delivery: SessionTreatmentDelivery) => {
    setActiveSessionForDelivery(session);
    setEditingDelivery(delivery);
    setDeliverySelectionId(delivery.treatmentSelectionId || 'custom');
    setDeliveryTitle(delivery.title);
    setDeliveryInterventionType(delivery.interventionType);
    setDeliveryStatus(delivery.deliveryStatus);
    setModificationType(delivery.modificationType || 'none');
    setModificationReason(delivery.modificationReason || '');
    setActualDurationMinutes(delivery.actualDurationMinutes ? String(delivery.actualDurationMinutes) : '');
    setTherapistExecutionNotes(delivery.therapistExecutionNotes || '');
    setImmediateResponse(delivery.immediateResponse || '');

    if (delivery.actualDosage) {
      setHasDosage(true);
      setDosageFrequency(delivery.actualDosage.frequency || '');
      setDosageIntensity(delivery.actualDosage.intensity || '');
      setDosageSets(delivery.actualDosage.sets !== undefined ? String(delivery.actualDosage.sets) : '');
      setDosageReps(delivery.actualDosage.reps !== undefined ? String(delivery.actualDosage.reps) : '');
      setDosageHoldTime(delivery.actualDosage.holdTime || '');
      setDosageRestPeriod(delivery.actualDosage.restPeriod || '');
      setDosageNotes(delivery.actualDosage.notes || '');
    } else {
      setHasDosage(false);
      setDosageFrequency('');
      setDosageIntensity('');
      setDosageSets('');
      setDosageReps('');
      setDosageHoldTime('');
      setDosageRestPeriod('');
      setDosageNotes('');
    }

    setDeliveryError(null);
    setIsDeliveryModalOpen(true);
  };

  // When therapist selects an existing planned treatment selection from dropdown
  const handleSelectPrescriptionToDeliver = (selectionId: string) => {
    setDeliverySelectionId(selectionId);
    if (selectionId === 'custom') {
      return;
    }
    const sel = plannedSelections.find((s) => s.id === selectionId);
    if (sel) {
      setDeliveryTitle(sel.title);
      setDeliveryInterventionType(sel.interventionType);
      if (sel.dosage) {
        setHasDosage(true);
        setDosageFrequency(sel.dosage.frequency || '');
        setDosageIntensity(sel.dosage.intensity || '');
        setDosageSets(sel.dosage.sets !== undefined ? String(sel.dosage.sets) : '');
        setDosageReps(sel.dosage.reps !== undefined ? String(sel.dosage.reps) : '');
        setDosageHoldTime(sel.dosage.holdTime || '');
        setDosageRestPeriod(sel.dosage.restPeriod || '');
        setDosageNotes(sel.dosage.notes || '');
      }
    }
  };

  // Save Delivery
  const handleSaveDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionForDelivery) return;

    if (!deliveryTitle.trim()) {
      setDeliveryError('Intervention title is required.');
      return;
    }

    let actualDosageObj: TreatmentDosage | undefined = undefined;
    if (hasDosage) {
      actualDosageObj = {
        frequency: dosageFrequency.trim() || undefined,
        intensity: dosageIntensity.trim() || undefined,
        sets: dosageSets ? parseInt(dosageSets, 10) : undefined,
        reps: dosageReps ? parseInt(dosageReps, 10) : undefined,
        holdTime: dosageHoldTime.trim() || undefined,
        restPeriod: dosageRestPeriod.trim() || undefined,
        notes: dosageNotes.trim() || undefined,
      };
    }

    try {
      saveSessionTreatmentDelivery({
        id: editingDelivery ? editingDelivery.id : undefined,
        sessionId: activeSessionForDelivery.id,
        caseId,
        patientId,
        treatmentSelectionId:
          deliverySelectionId !== 'custom' ? deliverySelectionId : undefined,
        title: deliveryTitle.trim(),
        interventionType: deliveryInterventionType as any,
        actualDosage: actualDosageObj,
        actualDurationMinutes: actualDurationMinutes ? parseInt(actualDurationMinutes, 10) : undefined,
        deliveryStatus,
        modificationType,
        modificationReason: modificationReason.trim() || undefined,
        therapistExecutionNotes: therapistExecutionNotes.trim() || undefined,
        immediateResponse: immediateResponse.trim() || undefined,
      });

      setIsDeliveryModalOpen(false);
    } catch (err: any) {
      setDeliveryError(err.message || 'Failed to save treatment delivery record.');
    }
  };

  // Delete Delivery
  const handleDeleteDelivery = (deliveryId: string) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to remove this delivery record from this encounter?'
    );
    if (confirmDelete) {
      deleteSessionTreatmentDelivery(deliveryId);
    }
  };

  return (
    <div
      id="section-clinical-sessions"
      className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE4DB]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF2EE] text-[#1B3B2B] flex items-center justify-center shrink-0 border border-[#D5E2DA]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#18201C] tracking-tight">
                Stage 5: Clinical Sessions
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                {sessions.length} {sessions.length === 1 ? 'Encounter' : 'Encounters'}
              </span>
            </div>
            <p className="text-xs text-[#636A64] mt-0.5">
              Record what was actually delivered during treatment encounters, tracking modifications and immediate patient tolerance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="record-new-session-btn"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateSession}
          >
            Record Clinical Session
          </Button>
        </div>
      </div>

      {/* Planned vs Actual Notice Banner */}
      <div className="bg-[#F5F2EC] border border-[#E4DDD3] rounded-lg p-3.5 flex items-start gap-3 text-xs text-[#525954]">
        <ShieldCheck className="w-4 h-4 text-[#1B3B2B] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-[#18201C]">
            Planned Prescription vs. Actual Delivery Separation
          </span>
          <p className="leading-relaxed">
            Interventions documented in a clinical session reflect execution and real-world tolerance for that encounter. The original treatment plan prescription in Stage 4E remains preserved.
          </p>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div
          id="clinical-sessions-empty-state"
          className="text-center py-10 px-4 border-2 border-dashed border-[#E3DDD2] rounded-xl bg-[#FAF8F5] space-y-3"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-[#EAE5DC] text-[#555C56] flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#18201C]">No Clinical Sessions Recorded</h4>
            <p className="text-xs text-[#6B726C] max-w-md mx-auto leading-relaxed">
              Begin documenting encounters for this episode. You can link active treatment selections, log modifications, and record immediate patient tolerance.
            </p>
          </div>
          <Button
            id="empty-state-record-session-btn"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateSession}
          >
            Record First Session
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isExpanded = !!expandedSessionIds[session.id];
            const deliveries = getDeliveriesForSession(session.id);
            const statusConfig =
              CLINICAL_SESSION_STATUS_CONFIG[session.status] ||
              CLINICAL_SESSION_STATUS_CONFIG.completed;
            const toleranceConfig =
              SESSION_TOLERANCE_CONFIG[session.overallTolerance] ||
              SESSION_TOLERANCE_CONFIG.well_tolerated;

            return (
              <div
                key={session.id}
                id={`session-card-${session.id}`}
                className="bg-[#FFFFFF] border border-[#E3DDD2] rounded-xl overflow-hidden shadow-2xs transition-all hover:border-[#D5CDC1]"
              >
                {/* Session Header Strip */}
                <div
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-[#FDFCFB] hover:bg-[#F9F7F3] transition-colors"
                  onClick={() => toggleExpandSession(session.id)}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#EBF2EE] text-[#1B3B2B] flex flex-col items-center justify-center font-semibold text-xs border border-[#CAD8D0] shrink-0">
                      <span className="text-[9px] uppercase tracking-wider font-mono">Sess</span>
                      <span>#{session.sessionNumber}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#18201C]">
                          Session {session.sessionNumber} — {formatClinicalDate(session.sessionDate)}
                        </span>
                        {session.startTime && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6A716B]">
                            <Clock className="w-3 h-3" />
                            {session.startTime}
                            {session.endTime ? ` - ${session.endTime}` : ''}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#636A64]">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${toleranceConfig.badgeClass}`}
                        >
                          {toleranceConfig.label}
                        </span>
                        <span>•</span>
                        <span>
                          {deliveries.length}{' '}
                          {deliveries.length === 1 ? 'Intervention Delivered' : 'Interventions Delivered'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 self-end sm:self-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      id={`edit-session-btn-${session.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditSession(session)}
                      aria-label="Edit Session Information"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      id={`delete-session-btn-${session.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id, session.sessionNumber)}
                      className="text-[#931D1D] hover:text-[#7A1616] hover:bg-[#FDF0F0]"
                      aria-label="Delete Session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <button
                      type="button"
                      onClick={() => toggleExpandSession(session.id)}
                      className="p-1.5 text-[#636A64] hover:text-[#18201C] rounded-lg hover:bg-[#EAE5DC] transition-colors"
                      aria-label={isExpanded ? 'Collapse session details' : 'Expand session details'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Session Expanded Body */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 border-t border-[#EAE4DB] bg-[#FFFFFF] space-y-6">
                    {/* Clinical Narrative & Observations Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Patient Pre-Treatment Response */}
                      <div className="bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-[#18201C]">
                          <User className="w-3.5 h-3.5 text-[#1B3B2B]" />
                          <span>Pre-Session Check-in / Subjective State</span>
                        </div>
                        <p className="text-[#3E4540] leading-relaxed whitespace-pre-wrap">
                          {session.patientSubjectiveResponse || (
                            <span className="text-[#858C86] italic">
                              No specific check-in symptoms documented.
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Immediate Clinical Observations */}
                      <div className="bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-[#18201C]">
                          <Activity className="w-3.5 h-3.5 text-[#1B3B2B]" />
                          <span>Immediate Post-Treatment Response & Signs</span>
                        </div>
                        <p className="text-[#3E4540] leading-relaxed whitespace-pre-wrap">
                          {session.immediateObservations || (
                            <span className="text-[#858C86] italic">
                              No acute post-treatment observations noted.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Therapist Narrative Notes */}
                    {session.therapistSessionNotes && (
                      <div className="bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg p-3.5 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-[#18201C]">
                          <FileText className="w-3.5 h-3.5 text-[#1B3B2B]" />
                          <span>Therapist Clinical Notes & Techniques</span>
                        </div>
                        <p className="text-[#3E4540] leading-relaxed whitespace-pre-wrap">
                          {session.therapistSessionNotes}
                        </p>
                      </div>
                    )}

                    {/* Modifications Summary */}
                    {session.modificationsSummary && (
                      <div className="bg-[#FBF7EE] border border-[#ECD9B8] rounded-lg p-3.5 space-y-1 text-xs">
                        <span className="font-semibold text-[#7A5B18]">
                          Session Modifications Summary
                        </span>
                        <p className="text-[#5A4517] leading-relaxed">
                          {session.modificationsSummary}
                        </p>
                      </div>
                    )}

                    {/* Session Treatment Deliveries List */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#EAE4DB]">
                        <div>
                          <h4 className="text-xs font-semibold text-[#18201C] uppercase tracking-wider">
                            Actual Treatment Delivered ({deliveries.length})
                          </h4>
                          <p className="text-[11px] text-[#636A64]">
                            Interventions executed during this encounter, comparing planned prescription vs. actual delivery.
                          </p>
                        </div>
                        <Button
                          id={`add-delivery-to-session-${session.id}`}
                          variant="secondary"
                          size="sm"
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenAddDelivery(session)}
                        >
                          Record Intervention
                        </Button>
                      </div>

                      {deliveries.length === 0 ? (
                        <div className="text-center py-6 px-4 bg-[#FAF8F5] border border-dashed border-[#E3DDD2] rounded-lg space-y-2">
                          <p className="text-xs text-[#6B726C]">
                            No specific interventions logged for this session yet.
                          </p>
                          <Button
                            id={`empty-add-delivery-to-session-${session.id}`}
                            variant="secondary"
                            size="sm"
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenAddDelivery(session)}
                          >
                            Add Treatment Delivery
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {deliveries.map((delivery) => {
                            // Find linked treatment selection (if any)
                            const linkedSelection = delivery.treatmentSelectionId
                              ? plannedSelections.find((s) => s.id === delivery.treatmentSelectionId)
                              : null;

                            const interventionConfig =
                              TREATMENT_INTERVENTION_TYPE_CONFIG[delivery.interventionType] || {
                                label: delivery.interventionType,
                                badgeClass: 'bg-[#FAF8F5] text-[#343B36] border-[#DDD6CB]',
                              };

                            const deliveryStatusConfig =
                              DELIVERY_EXECUTION_STATUS_CONFIG[delivery.deliveryStatus] ||
                              DELIVERY_EXECUTION_STATUS_CONFIG.completed_as_planned;

                            const modConfig = delivery.modificationType
                              ? TREATMENT_MODIFICATION_TYPE_CONFIG[delivery.modificationType]
                              : null;

                            const isModified =
                              delivery.modificationType && delivery.modificationType !== 'none';

                            return (
                              <div
                                key={delivery.id}
                                id={`delivery-item-${delivery.id}`}
                                className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-lg p-4 space-y-3 transition-colors hover:border-[#CAD8D0]"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-semibold text-[#18201C]">
                                        {delivery.title}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${interventionConfig.badgeClass}`}
                                      >
                                        {interventionConfig.label}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${deliveryStatusConfig.badgeClass}`}
                                      >
                                        {deliveryStatusConfig.label}
                                      </span>
                                      {delivery.actualDurationMinutes && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6A716B]">
                                          <Clock className="w-3 h-3" />
                                          {delivery.actualDurationMinutes} mins
                                        </span>
                                      )}
                                    </div>

                                    {/* Linked prescription reference */}
                                    <div className="text-[11px] text-[#636A64]">
                                      {linkedSelection ? (
                                        <span className="inline-flex items-center gap-1 text-[#22445E]">
                                          <ListTodo className="w-3 h-3" />
                                          <span>
                                            Linked to planned prescription: <strong>{linkedSelection.title}</strong>
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-[#7A817B] italic">
                                          Ad-hoc / unlinked session intervention
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                    <Button
                                      id={`edit-delivery-${delivery.id}`}
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEditDelivery(session, delivery)}
                                      aria-label="Edit Intervention Delivery"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      id={`delete-delivery-${delivery.id}`}
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteDelivery(delivery.id)}
                                      className="text-[#931D1D] hover:text-[#7A1616] hover:bg-[#FDF0F0]"
                                      aria-label="Delete Intervention Delivery"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Comparison Grid: Planned vs. Actual */}
                                {(linkedSelection?.dosage || delivery.actualDosage) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                                    {/* Planned Prescription Dosage */}
                                    <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded p-2.5 space-y-1">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#636A64]">
                                        Planned Prescription (Stage 4E)
                                      </span>
                                      {linkedSelection?.dosage ? (
                                        <div className="grid grid-cols-2 gap-1 text-[11px] text-[#2C332E]">
                                          {linkedSelection.dosage.sets !== undefined && (
                                            <div>Sets: <strong>{linkedSelection.dosage.sets}</strong></div>
                                          )}
                                          {linkedSelection.dosage.reps !== undefined && (
                                            <div>Reps: <strong>{linkedSelection.dosage.reps}</strong></div>
                                          )}
                                          {linkedSelection.dosage.intensity && (
                                            <div>Intensity: <strong>{linkedSelection.dosage.intensity}</strong></div>
                                          )}
                                          {linkedSelection.dosage.holdTime && (
                                            <div>Hold: <strong>{linkedSelection.dosage.holdTime}</strong></div>
                                          )}
                                          {linkedSelection.dosage.frequency && (
                                            <div className="col-span-2">Freq: {linkedSelection.dosage.frequency}</div>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-[#858C86] italic text-[11px]">
                                          No explicit planned dosage parameters configured.
                                        </p>
                                      )}
                                    </div>

                                    {/* Actual Delivered Dosage */}
                                    <div className="bg-[#FFFFFF] border border-[#CAD8D0] rounded p-2.5 space-y-1">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1B3B2B]">
                                        Actually Delivered Today
                                      </span>
                                      {delivery.actualDosage ? (
                                        <div className="grid grid-cols-2 gap-1 text-[11px] text-[#1B3B2B]">
                                          {delivery.actualDosage.sets !== undefined && (
                                            <div>Sets: <strong>{delivery.actualDosage.sets}</strong></div>
                                          )}
                                          {delivery.actualDosage.reps !== undefined && (
                                            <div>Reps: <strong>{delivery.actualDosage.reps}</strong></div>
                                          )}
                                          {delivery.actualDosage.intensity && (
                                            <div>Intensity: <strong>{delivery.actualDosage.intensity}</strong></div>
                                          )}
                                          {delivery.actualDosage.holdTime && (
                                            <div>Hold: <strong>{delivery.actualDosage.holdTime}</strong></div>
                                          )}
                                          {delivery.actualDosage.restPeriod && (
                                            <div className="col-span-2">Rest: {delivery.actualDosage.restPeriod}</div>
                                          )}
                                          {delivery.actualDosage.notes && (
                                            <div className="col-span-2 text-[#465249]">{delivery.actualDosage.notes}</div>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-[#858C86] italic text-[11px]">
                                          Delivered qualitatively without structured set/rep metrics.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Modification Alert Box */}
                                {isModified && (
                                  <div className="bg-[#FAF4E6] border border-[#EADCBF] rounded p-2.5 space-y-1 text-xs">
                                    <div className="flex items-center gap-1.5 font-semibold text-[#7A5B18]">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>Clinician Modification: {modConfig?.label}</span>
                                    </div>
                                    {delivery.modificationReason && (
                                      <p className="text-[#5A4517] text-[11px] leading-relaxed">
                                        <strong>Reason:</strong> {delivery.modificationReason}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Therapist Execution Notes & Immediate Response */}
                                {(delivery.therapistExecutionNotes || delivery.immediateResponse) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1 border-t border-[#EAE4DB]">
                                    {delivery.therapistExecutionNotes && (
                                      <div>
                                        <span className="text-[10px] font-semibold text-[#636A64]">
                                          Biomechanical Execution & Positioning:
                                        </span>
                                        <p className="text-[#2C332E] text-[11px] leading-relaxed">
                                          {delivery.therapistExecutionNotes}
                                        </p>
                                      </div>
                                    )}
                                    {delivery.immediateResponse && (
                                      <div>
                                        <span className="text-[10px] font-semibold text-[#636A64]">
                                          Immediate Exercise Response:
                                        </span>
                                        <p className="text-[#2C332E] text-[11px] leading-relaxed">
                                          {delivery.immediateResponse}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Create / Edit Clinical Session                                  */}
      {/* ========================================================================= */}
      {isSessionModalOpen && (
        <div
          id="clinical-session-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18201C]/50 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl shadow-xl max-w-2xl w-full p-5 sm:p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4DB]">
              <div>
                <h3 className="text-base font-semibold text-[#18201C]">
                  {editingSession
                    ? `Edit Session #${editingSession.sessionNumber}`
                    : `Record New Clinical Session (Encounter #${sessions.length + 1})`}
                </h3>
                <p className="text-xs text-[#636A64]">
                  Document encounter parameters, therapist observations, and immediate patient response.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(false)}
                className="p-1 text-[#717872] hover:text-[#18201C] rounded-lg hover:bg-[#EAE5DC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[#FDECEC] border border-[#F4C7C7] rounded-lg text-xs text-[#931D1D] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSession} className="space-y-4 text-xs">
              {/* Session Meta: Date, Time, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">Session Date *</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  />
                </div>
              </div>

              {/* Status and Overall Tolerance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">Session Lifecycle Status</label>
                  <select
                    value={sessionStatus}
                    onChange={(e) => setSessionStatus(e.target.value as ClinicalSessionStatus)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  >
                    {Object.entries(CLINICAL_SESSION_STATUS_CONFIG).map(([statusKey, conf]) => (
                      <option key={statusKey} value={statusKey}>
                        {conf.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">Overall Patient Tolerance</label>
                  <select
                    value={overallTolerance}
                    onChange={(e) => setOverallTolerance(e.target.value as SessionToleranceRating)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  >
                    {Object.entries(SESSION_TOLERANCE_CONFIG).map(([ratingKey, conf]) => (
                      <option key={ratingKey} value={ratingKey}>
                        {conf.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subjective Check-in */}
              <div className="space-y-1">
                <label className="font-semibold text-[#2C332E]">
                  Pre-Session Check-in / Patient Subjective Response
                </label>
                <textarea
                  rows={2}
                  value={patientSubjectiveResponse}
                  onChange={(e) => setPatientSubjectiveResponse(e.target.value)}
                  placeholder="e.g., Reports 3/10 morning knee stiffness; soreness settled within 2 hours post previous workout..."
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                />
              </div>

              {/* Therapist Session Notes */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="therapist-session-notes-input" className="font-semibold text-[#2C332E]">
                    Therapist Session Notes & Manual Techniques
                  </label>
                  {eligiblePreviousSession && (
                    <button
                      id="copy-previous-session-notes-btn"
                      type="button"
                      onClick={handleCopyPreviousNotes}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B3B2B] hover:text-[#12281D] hover:underline cursor-pointer transition-colors"
                      title={`Copy notes from Session #${eligiblePreviousSession.sessionNumber} (${formatClinicalDate(eligiblePreviousSession.sessionDate)})`}
                    >
                      <Copy className="w-3.5 h-3.5 text-[#1B3B2B]" />
                      <span>Copy notes from previous session</span>
                    </button>
                  )}
                </div>

                {showRecallConfirm && (
                  <div
                    id="narrative-recall-confirm-dialog"
                    className="p-3 bg-[#FEF3E2] border border-[#FDE68A] rounded-lg space-y-2 text-xs text-[#92400E] animate-in fade-in duration-150"
                    role="alertdialog"
                    aria-label="Confirm replace draft notes"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#78350F]">
                          Replace the current draft notes with the previous session's notes?
                        </p>
                        <p className="text-[11px] text-[#92400E] mt-0.5">
                          This will replace your current draft text in this field with notes from Session #{eligiblePreviousSession?.sessionNumber} ({formatClinicalDate(eligiblePreviousSession?.sessionDate || '')}).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        id="recall-notes-cancel-btn"
                        type="button"
                        onClick={handleCancelReplaceNotes}
                        className="px-2.5 py-1 text-xs font-medium text-[#78350F] hover:bg-[#FDE68A]/60 rounded-md transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id="recall-notes-replace-confirm-btn"
                        type="button"
                        onClick={handleConfirmReplaceNotes}
                        className="px-2.5 py-1 text-xs font-semibold text-[#FAF8F5] bg-[#B45309] hover:bg-[#92400E] rounded-md transition-colors cursor-pointer shadow-xs"
                      >
                        Replace Notes
                      </button>
                    </div>
                  </div>
                )}

                {showNarrativeRecallNotice && (
                  <div
                    id="narrative-recall-draft-notice"
                    className="flex items-center gap-2 p-2.5 bg-[#E2ECE6] border border-[#BDD1C6] rounded-lg text-xs text-[#1B3B2B] animate-in fade-in duration-150"
                  >
                    <Info className="w-4 h-4 shrink-0 text-[#1B3B2B]" />
                    <span className="text-[11px] font-medium">
                      Previous notes inserted as draft. Review and update before saving.
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNarrativeRecallNotice(false)}
                      className="ml-auto p-0.5 text-[#1B3B2B]/70 hover:text-[#1B3B2B] cursor-pointer"
                      aria-label="Dismiss notice"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <textarea
                  id="therapist-session-notes-input"
                  rows={3}
                  value={therapistSessionNotes}
                  onChange={(e) => setTherapistSessionNotes(e.target.value)}
                  placeholder="e.g., Performed Grade III patellofemoral caudal glides for 5 mins; emphasized pelvic alignment during single-leg drills..."
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                />
              </div>

              {/* Immediate Post-Treatment Observations */}
              <div className="space-y-1">
                <label className="font-semibold text-[#2C332E]">
                  Immediate Post-Treatment Observations & Functional Re-check
                </label>
                <textarea
                  rows={2}
                  value={immediateObservations}
                  onChange={(e) => setImmediateObservations(e.target.value)}
                  placeholder="e.g., Step-down test re-checked: pain-free; active knee extension full without lag; mild quadriceps fatigue..."
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                />
              </div>

              {/* Session Modifications Summary */}
              <div className="space-y-1">
                <label className="font-semibold text-[#2C332E]">
                  Session Modifications Summary (Optional)
                </label>
                <input
                  type="text"
                  value={modificationsSummary}
                  onChange={(e) => setModificationsSummary(e.target.value)}
                  placeholder="e.g., Reduced Spanish squat volume due to slight tendon warmth; substituted leg press"
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                />
              </div>

              {/* For NEW session: Multi-select existing planned selections to auto-deliver */}
              {!editingSession && plannedSelections.length > 0 && (
                <div className="pt-2 border-t border-[#EAE4DB] space-y-2">
                  <label className="font-semibold text-[#2C332E]">
                    Include Planned Interventions for Delivery in this Encounter:
                  </label>
                  <p className="text-[11px] text-[#636A64]">
                    Select which planned treatments from Stage 4E were performed. You can fine-tune actual dosages and modifications after creating the session.
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-[#FFFFFF] border border-[#D5CDC1] rounded-lg">
                    {plannedSelections.map((sel) => {
                      const isChecked = selectedPlanIdsToDeliver.includes(sel.id);
                      return (
                        <label
                          key={sel.id}
                          className="flex items-center gap-2 text-xs text-[#18201C] p-1.5 hover:bg-[#FAF8F5] rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlanIdsToDeliver((prev) => [...prev, sel.id]);
                              } else {
                                setSelectedPlanIdsToDeliver((prev) =>
                                  prev.filter((id) => id !== sel.id)
                                );
                              }
                            }}
                            className="rounded border-[#D5CDC1] text-[#1B3B2B] focus:ring-[#1B3B2B]"
                          />
                          <span className="font-medium">{sel.title}</span>
                          <span className="text-[10px] text-[#636A64]">
                            ({sel.interventionType})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-4 border-t border-[#EAE4DB] flex items-center justify-end gap-2.5">
                <Button
                  id="cancel-session-btn"
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  id="save-session-btn"
                  variant="primary"
                  size="md"
                  type="submit"
                >
                  {editingSession ? 'Update Session' : 'Save Session'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Record / Edit Session Treatment Delivery                         */}
      {/* ========================================================================= */}
      {isDeliveryModalOpen && activeSessionForDelivery && (
        <div
          id="treatment-delivery-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18201C]/50 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl shadow-xl max-w-2xl w-full p-5 sm:p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4DB]">
              <div>
                <h3 className="text-base font-semibold text-[#18201C]">
                  {editingDelivery
                    ? `Edit Delivered Intervention`
                    : `Record Treatment Delivery — Session #${activeSessionForDelivery.sessionNumber}`}
                </h3>
                <p className="text-xs text-[#636A64]">
                  Document what was actually performed, comparing against planned prescription if applicable.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="p-1 text-[#717872] hover:text-[#18201C] rounded-lg hover:bg-[#EAE5DC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deliveryError && (
              <div className="p-3 bg-[#FDECEC] border border-[#F4C7C7] rounded-lg text-xs text-[#931D1D] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deliveryError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDelivery} className="space-y-4 text-xs">
              {/* Linked Prescription Source Dropdown */}
              <div className="space-y-1">
                <label className="font-semibold text-[#2C332E]">
                  Select Planned Prescription or Create Ad-Hoc
                </label>
                <select
                  value={deliverySelectionId}
                  onChange={(e) => handleSelectPrescriptionToDeliver(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                >
                  <option value="custom">-- Ad-hoc / Non-prescribed Intervention --</option>
                  {plannedSelections.map((sel) => (
                    <option key={sel.id} value={sel.id}>
                      Planned: {sel.title} ({sel.interventionType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Intervention Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">Intervention Title *</label>
                  <input
                    type="text"
                    value={deliveryTitle}
                    onChange={(e) => setDeliveryTitle(e.target.value)}
                    required
                    placeholder="e.g., Isometric Spanish Squat"
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">Intervention Type</label>
                  <select
                    value={deliveryInterventionType}
                    onChange={(e) => setDeliveryInterventionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  >
                    {Object.entries(TREATMENT_INTERVENTION_TYPE_CONFIG).map(([typeKey, conf]) => (
                      <option key={typeKey} value={typeKey}>
                        {conf.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Execution Status and Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">Execution Delivery Status</label>
                  <select
                    value={deliveryStatus}
                    onChange={(e) => setDeliveryStatus(e.target.value as DeliveryExecutionStatus)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  >
                    {Object.entries(DELIVERY_EXECUTION_STATUS_CONFIG).map(([statusKey, conf]) => (
                      <option key={statusKey} value={statusKey}>
                        {conf.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">Actual Duration (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={actualDurationMinutes}
                    onChange={(e) => setActualDurationMinutes(e.target.value)}
                    placeholder="e.g., 15"
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  />
                </div>
              </div>

              {/* Modification Tracking */}
              <div className="bg-[#FAF4E6] border border-[#EADCBF] rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#7A5B18] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Modification Tracking (Therapist Documented)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-[#5A4517]">Modification Category</label>
                    <select
                      value={modificationType}
                      onChange={(e) => setModificationType(e.target.value as TreatmentModificationType)}
                      className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#7A5B18]"
                    >
                      {Object.entries(TREATMENT_MODIFICATION_TYPE_CONFIG).map(([modKey, conf]) => (
                        <option key={modKey} value={modKey}>
                          {conf.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-[#5A4517]">Reason for Modification</label>
                    <input
                      type="text"
                      value={modificationReason}
                      onChange={(e) => setModificationReason(e.target.value)}
                      placeholder="e.g., Fatigue on 3rd set; anterior knee discomfort reported"
                      className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#7A5B18]"
                    />
                  </div>
                </div>
              </div>

              {/* Actual Dosage Parameters Toggle */}
              <div className="pt-2 border-t border-[#EAE4DB] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#2C332E] flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDosage}
                      onChange={(e) => setHasDosage(e.target.checked)}
                      className="rounded border-[#D5CDC1] text-[#1B3B2B] focus:ring-[#1B3B2B]"
                    />
                    <span>Record Actual Dosage Delivered</span>
                  </label>
                </div>

                {hasDosage && (
                  <div className="bg-[#FFFFFF] border border-[#D5CDC1] rounded-lg p-3.5 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-[#464D48]">Actual Sets</label>
                        <input
                          type="number"
                          min="0"
                          value={dosageSets}
                          onChange={(e) => setDosageSets(e.target.value)}
                          placeholder="e.g. 3"
                          className="w-full px-2.5 py-1.5 rounded border border-[#D5CDC1]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-[#464D48]">Actual Reps</label>
                        <input
                          type="number"
                          min="0"
                          value={dosageReps}
                          onChange={(e) => setDosageReps(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full px-2.5 py-1.5 rounded border border-[#D5CDC1]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-[#464D48]">Intensity / Load</label>
                        <input
                          type="text"
                          value={dosageIntensity}
                          onChange={(e) => setDosageIntensity(e.target.value)}
                          placeholder="e.g. Bodyweight / 15kg"
                          className="w-full px-2.5 py-1.5 rounded border border-[#D5CDC1]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-[#464D48]">Hold Time</label>
                        <input
                          type="text"
                          value={dosageHoldTime}
                          onChange={(e) => setDosageHoldTime(e.target.value)}
                          placeholder="e.g. 45s hold"
                          className="w-full px-2.5 py-1.5 rounded border border-[#D5CDC1]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-[#464D48]">Rest Period</label>
                        <input
                          type="text"
                          value={dosageRestPeriod}
                          onChange={(e) => setDosageRestPeriod(e.target.value)}
                          placeholder="e.g. 90 seconds between sets"
                          className="w-full px-2.5 py-1.5 rounded border border-[#D5CDC1]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-[#464D48]">Dosage Execution Notes</label>
                        <input
                          type="text"
                          value={dosageNotes}
                          onChange={(e) => setDosageNotes(e.target.value)}
                          placeholder="e.g. Band around proximal tibia"
                          className="w-full px-2.5 py-1.5 rounded border border-[#D5CDC1]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Execution Notes & Immediate Response */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EAE4DB]">
                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">
                    Biomechanical Execution & Positioning Notes
                  </label>
                  <textarea
                    rows={2}
                    value={therapistExecutionNotes}
                    onChange={(e) => setTherapistExecutionNotes(e.target.value)}
                    placeholder="e.g., Patient positioned in 70° knee flexion against heavy loop band; maintained vertical trunk."
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#2C332E]">
                    Immediate Intervention Response & Tolerance
                  </label>
                  <textarea
                    rows={2}
                    value={immediateResponse}
                    onChange={(e) => setImmediateResponse(e.target.value)}
                    placeholder="e.g., 0/10 tendon pain during hold; 2/10 quadriceps burning fatigue on 4th repetition."
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D5CDC1] focus:outline-hidden focus:border-[#1B3B2B]"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-[#EAE4DB] flex items-center justify-end gap-2.5">
                <Button
                  id="cancel-delivery-btn"
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  id="save-delivery-btn"
                  variant="primary"
                  size="md"
                  type="submit"
                >
                  {editingDelivery ? 'Update Delivery' : 'Save Delivery'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
