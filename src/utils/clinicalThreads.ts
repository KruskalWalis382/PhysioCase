import {
  SubjectiveAssessment,
  ClinicalThread,
  ClinicalThreadCategory,
} from '../types';

/**
 * Functional difficulty to suggested examination area mapping.
 */
const FUNCTIONAL_SUGGESTED_AREAS_MAP: Record<string, string> = {
  Walking: 'Gait / walking tolerance',
  Running: 'Running or movement assessment',
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

const MECHANICAL_TRIGGER_FACTORS = [
  'Walking',
  'Running',
  'Stairs',
  'Sitting',
  'Standing',
  'Lifting',
  'Movement',
];

export interface CandidateThread {
  ruleId: string;
  title: string;
  category: ClinicalThreadCategory;
  rationale: string;
  triggeredBy: string[];
  suggestedAreas: string[];
}

/**
 * Deterministic, transparent signal-to-thread mapping.
 * Inspects purely structured fields on SubjectiveAssessment.
 * Does NOT use AI or free-text interpretation.
 */
export function generateCandidateThreads(
  assessment: SubjectiveAssessment
): CandidateThread[] {
  const candidates: CandidateThread[] = [];

  // THREAD 1 — Neurological considerations
  // Trigger: symptomDescriptions includes "Tingling", "Numbness", or sensory descriptors
  const sensoryKeywords = ['tingling', 'numbness', 'pins and needles'];
  const matchingSensory: string[] = [];

  (assessment.symptomDescriptions || []).forEach((desc) => {
    if (sensoryKeywords.some((k) => desc.toLowerCase().includes(k))) {
      matchingSensory.push(desc);
    }
  });

  if (matchingSensory.length > 0) {
    const neuroTriggers = [...matchingSensory];
    if (assessment.symptomLocations && assessment.symptomLocations.length > 0) {
      assessment.symptomLocations.forEach((loc) => {
        if (!neuroTriggers.includes(loc)) {
          neuroTriggers.push(loc);
        }
      });
    }

    candidates.push({
      ruleId: 'rule_neurological_sensory',
      title: 'Neurological considerations',
      category: 'neurological',
      rationale:
        "Sensory symptoms have been documented. Consider whether neurological examination is relevant to the patient's presentation.",
      triggeredBy: neuroTriggers,
      suggestedAreas: [
        'Neurological screening',
        'Sensory examination',
        'Motor strength',
        'Reflexes',
        'Neural mechanosensitivity',
        'Gait / functional movement',
      ],
    });
  }

  // THREAD 2 — Safety / Further assessment
  // Trigger: safetyScreening === "Yes" OR "Unsure" (case-insensitive)
  const safetyLower = (assessment.safetyScreening || '').trim().toLowerCase();
  if (safetyLower === 'yes' || safetyLower === 'unsure') {
    const displayLabel =
      safetyLower === 'yes'
        ? 'Yes'
        : safetyLower === 'unsure'
        ? 'Unsure'
        : assessment.safetyScreening;
    const safetyTriggers = [`Safety screening: ${displayLabel}`];
    if (assessment.safetyScreeningDetails?.trim()) {
      safetyTriggers.push(assessment.safetyScreeningDetails.trim());
    }

    candidates.push({
      ruleId: 'rule_safety_screening',
      title: 'Safety screening and red flag follow-up',
      category: 'safety',
      rationale:
        'Your documentation includes features that may warrant further medical assessment. Consider further assessment or referral according to clinical judgement and local protocols.',
      triggeredBy: safetyTriggers,
      suggestedAreas: [
        'Review documented safety concerns',
        'Review of red flag indicators',
        'Relevant vital signs where appropriate',
        'Focused examination',
        'Medical/referral considerations',
      ],
    });
  }

  // THREAD 3 — Trauma / Structural considerations
  // Trigger: onset is Sudden or Traumatic, AND howDidItStart contains documented text
  const onsetLower = (assessment.onset || '').toLowerCase();
  const isTraumaticOrSudden =
    onsetLower.includes('sudden') || onsetLower.includes('traumatic');
  const hasMechanism =
    typeof assessment.howDidItStart === 'string' &&
    assessment.howDidItStart.trim().length > 0;

  if (isTraumaticOrSudden && (hasMechanism || onsetLower.includes('traumatic'))) {
    const traumaTriggers = [
      assessment.onset || 'Sudden onset',
      hasMechanism ? assessment.howDidItStart.trim() : 'Documented mechanism of onset',
    ];

    candidates.push({
      ruleId: 'rule_trauma_mechanism',
      title: 'Mechanism and structural load considerations',
      category: 'trauma',
      rationale:
        'Sudden symptom onset with a documented mechanism may warrant consideration of the involved structures and appropriate examination.',
      triggeredBy: traumaTriggers,
      suggestedAreas: [
        'Observation',
        'Palpation',
        'Tissue palpation and localized tenderness',
        'Active ROM',
        'Passive ROM where appropriate',
        'Strength',
        'Functional assessment',
        'Relevant special tests',
      ],
    });
  }

  // THREAD 4 — Functional limitation
  // Trigger when: functionalDifficulties.length > 0
  if (
    assessment.functionalDifficulties &&
    assessment.functionalDifficulties.length > 0
  ) {
    const suggestedAreasSet = new Set<string>();
    assessment.functionalDifficulties.forEach((difficulty) => {
      const area = FUNCTIONAL_SUGGESTED_AREAS_MAP[difficulty];
      if (area) {
        suggestedAreasSet.add(area);
      } else {
        suggestedAreasSet.add('General functional assessment');
      }
    });

    candidates.push({
      ruleId: 'rule_functional_limitation',
      title: 'Functional limitation',
      category: 'functional',
      rationale:
        'The patient has identified activities affected by their condition. Consider assessing the relevant functional task and establishing a measurable baseline.',
      triggeredBy: [...assessment.functionalDifficulties],
      suggestedAreas: Array.from(suggestedAreasSet),
    });
  }

  // THREAD 5 — Load / Mechanical considerations
  // Trigger when aggravatingFactors contains at least one of the mechanical factors
  const mechanicalTriggers = (assessment.aggravatingFactors || []).filter(
    (factor) =>
      MECHANICAL_TRIGGER_FACTORS.some((m) =>
        factor.toLowerCase().includes(m.toLowerCase())
      )
  );

  if (mechanicalTriggers.length > 0) {
    candidates.push({
      ruleId: 'rule_mechanical_load',
      title: 'Load / mechanical considerations',
      category: 'mechanical',
      rationale:
        'Symptoms are influenced by movement or activity. Consider examining movement and load tolerance relevant to the patient\'s presentation.',
      triggeredBy: mechanicalTriggers,
      suggestedAreas: [
        'Movement assessment',
        'ROM',
        'Strength',
        'Functional loading',
        'Movement quality',
        'Activity-specific testing',
      ],
    });
  }

  return candidates;
}

/**
 * Reconciles candidate threads with existing case threads.
 * Ensures:
 * 1. At most ONE active thread per category per case.
 * 2. Therapist-controlled status is NEVER reset back to "suggested".
 * 3. Therapist notes are preserved.
 * 4. Existing threads for that case are updated with current triggers and timestamp.
 * 5. Pre-existing threads that were acted on by the clinician are preserved.
 */
export function reconcileClinicalThreads(
  existingCaseThreads: ClinicalThread[],
  candidateThreads: CandidateThread[],
  caseId: string
): ClinicalThread[] {
  const now = new Date().toISOString();
  const updatedThreads: ClinicalThread[] = [];
  const processedCategories = new Set<ClinicalThreadCategory>();

  // Process all candidate threads
  for (const candidate of candidateThreads) {
    processedCategories.add(candidate.category);
    const existing = existingCaseThreads.find(
      (t) => t.category === candidate.category || (t.ruleId && t.ruleId === candidate.ruleId)
    );

    if (existing) {
      // Update triggers and areas, preserve therapist status and notes
      updatedThreads.push({
        ...existing,
        ruleId: candidate.ruleId,
        title: candidate.title,
        rationale: candidate.rationale,
        triggeredBy: candidate.triggeredBy,
        suggestedAreas: candidate.suggestedAreas,
        updatedAt: now,
        // Status remains whatever the therapist set (or "suggested" if untouched)
        status: existing.status,
        therapistNotes: existing.therapistNotes,
      });
    } else {
      // Brand new candidate
      updatedThreads.push({
        id: 'thread_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        caseId,
        ruleId: candidate.ruleId,
        title: candidate.title,
        category: candidate.category,
        status: 'suggested',
        triggeredBy: candidate.triggeredBy,
        rationale: candidate.rationale,
        suggestedAreas: candidate.suggestedAreas,
        therapistNotes: '',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Preserve pre-existing threads that the therapist has acted upon or documented notes on
  for (const existing of existingCaseThreads) {
    if (!processedCategories.has(existing.category)) {
      // If the therapist already actively explored, supported, or noted this thread, keep it
      // so clinical history is never silently deleted
      if (
        existing.status !== 'suggested' ||
        (existing.therapistNotes && existing.therapistNotes.trim().length > 0)
      ) {
        updatedThreads.push(existing);
      }
    }
  }

  return updatedThreads;
}
