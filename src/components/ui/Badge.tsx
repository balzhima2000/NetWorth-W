import React from 'react';

type BadgeVariant = 'default' | 'green' | 'red' | 'blue' | 'amber' | 'purple' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.08] text-white/75',
  green:   'bg-[#22C55E]/[0.14] text-[#22C55E]',
  red:     'bg-[#EF4444]/[0.14] text-[#EF4444]',
  blue:    'bg-[#3B82F6]/[0.14] text-[#3B82F6]',
  amber:   'bg-amber-500/[0.14] text-amber-400',
  purple:  'bg-purple-500/[0.14] text-purple-400',
  gray:    'bg-white/[0.05] text-white/45',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// Asset category badge
export function AssetCategoryBadge({ category }: { category: string }) {
  const variants: Record<string, BadgeVariant> = {
    stocks: 'blue',
    bonds: 'green',
    crypto: 'amber',
    other: 'gray',
  };
  const labels: Record<string, string> = {
    stocks: 'Stocks',
    bonds: 'Bonds',
    crypto: 'Crypto',
    other: 'Other',
  };
  return (
    <Badge variant={variants[category] ?? 'gray'}>
      {labels[category] ?? category}
    </Badge>
  );
}