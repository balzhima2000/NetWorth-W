import React from 'react';
import { cn } from './cn';
import { PixelSpinner } from './PixelSpinner';

/**
 * DangerButton — ports the Figma "Button / Danger" set.
 * Deliberately detached from Button: destructive styling evolves on its own
 * and must never be reachable via a generic `variant` switch.
 *
 * Variants:
 * - `outline` (default) — surface fill, orange border + label; hover tints
 *   with the pale negative-bg. For standalone destructive triggers
 *   (Danger zone rows, modal Delete on desktop).
 * - `subtle` — no border, transparent fill, orange label; hover tints with
 *   negative-bg. Low-emphasis destructive action sitting near other
 *   controls (stacked mobile Delete, inline row actions).
 *
 * Size scale and shape rules match Button (L/M/S/XS = 44/38/32/28, pill or
 * rounded-xl) so danger buttons line up in the same footers/toolbars.
 */
type Variant = 'outline' | 'subtle';
type Size = 'l' | 'm' | 's' | 'xs';

interface DangerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Pill shape (rounded-full). Default is rounded-xl, matching the Button master. */
  pill?: boolean;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center whitespace-nowrap ' +
  'transition-[background-color,filter,color] duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
  'disabled:pointer-events-none';

const sizes: Record<Size, string> = {
  l:  'h-[44px] px-5 gap-2 text-[15px] font-semibold',
  m:  'h-[38px] px-4 gap-1.5 text-[14px] font-medium',
  s:  'h-[32px] px-3 gap-1.5 text-[13px] font-medium',
  xs: 'h-[28px] px-3 gap-1.5 text-[12px] font-medium',
};

const variants: Record<Variant, string> = {
  outline:
    'bg-surface text-negative border border-negative hover:bg-negative-bg active:bg-negative-bg disabled:border-line disabled:bg-surface disabled:text-muted',
  subtle:
    'bg-transparent text-negative hover:bg-negative-bg active:bg-negative-bg disabled:text-muted',
};

export const DangerButton = React.forwardRef<HTMLButtonElement, DangerButtonProps>(function DangerButton(
  { variant = 'outline', loading = false, pill = false, size = 'm', disabled, children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], pill ? 'rounded-full' : 'rounded-xl', variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <PixelSpinner size={size === 's' ? 16 : size === 'xs' ? 14 : 18} />
      )}
      {children}
    </button>
  );
});
