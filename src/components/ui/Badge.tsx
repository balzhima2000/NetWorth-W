import React from 'react';

type BadgeVariant = 'default' | 'green' | 'red' | 'blue' | 'amber' | 'purple' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-white/80',
  green: 'bg-[#00d632]/20 text-[#00d632]',
  red: 'bg-[#ff4757]/20 text-[#ff4757]',
  blue: 'bg-[#5865f2]/20 text-[#5865f2]',
  amber: 'bg-amber-500/20 text-amber-400',
  purple: 'bg-purple-500/20 text-purple-400',
  gray: 'bg-white/5 text-white/50',
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