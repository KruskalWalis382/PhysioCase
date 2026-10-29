import React from 'react';
import { Plus, Users, FolderKanban, CalendarCheck, UserPlus, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClinical } from '../context/ClinicalContext';
import { Button } from '../components/common/Button';
import { ClinicalEmptyState } from '../components/common/ClinicalEmptyState';
import { CaseloadGovernanceOverview } from '../components/clinical/CaseloadGovernanceOverview';
import { useCaseloadGovernance } from '../utils/useCaseloadGovernance';
import { NavigationTab } from '../types';
import { formatClinicalDate } from '../utils/clinicalFormatters';

interface HomeViewProps {
  onNavigate?: (tab: NavigationTab) => void;
  onNavigateToCase?: (caseId: string, patientId: string, section?: string) => void;
  onFilterCases?: (filter: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onNavigateToCase,
  onFilterCases,
}) => {
  const { user } = useAuth();
  const {
    patients,
    cases,
    reviewsTodayCount,
    setIsAddPatientModalOpen,
    setSelectedPatientId,
    setSelectedCaseId,
    getCasesForPatient,
  } = useClinical();

  const { governance } = useCaseloadGovernance();

  // Gentle time-appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name || 'Practitioner';

  const handleOpenPatientHub = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (onNavigate) {
      onNavigate('patients');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Greeting & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#18201C] tracking-tight leading-tight">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-sm text-[#636A64] font-normal leading-relaxed mt-1">
            Welcome to PhysioCase.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            id="home-primary-add-patient-btn"
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddPatientModalOpen(true)}
          >
            + Add your first patient
          </Button>
        </div>
      </div>

      {/* Three Simple Metrics (Clean, understated, not flashy SaaS clutter) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Patients Metric */}
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#686F69]">
              Total Patients
            </span>
            <Users className="w-4 h-4 text-[#686F69]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-[#18201C] tracking-tight">
              {patients.length}
            </span>
            <span className="text-xs text-[#636A64]">Patients</span>
          </div>
        </div>

        {/* Active Cases Metric */}
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#686F69]">
              Active Episodes
            </span>
            <FolderKanban className="w-4 h-4 text-[#686F69]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-[#18201C] tracking-tight">
              {cases.length}
            </span>
            <span className="text-xs text-[#636A64]">Active Cases</span>
          </div>
        </div>

        {/* Reviews Today Metric */}
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#686F69]">
              Scheduled Reviews
            </span>
            <CalendarCheck className="w-4 h-4 text-[#686F69]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-[#18201C] tracking-tight">
              {reviewsTodayCount}
            </span>
            <span className="text-xs text-[#636A64]">Reviews Today</span>
          </div>
        </div>
      </div>

      {/* Caseload & Clinical Governance Overview (Stage 9) */}
      {cases.length > 0 && (
        <CaseloadGovernanceOverview
          governance={governance}
          onOpenCase={(caseId, patientId, targetSection) => {
            if (onNavigateToCase) {
              onNavigateToCase(caseId, patientId, targetSection);
            } else {
              setSelectedPatientId(patientId);
              setSelectedCaseId(caseId);
              if (onNavigate) {
                onNavigate('patients');
              }
            }
          }}
          onViewAllCases={(filter) => {
            if (onFilterCases) {
              onFilterCases(filter || 'all');
            } else if (onNavigate) {
              onNavigate('cases');
            }
          }}
        />
      )}

      {/* Main Workspace Area: Thoughtfully Empty as per instructions */}
      {patients.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl py-12 px-6 shadow-xs">
          <ClinicalEmptyState
            id="home-empty-workspace"
            icon={<UserPlus className="w-6 h-6 text-[#1B3B2B]" />}
            title="Your clinical workspace is empty."
            supportingText="Start with your first patient and build their clinical story from assessment to outcome."
            primaryActionLabel="Add patient"
            onPrimaryAction={() => setIsAddPatientModalOpen(true)}
            note="“Don’t just document what happened. Understand the journey.”"
          />
        </div>
      ) : (
        /* If user created a real patient via the modal, show their clean registered list */
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#18201C]">Recent Patients</h2>
            <Button
              id="home-table-add-patient-btn"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddPatientModalOpen(true)}
            >
              Add patient
            </Button>
          </div>
          <div className="divide-y divide-[#EDE7DE]">
            {patients.map((patient) => {
              const caseCount = getCasesForPatient(patient.id).length;
              return (
                <div
                  key={patient.id}
                  id={`home-patient-row-${patient.id}`}
                  onClick={() => handleOpenPatientHub(patient.id)}
                  className="py-3.5 px-2 hover:bg-[#F7F3EB] rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#18201C] group-hover:text-[#1B3B2B] transition-colors">
                        {patient.fullName}
                      </span>
                      {patient.preferredName && (
                        <span className="text-xs text-[#6B726C]">
                          (&ldquo;{patient.preferredName}&rdquo;)
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                        {patient.patientNumber || 'PC-0001'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EBF2EE] text-[#1B3B2B] font-medium">
                        {patient.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#636A64] mt-0.5">
                      {patient.reasonForVisit}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[#6D746E]">
                      {caseCount} {caseCount === 1 ? 'Case' : 'Cases'}
                    </span>
                    <span className="text-xs text-[#7A817B]">
                      {formatClinicalDate(patient.createdAt)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#8C938D] group-hover:text-[#18201C] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
