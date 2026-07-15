import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

/**
 * InfoTip — an "i" trigger + hover/focus tooltip, matched to the Figma Tooltip
 * master (1123:18711).
 *
 * - Beak is ALWAYS centered on the tooltip side; its center sits on the outer
 *   edge so the fill covers the body's 1px border (a connected point, no seam).
 * - The tooltip centers on the trigger. Near a viewport edge it NARROWS (down to
 *   TIP_MIN_WIDTH) rather than shifting off-centre, so the centered beak keeps
 *   pointing at the icon. Only below that floor does it clamp.
 * - Auto-flips above/below depending on available space.
 */
const TIP_WIDTH = 300;
const TIP_MIN_WIDTH = 200; // floor before we allow off-center clamping
const TIP_GAP = 8;      // trigger ↔ tooltip
const TIP_MARGIN = 12;  // viewport edge

interface InfoTipProps {
  title?: string;
  children: React.ReactNode;
  /** Trigger icon size (px). Default 14. */
  size?: number;
  /** Extra classes on the trigger button (e.g. alignment in a table header). */
  className?: string;
}

export function InfoTip({ title, children, size = 14, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom'; width: number } | null>(null);

  const compute = () => {
    const t = triggerRef.current?.getBoundingClientRect();
    const tip = tipRef.current?.getBoundingClientRect();
    if (!t || !tip) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const cx = t.left + t.width / 2;
    // The beak is ALWAYS centered on the tooltip, so to keep it pointing at the
    // trigger we must center the tooltip on `cx`. Rather than shift it off-centre
    // when it would overflow (which drifts the beak off the icon), narrow it so a
    // centered tooltip still fits. Only if it can't fit even at TIP_MIN_WIDTH do
    // we fall back to clamping.
    const maxHalf = Math.min(cx - TIP_MARGIN, vw - TIP_MARGIN - cx);
    const width = Math.max(TIP_MIN_WIDTH, Math.min(TIP_WIDTH, 2 * maxHalf));
    const spaceBelow = vh - t.bottom;
    const placement: 'top' | 'bottom' =
      spaceBelow < tip.height + TIP_GAP + TIP_MARGIN && t.top > tip.height + TIP_GAP + TIP_MARGIN ? 'top' : 'bottom';
    const left = Math.max(TIP_MARGIN, Math.min(cx - width / 2, vw - width - TIP_MARGIN));
    const top = placement === 'bottom' ? t.bottom + TIP_GAP : t.top - tip.height - TIP_GAP;
    setPos({ top, left, placement, width });
  };

  // Run twice: the first pass sizes the tooltip, the rAF pass re-measures its
  // (width-dependent) height so top-placement lands correctly.
  useLayoutEffect(() => {
    if (!open) return;
    compute();
    const r = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(r);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const on = () => compute();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); };
  }, [open]);

  return (
    <span className="inline-flex align-middle">
      <button
        ref={triggerRef}
        type="button"
        aria-label={title ?? 'More information'}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn('inline-flex text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none', className)}
      >
        <Icon name="info" size={size} />
      </button>
      {open && (
        <div
          ref={tipRef}
          role="tooltip"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width ?? TIP_WIDTH, opacity: pos ? 1 : 0 }}
          className="pointer-events-none z-[60] flex flex-col gap-[5px] rounded-2xl bg-surface p-4 text-left shadow-[var(--w-shadow-2)]"
        >
          {/* beak — an 8px rotated square, ALWAYS centered on the side (matches
              the Figma Tooltip master 1123:18711). Borderless like the body, so
              it's just a filled diamond straddling the edge — its center sits on
              the edge and the fill merges seamlessly into the body. */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-surface',
              pos?.placement === 'top' ? '-bottom-px translate-y-1/2' : '-top-px -translate-y-1/2',
            )}
          />
          {title && <span className="text-[15px] font-semibold leading-[1.4] tracking-[-0.01em] text-ink">{title}</span>}
          <span className="text-[14px] leading-[1.4] text-secondary">{children}</span>
        </div>
      )}
    </span>
  );
}
