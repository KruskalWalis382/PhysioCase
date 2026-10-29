import React from 'react';
import { Button } from './Button';

interface ClinicalEmptyStateProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  supportingText: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  note?: string;
}

export const ClinicalEmptyState: React.FC<ClinicalEmptyStateProps> = ({
  id,
  icon,
  title,
  supportingText,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
  note,
}) => {
  return (
    <div
      id={id}
      className={`w-full max-w-xl mx-auto py-14 px-6 text-center flex flex-col items-center justify-center ${className}`}
    >
      {/* Calm outline icon container */}
      <div
        className="w-14 h-14 rounded-xl bg-[#F4EFEA] border border-[#E5DFD5] text-[#1B3B2B] flex items-center justify-center mb-5 shadow-xs"
        aria-hidden="true"
      >
        {icon}
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-[#1C221E] tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-sm text-[#636A64] leading-relaxed max-w-md mb-6">
        {supportingText}
      </p>

      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryActionLabel && onPrimaryAction && (
            <Button
              id={`${id}-primary-action`}
              variant="primary"
              size="md"
              onClick={onPrimaryAction}
            >
              {primaryActionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              id={`${id}-secondary-action`}
              variant="secondary"
              size="md"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}

      {note && (
        <div className="mt-8 pt-6 border-t border-[#ECE6DD] w-full max-w-sm">
          <p className="text-xs text-[#7A827C] leading-normal font-sans italic">
            {note}
          </p>
        </div>
      )}
    </div>
  );
};
