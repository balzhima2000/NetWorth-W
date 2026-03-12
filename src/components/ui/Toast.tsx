import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (message: string, variant: ToastVariant) => void;
  removeToast: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used inside <ToastProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]); // max 5 at once
      const timer = setTimeout(() => removeToast(id), 3500);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

function ToastContainer() {
  const { toasts } = useToastContext();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

// ─── Individual Toast Card ────────────────────────────────────────────────────

const variantStyles: Record<ToastVariant, { bar: string; icon: string }> = {
  success: { bar: 'bg-[#10B981]', icon: '✓' },
  error:   { bar: 'bg-[#EF4444]', icon: '✕' },
  info:    { bar: 'bg-[#3B82F6]', icon: 'ℹ' },
};

const variantIconBg: Record<ToastVariant, string> = {
  success: 'bg-[#10B981]/[0.15] text-[#10B981]',
  error:   'bg-[#EF4444]/[0.15] text-[#EF4444]',
  info:    'bg-[#3B82F6]/[0.15] text-[#3B82F6]',
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const { removeToast } = useToastContext();
  const { bar, icon } = variantStyles[toast.variant];

  return (
    <div
      role="status"
      className={`
        pointer-events-auto
        relative flex items-center gap-3
        bg-[#111111] border border-white/[0.08]
        rounded-xl shadow-2xl
        px-4 py-3 pr-10
        min-w-[260px] max-w-[360px]
        animate-in fade-in slide-in-from-right-4 duration-300
      `}
    >
      {/* Accent bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${bar}`} />

      {/* Icon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${variantIconBg[toast.variant]}`}>
        {icon}
      </div>

      {/* Message */}
      <p className="text-sm text-white/90 leading-snug flex-1">{toast.message}</p>

      {/* Close button */}
      <button
        onClick={() => removeToast(toast.id)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors p-0.5"
        aria-label="Dismiss notification"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
