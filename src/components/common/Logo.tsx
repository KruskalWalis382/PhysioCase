import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = false, className = '' }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const textSizes = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-semibold tracking-tight',
    lg: 'text-2xl font-bold tracking-tight',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Botanical Clinical Emblem */}
      <div
        className={`${iconSizes[size]} rounded-lg bg-[#1B3B2B] text-[#FAF8F5] flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[#152E22]/20`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-[#E2ECE6]"
        >
          {/* Subtle clinical balance / pathway motif: precise intersecting clinical cross with rounded botanical node */}
          <path d="M12 3v18" />
          <path d="M4 12h16" />
          <circle cx="12" cy="12" r="3" fill="#1B3B2B" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 9a3 3 0 0 1 3 3" stroke="#88B89E" strokeWidth="2" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`${textSizes[size]} text-[#1A221E] font-sans flex items-center gap-1`}>
          <span>Physio</span>
          <span className="text-[#1B3B2B] font-semibold">Case</span>
        </span>
        {showSubtitle && (
          <span className="text-xs text-[#6B726C] font-normal tracking-wide">
            Clinical Workspace
          </span>
        )}
      </div>
    </div>
  );
};
