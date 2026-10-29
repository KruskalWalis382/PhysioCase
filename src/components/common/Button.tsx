import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  id,
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  // Enforcing the 2x horizontal padding rule:
  // sm: py-1.5 (6px) px-3 (12px)
  // md: py-2.5 (10px) px-5 (20px)
  // lg: py-3.5 (14px) px-7 (28px)
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs gap-1.5 rounded-md min-h-[34px]',
    md: 'py-2.5 px-5 text-sm gap-2 rounded-lg min-h-[44px]',
    lg: 'py-3.5 px-7 text-base gap-2.5 rounded-lg min-h-[48px]',
  };

  const variantClasses = {
    primary:
      'bg-[#1B3B2B] text-[#FAF8F5] hover:bg-[#142D21] active:bg-[#0E2017] border border-[#173325] shadow-xs focus-visible:ring-2 focus-visible:ring-[#1B3B2B]/40 focus-visible:ring-offset-1',
    secondary:
      'bg-[#F3EFEA] text-[#1C221E] hover:bg-[#ECE6DD] active:bg-[#E2DAD0] border border-[#E5DFD5] shadow-xs focus-visible:ring-2 focus-visible:ring-[#1B3B2B]/30 focus-visible:ring-offset-1',
    outline:
      'bg-transparent text-[#1C221E] hover:bg-[#F3EFEA] active:bg-[#ECE6DD] border border-[#DDD6CB] focus-visible:ring-2 focus-visible:ring-[#1B3B2B]/30 focus-visible:ring-offset-1',
    ghost:
      'bg-transparent text-[#484E49] hover:text-[#1C221E] hover:bg-[#F3EFEA] active:bg-[#ECE6DD] border border-transparent focus-visible:ring-2 focus-visible:ring-[#1B3B2B]/20',
    danger:
      'bg-[#B91C1C] text-[#FAF8F5] hover:bg-[#991B1B] active:bg-[#7F1D1D] border border-[#991B1B] shadow-xs focus-visible:ring-2 focus-visible:ring-[#B91C1C]/40',
  };

  return (
    <button
      id={id}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 whitespace-nowrap select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
