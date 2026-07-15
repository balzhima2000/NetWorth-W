import React from 'react';
import { cn } from './cn';

/** Chip — Style {Neutral / Outline / Inverse}. */
type ChipStyle = 'neutral' | 'outline' | 'inverse';

// Borderless (2026-07): separation is tonal. Neutral = surface-sunken +
// text-secondary; Outline = surface fill + text-primary (the old hairline is
// retired — the name is kept for API compatibility); Inverse = surface-inverse.
const styles: Record<ChipStyle, string> = {
  neutral: 'bg-sunken text-secondary',
  outline: 'bg-surface text-ink',
  inverse: 'bg-inverse text-on-inverse',
};

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipStyle;
}

export function Chip({ variant = 'neutral', children, className, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
