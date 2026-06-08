import React from 'react';
import { cn } from './cn';

/** Badge — Tone {Positive / Negative / Neutral}. Color follows the
 *  money-direction rule: lime = positive, orange = negative. */
type Tone = 'positive' | 'negative' | 'neutral';

const tones: Record<Tone, string> = {
  positive: 'bg-positive-bg text-positive',
  negative: 'bg-negative-bg text-negative',
  neutral: 'bg-accent-bg text-accent',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', children, className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'num inline-flex items-center rounded-full px-2.5 py-1.5 text-[12px] font-semibold leading-none',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
