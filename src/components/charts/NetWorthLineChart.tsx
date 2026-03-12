import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { NetWorthSnapshot } from '../../types/index';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface NetWorthLineChartProps {
  data: NetWorthSnapshot[];
  currency: string;
}

export function NetWorthLineChart({ data, currency }: NetWorthLineChartProps) {
  if (data.length === 0) return null;

  const isUp = data.length > 1 && data[data.length - 1].netWorth >= data[0].netWorth;
  const lineColor = isUp ? '#22C55E' : '#EF4444';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(d, 'short')}
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, currency, true)}
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
          width={70}
        />
        <Tooltip
          contentStyle={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: 'white',
          }}
          formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, currency), 'Net Worth'] : ['', 'Net Worth']}
          labelFormatter={(label) => formatDate(label as string, 'long')}
        />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
