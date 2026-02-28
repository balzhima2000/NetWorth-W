import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
  onToggleSidebar?: () => void;
}

export function TopBar({ title, actions, onToggleSidebar }: TopBarProps) {
  const nickname = useSettingsStore((s) => s.userNickname);

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-white/8 bg-[#0a0a0f] flex-shrink-0">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="text-white/50 hover:text-white transition-colors p-1"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        {title && <h1 className="text-xl font-semibold text-white">{title}</h1>}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        {nickname && (
          <span className="text-sm text-white/50">
            Hello, <span className="text-white/80 font-medium">{nickname}</span> 👋
          </span>
        )}
      </div>
    </header>
  );
}
