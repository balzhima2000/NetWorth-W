/**
 * William Portfolio — redesigned implementation, matched to Figma "Portfolio v2".
 * Scoped under .william. Route: /william/portfolio
 *
 * Add trade + Set targets open the redesigned modals (./modals). Refresh / Import
 * still bridge to the existing /portfolio flow.
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRefreshPrices } from '../../hooks/useRefreshPrices';
import { Card, Button, CardDropdown, Icon, FloatingNav, TabBar, InfoTip } from '../../components/william';
import { usePortfolioData, type SortKey, type SortDir } from './usePortfolioData';
import { AddTradeModal, SetTargetsModal } from './modals';
import { ImportExcelModal } from './ImportExcelModal';
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
    <span className="rounded-full bg-sunken px-2 py-0 text-[11px] font-medium text-secondary">
      {marketLabel(market)}
    </span>
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
function SummaryCard({ d }: { d: ReturnType<typeof usePortfolioData> }) {
  return (
    <Card className="num-fit flex flex-col gap-2 p-4">
      <Eyebrow>Portfolio value</Eyebrow>
      <p className="num num-hero font-bold text-ink">
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
  const { hasTargets } = d;
  // Cumulative target-% boundaries for the tick markers (drift state).
  const ticks: number[] = [];
  if (hasTargets) {
    let c = 0;
    for (let i = 0; i < d.allocation.length - 1; i++) { c += d.allocation[i].target ?? 0; ticks.push(c); }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Eyebrow>Allocation</Eyebrow>
          <InfoTip title="Allocation & drift">
            Your mix across Stocks, Cash, Crypto and Other. Set targets to track drift — the tick
            marks your goal weight, and each chip shows how far a holding sits from it.
          </InfoTip>
        </div>
        <Button size="s" variant="tonal" onClick={onSetTargets}>
          {hasTargets ? 'Edit targets' : 'Set targets'}
        </Button>
      </div>
      {hasTargets ? (
        <div className="relative">
          <div className="flex h-3.5 w-full overflow-hidden rounded-full">
            {d.allocation.map((a) => <div key={a.label} style={{ width: `${a.percent}%`, background: a.color }} />)}
          </div>
          {ticks.map((t, i) => (
            <div key={i} className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-muted" style={{ left: `calc(${t}% - 1px)` }} />
          ))}
        </div>
      ) : (
        <div className="flex h-3.5 w-full gap-1">
          {d.allocation.map((a) => <div key={a.label} className="rounded-[4px]" style={{ width: `${a.percent}%`, background: a.color }} />)}
        </div>
      )}
      {hasTargets && (
        <span className="-mt-1 flex items-center gap-2 text-[11px] font-medium text-muted">
          <span className="h-2.5 w-0.5 rounded-full bg-muted" /> marks your target weight
        </span>
      )}
      <div className="flex flex-col gap-2">
        {d.allocation.map((a) => (
          <div key={a.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
              <span className="text-[14px] font-medium text-ink">{a.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="num text-[14px] font-medium text-ink">{a.percent.toFixed(0)}%</span>
              {hasTargets && a.drift != null ? (
                <span className="num rounded-full bg-sunken px-2 py-0 text-[11px] font-medium text-secondary">
                  {a.drift >= 0 ? '+' : '−'}{Math.abs(a.drift).toFixed(0)}%<span className="hidden md:inline"> vs target</span>
                </span>
              ) : (
                <span className="num text-[14px] font-medium text-secondary">{formatCurrency(a.value, d.defaultCurrency, true)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Holdings: desktop sortable table ────────────────────────────────────────────
// Fluid columns: asset takes the slack (minmax(0,…) so it can shrink below its
// content — the name wraps instead of forcing the grid wider); numeric columns
// have a comfortable max but can shrink to a floor, so the grid always fits its
// card and the figures stay column-aligned at every width (no overflow).
const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(76px,100px)_minmax(48px,76px)_minmax(88px,120px)_minmax(84px,112px)_minmax(56px,84px)] items-center gap-3';
const SORT_COLS: { key: SortKey; label: string; col: string }[] = [
  { key: 'value', label: 'Market value', col: 'value' },
  { key: 'gain', label: 'Gain', col: 'gain' },
  { key: 'return', label: 'Return', col: 'return' },
];

function ColHeader({ label, sortKey, active, dir, onSort }: { label: string; sortKey?: SortKey; active: boolean; dir: SortDir; onSort?: () => void }) {
  const cls = 'num text-[11px] uppercase tracking-[0.03em] text-right';
  if (!sortKey) return <span className={cn(cls, 'font-medium text-muted')}>{label}</span>;
  // Sortable: always show an arrow so the column reads as sortable. Inactive = faint
  // (default-desc hint) + brightens on hover; active = bold ink + the live direction arrow.
  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        cls, 'group inline-flex cursor-pointer items-center justify-end gap-1 transition-colors focus-visible:outline-none',
        active ? 'font-semibold text-ink' : 'font-medium text-muted hover:text-ink',
      )}
    >
      {label}
      <span className={cn('num', !active && 'opacity-40 transition-opacity group-hover:opacity-100')}>{active ? (dir === 'desc' ? '↓' : '↑') : '↓'}</span>
    </button>
  );
}

function HoldingsTable({ d, sortBy, sortDir, onSort }: { d: ReturnType<typeof usePortfolioData>; sortBy: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  return (
    <Card className="hidden flex-col px-4 pb-2 pt-4 md:flex">
      <div className="mb-3.5 flex items-center gap-1">
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">Holdings</h2>
        <InfoTip title="Gain vs return">
          Gain is shown in your base currency and includes exchange-rate movement since you bought.
          Return % is measured in each holding's own currency, so currency swings don't affect it.
        </InfoTip>
      </div>
      <div className={cn(GRID, 'pb-1')}>
        <span className="num text-[11px] font-medium uppercase tracking-[0.03em] text-muted">Asset</span>
        <span className="num text-[11px] font-medium uppercase tracking-[0.03em] text-right text-muted">Price</span>
        <span className="num text-[11px] font-medium uppercase tracking-[0.03em] text-right text-muted">Shares</span>
        {SORT_COLS.map((c) => (
          <ColHeader key={c.key} label={c.label} sortKey={c.key} active={sortBy === c.key} dir={sortDir} onSort={() => onSort(c.key)} />
        ))}
      </div>
      {d.holdings.map((h, i) => (
        <div key={h.ticker} className={cn(GRID, 'py-3', i < d.holdings.length - 1 && 'border-b border-line')}>
          <div className="flex min-w-0 flex-col gap-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{h.ticker}</span>
              <MarketChip market={h.market} />
            </div>
            <span className="truncate text-[13px] font-medium text-secondary">{h.name}</span>
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
const sortArrow = (dir: SortDir) => (dir === 'desc' ? '↓' : '↑');
const colLabel = (c: { key: SortKey; label: string }) => (c.key === 'value' ? 'VALUE' : c.label.toUpperCase());

function SortDropdown({ sortBy, sortDir, onSelectField, onToggleDir }: { sortBy: SortKey; sortDir: SortDir; onSelectField: (k: SortKey) => void; onToggleDir: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const current = SORT_COLS.find((c) => c.key === sortBy)!;
  const menuItem = 'num flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] font-medium uppercase tracking-[0.6px]';
  return (
    <div ref={ref} className="relative">
      {/* In-card dropdown; the "Sort:" prefix says what the pill does, so the
          arrow reads as the direction (↓ desc / ↑ asc) rather than "opens menu". */}
      <CardDropdown
        prefix="Sort:"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Sort by ${colLabel(current)}, ${sortDir === 'desc' ? 'descending' : 'ascending'}`}
        arrow={sortArrow(sortDir)}
      >
        {colLabel(current)}
      </CardDropdown>
      {open && (
        <div className="absolute right-0 z-10 mt-2 flex w-[200px] flex-col gap-0 rounded-xl bg-surface p-1 shadow-[var(--w-shadow-2)]">
          {SORT_COLS.map((c) => {
            const active = c.key === sortBy;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => { onSelectField(c.key); setOpen(false); }}
                className={cn(menuItem, active ? 'bg-accent-bg text-accent' : 'text-ink hover:bg-raised')}
              >
                {colLabel(c)}{active && <span className="font-sans text-[13px] tracking-normal">✓</span>}
              </button>
            );
          })}
          <div className="my-1 h-px bg-line" />
          {/* Explicit direction toggle (stays open so the change is visible). */}
          <button type="button" onClick={onToggleDir} className={cn(menuItem, 'text-ink hover:bg-raised')}>
            {sortDir === 'desc' ? 'DESCENDING' : 'ASCENDING'} <span className="num text-[13px]">{sortArrow(sortDir)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function HoldingsList({ d, sortBy, sortDir, onSelectField, onToggleDir }: { d: ReturnType<typeof usePortfolioData>; sortBy: SortKey; sortDir: SortDir; onSelectField: (k: SortKey) => void; onToggleDir: () => void }) {
  return (
    <Card className="flex flex-col px-4 pb-1 pt-4 md:hidden">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <h2 className="text-[18px] font-semibold text-ink">Holdings</h2>
          <InfoTip title="Gain vs return">
            Gain is shown in your base currency and includes exchange-rate movement since you bought.
            Return % is measured in each holding's own currency, so currency swings don't affect it.
          </InfoTip>
        </div>
        <SortDropdown sortBy={sortBy} sortDir={sortDir} onSelectField={onSelectField} onToggleDir={onToggleDir} />
      </div>
      {d.holdings.map((h, i) => (
        <div key={h.ticker} className={cn('flex items-center justify-between py-3', i < d.holdings.length - 1 && 'border-b border-line')}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{h.ticker}</span>
              <MarketChip market={h.market} />
            </div>
            <span className="num text-[12px] font-medium text-secondary">
              {h.sharesHeld.toLocaleString()} × {formatCurrency(h.currentPrice, h.currency)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0">
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
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [modal, setModal] = useState<null | 'trade' | 'targets' | 'import'>(null);
  const d = usePortfolioData(sortBy, sortDir);
  const toggleDir = () => setSortDir((dir) => (dir === 'desc' ? 'asc' : 'desc'));
  // Desktop column header: click active column flips direction; click another resets to desc.
  const onSortCol = (k: SortKey) => {
    if (k === sortBy) toggleDir();
    else { setSortBy(k); setSortDir('desc'); }
  };
  const { refresh, refreshing, canRefresh } = useRefreshPrices();
  // Import bridges to the classic flow and auto-opens the Excel import modal there.
  const goImport = () => setModal('import');
  const addTrade = () => setModal('trade');
  const setTargets = () => setModal('targets');

  return (
    <div className="william min-h-screen bg-canvas pb-28 pt-6 md:pt-24">
      <FloatingNav />
      <TabBar />
      <main className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 md:gap-4 md:px-6">

        {/* Mobile header */}
        <div className="flex items-start justify-between md:hidden">
          <div className="flex flex-col gap-0">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Portfolio</h1>
            <p className="text-[13px] font-medium text-secondary">{d.subtitle}</p>
          </div>
          <button
            type="button" aria-label="Account" onClick={() => navigate('/william/account')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-bg text-ink transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
          <div className="flex items-center gap-2">
            <Button pill size="m" variant="secondary" onClick={refresh} loading={refreshing} disabled={!canRefresh}><Icon name="refresh" size={18} /> Refresh</Button>
            <Button pill size="m" variant="secondary" onClick={goImport}><Icon name="import" size={18} /> Import</Button>
            <Button pill size="m" variant="primary" onClick={addTrade} className="font-semibold"><Icon name="plus" size={16} /> Add trade</Button>
          </div>
        </div>

        {/* Mobile actions — [Add trade] [Refresh] [Import], icon+text pills (Figma 488:6940) */}
        <div className="flex items-center gap-2 md:hidden">
          <Button pill size="m" variant="primary" onClick={addTrade} className="font-semibold"><Icon name="plus" size={16} /> Add trade</Button>
          <Button pill size="m" variant="secondary" onClick={refresh} loading={refreshing} disabled={!canRefresh}><Icon name="refresh" size={18} /> Refresh</Button>
          <Button pill size="m" variant="secondary" onClick={goImport}><Icon name="import" size={18} /> Import</Button>
        </div>

        {d.isEmpty ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Icon name="portfolio" size={40} className="text-muted" />
            <h2 className="text-[20px] font-semibold text-ink">No holdings yet</h2>
            <p className="max-w-sm text-[14px] text-secondary">Add your first stock trade to start tracking your portfolio.</p>
            <Button pill size="l" variant="primary" onClick={addTrade} className="mt-1"><Icon name="plus" size={18} /> Add trade</Button>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-4 md:grid md:grid-cols-[400px_1fr] md:gap-4">
              <SummaryCard d={d} />
              <AllocationCard d={d} onSetTargets={setTargets} />
            </div>
            <HoldingsTable d={d} sortBy={sortBy} sortDir={sortDir} onSort={onSortCol} />
            <HoldingsList d={d} sortBy={sortBy} sortDir={sortDir} onSelectField={setSortBy} onToggleDir={toggleDir} />
          </>
        )}
      </main>

      <AddTradeModal open={modal === 'trade'} onClose={() => setModal(null)} />
      <ImportExcelModal open={modal === 'import'} onClose={() => setModal(null)} />
      <SetTargetsModal open={modal === 'targets'} onClose={() => setModal(null)} holdings={d.holdings} totalValue={d.totalValue} />
    </div>
  );
}
