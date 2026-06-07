/**
 * Two-line Recharts net-worth chart.
 * Primary line = color/accent (neutral near-black). Comparison = grey.
 * Y-axis zoomed to data range; open end-dot + dashed projection at the last point.
 */
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface DataPoint { date: string; value: number; }

interface NetWorthChartProps {
  data: DataPoint[];
  comparison?: DataPoint[];
  currency: string;
  empty?: boolean;
}

function mergeData(primary: DataPoint[], comparison: DataPoint[]) {
  const map: Record<string, { date: string; primary?: number; comparison?: number }> = {};
  primary.forEach((p) => { map[p.date] = { date: p.date, primary: p.value }; });
  comparison.forEach((c) => {
    if (map[c.date]) map[c.date].comparison = c.value;
    else map[c.date] = { date: c.date, comparison: c.value };
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function formatAxisDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const primary = payload.find((p: any) => p.dataKey === 'primary');
  if (!primary) return null;
  return (
    <div className="rounded-[8px] border border-line bg-surface px-3 py-2">
      <p className="ty-label text-muted mb-1">{formatAxisDate(label)}</p>
      <p className="num text-[14px] font-semibold text-ink">
        {formatCurrency(primary.value, currency)}
      </p>
    </div>
  );
}

// Open-circle dot rendered only on the final primary point
function EndDot({ cx, cy, index, dataLength }: any) {
  if (index !== dataLength - 1 || cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={5} fill="var(--w-surface)" stroke="var(--w-accent)" strokeWidth={2.5} />;
}

export function NetWorthChart({ data, comparison = [], currency, empty = false }: NetWorthChartProps) {
  if (empty || data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="ty-body text-muted text-center">No data yet.<br />Your chart will appear as snapshots accumulate.</p>
      </div>
    );
  }

  const merged = mergeData(data, comparison);
  const lastDate = data[data.length - 1].date;

  // Zoom Y-axis to the data range, snapped to "nice" round ticks (like Figma)
  const values = merged.flatMap((d) => [d.primary, d.comparison].filter((v): v is number => v != null));
  const min = Math.min(...values), max = Math.max(...values);
  const niceStep = (raw: number) => {
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  };
  const step = niceStep((max - min || max * 0.1) / 3);
  const niceMin = Math.floor((min - step * 0.25) / step) * step;
  const niceMax = Math.ceil((max + step * 0.25) / step) * step;
  const ticks: number[] = [];
  for (let t = niceMin; t <= niceMax + 1; t += step) ticks.push(t);
  const domain: [number, number] = [niceMin, niceMax];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={merged} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal vertical={false} stroke="var(--w-line)" strokeWidth={1} strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          tick={{ fill: 'var(--w-muted)', fontSize: 11 }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd" minTickGap={56}
        />
        <YAxis
          domain={domain}
          ticks={ticks}
          tickFormatter={(v) => formatCurrency(v, currency, true)}
          tick={{ fill: 'var(--w-muted)', fontSize: 11 }}
          axisLine={false} tickLine={false} width={56}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: 'var(--w-line)', strokeWidth: 1 }} />
        {/* dashed projection line at the latest point */}
        <ReferenceLine x={lastDate} stroke="var(--w-muted)" strokeDasharray="3 3" strokeOpacity={0.6} />
        {comparison.length > 0 && (
          <Line type="monotone" dataKey="comparison" stroke="var(--w-muted)" strokeWidth={1.5} dot={false} activeDot={false} connectNulls />
        )}
        <Line
          type="monotone"
          dataKey="primary"
          stroke="var(--w-accent)"
          strokeWidth={2}
          dot={(props) => <EndDot {...props} dataLength={merged.length} />}
          activeDot={{ r: 4, fill: 'var(--w-accent)', stroke: 'var(--w-surface)', strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
