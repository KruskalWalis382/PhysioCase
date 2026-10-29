import React, { useState } from 'react';
import {
  TrendingUp,
  LineChart,
  Calendar,
  Layers,
  ChevronRight,
  Activity,
  ArrowRight,
  Target,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { ClinicalEmptyState } from '../components/common/ClinicalEmptyState';
import { useClinical } from '../context/ClinicalContext';
import { Button } from '../components/common/Button';
import { Patient, Case } from '../types';

interface ProgressViewProps {
  onSelectCase?: (caseId: string, patientId: string) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({ onSelectCase }) => {
  const {
    patients,
    cases,
    progressRecords,
    progressMeasurements,
    setSelectedCaseId,
    setSelectedPatientId,
    setIsAddPatientModalOpen,
  } = useClinical();

  const [filterPatientId, setFilterPatientId] = useState<string>('all');

  // Case lookup map
  const casesMap = new Map<string, Case>(cases.map((c) => [c.id, c]));
  const patientsMap = new Map<string, Patient>(patients.map((p) => [p.id, p]));

  // Filter progress records if filter selected
  const filteredRecords = progressRecords.filter((rec) => {
    if (filterPatientId === 'all') return true;
    return rec.patientId === filterPatientId;
  });

  const handleOpenCaseWorkspace = (caseId: string, patientId: string) => {
    if (onSelectCase) {
      onSelectCase(caseId, patientId);
    } else {
      setSelectedPatientId(patientId);
      setSelectedCaseId(caseId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title="Clinical Progress &amp; Outcomes"
        supportingText="Review longitudinal trajectories, standardized measurements, and case progress across all active episodes."
      />

      {/* Overview Statistics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#1B3B2B] mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Documented Reviews
            </span>
          </div>
          <div className="text-2xl font-serif font-medium text-[#1C201D]">
            {progressRecords.length}
          </div>
          <p className="text-[11px] text-[#676E68] mt-0.5">
            Formal evaluations across all active cases
          </p>
        </div>

        <div className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#1B3B2B] mb-1">
            <Layers className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Recorded Data Points
            </span>
          </div>
          <div className="text-2xl font-serif font-medium text-[#1C201D]">
            {progressMeasurements.length}
          </div>
          <p className="text-[11px] text-[#676E68] mt-0.5">
            Objective baseline, interim, and discharge measurements
          </p>
        </div>

        <div className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#1B3B2B] mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Tracked Cases
            </span>
          </div>
          <div className="text-2xl font-serif font-medium text-[#1C201D]">
            {new Set(progressRecords.map((r) => r.caseId)).size}
          </div>
          <p className="text-[11px] text-[#676E68] mt-0.5">
            Episodes with longitudinal outcome documentation
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {progressRecords.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl py-14 px-6 shadow-xs">
          <ClinicalEmptyState
            id="progress-empty-workspace"
            icon={<LineChart className="w-7 h-7 text-[#1B3B2B]" />}
            title="No progress reviews documented yet."
            supportingText="Progress reviews and quantitative outcome measurements are documented within individual Case Workspaces to preserve strict clinical isolation."
            primaryActionLabel="Register Patient"
            onPrimaryAction={() => setIsAddPatientModalOpen(true)}
            note="PhysioCase does not generate simulated analytics. Real progress trajectories reflect actual clinician documentation and patient outcomes."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-[#FAF8F5] border border-[#E5DFD4] rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <label htmlFor="patient-filter-select" className="text-xs font-semibold text-[#1C201D]">
                Filter by Patient:
              </label>
              <select
                id="patient-filter-select"
                value={filterPatientId}
                onChange={(e) => setFilterPatientId(e.target.value)}
                className="text-xs bg-[#FFFFFF] border border-[#D5CEC2] rounded-md px-2.5 py-1 text-[#1C201D] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
              >
                <option value="all">All Patients ({patients.length})</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.patientNumber})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-[#676E68]">
              Showing {filteredRecords.length} of {progressRecords.length} reviews
            </span>
          </div>

          {/* List of Recent Progress Reviews Across All Patients */}
          <div className="space-y-3">
            {filteredRecords.map((record) => {
              const patient = patientsMap.get(record.patientId);
              const caseItem = casesMap.get(record.caseId);
              const measurements = progressMeasurements.filter(
                (m) => m.progressRecordId === record.id
              );

              return (
                <div
                  key={record.id}
                  className="bg-[#FAF8F5] border border-[#E5DFD4] rounded-xl p-4 sm:p-5 hover:border-[#CAD8D0] transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[#1B3B2B]">
                        {patient ? patient.fullName : 'Unknown Patient'}
                      </span>
                      <span className="text-xs text-[#676E68]">•</span>
                      <span className="text-xs text-[#5D645E]">
                        Case: {caseItem ? caseItem.title : record.caseId.substring(0, 8)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF2EE] text-[#1B3B2B] font-medium text-[11px]">
                        {record.contextType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-[#676E68] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {record.recordDate}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-[#1C201D] leading-snug">
                      {record.therapistSummary}
                    </p>

                    {measurements.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {measurements.map((m) => (
                          <span
                            key={m.id}
                            className="text-[11px] px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#EDE8DF] text-[#3C443E]"
                          >
                            <strong>{m.measureName}:</strong>{' '}
                            {m.numericValue !== undefined ? `${m.numericValue} ${m.unit || ''}` : m.textValue}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {caseItem && patient && (
                    <Button
                      variant="secondary"
                      size="sm"
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                      onClick={() => handleOpenCaseWorkspace(caseItem.id, patient.id)}
                      className="self-start sm:self-center shrink-0"
                    >
                      Open Case Workspace
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quiet Informational Overview */}
      <div className="bg-[#F6F2EB] border border-[#E5DFD4] rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#3C443E] mb-1.5">
          Stage 6 Architectural Standard
        </h3>
        <p className="text-xs text-[#676E68] leading-relaxed max-w-3xl">
          Progress and outcomes in PhysioCase reflect longitudinal change over time (<strong>What changed?</strong>). They are strictly decoupled from Assessment (<strong>What did we find?</strong>), Treatment Planning (<strong>What do we intend to do?</strong>), and Clinical Sessions (<strong>What actually happened?</strong>).
        </p>
      </div>
    </div>
  );
};
