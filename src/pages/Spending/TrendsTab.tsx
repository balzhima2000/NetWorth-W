import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
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
    () => monthlyTotals.filter((m) => m.income > 0).map(m => ({ ...m, saved: m.income - m.expenses })),
    [monthlyTotals]
  );

  const savingsStats = useMemo(() => {
    if (savingsRateData.length === 0) return null;
    const rates = savingsRateData.map(m => m.savingsRate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const high = Math.max(...rates);
    const low = Math.min(...rates);
    const totalSaved = savingsRateData.reduce((a, m) => a + m.saved, 0);
    return { avg, high, low, totalSaved };
  }, [savingsRateData]);

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

      {/* ── 3. Savings Rate Trend (combo: bars = amount saved, line = rate %) ── */}
      {savingsRateData.length >= 2 && (
        <GlassCard padding="lg">
          <SectionHeader
            title="Savings Rate"
            subtitle="Bars show amount saved · Line shows savings rate %"
          />
          {savingsStats && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-white/[0.03] rounded-lg p-3">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Avg Rate</p>
                <p className="text-white font-semibold text-sm">{Math.round(savingsStats.avg)}%</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Highest</p>
                <p className="text-[#10B981] font-semibold text-sm">{Math.round(savingsStats.high)}%</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Lowest</p>
                <p className={`font-semibold text-sm ${savingsStats.low < 0 ? 'text-[#EF4444]' : 'text-white'}`}>{Math.round(savingsStats.low)}%</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Total Saved</p>
                <p className={`font-semibold text-sm ${savingsStats.totalSaved >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{formatCurrency(savingsStats.totalSaved, defaultCurrency)}</p>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={savingsRateData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.25)" fontSize={11} />
              <YAxis
                yAxisId="amount"
                stroke="rgba(255,255,255,0.25)"
                fontSize={11}
                width={55}
                tickFormatter={(v) => formatCurrency(v, defaultCurrency, true)}
              />
              <YAxis
                yAxisId="rate"
                orientation="right"
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
                formatter={(value?: number, name?: string) => {
                  if (value === undefined) return ['', ''];
                  if (name === 'saved') return [<span style={{ color: '#10B981' }}>{formatCurrency(value, defaultCurrency)}</span>, 'Saved'];
                  return [<span style={{ color: '#10B981' }}>{Math.round(value)}%</span>, 'Savings Rate'];
                }}
              />
              <ReferenceLine yAxisId="amount" y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Bar
                yAxisId="amount"
                dataKey="saved"
                fill="rgba(16,185,129,0.25)"
                stroke="rgba(16,185,129,0.5)"
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="savingsRate"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10B981' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
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
