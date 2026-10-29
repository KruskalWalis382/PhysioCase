import React, { useState, useEffect } from 'react';
import { X, Network, AlertCircle } from 'lucide-react';
import {
  ConditionPresentation,
  ConditionPresentationType,
  ConditionPresentationStatus,
} from '../../types';
import {
  CONDITION_TYPE_CONFIG,
  COMMON_BODY_REGIONS,
  COMMON_SYSTEMS,
} from '../../utils/conditionPathways';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface EditConditionPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conditionToEdit?: ConditionPresentation | null;
  onSave: (
    data: Partial<ConditionPresentation> & {
      name: string;
      type: ConditionPresentationType;
      status?: ConditionPresentationStatus;
    }
  ) => void;
}

export const EditConditionPresentationModal: React.FC<
  EditConditionPresentationModalProps
> = ({ isOpen, onClose, conditionToEdit, onSave }) => {
  const isEditing = Boolean(conditionToEdit);

  const [name, setName] = useState('');
  const [type, setType] = useState<ConditionPresentationType>('condition');
  const [description, setDescription] = useState('');
  const [bodyRegion, setBodyRegion] = useState('');
  const [system, setSystem] = useState('');
  const [commonTermsInput, setCommonTermsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ConditionPresentationStatus>('active');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    if (conditionToEdit) {
      setName(conditionToEdit.name || '');
      setType(conditionToEdit.type || 'condition');
      setDescription(conditionToEdit.description || '');
      setBodyRegion(conditionToEdit.bodyRegion || '');
      setSystem(conditionToEdit.system || '');
      setCommonTermsInput(
        Array.isArray(conditionToEdit.commonTerms)
          ? conditionToEdit.commonTerms.join(', ')
          : ''
      );
      setNotes(conditionToEdit.notes || '');
      setStatus(conditionToEdit.status || 'active');
    } else {
      setName('');
      setType('condition');
      setDescription('');
      setBodyRegion('');
      setSystem('');
      setCommonTermsInput('');
      setNotes('');
      setStatus('active');
    }
    setError(null);
  }, [isOpen, conditionToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Condition or presentation name is required.');
      return;
    }

    const commonTerms = commonTermsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({
      ...(conditionToEdit ? { id: conditionToEdit.id } : {}),
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      bodyRegion: bodyRegion.trim() || undefined,
      system: system.trim() || undefined,
      commonTerms,
      notes: notes.trim() || undefined,
      status,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="condition-modal-title"
    >
      <div className="bg-[#FAF8F5] w-full max-w-xl rounded-xl shadow-xl border border-[#E5DFD4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D7] bg-[#F7F4EF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#E2ECE7] text-[#1B3B2B]">
              <Network className="w-5 h-5" />
            </span>
            <div>
              <h2
                id="condition-modal-title"
                className="text-lg font-semibold text-[#18201C] tracking-tight"
              >
                {isEditing ? 'Edit Pathway' : 'Create Condition Pathway'}
              </h2>
              <p className="text-xs text-[#5B635D]">
                Organize clinical evidence under a recognized physiotherapy condition or clinical presentation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6A716B] hover:text-[#18201C] hover:bg-[#EAE4D9] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C2] rounded-lg flex items-center gap-2 text-xs text-[#9B2C2C]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="condition-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
            >
              Name <span className="text-[#9B2C2C]">*</span>
            </label>
            <Input
              id="condition-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rotator Cuff Related Shoulder Pain (RCRSP)"
              required
            />
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="condition-type"
                className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
              >
                Pathway Classification <span className="text-[#9B2C2C]">*</span>
              </label>
              <select
                id="condition-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as ConditionPresentationType)
                }
                className="w-full h-10 px-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
              >
                {(
                  Object.keys(
                    CONDITION_TYPE_CONFIG
                  ) as ConditionPresentationType[]
                ).map((key) => (
                  <option key={key} value={key}>
                    {CONDITION_TYPE_CONFIG[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="condition-status"
                className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
              >
                Pathway Status <span className="text-[#9B2C2C]">*</span>
              </label>
              <select
                id="condition-status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ConditionPresentationStatus)
                }
                className="w-full h-10 px-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Body Region & System */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="condition-body-region"
                className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
              >
                Body Region
              </label>
              <select
                id="condition-body-region"
                value={bodyRegion}
                onChange={(e) => setBodyRegion(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
              >
                <option value="">-- Select or Unspecified --</option>
                {COMMON_BODY_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="condition-system"
                className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
              >
                Physiological / Clinical System
              </label>
              <select
                id="condition-system"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B]"
              >
                <option value="">-- Select or Unspecified --</option>
                {COMMON_SYSTEMS.map((sys) => (
                  <option key={sys} value={sys}>
                    {sys}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="condition-description"
              className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
            >
              Clinical Description
            </label>
            <textarea
              id="condition-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Clinical description of the pathology, presentation pattern, or mechanical behavior..."
              className="w-full p-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] resize-y"
            />
          </div>

          {/* Common Terms */}
          <div className="space-y-1.5">
            <label
              htmlFor="condition-common-terms"
              className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
            >
              Synonyms / Diagnostic Labels / Common Terms
            </label>
            <Input
              id="condition-common-terms"
              type="text"
              value={commonTermsInput}
              onChange={(e) => setCommonTermsInput(e.target.value)}
              placeholder="e.g. Subacromial Impingement, Shoulder Bursitis, Supraspinatus Tendinopathy (comma-separated)"
            />
            <p className="text-[11px] text-[#707872]">
              Allows fast discovery when therapists search by alternative terminology or historical diagnoses.
            </p>
          </div>

          {/* Curator / Clinical Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="condition-notes"
              className="block text-xs font-semibold uppercase tracking-wider text-[#4A514B]"
            >
              Curator Notes / Contextual Guidance
            </label>
            <textarea
              id="condition-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Scope reminders, relevant guidelines, or organizational notes..."
              className="w-full p-3 rounded-lg border border-[#D5CEC2] bg-[#FAF8F5] text-sm text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] resize-y"
            />
          </div>

          {/* Clinical Boundary Reminder */}
          <div className="p-3 bg-[#F0ECE1] border border-[#DDD5C5] rounded-lg text-[11px] text-[#4F5751] leading-relaxed">
            <span className="font-semibold text-[#18201C]">Clinical Boundary:</span> Condition pathways organize global evidence items and treatment approaches. They do not infer patient diagnoses, predict clinical outcomes, or prescribe patient treatments.
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E8E2D7] flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {isEditing ? 'Save Changes' : 'Create Pathway'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
