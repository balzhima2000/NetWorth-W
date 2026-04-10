
import { NavLink, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { APP_NAME } from '../../utils/constants';

// Crisp stroke-based SVG icons — consistent strokeWidth={1.75}, w-[18px] h-[18px]
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] flex-shrink-0">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 17.5h7M17.5 14v7" />
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] flex-shrink-0">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  spending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] flex-shrink-0">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  ),
  fire: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] flex-shrink-0">
      <path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-4-2-7-3-9-1 2-1 4-3 5 0-3-2-5-2-8 0-1 1-2 2-2z" />
      <path d="M12 22c-2 0-4-1.5-4-4 0-2 2-3 4-5 2 2 4 3 4 5 0 2.5-2 4-4 4z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] flex-shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
  { to: '/portfolio', label: 'Portfolio', icon: icons.portfolio },
  { to: '/spending',  label: 'Spending',  icon: icons.spending  },
{ to: '/fire',      label: 'FIRE',      icon: icons.fire      },
  { to: '/settings',  label: 'Settings',  icon: icons.settings  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const nickname = useSettingsStore((s) => s.userNickname);
  const location = useLocation();

  return (
    <aside
      className={`flex flex-col h-full bg-[#080808] border-r border-white/[0.07] transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.07] flex-shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
        {/* Logomark — emerald gradient, monochromatic and premium */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#065F46] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-[#10B981]/20">
          W
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-base tracking-tight">{APP_NAME}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`
                relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 text-sm font-medium
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/40 focus-visible:ring-inset
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? 'bg-[#10B981]/[0.12] text-[#10B981]'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/[0.05]'
                }
              `}
            >
              {/* Left accent bar for active item */}
              {isActive && (
                <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 bg-[#10B981] rounded-full" />
              )}
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      {!collapsed && nickname && (
        <div className="px-4 py-4 border-t border-white/[0.07] flex-shrink-0">
          <p className="text-[10px] text-white/20 uppercase tracking-wider font-medium mb-0.5">Signed in as</p>
          <p className="text-sm text-white/55 font-medium truncate">{nickname}</p>
        </div>
      )}
    </aside>
  );
}
