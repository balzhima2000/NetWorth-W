import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { GlassCard } from '../../components/ui';
import { MonthlyTrendChart } from '../../components/charts/MonthlyTrendChart';
import { CategoryTrendChart } from '../../components/charts/CategoryTrendChart';
import { formatCurrency } from '../../utils/formatters';
import {
  getMonthlyTotals,
  getCategoryTrends,
  getDailyTotals,
} from '../../utils/spendingAnalytics';
import type { Transaction, SpendingCategory } from '../../types/index';

interface TrendsTabProps {
  transactions: Transaction[];
  defaultCurrency: string;
  categories: SpendingCategory[];
  currentMonth: number;
  currentYear: number;
}

const PERIODS = [
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: 'All', months: null },
] as const;

type Period = (typeof PERIODS)[number];

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <p className="text-white font-semibold text-sm">{title}</p>
      {subtitle && <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function TrendsTab({
  transactions,
  defaultCurrency,
  categories,
  currentMonth,
  currentYear,
}: TrendsTabProps) {
  const [period, setPeriod] = useState<Period>(PERIODS[1]); // default 6M

  // ── Precompute all historical data ──────────────────────────────────────
  const allMonthlyTotals = useMemo(() => getMonthlyTotals(transactions), [transactions]);

  const { months: allCategoryMonths, categories: topCategories } = useMemo(
    () => getCategoryTrends(transactions, 5),
    [transactions]
  );

  const dailyTotals = useMemo(
    () => getDailyTotals(transactions, currentMonth, currentYear),
    [transactions, currentMonth, currentYear]
  );

  // ── Slice by selected period ─────────────────────────────────────────────
  const monthlyTotals = useMemo(() => {
    if (period.months === null) return allMonthlyTotals;
    return allMonthlyTotals.slice(-period.months);
  }, [allMonthlyTotals, period]);

  const categoryMonths = useMemo(() => {
    if (period.months === null) return allCategoryMonths;
    return allCategoryMonths.slice(-period.months);
  }, [allCategoryMonths, period]);

  const savingsRateData = useMemo(
    () => monthlyTotals.filter((m) => m.income > 0),
    [monthlyTotals]
  );

  const hasDailySpend = dailyTotals.some((d) => d.amount > 0);
  const hasAnyData = allMonthlyTotals.length >= 1 || hasDailySpend;

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-4">📊</p>
        <p className="text-white/60 text-sm">
          Add some transactions to see spending trends.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Period Selector ─────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period.label === p.label
                ? 'bg-white/[0.09] text-white'
                : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── 1. Monthly Income vs Expenses ──────────────────────────────── */}
      <GlassCard padding="lg">
        <SectionHeader
          title="Income vs Expenses"
          subtitle="Monthly breakdown — green bars above red means you're saving"
        />
        <MonthlyTrendChart data={monthlyTotals} currency={defaultCurrency} />
      </GlassCard>

      {/* ── 2. Category Trends ──────────────────────────────────────────── */}
      {topCategories.length > 0 && (
        <GlassCard padding="lg">
          <SectionHeader
            title="Top Categories Over Time"
            subtitle="Stacked spending by your biggest expense categories"
          />
          <CategoryTrendChart
            data={categoryMonths}
            categories={topCategories}
            categoryInfo={categories}
            currency={defaultCurrency}
          />
        </GlassCard>
      )}

      {/* ── 3. Savings Rate Trend ───────────────────────────────────────── */}
      {savingsRateData.length >= 2 && (
        <GlassCard padding="lg">
          <SectionHeader
            title="Savings Rate"
            subtitle="(Income − Expenses) ÷ Income — months without income are excluded"
          />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={savingsRateData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.25)" fontSize={11} />
              <YAxis
                stroke="rgba(255,255,255,0.25)"
                fontSize={11}
                width={45}
                tickFormatter={(v) => `${Math.round(v)}%`}
              />
              <Tooltip
                contentStyle={{
                  background: '#111816',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 12,
                }}
                formatter={(value: number | undefined) => value !== undefined ? [`${Math.round(value)}%`, 'Savings Rate'] : ['', 'Savings Rate']}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <ReferenceLine y={20} stroke="rgba(34,197,94,0.2)" strokeDasharray="4 4" label={{ value: '20%', fill: 'rgba(34,197,94,0.4)', fontSize: 10, position: 'right' }} />
              <Line
                type="monotone"
                dataKey="savingsRate"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10B981' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* ── 4. Daily Spending (current month) ──────────────────────────── */}
      {hasDailySpend && (
        <GlassCard padding="lg">
          <SectionHeader
            title="Daily Spending — This Month"
            subtitle="Which days you spent the most"
          />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyTotals} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.25)"
                fontSize={10}
                interval={3}
              />
              <YAxis
                stroke="rgba(255,255,255,0.25)"
                fontSize={11}
                width={65}
                tickFormatter={(v) => formatCurrency(v, defaultCurrency, true)}
              />
              <Tooltip
                contentStyle={{
                  background: '#111816',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 12,
                }}
                formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, defaultCurrency), 'Spent'] : ['', 'Spent']}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Bar dataKey="amount" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

    </div>
  );
}
