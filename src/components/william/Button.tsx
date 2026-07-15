import React from 'react';
import { cn } from './cn';
import { PixelSpinner } from './PixelSpinner';

/**
 * Button — ports the Figma Button set.
 * Variants: primary / secondary / ghost.
 * Interactive states (hover / pressed / focus / disabled) are handled
 * via CSS pseudo-classes; `loading` and `disabled` are props.
 *
 * Note: primary fill is DARK (color/btn-primary → neutral/800), white in dark
 * mode. Focus ring uses the neutral accent (ink) rather than orange, since
 * orange is reserved for negatives.
 */
type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost';
type Size = 'l' | 'm' | 's' | 'xs';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Non-pill (rounded-xl) shape. The Figma Button master is a pill (r999) at
   * every size, so pill is the DEFAULT; pass `pill={false}` for a 12px-radius rect. */
  pill?: boolean;
  /**
   * Size scale — 14px SemiBold label at every size; height + h-pad both scale.
   * H-pad walks the Spacing scale 12 -> 16 -> 24 (spacing/3, /4, /6):
   * - `l`  42px · px-6 (24) · 14px SemiBold — prominent CTAs (modal confirm, empty-state); pair 20px icon
   * - `m`  36px · px-4 (16) · 14px SemiBold — DEFAULT, toolbar/action pills; pair 18px icon
   * - `s`  27px · px-3 (12) · 14px SemiBold — compact secondary (Set/Edit targets); pair 16px icon
   * - `xs` 28px · px-3 (12) · 12px Medium — CODE-ONLY (no Figma peer) — chips / inline controls (sort-trigger, Account CRUD); pair 14px icon
   */
  size?: Size;
}

const base =
  'inline-flex items-center justify-center whitespace-nowrap ' +
  'transition-[background-color,filter,color] duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
  'disabled:pointer-events-none';

// S/M/L = 27/36/42 tall, gap 4px, 14px SemiBold label at every size. H-pad is a
// DELIBERATE EXCEPTION to the mechanical spacing snap: snapping sent 20 (L) and
// 18 (S) both to 16, where M already sat, collapsing all three to one value. The
// scale below is hand-set to adjacent Spacing tokens (12/16/24) so padding scales
// with size again. `xs` is a code-only inline size (no Figma peer).
const sizes: Record<Size, string> = {
  l:  'h-[42px] px-6 gap-1 text-[14px] font-semibold',
  m:  'h-[36px] px-4 gap-1 text-[14px] font-semibold',
  s:  'h-[27px] px-3 gap-1 text-[14px] font-semibold',
  xs: 'h-[28px] px-3 gap-1 text-[12px] font-medium',
};

// State fills match the Figma Button masters (all BORDERLESS, 2026-07):
// - secondary (Figma "Neutral"): white pill for the grey CANVAS
// - tonal: grey pill for WHITE CARDS + modal footers (same hover/pressed ladder)
// - ghost (Figma "Subtle"): transparent, tints on hover
const variants: Record<Variant, string> = {
  // Disabled is uniform across variants: recessed btn-disabled fill (transparent
  // for ghost) + btn-disabled-text, so a disabled button clearly reads as OFF.
  primary:
    'bg-btn-primary text-btn-on-primary hover:bg-btn-primary-hover active:bg-btn-primary-pressed disabled:bg-btn-disabled disabled:text-btn-disabled-text',
  secondary:
    'bg-btn-neutral text-ink hover:bg-btn-neutral-hover active:bg-btn-neutral-pressed disabled:bg-btn-disabled disabled:text-btn-disabled-text',
  tonal:
    'bg-btn-tonal text-ink hover:bg-btn-neutral-hover active:bg-btn-neutral-pressed disabled:bg-btn-disabled disabled:text-btn-disabled-text',
  ghost:
    'bg-transparent text-ink hover:bg-btn-subtle-hover active:bg-btn-subtle-pressed disabled:bg-transparent disabled:text-btn-disabled-text',
};
// Destructive actions use the standalone DangerButton (outline / subtle) —
// deliberately not a Button variant.

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, pill = true, size = 'm', disabled, children, className, ...rest },
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
