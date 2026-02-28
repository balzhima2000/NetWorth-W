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
        <label htmlFor={inputId} className="text-sm font-medium text-white/70">
          {label}
          {props.required && <span className="text-[#ff4757] ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftAddon && (
          <div className="absolute left-3 text-white/40 flex items-center pointer-events-none">
            {leftAddon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full bg-white/[0.06] border rounded-xl px-3 py-2.5 text-sm text-white
            placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-[#5865f2]/50 focus:border-[#5865f2]/60
            transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error ? 'border-[#ff4757]/60 focus:ring-[#ff4757]/30' : 'border-white/10 hover:border-white/20'}
            ${leftAddon ? 'pl-9' : ''}
            ${rightAddon ? 'pr-9' : ''}
            ${className}
          `}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 text-white/40 flex items-center pointer-events-none">
            {rightAddon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[#ff4757]">{error}</p>}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
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
        <label htmlFor={selectId} className="text-sm font-medium text-white/70">
          {label}
          {props.required && <span className="text-[#ff4757] ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full bg-white/[0.06] border rounded-xl px-3 py-2.5 text-sm text-white
          focus:outline-none focus:ring-2 focus:ring-[#5865f2]/50 focus:border-[#5865f2]/60
          transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          ${error ? 'border-[#ff4757]/60' : 'border-white/10 hover:border-white/20'}
          ${className}
        `}
        style={{ colorScheme: 'dark' }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#13131f', color: 'white' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[#ff4757]">{error}</p>}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  );
}