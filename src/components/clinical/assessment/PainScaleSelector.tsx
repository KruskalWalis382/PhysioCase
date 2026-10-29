import React from 'react';

interface PainScaleSelectorProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  description?: string;
}

export const PainScaleSelector: React.FC<PainScaleSelectorProps> = ({
  label,
  value,
  onChange,
  description,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#2C332E]">
          {label}
        </label>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#EAE4DB] text-[#1B3B2B] border border-[#DDD6CB]">
          {value} / 10
        </span>
      </div>

      {description && (
        <p className="text-[11px] text-[#6E756F]">{description}</p>
      )}

      {/* 0-10 Button Scale */}
      <div className="grid grid-cols-11 gap-1 sm:gap-1.5 pt-1">
        {Array.from({ length: 11 }, (_, i) => i).map((score) => {
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              id={`pain-scale-${label.toLowerCase()}-${score}`}
              onClick={() => onChange(score)}
              className={`h-9 rounded-md text-xs font-medium font-mono transition-all flex items-center justify-center cursor-pointer ${
                isSelected
                  ? 'bg-[#1B3B2B] text-[#FAF8F5] shadow-xs font-semibold scale-105 ring-2 ring-[#1B3B2B]/20'
                  : 'bg-[#F4EFEB] text-[#414843] border border-[#DCD5C9] hover:bg-[#EAE4DA] hover:border-[#B5ADA0]'
              }`}
              title={`${label}: ${score}/10`}
              aria-label={`${label} pain score ${score} out of 10`}
            >
              {score}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-[#868C87] px-0.5">
        <span>0 = No pain</span>
        <span>5 = Moderate</span>
        <span>10 = Severe pain</span>
      </div>
    </div>
  );
};
