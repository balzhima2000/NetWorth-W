import React from 'react';
import { cn } from './cn';
import { Segmented } from './Segment';

/** Form field primitives matched to the Figma Forms components. */

// Borderless (2026-07): the FILL is the field affordance; focus is an accent
// ring rather than a border, so there's no layout shift and no hairline.
const inputBase =
  'w-full rounded-xl px-3.5 text-[15px] text-ink placeholder:text-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-accent';

/**
 * Where the field sits — it decides the fill, because separation is tonal:
 *  - `sunken` (default): on a white card / modal → grey field reads as recessed.
 *  - `surface`: directly on the grey canvas (e.g. Setup) → must be WHITE.
 *    `sunken` is #f5f5f5 in light = the canvas colour, so it would vanish.
 */
export type FieldTone = 'sunken' | 'surface';
const toneCls: Record<FieldTone, string> = {
  sunken: 'bg-sunken',
  surface: 'bg-surface',
};

export function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-1 flex-col gap-1.5">
      <span className="text-[13px] font-medium text-secondary">{label}</span>
      {children}
    </label>
  );
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { tone?: FieldTone }
>(function TextInput({ className, tone = 'sunken', ...rest }, ref) {
  return <input ref={ref} className={cn(inputBase, toneCls[tone], 'h-11', className)} {...rest} />;
});

export function Textarea({ className, tone = 'sunken', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { tone?: FieldTone }) {
  return <textarea className={cn(inputBase, toneCls[tone], 'min-h-[72px] resize-none py-3 leading-snug', className)} rows={2} {...rest} />;
}

export function SelectInput({ className, children, tone = 'sunken', ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { tone?: FieldTone }) {
  return (
    <div className="relative">
      <select className={cn(inputBase, toneCls[tone], 'h-11 appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <span className="num pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-secondary">↓</span>
    </div>
  );
}

interface Opt { value: string; label: string }
export function SegmentToggle({ options, value, onChange }: { options: Opt[]; value: string; onChange: (v: string) => void }) {
  return <Segmented options={options} value={value} onChange={onChange} track="sunken" size="md" fullWidth />;
}
