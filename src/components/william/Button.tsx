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
type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Pill shape (rounded-full) — used by toolbar/action buttons. Default is rounded-xl (Button master). */
  pill?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 h-[42px] px-5 text-[15px] font-semibold whitespace-nowrap ' +
  'transition-[background-color,filter,color] duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
  'disabled:pointer-events-none';

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
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, pill = false, disabled, children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, pill ? 'rounded-full' : 'rounded-xl', variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
