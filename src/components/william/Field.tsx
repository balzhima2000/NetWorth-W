import React from 'react';
import { cn } from './cn';
import { Segmented } from './Segment';

/** Form field primitives matched to the Figma Forms components. */

// Borderless (2026-07): the sunken fill IS the field affordance; focus is an
// accent ring rather than a border, so there's no layout shift and no hairline.
const inputBase =
  'w-full rounded-xl bg-sunken px-3.5 text-[15px] text-ink placeholder:text-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-accent';

export function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-1 flex-col gap-1.5">
      <span className="text-[13px] font-medium text-secondary">{label}</span>
      {children}
    </label>
  );
}

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputBase, 'h-11', className)} {...rest} />;
  },
);

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, 'min-h-[72px] resize-none py-3 leading-snug', className)} rows={2} {...rest} />;
}

export function SelectInput({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputBase, 'h-11 appearance-none pr-9', className)} {...rest}>
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
