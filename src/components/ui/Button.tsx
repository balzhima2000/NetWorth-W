import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  // Primary — emerald, with a very subtle ambient glow that feels premium on OLED
  primary:
    'bg-[#10B981] hover:bg-[#0EA571] active:bg-[#0D9468] text-white border-transparent ' +
    'shadow-[0_0_18px_rgba(16,185,129,0.22)] hover:shadow-[0_0_24px_rgba(16,185,129,0.30)]',
  // Secondary — slightly elevated surface, refined border
  secondary:
    'bg-white/[0.07] hover:bg-white/[0.11] active:bg-white/[0.15] text-white border-white/[0.10]',
  // Ghost — transparent, low-key
  ghost:
    'bg-transparent hover:bg-white/[0.07] active:bg-white/[0.11] text-white/60 hover:text-white border-transparent',
  // Danger — muted red tint
  danger:
    'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 active:bg-[#EF4444]/35 text-[#EF4444] border-[#EF4444]/25',
  // Success — positive green tint
  success:
    'bg-[#22C55E]/15 hover:bg-[#22C55E]/25 active:bg-[#22C55E]/35 text-[#22C55E] border-[#22C55E]/25',
};

const sizeStyles: Record<ButtonSize, string> = {
  // sm — compact, for toolbars and inline contexts
  sm: 'px-3 py-2 text-xs gap-1.5 min-h-[36px]',
  // md + lg — 44px touch target (WCAG 2.5.5)
  md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]',
  lg: 'px-6 py-3 text-base gap-2.5 min-h-[44px]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-xl border
        transition-all duration-150 select-none
        active:scale-[0.96]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000]
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <>
          {icon && iconPosition === 'left'  && <span className="flex-shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
