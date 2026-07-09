import React from 'react';
import { cn } from './cn';

/**
 * In-card controls — the mono, uppercase tonal pills used *inside* cards for
 * secondary actions and dropdowns. Distinct from the page-level `Button`:
 * these use Geist Mono (`num`) / uppercase / 0.6px tracking / `text-secondary`
 * on a 28px `btn-tonal` pill, matching the tabular-number treatment in cards.
 *
 * Figma:
 *  - CardButton   ← "Button-inside-card" (1428:14011) — e.g. SET TARGETS
 *  - CardDropdown ← "SortDropdown"       (1428:13993) — e.g. VALUE ▾
 */
const cardControlBase =
  'num-mono inline-flex h-7 items-center rounded-full bg-btn-tonal px-3 ' +
  'text-[12px] font-medium uppercase tracking-[0.6px] text-muted ' +
  'transition-colors hover:bg-btn-neutral-hover hover:text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink';

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
