import { cn } from './cn';
import { Icon } from './Icon';

/** Action Button — Trade / Income / Expense. Dark circle + pixel icon + label.
 *  (Circle is color/btn-primary → neutral/800; white in dark mode.) */
type Action = 'trade' | 'income' | 'expense';

const defaultLabels: Record<Action, string> = {
  trade: 'Trade',
  income: 'Income',
  expense: 'Expense',
};

interface ActionButtonProps {
  action: Action;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function ActionButton({ action, label, onClick, className }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('group flex flex-col items-center gap-2 focus:outline-none', className)}
    >
      <span
        className={cn(
          'flex h-[34px] w-[54px] items-center justify-center rounded-full bg-btn-primary text-btn-on-primary',
          'transition-[transform,background-color] duration-150',
          'group-hover:bg-btn-primary-hover group-active:bg-btn-primary-pressed group-active:scale-95',
          'group-focus-visible:ring-2 group-focus-visible:ring-focus group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-canvas',
        )}
      >
        <Icon name={action} size={22} />
      </span>
      <span className="text-[13px] font-medium text-secondary">
        {label ?? defaultLabels[action]}
      </span>
    </button>
  );
}
