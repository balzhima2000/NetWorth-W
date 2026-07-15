import React from 'react';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

/**
 * In-card controls.
 *
 * ⚠️ Rule (2026-07, Balzhima — Jakob's law): **navigation = link, action =
 * button.** The old mono/UPPERCASE tonal pill is retired for both:
 * mono+uppercase+tracking is this DS's *label* language (CURRENT NET WORTH,
 * ALLOCATION), so wearing it made actions read as labels; the tonal pill made
 * them read as badges; text-muted made them the quietest thing in the card.
 *
 *  - CardLink   → "See all" etc. = navigation → a plain TEXT LINK + chevron.
 *  - Card actions ("Set targets", "Edit") → use the real DS `Button size="s"
 *    variant="tonal"`. The bespoke `CardButton` was deleted — a button inside a
 *    card should look like every other button (its Figma master 1428:14011 is
 *    gone, so it wasn't DS-backed anyway).
 *  - CardDropdown keeps the mono treatment: it surfaces a *value* (VALUE ↓),
 *    which is the tabular/label language on purpose.
 *  - Trailing ← Figma "Trailing" (931:13756) — swappable trailing affordance.
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
/**
 * In-card dropdown trigger — e.g. the portfolio sort control: `Sort: VALUE ↓`.
 *
 * The field name stays in the MONO/uppercase language on purpose: it names a
 * *column* (Market value / Gain / Return), and column headers are mono uppercase
 * here — so it reads as a data field, not an action. But mono alone gave no hint
 * that the pill sorts, and a bare `↓` on a dropdown reads as "opens a menu" when
 * it actually means *descending*. The sans `prefix` ("Sort:") supplies the
 * missing convention and disambiguates the arrow as direction.
 *
 * `arrow` overrides the default ▾ (the sort trigger passes the live ↓/↑).
 */
export const CardDropdown = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { arrow?: React.ReactNode; prefix?: React.ReactNode }
>(function CardDropdown({ className, children, arrow = '▾', prefix, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full bg-btn-tonal px-3',
        'text-[13px] font-medium text-ink',
        'transition-colors hover:bg-btn-neutral-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        className,
      )}
      {...rest}
    >
      {prefix && <span className="text-secondary">{prefix}</span>}
      <span className="num-mono text-[12px] uppercase tracking-[0.6px]">{children}</span>
      <span className="num-mono" aria-hidden>{arrow}</span>
    </button>
  );
});

/**
 * In-card navigational link ("See all" / "See more") — sentence case text +
 * chevron, no container. Navigation reads as a link, not a button/badge.
 */
export const CardLink = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function CardLink({ className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-sm text-[14px] font-medium text-secondary',
        'transition-colors hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
      {...rest}
    >
      {children}
      <ChevronRight className="shrink-0" />
    </button>
  );
});
