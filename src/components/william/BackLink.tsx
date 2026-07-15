import { cn } from './cn';

interface BackLinkProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function BackLink({ label, onClick, className }: BackLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 text-[14px] font-medium text-secondary transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        className,
      )}
    >
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">
        <path d="M6 1 1 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}