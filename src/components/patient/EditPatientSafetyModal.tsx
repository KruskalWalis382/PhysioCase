import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  Patient,
  PatientSafetyProfile,
  PatientAllergy,
  AllergySeverity,
  PatientPersistentPrecaution,
  PersistentPrecautionCategory,
  PatientSurgicalHistoryItem,
  PatientMedicalCondition,
  PatientMobilityContext,
  SafetyVerificationStatus,
  SafetyProvenanceSource,
} from '../../types';
import { useClinical } from '../../context/ClinicalContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { formatClinicalDate } from '../../utils/clinicalFormatters';

interface EditPatientSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  initialTab?: 'allergies' | 'precautions' | 'surgeries' | 'conditions' | 'mobility';
}

type TabType = 'allergies' | 'precautions' | 'surgeries' | 'conditions' | 'mobility';

const SOURCE_LABELS: Record<SafetyProvenanceSource, string> = {
  clinician_entry: 'Clinician Entered',
  patient_reported: 'Patient Reported',
  referral_letter: 'Referral Letter',
  external_medical_record: 'External Medical Record',
};

const SEVERITY_COLORS: Record<AllergySeverity, { bg: string; text: string; border: string }> = {
  mild: { bg: 'bg-[#F4EFEB]', text: 'text-[#4A524C]', border: 'border-[#DDD6CB]' },
  moderate: { bg: 'bg-[#FFF9EB]', text: 'text-[#854D0E]', border: 'border-[#FDE68A]' },
  severe: { bg: 'bg-[#FEF2F2]', text: 'text-[#B91C1C]', border: 'border-[#FCA5A5]' },
  life_threatening: { bg: 'bg-[#7F1D1D]', text: 'text-[#FFFFFF]', border: 'border-[#991B1B]' },
};

const PRECAUTION_CATEGORIES: { value: PersistentPrecautionCategory; label: string }[] = [
  { value: 'implant', label: 'Implant / Hardware' },
  { value: 'surgical', label: 'Surgical Precaution' },
  { value: 'biomechanical', label: 'Biomechanical Restriction' },
  { value: 'neurological', label: 'Neurological Consideration' },
  { value: 'systemic', label: 'Systemic / Cardiovascular' },
  { value: 'medication', label: 'Medication Precaution (e.g. Anticoagulants)' },
  { value: 'other', label: 'Other Precaution' },
];

export const EditPatientSafetyModal: React.FC<EditPatientSafetyModalProps> = ({
  isOpen,
  onClose,
  patient,
  initialTab = 'allergies',
}) => {
  const { updatePatientSafetyProfile, settings } = useClinical();
  const practitionerName = settings?.practitionerName || 'Treating Clinician';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Local working copy of the profile
  const [profile, setProfile] = useState<PatientSafetyProfile>({
    allergies: [],
    persistentPrecautions: [],
    surgicalHistory: [],
    persistentMedicalConditions: [],
  });

  // State for sub-forms
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Allergies Form State
  const [algAllergen, setAlgAllergen] = useState('');
  const [algReaction, setAlgReaction] = useState('');
  const [algSeverity, setAlgSeverity] = useState<AllergySeverity>('moderate');
  const [algNotes, setAlgNotes] = useState('');
  const [algSource, setAlgSource] = useState<SafetyProvenanceSource>('clinician_entry');

  // Precaution Form State
  const [prcPrecaution, setPrcPrecaution] = useState('');
  const [prcCategory, setPrcCategory] = useState<PersistentPrecautionCategory>('biomechanical');
  const [prcBodyRegion, setPrcBodyRegion] = useState('');
  const [prcDetails, setPrcDetails] = useState('');
  const [prcSource, setPrcSource] = useState<SafetyProvenanceSource>('clinician_entry');

  // Surgery Form State
  const [srgProcedure, setSrgProcedure] = useState('');
  const [srgDateOrYear, setSrgDateOrYear] = useState('');
  const [srgBodyRegion, setSrgBodyRegion] = useState('');
  const [srgSurgeon, setSrgSurgeon] = useState('');
  const [srgNotes, setSrgNotes] = useState('');
  const [srgSource, setSrgSource] = useState<SafetyProvenanceSource>('patient_reported');

  // Medical Condition Form State
  const [cndName, setCndName] = useState('');
  const [cndYearOrDate, setCndYearOrDate] = useState('');
  const [cndRelevance, setCndRelevance] = useState('');
  const [cndIsActive, setCndIsActive] = useState(true);
  const [cndSource, setCndSource] = useState<SafetyProvenanceSource>('clinician_entry');

  // Mobility Form State
  const [mobBaseline, setMobBaseline] = useState('');
  const [mobDevicesText, setMobDevicesText] = useState('');
  const [mobBarriers, setMobBarriers] = useState('');
  const [mobSource, setMobSource] = useState<SafetyProvenanceSource>('clinician_entry');
  const [mobStatus, setMobStatus] = useState<SafetyVerificationStatus>('verified');

  const [formError, setFormError] = useState<string | null>(null);

  // Sync profile from patient props when opened
  useEffect(() => {
    if (patient && isOpen) {
      const existing = patient.patientSafetyProfile || {
        allergies: [],
        persistentPrecautions: [],
        surgicalHistory: [],
        persistentMedicalConditions: [],
      };
      setProfile({
        allergies: existing.allergies ? [...existing.allergies] : [],
        persistentPrecautions: existing.persistentPrecautions ? [...existing.persistentPrecautions] : [],
        surgicalHistory: existing.surgicalHistory ? [...existing.surgicalHistory] : [],
        persistentMedicalConditions: existing.persistentMedicalConditions
          ? [...existing.persistentMedicalConditions]
          : [],
        enduringMobilityContext: existing.enduringMobilityContext
          ? { ...existing.enduringMobilityContext }
          : undefined,
        lastReviewedAt: existing.lastReviewedAt,
        lastReviewedBy: existing.lastReviewedBy,
      });

      // Populate mobility context if present
      if (existing.enduringMobilityContext) {
        setMobBaseline(existing.enduringMobilityContext.baselineMobilityStatus || '');
        setMobDevicesText(existing.enduringMobilityContext.enduringAssistiveDevices?.join(', ') || '');
        setMobBarriers(existing.enduringMobilityContext.relevantEnvironmentalBarriers || '');
        setMobSource(existing.enduringMobilityContext.source || 'clinician_entry');
        setMobStatus(existing.enduringMobilityContext.verificationStatus || 'verified');
      } else {
        setMobBaseline('');
        setMobDevicesText('');
        setMobBarriers('');
        setMobSource('clinician_entry');
        setMobStatus('unverified');
      }

      setIsAddingNew(false);
      setEditingItemId(null);
      setDeleteConfirmId(null);
      setFormError(null);
    }
  }, [patient, isOpen]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen || !patient) return null;

  const saveUpdatedProfile = (newProfile: PatientSafetyProfile) => {
    setProfile(newProfile);
    updatePatientSafetyProfile(patient.id, newProfile);
  };

  // ==========================================
  // ALLERGIES HANDLERS
  // ==========================================
  const handleSaveAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!algAllergen.trim()) {
      setFormError('Allergen or substance is required.');
      return;
    }
    if (!algReaction.trim()) {
      setFormError('Observed or reported reaction is required.');
      return;
    }

    const now = new Date().toISOString();
    let updatedList: PatientAllergy[];

    if (editingItemId) {
      updatedList = profile.allergies.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            allergen: algAllergen.trim(),
            reactionType: algReaction.trim(),
            severity: algSeverity,
            clinicalNotes: algNotes.trim() || undefined,
            source: algSource,
          };
        }
        return item;
      });
    } else {
      const newItem: PatientAllergy = {
        id: `alg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        allergen: algAllergen.trim(),
        reactionType: algReaction.trim(),
        severity: algSeverity,
        clinicalNotes: algNotes.trim() || undefined,
        source: algSource,
        recordedAt: now,
        recordedBy: practitionerName,
        verificationStatus: algSource === 'clinician_entry' ? 'verified' : 'unverified',
        verifiedAt: algSource === 'clinician_entry' ? now : undefined,
        verifiedBy: algSource === 'clinician_entry' ? practitionerName : undefined,
      };
      updatedList = [newItem, ...profile.allergies];
    }

    saveUpdatedProfile({
      ...profile,
      allergies: updatedList,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });

    setIsAddingNew(false);
    setEditingItemId(null);
    setFormError(null);
  };

  const startEditAllergy = (item: PatientAllergy) => {
    setAlgAllergen(item.allergen);
    setAlgReaction(item.reactionType);
    setAlgSeverity(item.severity);
    setAlgNotes(item.clinicalNotes || '');
    setAlgSource(item.source);
    setEditingItemId(item.id);
    setIsAddingNew(true);
    setFormError(null);
  };

  const verifyAllergy = (itemId: string) => {
    const now = new Date().toISOString();
    const updated = profile.allergies.map((a) =>
      a.id === itemId
        ? {
            ...a,
            verificationStatus: 'verified' as const,
            verifiedAt: now,
            verifiedBy: practitionerName,
          }
        : a
    );
    saveUpdatedProfile({
      ...profile,
      allergies: updated,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const disputeAllergy = (itemId: string) => {
    const notes = window.prompt('Clinical note for disputing this allergy record:');
    if (notes === null) return;
    const now = new Date().toISOString();
    const updated = profile.allergies.map((a) =>
      a.id === itemId
        ? {
            ...a,
            verificationStatus: 'disputed' as const,
            verificationNotes: notes.trim() || 'Disputed during clinician safety review.',
          }
        : a
    );
    saveUpdatedProfile({
      ...profile,
      allergies: updated,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const deleteAllergy = (itemId: string) => {
    const updated = profile.allergies.filter((a) => a.id !== itemId);
    saveUpdatedProfile({
      ...profile,
      allergies: updated,
    });
    setDeleteConfirmId(null);
  };

  // ==========================================
  // PRECAUTIONS HANDLERS
  // ==========================================
  const handleSavePrecaution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prcPrecaution.trim()) {
      setFormError('Precaution title is required.');
      return;
    }
    if (!prcDetails.trim()) {
      setFormError('Clinical details / rationale are required.');
      return;
    }

    const now = new Date().toISOString();
    let updatedList: PatientPersistentPrecaution[];

    if (editingItemId) {
      updatedList = profile.persistentPrecautions.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            precaution: prcPrecaution.trim(),
            category: prcCategory,
            bodyRegion: prcBodyRegion.trim() || undefined,
            details: prcDetails.trim(),
            source: prcSource,
          };
        }
        return item;
      });
    } else {
      const newItem: PatientPersistentPrecaution = {
        id: `prc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        precaution: prcPrecaution.trim(),
        category: prcCategory,
        bodyRegion: prcBodyRegion.trim() || undefined,
        details: prcDetails.trim(),
        source: prcSource,
        recordedAt: now,
        recordedBy: practitionerName,
        verificationStatus: prcSource === 'clinician_entry' ? 'verified' : 'unverified',
        verifiedAt: prcSource === 'clinician_entry' ? now : undefined,
        verifiedBy: prcSource === 'clinician_entry' ? practitionerName : undefined,
      };
      updatedList = [newItem, ...profile.persistentPrecautions];
    }

    saveUpdatedProfile({
      ...profile,
      persistentPrecautions: updatedList,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });

    setIsAddingNew(false);
    setEditingItemId(null);
    setFormError(null);
  };

  const startEditPrecaution = (item: PatientPersistentPrecaution) => {
    setPrcPrecaution(item.precaution);
    setPrcCategory(item.category);
    setPrcBodyRegion(item.bodyRegion || '');
    setPrcDetails(item.details);
    setPrcSource(item.source);
    setEditingItemId(item.id);
    setIsAddingNew(true);
    setFormError(null);
  };

  const verifyPrecaution = (itemId: string) => {
    const now = new Date().toISOString();
    const updated = profile.persistentPrecautions.map((p) =>
      p.id === itemId
        ? {
            ...p,
            verificationStatus: 'verified' as const,
            verifiedAt: now,
            verifiedBy: practitionerName,
          }
        : p
    );
    saveUpdatedProfile({
      ...profile,
      persistentPrecautions: updated,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const disputePrecaution = (itemId: string) => {
    const notes = window.prompt('Clinical note for disputing this precaution:');
    if (notes === null) return;
    const now = new Date().toISOString();
    const updated = profile.persistentPrecautions.map((p) =>
      p.id === itemId
        ? {
            ...p,
            verificationStatus: 'disputed' as const,
            verificationNotes: notes.trim() || 'Disputed by clinician.',
          }
        : p
    );
    saveUpdatedProfile({
      ...profile,
      persistentPrecautions: updated,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const deletePrecaution = (itemId: string) => {
    const updated = profile.persistentPrecautions.filter((p) => p.id !== itemId);
    saveUpdatedProfile({
      ...profile,
      persistentPrecautions: updated,
    });
    setDeleteConfirmId(null);
  };

  // ==========================================
  // SURGICAL HISTORY HANDLERS
  // ==========================================
  const handleSaveSurgery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srgProcedure.trim()) {
      setFormError('Surgical procedure name is required.');
      return;
    }
    if (!srgBodyRegion.trim()) {
      setFormError('Anatomical body region is required.');
      return;
    }
    if (!srgDateOrYear.trim()) {
      setFormError('Approximate date or year is required (e.g. "2021" or "Jun 2018").');
      return;
    }

    const now = new Date().toISOString();
    let updatedList: PatientSurgicalHistoryItem[];

    if (editingItemId) {
      updatedList = profile.surgicalHistory.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            procedure: srgProcedure.trim(),
            approximateDateOrYear: srgDateOrYear.trim(),
            bodyRegion: srgBodyRegion.trim(),
            facilityOrSurgeon: srgSurgeon.trim() || undefined,
            relevantComplicationsOrNotes: srgNotes.trim() || undefined,
            source: srgSource,
          };
        }
        return item;
      });
    } else {
      const newItem: PatientSurgicalHistoryItem = {
        id: `srg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        procedure: srgProcedure.trim(),
        approximateDateOrYear: srgDateOrYear.trim(),
        bodyRegion: srgBodyRegion.trim(),
        facilityOrSurgeon: srgSurgeon.trim() || undefined,
        relevantComplicationsOrNotes: srgNotes.trim() || undefined,
        source: srgSource,
        recordedAt: now,
        recordedBy: practitionerName,
        verificationStatus: srgSource === 'clinician_entry' ? 'verified' : 'unverified',
        verifiedAt: srgSource === 'clinician_entry' ? now : undefined,
        verifiedBy: srgSource === 'clinician_entry' ? practitionerName : undefined,
      };
      updatedList = [newItem, ...profile.surgicalHistory];
    }

    saveUpdatedProfile({
      ...profile,
      surgicalHistory: updatedList,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });

    setIsAddingNew(false);
    setEditingItemId(null);
    setFormError(null);
  };

  const startEditSurgery = (item: PatientSurgicalHistoryItem) => {
    setSrgProcedure(item.procedure);
    setSrgDateOrYear(item.approximateDateOrYear);
    setSrgBodyRegion(item.bodyRegion);
    setSrgSurgeon(item.facilityOrSurgeon || '');
    setSrgNotes(item.relevantComplicationsOrNotes || '');
    setSrgSource(item.source);
    setEditingItemId(item.id);
    setIsAddingNew(true);
    setFormError(null);
  };

  const verifySurgery = (itemId: string) => {
    const now = new Date().toISOString();
    const updated = profile.surgicalHistory.map((s) =>
      s.id === itemId
        ? {
            ...s,
            verificationStatus: 'verified' as const,
            verifiedAt: now,
            verifiedBy: practitionerName,
          }
        : s
    );
    saveUpdatedProfile({
      ...profile,
      surgicalHistory: updated,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const disputeSurgery = (itemId: string) => {
    const notes = window.prompt('Clinical note regarding surgical history dispute:');
    if (notes === null) return;
    const now = new Date().toISOString();
    const updated = profile.surgicalHistory.map((s) =>
      s.id === itemId
        ? {
            ...s,
            verificationStatus: 'disputed' as const,
            verificationNotes: notes.trim() || 'Disputed during safety review.',
          }
        : s
    );
    saveUpdatedProfile({
      ...profile,
      surgicalHistory: updated,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const deleteSurgery = (itemId: string) => {
    const updated = profile.surgicalHistory.filter((s) => s.id !== itemId);
    saveUpdatedProfile({
      ...profile,
      surgicalHistory: updated,
    });
    setDeleteConfirmId(null);
  };

  // ==========================================
  // MEDICAL CONDITIONS HANDLERS
  // ==========================================
  const handleSaveCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cndName.trim()) {
      setFormError('Medical condition name is required.');
      return;
    }
    if (!cndRelevance.trim()) {
      setFormError('Clinical relevance to physiotherapy is required.');
      return;
    }

    const now = new Date().toISOString();
    let updatedList: PatientMedicalCondition[];

    if (editingItemId) {
      updatedList = profile.persistentMedicalConditions.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            conditionName: cndName.trim(),
            diagnosedYearOrDate: cndYearOrDate.trim() || undefined,
            clinicalRelevanceToPhysio: cndRelevance.trim(),
            isActive: cndIsActive,
            source: cndSource,
          };
        }
        return item;
      });
    } else {
      const newItem: PatientMedicalCondition = {
        id: `cnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        conditionName: cndName.trim(),
        diagnosedYearOrDate: cndYearOrDate.trim() || undefined,
        clinicalRelevanceToPhysio: cndRelevance.trim(),
        isActive: cndIsActive,
        source: cndSource,
        recordedAt: now,
        recordedBy: practitionerName,
        verificationStatus: cndSource === 'clinician_entry' ? 'verified' : 'unverified',
        verifiedAt: cndSource === 'clinician_entry' ? now : undefined,
        verifiedBy: cndSource === 'clinician_entry' ? practitionerName : undefined,
      };
      updatedList = [newItem, ...profile.persistentMedicalConditions];
    }

    saveUpdatedProfile({
      ...profile,
      persistentMedicalConditions: updatedList,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });

    setIsAddingNew(false);
    setEditingItemId(null);
    setFormError(null);
  };

  const startEditCondition = (item: PatientMedicalCondition) => {
    setCndName(item.conditionName);
    setCndYearOrDate(item.diagnosedYearOrDate || '');
    setCndRelevance(item.clinicalRelevanceToPhysio);
    setCndIsActive(item.isActive);
    setCndSource(item.source);
    setEditingItemId(item.id);
    setIsAddingNew(true);
    setFormError(null);
  };

  const verifyCondition = (itemId: string) => {
    const now = new Date().toISOString();
    const updated = profile.persistentMedicalConditions.map((c) =>
      c.id === itemId
        ? {
            ...c,
            verificationStatus: 'verified' as const,
            verifiedAt: now,
            verifiedBy: practitionerName,
          }
        : c
    );
    saveUpdatedProfile({
      ...profile,
      persistentMedicalConditions: updated,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const disputeCondition = (itemId: string) => {
    const notes = window.prompt('Clinical note regarding condition dispute:');
    if (notes === null) return;
    const now = new Date().toISOString();
    const updated = profile.persistentMedicalConditions.map((c) =>
      c.id === itemId
        ? {
            ...c,
            verificationStatus: 'disputed' as const,
            verificationNotes: notes.trim() || 'Disputed during safety review.',
          }
        : c
    );
    saveUpdatedProfile({
      ...profile,
      persistentMedicalConditions: updated,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const deleteCondition = (itemId: string) => {
    const updated = profile.persistentMedicalConditions.filter((c) => c.id !== itemId);
    saveUpdatedProfile({
      ...profile,
      persistentMedicalConditions: updated,
    });
    setDeleteConfirmId(null);
  };

  // ==========================================
  // MOBILITY CONTEXT HANDLER
  // ==========================================
  const handleSaveMobility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobBaseline.trim()) {
      setFormError('Baseline mobility status is required.');
      return;
    }

    const devices = mobDevicesText
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const now = new Date().toISOString();
    const mobilityContext: PatientMobilityContext = {
      baselineMobilityStatus: mobBaseline.trim(),
      enduringAssistiveDevices: devices,
      relevantEnvironmentalBarriers: mobBarriers.trim() || undefined,
      source: mobSource,
      recordedAt: profile.enduringMobilityContext?.recordedAt || now,
      recordedBy: profile.enduringMobilityContext?.recordedBy || practitionerName,
      verificationStatus: mobStatus,
      verifiedAt: mobStatus === 'verified' ? now : undefined,
      verifiedBy: mobStatus === 'verified' ? practitionerName : undefined,
    };

    saveUpdatedProfile({
      ...profile,
      enduringMobilityContext: mobilityContext,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });

    setFormError(null);
  };

  const handleClearMobility = () => {
    if (window.confirm('Clear enduring mobility context from this patient record?')) {
      saveUpdatedProfile({
        ...profile,
        enduringMobilityContext: undefined,
      });
      setMobBaseline('');
      setMobDevicesText('');
      setMobBarriers('');
      setMobStatus('unverified');
    }
  };

  const handleMarkAllReviewed = () => {
    const now = new Date().toISOString();
    saveUpdatedProfile({
      ...profile,
      lastReviewedAt: now,
      lastReviewedBy: practitionerName,
    });
  };

  const resetFormState = () => {
    setIsAddingNew(false);
    setEditingItemId(null);
    setDeleteConfirmId(null);
    setFormError(null);

    // Allergies
    setAlgAllergen('');
    setAlgReaction('');
    setAlgSeverity('moderate');
    setAlgNotes('');
    setAlgSource('clinician_entry');

    // Precautions
    setPrcPrecaution('');
    setPrcCategory('biomechanical');
    setPrcBodyRegion('');
    setPrcDetails('');
    setPrcSource('clinician_entry');

    // Surgeries
    setSrgProcedure('');
    setSrgDateOrYear('');
    setSrgBodyRegion('');
    setSrgSurgeon('');
    setSrgNotes('');
    setSrgSource('patient_reported');

    // Conditions
    setCndName('');
    setCndYearOrDate('');
    setCndRelevance('');
    setCndIsActive(true);
    setCndSource('clinician_entry');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#141A16]/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-3xl bg-[#FAF8F5] border border-[#E0D9CE] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D8] bg-[#F5F1EB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E2ECE6] text-[#1B3B2B] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="safety-modal-title" className="text-base font-semibold text-[#18201C] tracking-tight">
                  Patient Safety & Persistent Medical Profile
                </h2>
              </div>
              <p className="text-xs text-[#636A64]">
                {patient.fullName} ({patient.patientNumber || 'PC-0001'}) • Persistent patient-level context
              </p>
            </div>
          </div>
          <button
            id="safety-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#636A64] hover:text-[#18201C] hover:bg-[#EAE4DB] rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#E8E2D8] bg-[#FAF8F5] overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              resetFormState();
              setActiveTab('allergies');
            }}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'allergies'
                ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
                : 'border-transparent text-[#636A64] hover:text-[#18201C]'
            }`}
          >
            <span>Allergies</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EAE5DC] text-[#414843]">
              {profile.allergies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetFormState();
              setActiveTab('precautions');
            }}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'precautions'
                ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
                : 'border-transparent text-[#636A64] hover:text-[#18201C]'
            }`}
          >
            <span>Precautions & Implants</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EAE5DC] text-[#414843]">
              {profile.persistentPrecautions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetFormState();
              setActiveTab('surgeries');
            }}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'surgeries'
                ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
                : 'border-transparent text-[#636A64] hover:text-[#18201C]'
            }`}
          >
            <span>Surgical History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EAE5DC] text-[#414843]">
              {profile.surgicalHistory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetFormState();
              setActiveTab('conditions');
            }}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'conditions'
                ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
                : 'border-transparent text-[#636A64] hover:text-[#18201C]'
            }`}
          >
            <span>Medical Conditions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EAE5DC] text-[#414843]">
              {profile.persistentMedicalConditions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetFormState();
              setActiveTab('mobility');
            }}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mobility'
                ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
                : 'border-transparent text-[#636A64] hover:text-[#18201C]'
            }`}
          >
            <span>Mobility Context</span>
            {profile.enduringMobilityContext && (
              <span className="w-2 h-2 rounded-full bg-[#1B3B2B]" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {formError && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#B91C1C] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* ==================== TAB 1: ALLERGIES ==================== */}
          {activeTab === 'allergies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#18201C]">Allergies & Adverse Drug / Material Reactions</h3>
                  <p className="text-xs text-[#636A64]">
                    Document persistent hypersensitivities (e.g. latex, tape, NSAIDs, penicillin).
                  </p>
                </div>
                {!isAddingNew && (
                  <Button
                    id="add-allergy-btn"
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      resetFormState();
                      setIsAddingNew(true);
                    }}
                  >
                    Add Allergy
                  </Button>
                )}
              </div>

              {/* Allergy Form */}
              {isAddingNew && (
                <form
                  onSubmit={handleSaveAllergy}
                  className="bg-[#FFFFFF] border border-[#DDD6CB] rounded-xl p-4.5 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE4DB]">
                    <h4 className="text-xs font-semibold text-[#18201C] uppercase tracking-wider">
                      {editingItemId ? 'Edit Allergy Record' : 'New Allergy Record'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetFormState}
                      className="text-xs text-[#636A64] hover:text-[#18201C] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">
                        Allergen / Substance <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Latex, Adhesive tape, NSAIDs, Penicillin"
                        value={algAllergen}
                        onChange={(e) => setAlgAllergen(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">
                        Reaction Type <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Contact dermatitis, Anaphylaxis, Rash, Bronchospasm"
                        value={algReaction}
                        onChange={(e) => setAlgReaction(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Severity Rating</label>
                      <select
                        value={algSeverity}
                        onChange={(e) => setAlgSeverity(e.target.value as AllergySeverity)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        <option value="mild">Mild (Localized rash, mild itching)</option>
                        <option value="moderate">Moderate (Widespread urticaria, mild facial swelling)</option>
                        <option value="severe">Severe (Marked respiratory distress, extensive angioedema)</option>
                        <option value="life_threatening">Life-Threatening (Anaphylaxis, cardiovascular collapse)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Provenance Source</label>
                      <select
                        value={algSource}
                        onChange={(e) => setAlgSource(e.target.value as SafetyProvenanceSource)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        <option value="clinician_entry">Clinician Entered (Direct Observation)</option>
                        <option value="patient_reported">Patient Reported</option>
                        <option value="referral_letter">Referral Letter / Medical Transfer</option>
                        <option value="external_medical_record">External Medical Record / Hospital Summary</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-[#2E3530] block mb-1">Clinical Notes & Precautions</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Strict non-latex gloves and bands required for all rehabilitation sessions."
                      value={algNotes}
                      onChange={(e) => setAlgNotes(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4DB]">
                    <Button id="cancel-alg-form" variant="secondary" size="sm" type="button" onClick={resetFormState}>
                      Cancel
                    </Button>
                    <Button id="save-alg-form" variant="primary" size="sm" type="submit">
                      {editingItemId ? 'Update Allergy' : 'Save Allergy Record'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Allergy List */}
              {profile.allergies.length === 0 && !isAddingNew ? (
                <div className="p-6 text-center rounded-xl bg-[#F6F2EB] border border-[#E8E2D7] space-y-2">
                  <p className="text-sm font-semibold text-[#2D3530]">No allergies recorded.</p>
                  <p className="text-xs text-[#636A64] max-w-md mx-auto">
                    No persistent hypersensitivities or drug reactions documented for this patient.
                  </p>
                  <Button
                    id="empty-add-allergy-btn"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsAddingNew(true)}
                  >
                    Add First Allergy Record
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.allergies.map((item) => {
                    const sevStyle = SEVERITY_COLORS[item.severity];
                    const isDisputed = item.verificationStatus === 'disputed';
                    const isVerified = item.verificationStatus === 'verified';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isDisputed
                            ? 'bg-[#FDF2F2] border-[#FCA5A5]'
                            : isVerified
                            ? 'bg-[#FFFFFF] border-[#DCE4DF]'
                            : 'bg-[#FFFDF7] border-[#E8DFCF]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-[#18201C]">{item.allergen}</h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
                              >
                                {item.severity.replace('_', ' ')}
                              </span>

                              {/* Verification Status Badge */}
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  <CheckCircle2 className="w-3 h-3 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {!isVerified && !isDisputed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF9EB] text-[#854D0E] border border-[#FDE68A]">
                                  <AlertTriangle className="w-3 h-3 text-[#854D0E]" />
                                  <span>Unverified</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]">
                                  <HelpCircle className="w-3 h-3 text-[#991B1B]" />
                                  <span>Disputed</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#2D3530] leading-relaxed">
                              <span className="font-semibold text-[#525954]">Reaction:</span> {item.reactionType}
                            </p>

                            {item.clinicalNotes && (
                              <p className="text-xs text-[#636A64] italic leading-relaxed">
                                Note: {item.clinicalNotes}
                              </p>
                            )}

                            {/* Provenance Footer */}
                            <div className="pt-2 text-[11px] text-[#6A726C] flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>Source: {SOURCE_LABELS[item.source]}</span>
                              <span>•</span>
                              <span>Recorded: {formatClinicalDate(item.recordedAt)} by {item.recordedBy}</span>
                              {item.verifiedAt && item.verifiedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#1B3B2B] font-medium">
                                    Verified: {formatClinicalDate(item.verifiedAt)} by {item.verifiedBy}
                                  </span>
                                </>
                              )}
                              {item.verificationNotes && (
                                <span className="w-full text-[#991B1B] italic">
                                  Dispute context: {item.verificationNotes}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Item Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                            {!isVerified && (
                              <button
                                type="button"
                                onClick={() => verifyAllergy(item.id)}
                                title="Verify record as clinical staff"
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#EBF2EE] text-[#1B3B2B] hover:bg-[#D8E6DE] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                            )}

                            {!isDisputed && (
                              <button
                                type="button"
                                onClick={() => disputeAllergy(item.id)}
                                title="Mark item as requiring clinical clarification"
                                className="px-2.5 py-1 text-xs font-medium rounded-md text-[#6A726C] hover:text-[#991B1B] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
                              >
                                Dispute
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => startEditAllergy(item)}
                              title="Edit item"
                              className="p-1.5 text-[#555C57] hover:text-[#18201C] hover:bg-[#EAE4DB] rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {deleteConfirmId === item.id ? (
                              <div className="flex items-center gap-1 bg-[#FDF2F2] p-1 rounded-md border border-[#FCA5A5]">
                                <span className="text-[10px] text-[#991B1B] font-semibold px-1">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => deleteAllergy(item.id)}
                                  className="text-[10px] font-bold text-[#991B1B] hover:underline px-1 cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[10px] text-[#555C57] hover:underline px-1 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(item.id)}
                                title="Delete allergy record"
                                className="p-1.5 text-[#88908A] hover:text-[#B91C1C] hover:bg-[#FDF2F2] rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: PRECAUTIONS & IMPLANTS ==================== */}
          {activeTab === 'precautions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#18201C]">Persistent Precautions & Physical Implants</h3>
                  <p className="text-xs text-[#636A64]">
                    Document spinal hardware, joint replacements, pacemakers, or structural contraindications.
                  </p>
                </div>
                {!isAddingNew && (
                  <Button
                    id="add-precaution-btn"
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      resetFormState();
                      setIsAddingNew(true);
                    }}
                  >
                    Add Precaution
                  </Button>
                )}
              </div>

              {/* Precaution Form */}
              {isAddingNew && (
                <form
                  onSubmit={handleSavePrecaution}
                  className="bg-[#FFFFFF] border border-[#DDD6CB] rounded-xl p-4.5 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE4DB]">
                    <h4 className="text-xs font-semibold text-[#18201C] uppercase tracking-wider">
                      {editingItemId ? 'Edit Precaution Record' : 'New Persistent Precaution'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetFormState}
                      className="text-xs text-[#636A64] hover:text-[#18201C] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="font-medium text-[#2E3530] block mb-1">
                        Precaution / Implant Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Spinal fusion hardware L4-S1, Total Hip Replacement (Posterior)"
                        value={prcPrecaution}
                        onChange={(e) => setPrcPrecaution(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Category</label>
                      <select
                        value={prcCategory}
                        onChange={(e) => setPrcCategory(e.target.value as PersistentPrecautionCategory)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        {PRECAUTION_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Anatomical Body Region</label>
                      <input
                        type="text"
                        placeholder="e.g. Lumbar spine, Right Hip, Cervical"
                        value={prcBodyRegion}
                        onChange={(e) => setPrcBodyRegion(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-medium text-[#2E3530] block mb-1">Provenance Source</label>
                      <select
                        value={prcSource}
                        onChange={(e) => setPrcSource(e.target.value as SafetyProvenanceSource)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        <option value="clinician_entry">Clinician Entered</option>
                        <option value="patient_reported">Patient Reported</option>
                        <option value="referral_letter">Referral Letter / Medical Transfer</option>
                        <option value="external_medical_record">External Medical Record</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-[#2E3530] block mb-1">
                      Clinical Details & Specific Directives <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Posterior hip precautions: avoid flexion > 90°, adduction past midline, and internal rotation."
                      value={prcDetails}
                      onChange={(e) => setPrcDetails(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4DB]">
                    <Button id="cancel-prc-form" variant="secondary" size="sm" type="button" onClick={resetFormState}>
                      Cancel
                    </Button>
                    <Button id="save-prc-form" variant="primary" size="sm" type="submit">
                      {editingItemId ? 'Update Precaution' : 'Save Precaution'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Precaution List */}
              {profile.persistentPrecautions.length === 0 && !isAddingNew ? (
                <div className="p-6 text-center rounded-xl bg-[#F6F2EB] border border-[#E8E2D7] space-y-2">
                  <p className="text-sm font-semibold text-[#2D3530]">No persistent precautions recorded.</p>
                  <p className="text-xs text-[#636A64] max-w-md mx-auto">
                    No hardware implants, surgical restrictions, or enduring biomechanical precautions recorded.
                  </p>
                  <Button
                    id="empty-add-prc-btn"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsAddingNew(true)}
                  >
                    Add First Precaution Record
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.persistentPrecautions.map((item) => {
                    const isDisputed = item.verificationStatus === 'disputed';
                    const isVerified = item.verificationStatus === 'verified';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isDisputed
                            ? 'bg-[#FDF2F2] border-[#FCA5A5]'
                            : isVerified
                            ? 'bg-[#FFFFFF] border-[#DCE4DF]'
                            : 'bg-[#FFFDF7] border-[#E8DFCF]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-[#18201C]">{item.precaution}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                {item.category}
                              </span>
                              {item.bodyRegion && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB]">
                                  {item.bodyRegion}
                                </span>
                              )}

                              {/* Status Badge */}
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  <CheckCircle2 className="w-3 h-3 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {!isVerified && !isDisputed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF9EB] text-[#854D0E] border border-[#FDE68A]">
                                  <AlertTriangle className="w-3 h-3 text-[#854D0E]" />
                                  <span>Unverified</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]">
                                  <HelpCircle className="w-3 h-3 text-[#991B1B]" />
                                  <span>Disputed</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#2D3530] leading-relaxed">{item.details}</p>

                            {/* Provenance */}
                            <div className="pt-2 text-[11px] text-[#6A726C] flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>Source: {SOURCE_LABELS[item.source]}</span>
                              <span>•</span>
                              <span>Recorded: {formatClinicalDate(item.recordedAt)} by {item.recordedBy}</span>
                              {item.verifiedAt && item.verifiedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#1B3B2B] font-medium">
                                    Verified: {formatClinicalDate(item.verifiedAt)} by {item.verifiedBy}
                                  </span>
                                </>
                              )}
                              {item.verificationNotes && (
                                <span className="w-full text-[#991B1B] italic">
                                  Dispute notes: {item.verificationNotes}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                            {!isVerified && (
                              <button
                                type="button"
                                onClick={() => verifyPrecaution(item.id)}
                                title="Verify record as clinical staff"
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#EBF2EE] text-[#1B3B2B] hover:bg-[#D8E6DE] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                            )}

                            {!isDisputed && (
                              <button
                                type="button"
                                onClick={() => disputePrecaution(item.id)}
                                title="Mark item as requiring clarification"
                                className="px-2.5 py-1 text-xs font-medium rounded-md text-[#6A726C] hover:text-[#991B1B] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
                              >
                                Dispute
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => startEditPrecaution(item)}
                              title="Edit item"
                              className="p-1.5 text-[#555C57] hover:text-[#18201C] hover:bg-[#EAE4DB] rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {deleteConfirmId === item.id ? (
                              <div className="flex items-center gap-1 bg-[#FDF2F2] p-1 rounded-md border border-[#FCA5A5]">
                                <span className="text-[10px] text-[#991B1B] font-semibold px-1">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => deletePrecaution(item.id)}
                                  className="text-[10px] font-bold text-[#991B1B] hover:underline px-1 cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[10px] text-[#555C57] hover:underline px-1 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(item.id)}
                                title="Delete precaution"
                                className="p-1.5 text-[#88908A] hover:text-[#B91C1C] hover:bg-[#FDF2F2] rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: SURGICAL HISTORY ==================== */}
          {activeTab === 'surgeries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#18201C]">Significant Surgical History</h3>
                  <p className="text-xs text-[#636A64]">
                    Document prior orthopedic, spinal, cardiovascular, or general procedures relevant to physical function.
                  </p>
                </div>
                {!isAddingNew && (
                  <Button
                    id="add-surgery-btn"
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      resetFormState();
                      setIsAddingNew(true);
                    }}
                  >
                    Add Surgery
                  </Button>
                )}
              </div>

              {/* Surgery Form */}
              {isAddingNew && (
                <form
                  onSubmit={handleSaveSurgery}
                  className="bg-[#FFFFFF] border border-[#DDD6CB] rounded-xl p-4.5 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE4DB]">
                    <h4 className="text-xs font-semibold text-[#18201C] uppercase tracking-wider">
                      {editingItemId ? 'Edit Surgical History' : 'New Surgical History Record'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetFormState}
                      className="text-xs text-[#636A64] hover:text-[#18201C] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="font-medium text-[#2E3530] block mb-1">
                        Procedure <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Left Knee ACL Reconstruction (Hamstring autograft)"
                        value={srgProcedure}
                        onChange={(e) => setSrgProcedure(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">
                        Approximate Date / Year <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2019 or May 2017"
                        value={srgDateOrYear}
                        onChange={(e) => setSrgDateOrYear(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">
                        Body Region <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Left Knee, Cervical spine"
                        value={srgBodyRegion}
                        onChange={(e) => setSrgBodyRegion(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Facility / Surgeon (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. St. Thomas Hospital"
                        value={srgSurgeon}
                        onChange={(e) => setSrgSurgeon(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Provenance Source</label>
                      <select
                        value={srgSource}
                        onChange={(e) => setSrgSource(e.target.value as SafetyProvenanceSource)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        <option value="patient_reported">Patient Reported</option>
                        <option value="referral_letter">Referral Letter</option>
                        <option value="external_medical_record">External Medical Record</option>
                        <option value="clinician_entry">Clinician Entered</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-[#2E3530] block mb-1">
                      Complications, Graft Notes, or Recovery Course
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Uncomplicated recovery; full knee extension achieved at 8 weeks post-op."
                      value={srgNotes}
                      onChange={(e) => setSrgNotes(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4DB]">
                    <Button id="cancel-srg-form" variant="secondary" size="sm" type="button" onClick={resetFormState}>
                      Cancel
                    </Button>
                    <Button id="save-srg-form" variant="primary" size="sm" type="submit">
                      {editingItemId ? 'Update Surgical History' : 'Save Surgical History'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Surgery List */}
              {profile.surgicalHistory.length === 0 && !isAddingNew ? (
                <div className="p-6 text-center rounded-xl bg-[#F6F2EB] border border-[#E8E2D7] space-y-2">
                  <p className="text-sm font-semibold text-[#2D3530]">No significant surgical history recorded.</p>
                  <p className="text-xs text-[#636A64] max-w-md mx-auto">
                    No major operations or prior musculoskeletal surgical interventions documented.
                  </p>
                  <Button
                    id="empty-add-srg-btn"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsAddingNew(true)}
                  >
                    Add Surgical History
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.surgicalHistory.map((item) => {
                    const isDisputed = item.verificationStatus === 'disputed';
                    const isVerified = item.verificationStatus === 'verified';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isDisputed
                            ? 'bg-[#FDF2F2] border-[#FCA5A5]'
                            : isVerified
                            ? 'bg-[#FFFFFF] border-[#DCE4DF]'
                            : 'bg-[#FFFDF7] border-[#E8DFCF]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-[#18201C]">{item.procedure}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                {item.approximateDateOrYear}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB]">
                                {item.bodyRegion}
                              </span>

                              {/* Status Badge */}
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  <CheckCircle2 className="w-3 h-3 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {!isVerified && !isDisputed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF9EB] text-[#854D0E] border border-[#FDE68A]">
                                  <AlertTriangle className="w-3 h-3 text-[#854D0E]" />
                                  <span>Unverified</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]">
                                  <HelpCircle className="w-3 h-3 text-[#991B1B]" />
                                  <span>Disputed</span>
                                </span>
                              )}
                            </div>

                            {item.facilityOrSurgeon && (
                              <p className="text-xs text-[#555C57]">
                                <span className="font-semibold">Facility / Surgeon:</span> {item.facilityOrSurgeon}
                              </p>
                            )}

                            {item.relevantComplicationsOrNotes && (
                              <p className="text-xs text-[#2D3530] leading-relaxed">
                                {item.relevantComplicationsOrNotes}
                              </p>
                            )}

                            {/* Provenance */}
                            <div className="pt-2 text-[11px] text-[#6A726C] flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>Source: {SOURCE_LABELS[item.source]}</span>
                              <span>•</span>
                              <span>Recorded: {formatClinicalDate(item.recordedAt)} by {item.recordedBy}</span>
                              {item.verifiedAt && item.verifiedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#1B3B2B] font-medium">
                                    Verified: {formatClinicalDate(item.verifiedAt)} by {item.verifiedBy}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                            {!isVerified && (
                              <button
                                type="button"
                                onClick={() => verifySurgery(item.id)}
                                title="Verify record as clinical staff"
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#EBF2EE] text-[#1B3B2B] hover:bg-[#D8E6DE] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                            )}

                            {!isDisputed && (
                              <button
                                type="button"
                                onClick={() => disputeSurgery(item.id)}
                                title="Mark item as requiring clarification"
                                className="px-2.5 py-1 text-xs font-medium rounded-md text-[#6A726C] hover:text-[#991B1B] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
                              >
                                Dispute
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => startEditSurgery(item)}
                              title="Edit surgery"
                              className="p-1.5 text-[#555C57] hover:text-[#18201C] hover:bg-[#EAE4DB] rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {deleteConfirmId === item.id ? (
                              <div className="flex items-center gap-1 bg-[#FDF2F2] p-1 rounded-md border border-[#FCA5A5]">
                                <span className="text-[10px] text-[#991B1B] font-semibold px-1">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => deleteSurgery(item.id)}
                                  className="text-[10px] font-bold text-[#991B1B] hover:underline px-1 cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[10px] text-[#555C57] hover:underline px-1 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(item.id)}
                                title="Delete surgery"
                                className="p-1.5 text-[#88908A] hover:text-[#B91C1C] hover:bg-[#FDF2F2] rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 4: MEDICAL CONDITIONS ==================== */}
          {activeTab === 'conditions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#18201C]">Persistent Medical Conditions & Comorbidities</h3>
                  <p className="text-xs text-[#636A64]">
                    Long-standing systemic conditions (e.g. Type 1 Diabetes, Rheumatoid Arthritis, Osteoporosis).
                  </p>
                </div>
                {!isAddingNew && (
                  <Button
                    id="add-condition-btn"
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      resetFormState();
                      setIsAddingNew(true);
                    }}
                  >
                    Add Condition
                  </Button>
                )}
              </div>

              {/* Condition Form */}
              {isAddingNew && (
                <form
                  onSubmit={handleSaveCondition}
                  className="bg-[#FFFFFF] border border-[#DDD6CB] rounded-xl p-4.5 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE4DB]">
                    <h4 className="text-xs font-semibold text-[#18201C] uppercase tracking-wider">
                      {editingItemId ? 'Edit Medical Condition' : 'New Persistent Medical Condition'}
                    </h4>
                    <button
                      type="button"
                      onClick={resetFormState}
                      className="text-xs text-[#636A64] hover:text-[#18201C] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="font-medium text-[#2E3530] block mb-1">
                        Condition Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Type 1 Diabetes Mellitus, Severe Osteoporosis, Ankylosing Spondylitis"
                        value={cndName}
                        onChange={(e) => setCndName(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Diagnosed Year / Date</label>
                      <input
                        type="text"
                        placeholder="e.g. 2014 or Approx 10 yrs ago"
                        value={cndYearOrDate}
                        onChange={(e) => setCndYearOrDate(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Status</label>
                      <select
                        value={cndIsActive ? 'active' : 'inactive'}
                        onChange={(e) => setCndIsActive(e.target.value === 'active')}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        <option value="active">Active / Ongoing</option>
                        <option value="inactive">Inactive / In Remission</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-medium text-[#2E3530] block mb-1">Provenance Source</label>
                      <select
                        value={cndSource}
                        onChange={(e) => setCndSource(e.target.value as SafetyProvenanceSource)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        <option value="clinician_entry">Clinician Entered</option>
                        <option value="patient_reported">Patient Reported</option>
                        <option value="referral_letter">Referral Letter</option>
                        <option value="external_medical_record">External Medical Record</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-[#2E3530] block mb-1">
                      Clinical Relevance to Physiotherapy Management <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Impaired peripheral sensation; potential autonomic instability; delayed healing; altered bone density."
                      value={cndRelevance}
                      onChange={(e) => setCndRelevance(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4DB]">
                    <Button id="cancel-cnd-form" variant="secondary" size="sm" type="button" onClick={resetFormState}>
                      Cancel
                    </Button>
                    <Button id="save-cnd-form" variant="primary" size="sm" type="submit">
                      {editingItemId ? 'Update Condition' : 'Save Condition'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Condition List */}
              {profile.persistentMedicalConditions.length === 0 && !isAddingNew ? (
                <div className="p-6 text-center rounded-xl bg-[#F6F2EB] border border-[#E8E2D7] space-y-2">
                  <p className="text-sm font-semibold text-[#2D3530]">No persistent medical conditions recorded.</p>
                  <p className="text-xs text-[#636A64] max-w-md mx-auto">
                    No long-standing chronic medical comorbidities or systemic diagnoses documented.
                  </p>
                  <Button
                    id="empty-add-cnd-btn"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsAddingNew(true)}
                  >
                    Add Medical Condition
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.persistentMedicalConditions.map((item) => {
                    const isDisputed = item.verificationStatus === 'disputed';
                    const isVerified = item.verificationStatus === 'verified';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isDisputed
                            ? 'bg-[#FDF2F2] border-[#FCA5A5]'
                            : isVerified
                            ? 'bg-[#FFFFFF] border-[#DCE4DF]'
                            : 'bg-[#FFFDF7] border-[#E8DFCF]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-[#18201C]">{item.conditionName}</h4>
                              {item.diagnosedYearOrDate && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F4EFEB] text-[#555C56] border border-[#DED7CB]">
                                  Dx: {item.diagnosedYearOrDate}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                  item.isActive
                                    ? 'bg-[#EBF2EE] text-[#1B3B2B] border-[#D5E2DA]'
                                    : 'bg-[#F4EFEB] text-[#6A726C] border-[#DDD6CB]'
                                }`}
                              >
                                {item.isActive ? 'Active' : 'Inactive / In Remission'}
                              </span>

                              {/* Status Badge */}
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                                  <CheckCircle2 className="w-3 h-3 text-[#1B3B2B]" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {!isVerified && !isDisputed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF9EB] text-[#854D0E] border border-[#FDE68A]">
                                  <AlertTriangle className="w-3 h-3 text-[#854D0E]" />
                                  <span>Unverified</span>
                                </span>
                              )}
                              {isDisputed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]">
                                  <HelpCircle className="w-3 h-3 text-[#991B1B]" />
                                  <span>Disputed</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#2D3530] leading-relaxed">
                              <span className="font-semibold text-[#525954]">Physio Relevance:</span> {item.clinicalRelevanceToPhysio}
                            </p>

                            {/* Provenance */}
                            <div className="pt-2 text-[11px] text-[#6A726C] flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>Source: {SOURCE_LABELS[item.source]}</span>
                              <span>•</span>
                              <span>Recorded: {formatClinicalDate(item.recordedAt)} by {item.recordedBy}</span>
                              {item.verifiedAt && item.verifiedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#1B3B2B] font-medium">
                                    Verified: {formatClinicalDate(item.verifiedAt)} by {item.verifiedBy}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                            {!isVerified && (
                              <button
                                type="button"
                                onClick={() => verifyCondition(item.id)}
                                title="Verify record as clinical staff"
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#EBF2EE] text-[#1B3B2B] hover:bg-[#D8E6DE] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                            )}

                            {!isDisputed && (
                              <button
                                type="button"
                                onClick={() => disputeCondition(item.id)}
                                title="Mark item as requiring clarification"
                                className="px-2.5 py-1 text-xs font-medium rounded-md text-[#6A726C] hover:text-[#991B1B] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
                              >
                                Dispute
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => startEditCondition(item)}
                              title="Edit condition"
                              className="p-1.5 text-[#555C57] hover:text-[#18201C] hover:bg-[#EAE4DB] rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {deleteConfirmId === item.id ? (
                              <div className="flex items-center gap-1 bg-[#FDF2F2] p-1 rounded-md border border-[#FCA5A5]">
                                <span className="text-[10px] text-[#991B1B] font-semibold px-1">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => deleteCondition(item.id)}
                                  className="text-[10px] font-bold text-[#991B1B] hover:underline px-1 cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[10px] text-[#555C57] hover:underline px-1 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(item.id)}
                                title="Delete condition"
                                className="p-1.5 text-[#88908A] hover:text-[#B91C1C] hover:bg-[#FDF2F2] rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 5: MOBILITY CONTEXT ==================== */}
          {activeTab === 'mobility' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#18201C]">Enduring Mobility Context & Baseline Status</h3>
                <p className="text-xs text-[#636A64]">
                  Long-standing baseline functional ambulation, permanent assistive equipment, and environmental barriers.
                </p>
              </div>

              <form
                onSubmit={handleSaveMobility}
                className="bg-[#FFFFFF] border border-[#DDD6CB] rounded-xl p-5 space-y-4 shadow-xs"
              >
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-medium text-[#2E3530] block mb-1">
                      Baseline Mobility Status <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Independent community ambulator with single point stick; climbs 1 flight of stairs"
                      value={mobBaseline}
                      onChange={(e) => setMobBaseline(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[#2E3530] block mb-1">
                      Enduring Assistive Devices (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Single point stick, Left rigid AFO, Rollator frame for outdoors"
                      value={mobDevicesText}
                      onChange={(e) => setMobDevicesText(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[#2E3530] block mb-1">
                      Relevant Domestic / Environmental Barriers
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Second floor apartment with no lift; 16 external steps with handrail on right side only."
                      value={mobBarriers}
                      onChange={(e) => setMobBarriers(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Provenance Source</label>
                      <select
                        value={mobSource}
                        onChange={(e) => setMobSource(e.target.value as SafetyProvenanceSource)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        <option value="clinician_entry">Clinician Observation / Entry</option>
                        <option value="patient_reported">Patient Reported</option>
                        <option value="referral_letter">Referral Letter</option>
                        <option value="external_medical_record">External Medical Record</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-[#2E3530] block mb-1">Verification Status</label>
                      <select
                        value={mobStatus}
                        onChange={(e) => setMobStatus(e.target.value as SafetyVerificationStatus)}
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CB] rounded-lg px-3 py-2 text-xs focus:border-[#1B3B2B] outline-none"
                      >
                        <option value="verified">Verified (Confirmed by Clinician)</option>
                        <option value="unverified">Unverified</option>
                        <option value="disputed">Disputed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#EAE4DB]">
                  {profile.enduringMobilityContext ? (
                    <button
                      type="button"
                      onClick={handleClearMobility}
                      className="text-xs text-[#B91C1C] hover:underline cursor-pointer"
                    >
                      Clear Mobility Record
                    </button>
                  ) : (
                    <span />
                  )}

                  <Button id="save-mobility-btn" variant="primary" size="sm" type="submit">
                    Save Mobility Context
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E8E2D8] bg-[#F5F1EB] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#636A64]">
            {profile.lastReviewedAt ? (
              <span>
                Safety profile last reviewed: {formatClinicalDate(profile.lastReviewedAt)} by{' '}
                <strong className="text-[#2C332E]">{profile.lastReviewedBy || practitionerName}</strong>
              </span>
            ) : (
              <span>Safety profile has not yet undergone formal clinician review.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              id="safety-review-all-btn"
              variant="secondary"
              size="sm"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-[#1B3B2B]" />}
              onClick={handleMarkAllReviewed}
            >
              Mark Profile Reviewed Today
            </Button>

            <Button id="safety-modal-done-btn" variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
