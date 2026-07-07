/**
 * William Dashboard — redesigned implementation, matched to Figma "Dashboard v2".
 * Scoped under .william. Route: /william/dashboard
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, ActionButton, RangeSelector, Icon, FloatingNav, TabBar, Button, Badge } from '../../components/william';
import { NetWorthChart } from './NetWorthChart';
import { useDashboardData, type RangeOption } from './useDashboardData';
import { AddTradeModal, AddTransactionModal } from '../WilliamPortfolio/modals';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cn } from '../../components/william/cn';

const RANGES: RangeOption[] = ['1W', '1M', '1Y', 'YTD', 'ALL'];
// Allocation bar: Stocks=accent, Cash=lime, Crypto=blue, Other=grey.
// Lime/blue are pale tints in light, BRIGHT in dark (matches Figma — do not change).
const BREAKDOWN_COLORS = ['var(--w-accent)', 'var(--w-alloc-lime)', 'var(--w-alloc-blue)', 'var(--w-accent-bg)'];

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

// Segmented FIRE progress bar — 4px steps, 1px gaps. The full track shows faint
// unfilled steps so the segmented structure reads even at low progress; the
// filled portion overlays accent steps.
function FireBar({ progress }: { progress: number }) {
  const pct = Math.max(Math.min(progress, 100), 0);
  const steps = (color: string) => `repeating-linear-gradient(to right, ${color} 0, ${color} 4px, transparent 4px, transparent 5px)`;
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-raised">
      <div className="absolute inset-y-[2px] left-[2px] right-[2px] opacity-40" style={{ backgroundImage: steps('var(--w-muted)') }} />
      <div className="absolute inset-y-[2px] left-[2px]" style={{ width: `calc(${pct}% - 4px)`, backgroundImage: steps('var(--w-accent)') }} />
    </div>
  );
}

// Mobile-only greeting header (Figma 26:5)
function MobileHeader({ name }: { name?: string }) {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="mb-1 flex items-center justify-between gap-3 md:hidden">
      <div className="inline-flex items-center gap-2 rounded-full bg-accent-bg px-4 py-2.5">
        <Icon name="star" size={16} className="text-ink" />
        <span className="ty-label text-ink">{greeting}{name ? `, ${name}` : ''}</span>
      </div>
      <button
        type="button"
        aria-label="Account"
        onClick={() => navigate('/settings')}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-bg text-ink transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <Icon name="account" size={20} />
      </button>
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
  const [modal, setModal] = useState<null | 'trade' | 'income' | 'expense'>(null);
  const d = useDashboardData(range);

  if (d.isEmpty) {
    return (
      <div className="william flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4">
        <Icon name="portfolio" size={48} className="text-muted" />
        <h1 className="ty-h1 text-ink">Welcome to William</h1>
        <p className="ty-body text-secondary text-center max-w-sm">
          Add your first trade or transaction to start tracking your net worth.
        </p>
        <Button size="l" variant="primary" onClick={() => navigate('/portfolio')}>Add your first trade</Button>
      </div>
    );
  }

  const deltaPositive = d.periodDelta ? d.periodDelta.abs >= 0 : true;
  const portfolioGain = d.holdings.reduce((s, h) => s + h.unrealizedGain, 0);

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />

      <main className="mx-auto flex max-w-[1100px] flex-col gap-[18px] px-4 md:gap-5 md:px-6">
        <h1 className="sr-only">Dashboard</h1>

        <MobileHeader name={d.userName} />

        {/* ── Top row: left column (net worth + breakdown) + chart ── */}
        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-[340px_1fr] md:gap-5 lg:grid-cols-[400px_1fr]">

          {/* Left column */}
          <div className="flex flex-col gap-[18px] md:gap-5">
            {/* Net Worth Card — white card (r24), grey inner balance panel (r18):
                matches the rebuilt Figma Card/NetWorth on the tonal (borderless) canvas */}
            <div className="flex flex-col gap-3.5 rounded-[24px] bg-surface p-2.5 pb-4 md:p-3 md:pb-[18px]">
              <div className="flex flex-col gap-1.5 rounded-[18px] bg-raised p-[18px] md:p-5">
                <p className="ty-label text-muted">CURRENT NET WORTH</p>
                <p className={cn('num font-bold leading-none tracking-[-0.02em] text-[36px] md:text-[44px]', d.netWorth < 0 ? 'text-negative' : 'text-ink')}>
                  {formatCurrency(d.netWorth, d.defaultCurrency)}
                </p>
                {d.periodDelta && (
                  <GreenDelta>
                    {deltaPositive ? '↑ +' : '↓ −'}{formatCurrency(Math.abs(d.periodDelta.abs), d.defaultCurrency)} this period
                  </GreenDelta>
                )}
              </div>
              {/* Actions on the grey zone */}
              <div className="flex justify-around">
                <ActionButton action="trade" onClick={() => setModal('trade')} />
                <ActionButton action="income" onClick={() => setModal('income')} />
                <ActionButton action="expense" onClick={() => setModal('expense')} />
              </div>
            </div>

            {/* Breakdown */}
            {d.breakdown.length > 0 && (
              <Card className="p-[18px] md:p-5">
                <p className="ty-label text-muted mb-3.5 md:mb-4">NET WORTH BREAKDOWN</p>
                <BreakdownBar items={d.breakdown} currency={d.defaultCurrency} />
              </Card>
            )}
          </div>

          {/* Chart column: mobile timeframe selector sits OUTSIDE the card */}
          <div className="flex flex-col gap-[18px]">
            <div className="md:hidden">
              <RangeSelector
                fullWidth
                options={RANGES}
                value={range}
                onChange={(v) => setRange(v as RangeOption)}
              />
            </div>

            <Card className="flex flex-1 flex-col gap-3.5 p-[18px] md:gap-[18px] md:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="ty-body font-semibold text-ink">
                      {d.chartData.length >= 2
                        ? `${formatDate(d.chartData[0].date, 'short')} — ${formatDate(d.chartData[d.chartData.length - 1].date, 'short')}`
                        : 'Net Worth'}
                    </p>
                    {d.periodDelta && (
                      <Badge tone={deltaPositive ? 'positive' : 'negative'}>
                        {deltaPositive ? '+' : ''}{d.periodDelta.pct.toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                  <p className="ty-body text-muted">vs last period</p>
                </div>
                {/* desktop/tablet selector stays in the card header */}
                <div className="hidden md:block">
                  <RangeSelector
                    options={RANGES}
                    value={range}
                    onChange={(v) => setRange(v as RangeOption)}
                  />
                </div>
              </div>

              <div
                className="min-h-[200px] flex-1"
                role="img"
                aria-label={d.periodDelta
                  ? `Net worth chart, ${deltaPositive ? 'up' : 'down'} ${d.periodDelta.pct.toFixed(1)}% this period`
                  : 'Net worth chart'}
              >
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
        </div>

        {/* ── Stats row: FIRE (wide) + Portfolio + This Month ── */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-[18px] md:grid-cols-3 md:gap-5 lg:grid-cols-[2.2fr_1fr_1fr]">

          {/* FIRE — full width on mobile, first column on desktop */}
          <Card
            role="button"
            tabIndex={0}
            aria-label="FIRE progress — open FIRE page"
            onClick={() => navigate('/william/fire')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/william/fire'); } }}
            className="group col-span-2 flex cursor-pointer flex-col gap-2 p-[18px] transition-colors hover:border-accent active:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink md:col-span-1 md:gap-2.5 md:p-5"
          >
            <div className="flex items-center justify-between">
              <p className="ty-label text-muted">FIRE PROGRESS</p>
              <span aria-hidden="true" className="text-accent transition-transform group-hover:translate-x-0.5">→</span>
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
          <Card className="flex flex-col gap-1.5 p-4 md:gap-2.5 md:p-5">
            <p className="ty-label text-muted">PORTFOLIO</p>
            <p className="num font-bold text-ink text-[22px] md:text-[32px]">{formatCurrency(d.portfolioValue, d.defaultCurrency)}</p>
            {d.holdings.length > 0 && (
              <GreenDelta>
                {portfolioGain >= 0 ? '↑ +' : '↓ −'}{formatCurrency(Math.abs(portfolioGain), d.defaultCurrency)} total
              </GreenDelta>
            )}
          </Card>

          {/* This Month */}
          <Card className="flex flex-col gap-1.5 p-4 md:gap-2.5 md:p-5">
            <p className="ty-label text-muted">THIS MONTH</p>
            <p className={cn('num font-bold text-[22px] md:text-[32px]', d.monthNet < 0 ? 'text-negative' : d.monthNet > 0 ? 'text-positive' : 'text-ink')}>
              {d.monthNet > 0 ? '+' : d.monthNet < 0 ? '−' : ''}{formatCurrency(Math.abs(d.monthNet), d.defaultCurrency)}
            </p>
            <p className="ty-body text-secondary">
              {d.monthTransactions.length} transaction{d.monthTransactions.length !== 1 ? 's' : ''}
            </p>
          </Card>
        </div>

        {/* ── Recent activity ── */}
        {d.recentActivity.length > 0 && (
          <div className="flex flex-col gap-2.5 md:gap-3">
            <h2 className="ty-h2 text-ink">Recent activity</h2>
            {d.recentActivity.map((tx) => {
              const isExpense = tx.type === 'expense';
              return (
                <div key={tx.id} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 md:px-[18px] md:py-4">
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
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => navigate('/william/spending')}
              className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-2 transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink md:px-[18px]"
            >
              <span className="ty-body text-ink">See all</span>
              <span className="text-muted" aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </main>

      <AddTradeModal open={modal === 'trade'} onClose={() => setModal(null)} />
      <AddTransactionModal open={modal === 'income'} onClose={() => setModal(null)} initialType="income" />
      <AddTransactionModal open={modal === 'expense'} onClose={() => setModal(null)} initialType="expense" />
    </div>
  );
}
