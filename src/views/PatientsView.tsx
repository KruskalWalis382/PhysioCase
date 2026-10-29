import React, { useState, useMemo } from 'react';
import { Search, Plus, UserPlus, FolderKanban, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { FilterPill } from '../components/common/FilterPill';
import { ClinicalEmptyState } from '../components/common/ClinicalEmptyState';
import { useClinical } from '../context/ClinicalContext';
import { PatientStatus } from '../types';
import { calculateAge, formatClinicalDate } from '../utils/clinicalFormatters';

type FilterType = 'all' | PatientStatus;

export const PatientsView: React.FC = () => {
  const {
    patients,
    setIsAddPatientModalOpen,
    setSelectedPatientId,
    getCasesForPatient,
    openNewCaseModal,
  } = useClinical();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filterOptions = [
    { value: 'all' as FilterType, label: 'All', count: patients.length },
    {
      value: 'active' as FilterType,
      label: 'Active',
      count: patients.filter((p) => p.status === 'active').length,
    },
    {
      value: 'discharged' as FilterType,
      label: 'Discharged',
      count: patients.filter((p) => p.status === 'discharged').length,
    },
  ];

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesFilter = activeFilter === 'all' || patient.status === activeFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.preferredName &&
          patient.preferredName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (patient.patientNumber &&
          patient.patientNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        patient.reasonForVisit.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [patients, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title="Patients"
        supportingText="Select a patient to access their Clinical Hub and manage rehabilitation episodes."
        actions={
          <Button
            id="patients-add-btn"
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddPatientModalOpen(true)}
          >
            Add patient
          </Button>
        }
      />

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
        <div className="w-full sm:max-w-sm">
          <Input
            id="search-patients-input"
            type="search"
            placeholder="Search by name, PC-ID, or complaint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <FilterPill<FilterType>
          idPrefix="patients"
          options={filterOptions}
          activeValue={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {/* Main Patient Content Area */}
      {filteredPatients.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl py-12 px-6 shadow-xs">
          {searchQuery ? (
            <ClinicalEmptyState
              id="patients-no-search-results"
              icon={<Search className="w-6 h-6 text-[#1B3B2B]" />}
              title="No patients match your search."
              supportingText={`No patient records found matching "${searchQuery}". Clear your search term to see all records.`}
              primaryActionLabel="Clear search"
              onPrimaryAction={() => setSearchQuery('')}
            />
          ) : (
            <ClinicalEmptyState
              id="patients-empty-workspace"
              icon={<UserPlus className="w-6 h-6 text-[#1B3B2B]" />}
              title="Your clinical workspace is empty."
              supportingText="Start with your first patient and build their clinical story from assessment to outcome."
              primaryActionLabel="Add patient"
              onPrimaryAction={() => setIsAddPatientModalOpen(true)}
              note="No sample or fictitious patient records are created. Add real patients to begin documentation."
            />
          )}
        </div>
      ) : (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-[#E8E2D9] bg-[#F7F4EE] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#414843] uppercase tracking-wider">
              {filteredPatients.length} Patient{filteredPatients.length === 1 ? '' : 's'}
            </span>
            <span className="text-xs text-[#6B726C]">
              Click any patient to open their Clinical Hub
            </span>
          </div>
          <div className="divide-y divide-[#EDE7DE]">
            {filteredPatients.map((patient) => {
              const casesCount = getCasesForPatient(patient.id).length;
              const age = calculateAge(patient.dateOfBirth);

              return (
                <div
                  key={patient.id}
                  id={`patient-row-${patient.id}`}
                  onClick={() => setSelectedPatientId(patient.id)}
                  className="p-5 hover:bg-[#F7F3EB] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-semibold text-[#18201C] group-hover:text-[#1B3B2B] transition-colors">
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
                      {patient.sex && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#F2EDE5] text-[#555C57]">
                          {patient.sex}
                        </span>
                      )}
                      {age && (
                        <span className="text-xs text-[#636A64]">
                          {age}
                        </span>
                      )}
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          patient.status === 'active'
                            ? 'bg-[#EBF2EE] text-[#1B3B2B]'
                            : 'bg-[#EDE8DE] text-[#69706A]'
                        }`}
                      >
                        {patient.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#525954] flex flex-wrap items-center gap-2">
                      <span>DOB: {formatClinicalDate(patient.dateOfBirth)}</span>
                      {patient.phone && <span>• Phone: {patient.phone}</span>}
                      {patient.email && <span>• Email: {patient.email}</span>}
                    </p>

                    <p className="text-xs text-[#6B726C] italic truncate max-w-xl">
                      Reason: {patient.reasonForVisit}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium ${
                        casesCount > 0
                          ? 'bg-[#E2ECE6] text-[#1B3B2B]'
                          : 'bg-[#EDE8DE] text-[#686F69]'
                      }`}
                    >
                      <FolderKanban className="w-3.5 h-3.5" />
                      <span>
                        {casesCount} Case{casesCount === 1 ? '' : 's'}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNewCaseModal(patient);
                      }}
                      className="text-xs font-medium text-[#1B3B2B] hover:text-[#0E2017] p-1.5 rounded hover:bg-[#EAE4DB] transition-colors cursor-pointer"
                      title="Create a new case for this patient"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

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
