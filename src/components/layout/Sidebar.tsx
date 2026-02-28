
import { NavLink, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { APP_NAME } from '../../utils/constants';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/portfolio', label: 'Portfolio', icon: '💼' },
  { to: '/spending', label: 'Spending', icon: '💳' },
  { to: '/fire', label: 'FIRE', icon: '🔥' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const nickname = useSettingsStore((s) => s.userNickname);
  const location = useLocation();

  return (
    <aside
      className={`flex flex-col h-full bg-[#0a0a0f] border-r border-white/8 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/8 flex-shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5865f2] to-[#00d632] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          W
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-base tracking-tight">{APP_NAME}</span>
        )}
      </div>
      <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 text-sm font-medium ${collapsed ? 'justify-center px-0' : ''} ${isActive ? 'bg-[#5865f2]/20 text-[#5865f2]' : 'text-white/50 hover:text-white hover:bg-white/8'}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      {!collapsed && nickname && (
        <div className="px-4 py-4 border-t border-white/8 flex-shrink-0">
          <p className="text-xs text-white/30">Signed in as</p>
          <p className="text-sm text-white/70 font-medium truncate">{nickname}</p>
        </div>
      )}
    </aside>
  );
}
