import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ASSET_CATEGORY_COLORS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';

interface PieData {
  name: string;
  value: number;
}

interface AllocationPieChartProps {
  data: PieData[];
  currency: string;
  size?: number;
}

export function AllocationPieChart({ data, currency, size = 200 }: AllocationPieChartProps) {
  if (data.length === 0) return null;

  const colors = data.map(
    (d) => ASSET_CATEGORY_COLORS[d.name.toLowerCase()] ?? '#6b7280'
  );

  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={size * 0.3}
          outerRadius={size * 0.42}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: 'white',
            fontSize: 12,
          }}
          formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, currency), ''] : ['', '']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
