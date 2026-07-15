import React, { useEffect } from 'react';
import { cn } from './cn';

/**
 * Modal — responsive dialog. Desktop: centered card on a 45% scrim.
 * Mobile: bottom sheet (drag handle, top-rounded, full width).
 * Rendered inline (stays under .william scope). Esc + scrim-click close.
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-surface',
          // Mobile: full-width bottom sheet — top corners rounded, flush to the
          // bottom edge. Desktop: floating card — all four corners rounded.
          // Floats on top → fill + shadow, no border.
          'rounded-t-[24px] shadow-[var(--w-shadow-2)] md:rounded-[24px]',
        )}
        style={{ maxWidth: `min(${maxWidth}px, 100%)` }}
      >
        {/* drag handle (mobile) */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>
        {/* header */}
        <div className="flex items-center justify-between px-4 pb-2 pt-4 md:px-6 md:pt-6">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          <button
            type="button" aria-label="Close" onClick={onClose}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >✕</button>
        </div>
        {/* body */}
        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-2 md:px-6">{children}</div>
        {/* footer */}
        {footer && <div className="flex items-center gap-2 px-4 pb-6 pt-4 md:px-6">{footer}</div>}
      </div>
    </div>
  );
}
