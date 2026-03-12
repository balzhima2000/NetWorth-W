import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuickAddStore } from '../../stores/quickAddStore';

const actions = [
  {
    key: 'expense' as const,
    emoji: '💸',
    label: 'Expense',
    sublabel: 'Log spending',
    route: '/spending',
    accent: '#EF4444',
  },
  {
    key: 'income' as const,
    emoji: '💰',
    label: 'Income',
    sublabel: 'Add income',
    route: '/spending',
    accent: '#22C55E',
  },
  {
    key: 'trade' as const,
    emoji: '📈',
    label: 'Trade',
    sublabel: 'Log a position',
    route: '/portfolio',
    accent: '#10B981',
  },
];

// FAB sits 96px above the viewport bottom (clears 80px floating nav + 16px gap)
const FAB_BOTTOM = 'calc(env(safe-area-inset-bottom) + 96px)';
// Actions stack starts just above the FAB
const ACTIONS_BOTTOM = 'calc(env(safe-area-inset-bottom) + 164px)';

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const setTarget = useQuickAddStore((s) => s.setTarget);
  const navigate = useNavigate();
  const location = useLocation();

  const handleAction = (key: 'expense' | 'income' | 'trade', route: string) => {
    setOpen(false);
    setTarget(key);
    if (location.pathname !== route) navigate(route);
  };

  return (
    <>
      {/* ── Blurred backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'backdrop-in 220ms ease both',
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Action cards — spring stagger from bottom ── */}
      {open && (
        <div
          className="fixed right-4 z-50 flex flex-col gap-2.5 items-end"
          style={{ bottom: ACTIONS_BOTTOM }}
        >
          {/* Reversed so bottom card animates first (feels more natural) */}
          {[...actions].reverse().map((action, i) => (
            <button
              key={action.key}
              onClick={() => handleAction(action.key, action.route)}
              // stagger classes defined in index.css
              className={`fab-action-${i + 1} flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-2xl active:scale-95`}
              style={{
                background: 'rgba(10, 10, 10, 0.96)',
                border: `1px solid ${action.accent}28`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: `0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px ${action.accent}14`,
                transition: 'transform 150ms ease, box-shadow 150ms ease',
              }}
            >
              {/* Colored icon bubble */}
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${action.accent}1a` }}
              >
                {action.emoji}
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-white leading-tight">{action.label}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{action.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── FAB button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick add"
        className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          right: '16px',
          bottom: FAB_BOTTOM,
          background: 'linear-gradient(145deg, #10B981, #065F46)',
          boxShadow: open
            ? '0 4px 16px rgba(16, 185, 129, 0.30)'
            : '0 8px 28px rgba(16, 185, 129, 0.45)',
          transition: 'box-shadow 250ms ease, transform 200ms ease',
        }}
        // active state via CSS — inline active:scale-90 doesn't work on style prop
        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.91)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = '')}
        onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
      >
        <svg
          className="w-7 h-7 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{
            transition: 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </>
  );
}
