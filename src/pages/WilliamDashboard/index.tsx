/**
 * William Dashboard — redesigned implementation, matched to Figma "Dashboard v2".
 * Scoped under .william. Route: /william/dashboard
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, ActionButton, RangeSelector, Icon, FloatingNav, TabBar } from '../../components/william';
import { NetWorthChart } from './NetWorthChart';
import { useDashboardData, type RangeOption } from './useDashboardData';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cn } from '../../components/william/cn';

const RANGES: RangeOption[] = ['1W', '1M', '1Y', 'YTD', 'ALL'];
const BREAKDOWN_COLORS = ['var(--w-accent)', 'var(--w-positive-bg)', 'var(--w-info-bg)', 'var(--w-accent-bg)'];

// ── Sub-components ────────────────────────────────────────────────────────────

function BreakdownBar({ items, currency }: { items: { label: string; value: number }[]; currency: string }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3.5 w-full gap-1 overflow-hidden">
        {items.map((item, i) => (
          <div
            key={item.label}
            className="rounded-[3px]"
            style={{ width: `${(item.value / total) * 100}%`, background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }} />
              <span className="ty-body text-secondary">{item.label}</span>
            </div>
            <span className="num ty-body font-semibold text-ink">{formatCurrency(item.value, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Segmented FIRE progress bar — fixed 4×8px accent segments, 1px gaps (Figma 216:2846)
function FireBar({ progress }: { progress: number }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-raised">
      <div
        className="absolute inset-y-[2px] left-[2px]"
        style={{
          width: `calc(${Math.max(Math.min(progress, 100), 0)}% - 4px)`,
          backgroundImage:
            'repeating-linear-gradient(to right, var(--w-accent) 0, var(--w-accent) 4px, transparent 4px, transparent 5px)',
        }}
      />
    </div>
  );
}

// Mobile-only greeting header (Figma 26:5)
function MobileHeader({ name }: { name?: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="mb-1 flex items-center gap-3 md:hidden">
      <div className="flex flex-1 items-center gap-2 rounded-full bg-accent-bg px-4 py-2.5">
        <Icon name="star" size={16} className="text-ink" />
        <span className="ty-label text-ink">{greeting}{name ? `, ${name}` : ''}</span>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-bg text-ink">
        <Icon name="account" size={20} />
      </div>
    </div>
  );
}

function GreenDelta({ children }: { children: React.ReactNode }) {
  return <p className="num ty-body font-medium text-positive">{children}</p>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WilliamDashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeOption>('1M');
  const d = useDashboardData(range);

  if (d.isEmpty) {
    return (
      <div className="william flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4">
        <Icon name="portfolio" size={48} className="text-muted" />
        <h1 className="ty-h1 text-ink">Welcome to William</h1>
        <p className="ty-body text-secondary text-center max-w-sm">
          Add your first trade or transaction to start tracking your net worth.
        </p>
      </div>
    );
  }

  const deltaPositive = d.periodDelta ? d.periodDelta.abs >= 0 : true;
  const portfolioGain = d.holdings.reduce((s, h) => s + h.unrealizedGain, 0);

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />

      <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 md:px-6">

        <MobileHeader name={d.userName} />

        {/* ── Top row: left column (net worth + breakdown) + chart ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[400px_1fr]">

          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Net Worth Card — grey wrapper, white inner */}
            <div className="rounded-card bg-raised p-3">
              <Card className="p-6">
                <p className="ty-label text-muted">CURRENT NET WORTH</p>
                <p className={cn('num mt-2 font-black leading-none tracking-[-0.02em] text-[34px] md:text-[52px]', d.netWorth < 0 ? 'text-negative' : 'text-ink')}>
                  {formatCurrency(d.netWorth, d.defaultCurrency)}
                </p>
                {d.periodDelta && (
                  <p className="mt-3">
                    <GreenDelta>
                      {deltaPositive ? '↑ +' : '↓ −'}{formatCurrency(Math.abs(d.periodDelta.abs), d.defaultCurrency)} this period
                    </GreenDelta>
                  </p>
                )}
              </Card>
              {/* Actions on the grey zone */}
              <div className="flex justify-around px-2 py-4">
                <ActionButton action="trade" onClick={() => navigate('/portfolio')} />
                <ActionButton action="income" onClick={() => navigate('/spending')} />
                <ActionButton action="expense" onClick={() => navigate('/spending')} />
              </div>
            </div>

            {/* Breakdown */}
            {d.breakdown.length > 0 && (
              <Card className="p-6">
                <p className="ty-label text-muted mb-4">NET WORTH BREAKDOWN</p>
                <BreakdownBar items={d.breakdown} currency={d.defaultCurrency} />
              </Card>
            )}
          </div>

          {/* Chart card */}
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="ty-body font-semibold text-ink">
                    {d.chartData.length >= 2
                      ? `${formatDate(d.chartData[0].date, 'short')} — ${formatDate(d.chartData[d.chartData.length - 1].date, 'short')}`
                      : 'Net Worth'}
                  </p>
                  {d.periodDelta && (
                    <span className={cn('num rounded-full px-2 py-[2px] text-[12px] font-semibold leading-none',
                      deltaPositive ? 'bg-positive-bg text-positive' : 'bg-negative-bg text-negative')}>
                      {deltaPositive ? '+' : ''}{d.periodDelta.pct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <p className="ty-body text-muted">vs last period</p>
              </div>
              <RangeSelector options={RANGES} value={range} onChange={(v) => setRange(v as RangeOption)} />
            </div>

            <div className="h-[220px] md:h-[240px]">
              <NetWorthChart
                data={d.chartData}
                comparison={d.comparisonData}
                currency={d.defaultCurrency}
                empty={d.chartData.length < 2}
              />
            </div>

            {/* Insight callout */}
            {d.periodDelta && d.chartData.length >= 2 && (
              <div className="flex items-center gap-2 rounded-xl bg-raised px-4 py-3">
                <span className="text-positive">↑</span>
                <span className="ty-body text-secondary">
                  Your net worth {deltaPositive ? 'grew' : 'fell'}{' '}
                  {formatCurrency(Math.abs(d.periodDelta.abs), d.defaultCurrency)} over this period.
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* ── Stats row: FIRE (wide) + Portfolio + This Month ── */}
        <div className="grid grid-cols-2 gap-5 md:grid-cols-[2.2fr_1fr_1fr]">

          {/* FIRE — full width on mobile, first column on desktop */}
          <Card className="col-span-2 flex flex-col gap-3 p-6 md:col-span-1">
            <div className="flex items-center justify-between">
              <p className="ty-label text-muted">FIRE PROGRESS</p>
              <button onClick={() => navigate('/fire')} className="text-muted hover:text-ink transition-colors" aria-label="FIRE">→</button>
            </div>
            {d.fireProgress !== null ? (
              <>
                <p className="ty-h1 num text-ink">{Math.round(d.fireProgress)}%</p>
                <FireBar progress={d.fireProgress} />
                <p className="ty-body text-secondary">
                  {d.fireYear ? `On track for ${d.fireYear}` : `${formatCurrency(d.netWorth, d.defaultCurrency)} of ${formatCurrency(d.effectiveFireTarget!, d.defaultCurrency)}`}
                </p>
              </>
            ) : (
              <p className="ty-body text-muted">Set your FIRE goal in settings.</p>
            )}
          </Card>

          {/* Portfolio */}
          <Card className="flex flex-col gap-2 p-6">
            <p className="ty-label text-muted">PORTFOLIO</p>
            <p className="ty-h1 num text-ink">{formatCurrency(d.portfolioValue, d.defaultCurrency)}</p>
            {d.holdings.length > 0 && (
              <GreenDelta>
                {portfolioGain >= 0 ? '↑ +' : '↓ −'}{formatCurrency(Math.abs(portfolioGain), d.defaultCurrency)} total
              </GreenDelta>
            )}
          </Card>

          {/* This Month */}
          <Card className="flex flex-col gap-2 p-6">
            <p className="ty-label text-muted">THIS MONTH</p>
            <p className={cn('ty-h1 num', d.monthNet >= 0 ? 'text-ink' : 'text-negative')}>
              {d.monthNet >= 0 ? '' : '−'}{formatCurrency(Math.abs(d.monthNet), d.defaultCurrency)}
            </p>
            <p className="ty-body text-secondary">
              {d.monthTransactions.length} transaction{d.monthTransactions.length !== 1 ? 's' : ''}
            </p>
          </Card>
        </div>

        {/* ── Recent activity ── */}
        {d.recentActivity.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="ty-h2 text-ink">Recent activity</h2>
            {d.recentActivity.map((tx) => {
              const isExpense = tx.type === 'expense';
              return (
                <Card key={tx.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <p className={cn('ty-label', isExpense ? 'text-negative' : 'text-positive')}>
                      {isExpense ? 'EXPENSE LOGGED' : 'INCOME ADDED'}
                    </p>
                    <p className="ty-body font-semibold text-ink">{tx.notes || tx.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="ty-label text-muted">{formatDate(tx.date, 'short').toUpperCase()}</p>
                    <p className={cn('num ty-body font-semibold', isExpense ? 'text-negative' : 'text-positive')}>
                      {isExpense ? '−' : '+'}{formatCurrency(tx.convertedAmount, d.defaultCurrency)}
                    </p>
                  </div>
                </Card>
              );
            })}
            <Card
              role="button"
              onClick={() => navigate('/spending')}
              className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-raised transition-colors"
            >
              <span className="ty-body text-ink">See all</span>
              <span className="text-muted">→</span>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
