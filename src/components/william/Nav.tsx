import { useLayoutEffect, useRef, useState } from 'react';
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

  // Hover-follow pill: a single indicator that jumps to the hovered item and
  // rests on the active one — hidden when neither applies (e.g. Account page).
  const listRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [ind, setInd] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const activeIdx = mainItems.findIndex((i) => i.path === pathname);
  const shownIdx = hovered ?? (activeIdx >= 0 ? activeIdx : null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => {
      if (shownIdx == null) return setInd(null);
      const btn = el.querySelectorAll<HTMLElement>('[data-nav]')[shownIdx];
      if (btn) setInd({ left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shownIdx]);

  return (
    // Two detached glass surfaces (Figma NavPill 202:2605): the 4-item pill +
    // a separate account island, ~10px apart. The wrapper is transparent.
    <nav
      aria-label="Primary"
      className="fixed left-1/2 top-5 z-50 hidden -translate-x-1/2 items-center gap-2 md:flex"
    >
      <div
        ref={listRef}
        onMouseLeave={() => setHovered(null)}
        className="nav-glass relative flex items-center gap-2 rounded-full px-1 py-1"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full bg-accent-bg transition-[left,top,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={ind ? { left: ind.left, top: ind.top, width: ind.width, height: ind.height, opacity: 1 } : { opacity: 0 }}
        />
        {mainItems.map((item, i) => {
          const active = pathname === item.path;
          return (
            <button
              key={item.id}
              data-nav
              onMouseEnter={() => setHovered(i)}
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative z-10 flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                active || hovered === i ? 'text-ink' : 'text-secondary',
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
        className="nav-glass group relative flex h-[44px] w-[44px] items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {/* Selected/hover highlight — same accent-bg pill as the other nav
            items (37px, matching their height), just circular; on the glass. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute h-[37px] w-[37px] rounded-full bg-accent-bg transition-opacity duration-150',
            pathname === account.path ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        />
        <Icon name={account.icon} size={20} className="relative z-10" />
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
        'nav-glass items-center gap-1 rounded-full p-1',
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
              'flex flex-1 flex-col items-center gap-0 rounded-full py-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
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
