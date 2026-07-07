import React from 'react';
import { cn } from './cn';

/** Card — white surface, borderless, no shadow (elevation = tone: surface on the grey canvas). */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card bg-surface', className)} {...rest}>
      {children}
    </div>
  );
}
