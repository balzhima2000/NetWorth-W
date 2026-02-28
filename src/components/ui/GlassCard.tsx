import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function GlassCard({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
}: GlassCardProps) {
  return (
    <div
      className={`
        glass rounded-2xl
        ${paddingMap[padding]}
        ${hover || onClick ? 'hover:bg-white/[0.07] transition-colors duration-200 cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}