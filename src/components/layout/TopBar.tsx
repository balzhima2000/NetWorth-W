import React from 'react';

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
  onToggleSidebar?: () => void;
}

export function TopBar({ title, actions, onToggleSidebar }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-16 px-3 sm:px-6 border-b border-white/[0.07] bg-[#080808] flex-shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {onToggleSidebar && (
          <div className="hidden lg:block">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/[0.07] transition-all duration-150 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/40"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
        {title && <h1 className="text-lg font-bold text-white truncate">{title}</h1>}
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {actions}
      </div>
    </header>
  );
}
