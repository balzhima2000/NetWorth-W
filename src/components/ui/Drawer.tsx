import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

// Desktop widths only — on mobile the drawer is always full-width bottom-sheet
const desktopWidthMap = {
  sm: 'sm:w-80',
  md: 'sm:w-[420px]',
  lg: 'sm:w-[560px]',
};

export function Drawer({ isOpen, onClose, title, children, width = 'md' }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/*
       * Panel:
       *   Mobile  → full-width bottom sheet, slides up from bottom
       *   Desktop → right-side panel, slides in from right
       *
       * Rendered via createPortal into document.body so it is never clipped
       * by ancestor overflow containers (e.g. <main overflow-x-hidden>).
       */}
      <div
        className={`
          fixed z-50 bg-[#0C0C0C] flex flex-col
          transition-transform duration-300 ease-out

          bottom-0 left-0 w-full max-h-[90vh]
          rounded-t-[28px] border-t border-white/10

          sm:bottom-auto sm:right-0 sm:top-0 sm:h-full sm:left-auto sm:rounded-none sm:border-t-0 sm:border-l
          ${desktopWidthMap[width]}

          ${isOpen
            ? 'translate-y-0 sm:translate-y-0 sm:translate-x-0'
            : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
          }
        `}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          {title && <h2 className="text-base sm:text-lg font-semibold text-white">{title}</h2>}
          {/* Close button: 40×40 tap target */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 ml-auto -mr-2 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 active:bg-white/15 transition-all duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content — safe-area padding at bottom on mobile */}
        <div
          className="flex-1 overflow-y-auto p-5"
          style={{ paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 1.25rem))' }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
