import React, { useState, useRef, useEffect } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  leftAddon,
  rightAddon,
  containerClassName = '',
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/65">
          {label}
          {props.required && <span className="text-[#EF4444] ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftAddon && (
          <div className="absolute left-3 text-white/35 flex items-center pointer-events-none">
            {leftAddon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full bg-[#141414] border rounded-xl px-3 py-3 text-sm text-white min-h-[44px]
            placeholder:text-white/25
            focus:outline-none focus:ring-2 focus:ring-[#10B981]/50 focus:border-[#10B981]/55
            transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error
              ? 'border-[#EF4444]/50 focus:ring-[#EF4444]/30'
              : 'border-white/[0.08] hover:border-white/[0.14]'
            }
            ${leftAddon  ? 'pl-9' : ''}
            ${rightAddon ? 'pr-9' : ''}
            ${className}
          `}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 text-white/35 flex items-center pointer-events-none">
            {rightAddon}
          </div>
        )}
      </div>
      {error  && <p className="text-xs text-[#EF4444]">{error}</p>}
      {hint && !error && <p className="text-xs text-white/35">{hint}</p>}
    </div>
  );
}

// Custom Select component (div-based dropdown for full dark-mode control)
interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  className?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function Select({
  label,
  error,
  hint,
  containerClassName = '',
  className = '',
  options,
  value,
  onChange,
  required,
  disabled,
  id,
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && highlightIdx >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIdx]) {
        (items[highlightIdx] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIdx, open]);

  const handleSelect = (val: string) => {
    onChange?.({ target: { value: val } });
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        const idx = options.findIndex((o) => o.value === value);
        setHighlightIdx(idx >= 0 ? idx : 0);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < options.length) {
          handleSelect(options[highlightIdx].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`} ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-white/65">
          {label}
          {required && <span className="text-[#EF4444] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen((o) => !o);
              const idx = options.findIndex((o) => o.value === value);
              setHighlightIdx(idx >= 0 ? idx : 0);
            }
          }}
          onKeyDown={handleKeyDown}
          className={`
            w-full bg-[#141414] border rounded-xl px-3 py-3 text-sm text-white min-h-[44px]
            text-left flex items-center justify-between
            focus:outline-none focus:ring-2 focus:ring-[#10B981]/50 focus:border-[#10B981]/55
            transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error ? 'border-[#EF4444]/50' : 'border-white/[0.08] hover:border-white/[0.14]'}
            ${className}
          `}
        >
          <span className={selectedOption ? 'text-white' : 'text-white/25'}>
            {selectedOption?.label ?? 'Select...'}
          </span>
          <svg
            className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div
            ref={listRef}
            className="absolute z-50 mt-1 w-full bg-[#1C1C1C] border border-white/[0.1] rounded-xl shadow-xl max-h-60 overflow-y-auto py-1"
            role="listbox"
          >
            {options.map((opt, i) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`
                  px-3 py-2.5 text-sm cursor-pointer transition-colors
                  ${opt.value === value ? 'text-[#10B981] bg-white/[0.06]' : 'text-white'}
                  ${i === highlightIdx ? 'bg-white/[0.1]' : 'hover:bg-white/[0.06]'}
                `}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {error  && <p className="text-xs text-[#EF4444]">{error}</p>}
      {hint && !error && <p className="text-xs text-white/35">{hint}</p>}
    </div>
  );
}
