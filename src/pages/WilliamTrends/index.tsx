/**
 * William Trends — spending over time.
 * Scoped under .william. Route: /william/spending/trends
 * Built 1:1 from Figma (Trends / Desktop 1147:5437 · Mobile 1253:7012).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, RangeSelector, FloatingNav, TabBar, BackLink } from '../../components/william';
import { cn } from '../../components/william/cn';
import { getCurrencySymbol } from '../../utils/formatters';
import { TrendsChart } from '../WilliamSpending/TrendsChart';
import { useTrendsData, TREND_RANGES, type TrendRange, type CategoryTrend } from '../WilliamSpending/useTrendsData';

const money0 = (n: number, cur: string) => `${getCurrencySymbol(cur)}${Math.round(n).toLocaleString('en-US')}`;
const RANGE_LABEL: Record<TrendRange, string> = { '3M': 'Last 3 months', '6M': 'Last 6 months', '1Y': 'Last 12 months', 'YTD': 'Year to date', 'ALL': 'All time' };

function Stat({ label, value, suffix, valueClass }: { label: string; value: string; suffix?: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="num-mono text-[12px] uppercase tracking-[0.6px] text-secondary">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-[26px] font-bold leading-none', valueClass ?? 'text-ink')}>{value}</span>
        {suffix && <span className="text-[14px] text-secondary">{suffix}</span>}
      </div>
    </div>
  );
}

// Spending deltas: up = orange (more spend), down = lime (less), flat = muted.
function CategoryDelta({ pct }: { pct: number | null }) {
  if (pct === null || Math.abs(pct) < 0.5) {
    return <span className="num-mono w-[64px] shrink-0 text-right text-[14px] text-muted">— 0%</span>;
  }
  const up = pct > 0;
  return (
    <span className={cn('num-mono w-[64px] shrink-0 text-right text-[14px]', up ? 'text-negative' : 'text-positive')}>
      {up ? '↑' : '↓'} {Math.abs(Math.round(pct))}%
    </span>
  );
}

function CategoryRow({ row, currency, divider }: { row: CategoryTrend; currency: string; divider: boolean }) {
  return (
    <>
      {divider && <div className="h-px w-full bg-line" />}
      <div className="flex h-12 items-center gap-3.5">
        <span className="h-7 w-[3px] shrink-0 rounded-lg" style={{ background: row.color }} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{row.name}</span>
        <span className="num-mono shrink-0 text-right text-[15px]">
          <span className="text-ink">{money0(row.perMonth, currency)}</span>
          <span className="text-muted"> / mo</span>
        </span>
        <CategoryDelta pct={row.deltaPct} />
      </div>
    </>
  );
}

export default function WilliamTrends() {
  const navigate = useNavigate();
  const [range, setRange] = useState<TrendRange>('6M');
  const d = useTrendsData(range);
  const cur = d.defaultCurrency;
  const vsUp = d.vsPriorPct !== null && d.vsPriorPct > 0;

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />

      <main className="mx-auto flex max-w-[1100px] flex-col gap-[18px] px-4 md:gap-5 md:px-6">
        {/* ── Header ── */}
        <div>
          <BackLink label="Spending" onClick={() => navigate('/william/spending')} className="mb-2" />
          <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink md:text-[32px]">Trends</h1>
          <p className="mt-1 text-[15px] text-secondary md:hidden">Your spending over time</p>
        </div>

        {/* ── Row 1: chart + stats ── */}
        <div className="grid grid-cols-1 gap-[18px] md:gap-5 lg:grid-cols-[740fr_328fr] lg:items-stretch">
          {/* Chart */}
          <Card className="flex flex-col justify-between gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold leading-[1.3] text-ink">{RANGE_LABEL[range]}</h2>
              <RangeSelector options={TREND_RANGES as unknown as string[]} value={range} onChange={(v) => setRange(v as TrendRange)} />
            </div>
            <div className="min-h-[240px] flex-1" role="img" aria-label={`Monthly spending, ${RANGE_LABEL[range].toLowerCase()}`}>
              <TrendsChart data={d.series} currency={cur} />
            </div>
            {d.insight && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-raised px-4 py-3">
                <span className={cn('text-[15px] leading-none', d.insightUp ? 'text-negative' : 'text-positive')} aria-hidden="true">
                  {d.insightUp ? '↑' : '↓'}
                </span>
                <span className="text-[14px] font-medium text-secondary">{d.insight}</span>
              </div>
            )}
          </Card>

          {/* Stats */}
          <Card className="flex flex-col p-5">
            <div className="pb-[18px]"><Stat label="Avg / month" value={money0(d.avg, cur)} /></div>
            <div className="h-px w-full bg-line" />
            <div className="py-[18px]"><Stat label="Highest month" value={money0(d.highest.total, cur)} suffix={d.highest.label} /></div>
            <div className="h-px w-full bg-line" />
            <div className="py-[18px]"><Stat label="Lowest month" value={money0(d.lowest.total, cur)} suffix={d.lowest.label} /></div>
            <div className="h-px w-full bg-line" />
            <div className="pt-[18px]">
              <Stat
                label={d.vsPriorLabel}
                value={d.vsPriorPct === null ? '—' : `${vsUp ? '↑' : '↓'} ${Math.abs(Math.round(d.vsPriorPct))}%`}
                suffix={d.vsPriorPct === null ? undefined : 'vs prior'}
                valueClass={d.vsPriorPct === null ? 'text-muted' : vsUp ? 'text-negative' : 'text-positive'}
              />
            </div>
          </Card>
        </div>

        {/* ── Row 2: by category ── */}
        <Card className="flex flex-col gap-1 p-5">
          <div className="pb-2">
            <h2 className="text-[18px] font-semibold text-ink">By category</h2>
            <p className="text-[13px] text-secondary">Average per month · vs prior {d.n} months</p>
          </div>
          {d.categories.length > 0 ? (
            d.categories.map((row, i) => <CategoryRow key={row.id} row={row} currency={cur} divider={i > 0} />)
          ) : (
            <p className="py-6 text-center text-[14px] text-muted">No spending in this period.</p>
          )}
        </Card>
      </main>
    </div>
  );
}
