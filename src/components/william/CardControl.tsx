import React from 'react';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

/**
 * In-card controls — the mono, uppercase tonal pills used *inside* cards for
 * secondary actions and dropdowns. Distinct from the page-level `Button`:
 * these use Geist Mono (`num`) / uppercase / 0.6px tracking / `text-secondary`
 * on a 28px `btn-tonal` pill, matching the tabular-number treatment in cards.
 *
 * Figma:
 *  - CardButton   ← "Button-inside-card" (1428:14011) — e.g. SET TARGETS
 *  - CardDropdown ← "SortDropdown"       (1428:13993) — e.g. VALUE ▾
 *  - Trailing     ← "Trailing"           (931:13756)  — swappable trailing affordance
 */

/** Right-pointing chevron matching the Figma Trailing chevron. Inherits
 *  `currentColor` so it tracks its parent's text color (e.g. inside CardLink). */
export function ChevronRight({ className }: { className?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true" className={className}>
      <path d="m1 1 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Trailing — the swappable trailing affordance shown on the right of an
 * interactive card / card header (Figma "Trailing" set 931:13756). Text
 * variants (default / positive / negative) render an Instrument Sans detail;
 * `chevron` / `chevron-circled` are nav affordances; `icon` renders a glyph.
 * Circled/pill variants inherit `group-hover` from the enclosing interactive
 * card (bg → btn-neutral-hover, text → ink).
 */
export type TrailingType =
  | 'default' | 'positive' | 'negative'
  | 'chevron' | 'chevron-circled' | 'icon';

export function Trailing({
  type,
  children,
  icon = 'edit',
  className,
}: {
  type: TrailingType;
  /** Text for the default/positive/negative variants. */
  children?: React.ReactNode;
  /** Glyph for the `icon` variant. */
  icon?: IconName;
  className?: string;
}) {
  switch (type) {
    case 'chevron':
      return <ChevronRight className={cn('shrink-0 text-muted', className)} />;
    case 'chevron-circled':
      return (
        <span
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-btn-tonal text-muted transition-colors group-hover:bg-btn-neutral-hover group-hover:text-ink',
            className,
          )}
        >
          <ChevronRight />
        </span>
      );
    case 'icon':
      return <Icon name={icon} size={12} className={cn('text-muted', className)} />;
    case 'positive':
      return <span className={cn('text-[15px] text-positive', className)}>{children}</span>;
    case 'negative':
      return <span className={cn('text-[15px] text-negative', className)}>{children}</span>;
    default:
      return <span className={cn('text-[15px] text-muted', className)}>{children}</span>;
  }
}
const cardControlBase =
  'num-mono inline-flex h-7 items-center rounded-full bg-btn-tonal px-3 ' +
  'text-[12px] font-medium uppercase tracking-[0.6px] text-muted ' +
  'transition-colors hover:bg-btn-neutral-hover hover:text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

/** Mono uppercase tonal pill for an in-card action (Set targets, See all…). */
export const CardButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function CardButton({ className, children, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={cn(cardControlBase, className)} {...rest}>
      {children}
    </button>
  );
});

/**
 * In-card dropdown trigger: the CardButton pill + a trailing arrow glyph.
 * `arrow` overrides the default ▾ (e.g. the portfolio sort trigger passes the
 * live ↓/↑ direction arrow). The arrow inherits the mono treatment.
 */
export const CardDropdown = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { arrow?: React.ReactNode }
>(function CardDropdown({ className, children, arrow = '▾', type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={cn(cardControlBase, 'gap-1', className)} {...rest}>
      {children}
      <span aria-hidden>{arrow}</span>
    </button>
  );
});

/**
 * In-card navigational pill: the button-inside-card + a trailing chevron
 * (Figma Trailing "Action", e.g. SEE ALL / SEE MORE). The chevron inherits the
 * pill's text color so it tracks the hover state.
 */
export const CardLink = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function CardLink({ className, children, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={cn(cardControlBase, 'gap-1', className)} {...rest}>
      {children}
      <ChevronRight className="shrink-0" />
    </button>
  );
});
