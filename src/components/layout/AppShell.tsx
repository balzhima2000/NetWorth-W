import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/spending': 'Spending',
  '/fire': 'FIRE Calculators',
  '/settings': 'Settings',
};

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? '';

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          title={title}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        />
        <main className="flex-1 overflow-y-auto gradient-bg">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>

        <div className="lg:hidden flex-shrink-0">
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
