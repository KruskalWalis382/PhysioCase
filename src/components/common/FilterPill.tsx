import React from 'react';

interface FilterPillProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  activeValue: T;
  onChange: (value: T) => void;
  idPrefix: string;
  className?: string;
}

export function FilterPill<T extends string>({
  options,
  activeValue,
  onChange,
  idPrefix,
  className = '',
}: FilterPillProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 bg-[#F1ECE4] rounded-lg border border-[#E3DDD2] gap-1 ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === activeValue;
        return (
          <button
            key={option.value}
            id={`${idPrefix}-filter-${option.value}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`py-1.5 px-3.5 text-xs font-medium rounded-md whitespace-nowrap transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1B3B2B]/30 ${
              isActive
                ? 'bg-[#FFFFFF] text-[#1A221E] shadow-xs font-semibold'
                : 'text-[#616862] hover:text-[#1A221E] hover:bg-[#E8E2D7]'
            }`}
          >
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                  isActive ? 'bg-[#EBF2EE] text-[#1B3B2B]' : 'bg-[#E5DFD4] text-[#636A64]'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
