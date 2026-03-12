import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface SpendingBarData {
  label: string;
  amount: number;
}

interface SpendingBarChartProps {
  data: SpendingBarData[];
  currency: string;
  color?: string;
}

export function SpendingBarChart({
  data,
  currency,
  color = '#10B981',
}: SpendingBarChartProps) {
  // Default to the accent colour, not the old blue
  const resolvedColor = color === '#10B981' ? '#10B981' : color;
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" stroke="rgba(255,255,255,0.25)" fontSize={11} />
        <YAxis
          stroke="rgba(255,255,255,0.25)"
          fontSize={11}
          width={60}
          tickFormatter={(v) => formatCurrency(v, currency, true)}
        />
        <Tooltip
          contentStyle={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12,
            color: 'white',
            fontSize: 12,
          }}
          formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, currency), 'Spent'] : ['', 'Spent']}
        />
        <Bar dataKey="amount" fill={resolvedColor} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
