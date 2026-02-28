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
  color = '#5865f2',
}: SpendingBarChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={11} />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
          width={60}
          tickFormatter={(v) => formatCurrency(v, currency, true)}
        />
        <Tooltip
          contentStyle={{
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: 'white',
            fontSize: 12,
          }}
          formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, currency), 'Spent'] : ['', 'Spent']}
        />
        <Bar dataKey="amount" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
