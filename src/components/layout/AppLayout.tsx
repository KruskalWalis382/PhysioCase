import React, { useState } from 'react';
import { NavigationTab } from '../../types';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AddPatientModal } from '../modals/AddPatientModal';
import { CreateCaseModal } from '../modals/CreateCaseModal';
import { EditPatientModal } from '../modals/EditPatientModal';
import { useClinical } from '../../context/ClinicalContext';
import { PanelRightClose, PanelRightOpen, FileText, Info } from 'lucide-react';

interface AppLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const {
    isAddPatientModalOpen,
    setIsAddPatientModalOpen,
    isCreateCaseModalOpen,
    setIsCreateCaseModalOpen,
    activePatientForNewCase,
    isEditPatientModalOpen,
    setIsEditPatientModalOpen,
    activePatientForEdit,
    patients,
    cases,
    selectedPatientId,
    setSelectedPatientId,
    selectedCaseId,
    setSelectedCaseId,
    activeAssessmentCaseId,
    closeSubjectiveAssessment,
  } = useClinical();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Derive active clinical context for breadcrumb hierarchy
  const activePatient = selectedPatientId ? patients.find((p) => p.id === selectedPatientId) : null;
  const activeCase = selectedCaseId
    ? cases.find((c) => c.id === selectedCaseId || c.caseId === selectedCaseId)
    : null;
  const patientForActiveCase = activeCase
    ? patients.find((p) => p.id === activeCase.patientId) || activePatient
    : activePatient;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-[#FAF8F5] text-[#1C221E] overflow-hidden">
      {/* Mobile Top Navigation */}
      <MobileNav currentTab={currentTab} onSelectTab={onSelectTab} />

      {/* Desktop Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        className="hidden lg:flex"
      />

      {/* Main Clinical Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 h-[calc(100vh-57px)] lg:h-screen overflow-y-auto bg-[#FAF8F5]">
        {/* Subtle Workspace Top Context Bar with Streamlined Clinical Breadcrumbs */}
        <div className="hidden lg:flex items-center justify-between px-8 py-3 border-b border-[#EAE4DB] bg-[#FAF8F5]/80 backdrop-blur-xs sticky top-0 z-20">
          <nav className="flex items-center gap-2 text-xs text-[#6E756F]" aria-label="Clinical Breadcrumbs">
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="hover:text-[#18201C] transition-colors cursor-pointer"
            >
              Workspace
            </button>
            <span>/</span>

            {/* If on Patients tab */}
            {currentTab === 'patients' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (activeAssessmentCaseId) closeSubjectiveAssessment();
                    setSelectedCaseId(null);
                    setSelectedPatientId(null);
                  }}
                  className={`hover:text-[#18201C] transition-colors cursor-pointer capitalize ${
                    !activePatient ? 'font-medium text-[#1C221E]' : ''
                  }`}
                >
                  Patients
                </button>

                {activePatient && (
                  <>
                    <span>/</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeAssessmentCaseId) closeSubjectiveAssessment();
                        setSelectedCaseId(null);
                      }}
                      className={`hover:text-[#18201C] transition-colors cursor-pointer font-medium ${
                        !activeCase ? 'text-[#1C221E]' : 'text-[#5D645F]'
                      }`}
                    >
                      {activePatient.fullName}
                    </button>
                  </>
                )}

                {activeCase && (
                  <>
                    <span>/</span>
                    <span
                      className={`font-semibold ${
                        activeAssessmentCaseId ? 'text-[#5D645F]' : 'text-[#1B3B2B]'
                      }`}
                    >
                      {activeCase.caseName}
                    </span>
                  </>
                )}

                {activeAssessmentCaseId && (
                  <>
                    <span>/</span>
                    <span className="font-semibold text-[#1B3B2B]">
                      Subjective Assessment
                    </span>
                  </>
                )}
              </>
            ) : currentTab === 'cases' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (activeAssessmentCaseId) closeSubjectiveAssessment();
                    setSelectedCaseId(null);
                  }}
                  className={`hover:text-[#18201C] transition-colors cursor-pointer capitalize ${
                    !activeCase ? 'font-medium text-[#1C221E]' : ''
                  }`}
                >
                  Cases
                </button>

                {activeCase && (
                  <>
                    <span>/</span>
                    <span className="font-semibold text-[#1B3B2B]">
                      {patientForActiveCase ? `${patientForActiveCase.fullName} — ` : ''}
                      {activeCase.caseName}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="capitalize font-medium text-[#1C221E]">{currentTab}</span>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {/* Contextual Right Panel Toggle (quiet & architectural) */}
            <button
              id="toggle-right-panel-btn"
              type="button"
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#5D645F] hover:text-[#1C221E] hover:bg-[#EFE9DF] rounded-md transition-colors"
              title="Toggle contextual notes & reference panel"
            >
              {isRightPanelOpen ? (
                <>
                  <PanelRightClose className="w-3.5 h-3.5" />
                  <span>Hide Context</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  <span>Clinical Context</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Canvas */}
        <div className="flex-1 p-5 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Contextual Right Panel (Architectural foundation for future clinical reasoning) */}
      {isRightPanelOpen && (
        <aside
          className="hidden xl:flex w-72 h-screen bg-[#F7F4EF] border-l border-[#E5DFD4] flex-col p-5 shrink-0 z-20"
          aria-label="Clinical context reference"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1B3B2B]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2D332F]">
                Clinical Context
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsRightPanelOpen(false)}
              className="text-[#6E756F] hover:text-[#1C221E] p-1 rounded"
              aria-label="Close contextual panel"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          <div className="py-6 flex flex-col items-center justify-center text-center text-[#6D746E] space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#EFEBE3] flex items-center justify-center text-[#1B3B2B] mb-1">
              <Info className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-[#2D332F]">Contextual Assistant Slot</p>
            <p className="text-xs text-[#6D746E] leading-relaxed">
              When reviewing a patient case, diagnostic criteria, clinical tests, and journey stages will appear here.
            </p>
          </div>
        </aside>
      )}

      {/* Global Add Patient Modal */}
      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        onSuccess={() => onSelectTab('patients')}
      />

      {/* Global Create Case Modal */}
      <CreateCaseModal
        isOpen={isCreateCaseModalOpen}
        onClose={() => setIsCreateCaseModalOpen(false)}
        patient={activePatientForNewCase}
      />

      {/* Global Edit Patient Modal */}
      <EditPatientModal
        isOpen={isEditPatientModalOpen}
        onClose={() => setIsEditPatientModalOpen(false)}
        patient={activePatientForEdit}
      />
    </div>
  );
};
