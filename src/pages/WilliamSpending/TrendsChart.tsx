/**
 * Trends chart — monthly spending over time.
 * Single accent line, dashed horizontal gridlines, mono axes. William chart language.
 */
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import type { TrendPoint } from './useTrendsData';

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-3 py-2 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]">
      <p className="ty-label text-muted">{label}</p>
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-accent" />
        <p className="num-mono text-[14px] font-medium text-ink">{formatCurrency(payload[0].value, currency)}</p>
      </div>
    </div>
  );
}

export function TrendsChart({ data, currency }: { data: TrendPoint[]; currency: string }) {
  if (data.length < 2) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <p className="ty-body text-muted text-center">Not enough history yet — spend across a few months to see the trend.</p>
      </div>
    );
  }

  const values = data.map((d) => d.total);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const niceStep = (raw: number) => {
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const norm = (raw || 1) / mag;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  };
  const step = niceStep((max - min || max * 0.2) / 3);
  const niceMin = Math.max(Math.floor(min / step) * step - step, 0);
  const niceMax = Math.ceil((max + step * 0.15) / step) * step;
  const ticks: number[] = [];
  for (let t = niceMin; t <= niceMax + 1; t += step) ticks.push(t);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal vertical={false} stroke="var(--w-line)" strokeWidth={1} strokeDasharray="4 4" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--w-muted)', fontSize: 11, fontFamily: 'var(--w-font-mono)' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd" minTickGap={40}
        />
        <YAxis
          domain={[niceMin, niceMax]}
          ticks={ticks}
          tickFormatter={(v) => formatCurrency(v, currency, true)}
          tick={{ fill: 'var(--w-muted)', fontSize: 11, fontFamily: 'var(--w-font-mono)' }}
          axisLine={false} tickLine={false} width={52}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: 'var(--w-line)', strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--w-accent)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--w-accent)', stroke: 'var(--w-surface)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
