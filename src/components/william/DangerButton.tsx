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
 * Size scale ported from the Figma "Danger button" master (899:7421): S/M/L =
 * 27/36/44, gap 6px, 14px SemiBold label, pill (r999) at every size. NB: the
 * Danger master's Large is 44px — 2px taller than the regular Button master's
 * 42px (an inconsistency in the Figma file). `xs` is code-only (no Figma peer).
 */
type Variant = 'outline' | 'subtle';
type Size = 'l' | 'm' | 's' | 'xs';

interface DangerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Non-pill (rounded-xl) shape. The Danger master is a pill (r999), so pill is the DEFAULT. */
  pill?: boolean;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center whitespace-nowrap ' +
  'transition-[background-color,filter,color] duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
  'disabled:pointer-events-none';

const sizes: Record<Size, string> = {
  l:  'h-[44px] px-5 gap-1.5 text-[14px] font-semibold',
  m:  'h-[36px] px-4 gap-1.5 text-[14px] font-semibold',
  s:  'h-[27px] px-[18px] gap-1.5 text-[14px] font-semibold',
  xs: 'h-[28px] px-3 gap-1.5 text-[12px] font-medium',
};

// Hover = pale negative-bg tint; pressed = one ramp step deeper
// (--w-danger-pressed, mirrors Figma btn-danger-pressed).
const variants: Record<Variant, string> = {
  outline:
    'bg-surface text-negative border border-negative hover:bg-negative-bg active:bg-danger-pressed disabled:border-line disabled:bg-surface disabled:text-muted',
  subtle:
    'bg-transparent text-negative hover:bg-negative-bg active:bg-danger-pressed disabled:text-muted',
};

export const DangerButton = React.forwardRef<HTMLButtonElement, DangerButtonProps>(function DangerButton(
  { variant = 'outline', loading = false, pill = true, size = 'm', disabled, children, className, ...rest },
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
        <PixelSpinner size={size === 'l' ? 20 : size === 's' ? 16 : size === 'xs' ? 14 : 18} />
      )}
      {children}
    </button>
  );
});
