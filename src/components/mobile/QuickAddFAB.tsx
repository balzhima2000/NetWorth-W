import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuickAddStore } from '../../stores/quickAddStore';

const actions = [
  { key: 'expense' as const, emoji: '💸', label: 'Add Expense', route: '/spending' },
  { key: 'income' as const, emoji: '💰', label: 'Add Income', route: '/spending' },
  { key: 'trade' as const, emoji: '📈', label: 'Log Trade', route: '/portfolio' },
];

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const setTarget = useQuickAddStore((s) => s.setTarget);
  const navigate = useNavigate();
  const location = useLocation();

  const handleAction = (key: 'expense' | 'income' | 'trade', route: string) => {
    setOpen(false);
    setTarget(key);
    if (location.pathname !== route) {
      navigate(route);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action cards */}
      {open && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col gap-3 items-end">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleAction(action.key, action.route)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-xl active:scale-95 transition-transform"
            >
              <span className="text-2xl">{action.emoji}</span>
              <span className="text-sm font-semibold text-white whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick add"
        className={`
          fixed right-4 z-50
          bottom-[calc(4rem+env(safe-area-inset-bottom))]
          w-14 h-14 rounded-full shadow-lg
          bg-[#5865f2] hover:bg-[#4752c4] active:scale-95
          flex items-center justify-center
          transition-all duration-200
          ${open ? 'rotate-45' : 'rotate-0'}
        `}
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}
