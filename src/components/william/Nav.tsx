import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

/**
 * FloatingNav (desktop top pill) + TabBar (mobile bottom).
 * Frosted glass: translucent white + backdrop blur + hairline.
 * Active item = surface pill + text-ink; inactive = text-muted.
 */
interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  path: string;
  iconOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home',      path: '/william/dashboard' },
  { id: 'portfolio', label: 'Portfolio', icon: 'portfolio', path: '/portfolio' },
  { id: 'spending',  label: 'Spending',  icon: 'spending',  path: '/spending' },
  { id: 'fire',      label: 'FIRE',      icon: 'fire',      path: '/fire' },
  { id: 'account',   label: 'Account',   icon: 'account',   path: '/settings', iconOnly: true },
];

const frosted =
  'border border-line bg-[rgba(255,255,255,0.72)] backdrop-blur-xl ' +
  'dark:bg-[rgba(38,38,38,0.72)]';

export function FloatingNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className={cn(
        'fixed left-1/2 top-5 z-50 -translate-x-1/2 hidden md:flex',
        'items-center gap-1.5 rounded-full p-1.5',
        frosted,
      )}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.path;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
              item.iconOnly && 'px-2',
              active ? 'bg-surface text-ink' : 'text-muted hover:text-ink',
            )}
          >
            <Icon name={item.icon} size={18} />
            {!item.iconOnly && <span>{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex md:hidden',
        'items-center gap-1 rounded-full p-1.5',
        frosted,
      )}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.path;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-full px-4 py-2 transition-colors',
              active ? 'bg-surface text-ink' : 'text-muted',
            )}
          >
            <Icon name={item.icon} size={20} />
          </button>
        );
      })}
    </nav>
  );
}
