import React from 'react';
import {
  LogOut,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  ArrowRight,
  ShieldAlert,
  Send,
  Home,
  Info,
} from 'lucide-react';
import {
  CaseDischargeRecord,
  DischargeReason,
  ClinicalGoal,
  ProgressMeasurement,
} from '../../types';
import {
  DISCHARGE_REASONS_LABELS,
  calculateEpisodeDuration,
} from '../../utils/clinicalDischarge';

interface DischargeSummaryCardProps {
  dischargeRecord: CaseDischargeRecord;
  caseStartDate?: string;
  sessionsCount: number;
  goals: ClinicalGoal[];
  baselineAndDischargePairs: Array<{
    measureName: string;
    category: string;
    baseline?: ProgressMeasurement;
    discharge?: ProgressMeasurement;
    differenceText?: string;
  }>;
  onReopenCase?: () => void;
  onEditDischarge?: () => void;
  canManage?: boolean;
}

export const DischargeSummaryCard: React.FC<DischargeSummaryCardProps> = ({
  dischargeRecord,
  caseStartDate,
  sessionsCount,
  goals,
  baselineAndDischargePairs,
  onReopenCase,
  onEditDischarge,
  canManage = true,
}) => {
  const duration = calculateEpisodeDuration(caseStartDate, dischargeRecord.dischargeDate);

  const metGoalsCount = goals.filter((g) => g.status === 'met').length;
  const totalGoals = goals.length;
  const goalAchievementRate =
    totalGoals > 0 ? Math.round((metGoalsCount / totalGoals) * 100) : null;

  return (
    <div
      id={`discharge-summary-card-${dischargeRecord.id}`}
      className="bg-[#FAF8F5] border-2 border-[#1B3B2B]/20 rounded-xl overflow-hidden shadow-xs"
    >
      {/* Top Banner */}
      <div className="bg-[#1B3B2B] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-white/15 text-white border border-white/20">
              Episode of Care Completed
            </span>
            <span className="text-xs text-white/80 font-mono">
              Discharged on {dischargeRecord.dischargeDate}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <LogOut className="w-5 h-5 text-[#A3D9B1]" />
            <span>Case Discharge & Clinical Summary</span>
          </h3>
          <p className="text-xs text-[#D8E6DC] leading-relaxed max-w-2xl">
            Formal clinical closure record documenting episode synthesis, functional outcomes achieved,
            and the post-discharge self-management trajectory.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            {onEditDischarge && (
              <button
                id="edit-discharge-summary-btn"
                type="button"
                onClick={onEditDischarge}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-colors cursor-pointer"
              >
                Edit Summary
              </button>
            )}
            {onReopenCase && (
              <button
                id="reopen-case-action-btn"
                type="button"
                onClick={onReopenCase}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#EBF2EE] hover:bg-white text-[#1B3B2B] shadow-xs transition-colors cursor-pointer"
              >
                Reopen Episode
              </button>
            )}
          </div>
        )}
      </div>

      {/* Episode Synthesized Metrics Bar */}
      <div className="bg-[#F3EFEA] border-b border-[#E3DDD2] px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-[11px] font-semibold text-[#5A635C] uppercase tracking-wider block">
            Discharge Reason
          </span>
          <span className="text-sm font-semibold text-[#18201C] mt-0.5 inline-block">
            {DISCHARGE_REASONS_LABELS[dischargeRecord.dischargeReason] || dischargeRecord.dischargeReason}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-[#5A635C] uppercase tracking-wider block">
            Episode Duration
          </span>
          <span className="text-sm font-semibold text-[#18201C] mt-0.5 inline-block">
            {duration ? duration.formattedText : 'Duration not available'}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-[#5A635C] uppercase tracking-wider block">
            Encounters Delivered
          </span>
          <span className="text-sm font-semibold text-[#18201C] mt-0.5 inline-block">
            {sessionsCount} {sessionsCount === 1 ? 'clinical session' : 'clinical sessions'}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-[#5A635C] uppercase tracking-wider block">
            Goals Met Rate
          </span>
          <span className="text-sm font-semibold text-[#18201C] mt-0.5 inline-block">
            {goalAchievementRate !== null
              ? `${metGoalsCount}/${totalGoals} (${goalAchievementRate}%)`
              : 'No goals recorded'}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Section 1: Clinical Synthesis & Final Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E3DDD2] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1B3B2B] uppercase tracking-wider">
              <FileText className="w-4 h-4 text-[#1B3B2B]" />
              <span>Episode Course Synthesis</span>
            </div>
            <p className="text-xs text-[#2A312D] leading-relaxed whitespace-pre-line">
              {dischargeRecord.episodeSummary}
            </p>
          </div>

          <div className="bg-white border border-[#E3DDD2] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1B3B2B] uppercase tracking-wider">
              <Activity className="w-4 h-4 text-[#1B3B2B]" />
              <span>Clinical Status at Discharge</span>
            </div>
            <p className="text-xs text-[#2A312D] leading-relaxed whitespace-pre-line">
              {dischargeRecord.clinicalStatusAtDischarge}
            </p>
          </div>
        </div>

        {/* Section 2: Goals Status at Closure */}
        {totalGoals > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-[#414843] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <span>Goal Attainment & Final Status</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {goals.map((g) => {
                const isMet = g.status === 'met';
                const isPartial = g.status === 'partially_met';
                return (
                  <div
                    key={g.id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      isMet
                        ? 'bg-[#EBF2EE] border-[#CAD8D0]'
                        : isPartial
                        ? 'bg-[#FFFBEB] border-[#FDE68A]'
                        : 'bg-white border-[#E8E2D8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#18201C] line-clamp-1">
                        {g.description}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                          isMet
                            ? 'bg-[#1B3B2B] text-white'
                            : isPartial
                            ? 'bg-[#B45309] text-white'
                            : 'bg-[#525954] text-white'
                        }`}
                      >
                        {g.status.replace('_', ' ')}
                      </span>
                    </div>
                    {g.targetDate && (
                      <div className="text-[11px] text-[#636A64]">
                        Target: {g.targetDate}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: Baseline to Discharge Outcomes Comparison */}
        {baselineAndDischargePairs.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-[#414843] uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <span>Baseline vs. Discharge Measurements Comparison</span>
            </h4>
            <div className="border border-[#E3DDD2] rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F6F2] border-b border-[#E3DDD2] text-[#525954]">
                    <th className="py-2.5 px-4 font-semibold">Outcome / Metric</th>
                    <th className="py-2.5 px-3 font-semibold">Category</th>
                    <th className="py-2.5 px-3 font-semibold">Baseline</th>
                    <th className="py-2.5 px-3 font-semibold">Discharge</th>
                    <th className="py-2.5 px-3 font-semibold">Net Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5DC]">
                  {baselineAndDischargePairs.map((pair, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF8F5]">
                      <td className="py-2.5 px-4 font-medium text-[#18201C]">
                        {pair.measureName}
                      </td>
                      <td className="py-2.5 px-3 text-[#636A64] capitalize">
                        {pair.category.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-[#2A312D] font-mono">
                        {pair.baseline
                          ? `${pair.baseline.numericValue ?? pair.baseline.textValue ?? '—'} ${
                              pair.baseline.unit || ''
                            }`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[#1B3B2B] font-mono font-semibold">
                        {pair.discharge
                          ? `${pair.discharge.numericValue ?? pair.discharge.textValue ?? '—'} ${
                              pair.discharge.unit || ''
                            }`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#1B3B2B]">
                        {pair.differenceText || 'Documented at discharge'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Post-Discharge & Self-Management Plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {dischargeRecord.homeMaintenancePlan ? (
            <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18201C]">
                <Home className="w-3.5 h-3.5 text-[#1B3B2B]" />
                <span>Home Maintenance & HEP</span>
              </div>
              <p className="text-xs text-[#414843] leading-relaxed whitespace-pre-line">
                {dischargeRecord.homeMaintenancePlan}
              </p>
            </div>
          ) : (
            <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-lg p-3.5 text-xs text-[#7A827B]">
              <span className="font-medium text-[#414843] block mb-0.5">Home Maintenance</span>
              No home maintenance program recorded.
            </div>
          )}

          {dischargeRecord.precautionsAndWarningSigns ? (
            <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
                <ShieldAlert className="w-3.5 h-3.5 text-[#B45309]" />
                <span>Precautions & Warning Signs</span>
              </div>
              <p className="text-xs text-[#414843] leading-relaxed whitespace-pre-line">
                {dischargeRecord.precautionsAndWarningSigns}
              </p>
            </div>
          ) : (
            <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-lg p-3.5 text-xs text-[#7A827B]">
              <span className="font-medium text-[#414843] block mb-0.5">Precautions & Red Flags</span>
              No specific precautions documented.
            </div>
          )}

          {dischargeRecord.referralOrFollowUp ? (
            <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18201C]">
                <Send className="w-3.5 h-3.5 text-[#1B3B2B]" />
                <span>Follow-Up & Referrals</span>
              </div>
              <p className="text-xs text-[#414843] leading-relaxed whitespace-pre-line">
                {dischargeRecord.referralOrFollowUp}
              </p>
            </div>
          ) : (
            <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-lg p-3.5 text-xs text-[#7A827B]">
              <span className="font-medium text-[#414843] block mb-0.5">Follow-Up & Referrals</span>
              No external referral or follow-up noted.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
