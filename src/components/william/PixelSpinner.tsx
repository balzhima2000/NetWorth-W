import { useEffect, useState } from 'react';
import { cn } from './cn';

/**
 * PixelSpinner — the dot-matrix loading animation from the Figma
 * "Loading Animation" board (node 902:4572).
 *
 * NOT a rotating icon. It is a 16-slot pixel ring (dots around a square on
 * the 64-unit grid) where 13 dots are lit and a 3-dot GAP marches clockwise
 * one slot per frame. Because corner-dots and edge-dots don't map onto each
 * other, this can't be a CSS `rotate` — each frame is a distinct sprite, which
 * is why the glyph appears to "change completely" frame to frame.
 *
 * Frame 1 lights every slot except {4,5,6} (top-right corner + upper-right
 * edge), matching the first frame in the Figma diagram; each subsequent frame
 * advances the gap by one slot. 16 frames = one full revolution.
 */

// 16-slot ring, clockwise from the top-left corner, in 64-unit grid space.
// Slot indices are commented to match the Figma decode.
const RING: [number, number][] = [
  [13, 13], //  0  top-left corner
  [21, 5],  //  1  top edge
  [29, 5],  //  2  top edge
  [37, 5],  //  3  top edge
  [45, 13], //  4  top-right corner
  [53, 21], //  5  right edge
  [53, 29], //  6  right edge
  [53, 37], //  7  right edge
  [45, 45], //  8  bottom-right corner
  [37, 53], //  9  bottom edge
  [29, 53], // 10  bottom edge
  [21, 53], // 11  bottom edge
  [13, 45], // 12  bottom-left corner
  [5, 37],  // 13  left edge
  [5, 29],  // 14  left edge
  [5, 21],  // 15  left edge
];

const SLOTS = RING.length;      // 16
const GAP = 3;                  // unlit dots (the trailing "mouth")
const GAP_START_FRAME_1 = 4;    // Figma frame 1 gap = slots {4,5,6}
const FRAME_MS = 80;            // ~1.28s per revolution (16 × 80ms)

export function PixelSpinner({ size = 18, className }: { size?: number; className?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    // Respect reduced-motion: hold a single static frame.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const id = setInterval(() => setFrame((f) => (f + 1) % SLOTS), FRAME_MS);
    return () => clearInterval(id);
  }, []);

  const gapStart = (GAP_START_FRAME_1 + frame) % SLOTS;
  const isLit = (slot: number) => ((slot - gapStart + SLOTS) % SLOTS) >= GAP;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      {RING.map(([x, y], slot) =>
        isLit(slot) ? <rect key={slot} x={x} y={y} width={6} height={6} rx={1.5} /> : null,
      )}
    </svg>
  );
}
