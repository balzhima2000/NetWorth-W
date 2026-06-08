import React from 'react';
import { cn } from './cn';

/** Chip — Style {Neutral / Outline / Inverse}. */
type ChipStyle = 'neutral' | 'outline' | 'inverse';

// Matches the Figma Chip master: Neutral = surface-sunken + text-secondary;
// Outline = surface + border + text-primary; Inverse = surface-inverse + on-inverse.
const styles: Record<ChipStyle, string> = {
  neutral: 'bg-sunken text-secondary',
  outline: 'bg-surface border border-line text-ink',
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
