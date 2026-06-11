import React from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

/**
 * Button — ports the Figma Button set.
 * Variants: primary / secondary / ghost.
 * Interactive states (hover / pressed / focus / disabled) are handled
 * via CSS pseudo-classes; `loading` and `disabled` are props.
 *
 * Note: primary fill is mid-grey (color/surface-inverse → neutral/400),
 * which is the intentional design decision. Focus ring uses the neutral
 * accent (ink) rather than orange, since orange is reserved for negatives.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'l' | 'm' | 's' | 'xs';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Pill shape (rounded-full) — used by toolbar/action buttons. Default is rounded-xl (Button master). */
  pill?: boolean;
  /**
   * Size scale (height / horizontal pad / label):
   * - `l`  44px · px-5 · 15px Semi Bold — prominent CTAs (modal confirm, empty-state actions); pair 18px icon
   * - `m`  38px · px-4 · 14px Medium — DEFAULT, toolbar/action pills; pair 18px icon (16 for the plus)
   * - `s`  32px · px-3 · 13px Medium — compact secondary (Set/Edit targets); pair 16px icon
   * - `xs` 28px · px-3 · 12px Medium — chips / inline controls (the sort-trigger pill mirrors this); pair 14px icon
   */
  size?: Size;
}

const base =
  'inline-flex items-center justify-center whitespace-nowrap ' +
  'transition-[background-color,filter,color] duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
  'disabled:pointer-events-none';

// L/M/S/XS = 44/38/32/28. M (38) is the standard; values verified against the
// Figma Button sizes reference. height + horizontal pad + gap + label type.
const sizes: Record<Size, string> = {
  l:  'h-[44px] px-5 gap-2 text-[15px] font-semibold',
  m:  'h-[38px] px-4 gap-1.5 text-[14px] font-medium',
  s:  'h-[32px] px-3 gap-1.5 text-[13px] font-medium',
  xs: 'h-[28px] px-3 gap-1.5 text-[12px] font-medium',
};

// State fills match the Figma Button masters:
// Primary: hover = surface-inverse-hover, pressed = darker; Secondary/Ghost:
// hover/pressed = surface-raised. Disabled = border fill / muted text.
const variants: Record<Variant, string> = {
  primary:
    'bg-inverse text-on-inverse hover:bg-inverse-hover active:brightness-90 disabled:bg-line disabled:text-muted',
  secondary:
    'bg-surface text-ink border border-line hover:bg-raised active:bg-raised disabled:text-muted disabled:bg-surface',
  ghost:
    'bg-transparent text-ink hover:bg-raised active:bg-raised disabled:text-muted',
  // Danger — orange outline for destructive / cancel-in-destructive actions.
  // Hover tints with the pale negative-bg (the "slightly orange" hover).
  danger:
    'bg-surface text-negative border border-negative hover:bg-negative-bg active:bg-negative-bg disabled:border-line disabled:bg-surface disabled:text-muted',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, pill = false, size = 'm', disabled, children, className, ...rest },
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
      {loading && <Spinner />}
      {children}
    </button>
  );
});
