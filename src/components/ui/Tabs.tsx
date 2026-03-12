import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-1 bg-white/[0.04] rounded-xl p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium
            transition-all duration-200 flex-1 justify-center min-w-0
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent
            ${
              activeTab === tab.id
                ? 'bg-white/[0.09] text-white shadow-sm'
                : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]'
            }
          `}
        >
          {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
          <span className="truncate">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}