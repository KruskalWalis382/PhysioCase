import React from 'react';
import { Check } from 'lucide-react';

interface MultiSelectPillsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  idPrefix: string;
}

export const MultiSelectPills: React.FC<MultiSelectPillsProps> = ({
  options,
  selected,
  onChange,
  idPrefix,
}) => {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            id={`${idPrefix}-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            onClick={() => toggleOption(option)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none ${
              isSelected
                ? 'bg-[#1B3B2B] text-[#FAF8F5] border border-[#1B3B2B] shadow-xs'
                : 'bg-[#F4EFEB] text-[#3E4540] border border-[#DDD6CB] hover:bg-[#EAE4DA] hover:border-[#B5ADA0]'
            }`}
            aria-pressed={isSelected}
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
};
