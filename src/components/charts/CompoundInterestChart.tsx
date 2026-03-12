import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { CompoundChartPoint } from '../../types/index';
import { formatCurrency } from '../../utils/formatters';

interface CompoundInterestChartProps {
  data: CompoundChartPoint[];
  currency: string;
}

export function CompoundInterestChart({ data, currency }: CompoundInterestChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
          formatter={(value: number | undefined, name: string | undefined) => [
            value !== undefined ? formatCurrency(value, currency) : '',
            name === 'contributed' ? 'Contributed' : 'Growth',
          ]}
          labelFormatter={(label) => `Year ${label}`}
        />
        <Area
          type="monotone"
          dataKey="contributed"
          stackId="1"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.30}
        />
        <Area
          type="monotone"
          dataKey="growth"
          stackId="1"
          stroke="#10B981"
          fill="#10B981"
          fillOpacity={0.35}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
