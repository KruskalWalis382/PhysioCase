import React, { useState, useEffect } from 'react';
import {
  ObjectiveAssessment,
  ObjectiveFinding,
  ClinicalThread,
} from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import {
  getSuggestedExaminationAreas,
  createObjectiveFinding,
} from '../../utils/objectiveAssessment';
import { Button } from '../common/Button';
import {
  Stethoscope,
  CheckCircle2,
  Check,
  Plus,
  Trash2,
  Save,
  Clock,
  Compass,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';

interface ObjectiveAssessmentSectionProps {
  caseId: string;
  patientId: string;
  threads: ClinicalThread[];
}

export const ObjectiveAssessmentSection: React.FC<ObjectiveAssessmentSectionProps> = ({
  caseId,
  patientId,
  threads,
}) => {
  const { getObjectiveAssessment, saveObjectiveAssessment, cases } = useClinical();

  // Load existing or initialize local state
  const existingAssessment = getObjectiveAssessment(caseId);
  const currentCase = cases?.find((c) => c.id === caseId);
  const isCaseArchived = currentCase?.isArchived === true;
  const isAssessmentFinalized = existingAssessment?.isFinalized === true;
  const isReadOnly = isCaseArchived || isAssessmentFinalized;

  const [selectedAreas, setSelectedAreas] = useState<string[]>(() => {
    return existingAssessment?.selectedAreas || [];
  });

  const [findings, setFindings] = useState<ObjectiveFinding[]>(() => {
    return existingAssessment?.findings || [];
  });

  const [therapistNotes, setTherapistNotes] = useState<string>(() => {
    return existingAssessment?.therapistNotes || '';
  });

  const [customAreaInput, setCustomAreaInput] = useState('');
  const [isAddingCustomArea, setIsAddingCustomArea] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Quick-entry state (ephemeral, purely local draft until submission)
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [quickEntryCategory, setQuickEntryCategory] = useState<'rom' | 'strength' | 'special_test'>('rom');
  const [quickError, setQuickError] = useState<string | null>(null);

  // Category 1: Active ROM
  const [romJoint, setRomJoint] = useState('');
  const [romMotion, setRomMotion] = useState('');
  const [romLeft, setRomLeft] = useState('');
  const [romRight, setRomRight] = useState('');
  const [romUnit, setRomUnit] = useState('°');
  const [romEndFeel, setRomEndFeel] = useState('');

  // Category 2: Muscle Strength
  const [strengthMuscle, setStrengthMuscle] = useState('');
  const [strengthLeft, setStrengthLeft] = useState('');
  const [strengthRight, setStrengthRight] = useState('');

  // Category 3: Special Tests
  const [testName, setTestName] = useState('');
  const [testSide, setTestSide] = useState<'Right' | 'Left' | 'Bilateral' | 'Unspecified'>('Right');
  const [testResult, setTestResult] = useState<'Positive' | 'Negative' | 'Inconclusive'>('Positive');

  // Synchronize when the external case changes or reloads
  useEffect(() => {
    const loaded = getObjectiveAssessment(caseId);
    if (loaded) {
      setSelectedAreas(loaded.selectedAreas || []);
      setFindings(loaded.findings || []);
      setTherapistNotes(loaded.therapistNotes || '');
    } else {
      setSelectedAreas([]);
      setFindings([]);
      setTherapistNotes('');
    }
  }, [caseId, getObjectiveAssessment]);

  // Derive suggested examination areas from clinical threads
  const suggestions = getSuggestedExaminationAreas(threads);

  const currentStatus = existingAssessment?.status || 'not_started';
  const isCompleted = currentStatus === 'completed';
  const isInProgress = currentStatus === 'in_progress';

  // Toggle selection of a suggested area
  const handleToggleArea = (area: string) => {
    if (isReadOnly) return;
    if (selectedAreas.includes(area)) {
      // Remove area and its associated findings
      setSelectedAreas((prev) => prev.filter((a) => a !== area));
      setFindings((prev) => prev.filter((f) => f.examinationArea !== area));
    } else {
      // Add area and seed one blank finding
      setSelectedAreas((prev) => [...prev, area]);
      const newFinding = createObjectiveFinding(
        existingAssessment?.id || 'temp',
        area,
        ''
      );
      setFindings((prev) => [...prev, newFinding]);
    }
  };

  // Add a custom therapist-defined examination area
  const handleAddCustomArea = () => {
    if (isReadOnly) return;
    const trimmed = customAreaInput.trim();
    if (!trimmed) return;

    if (!selectedAreas.includes(trimmed)) {
      setSelectedAreas((prev) => [...prev, trimmed]);
      const newFinding = createObjectiveFinding(
        existingAssessment?.id || 'temp',
        trimmed,
        ''
      );
      setFindings((prev) => [...prev, newFinding]);
    }

    setCustomAreaInput('');
    setIsAddingCustomArea(false);
  };

  // Add another finding under an existing examination area
  const handleAddFindingToArea = (area: string) => {
    if (isReadOnly) return;
    const newFinding = createObjectiveFinding(
      existingAssessment?.id || 'temp',
      area,
      ''
    );
    setFindings((prev) => [...prev, newFinding]);
  };

  // Update a specific finding's text (preserves existing finding id)
  const handleUpdateFindingText = (findingId: string, text: string) => {
    if (isReadOnly) return;
    const now = new Date().toISOString();
    setFindings((prev) =>
      prev.map((f) =>
        f.id === findingId ? { ...f, finding: text, updatedAt: now } : f
      )
    );
  };

  // Remove an individual finding
  const handleRemoveFinding = (findingId: string) => {
    if (isReadOnly) return;
    setFindings((prev) => prev.filter((f) => f.id !== findingId));
  };

  // Remove an entire examination area
  const handleRemoveArea = (area: string) => {
    if (isReadOnly) return;
    setSelectedAreas((prev) => prev.filter((a) => a !== area));
    setFindings((prev) => prev.filter((f) => f.examinationArea !== area));
  };

  // Quick Finding Commit Helper
  const commitQuickFinding = (examinationArea: string, findingText: string) => {
    if (isReadOnly) return;

    // Resolve target area against existing selected areas if a synonym or variant exists
    let targetArea = examinationArea;
    if (examinationArea === 'Special Tests' || examinationArea === 'Special Test') {
      if (selectedAreas.includes('Special Tests')) targetArea = 'Special Tests';
      else if (selectedAreas.includes('Relevant special tests')) targetArea = 'Relevant special tests';
      else if (selectedAreas.includes('Special Test')) targetArea = 'Special Test';
      else targetArea = 'Special Tests';
    } else if (examinationArea === 'Muscle Strength' || examinationArea === 'Strength') {
      if (selectedAreas.includes('Muscle Strength')) targetArea = 'Muscle Strength';
      else if (selectedAreas.includes('Strength')) targetArea = 'Strength';
      else if (selectedAreas.includes('Motor strength')) targetArea = 'Motor strength';
      else targetArea = 'Muscle Strength';
    } else if (examinationArea === 'Active ROM' || examinationArea === 'ROM') {
      if (selectedAreas.includes('Active ROM')) targetArea = 'Active ROM';
      else if (selectedAreas.includes('ROM')) targetArea = 'ROM';
      else targetArea = 'Active ROM';
    }

    const nextSelectedAreas = selectedAreas.includes(targetArea)
      ? selectedAreas
      : [...selectedAreas, targetArea];

    const newFinding = createObjectiveFinding(
      existingAssessment?.id || 'temp',
      targetArea,
      findingText
    );

    // If an untouched blank placeholder exists for this area, remove it so it doesn't leave an empty row
    const cleanedFindings = findings.filter(
      (f) => !(f.examinationArea === targetArea && f.finding.trim() === '')
    );
    const nextFindings = [...cleanedFindings, newFinding];

    setSelectedAreas(nextSelectedAreas);
    setFindings(nextFindings);

    try {
      saveObjectiveAssessment(
        caseId,
        patientId,
        {
          selectedAreas: nextSelectedAreas,
          findings: nextFindings,
          therapistNotes,
        },
        false
      );

      setSaveFeedback(`Quick finding added to ${targetArea}`);
      setTimeout(() => {
        setSaveFeedback(null);
      }, 4000);
    } catch (err: any) {
      setSaveFeedback(err.message || 'Failed to save objective finding.');
      setTimeout(() => {
        setSaveFeedback(null);
      }, 4000);
    }
  };

  // Category 1 Submit: Active ROM
  const handleAddRomFinding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;
    setQuickError(null);

    const joint = romJoint.trim();
    const motion = romMotion.trim();
    const left = romLeft.trim();
    const right = romRight.trim();
    const unit = romUnit.trim() || '°';
    const endFeel = romEndFeel.trim();

    if (!joint) {
      setQuickError('Joint is required for Active ROM.');
      return;
    }
    if (!motion) {
      setQuickError('Motion is required for Active ROM.');
      return;
    }
    if (!left && !right) {
      setQuickError('At least one of Left or Right measurement must be provided.');
      return;
    }

    let sidesStr = '';
    if (left && right) {
      sidesStr = `L: ${left}${unit}, R: ${right}${unit}`;
    } else if (left) {
      sidesStr = `L: ${left}${unit}`;
    } else {
      sidesStr = `R: ${right}${unit}`;
    }

    const endFeelStr = endFeel ? ` (End-feel: ${endFeel.toLowerCase()})` : '';
    const findingText = `${joint} ${motion} — ${sidesStr}${endFeelStr}`;

    commitQuickFinding('Active ROM', findingText);

    // Reset fields
    setRomJoint('');
    setRomMotion('');
    setRomLeft('');
    setRomRight('');
    setRomEndFeel('');
    setRomUnit('°');
  };

  // Category 2 Submit: Muscle Strength
  const formatMrcGrade = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return '';
    if (trimmed.includes('/')) return trimmed;
    return `${trimmed}/5`;
  };

  const isValidMrcGrade = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) return true;
    const m = trimmed.match(/^([0-5](?:[+-])?)(?:\/5)?$/);
    return !!m;
  };

  const handleAddStrengthFinding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;
    setQuickError(null);

    const muscle = strengthMuscle.trim();
    const left = strengthLeft.trim();
    const right = strengthRight.trim();

    if (!muscle) {
      setQuickError('Muscle / Muscle Group is required.');
      return;
    }
    if (!left && !right) {
      setQuickError('At least one side (Left or Right grade) must be provided.');
      return;
    }

    if (left && !isValidMrcGrade(left)) {
      setQuickError('Left grade must be on the MRC 0–5 scale (e.g. 4/5 or 4).');
      return;
    }
    if (right && !isValidMrcGrade(right)) {
      setQuickError('Right grade must be on the MRC 0–5 scale (e.g. 5/5 or 5).');
      return;
    }

    let gradesStr = '';
    if (left && right) {
      gradesStr = `L: ${formatMrcGrade(left)}, R: ${formatMrcGrade(right)}`;
    } else if (left) {
      gradesStr = `L: ${formatMrcGrade(left)}`;
    } else {
      gradesStr = `R: ${formatMrcGrade(right)}`;
    }

    const findingText = `${muscle} — ${gradesStr} (MRC)`;

    commitQuickFinding('Muscle Strength', findingText);

    // Reset fields
    setStrengthMuscle('');
    setStrengthLeft('');
    setStrengthRight('');
  };

  // Category 3 Submit: Special Tests
  const handleAddSpecialTestFinding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;
    setQuickError(null);

    const name = testName.trim();
    const side = testSide;
    const result = testResult;

    if (!name) {
      setQuickError('Test Name is required.');
      return;
    }
    if (!result) {
      setQuickError('Result is required.');
      return;
    }

    let findingText = '';
    if (side && side !== 'Unspecified') {
      findingText = `${name} — ${side}: ${result}`;
    } else {
      findingText = `${name} — ${result}`;
    }

    commitQuickFinding('Special Tests', findingText);

    // Reset fields
    setTestName('');
    setTestSide('Right');
    setTestResult('Positive');
  };

  // Save changes
  const handleSave = (markCompleted: boolean = false) => {
    if (isReadOnly) return;
    saveObjectiveAssessment(
      caseId,
      patientId,
      {
        selectedAreas,
        findings,
        therapistNotes,
      },
      markCompleted
    );

    if (markCompleted) {
      setSaveFeedback('Objective Assessment marked as Completed');
    } else {
      setSaveFeedback('Objective Assessment progress saved to Case record');
    }

    setTimeout(() => {
      setSaveFeedback(null);
    }, 4000);
  };

  return (
    <section
      id="section-objective-assessment"
      className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs space-y-6 scroll-mt-6"
    >
      {/* Header & Clinical Philosophy Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D8]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1B3B2B]">
              Stage 2 • Physical Examination
            </span>
          </div>

          <h2 className="text-xl font-semibold text-[#18201C] tracking-tight">
            Objective Assessment
          </h2>

          <p className="text-xs text-[#525954] leading-relaxed max-w-2xl">
            Use the clinical information documented so far to guide what you examine. You remain in control of the assessment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
          {/* Status Badge */}
          {isCompleted ? (
            <span
              id="objective-status-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-[#E2ECE6] text-[#1B3B2B] border border-[#CAD8D0]"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Completed</span>
            </span>
          ) : isInProgress ? (
            <span
              id="objective-status-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-[#FAF0E4] text-[#8C5E1A] border border-[#E8D4BE]"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>In progress</span>
            </span>
          ) : (
            <span
              id="objective-status-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB]"
            >
              <span>Not started</span>
            </span>
          )}
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {saveFeedback && (
        <div
          id="objective-save-feedback"
          className="flex items-center gap-2 p-3 rounded-lg bg-[#E2ECE6] border border-[#BDD1C6] text-xs font-medium text-[#1B3B2B] animate-in fade-in duration-150"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Read-Only Alert Banner if archived or finalized */}
      {isCaseArchived && (
        <div
          id="objective-archived-banner"
          className="flex items-center gap-2 p-3 rounded-lg bg-[#F5F2ED] border border-[#DDD6CB] text-xs text-[#6B726C]"
        >
          <Lock className="w-4 h-4 text-[#8C5E1A] shrink-0" />
          <span>This case is archived. Objective assessment findings are read-only.</span>
        </div>
      )}
      {isAssessmentFinalized && !isCaseArchived && (
        <div
          id="objective-finalized-banner"
          className="flex items-center gap-2 p-3 rounded-lg bg-[#EBF2EE] border border-[#CAD8D0] text-xs text-[#1B3B2B]"
        >
          <Lock className="w-4 h-4 text-[#1B3B2B] shrink-0" />
          <span>This objective assessment is finalized and locked. Additional observations must be made via clinical amendments.</span>
        </div>
      )}

      {/* Quick Entry Section */}
      {!isReadOnly && (
        <div
          id="objective-quick-entry-section"
          className="bg-[#FFFFFF] border border-[#E3DDD2] rounded-xl p-4 sm:p-5 shadow-2xs space-y-4 transition-all"
        >
          {/* Quick Entry Toggle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#EBF2EE] text-[#1B3B2B] flex items-center justify-center font-semibold shrink-0">
                <Zap className="w-4 h-4 text-[#1B3B2B]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#18201C]">
                    Quick Entry
                  </h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF5EC] text-[#8C5E1A] border border-[#EFE2CC]">
                    Active ROM • Strength • Special Tests
                  </span>
                </div>
                <p className="text-[11px] text-[#6E756F]">
                  Fast structured documentation compiling directly into standard Objective Findings.
                </p>
              </div>
            </div>

            <button
              id="toggle-quick-entry-btn"
              type="button"
              onClick={() => setIsQuickEntryOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FAF8F5] hover:bg-[#F3EFE8] text-[#18201C] border border-[#DDD6CB] transition-colors cursor-pointer self-start sm:self-auto"
              aria-expanded={isQuickEntryOpen}
              aria-controls="quick-entry-panel"
            >
              <span>{isQuickEntryOpen ? 'Hide Quick Entry' : 'Open Quick Entry'}</span>
              {isQuickEntryOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-[#555C56]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#555C56]" />
              )}
            </button>
          </div>

          {/* Quick Entry Collapsible Body */}
          {isQuickEntryOpen && (
            <div id="quick-entry-panel" className="space-y-4 pt-3 border-t border-[#EFECE5]">
              {/* Category Segmented Tabs */}
              <div className="flex flex-wrap items-center gap-2" role="tablist">
                <button
                  id="quick-tab-rom"
                  role="tab"
                  aria-selected={quickEntryCategory === 'rom'}
                  type="button"
                  onClick={() => {
                    setQuickEntryCategory('rom');
                    setQuickError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    quickEntryCategory === 'rom'
                      ? 'bg-[#1B3B2B] text-white shadow-xs font-semibold'
                      : 'bg-[#F5F2ED] text-[#555C56] hover:bg-[#ECE6DC] hover:text-[#18201C] border border-[#E2DDD3]'
                  }`}
                >
                  Active ROM
                </button>

                <button
                  id="quick-tab-strength"
                  role="tab"
                  aria-selected={quickEntryCategory === 'strength'}
                  type="button"
                  onClick={() => {
                    setQuickEntryCategory('strength');
                    setQuickError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    quickEntryCategory === 'strength'
                      ? 'bg-[#1B3B2B] text-white shadow-xs font-semibold'
                      : 'bg-[#F5F2ED] text-[#555C56] hover:bg-[#ECE6DC] hover:text-[#18201C] border border-[#E2DDD3]'
                  }`}
                >
                  Muscle Strength
                </button>

                <button
                  id="quick-tab-special-tests"
                  role="tab"
                  aria-selected={quickEntryCategory === 'special_test'}
                  type="button"
                  onClick={() => {
                    setQuickEntryCategory('special_test');
                    setQuickError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    quickEntryCategory === 'special_test'
                      ? 'bg-[#1B3B2B] text-white shadow-xs font-semibold'
                      : 'bg-[#F5F2ED] text-[#555C56] hover:bg-[#ECE6DC] hover:text-[#18201C] border border-[#E2DDD3]'
                  }`}
                >
                  Special Tests
                </button>
              </div>

              {/* Validation Error Banner */}
              {quickError && (
                <div
                  id="quick-entry-error-banner"
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FDECEC] border border-[#F4C7C7] text-xs text-[#931D1D]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickError}</span>
                </div>
              )}

              {/* Form: Active ROM */}
              {quickEntryCategory === 'rom' && (
                <form onSubmit={handleAddRomFinding} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                    <div className="space-y-1 sm:col-span-1 lg:col-span-2">
                      <label htmlFor="quick-rom-joint" className="block text-[11px] font-semibold text-[#2C332E]">
                        Joint *
                      </label>
                      <input
                        id="quick-rom-joint"
                        type="text"
                        value={romJoint}
                        onChange={(e) => setRomJoint(e.target.value)}
                        placeholder="e.g. Shoulder, Knee, Hip, Cervical"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-1 lg:col-span-2">
                      <label htmlFor="quick-rom-motion" className="block text-[11px] font-semibold text-[#2C332E]">
                        Motion *
                      </label>
                      <input
                        id="quick-rom-motion"
                        type="text"
                        value={romMotion}
                        onChange={(e) => setRomMotion(e.target.value)}
                        placeholder="e.g. Abduction, Flexion, Ext Rot"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="quick-rom-left" className="block text-[11px] font-semibold text-[#2C332E]">
                        Left
                      </label>
                      <input
                        id="quick-rom-left"
                        type="text"
                        value={romLeft}
                        onChange={(e) => setRomLeft(e.target.value)}
                        placeholder="e.g. 160"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="quick-rom-right" className="block text-[11px] font-semibold text-[#2C332E]">
                        Right
                      </label>
                      <input
                        id="quick-rom-right"
                        type="text"
                        value={romRight}
                        onChange={(e) => setRomRight(e.target.value)}
                        placeholder="e.g. 180"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="quick-rom-unit" className="block text-[11px] font-semibold text-[#2C332E]">
                        Unit
                      </label>
                      <input
                        id="quick-rom-unit"
                        type="text"
                        value={romUnit}
                        onChange={(e) => setRomUnit(e.target.value)}
                        placeholder="°"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="quick-rom-endfeel" className="block text-[11px] font-semibold text-[#2C332E]">
                        End-feel
                      </label>
                      <input
                        id="quick-rom-endfeel"
                        type="text"
                        value={romEndFeel}
                        onChange={(e) => setRomEndFeel(e.target.value)}
                        placeholder="e.g. Firm, Normal, Soft, Empty"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <Button
                        id="quick-rom-submit-btn"
                        variant="primary"
                        size="sm"
                        type="submit"
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        className="w-full sm:w-auto"
                      >
                        Add ROM Finding
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Form: Muscle Strength */}
              {quickEntryCategory === 'strength' && (
                <form onSubmit={handleAddStrengthFinding} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="space-y-1 sm:col-span-2">
                      <label htmlFor="quick-strength-muscle" className="block text-[11px] font-semibold text-[#2C332E]">
                        Muscle / Muscle Group *
                      </label>
                      <input
                        id="quick-strength-muscle"
                        type="text"
                        value={strengthMuscle}
                        onChange={(e) => setStrengthMuscle(e.target.value)}
                        placeholder="e.g. Quadriceps, Hamstrings, Deltoid"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="quick-strength-left" className="block text-[11px] font-semibold text-[#2C332E]">
                        Left Grade (MRC 0–5)
                      </label>
                      <input
                        id="quick-strength-left"
                        type="text"
                        value={strengthLeft}
                        onChange={(e) => setStrengthLeft(e.target.value)}
                        placeholder="e.g. 4/5 or 4"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="quick-strength-right" className="block text-[11px] font-semibold text-[#2C332E]">
                        Right Grade (MRC 0–5)
                      </label>
                      <input
                        id="quick-strength-right"
                        type="text"
                        value={strengthRight}
                        onChange={(e) => setStrengthRight(e.target.value)}
                        placeholder="e.g. 5/5 or 5"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-[#6E756F]">
                      Standard scale: <strong>Medical Research Council (MRC 0–5)</strong>
                    </span>

                    <Button
                      id="quick-strength-submit-btn"
                      variant="primary"
                      size="sm"
                      type="submit"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                    >
                      Add Strength Finding
                    </Button>
                  </div>
                </form>
              )}

              {/* Form: Special Tests */}
              {quickEntryCategory === 'special_test' && (
                <form onSubmit={handleAddSpecialTestFinding} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="quick-test-name" className="block text-[11px] font-semibold text-[#2C332E]">
                        Test Name *
                      </label>
                      <input
                        id="quick-test-name"
                        type="text"
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        placeholder="e.g. Lachman, Hawkins-Kennedy, Empty Can"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="quick-test-side" className="block text-[11px] font-semibold text-[#2C332E]">
                        Side
                      </label>
                      <select
                        id="quick-test-side"
                        value={testSide}
                        onChange={(e) => setTestSide(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      >
                        <option value="Right">Right</option>
                        <option value="Left">Left</option>
                        <option value="Bilateral">Bilateral</option>
                        <option value="Unspecified">Unspecified / None</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="quick-test-result" className="block text-[11px] font-semibold text-[#2C332E]">
                        Result *
                      </label>
                      <select
                        id="quick-test-result"
                        value={testResult}
                        onChange={(e) => setTestResult(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                      >
                        <option value="Positive">Positive</option>
                        <option value="Negative">Negative</option>
                        <option value="Inconclusive">Inconclusive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      id="quick-test-submit-btn"
                      variant="primary"
                      size="sm"
                      type="submit"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                    >
                      Add Special Test Finding
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Suggested Examination Areas */}
      <div className="space-y-3.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#353C37] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <span>Suggested Examination Areas</span>
            </h3>
            <p className="text-xs text-[#636A64]">
              Based on the clinical information documented so far, you may want to consider:
            </p>
          </div>
        </div>

        {suggestions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {suggestions.map((sug) => {
              const isSelected = selectedAreas.includes(sug.area);
              return (
                <button
                  key={sug.area}
                  id={`suggested-area-${sug.area.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  type="button"
                  onClick={() => handleToggleArea(sug.area)}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF2EE] border-[#1B3B2B] ring-1 ring-[#1B3B2B]/20 shadow-xs'
                      : 'bg-[#FDFCFA] border-[#E5DFD4] hover:bg-[#F7F3EC] hover:border-[#D5CFC4]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <span className="text-xs font-semibold text-[#18201C] leading-snug">
                      {sug.area}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-[#1B3B2B] text-white'
                          : 'border border-[#C8C2B5] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {sug.sourceThreads.map((src, srcIdx) => (
                      <span
                        key={`${sug.area}-${src}-${srcIdx}`}
                        className="text-[10px] text-[#555C56] bg-[#EFECE5] px-1.5 py-0.5 rounded-sm font-medium"
                      >
                        Suggested from: {src}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[#F5F1EB] border border-[#E8E2D8] text-xs text-[#636A64] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#8C5E1A] shrink-0" />
              <span>
                No specific examination areas have been suggested from the documented clinical information yet.
              </span>
            </div>
            {!isAddingCustomArea && (
              <Button
                id="empty-add-custom-area-btn"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsAddingCustomArea(true)}
              >
                Add examination area
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Custom Area Section */}
      <div className="pt-2">
        {isAddingCustomArea ? (
          <div className="p-3.5 rounded-lg bg-[#F4EFEB] border border-[#DDD6CB] space-y-2.5">
            <label
              htmlFor="custom-area-input"
              className="block text-xs font-semibold text-[#18201C]"
            >
              Add Custom Examination Area
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="custom-area-input"
                type="text"
                value={customAreaInput}
                onChange={(e) => setCustomAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomArea();
                  }
                }}
                placeholder="e.g. Hip ROM, Cervical quadrant, Special test..."
                className="flex-1 px-3 py-1.5 text-xs text-[#18201C] bg-white border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  id="confirm-add-custom-area-btn"
                  variant="primary"
                  size="sm"
                  onClick={handleAddCustomArea}
                >
                  Add Area
                </Button>
                <Button
                  id="cancel-add-custom-area-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingCustomArea(false);
                    setCustomAreaInput('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          suggestions.length > 0 && (
            <button
              id="show-add-custom-area-btn"
              type="button"
              onClick={() => setIsAddingCustomArea(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B3B2B] hover:text-[#12281D] hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add custom examination area</span>
            </button>
          )
        )}
      </div>

      {/* Selected Examination Areas & Recording Findings */}
      <div className="space-y-4 pt-2 border-t border-[#EAE4DB]">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#353C37]">
              Selected Examination Areas & Findings
            </h3>
            <p className="text-xs text-[#636A64]">
              Record what you actually found. The therapist remains responsible for clinical interpretation.
            </p>
          </div>
          <span className="text-xs font-medium text-[#7A817B]">
            {selectedAreas.length} {selectedAreas.length === 1 ? 'area' : 'areas'} selected
          </span>
        </div>

        {selectedAreas.length > 0 ? (
          <div className="space-y-3.5">
            {selectedAreas.map((area, areaIdx) => {
              const areaFindings = findings.filter(
                (f) => f.examinationArea === area
              );

              return (
                <div
                  key={area || `selected-area-${areaIdx}`}
                  id={`area-block-${(area || 'area').toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className="bg-[#FDFCFA] border border-[#E2DDD3] rounded-lg p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[#EFECE5] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#1B3B2B]" />
                      <h4 className="text-xs font-semibold text-[#18201C]">
                        {area}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveArea(area)}
                      className="text-xs text-[#8F2D26] hover:text-[#6C221D] font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove area</span>
                    </button>
                  </div>

                  {/* Findings list for this area */}
                  <div className="space-y-2.5">
                    {areaFindings.map((findingItem, idx) => (
                      <div
                        key={findingItem.id || `finding-${area || 'gen'}-${idx}`}
                        className="space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-[#6E756F]">
                          <span className="font-medium">
                            Finding {areaFindings.length > 1 ? idx + 1 : ''}
                          </span>
                          {areaFindings.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFinding(findingItem.id)}
                              className="text-[10px] text-[#8F2D26] hover:underline cursor-pointer"
                            >
                              Remove finding
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={findingItem.finding}
                          disabled={isReadOnly}
                          onChange={(e) =>
                            handleUpdateFindingText(
                              findingItem.id,
                              e.target.value
                            )
                          }
                          placeholder={`Enter finding for ${area} (e.g. Right hip flexion 4/5, Reduced sensation over lateral right leg)...`}
                          className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F] disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}

                    {!isReadOnly && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddFindingToArea(area)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B3B2B] hover:underline cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add another finding under {area}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[#FAF8F5] border border-dashed border-[#D5CFC4] text-center text-xs text-[#6E756F]">
            No examination areas selected yet. Select from the suggestions above or click <strong>Add custom examination area</strong>.
          </div>
        )}
      </div>

      {/* Therapist Notes (Free-text) */}
      <div className="space-y-2 pt-2 border-t border-[#EAE4DB]">
        <label
          htmlFor="objective-therapist-notes"
          className="block text-xs font-semibold text-[#18201C]"
        >
          Therapist Notes & General Objective Observations
        </label>
        <p className="text-[11px] text-[#6E756F]">
          Record any additional physical observations, general movement impressions, posture, or clinical context:
        </p>
        <textarea
          id="objective-therapist-notes"
          rows={3}
          value={therapistNotes}
          disabled={isReadOnly}
          onChange={(e) => setTherapistNotes(e.target.value)}
          placeholder="Document overall physical presentation, movement quality, posture, or additional objective findings..."
          className="w-full px-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F] disabled:opacity-70 disabled:cursor-not-allowed"
        />
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#E8E2D8]">
        <div className="text-[11px] text-[#7A817B]">
          {existingAssessment?.updatedAt ? (
            <span>
              Last saved:{' '}
              {new Date(existingAssessment.updatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : (
            <span>Unsaved objective draft</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            id="objective-save-draft-btn"
            variant="secondary"
            size="sm"
            disabled={isReadOnly}
            leftIcon={<Save className="w-3.5 h-3.5" />}
            onClick={() => handleSave(false)}
          >
            Save draft
          </Button>

          <Button
            id="objective-complete-btn"
            variant="primary"
            size="sm"
            disabled={isReadOnly}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            onClick={() => handleSave(true)}
          >
            {isCompleted ? 'Update Completed Assessment' : 'Complete Objective Assessment'}
          </Button>
        </div>
      </div>
    </section>
  );
};
