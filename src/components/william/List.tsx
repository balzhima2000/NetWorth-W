import React from 'react';
import { cn } from './cn';

/**
 * List — ports the Figma Lists components (Row / Trailing / Header / Label).
 * The list surface is a borderless card that supplies the 20px horizontal
 * inset; rows divide with inset hairlines (divide-y), matching the masters
 * where each Row carries a top hairline except the first.
 */
export function List({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('divide-y divide-line rounded-card bg-surface px-5 pt-1', className)} {...rest}>
      {children}
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true" className={cn('shrink-0', className)}>
      <path d="M1 1 6 6 1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** In-card list header (Figma Lists "Header": 18 SemiBold + optional trailing action). */
export function ListHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-[13px] font-medium text-secondary transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {action}
        </button>
      )}
    </div>
  );
}

interface ListRowProps {
  title: string;
  /** Second line — switches the row to the Tall (60px) layout. */
  subtitle?: string;
  /** 3×32 category bar color (Figma Lists "Label / Bar"); any CSS color. */
  marker?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  danger?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** List row (Figma Lists "Row": Height=Short 58px / Height=Tall 60px). */
export function ListRow({ title, subtitle, marker, trailing, chevron, danger, onClick, style }: ListRowProps) {
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-3 transition-transform duration-150 group-hover:translate-x-0.5">
        {marker && <span aria-hidden="true" className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: marker }} />}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn('truncate font-medium', subtitle ? 'text-[15px]' : 'text-[14px]', danger ? 'text-negative' : 'text-ink')}>
            {title}
          </span>
          {subtitle && <span className="truncate text-[12px] font-medium text-muted">{subtitle}</span>}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {trailing}
        {chevron && (
          <Chevron
            className={cn(
              'transition-[transform,color] duration-150 group-hover:translate-x-0.5',
              danger ? 'text-negative' : 'text-muted group-hover:text-ink',
            )}
          />
        )}
      </span>
    </>
  );
  const layout = cn('flex w-full items-center justify-between gap-3 text-left', subtitle ? 'py-[13px]' : 'py-5');
  if (onClick) {
    return (
      // Motion-only hover (no fill): the content nudges right and the chevron
      // brightens, so there's no band to clash with the card's rounded corners.
      <button
        type="button"
        onClick={onClick}
        style={style}
        className={cn(layout, 'group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink')}
      >
        {inner}
      </button>
    );
  }
  return <div className={layout} style={style}>{inner}</div>;
}
