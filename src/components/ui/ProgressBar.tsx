

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorAuto?: boolean; // auto color based on value (green < 80, amber 80-99, red >= 100)
  color?: 'green' | 'blue' | 'red' | 'amber';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = false,
  size = 'md',
  colorAuto = false,
  color = 'green',
  className = '',
}: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);

  let barColor: string;
  if (colorAuto) {
    const ratio = value / max;
    if (ratio >= 1) barColor = '#EF4444';
    else if (ratio >= 0.8) barColor = '#F59E0B';
    else barColor = '#10B981';
  } else {
    const colorMap = {
      green: '#10B981',
      blue:  '#3B82F6',
      red:   '#EF4444',
      amber: '#F59E0B',
    };
    barColor = colorMap[color];
  }

  const heightMap = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs text-white/60">
          {label && <span>{label}</span>}
          {showPercent && <span className="font-mono">{percent.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full bg-white/10 rounded-full overflow-hidden ${heightMap[size]}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}