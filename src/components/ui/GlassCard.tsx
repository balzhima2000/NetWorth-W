import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  role?: string;
  tabIndex?: number;
  'aria-label'?: string;
}

// Responsive padding — slightly tighter on mobile, full spacing on sm+
const paddingMap = {
  none: '',
  sm:   'p-4',
  md:   'p-4 sm:p-5',
  lg:   'p-5 sm:p-6',
};

export function GlassCard({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
  role,
  tabIndex,
  'aria-label': ariaLabel,
}: GlassCardProps) {
  const isInteractive = !!(hover || onClick);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`
        glass rounded-2xl
        ${paddingMap[padding]}
        ${isInteractive
          ? 'hover:bg-white/[0.06] active:bg-white/[0.08] active:scale-[0.99] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/35 focus-visible:ring-inset'
          : ''}
        ${className}
      `}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={role ?? (onClick ? 'button' : undefined)}
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
