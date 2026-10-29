import React, { useState } from 'react';
import { Plus, X, Edit2, Check, MapPin } from 'lucide-react';
import { Button } from '../../common/Button';

interface LocationManagerProps {
  locations: string[];
  onChange: (locations: string[]) => void;
}

export const LocationManager: React.FC<LocationManagerProps> = ({
  locations,
  onChange,
}) => {
  const [newLocation, setNewLocation] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleAddLocation = () => {
    const trimmed = newLocation.trim();
    if (!trimmed) return;
    if (!locations.includes(trimmed)) {
      onChange([...locations, trimmed]);
    }
    setNewLocation('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLocation();
    }
  };

  const handleRemove = (index: number) => {
    onChange(locations.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(locations[index]);
  };

  const saveEditing = (index: number) => {
    const trimmed = editingText.trim();
    if (trimmed) {
      const updated = [...locations];
      updated[index] = trimmed;
      onChange(updated);
    }
    setEditingIndex(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#2C332E]">
          Symptom Location(s)
        </label>
        <span className="text-[11px] text-[#717872]">
          {locations.length === 0 ? 'None specified' : `${locations.length} recorded`}
        </span>
      </div>

      {/* Input to add location */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="w-4 h-4 text-[#8C938E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="new-symptom-location-input"
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Lumbar spine (L4-L5), Right anterior knee, Left subacromial"
            className="w-full pl-9 pr-3 py-2 text-xs text-[#18201C] bg-[#FAF8F5] border border-[#D5CFC4] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1B3B2B] focus:border-[#1B3B2B] placeholder:text-[#9EA49F]"
          />
        </div>
        <Button
          id="add-symptom-location-btn"
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleAddLocation}
          disabled={!newLocation.trim()}
        >
          Add location
        </Button>
      </div>

      {/* List of recorded locations */}
      {locations.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {locations.map((loc, idx) => {
            const isEditing = editingIndex === idx;

            if (isEditing) {
              return (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 p-1 px-2 bg-[#FAF8F5] border border-[#1B3B2B] rounded-lg shadow-xs"
                >
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(idx);
                      if (e.key === 'Escape') setEditingIndex(null);
                    }}
                    className="text-xs text-[#18201C] bg-transparent outline-hidden w-40"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => saveEditing(idx)}
                    className="p-1 text-[#1B3B2B] hover:text-[#0F2218] rounded hover:bg-[#EAE4DA]"
                    title="Save edit"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingIndex(null)}
                    className="p-1 text-[#717872] hover:text-[#18201C] rounded hover:bg-[#EAE4DA]"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="group flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#F5F0E8] border border-[#DFD8CC] text-xs text-[#282F2A] transition-colors hover:border-[#BFB7A8]"
              >
                <MapPin className="w-3 h-3 text-[#1B3B2B] shrink-0" />
                <span className="font-medium">{loc}</span>

                <div className="flex items-center gap-1 ml-1 pl-1 border-l border-[#D8D1C4]">
                  <button
                    type="button"
                    onClick={() => startEditing(idx)}
                    className="p-0.5 text-[#737A75] hover:text-[#1B3B2B] rounded transition-colors"
                    title="Edit location name"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-0.5 text-[#737A75] hover:text-[#9E2B25] rounded transition-colors"
                    title="Remove location"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
