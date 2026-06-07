import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

/**
 * FloatingNav (desktop top pill) + TabBar (mobile bottom).
 * Specs match the Figma NavPill masters exactly:
 *  - Desktop: opaque color/surface + border, r999, pad 8 (10 left), gap 6.
 *    Active item = accent-bg pill + accent text; inactive = text-secondary;
 *    account = 36×36 accent-bg circle. Icons 20px, labels 14px.
 *  - Mobile: opaque color/bg + border, r999, 340w, gap 30, 4 items (50px),
 *    icon 24 + label 11. Active = text-primary; inactive = text-muted.
 */
interface NavItem {
  id: string;
  label: string;
  mobileLabel?: string; // mobile tab bar uses shorter copy (e.g. "Home")
  icon: IconName;
  path: string;
  iconOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', icon: 'home', path: '/william/dashboard' },
  { id: 'portfolio', label: 'Portfolio', icon: 'portfolio', path: '/portfolio' },
  { id: 'spending',  label: 'Spending',  icon: 'spending',  path: '/spending' },
  { id: 'fire',      label: 'FIRE',      icon: 'fire',      path: '/fire' },
  { id: 'account',   label: 'Account',   icon: 'account',   path: '/settings', iconOnly: true },
];

export function FloatingNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className={cn(
        'fixed left-1/2 top-5 z-50 hidden -translate-x-1/2 md:flex',
        'items-center gap-1.5 rounded-full border border-line bg-surface p-2 pl-2.5',
      )}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.path;
        if (item.iconOnly) {
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-bg text-ink transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <Icon name={item.icon} size={20} />
            </button>
          );
        }
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full py-1.5 text-[14px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
              active ? 'bg-accent-bg pl-2.5 pr-3.5 text-ink' : 'px-2.5 text-secondary hover:text-ink',
            )}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tabs = ITEMS.filter((i) => !i.iconOnly); // 4 items; account lives in the header

  return (
    <nav
      className={cn(
        'fixed bottom-4 left-1/2 z-50 flex h-[70px] -translate-x-1/2 md:hidden',
        'items-center gap-[30px] rounded-full border border-line bg-canvas px-5',
      )}
    >
      {tabs.map((item) => {
        const active = pathname === item.path;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex w-[50px] flex-col items-center gap-0.5 rounded-lg py-0.5 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
              active ? 'text-ink' : 'text-muted',
            )}
          >
            <Icon name={item.icon} size={24} />
            <span className="text-[11px] font-medium leading-none">{item.mobileLabel ?? item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
