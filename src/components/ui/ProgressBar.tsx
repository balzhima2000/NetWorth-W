

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
    if (ratio >= 1) barColor = '#ff4757';
    else if (ratio >= 0.8) barColor = '#f59e0b';
    else barColor = '#00d632';
  } else {
    const colorMap = {
      green: '#00d632',
      blue: '#5865f2',
      red: '#ff4757',
      amber: '#f59e0b',
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