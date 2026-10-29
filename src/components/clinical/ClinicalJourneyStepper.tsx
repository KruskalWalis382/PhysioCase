import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { AssessmentStatus } from '../../types';

interface ClinicalJourneyStepperProps {
  hasActiveCase: boolean;
  assessmentStatus?: AssessmentStatus;
  hasReasoningActive?: boolean;
  hasGoalsActive?: boolean;
  hasPlanActive?: boolean;
  hasSessionsActive?: boolean;
  hasProgressActive?: boolean;
  isDischarged?: boolean;
  className?: string;
}

interface JourneyStage {
  id: string;
  label: string;
  description: string;
  status: 'complete' | 'active' | 'future';
}

export const ClinicalJourneyStepper: React.FC<ClinicalJourneyStepperProps> = ({
  hasActiveCase,
  assessmentStatus = 'not_started',
  hasReasoningActive = false,
  hasGoalsActive = true,
  hasPlanActive = true,
  hasSessionsActive = true,
  hasProgressActive = true,
  isDischarged = false,
  className = '',
}) => {
  const isAssessmentCompleted = assessmentStatus === 'completed';

  const stages: JourneyStage[] = [
    {
      id: 'patient',
      label: 'Patient',
      description: 'Profile & Demographics',
      status: 'complete',
    },
    {
      id: 'case',
      label: 'Case',
      description: 'Episode & Presenting Problem',
      status: hasActiveCase ? 'complete' : 'active',
    },
    {
      id: 'assessment',
      label: 'Assessment',
      description: isAssessmentCompleted
        ? 'Subjective & Objective'
        : assessmentStatus === 'in_progress'
        ? 'Subjective in progress'
        : 'Subjective & Objective',
      status: isAssessmentCompleted ? 'complete' : hasActiveCase ? 'active' : 'future',
    },
    {
      id: 'reasoning',
      label: 'Reasoning',
      description: 'Findings → Problems',
      status: isAssessmentCompleted || hasReasoningActive ? 'active' : 'future',
    },
    {
      id: 'goals',
      label: 'Goals',
      description: 'Functional Outcomes',
      status: hasGoalsActive ? 'active' : 'future',
    },
    {
      id: 'plan',
      label: 'Plan',
      description: 'Interventions & Dosage',
      status: hasPlanActive ? 'active' : 'future',
    },
    {
      id: 'sessions',
      label: 'Sessions',
      description: 'Treatment & Delivery',
      status: hasSessionsActive ? 'active' : 'future',
    },
    {
      id: 'progress',
      label: 'Progress',
      description: 'Outcomes & Longitudinal Trajectory',
      status: hasProgressActive ? 'active' : 'future',
    },
    {
      id: 'discharge',
      label: 'Discharge',
      description: isDischarged ? 'Episode Closed' : 'Clinical Summary & Closure',
      status: isDischarged ? 'complete' : 'future',
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Clinical Summaries & Export',
      status: 'active',
    },
  ];

  return (
    <div
      id="clinical-journey-tracker"
      className={`bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-5 sm:p-6 shadow-xs ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#EAE4DB]">
        <div>
          <span className="text-[11px] font-semibold text-[#525954] uppercase tracking-wider">
            Clinical Pathway
          </span>
          <h3 className="text-sm font-semibold text-[#18201C] mt-0.5">
            Rehabilitation Journey
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6B726C]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1B3B2B]" />
            <span className="text-[#3A403C] font-medium">Active / Recorded</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D4CEC4]" />
            <span className="text-[#7A817B]">Upcoming Stages</span>
          </span>
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div className="overflow-x-auto pb-2">
        <ol className="flex items-center min-w-[720px] justify-between relative">
          {stages.map((stage, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === stages.length - 1;
            const isComplete = stage.status === 'complete';
            const isActive = stage.status === 'active';
            const isFuture = stage.status === 'future';

            return (
              <li
                key={stage.id}
                id={`journey-step-${stage.id}`}
                className="flex-1 flex flex-col items-center relative group"
              >
                {/* Connecting Line */}
                {!isFirst && (
                  <div
                    aria-hidden="true"
                    className={`absolute top-3.5 right-1/2 left-[-50%] h-[2px] transition-colors duration-200 ${
                      isComplete || (isActive && idx === 1)
                        ? 'bg-[#1B3B2B]'
                        : 'bg-[#E3DDD2]'
                    }`}
                  />
                )}

                {/* Stage Node */}
                <div
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-150 ${
                    isComplete
                      ? 'bg-[#1B3B2B] text-[#FAF8F5]'
                      : isActive
                      ? 'bg-[#EBF2EE] text-[#1B3B2B] border-2 border-[#1B3B2B]'
                      : 'bg-[#EDE7DE] text-[#7A817B] border border-[#D5CFC4]'
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Stage Label */}
                <div className="text-center mt-2.5 space-y-0.5">
                  <p
                    className={`text-xs font-semibold tracking-tight whitespace-nowrap ${
                      isComplete || isActive ? 'text-[#18201C]' : 'text-[#7A817B]'
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-[#7E857F] max-w-[90px] truncate leading-tight hidden lg:block">
                    {stage.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-4 pt-3 border-t border-[#EAE4DB] flex items-center justify-between text-[11px] text-[#6E756F]">
        <span>
          Current position:{' '}
          {isAssessmentCompleted
            ? 'Subjective assessment completed'
            : assessmentStatus === 'in_progress'
            ? 'Subjective assessment in progress'
            : hasActiveCase
            ? 'Case established • Ready for assessment'
            : 'Patient registered'}
        </span>
        <span className="italic">
          Stages activate sequentially as clinical documentation progresses
        </span>
      </div>
    </div>
  );
};
