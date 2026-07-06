import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from './cn';

/**
 * Segmented — the shared segmented control with a sliding indicator pill.
 * The selected pill (bg-surface) is a single absolutely-positioned element
 * that measures the active button and animates its left/width, so switching
 * segments slides the pill instead of hard-swapping backgrounds
 * (à la the balzhima.com navbar). Powers RangeSelector + SegmentToggle +
 * the Account appearance toggle.
 */
export interface SegOption { value: string; label: React.ReactNode; }

interface SegmentedProps {
  options: SegOption[];
  value: string;
  onChange: (value: string) => void;
  /** Track fill — raised (range selector) or sunken (form toggles). */
  track?: 'raised' | 'sunken';
  /** md = equal-width flex-1 py-2 14px (toggles); sm = hug px-3.5 py-1.5 13px (range). */
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export function Segmented({ options, value, onChange, track = 'raised', size = 'sm', fullWidth = false, className }: SegmentedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const idx = options.findIndex((o) => o.value === value);
      const btn = el.querySelectorAll<HTMLElement>('[data-seg]')[idx];
      if (btn) setInd({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, options]);

  const equalWidth = fullWidth || size === 'md';
  return (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'relative flex items-center gap-0.5 rounded-full p-1',
        track === 'sunken' ? 'bg-sunken' : 'bg-raised',
        fullWidth ? 'w-full' : 'inline-flex',
        className,
      )}
    >
      {ind && (
        <div
          aria-hidden="true"
          className="absolute bottom-1 top-1 rounded-full bg-surface transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: ind.left, width: ind.width }}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            data-seg
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative z-10 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
              size === 'md' ? 'flex-1 py-2 text-[14px]' : 'px-3.5 py-1.5 text-[13px]',
              equalWidth && size === 'sm' && 'flex-1',
              active ? 'text-ink' : 'text-secondary hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Standalone single segment (legacy) — kept for compatibility. */
export function Segment({ selected = false, children, onClick }: { selected?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
        selected ? 'bg-surface text-ink' : 'text-secondary hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

interface RangeSelectorProps {
  options?: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export function RangeSelector({ options = ['1W', '1M', '1Y', 'YTD', 'ALL'], value, onChange, className, fullWidth = false }: RangeSelectorProps) {
  return (
    <Segmented
      options={options.map((o) => ({ value: o, label: o }))}
      value={value}
      onChange={onChange}
      track="raised"
      size="sm"
      fullWidth={fullWidth}
      className={className}
    />
  );
}
