import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  error,
  helperText,
  leftIcon,
  rightAction,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-[#2E3530] tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-[#6B726C] pointer-events-none shrink-0 flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          disabled={disabled}
          className={`w-full bg-[#FFFFFF] text-[#1C221E] text-sm rounded-lg border transition-colors duration-150 py-2.5 ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightAction ? 'pr-11' : 'pr-3.5'} ${
            error
              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
              : 'border-[#DDD6CB] hover:border-[#BFB7AA] focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]'
          } placeholder:text-[#9A9F9B] outline-none disabled:bg-[#F3EFEA] disabled:text-[#8D928E] disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {rightAction && (
          <div className="absolute right-2 flex items-center justify-center text-[#6B726C]">
            {rightAction}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-[#DC2626] font-normal leading-tight mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#6B726C] font-normal leading-tight mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};
