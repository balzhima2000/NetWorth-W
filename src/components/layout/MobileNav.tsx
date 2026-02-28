
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/portfolio', label: 'Portfolio', icon: '💼' },
  { to: '/spending', label: 'Spending', icon: '💳' },
  { to: '/fire', label: 'FIRE', icon: '🔥' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="flex items-stretch bg-[#0a0a0f] border-t border-white/8">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 text-xs transition-colors duration-200 ${isActive ? 'text-[#5865f2]' : 'text-white/40 hover:text-white/70'}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
