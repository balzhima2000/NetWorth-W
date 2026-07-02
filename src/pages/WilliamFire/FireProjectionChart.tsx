/**
 * FIRE projection chart.
 * Primary line (accent, near-black) = projected net worth with continued savings.
 * Comparison line (grey) = "coast" — where you'd land if you stopped saving today.
 * Horizontal dashed reference line marks the FI number; a dotted projection
 * drop + open end-dot sit on the final projected point. Matches the William chart language.
 */
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import type { ProjectionPoint } from './useFireData';

interface Props {
  data: ProjectionPoint[];
  fiNumber: number;
  currency: string;
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const projected = payload.find((p: any) => p.dataKey === 'projected');
  if (!projected) return null;
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-3 py-2 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]">
      <p className="ty-label text-muted">{label}</p>
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-accent" />
        <p className="num-mono text-[14px] font-medium text-ink">
          {formatCurrency(projected.value, currency)}
        </p>
      </div>
    </div>
  );
}

function EndDot({ cx, cy, index, dataLength }: any) {
  if (index !== dataLength - 1 || cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={5} fill="var(--w-surface)" stroke="var(--w-accent)" strokeWidth={2.5} />;
}

export function FireProjectionChart({ data, fiNumber, currency }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="ty-body text-muted text-center">Add your assumptions to see your projection.</p>
      </div>
    );
  }

  const lastYear = data[data.length - 1].year;

  // Y domain zooms to the projected/coast series (from 0), snapped to nice round
  // ticks. The FI line is only drawn when it falls within that range, so short
  // horizons keep the growth curve prominent instead of squashing it flat.
  const values = data.flatMap((d) => [d.projected, d.coast]);
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const niceStep = (raw: number) => {
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  };
  const step = niceStep((max - min || max * 0.1) / 3);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil((max + step * 0.15) / step) * step;
  const ticks: number[] = [];
  for (let t = niceMin; t <= niceMax + 1; t += step) ticks.push(t);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal vertical={false} stroke="var(--w-line)" strokeWidth={1} strokeDasharray="4 4" />
        <XAxis
          dataKey="year"
          tick={{ fill: 'var(--w-muted)', fontSize: 11, fontFamily: 'var(--w-font-mono)' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd" minTickGap={56}
        />
        <YAxis
          domain={[niceMin, niceMax]}
          ticks={ticks}
          tickFormatter={(v) => formatCurrency(v, currency, true)}
          tick={{ fill: 'var(--w-muted)', fontSize: 11, fontFamily: 'var(--w-font-mono)' }}
          axisLine={false} tickLine={false} width={56}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: 'var(--w-line)', strokeWidth: 1 }} />
        {/* FI number — horizontal target line (only when within the zoomed range) */}
        {fiNumber > 0 && fiNumber <= niceMax && (
          <ReferenceLine y={fiNumber} stroke="var(--w-muted)" strokeDasharray="4 4" strokeOpacity={0.7} />
        )}
        {/* dotted projection drop at the final year */}
        <ReferenceLine x={lastYear} stroke="var(--w-muted)" strokeDasharray="3 3" strokeOpacity={0.6} />
        <Line type="monotone" dataKey="coast" stroke="var(--w-muted)" strokeWidth={1.5} dot={false} activeDot={false} />
        <Line
          type="monotone"
          dataKey="projected"
          stroke="var(--w-accent)"
          strokeWidth={2}
          dot={(props) => <EndDot {...props} dataLength={data.length} />}
          activeDot={{ r: 4, fill: 'var(--w-accent)', stroke: 'var(--w-surface)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
