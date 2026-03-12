import React from 'react';

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

// Select component with matching styles
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  hint,
  containerClassName = '',
  className = '',
  options,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-white/65">
          {label}
          {props.required && <span className="text-[#EF4444] ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full bg-[#141414] border rounded-xl px-3 py-3 text-sm text-white min-h-[44px]
          focus:outline-none focus:ring-2 focus:ring-[#10B981]/50 focus:border-[#10B981]/55
          transition-all duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
          ${error ? 'border-[#EF4444]/50' : 'border-white/[0.08] hover:border-white/[0.14]'}
          ${className}
        `}
        style={{ colorScheme: 'dark' }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#1C1C1C', color: 'white' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error  && <p className="text-xs text-[#EF4444]">{error}</p>}
      {hint && !error && <p className="text-xs text-white/35">{hint}</p>}
    </div>
  );
}
