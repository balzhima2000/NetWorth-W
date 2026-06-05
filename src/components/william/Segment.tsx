import { cn } from './cn';

/**
 * Segment + RangeSelector — ports the Figma Segment set and the composed
 * time-range control. Selected = surface pill + hairline border; default =
 * muted text. Focus ring on each segment for keyboard a11y.
 */
interface SegmentProps {
  selected?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Segment({ selected = false, children, onClick }: SegmentProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
        selected
          ? 'bg-surface text-ink border border-line'
          : 'text-muted hover:text-ink border border-transparent',
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

export function RangeSelector({
  options = ['1W', '1M', '1Y', 'YTD', 'ALL'],
  value,
  onChange,
  className,
  fullWidth = false,
}: RangeSelectorProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'items-center gap-0.5 rounded-[10px] bg-raised p-1',
        fullWidth ? 'flex w-full justify-between' : 'inline-flex',
        className,
      )}
    >
      {options.map((opt) => (
        <Segment key={opt} selected={value === opt} onClick={() => onChange(opt)}>
          {opt}
        </Segment>
      ))}
    </div>
  );
}
