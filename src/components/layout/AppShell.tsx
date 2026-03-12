import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { BackupReminderBanner } from './BackupReminderBanner';
import { QuickAddFAB } from '../mobile/QuickAddFAB';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/spending':  'Spending',
  '/fire':      'FIRE Calculators',
  '/settings':  'Settings',
};

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? '';

  return (
    <div className="flex h-dvh bg-[#000000]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Desktop top bar */}
        <div className="hidden lg:block">
          <TopBar
            title={title}
            onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          />
        </div>

        <BackupReminderBanner />

        <main className="flex-1 overflow-y-auto overflow-x-hidden gradient-bg">
          {/*
            key={location.pathname} remounts the wrapper on every navigation,
            re-triggering the page-enter CSS animation.
            pb-28 on mobile gives clearance for the floating nav + FAB.
          */}
          <div
            key={location.pathname}
            className="page-enter max-w-7xl mx-auto p-4 pb-28 sm:p-6 lg:pb-6"
          >
            <Outlet />
          </div>
        </main>

        {/* Mobile floating nav — fixed, so no space is consumed in flex column */}
        <div className="lg:hidden">
          <MobileNav />
        </div>
        <div className="lg:hidden">
          <QuickAddFAB />
        </div>
      </div>
    </div>
  );
}
