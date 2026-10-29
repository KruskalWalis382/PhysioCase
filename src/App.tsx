import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClinicalProvider, useClinical } from './context/ClinicalContext';
import { NavigationTab } from './types';
import { LoginView } from './views/LoginView';
import { HomeView } from './views/HomeView';
import { PatientsView } from './views/PatientsView';
import { PatientHubView } from './views/PatientHubView';
import { CaseWorkspaceView } from './views/CaseWorkspaceView';
import { SubjectiveAssessmentView } from './views/SubjectiveAssessmentView';
import { CasesView, ExtendedCaseFilter } from './views/CasesView';
import { EvidenceKnowledgeView } from './views/EvidenceKnowledgeView';
import { ProgressView } from './views/ProgressView';
import { SettingsView } from './views/SettingsView';
import { AppLayout } from './components/layout/AppLayout';
import { Logo } from './components/common/Logo';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const {
    patients,
    cases,
    selectedPatientId,
    setSelectedPatientId,
    selectedCaseId,
    setSelectedCaseId,
    activeAssessmentCaseId,
    closeSubjectiveAssessment,
  } = useClinical();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [targetCaseSection, setTargetCaseSection] = useState<string | undefined>(undefined);
  const [casesInitialFilter, setCasesInitialFilter] = useState<ExtendedCaseFilter>('all');

  const handleTabSelect = (tab: NavigationTab) => {
    // If user is currently in assessment, close it cleanly on tab navigation
    if (activeAssessmentCaseId) {
      closeSubjectiveAssessment();
    }
    if (tab === 'patients' && currentTab === 'patients') {
      // Clear drill-down if clicking Patients while already on Patients
      setSelectedCaseId(null);
      setSelectedPatientId(null);
    } else if (tab === 'cases' && currentTab === 'cases') {
      setSelectedCaseId(null);
    }
    setCurrentTab(tab);
  };

  const handleNavigateToCase = (
    caseId: string,
    patientId: string,
    section?: string
  ) => {
    if (activeAssessmentCaseId) {
      closeSubjectiveAssessment();
    }
    setSelectedPatientId(patientId);
    setSelectedCaseId(caseId);
    setTargetCaseSection(section);
    setCurrentTab('cases');
  };

  const handleFilterCases = (filter: string) => {
    if (activeAssessmentCaseId) {
      closeSubjectiveAssessment();
    }
    setSelectedCaseId(null);
    if (filter === 'reviews') {
      setCasesInitialFilter('reviews_due');
    } else if (filter === 'stalled') {
      setCasesInitialFilter('stalled');
    } else if (filter === 'documentation') {
      setCasesInitialFilter('doc_gaps');
    } else {
      setCasesInitialFilter('all');
    }
    setCurrentTab('cases');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#FAF8F5] flex flex-col items-center justify-center gap-3 select-none">
        <Logo size="lg" showSubtitle={true} />
        <div className="w-6 h-6 border-2 border-[#1B3B2B] border-t-transparent rounded-full animate-spin mt-4" />
        <p className="text-xs text-[#6E756F] font-medium tracking-wide">
          Initializing clinical workspace...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Selected patient object lookup
  const selectedPatient = selectedPatientId
    ? patients.find((p) => p.id === selectedPatientId)
    : null;

  // Selected case object lookup
  const selectedCase = selectedCaseId
    ? cases.find((c) => c.id === selectedCaseId || c.caseId === selectedCaseId)
    : null;

  // Patient associated with the selected case
  const patientForSelectedCase = selectedCase
    ? patients.find((p) => p.id === selectedCase.patientId) || selectedPatient
    : null;

  // Active Subjective Assessment lookup (if assessment is open)
  const assessmentCase = activeAssessmentCaseId
    ? cases.find((c) => c.id === activeAssessmentCaseId) || selectedCase
    : null;
  const assessmentPatient = assessmentCase
    ? patients.find((p) => p.id === assessmentCase.patientId) || patientForSelectedCase
    : null;

  return (
    <AppLayout currentTab={currentTab} onSelectTab={handleTabSelect}>
      {/* If assessment view is actively opened, show it in the clinical workspace */}
      {activeAssessmentCaseId && assessmentCase && assessmentPatient ? (
        <SubjectiveAssessmentView
          caseItem={assessmentCase}
          patient={assessmentPatient}
          onExit={() => {
            setSelectedCaseId(assessmentCase.id);
            closeSubjectiveAssessment();
          }}
        />
      ) : (
        <>
          {currentTab === 'home' && (
            <HomeView
              onNavigate={handleTabSelect}
              onNavigateToCase={handleNavigateToCase}
              onFilterCases={handleFilterCases}
            />
          )}

          {currentTab === 'patients' && (
            <>
              {selectedCase && patientForSelectedCase ? (
                <CaseWorkspaceView
                  caseItem={selectedCase}
                  patient={patientForSelectedCase}
                  onBackToPatientHub={() => setSelectedCaseId(null)}
                  initialSection={targetCaseSection}
                />
              ) : selectedPatient ? (
                <PatientHubView
                  patient={selectedPatient}
                  onBack={() => setSelectedPatientId(null)}
                  onOpenCase={(c, section) => {
                    setTargetCaseSection(section);
                    setSelectedCaseId(c.id);
                  }}
                />
              ) : (
                <PatientsView />
              )}
            </>
          )}

          {currentTab === 'cases' && (
            <>
              {selectedCase && patientForSelectedCase ? (
                <CaseWorkspaceView
                  caseItem={selectedCase}
                  patient={patientForSelectedCase}
                  initialSection={targetCaseSection}
                  onBackToPatientHub={() => {
                    setSelectedCaseId(null);
                    setTargetCaseSection(undefined);
                    setSelectedPatientId(patientForSelectedCase.id);
                    setCurrentTab('patients');
                  }}
                />
              ) : (
                <CasesView
                  initialFilter={casesInitialFilter}
                  onNavigateToSection={(caseId, patientId, section) => {
                    handleNavigateToCase(caseId, patientId, section);
                  }}
                />
              )}
            </>
          )}

          {currentTab === 'progress' && (
            <ProgressView
              onSelectCase={(caseId, patientId) => {
                setSelectedPatientId(patientId);
                setSelectedCaseId(caseId);
                setCurrentTab('patients');
              }}
            />
          )}
          {currentTab === 'evidence' && <EvidenceKnowledgeView />}
          {currentTab === 'settings' && <SettingsView />}
        </>
      )}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ClinicalProvider>
        <AppContent />
      </ClinicalProvider>
    </AuthProvider>
  );
}
