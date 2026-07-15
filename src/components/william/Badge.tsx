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
        // Geist Mono tabular per the Badge master (14:12). Mono only ships
        // Medium, so weight is 500 (font-semibold would faux-bold).
        'num-mono inline-flex items-center rounded-full px-2 py-1 text-[12px] font-medium leading-none',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
