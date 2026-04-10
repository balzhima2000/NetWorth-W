import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Home',     icon: '🏠' },
  { to: '/portfolio', label: 'Portfolio', icon: '💼' },
  { to: '/spending',  label: 'Spending',  icon: '💳' },
  { to: '/fire',      label: 'FIRE',      icon: '🔥' },
  { to: '/settings',  label: 'Settings',  icon: '⚙️' },
];

export function MobileNav() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const lastTapRef = useRef<{ path: string; time: number }>({ path: '', time: 0 });

  // Match active tab — startsWith handles sub-routes
  const activeIndex = Math.max(
    0,
    navItems.findIndex(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(item.to + '/')
    )
  );

  // Always show nav when route changes (user navigated)
  useEffect(() => { setVisible(true); }, [location.pathname]);

  const handleNavTap = (path: string) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last.path === path && now - last.time < 350) {
      // Double-tap on active tab → scroll to top
      const scroller = document.querySelector('main.flex-1.overflow-y-auto') as HTMLElement | null;
      scroller?.scrollTo({ top: 0, behavior: 'smooth' });
      lastTapRef.current = { path: '', time: 0 };
    } else {
      lastTapRef.current = { path, time: now };
    }
  };

  // Scroll direction detection on the main scrollable container
  useEffect(() => {
    const scroller = document.querySelector('main.flex-1.overflow-y-auto') as HTMLElement | null;
    if (!scroller) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        const delta = y - lastScrollY.current;
        // Only react after a meaningful scroll, ignore tiny jitter
        if (Math.abs(delta) > 6) {
          setVisible(delta < 0 || y < 60); // scroll up → show; scroll down → hide; near top → always show
          lastScrollY.current = y;
        }
        ticking.current = false;
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 px-3"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
        transform: `translateZ(0)`,
        WebkitTransform: `translateZ(0)`,
        // Fade + slide down when hidden
        opacity: visible ? 1 : 0,
        translate: visible ? '0 0' : '0 16px',
        transition: visible
          ? 'opacity 420ms cubic-bezier(0.22,1,0.36,1), translate 420ms cubic-bezier(0.22,1,0.36,1)'
          : 'opacity 220ms ease, translate 220ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <nav
        className="mobile-nav-pill relative flex items-center rounded-[20px]"
        style={{ height: '70px' }}
      >
        {/* ── Spring-sliding indicator blob ── */}
        <div
          className="nav-indicator"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />

        {/* ── Tab items ── */}
        {navItems.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative z-10 flex flex-col items-center justify-center gap-0.5"
              style={{ flex: 1, height: '100%' }}
              onClick={() => handleNavTap(item.to)}
            >
              {/* Icon — springs up on active */}
              <span
                className={isActive ? 'nav-icon-active' : 'nav-icon-idle'}
                style={{
                  fontSize: '20px',
                  lineHeight: 1,
                  opacity: isActive ? 1 : 0.42,
                  display: 'block',
                }}
              >
                {item.icon}
              </span>

              {/* Label — only visible on active tab, slides up */}
              <span
                className={isActive ? 'nav-label-active' : ''}
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  color: isActive ? 'rgba(255,255,255,0.85)' : 'transparent',
                  lineHeight: 1.3,
                  maxHeight: isActive ? '16px' : '0px',
                  overflow: 'visible',
                  transition: 'max-height 300ms ease',
                }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
