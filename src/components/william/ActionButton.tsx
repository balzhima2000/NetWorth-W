import { cn } from './cn';
import { Icon } from './Icon';

/** Action Button — Trade / Income / Expense. Grey circle + pixel icon + label.
 *  (Circle is color/surface-inverse → mid-grey, intentional.) */
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
          'flex h-[34px] w-[54px] items-center justify-center rounded-full bg-inverse text-canvas',
          'transition-[transform,filter] duration-150',
          'group-hover:brightness-90 group-active:scale-95 group-active:brightness-75',
          'group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-canvas',
        )}
      >
        <Icon name={action} size={22} />
      </span>
      <span className="text-[13px] font-medium text-secondary transition-colors group-hover:text-ink">
        {label ?? defaultLabels[action]}
      </span>
    </button>
  );
}
