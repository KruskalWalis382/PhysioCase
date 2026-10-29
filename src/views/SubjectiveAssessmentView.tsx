import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  Activity,
  HeartPulse,
  Flame,
  ShieldAlert,
  Shield,
  Plus,
  AlertTriangle,
  Target,
  PenTool,
  Clock,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Layers,
} from 'lucide-react';
import { Patient, Case, SubjectiveAssessment, OnsetType, SymptomFrequency, SafetyScreeningAnswer } from '../types';
import { useClinical } from '../context/ClinicalContext';
import { Button } from '../components/common/Button';
import { PainScaleSelector } from '../components/clinical/assessment/PainScaleSelector';
import { LocationManager } from '../components/clinical/assessment/LocationManager';
import { MultiSelectPills } from '../components/clinical/assessment/MultiSelectPills';
import { formatClinicalDate } from '../utils/clinicalFormatters';
import { PatientSafetyBanner } from '../components/patient/PatientSafetyBanner';
import { EditPatientSafetyModal } from '../components/patient/EditPatientSafetyModal';

interface SubjectiveAssessmentViewProps {
  caseItem: Case;
  patient: Patient;
  onExit: () => void;
}

const SYMPTOM_DESCRIPTIONS = [
  'Aching',
  'Sharp',
  'Burning',
  'Stiff',
  'Tingling',
  'Numbness',
  'Other',
];

const AGGRAVATING_OPTIONS = [
  'Walking',
  'Running',
  'Stairs',
  'Sitting',
  'Standing',
  'Lifting',
  'Movement',
  'Rest',
  'Other',
];

const EASING_OPTIONS = [
  'Rest',
  'Medication',
  'Movement',
  'Position change',
  'Heat/cold',
  'Other',
];

const FUNCTIONAL_DIFFICULTIES = [
  'Walking',
  'Running',
  'Stairs',
  'Sitting',
  'Standing',
  'Sleeping',
  'Work',
  'Self-care',
  'Sport',
  'Household activities',
  'Other',
];

const SECTIONS = [
  { id: 'section-story', label: "Patient's Story", icon: FileText },
  { id: 'section-symptoms', label: 'Symptoms & Onset', icon: Activity },
  { id: 'section-factors', label: 'Aggravating & Easing', icon: Flame },
  { id: 'section-behaviour', label: 'Symptom Behaviour', icon: HeartPulse },
  { id: 'section-history', label: 'Medical History', icon: Calendar },
  { id: 'section-safety', label: 'Safety Screening', icon: ShieldAlert },
  { id: 'section-functional', label: 'Functional Impact', icon: Activity },
  { id: 'section-goals', label: 'Patient Goals', icon: Target },
  { id: 'section-notes', label: "Therapist's Notes", icon: PenTool },
];

export interface FunctionalGroup {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  sectionIds: string[];
}

export const FUNCTIONAL_GROUPS: FunctionalGroup[] = [
  {
    id: 'group-complaint',
    number: 1,
    title: 'Presenting Complaint & History of Present Illness',
    subtitle: 'Patient narrative, symptom locations, onset, and history of present illness',
    sectionIds: ['section-story', 'section-symptoms'],
  },
  {
    id: 'group-behaviour',
    number: 2,
    title: 'Symptom Behaviour & Pain Profile',
    subtitle: 'Aggravating/easing triggers, 24-hr behaviour, pain severity scales, and irritability',
    sectionIds: ['section-factors', 'section-behaviour'],
  },
  {
    id: 'group-medical-safety',
    number: 3,
    title: 'Medical History & Safety Screening',
    subtitle: 'Past medical history, surgical background, medications, and red flag safety',
    sectionIds: ['section-history', 'section-safety'],
  },
  {
    id: 'group-functional-goals',
    number: 4,
    title: 'Functional Impact, Patient Goals & Clinical Notes',
    subtitle: 'Daily activity limitations, meaningful recovery goals, and clinician reflections',
    sectionIds: ['section-functional', 'section-goals', 'section-notes'],
  },
];

export const isSectionDocumentedWithData = (
  sectionId: string,
  data: Partial<SubjectiveAssessment> | null | undefined
): boolean => {
  if (!data) return false;
  switch (sectionId) {
    case 'section-story':
      return !!data.patientStory?.trim();
    case 'section-symptoms':
      return (
        (Array.isArray(data.symptomLocations) && data.symptomLocations.length > 0) ||
        (Array.isArray(data.symptomDescriptions) && data.symptomDescriptions.length > 0) ||
        !!data.symptomDescriptionOther?.trim() ||
        !!data.onset?.trim() ||
        !!data.dateOfOnset?.trim() ||
        !!data.howDidItStart?.trim()
      );
    case 'section-factors':
      return (
        (Array.isArray(data.aggravatingFactors) && data.aggravatingFactors.length > 0) ||
        !!data.aggravatingFactorsNotes?.trim() ||
        (Array.isArray(data.easingFactors) && data.easingFactors.length > 0) ||
        !!data.easingFactorsNotes?.trim()
      );
    case 'section-behaviour':
      return (
        !!data.frequency?.trim() ||
        !!data.durationAfterAggravation?.trim() ||
        (!!data.painSeverity &&
          (data.painSeverity.current > 0 ||
            data.painSeverity.best > 0 ||
            data.painSeverity.worst > 0))
      );
    case 'section-history':
      return (
        !!data.previousSimilarEpisode?.trim() ||
        !!data.previousSurgery?.trim() ||
        !!data.previousInjury?.trim() ||
        !!data.currentMedication?.trim() ||
        !!data.relevantConditions?.trim() ||
        !!data.previousPhysiotherapy?.trim()
      );
    case 'section-safety':
      return (
        !!data.safetyScreening?.trim() ||
        !!data.safetyScreeningDetails?.trim()
      );
    case 'section-functional':
      return (
        (Array.isArray(data.functionalDifficulties) && data.functionalDifficulties.length > 0) ||
        !!data.functionalDifficultiesNotes?.trim() ||
        !!data.mostImportantActivity?.trim()
      );
    case 'section-goals':
      return !!data.patientGoals?.trim();
    case 'section-notes':
      return !!data.therapistInitialNotes?.trim();
    default:
      return false;
  }
};

export const SubjectiveAssessmentView: React.FC<SubjectiveAssessmentViewProps> = ({
  caseItem,
  patient,
  onExit,
}) => {
  const { getSubjectiveAssessment, saveSubjectiveAssessment, patients } = useClinical();

  // Ensure currentPatient is reactive to safety profile updates
  const currentPatient = patients.find((p) => p.id === patient.id) || patient;
  const safetyProfile = currentPatient.patientSafetyProfile;

  // Patient Safety Modal state
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [safetyModalTab, setSafetyModalTab] = useState<
    'allergies' | 'precautions' | 'surgeries' | 'conditions' | 'mobility'
  >('surgeries');

  // Load existing assessment or initialize
  const existingAssessment = getSubjectiveAssessment(caseItem.id);

  const [formData, setFormData] = useState<SubjectiveAssessment>(() => {
    if (existingAssessment) {
      return existingAssessment;
    }
    return {
      id: 'subj_' + Date.now().toString(36),
      caseId: caseItem.id,
      patientId: patient.id,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // A. Patient's Story
      patientStory: '',

      // B. Symptoms
      symptomLocations: [],
      symptomDescriptions: [],
      symptomDescriptionOther: '',
      onset: '',
      dateOfOnset: caseItem.dateOfOnset || '',
      howDidItStart: '',

      // C. Aggravating & Easing Factors
      aggravatingFactors: [],
      aggravatingFactorsNotes: '',
      easingFactors: [],
      easingFactorsNotes: '',

      // D. Symptom Behaviour
      frequency: '',
      painSeverity: {
        current: 0,
        best: 0,
        worst: 0,
      },
      durationAfterAggravation: '',

      // E. Functional Impact
      functionalDifficulties: [],
      functionalDifficultiesNotes: '',
      mostImportantActivity: '',

      // F. Relevant Medical History
      previousSimilarEpisode: '',
      previousSurgery: '',
      previousInjury: '',
      currentMedication: '',
      relevantConditions: '',
      previousPhysiotherapy: '',

      // G. Safety Screening
      safetyScreening: '',
      safetyScreeningDetails: '',

      // H. Patient Goals
      patientGoals: '',

      // I. Therapist's Initial Notes
      therapistInitialNotes: '',
    };
  });

  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [activeNavSection, setActiveNavSection] = useState('section-story');
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);

  // Collapsible Functional Groups state with approved auto-expansion logic:
  // - NEW / EMPTY assessment: Group 1 expanded, Groups 2–4 collapsed
  // - EXISTING assessment: groups containing documented data initially expanded, groups without documented data initially collapsed
  // - After initial rendering: clinician can manually collapse/expand; populated groups must NOT automatically reopen on data change
  // - In-memory only: do not persist expanded/collapsed state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initialData = existingAssessment || formData;
    const hasAnyDocumented = FUNCTIONAL_GROUPS.some((g) =>
      g.sectionIds.some((secId) => isSectionDocumentedWithData(secId, initialData))
    );

    const initial: Record<string, boolean> = {};
    if (!hasAnyDocumented) {
      FUNCTIONAL_GROUPS.forEach((g) => {
        initial[g.id] = g.number !== 1;
      });
    } else {
      FUNCTIONAL_GROUPS.forEach((g) => {
        const hasData = g.sectionIds.some((secId) =>
          isSectionDocumentedWithData(secId, initialData)
        );
        initial[g.id] = !hasData;
      });
    }
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAllGroups = () => {
    setCollapsedGroups({});
  };

  const collapseAllGroups = () => {
    const allCollapsed: Record<string, boolean> = {};
    FUNCTIONAL_GROUPS.forEach((g) => {
      allCollapsed[g.id] = true;
    });
    setCollapsedGroups(allCollapsed);
  };

  const isSectionDocumented = (sectionId: string): boolean => {
    return isSectionDocumentedWithData(sectionId, formData);
  };

  // Auto-clear notification after 4 seconds
  useEffect(() => {
    if (saveFeedback) {
      const timer = setTimeout(() => setSaveFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveFeedback]);

  const handleFieldChange = <K extends keyof SubjectiveAssessment>(
    field: K,
    val: SubjectiveAssessment[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handlePainChange = (metric: 'current' | 'best' | 'worst', val: number) => {
    setFormData((prev) => ({
      ...prev,
      painSeverity: {
        ...prev.painSeverity,
        [metric]: val,
      },
    }));
  };

  const handleSave = (markCompleted: boolean = false) => {
    const updated = saveSubjectiveAssessment(
      caseItem.id,
      patient.id,
      formData,
      markCompleted
    );
    setFormData(updated);

    if (markCompleted) {
      setSaveFeedback('Subjective Assessment marked as Completed • Clinical Threads updated');
    } else {
      setSaveFeedback('Progress saved to Case record');
    }
  };

  const handleSaveAndExit = () => {
    saveSubjectiveAssessment(caseItem.id, patient.id, formData, false);
    onExit();
  };

  const scrollToSection = (sectionId: string) => {
    setActiveNavSection(sectionId);
    const parentGroup = FUNCTIONAL_GROUPS.find((g) => g.sectionIds.includes(sectionId));
    if (parentGroup && collapsedGroups[parentGroup.id]) {
      setCollapsedGroups((prev) => ({ ...prev, [parentGroup.id]: false }));
      setTimeout(() => {
        const elem = document.getElementById(sectionId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
      return;
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper functions for safe, clinician-controlled reference insertion
  const handleInsertSurgery = (surgeryText: string) => {
    const current = (formData.previousSurgery || '').trim();
    if (!current) {
      handleFieldChange('previousSurgery', surgeryText);
    } else if (!current.toLowerCase().includes(surgeryText.toLowerCase())) {
      handleFieldChange('previousSurgery', `${current}, ${surgeryText}`);
    }
  };

  const handleInsertAllSurgeries = () => {
    if (!safetyProfile || safetyProfile.surgicalHistory.length === 0) return;
    const allFormatted = safetyProfile.surgicalHistory.map(
      (s) => `${s.procedure}${s.approximateDateOrYear ? ` (${s.approximateDateOrYear})` : ''}`
    );
    const current = (formData.previousSurgery || '').trim();
    if (!current) {
      handleFieldChange('previousSurgery', allFormatted.join(', '));
    } else {
      const newItems = allFormatted.filter(
        (txt) => !current.toLowerCase().includes(txt.toLowerCase())
      );
      if (newItems.length > 0) {
        handleFieldChange('previousSurgery', `${current}, ${newItems.join(', ')}`);
      }
    }
  };

  const handleInsertCondition = (conditionName: string) => {
    const current = (formData.relevantConditions || '').trim();
    if (!current) {
      handleFieldChange('relevantConditions', conditionName);
    } else if (!current.toLowerCase().includes(conditionName.toLowerCase())) {
      handleFieldChange('relevantConditions', `${current}, ${conditionName}`);
    }
  };

  const handleInsertAllConditions = () => {
    if (!safetyProfile || safetyProfile.persistentMedicalConditions.length === 0) return;
    const activeConditions = safetyProfile.persistentMedicalConditions
      .filter((c) => c.isActive)
      .map((c) => c.conditionName);
    if (activeConditions.length === 0) return;
    const current = (formData.relevantConditions || '').trim();
    if (!current) {
      handleFieldChange('relevantConditions', activeConditions.join(', '));
    } else {
      const newItems = activeConditions.filter(
        (txt) => !current.toLowerCase().includes(txt.toLowerCase())
      );
      if (newItems.length > 0) {
        handleFieldChange('relevantConditions', `${current}, ${newItems.join(', ')}`);
      }
    }
  };

  const isCompleted = formData.status === 'completed';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Clinical Context Header Bar */}
      <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#EAE4DB]">
          <div className="space-y-2">
            <button
              id="assessment-save-exit-top-btn"
              type="button"
              onClick={handleSaveAndExit}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525954] hover:text-[#18201C] transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Save & Exit to Case Workspace</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-[26px] font-semibold text-[#18201C] tracking-tight">
                Subjective Assessment
              </h1>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-medium rounded-full bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Subjective Assessment — Completed</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB]">
                  Draft • In Progress
                </span>
              )}
            </div>

            <p className="text-xs text-[#525954]">
              Let's understand the patient's story before examining them.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              id="assessment-save-draft-btn"
              variant="secondary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              onClick={() => handleSave(false)}
            >
              Save Draft
            </Button>
            <Button
              id="assessment-save-completed-btn"
              variant={isCompleted ? 'secondary' : 'primary'}
              size="sm"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={() => handleSave(true)}
            >
              {isCompleted ? 'Update Completed Record' : 'Save & Mark Completed'}
            </Button>
            <Button
              id="assessment-save-exit-action-btn"
              variant="ghost"
              size="sm"
              onClick={handleSaveAndExit}
            >
              Save & Exit
            </Button>
          </div>
        </div>

        {/* Clinical Patient & Episode Identifiers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#F4EFEB] p-3.5 rounded-lg border border-[#E8E2D8]">
          <div className="space-y-0.5">
            <span className="text-[#6D746F] text-[11px] font-medium">Patient</span>
            <p className="font-semibold text-[#1A221E] truncate">
              {patient.fullName}
            </p>
            <span className="text-[10px] font-mono text-[#7D847F]">
              {patient.patientNumber || 'PC-0001'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[#6D746F] text-[11px] font-medium">Case Episode</span>
            <p className="font-semibold text-[#1A221E] truncate">
              {caseItem.caseName}
            </p>
            <span className="text-[10px] font-mono text-[#7D847F]">
              {caseItem.caseId}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[#6D746F] text-[11px] font-medium">Episode Status</span>
            <p className="font-medium text-[#1B3B2B]">
              {caseItem.status}
            </p>
            <span className="text-[10px] text-[#7D847F]">
              Started {formatClinicalDate(caseItem.startDate)}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[#6D746F] text-[11px] font-medium">Last Saved</span>
            <p className="font-medium text-[#3A413C]">
              {formData.updatedAt
                ? new Date(formData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Not saved yet'}
            </p>
            <span className="text-[10px] text-[#7D847F]">
              {isCompleted ? 'Marked complete' : 'Work in progress'}
            </span>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {saveFeedback && (
          <div
            id="assessment-save-feedback"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-[#E2ECE6] border border-[#BDD1C6] text-xs font-medium text-[#1B3B2B] animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveFeedback}</span>
            </div>
            {isCompleted && (
              <button
                type="button"
                onClick={onExit}
                className="text-xs font-semibold text-[#1B3B2B] hover:underline self-start sm:self-auto cursor-pointer"
              >
                Return to Case to View Clinical Threads &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Section Navigation + Clinical Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Section Navigator */}
        <aside className="lg:col-span-3 sticky top-4 space-y-3">
          <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-4 shadow-xs space-y-3">
            <div className="border-b border-[#EAE4DB] pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#555C56]">
                Sections
              </span>
              <p className="text-[11px] text-[#727974] mt-0.5">
                Navigate freely between clinical sections
              </p>
            </div>

            <nav className="space-y-1" aria-label="Assessment section navigation">
              {SECTIONS.map((sec, idx) => {
                const Icon = sec.icon;
                const isActive = activeNavSection === sec.id;
                const isDoc = isSectionDocumented(sec.id);

                return (
                  <button
                    key={sec.id}
                    id={`nav-link-${sec.id}`}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#1B3B2B] text-[#FAF8F5] font-semibold'
                        : 'text-[#3E4540] hover:bg-[#F2ECE3] hover:text-[#18201C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={`text-[10px] font-mono ${isActive ? 'text-[#FAF8F5]/80' : 'text-[#848B85]'}`}>
                        {idx + 1}.
                      </span>
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sec.label}</span>
                      {isDoc && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? 'bg-[#FAF8F5]' : 'bg-[#1B3B2B]'
                          }`}
                          title="Section documented"
                        />
                      )}
                    </div>
                    {isActive && <ChevronRight className="w-3 h-3 shrink-0 ml-1 opacity-80" />}
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-[#EAE4DB] space-y-2">
              <Button
                id="sidebar-save-draft-btn"
                variant="secondary"
                size="sm"
                className="w-full"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                onClick={() => handleSave(false)}
              >
                Save Draft
              </Button>
              <Button
                id="sidebar-mark-completed-btn"
                variant={isCompleted ? 'secondary' : 'primary'}
                size="sm"
                className="w-full"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => handleSave(true)}
              >
                {isCompleted ? 'Update Record' : 'Mark Completed'}
              </Button>
            </div>
          </div>

          {/* Next Stage Teaser */}
          <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-4 shadow-xs space-y-2 text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6D746F]">
              Subsequent Stage
            </span>
            <div className="flex items-center gap-2 text-[#18201C] font-medium">
              <Stethoscope className="w-4 h-4 text-[#1B3B2B]" />
              <span>Next: Objective Assessment</span>
            </div>
            <p className="text-[11px] text-[#6E756F] leading-relaxed">
              Physical testing, ROM, strength, and palpation will follow subjective documentation.
            </p>
            <button
              id="sidebar-objective-teaser-btn"
              type="button"
              onClick={() => setIsObjectiveModalOpen(true)}
              className="text-xs font-semibold text-[#1B3B2B] hover:underline cursor-pointer inline-flex items-center gap-1 pt-1"
            >
              <span>View Objective Stage Info</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* Right Assessment Form Sections */}
        <div className="lg:col-span-9 space-y-6">
          {/* Patient Safety Banner: Contextual Visibility during Assessment */}
          <PatientSafetyBanner
            id="subjective-patient-safety-banner"
            patient={currentPatient}
            compactDefault={true}
            onOpenEditModal={(tab) => {
              setSafetyModalTab(tab || 'allergies');
              setIsSafetyModalOpen(true);
            }}
          />

          {/* Functional Groups Header Bar with Expand / Collapse All */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl shadow-2xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1B3B2B]" />
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2C332E]">
                Assessment Functional Sections
              </span>
              <span className="text-[11px] text-[#7A817B]">
                (4 Clinical Groups)
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
              <button
                id="expand-all-groups-btn"
                type="button"
                onClick={expandAllGroups}
                className="font-semibold text-[#1B3B2B] hover:underline cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-[#CAD0CB]">•</span>
              <button
                id="collapse-all-groups-btn"
                type="button"
                onClick={collapseAllGroups}
                className="font-medium text-[#636A64] hover:text-[#18201C] hover:underline cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Group 1: Presenting Complaint & History of Present Illness */}
          <div id="functional-group-complaint" className="space-y-4">
            <div
              id="header-group-complaint"
              className="flex items-center justify-between cursor-pointer select-none p-3.5 sm:p-4 bg-[#F5F1EB] hover:bg-[#EFE9DF] rounded-xl border border-[#E3DDD2] transition-colors"
              onClick={() => toggleGroup('group-complaint')}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center font-bold text-xs border border-[#BDD1C6] shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#18201C] flex items-center gap-2">
                    <span>Presenting Complaint & History of Present Illness</span>
                    {FUNCTIONAL_GROUPS[0].sectionIds.filter(isSectionDocumented).length === FUNCTIONAL_GROUPS[0].sectionIds.length && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B3B2B] bg-[#E2ECE6] px-1.5 py-0.5 rounded-full">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Complete</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#636A64]">
                    Patient narrative, symptom locations, onset, and history of present illness
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium text-[#636A64]">
                  {FUNCTIONAL_GROUPS[0].sectionIds.filter(isSectionDocumented).length} of {FUNCTIONAL_GROUPS[0].sectionIds.length} documented
                </span>
                <button
                  id="toggle-group-complaint-btn"
                  type="button"
                  className="p-1 rounded-md text-[#636A64] hover:bg-[#EAE4DB] hover:text-[#18201C] transition-colors cursor-pointer"
                  aria-label={collapsedGroups['group-complaint'] ? 'Expand Group 1' : 'Collapse Group 1'}
                >
                  {collapsedGroups['group-complaint'] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!collapsedGroups['group-complaint'] && (
              <div className="space-y-6 pt-1">
                {/* Section A: Patient's Story */}
                <section
            id="section-story"
            className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4 scroll-mt-6"
          >
            <div className="border-b border-[#EAE4DB] pb-3">
              <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>Section A • Patient's Story</span>
              </div>
              <h2 className="text-base font-semibold text-[#18201C] mt-1">
                What brings the patient here?
              </h2>
              <p className="text-xs text-[#525954] mt-0.5">
                Capture the patient's story in their own words where possible.
              </p>
            </div>

            <div>
              <textarea
                id="assessment-patient-story-input"
                rows={5}
                value={formData.patientStory}
                onChange={(e) => handleFieldChange('patientStory', e.target.value)}
                placeholder="Describe why the patient is seeking care, their narrative of onset, and how this symptom impacts their daily life in their own words..."
                className="w-full p-3.5 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F] leading-relaxed"
              />
            </div>
          </section>

          {/* Section B: Symptoms */}
          <section
            id="section-symptoms"
            className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-5 scroll-mt-6"
          >
            <div className="border-b border-[#EAE4DB] pb-3">
              <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                <Activity className="w-4 h-4" />
                <span>Section B • Symptoms</span>
              </div>
              <h2 className="text-base font-semibold text-[#18201C] mt-1">
                Symptom Characteristics & Onset
              </h2>
            </div>

            {/* Symptom location */}
            <LocationManager
              locations={formData.symptomLocations}
              onChange={(locations) => handleFieldChange('symptomLocations', locations)}
            />

            {/* Symptom description */}
            <div className="space-y-2 pt-2 border-t border-[#EAE4DB]">
              <label className="text-xs font-semibold text-[#2C332E]">
                Symptom Description
              </label>
              <p className="text-[11px] text-[#6E756F]">
                Select all descriptive sensations reported by the patient:
              </p>
              <MultiSelectPills
                options={SYMPTOM_DESCRIPTIONS}
                selected={formData.symptomDescriptions}
                onChange={(selected) => handleFieldChange('symptomDescriptions', selected)}
                idPrefix="symptom-desc"
              />

              {/* Optional text field for additional description */}
              <div className="pt-2">
                <input
                  id="assessment-symptom-desc-other"
                  type="text"
                  value={formData.symptomDescriptionOther || ''}
                  onChange={(e) => handleFieldChange('symptomDescriptionOther', e.target.value)}
                  placeholder="Additional or specific description (e.g. deep dull ache behind patella, shooting sensation with twisting)..."
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>
            </div>

            {/* Onset */}
            <div className="space-y-4 pt-3 border-t border-[#EAE4DB]">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#2C332E]">
                  Onset
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['Sudden', 'Gradual', 'Unknown'] as OnsetType[]).map((mode) => {
                    const isSelected = formData.onset === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        id={`onset-mode-${mode.toLowerCase()}`}
                        onClick={() => handleFieldChange('onset', isSelected ? '' : mode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#1B3B2B] text-[#FAF8F5] border border-[#1B3B2B] shadow-xs'
                            : 'bg-[#F4EFEB] text-[#3E4540] border border-[#DDD6CB] hover:bg-[#EAE4DA]'
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="assessment-date-of-onset"
                    className="text-xs font-semibold text-[#2C332E]"
                  >
                    Date of Onset
                  </label>
                  <input
                    id="assessment-date-of-onset"
                    type="date"
                    value={formData.dateOfOnset || ''}
                    onChange={(e) => handleFieldChange('dateOfOnset', e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label
                    htmlFor="assessment-how-did-it-start"
                    className="text-xs font-semibold text-[#2C332E]"
                  >
                    How did it start?
                  </label>
                  <input
                    id="assessment-how-did-it-start"
                    type="text"
                    value={formData.howDidItStart || ''}
                    onChange={(e) => handleFieldChange('howDidItStart', e.target.value)}
                    placeholder="e.g. Awoke with stiffness after 10k run, slipped on wet pavement, insidious onset over 3 months..."
                    className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                  />
                </div>
              </div>
            </div>
          </section>
              </div>
            )}
          </div>

          {/* Group 2: Symptom Behaviour & Pain Profile */}
          <div id="functional-group-behaviour" className="space-y-4">
            <div
              id="header-group-behaviour"
              className="flex items-center justify-between cursor-pointer select-none p-3.5 sm:p-4 bg-[#F5F1EB] hover:bg-[#EFE9DF] rounded-xl border border-[#E3DDD2] transition-colors"
              onClick={() => toggleGroup('group-behaviour')}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center font-bold text-xs border border-[#BDD1C6] shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#18201C] flex items-center gap-2">
                    <span>Symptom Behaviour & Pain Profile</span>
                    {FUNCTIONAL_GROUPS[1].sectionIds.filter(isSectionDocumented).length === FUNCTIONAL_GROUPS[1].sectionIds.length && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B3B2B] bg-[#E2ECE6] px-1.5 py-0.5 rounded-full">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Complete</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#636A64]">
                    Aggravating/easing triggers, 24-hr behaviour, pain severity scales, and irritability
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium text-[#636A64]">
                  {FUNCTIONAL_GROUPS[1].sectionIds.filter(isSectionDocumented).length} of {FUNCTIONAL_GROUPS[1].sectionIds.length} documented
                </span>
                <button
                  id="toggle-group-behaviour-btn"
                  type="button"
                  className="p-1 rounded-md text-[#636A64] hover:bg-[#EAE4DB] hover:text-[#18201C] transition-colors cursor-pointer"
                  aria-label={collapsedGroups['group-behaviour'] ? 'Expand Group 2' : 'Collapse Group 2'}
                >
                  {collapsedGroups['group-behaviour'] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!collapsedGroups['group-behaviour'] && (
              <div className="space-y-6 pt-1">
                {/* Section C: Aggravating and Easing Factors */}
                <section
            id="section-factors"
            className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-5 scroll-mt-6"
          >
            <div className="border-b border-[#EAE4DB] pb-3">
              <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                <Flame className="w-4 h-4" />
                <span>Section C • Modifying Factors</span>
              </div>
              <h2 className="text-base font-semibold text-[#18201C] mt-1">
                Aggravating and Easing Factors
              </h2>
            </div>

            {/* What makes it worse? */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2C332E]">
                What makes the symptom worse?
              </label>
              <p className="text-[11px] text-[#6E756F]">
                Structured selections for mechanical and daily triggers:
              </p>
              <MultiSelectPills
                options={AGGRAVATING_OPTIONS}
                selected={formData.aggravatingFactors}
                onChange={(selected) => handleFieldChange('aggravatingFactors', selected)}
                idPrefix="aggravating-factor"
              />
              <div className="pt-1.5">
                <input
                  id="assessment-aggravating-notes"
                  type="text"
                  value={formData.aggravatingFactorsNotes || ''}
                  onChange={(e) => handleFieldChange('aggravatingFactorsNotes', e.target.value)}
                  placeholder="Additional aggravating details or unlisted factors (e.g. descending stairs worse than ascending, sitting > 30 mins)..."
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>
            </div>

            {/* What makes it better? */}
            <div className="space-y-2 pt-3 border-t border-[#EAE4DB]">
              <label className="text-xs font-semibold text-[#2C332E]">
                What makes it better?
              </label>
              <p className="text-[11px] text-[#6E756F]">
                Easing positions, therapies, and relief strategies:
              </p>
              <MultiSelectPills
                options={EASING_OPTIONS}
                selected={formData.easingFactors}
                onChange={(selected) => handleFieldChange('easingFactors', selected)}
                idPrefix="easing-factor"
              />
              <div className="pt-1.5">
                <input
                  id="assessment-easing-notes"
                  type="text"
                  value={formData.easingFactorsNotes || ''}
                  onChange={(e) => handleFieldChange('easingFactorsNotes', e.target.value)}
                  placeholder="Additional easing details (e.g. lying supine with knees bent, gentle walking warms it up)..."
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>
            </div>
          </section>

          {/* Section D: Symptom Behaviour */}
          <section
            id="section-behaviour"
            className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-6 scroll-mt-6"
          >
            <div className="border-b border-[#EAE4DB] pb-3">
              <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                <HeartPulse className="w-4 h-4" />
                <span>Section D • Behaviour</span>
              </div>
              <h2 className="text-base font-semibold text-[#18201C] mt-1">
                Symptom Behaviour & Severity
              </h2>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2C332E]">
                Frequency
              </label>
              <div className="flex gap-2.5">
                {(['Constant', 'Intermittent'] as SymptomFrequency[]).map((freq) => {
                  const isSelected = formData.frequency === freq;
                  return (
                    <button
                      key={freq}
                      type="button"
                      id={`freq-${freq.toLowerCase()}`}
                      onClick={() => handleFieldChange('frequency', isSelected ? '' : freq)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1B3B2B] text-[#FAF8F5] border border-[#1B3B2B] shadow-xs'
                          : 'bg-[#F4EFEB] text-[#3E4540] border border-[#DDD6CB] hover:bg-[#EAE4DA]'
                      }`}
                    >
                      {freq}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pain / Severity Scales */}
            <div className="space-y-4 pt-3 border-t border-[#EAE4DB]">
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-[#18201C]">
                  Pain / Severity (0–10 Numerical Rating Scale)
                </h3>
                <p className="text-[11px] text-[#6E756F]">
                  Assess the patient's subjective perception across current, best, and worst states.
                </p>
              </div>

              <div className="space-y-4 bg-[#F5F0E8] p-4 rounded-xl border border-[#DFD8CC]">
                <PainScaleSelector
                  label="Current Pain / Severity"
                  value={formData.painSeverity.current}
                  onChange={(val) => handlePainChange('current', val)}
                  description="Pain level experienced at this exact moment in clinic."
                />

                <div className="border-t border-[#DED6C8] pt-3">
                  <PainScaleSelector
                    label="Best Pain / Severity (Past 24-48 hours)"
                    value={formData.painSeverity.best}
                    onChange={(val) => handlePainChange('best', val)}
                    description="Lowest pain level reached during the best period recently."
                  />
                </div>

                <div className="border-t border-[#DED6C8] pt-3">
                  <PainScaleSelector
                    label="Worst Pain / Severity (Past 24-48 hours)"
                    value={formData.painSeverity.worst}
                    onChange={(val) => handlePainChange('worst', val)}
                    description="Highest pain peak experienced under maximum provocation."
                  />
                </div>
              </div>
            </div>

            {/* Duration after aggravation */}
            <div className="space-y-1.5 pt-2 border-t border-[#EAE4DB]">
              <label
                htmlFor="assessment-duration-aggravation"
                className="text-xs font-semibold text-[#2C332E]"
              >
                How long do symptoms usually last after being aggravated?
              </label>
              <input
                id="assessment-duration-aggravation"
                type="text"
                value={formData.durationAfterAggravation || ''}
                onChange={(e) => handleFieldChange('durationAfterAggravation', e.target.value)}
                placeholder="e.g. Settles within 2-3 minutes of resting; Takes 2 hours to return to baseline; Throbs overnight..."
                className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
              />
            </div>
          </section>
              </div>
            )}
          </div>

          {/* Group 3: Medical History & Safety Screening */}
          <div id="functional-group-medical-safety" className="space-y-4">
            <div
              id="header-group-medical-safety"
              className="flex items-center justify-between cursor-pointer select-none p-3.5 sm:p-4 bg-[#F5F1EB] hover:bg-[#EFE9DF] rounded-xl border border-[#E3DDD2] transition-colors"
              onClick={() => toggleGroup('group-medical-safety')}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center font-bold text-xs border border-[#BDD1C6] shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#18201C] flex items-center gap-2">
                    <span>Medical History & Safety Screening</span>
                    {FUNCTIONAL_GROUPS[2].sectionIds.filter(isSectionDocumented).length === FUNCTIONAL_GROUPS[2].sectionIds.length && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B3B2B] bg-[#E2ECE6] px-1.5 py-0.5 rounded-full">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Complete</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#636A64]">
                    Past medical history, surgical background, medications, and red flag safety
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium text-[#636A64]">
                  {FUNCTIONAL_GROUPS[2].sectionIds.filter(isSectionDocumented).length} of {FUNCTIONAL_GROUPS[2].sectionIds.length} documented
                </span>
                <button
                  id="toggle-group-medical-safety-btn"
                  type="button"
                  className="p-1 rounded-md text-[#636A64] hover:bg-[#EAE4DB] hover:text-[#18201C] transition-colors cursor-pointer"
                  aria-label={collapsedGroups['group-medical-safety'] ? 'Expand Group 3' : 'Collapse Group 3'}
                >
                  {collapsedGroups['group-medical-safety'] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!collapsedGroups['group-medical-safety'] && (
              <div className="space-y-6 pt-1">
                {/* Section E: Relevant Medical History */}
                <section
            id="section-history"
            className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4 scroll-mt-6"
          >
            <div className="border-b border-[#EAE4DB] pb-3">
              <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>Section E • Medical History</span>
              </div>
              <h2 className="text-base font-semibold text-[#18201C] mt-1">
                Relevant Medical History
              </h2>
              <p className="text-xs text-[#525954] mt-0.5">
                Optional contextual history. Complete any fields pertinent to this clinical presentation.
              </p>
            </div>

            {/* Contextual Patient Safety Profile Reference Card */}
            {safetyProfile && (safetyProfile.surgicalHistory.length > 0 || safetyProfile.persistentMedicalConditions.length > 0 || safetyProfile.allergies.length > 0 || safetyProfile.persistentPrecautions.length > 0) && (
              <div
                id="safety-profile-context-box"
                className="p-3.5 rounded-xl bg-[#F6F3ED] border border-[#DDD6CB] space-y-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[#18201C]">
                    <Shield className="w-4 h-4 text-[#1B3B2B]" />
                    <span>Patient Safety Profile Reference</span>
                    <span className="text-[10px] font-normal text-[#6E756F]">
                      (Persistent clinical records across episodes)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSafetyModalTab('surgeries');
                      setIsSafetyModalOpen(true);
                    }}
                    className="text-[11px] text-[#1B3B2B] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Profile</span>
                  </button>
                </div>

                {/* Surgeries Reference */}
                {safetyProfile.surgicalHistory.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#353D37]">
                        Documented Surgeries ({safetyProfile.surgicalHistory.length}):
                      </span>
                      <button
                        type="button"
                        id="insert-all-surgeries-btn"
                        onClick={handleInsertAllSurgeries}
                        className="text-[10px] text-[#1B3B2B] font-semibold hover:underline cursor-pointer"
                      >
                        + Insert all into Previous Surgery
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {safetyProfile.surgicalHistory.map((surg) => {
                        const surgText = `${surg.procedure}${surg.approximateDateOrYear ? ` (${surg.approximateDateOrYear})` : ''}`;
                        const isInNote = (formData.previousSurgery || '').toLowerCase().includes(surg.procedure.toLowerCase());
                        return (
                          <button
                            key={surg.id}
                            type="button"
                            onClick={() => handleInsertSurgery(surgText)}
                            title={isInNote ? 'Already in note' : 'Click to insert into Previous Surgery note'}
                            className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                              isInNote
                                ? 'bg-[#E3EEE7] text-[#1B3B2B] border-[#CAD8D0]'
                                : 'bg-[#FFFFFF] text-[#2C332E] border-[#D5CDC1] hover:border-[#1B3B2B] hover:bg-[#FAF8F5]'
                            }`}
                          >
                            {isInNote ? <Check className="w-3 h-3 text-[#1B3B2B]" /> : <Plus className="w-3 h-3 text-[#6E756F]" />}
                            <span className="font-medium">{surgText}</span>
                            {isInNote && <span className="text-[9px] text-[#1B3B2B] font-medium">(in note)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Medical Conditions Reference */}
                {safetyProfile.persistentMedicalConditions.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#E8E2D8]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#353D37]">
                        Persistent Medical Conditions ({safetyProfile.persistentMedicalConditions.length}):
                      </span>
                      <button
                        type="button"
                        id="insert-all-conditions-btn"
                        onClick={handleInsertAllConditions}
                        className="text-[10px] text-[#1B3B2B] font-semibold hover:underline cursor-pointer"
                      >
                        + Insert active into Relevant Conditions
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {safetyProfile.persistentMedicalConditions.map((cond) => {
                        const isInNote = (formData.relevantConditions || '').toLowerCase().includes(cond.conditionName.toLowerCase());
                        return (
                          <button
                            key={cond.id}
                            type="button"
                            onClick={() => handleInsertCondition(cond.conditionName)}
                            title={isInNote ? 'Already in note' : 'Click to insert into Relevant Conditions note'}
                            className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                              isInNote
                                ? 'bg-[#E3EEE7] text-[#1B3B2B] border-[#CAD8D0]'
                                : 'bg-[#FFFFFF] text-[#2C332E] border-[#D5CDC1] hover:border-[#1B3B2B] hover:bg-[#FAF8F5]'
                            }`}
                          >
                            {isInNote ? <Check className="w-3 h-3 text-[#1B3B2B]" /> : <Plus className="w-3 h-3 text-[#6E756F]" />}
                            <span className="font-medium">{cond.conditionName}</span>
                            {cond.isActive && <span className="text-[9px] text-[#1B3B2B] font-semibold">(Active)</span>}
                            {isInNote && <span className="text-[9px] text-[#1B3B2B] font-medium">(in note)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Persistent Precautions & Allergies Alert Badges */}
                {(safetyProfile.allergies.length > 0 || safetyProfile.persistentPrecautions.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E8E2D8] text-[11px] text-[#555C56]">
                    {safetyProfile.allergies.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5] font-medium text-[10px]">
                        <Shield className="w-3 h-3" />
                        <span>Allergies: {safetyProfile.allergies.map((a) => a.allergen).join(', ')}</span>
                      </span>
                    )}
                    {safetyProfile.persistentPrecautions.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF3E2] text-[#92400E] border border-[#FDE68A] font-medium text-[10px]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Precautions: {safetyProfile.persistentPrecautions.map((p) => p.precaution).join(', ')}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="history-previous-similar-episode"
                  className="text-xs font-semibold text-[#2C332E]"
                >
                  Previous similar episode
                </label>
                <input
                  id="history-previous-similar-episode"
                  type="text"
                  value={formData.previousSimilarEpisode || ''}
                  onChange={(e) => handleFieldChange('previousSimilarEpisode', e.target.value)}
                  placeholder="e.g. Similar episode 2 years ago, resolved in 4 weeks"
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="history-previous-surgery"
                  className="text-xs font-semibold text-[#2C332E]"
                >
                  Previous surgery
                </label>
                <input
                  id="history-previous-surgery"
                  type="text"
                  value={formData.previousSurgery || ''}
                  onChange={(e) => handleFieldChange('previousSurgery', e.target.value)}
                  placeholder="e.g. Right knee arthroscopy 2018, appendectomy 2010"
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="history-previous-injury"
                  className="text-xs font-semibold text-[#2C332E]"
                >
                  Previous injury
                </label>
                <input
                  id="history-previous-injury"
                  type="text"
                  value={formData.previousInjury || ''}
                  onChange={(e) => handleFieldChange('previousInjury', e.target.value)}
                  placeholder="e.g. Right lateral ankle sprain 2021"
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="history-current-medication"
                  className="text-xs font-semibold text-[#2C332E]"
                >
                  Current medication
                </label>
                <input
                  id="history-current-medication"
                  type="text"
                  value={formData.currentMedication || ''}
                  onChange={(e) => handleFieldChange('currentMedication', e.target.value)}
                  placeholder="e.g. Ibuprofen 400mg PRN, Paracetamol 1g, Blood pressure med"
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="history-relevant-conditions"
                  className="text-xs font-semibold text-[#2C332E]"
                >
                  Relevant medical history / conditions
                </label>
                <input
                  id="history-relevant-conditions"
                  type="text"
                  value={formData.relevantConditions || ''}
                  onChange={(e) => handleFieldChange('relevantConditions', e.target.value)}
                  placeholder="e.g. Type 2 Diabetes, Osteoarthritis, Asthma, Cardiovascular history"
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="history-previous-physio"
                  className="text-xs font-semibold text-[#2C332E]"
                >
                  Previous physiotherapy
                </label>
                <input
                  id="history-previous-physio"
                  type="text"
                  value={formData.previousPhysiotherapy || ''}
                  onChange={(e) => handleFieldChange('previousPhysiotherapy', e.target.value)}
                  placeholder="e.g. 6 sessions in 2022 for lumbar strain with good exercise compliance"
                  className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                />
              </div>
            </div>
          </section>

          {/* Section G: Safety Screening */}
          <section
            id="section-safety"
            className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4 scroll-mt-6"
          >
            <div className="border-b border-[#EAE4DB] pb-3">
              <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Section F • Safety Screening</span>
              </div>
              <h2 className="text-base font-semibold text-[#18201C] mt-1">
                Safety Screening
              </h2>
            </div>

            <div className="space-y-3">
              {/* Contextual Persistent Precautions / Allergies Reminder */}
              {safetyProfile && (safetyProfile.persistentPrecautions.length > 0 || safetyProfile.allergies.length > 0) && (
                <div
                  id="section-safety-profile-precautions-alert"
                  className="p-3 rounded-lg bg-[#FEF3E2] border border-[#FDE68A] text-xs text-[#92400E] space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Documented Persistent Safety Records to Consider:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#78350F] pl-1">
                    {safetyProfile.persistentPrecautions.map((p) => (
                      <li key={p.id}>
                        <strong>Precaution:</strong> {p.precaution} ({p.details || p.category})
                      </li>
                    ))}
                    {safetyProfile.allergies.map((a) => (
                      <li key={a.id}>
                        <strong>Allergy:</strong> {a.allergen} — {a.reactionType} ({a.severity})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs font-medium text-[#2C332E] leading-relaxed">
                Are there any symptoms, medical history or circumstances that may require further medical assessment?
              </p>

              {/* Options: Yes, No, Unsure */}
              <div className="flex flex-wrap gap-2.5">
                {(['Yes', 'No', 'Unsure'] as SafetyScreeningAnswer[]).map((ans) => {
                  const isSelected = formData.safetyScreening === ans;
                  return (
                    <button
                      key={ans}
                      type="button"
                      id={`safety-option-${ans.toLowerCase()}`}
                      onClick={() =>
                        handleFieldChange('safetyScreening', isSelected ? '' : ans)
                      }
                      className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        isSelected
                          ? ans === 'Yes'
                            ? 'bg-[#8F2D26] text-[#FAF8F5] border border-[#8F2D26] shadow-xs'
                            : ans === 'Unsure'
                            ? 'bg-[#B06B1A] text-[#FAF8F5] border border-[#B06B1A] shadow-xs'
                            : 'bg-[#1B3B2B] text-[#FAF8F5] border border-[#1B3B2B] shadow-xs'
                          : 'bg-[#F4EFEB] text-[#3E4540] border border-[#DDD6CB] hover:bg-[#EAE4DA]'
                      }`}
                    >
                      {ans}
                    </button>
                  );
                })}
              </div>

              {/* Reveal "Tell us more" when Yes or Unsure */}
              {(formData.safetyScreening === 'Yes' || formData.safetyScreening === 'Unsure') && (
                <div className="pt-2 animate-in fade-in duration-150 space-y-1.5">
                  <label
                    htmlFor="safety-tell-us-more"
                    className="text-xs font-semibold text-[#2C332E] flex items-center gap-1.5"
                  >
                    <span>Tell us more</span>
                    <span className="text-[10px] font-normal text-[#6E756F]">
                      (Clinical documentation note)
                    </span>
                  </label>
                  <textarea
                    id="safety-tell-us-more"
                    rows={3}
                    value={formData.safetyScreeningDetails || ''}
                    onChange={(e) => handleFieldChange('safetyScreeningDetails', e.target.value)}
                    placeholder="Document specific red flags, systemic symptoms, unexplained weight loss, night pain, neurological deficits, or external medical referral considerations..."
                    className="w-full p-3 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F] leading-relaxed"
                  />
                </div>
              )}
            </div>
          </section>
              </div>
            )}
          </div>

          {/* Group 4: Functional Impact, Patient Goals & Clinical Notes */}
          <div id="functional-group-functional-goals" className="space-y-4">
            <div
              id="header-group-functional-goals"
              className="flex items-center justify-between cursor-pointer select-none p-3.5 sm:p-4 bg-[#F5F1EB] hover:bg-[#EFE9DF] rounded-xl border border-[#E3DDD2] transition-colors"
              onClick={() => toggleGroup('group-functional-goals')}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center font-bold text-xs border border-[#BDD1C6] shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#18201C] flex items-center gap-2">
                    <span>Functional Impact, Patient Goals & Clinical Notes</span>
                    {FUNCTIONAL_GROUPS[3].sectionIds.filter(isSectionDocumented).length === FUNCTIONAL_GROUPS[3].sectionIds.length && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B3B2B] bg-[#E2ECE6] px-1.5 py-0.5 rounded-full">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Complete</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#636A64]">
                    Daily activity limitations, meaningful recovery goals, and clinician reflections
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium text-[#636A64]">
                  {FUNCTIONAL_GROUPS[3].sectionIds.filter(isSectionDocumented).length} of {FUNCTIONAL_GROUPS[3].sectionIds.length} documented
                </span>
                <button
                  id="toggle-group-functional-goals-btn"
                  type="button"
                  className="p-1 rounded-md text-[#636A64] hover:bg-[#EAE4DB] hover:text-[#18201C] transition-colors cursor-pointer"
                  aria-label={collapsedGroups['group-functional-goals'] ? 'Expand Group 4' : 'Collapse Group 4'}
                >
                  {collapsedGroups['group-functional-goals'] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!collapsedGroups['group-functional-goals'] && (
              <div className="space-y-6 pt-1">
                {/* Section G: Functional Impact */}
                <section
                  id="section-functional"
                  className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-5 scroll-mt-6"
                >
                  <div className="border-b border-[#EAE4DB] pb-3">
                    <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                      <Activity className="w-4 h-4" />
                      <span>Section G • Function</span>
                    </div>
                    <h2 className="text-base font-semibold text-[#18201C] mt-1">
                      What is the patient having difficulty doing?
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <MultiSelectPills
                      options={FUNCTIONAL_DIFFICULTIES}
                      selected={formData.functionalDifficulties}
                      onChange={(selected) => handleFieldChange('functionalDifficulties', selected)}
                      idPrefix="functional-diff"
                    />

                    <div className="pt-2">
                      <input
                        id="assessment-functional-notes"
                        type="text"
                        value={formData.functionalDifficultiesNotes || ''}
                        onChange={(e) => handleFieldChange('functionalDifficultiesNotes', e.target.value)}
                        placeholder="Additional notes on difficulties (e.g. unable to run past 2 km, struggles putting on left shoe)..."
                        className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                      />
                    </div>
                  </div>

                  {/* What activity matters most to the patient right now? */}
                  <div className="space-y-1.5 pt-3 border-t border-[#EAE4DB]">
                    <label
                      htmlFor="assessment-important-activity"
                      className="text-xs font-semibold text-[#2C332E]"
                    >
                      What activity matters most to the patient right now?
                    </label>
                    <p className="text-[11px] text-[#6E756F]">
                      This key priority will later inform the collaborative clinical Goals module.
                    </p>
                    <input
                      id="assessment-important-activity"
                      type="text"
                      value={formData.mostImportantActivity || ''}
                      onChange={(e) => handleFieldChange('mostImportantActivity', e.target.value)}
                      placeholder="e.g. Walking my dog for 30 minutes pain-free, completing a 5k parkrun, sleeping without interruption..."
                      className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
                    />
                  </div>
                </section>

                {/* Section H: Patient Goals */}
                <section
            id="section-goals"
            className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4 scroll-mt-6"
          >
            <div className="border-b border-[#EAE4DB] pb-3">
              <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                <Target className="w-4 h-4" />
                <span>Section H • Goals</span>
              </div>
              <h2 className="text-base font-semibold text-[#18201C] mt-1">
                What does the patient want to get back to?
              </h2>
            </div>

            <div className="space-y-3">
              <textarea
                id="assessment-patient-goals-input"
                rows={4}
                value={formData.patientGoals || ''}
                onChange={(e) => handleFieldChange('patientGoals', e.target.value)}
                placeholder="Record the patient's stated aspirations and meaningful recovery targets in their voice..."
                className="w-full p-3.5 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F] leading-relaxed"
              />

              {/* Subtle Supporting Examples */}
              <div className="space-y-1 text-[11px] text-[#717872] bg-[#F4EFEB] p-3 rounded-lg border border-[#E8E2D8]">
                <span className="font-semibold text-[#3C433E]">Patient voice examples:</span>
                <ul className="list-disc list-inside space-y-0.5 pt-0.5 text-[#5A615C]">
                  <li>"I want to climb stairs without pain."</li>
                  <li>"I want to return to football."</li>
                  <li>"I want to sleep without waking because of pain."</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section I: Therapist's Initial Notes */}
          <section
            id="section-notes"
            className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs space-y-4 scroll-mt-6"
          >
            <div className="border-b border-[#EAE4DB] pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#1B3B2B] text-xs font-semibold uppercase tracking-wider">
                  <PenTool className="w-4 h-4" />
                  <span>Section I • Clinician Reflections</span>
                </div>
                <span className="text-[11px] text-[#787F7A] italic">
                  Optional clinical scratchpad
                </span>
              </div>
              <h2 className="text-base font-semibold text-[#18201C] mt-1">
                Therapist's Initial Notes
              </h2>
            </div>

            <div>
              <textarea
                id="assessment-therapist-notes-input"
                rows={4}
                value={formData.therapistInitialNotes || ''}
                onChange={(e) => handleFieldChange('therapistInitialNotes', e.target.value)}
                placeholder="Personal clinical impressions, communication nuances, behavioral observations, or hypotheses to explore during objective testing..."
                className="w-full p-3.5 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F] leading-relaxed"
              />
            </div>
          </section>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#6B726C]">
              <span>Episode: <strong>{caseItem.caseName}</strong> ({caseItem.caseId})</span>
              <span className="mx-2">•</span>
              <span>Patient: <strong>{patient.fullName}</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                id="footer-save-exit-btn"
                variant="ghost"
                size="md"
                onClick={handleSaveAndExit}
              >
                Save & Exit
              </Button>
              <Button
                id="footer-save-draft-btn"
                variant="secondary"
                size="md"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={() => handleSave(false)}
              >
                Save Draft
              </Button>
              <Button
                id="footer-save-complete-btn"
                variant={isCompleted ? 'secondary' : 'primary'}
                size="md"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => handleSave(true)}
              >
                {isCompleted ? 'Update Record' : 'Save & Mark Completed'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Objective Assessment Placeholder Modal */}
      {isObjectiveModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141A16]/50 backdrop-blur-xs"
        >
          <div
            className="w-full max-w-md bg-[#FAF8F5] border border-[#E0D9CE] rounded-xl shadow-lg p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-[#1A221E]">
                Next: Objective Assessment
              </h3>
              <p className="text-xs text-[#525954] leading-relaxed">
                Objective Assessment will be available in the next clinical workflow stage.
              </p>
              <p className="text-xs text-[#6B726C] leading-relaxed pt-2">
                In Stage 2, physical examinations (active/passive ROM, neurodynamics, manual muscle testing, palpation, and functional screening) will link directly with the subjective findings documented in this case.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E8E2D8] flex justify-end">
              <Button
                id="close-objective-placeholder-modal-btn"
                variant="primary"
                size="sm"
                onClick={() => setIsObjectiveModalOpen(false)}
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Safety Modal */}
      <EditPatientSafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        patient={currentPatient}
        initialTab={safetyModalTab}
      />
    </div>
  );
};
