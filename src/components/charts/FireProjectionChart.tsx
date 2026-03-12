import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { FireProjectionPoint } from '../../types/index';
import { formatCurrency } from '../../utils/formatters';

interface FireProjectionChartProps {
  data: FireProjectionPoint[];
  fireTarget: number;
  currency: string;
}

export function FireProjectionChart({ data, fireTarget, currency }: FireProjectionChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="year"
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
          tickFormatter={(v) => `Yr ${v}`}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
          width={70}
          tickFormatter={(v) => formatCurrency(v, currency, true)}
        />
        <Tooltip
          contentStyle={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: 'white',
            fontSize: 12,
          }}
          formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, currency), 'Portfolio'] : ['', 'Portfolio']}
          labelFormatter={(label) => `Year ${label}`}
        />
        <ReferenceLine
          y={fireTarget}
          stroke="#f59e0b"
          strokeDasharray="8 4"
          strokeWidth={2}
          label={{
            value: `FIRE Target: ${formatCurrency(fireTarget, currency, true)}`,
            position: 'right',
            fill: '#f59e0b',
            fontSize: 11,
          }}
        />
        <Line
          type="monotone"
          dataKey="portfolioValue"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: '#10B981' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
