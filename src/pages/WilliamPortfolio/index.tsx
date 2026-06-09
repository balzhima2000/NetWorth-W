/**
 * William Portfolio — redesigned implementation, matched to Figma "Portfolio v2".
 * Scoped under .william. Route: /william/portfolio
 *
 * Add trade + Set targets open the redesigned modals (./modals). Refresh / Import
 * still bridge to the existing /portfolio flow.
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Icon, FloatingNav, TabBar } from '../../components/william';
import { usePortfolioData, type SortKey } from './usePortfolioData';
import { AddTradeModal, SetTargetsModal } from './modals';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../components/william/cn';
import type { CurrentHolding } from '../../types/index';

const signedCur = (v: number, c: string) => `${v >= 0 ? '+' : '−'}${formatCurrency(Math.abs(v), c)}`;
const signedPct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;
const dir = (v: number) => (v >= 0 ? 'text-positive' : 'text-negative');
const marketLabel = (m: CurrentHolding['market']) => (m === 'tase' ? 'TASE' : 'Global');

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="num text-[12px] font-medium uppercase tracking-[0.05em] text-secondary">{children}</span>;
}

function MarketChip({ market }: { market: CurrentHolding['market'] }) {
  return (
    <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-secondary">
      {marketLabel(market)}
    </span>
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
function SummaryCard({ d }: { d: ReturnType<typeof usePortfolioData> }) {
  return (
    <Card className="flex flex-col gap-2.5 p-5">
      <Eyebrow>Portfolio value</Eyebrow>
      <p className="text-[36px] font-black leading-none tracking-[-0.02em] text-ink md:text-[44px]">
        {formatCurrency(d.totalValue, d.defaultCurrency)}
      </p>
      <p className={cn('num text-[15px] font-medium', dir(d.totalGain))}>
        {d.totalGain >= 0 ? '↑' : '↓'} {signedCur(d.totalGain, d.defaultCurrency)} · {signedPct(d.totalGainPct)} all time
      </p>
      <div className="my-1 h-px w-full bg-line" />
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-secondary">Invested</span>
        <span className="num text-[15px] font-medium text-ink">{formatCurrency(d.totalInvested, d.defaultCurrency)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-secondary">Holdings</span>
        <span className="num text-[15px] font-medium text-ink">{d.positionsCount} positions</span>
      </div>
    </Card>
  );
}

// ── Allocation ──────────────────────────────────────────────────────────────────
function AllocationCard({ d, onSetTargets }: { d: ReturnType<typeof usePortfolioData>; onSetTargets: () => void }) {
  return (
    <Card className="flex flex-col gap-3.5 p-5">
      <div className="flex items-center justify-between">
        <Eyebrow>Allocation</Eyebrow>
        <button
          type="button"
          onClick={onSetTargets}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <Icon name="target" size={14} /> Set targets
        </button>
      </div>
      <div className="flex h-3.5 w-full gap-[3px]">
        {d.allocation.map((a) => (
          <div key={a.label} className="rounded-[4px]" style={{ width: `${a.percent}%`, background: a.color }} />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {d.allocation.map((a) => (
          <div key={a.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
              <span className="text-[14px] font-medium text-ink">{a.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="num text-[14px] font-medium text-ink">{a.percent.toFixed(0)}%</span>
              <span className="num text-[14px] font-medium text-secondary">{formatCurrency(a.value, d.defaultCurrency, true)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Holdings: desktop sortable table ────────────────────────────────────────────
const GRID = 'grid grid-cols-[1fr_110px_90px_130px_120px_92px] items-center gap-3';
const SORT_COLS: { key: SortKey; label: string; col: string }[] = [
  { key: 'value', label: 'Market value', col: 'value' },
  { key: 'gain', label: 'Gain', col: 'gain' },
  { key: 'return', label: 'Return', col: 'return' },
];

function ColHeader({ label, sortKey, active, onSort }: { label: string; sortKey?: SortKey; active: boolean; onSort?: () => void }) {
  const cls = 'num text-[11px] font-medium uppercase tracking-[0.03em] text-right';
  if (!sortKey) return <span className={cn(cls, 'text-muted')}>{label}</span>;
  return (
    <button type="button" onClick={onSort} className={cn(cls, 'inline-flex items-center justify-end gap-1 hover:text-ink focus-visible:outline-none', active ? 'text-ink' : 'text-muted')}>
      {label}{active && <span className="num">↓</span>}
    </button>
  );
}

function HoldingsTable({ d, sortBy, setSortBy }: { d: ReturnType<typeof usePortfolioData>; sortBy: SortKey; setSortBy: (k: SortKey) => void }) {
  return (
    <Card className="hidden flex-col px-5 pb-2 pt-5 md:flex">
      <h2 className="mb-3.5 text-[18px] font-semibold tracking-[-0.01em] text-ink">Holdings</h2>
      <div className={cn(GRID, 'pb-1')}>
        <span className="num text-[11px] font-medium uppercase tracking-[0.03em] text-muted">Asset</span>
        <span className="num text-[11px] font-medium uppercase tracking-[0.03em] text-right text-muted">Price</span>
        <span className="num text-[11px] font-medium uppercase tracking-[0.03em] text-right text-muted">Shares</span>
        {SORT_COLS.map((c) => (
          <ColHeader key={c.key} label={c.label} sortKey={c.key} active={sortBy === c.key} onSort={() => setSortBy(c.key)} />
        ))}
      </div>
      {d.holdings.map((h, i) => (
        <div key={h.ticker} className={cn(GRID, 'py-3.5', i < d.holdings.length - 1 && 'border-b border-line')}>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{h.ticker}</span>
              <MarketChip market={h.market} />
            </div>
            <span className="text-[13px] font-medium text-secondary">{h.name}</span>
          </div>
          <span className="num text-right text-[14px] font-medium text-ink">{formatCurrency(h.currentPrice, h.currency)}</span>
          <span className="num text-right text-[14px] font-medium text-secondary">{h.sharesHeld.toLocaleString()}</span>
          <span className="num text-right text-[15px] font-medium text-ink">{formatCurrency(h.currentValue, d.defaultCurrency)}</span>
          <span className={cn('num text-right text-[14px] font-medium', dir(h.unrealizedGain))}>{signedCur(h.unrealizedGain, d.defaultCurrency)}</span>
          <span className={cn('num text-right text-[14px] font-medium', dir(h.unrealizedGainPercent))}>{signedPct(h.unrealizedGainPercent)}</span>
        </div>
      ))}
    </Card>
  );
}

// ── Holdings: mobile list + sort dropdown ────────────────────────────────────────
function SortDropdown({ sortBy, setSortBy }: { sortBy: SortKey; setSortBy: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const current = SORT_COLS.find((c) => c.key === sortBy)!;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="num inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-[13px] font-medium uppercase tracking-[0.03em] text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {current.key === 'value' ? 'VALUE' : current.label.toUpperCase()} <span className="text-[12px]">{open ? '↑' : '↓'}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-[180px] rounded-xl border border-line bg-surface p-1.5">
          {SORT_COLS.map((c) => {
            const active = c.key === sortBy;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => { setSortBy(c.key); setOpen(false); }}
                className={cn(
                  'num flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] font-medium uppercase tracking-[0.03em]',
                  active ? 'bg-accent-bg text-accent' : 'text-ink hover:bg-raised',
                )}
              >
                {c.key === 'value' ? 'VALUE' : c.label.toUpperCase()}{active && <span className="num">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HoldingsList({ d, sortBy, setSortBy }: { d: ReturnType<typeof usePortfolioData>; sortBy: SortKey; setSortBy: (k: SortKey) => void }) {
  return (
    <Card className="flex flex-col px-[18px] pb-1.5 pt-[18px] md:hidden">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-ink">Holdings</h2>
        <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
      </div>
      {d.holdings.map((h, i) => (
        <div key={h.ticker} className={cn('flex items-center justify-between py-3.5', i < d.holdings.length - 1 && 'border-b border-line')}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{h.ticker}</span>
              <MarketChip market={h.market} />
            </div>
            <span className="num text-[12px] font-medium text-secondary">
              {h.sharesHeld.toLocaleString()} × {formatCurrency(h.currentPrice, h.currency)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="num text-[16px] font-medium text-ink">{formatCurrency(h.currentValue, d.defaultCurrency)}</span>
            <span className={cn('num text-[12px] font-medium', dir(h.unrealizedGainPercent))}>{signedPct(h.unrealizedGainPercent)}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WilliamPortfolio() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortKey>('value');
  const [modal, setModal] = useState<null | 'trade' | 'targets'>(null);
  const d = usePortfolioData(sortBy);
  const goPortfolio = () => navigate('/portfolio'); // Refresh/Import bridge to working flow
  const addTrade = () => setModal('trade');
  const setTargets = () => setModal('targets');

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />
      <main className="mx-auto flex max-w-[1100px] flex-col gap-[18px] px-4 md:gap-5 md:px-6">

        {/* Mobile header */}
        <div className="flex items-start justify-between md:hidden">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Portfolio</h1>
            <p className="text-[13px] font-medium text-secondary">{d.subtitle}</p>
          </div>
          <button
            type="button" aria-label="Account" onClick={() => navigate('/settings')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-bg text-ink transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <Icon name="account" size={20} />
          </button>
        </div>

        {/* Desktop header */}
        <div className="hidden items-end justify-between md:flex">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">Portfolio</h1>
            <p className="text-[14px] font-medium text-secondary">{d.subtitle}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button pill variant="secondary" onClick={goPortfolio}><Icon name="refresh" size={16} /> Refresh</Button>
            <Button pill variant="secondary" onClick={goPortfolio}><Icon name="import" size={16} /> Import</Button>
            <Button pill variant="primary" onClick={addTrade}><Icon name="plus" size={16} /> Add trade</Button>
          </div>
        </div>

        {/* Mobile actions — [Add trade] [Refresh] [Import], icon+text pills (Figma 488:6940) */}
        <div className="flex items-center gap-2 md:hidden">
          <Button pill variant="primary" onClick={addTrade} className="!gap-1.5 !px-3.5 !text-[14px]"><Icon name="plus" size={16} /> Add trade</Button>
          <Button pill variant="secondary" onClick={goPortfolio} className="!gap-1.5 !px-3.5 !text-[14px]"><Icon name="refresh" size={16} /> Refresh</Button>
          <Button pill variant="secondary" onClick={goPortfolio} className="!gap-1.5 !px-3.5 !text-[14px]"><Icon name="import" size={16} /> Import</Button>
        </div>

        {d.isEmpty ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Icon name="portfolio" size={40} className="text-muted" />
            <h2 className="text-[20px] font-semibold text-ink">No holdings yet</h2>
            <p className="max-w-sm text-[14px] text-secondary">Add your first stock trade to start tracking your portfolio.</p>
            <Button pill variant="primary" onClick={addTrade} className="mt-1"><Icon name="plus" size={16} /> Add trade</Button>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-[18px] md:grid md:grid-cols-[400px_1fr] md:gap-5">
              <SummaryCard d={d} />
              <AllocationCard d={d} onSetTargets={setTargets} />
            </div>
            <HoldingsTable d={d} sortBy={sortBy} setSortBy={setSortBy} />
            <HoldingsList d={d} sortBy={sortBy} setSortBy={setSortBy} />
          </>
        )}
      </main>

      <AddTradeModal open={modal === 'trade'} onClose={() => setModal(null)} />
      <SetTargetsModal open={modal === 'targets'} onClose={() => setModal(null)} holdings={d.holdings} totalValue={d.totalValue} />
    </div>
  );
}
