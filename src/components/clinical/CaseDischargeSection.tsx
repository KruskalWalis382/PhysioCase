import React, { useState, useMemo } from 'react';
import {
  LogOut,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  FileText,
  Activity,
  AlertCircle,
  TrendingUp,
  Target,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useClinical } from '../../context/ClinicalContext';
import {
  Case,
  Patient,
  CaseDischargeRecord,
  DischargeReason,
} from '../../types';
import { DischargeSummaryCard } from './DischargeSummaryCard';
import { DischargeCaseModal } from './DischargeCaseModal';
import { calculateEpisodeDuration } from '../../utils/clinicalDischarge';

interface CaseDischargeSectionProps {
  caseItem: Case;
  patient: Patient;
}

export const CaseDischargeSection: React.FC<CaseDischargeSectionProps> = ({
  caseItem,
  patient,
}) => {
  const {
    getDischargeRecordForCase,
    saveCaseDischargeRecord,
    reopenCase,
    getSessionsForCase,
    clinicalGoals,
    getMeasurementsForCase,
  } = useClinical();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Retrieve existing discharge record for this case
  const dischargeRecord = getDischargeRecordForCase(caseItem.id);
  const isCaseDischarged = caseItem.status === 'Discharged';

  // Associated case data
  const sessions = useMemo(() => getSessionsForCase(caseItem.id), [getSessionsForCase, caseItem.id]);
  const goals = useMemo(
    () => (clinicalGoals || []).filter((g) => g.caseId === caseItem.id),
    [clinicalGoals, caseItem.id]
  );
  const measurements = useMemo(
    () => getMeasurementsForCase(caseItem.id),
    [getMeasurementsForCase, caseItem.id]
  );

  // Compute baseline vs discharge measurement pairs
  const baselineAndDischargePairs = useMemo(() => {
    const map = new Map<
      string,
      {
        measureName: string;
        category: string;
        baseline?: (typeof measurements)[0];
        discharge?: (typeof measurements)[0];
        differenceText?: string;
      }
    >();

    measurements.forEach((m) => {
      const key = m.measureName.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          measureName: m.measureName,
          category: m.category,
        });
      }
      const entry = map.get(key)!;
      if (m.stage === 'baseline' && !entry.baseline) {
        entry.baseline = m;
      } else if (m.stage === 'discharge') {
        entry.discharge = m;
      }
    });

    const results: Array<{
      measureName: string;
      category: string;
      baseline?: (typeof measurements)[0];
      discharge?: (typeof measurements)[0];
      differenceText?: string;
    }> = [];

    map.forEach((entry) => {
      if (entry.discharge) {
        let diff = '';
        if (
          entry.baseline &&
          typeof entry.baseline.numericValue === 'number' &&
          typeof entry.discharge.numericValue === 'number'
        ) {
          const delta = entry.discharge.numericValue - entry.baseline.numericValue;
          diff = `${delta > 0 ? '+' : ''}${delta} ${entry.discharge.unit || ''}`;
        }
        results.push({
          ...entry,
          differenceText: diff || undefined,
        });
      }
    });

    return results;
  }, [measurements]);

  const handleSaveDischarge = (data: Parameters<typeof saveCaseDischargeRecord>[0]) => {
    saveCaseDischargeRecord(data);
    setIsModalOpen(false);
  };

  const handleReopen = () => {
    if (
      window.confirm(
        `Are you sure you want to reopen this case for ${patient.fullName}? The case status will return to Treatment, and the discharge summary will remain saved as historical documentation.`
      )
    ) {
      reopenCase(caseItem.id);
    }
  };

  return (
    <section
      id="section-case-discharge"
      className="space-y-4 pt-2"
      aria-label="Case Discharge and Clinical Summary"
    >
      {dischargeRecord ? (
        <div className="space-y-4">
          <DischargeSummaryCard
            dischargeRecord={dischargeRecord}
            caseStartDate={caseItem.startDate}
            sessionsCount={sessions.length}
            goals={goals}
            baselineAndDischargePairs={baselineAndDischargePairs}
            onReopenCase={handleReopen}
            onEditDischarge={() => setIsModalOpen(true)}
            canManage={true}
          />
          {!isCaseDischarged && (
            <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-center justify-between">
              <span>
                Note: This case has been reopened and is currently active in treatment. A historical discharge summary exists above.
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="font-semibold underline ml-2"
              >
                Re-discharge Case
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Un-discharged case state: Clinical closure preparation card */
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE4DB]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#EAE5DC] text-[#1B3B2B] shrink-0 mt-0.5">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#525954] uppercase tracking-wider">
                  Stage 7 • Episode Closure
                </span>
                <h3 className="text-base font-semibold text-[#18201C] tracking-tight">
                  Case Discharge & Clinical Summary
                </h3>
                <p className="text-xs text-[#636A64] mt-0.5 leading-relaxed">
                  Synthesize the clinical journey, record final outcome measures, and document the patient's
                  post-discharge home maintenance plan.
                </p>
              </div>
            </div>

            <Button
              id="open-discharge-modal-btn"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 bg-[#1B3B2B] hover:bg-[#152F22] text-white rounded-lg shadow-xs transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Discharge Case</span>
            </Button>
          </div>

          {/* Episode Readiness Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white border border-[#E8E2D8] space-y-1">
              <span className="text-[11px] font-semibold text-[#636A64] uppercase tracking-wider block">
                Session History
              </span>
              <div className="text-sm font-semibold text-[#18201C]">
                {sessions.length} {sessions.length === 1 ? 'session logged' : 'sessions logged'}
              </div>
              <p className="text-[11px] text-[#7A827B]">
                {sessions.length > 0
                  ? 'Active encounters available for episode synthesis.'
                  : 'No clinical sessions logged yet.'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[#E8E2D8] space-y-1">
              <span className="text-[11px] font-semibold text-[#636A64] uppercase tracking-wider block">
                Goal Attainment
              </span>
              <div className="text-sm font-semibold text-[#18201C]">
                {goals.filter((g) => g.status === 'met').length} of {goals.length} goals met
              </div>
              <p className="text-[11px] text-[#7A827B]">
                {goals.length > 0
                  ? 'Goal statuses will be integrated into the discharge summary.'
                  : 'No active clinical goals recorded.'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[#E8E2D8] space-y-1">
              <span className="text-[11px] font-semibold text-[#636A64] uppercase tracking-wider block">
                Episode Timeline
              </span>
              <div className="text-sm font-semibold text-[#18201C]">
                {caseItem.startDate ? `Started ${caseItem.startDate}` : 'Onset documented'}
              </div>
              <p className="text-[11px] text-[#7A827B]">
                Duration is automatically computed upon discharge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      <DischargeCaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        caseId={caseItem.id}
        patientId={patient.id}
        existingRecord={dischargeRecord}
        onSave={handleSaveDischarge}
      />
    </section>
  );
};
