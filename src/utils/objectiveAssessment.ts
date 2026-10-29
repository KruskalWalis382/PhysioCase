import { ClinicalThread, ObjectiveAssessment, ObjectiveFinding } from '../types';

export const OBJECTIVE_ASSESSMENTS_STORAGE_KEY = 'physiocase_workspace_objective_assessments';

export const FUNCTIONAL_SUGGESTION_MAP: Record<string, string> = {
  Walking: 'Gait / walking tolerance',
  Running: 'Running / movement assessment',
  Stairs: 'Stair performance / lower-limb function',
  Sitting: 'Sitting tolerance / relevant functional assessment',
  Standing: 'Standing tolerance / relevant functional assessment',
  Sleeping: 'Sleep-related functional impact',
  Work: 'Work-related functional assessment',
  'Self-care': 'Relevant ADL assessment',
  Sport: 'Sport-specific functional assessment',
  'Household activities': 'Relevant functional task assessment',
  Other: 'General functional assessment',
};

export interface SuggestedExaminationArea {
  area: string;
  sourceThreads: string[];
}

/**
 * Deterministically derives suggested examination areas from existing Clinical Threads.
 * Combines all suggestions across active threads and eliminates duplicate examination areas.
 */
export function getSuggestedExaminationAreas(
  threads: ClinicalThread[]
): SuggestedExaminationArea[] {
  const suggestionsMap = new Map<string, Set<string>>();

  // Order of appearance preserved by Map
  threads.forEach((thread) => {
    // Only consider active/explorable threads (exclude not_pursued)
    if (thread.status === 'not_pursued') return;

    let areas: string[] = [];

    const category = thread.category;
    const titleLower = thread.title.toLowerCase();

    if (category === 'neurological' || titleLower.includes('neurological')) {
      areas = [
        'Neurological screening',
        'Sensory examination',
        'Motor strength',
        'Reflexes',
        'Neural mechanosensitivity',
        'Gait / functional movement',
      ];
    } else if (category === 'safety' || titleLower.includes('safety')) {
      areas = [
        'Review documented safety concerns',
        'Relevant vital signs where appropriate',
        'Focused examination',
        'Medical/referral considerations',
      ];
    } else if (
      category === 'trauma' ||
      titleLower.includes('trauma') ||
      titleLower.includes('structural') ||
      titleLower.includes('mechanism')
    ) {
      areas = [
        'Observation',
        'Palpation',
        'Active ROM',
        'Passive ROM where appropriate',
        'Strength',
        'Functional assessment',
        'Relevant special tests',
      ];
    } else if (category === 'functional' || titleLower.includes('functional')) {
      const mappedSet = new Set<string>();

      // Check triggeredBy items
      (thread.triggeredBy || []).forEach((trigger) => {
        for (const [key, mappedArea] of Object.entries(FUNCTIONAL_SUGGESTION_MAP)) {
          if (trigger.toLowerCase().includes(key.toLowerCase())) {
            mappedSet.add(mappedArea);
          }
        }
      });

      // Check thread.suggestedAreas
      (thread.suggestedAreas || []).forEach((area) => {
        if (area.toLowerCase().includes('running')) {
          mappedSet.add('Running / movement assessment');
        } else {
          mappedSet.add(area);
        }
      });

      if (mappedSet.size === 0) {
        mappedSet.add('General functional assessment');
      }

      areas = Array.from(mappedSet);
    } else if (
      category === 'mechanical' ||
      titleLower.includes('mechanical') ||
      titleLower.includes('load')
    ) {
      areas = [
        'Movement assessment',
        'ROM',
        'Strength',
        'Functional loading',
        'Movement quality',
        'Activity-specific testing',
      ];
    }

    areas.forEach((area) => {
      if (!suggestionsMap.has(area)) {
        suggestionsMap.set(area, new Set<string>());
      }
      suggestionsMap.get(area)!.add(thread.title);
    });
  });

  const results: SuggestedExaminationArea[] = [];
  suggestionsMap.forEach((sourceSet, area) => {
    results.push({
      area,
      sourceThreads: Array.from(sourceSet),
    });
  });

  return results;
}

/**
 * Creates an empty/initial ObjectiveAssessment object for a given case and patient.
 */
export function createEmptyObjectiveAssessment(
  caseId: string,
  patientId: string
): ObjectiveAssessment {
  const now = new Date().toISOString();
  return {
    id: 'obj_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    caseId,
    patientId,
    status: 'not_started',
    selectedAreas: [],
    findings: [],
    therapistNotes: '',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates an initial ObjectiveFinding object under a given assessment.
 */
export function createObjectiveFinding(
  assessmentId: string,
  examinationArea: string,
  findingText: string = ''
): ObjectiveFinding {
  const now = new Date().toISOString();
  return {
    id: 'finding_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    assessmentId,
    examinationArea,
    finding: findingText,
    createdAt: now,
    updatedAt: now,
  };
}
