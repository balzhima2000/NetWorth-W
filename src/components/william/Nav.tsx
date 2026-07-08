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
  { id: 'portfolio', label: 'Portfolio', icon: 'portfolio', path: '/william/portfolio' },
  { id: 'spending',  label: 'Spending',  icon: 'spending',  path: '/william/spending' },
  { id: 'fire',      label: 'FIRE',      icon: 'fire',      path: '/william/fire' },
  { id: 'account',   label: 'Account',   icon: 'account',   path: '/william/account', iconOnly: true },
];

export function FloatingNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const account = ITEMS.find((i) => i.iconOnly)!;
  const mainItems = ITEMS.filter((i) => !i.iconOnly);

  return (
    // Two detached glass surfaces (Figma NavPill 202:2605): the 4-item pill +
    // a separate account island, ~10px apart. The wrapper is transparent.
    <nav
      aria-label="Primary"
      className="fixed left-1/2 top-5 z-50 hidden -translate-x-1/2 items-center gap-2.5 md:flex"
    >
      <div className="nav-glass flex items-center gap-1.5 rounded-full p-2 pl-2.5">
        {mainItems.map((item) => {
          const active = pathname === item.path;
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
      </div>
      <button
        onClick={() => navigate(account.path)}
        aria-label={account.label}
        aria-current={pathname === account.path ? 'page' : undefined}
        className="nav-glass flex h-11 w-11 items-center justify-center rounded-full text-ink transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <Icon name={account.icon} size={20} />
      </button>
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
        'fixed bottom-4 left-1/2 z-50 flex w-[340px] -translate-x-1/2 md:hidden',
        'nav-glass items-center gap-1 rounded-full p-1.5',
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
              'flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
              // Active item = grey pill (surface-raised) + ink; inactive = muted.
              active ? 'bg-raised text-ink' : 'text-muted',
            )}
          >
            <Icon name={item.icon} size={24} />
            <span className={cn('text-[10px] leading-none', active ? 'font-semibold' : 'font-medium')}>
              {item.mobileLabel ?? item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
