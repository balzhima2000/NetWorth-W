/**
 * William Spending — "Spending for <month>" screen.
 * Scoped under .william. Route: /william/spending
 * Built 1:1 from Figma (Spending / Desktop 1153:5633 · Mobile 1239:6656).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, Button, Icon, FloatingNav, TabBar } from '../../components/william';
import { cn } from '../../components/william/cn';
import { AddTransactionModal } from '../WilliamPortfolio/modals';
import { SetBudgetsModal } from './SetBudgetsModal';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatters';
import { useSpendingData, type CategorySlice, type RecentRow, type BudgetRow } from './useSpendingData';

// By-category donut palette — same chart tokens as the dashboard breakdown:
// accent · lime · blue · grey. Lime/blue are pale in light, bright in dark.
const CHART_COLORS = ['var(--w-accent)', 'var(--w-alloc-lime)', 'var(--w-alloc-blue)', 'var(--w-accent-bg)'];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Whole-currency, no decimals (hero / legend / budgets / daily average).
const money0 = (n: number, cur: string) => `${getCurrencySymbol(cur)}${Math.round(n).toLocaleString('en-US')}`;

// ── Month picker pill ─────────────────────────────────────────────────────────
export function MonthPicker({ month, year, onChange }: { month: number; year: number; onChange: (m: number, y: number) => void }) {
  const [open, setOpen] = useState(false);
  // Current month back through the previous 11.
  const options = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { m: d.getMonth() + 1, y: d.getFullYear() };
    });
  }, []);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {MONTH_NAMES[month - 1]} {year}
        <svg width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden="true" className="shrink-0 text-secondary">
          <path d="M1 1.5 5.5 6 10 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 flex max-h-[280px] w-[200px] flex-col gap-0.5 overflow-y-auto rounded-xl border border-line bg-surface p-1.5">
            {options.map(({ m, y }) => {
              const active = m === month && y === year;
              return (
                <button
                  key={`${m}-${y}`}
                  type="button"
                  onClick={() => { onChange(m, y); setOpen(false); }}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-left text-[14px] transition-colors',
                    active ? 'bg-accent-bg font-medium text-ink' : 'text-secondary hover:bg-raised',
                  )}
                >
                  {MONTH_NAMES[m - 1]} {y}
                  {active && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── By-category donut ─────────────────────────────────────────────────────────
function Donut({ slices, total, currency }: { slices: CategorySlice[]; total: number; currency: string }) {
  const hasData = slices.length > 0 && total > 0;
  const data: CategorySlice[] = hasData ? slices : [{ id: '__empty__', name: 'empty', amount: 1, pct: 0 }];
  return (
    <div className="relative size-[150px] shrink-0">
      <PieChart width={150} height={150} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={data}
          dataKey="amount"
          cx="50%"
          cy="50%"
          innerRadius={46}
          outerRadius={72}
          startAngle={90}
          endAngle={-270}
          paddingAngle={hasData && slices.length > 1 ? 2 : 0}
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((s, i) => (
            <Cell key={s.id} fill={hasData ? CHART_COLORS[i % CHART_COLORS.length] : 'var(--w-raised)'} />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[20px] font-semibold text-ink">{money0(total, currency)}</p>
        <p className="text-[12px] text-secondary">spent</p>
      </div>
    </div>
  );
}

function Legend({ slices, currency }: { slices: CategorySlice[]; currency: string }) {
  if (slices.length === 0) {
    return <p className="text-[14px] text-muted">No spending this month.</p>;
  }
  return (
    <div className="flex flex-1 flex-col gap-3">
      {slices.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{s.name}</span>
          <span className="shrink-0 text-[13px] text-secondary">{Math.round(s.pct)}%</span>
          <span className="num-mono w-[70px] shrink-0 text-right text-[14px] font-medium text-ink">{money0(s.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Recent transaction row ────────────────────────────────────────────────────
function RecentItem({ row, currency, divider }: { row: RecentRow; currency: string; divider: boolean }) {
  return (
    <>
      {divider && <div className="h-px w-full bg-line" />}
      <div className="flex h-12 items-center gap-3 py-2.5">
        <span className="h-[30px] w-[3px] shrink-0 rounded-full" style={{ background: row.color }} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] font-semibold text-ink">{row.name}</span>
          <span className="truncate text-[12px] text-secondary">{row.category}</span>
        </div>
        <span className={cn('num-mono shrink-0 text-right text-[14px] font-medium', row.isExpense ? 'text-negative' : 'text-positive')}>
          {row.isExpense ? '−' : '+'}{formatCurrency(row.amount, currency)}
        </span>
      </div>
    </>
  );
}

// ── Budget row ────────────────────────────────────────────────────────────────
function BudgetItem({ row, currency }: { row: BudgetRow; currency: string }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between text-[14px]">
        <span className="font-medium text-ink">{row.name}</span>
        <span className="num-mono flex gap-1">
          <span className={row.over ? 'text-negative' : 'text-ink'}>{money0(row.spent, currency)}</span>
          <span className="text-muted">/ {money0(row.limit, currency)}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className={cn('h-full rounded-full', row.over ? 'bg-negative' : 'bg-accent')}
          style={{ width: `${row.pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Nav card (Recurring / Trends) ─────────────────────────────────────────────
function NavCard({ icon, title, subtitle, onClick }: { icon: 'recurring' | 'trends'; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3.5 rounded-card border border-line bg-surface px-5 py-[18px] text-left transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <Icon name={icon} size={22} className="shrink-0 text-ink" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold text-ink">{title}</span>
        <span className="truncate text-[13px] text-secondary">{subtitle}</span>
      </span>
      <span className="shrink-0 text-secondary" aria-hidden="true">›</span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WilliamSpending() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [addOpen, setAddOpen] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const d = useSpendingData(month, year);

  const cur = d.defaultCurrency;
  const up = d.deltaPct !== null && d.deltaPct > 0;

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />

      <main className="mx-auto flex max-w-[1100px] flex-col gap-[18px] px-4 md:gap-5 md:px-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3.5">
            <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink md:text-[32px]">Spending for</h1>
            <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
          </div>
          <Button pill variant="primary" size="m" className="shrink-0 font-semibold" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={16} />
            Add
          </Button>
        </div>

        {/* ── Row 1: Spent + By category ── */}
        <div className="grid grid-cols-1 gap-[18px] md:gap-5 lg:grid-cols-[472fr_596fr] lg:items-stretch">
          {/* Spent */}
          <Card className="flex flex-col gap-3 p-5">
            <p className="num-mono text-[12px] uppercase tracking-[0.6px] text-secondary">This month spent</p>
            <p className="text-[44px] font-bold leading-none text-ink">{money0(d.totalSpent, cur)}</p>
            {d.deltaPct !== null ? (
              <div className="flex items-center gap-2">
                <span className={cn('rounded-full px-2 py-[3px] text-[12px] font-semibold', up ? 'bg-negative-bg text-negative' : 'bg-positive-bg text-positive')}>
                  {up ? '↑' : '↓'} {Math.abs(d.deltaPct).toFixed(0)}%
                </span>
                <span className="text-[14px] text-secondary">vs last month</span>
              </div>
            ) : (
              <span className="text-[14px] text-muted">No prior month to compare</span>
            )}
            <div className="min-h-[8px] flex-1" />
            <div className="h-px w-full bg-line" />
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-secondary">Daily average</span>
              <span className="text-[15px] font-semibold text-ink">{money0(d.dailyAverage, cur)}</span>
            </div>
          </Card>

          {/* By category */}
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-ink">By category</h2>
              <Button pill variant="secondary" size="s" onClick={() => setBudgetsOpen(true)}>
                <Icon name="target" size={16} />
                Set targets
              </Button>
            </div>
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-7">
              <Donut slices={d.categories} total={d.totalSpent} currency={cur} />
              <Legend slices={d.categories} currency={cur} />
            </div>
          </Card>
        </div>

        {/* ── Row 2: nav cards ── */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-5">
          <NavCard icon="recurring" title="Recurring" subtitle="Subscriptions & installments" onClick={() => navigate('/william/spending/recurring')} />
          <NavCard icon="trends" title="Trends" subtitle="Spending over time" onClick={() => navigate('/william/spending/trends')} />
        </div>

        {/* ── Row 3: Recent + Budgets ── */}
        <div className="grid grid-cols-1 gap-[18px] md:gap-5 lg:grid-cols-[596fr_472fr] lg:items-start">
          {/* Recent */}
          <Card className="flex flex-col gap-1 p-5">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-[18px] font-semibold text-ink">Recent</h2>
              <button type="button" onClick={() => navigate('/william/spending/transactions')} className="text-[13px] font-medium text-secondary transition-colors hover:text-ink focus-visible:outline-none">
                See all
              </button>
            </div>
            {d.recent.length > 0 ? (
              d.recent.map((row, i) => <RecentItem key={row.id} row={row} currency={cur} divider={i > 0} />)
            ) : (
              <p className="py-6 text-center text-[14px] text-muted">No transactions this month.</p>
            )}
          </Card>

          {/* Budgets */}
          <Card className="flex flex-col gap-[18px] p-5">
            <h2 className="text-[18px] font-semibold text-ink">Budgets</h2>
            {d.budgetRows.length > 0 ? (
              d.budgetRows.map((row) => <BudgetItem key={row.id} row={row} currency={cur} />)
            ) : (
              <p className="text-[14px] text-muted">No budgets set for this month.</p>
            )}
          </Card>
        </div>
      </main>

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} initialType="expense" />
      {budgetsOpen && <SetBudgetsModal open onClose={() => setBudgetsOpen(false)} month={month} year={year} />}
    </div>
  );
}
