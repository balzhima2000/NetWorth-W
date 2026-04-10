import { useState, useMemo, useRef } from 'react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { GlassCard } from '../../components/ui';
import type { Transaction, SpendingCategory } from '../../types/index';

// ─────────────────────────── helpers ──────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(dateStr: string): string {
  return dateStr.split('T')[0];
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return toLocalDateStr(date);
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad);
  const db = new Date(by, bm - 1, bd);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

// ─────────────────────────── constants ────────────────────────────────────

const CELL_SIZE = 13;
const CELL_GAP = 3;
const CELL_UNIT = CELL_SIZE + CELL_GAP;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Blue-tinted intensity scale — dark bg theme
const INTENSITY_COLORS = [
  '#151515',                    // 0 – no spend
  'rgba(59,130,246,0.22)',      // 1 – low
  'rgba(59,130,246,0.44)',      // 2
  'rgba(59,130,246,0.70)',      // 3
  '#3b82f6',                    // 4 – peak
];

// ─────────────────────────── types ────────────────────────────────────────

type DaySpend = {
  date: string;
  total: number;
  byCategory: Record<string, number>;
  transactions: Transaction[];
};

type TooltipState = {
  date: string;
  total: number;
  byCategory: Record<string, number>;
  vsAvg: number;
  clientX: number;
  clientY: number;
};

// ─────────────────────────── sub-components ───────────────────────────────

function HeatmapTooltip({
  tooltip,
  categories,
  defaultCurrency,
}: {
  tooltip: TooltipState;
  categories: SpendingCategory[];
  defaultCurrency: string;
}) {
  const catEntries = Object.entries(tooltip.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const date = new Date(tooltip.date + 'T12:00:00');
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const vsAvgLabel = tooltip.vsAvg !== 0
    ? `${tooltip.vsAvg > 0 ? '+' : ''}${tooltip.vsAvg.toFixed(0)}% vs avg`
    : 'At daily average';
  const vsAvgColor = tooltip.vsAvg > 20 ? '#ef4444' : tooltip.vsAvg < -20 ? '#22c55e' : 'rgba(255,255,255,0.45)';

  return (
    <div
      className="fixed z-[100] pointer-events-none"
      style={{
        left: tooltip.clientX,
        top: tooltip.clientY - 8,
        transform: 'translateX(-50%) translateY(-100%)',
      }}
    >
      <div
        style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '10px 13px',
          minWidth: 180,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-[11px] text-white/50 font-medium">{dateLabel}</span>
          <span className="text-[11px] font-medium" style={{ color: vsAvgColor }}>{vsAvgLabel}</span>
        </div>
        <div className="text-base font-bold text-white mb-2">
          {formatCurrency(tooltip.total, defaultCurrency)}
        </div>
        {catEntries.length > 0 && (
          <div className="space-y-1 border-t border-white/[0.07] pt-2">
            {catEntries.map(([catId, amount]) => {
              const cat = categories.find(c => c.id === catId);
              const label = cat?.name ?? catId;
              const emoji = cat?.emoji ?? '💰';
              return (
                <div key={catId} className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-white/55 truncate max-w-[110px]">{emoji} {label}</span>
                  <span className="text-[11px] text-white/80 tabular-nums font-medium">
                    {formatCurrency(amount, defaultCurrency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryBreakdown({
  catTotals,
  catTopTxn,
  priorCatTotals,
  totalSpend,
  categories,
  defaultCurrency,
  hasSelection,
}: {
  catTotals: Record<string, number>;
  catTopTxn: Record<string, Transaction>;
  priorCatTotals: Record<string, number>;
  totalSpend: number;
  categories: SpendingCategory[];
  defaultCurrency: string;
  hasSelection: boolean;
}) {
  const sorted = Object.entries(catTotals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const maxAmount = sorted[0]?.[1] ?? 1;

  if (sorted.length === 0) {
    return (
      <GlassCard padding="md">
        <p className="text-white/30 text-sm text-center py-6">No expense data for this period.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="none">
      <div className="p-4 sm:p-5 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/80">
          Spending by Category
          {!hasSelection && <span className="text-white/35 font-normal ml-1.5">· Last 12 months</span>}
        </h2>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {sorted.map(([catId, amount]) => {
          const cat = categories.find(c => c.id === catId);
          const label = cat?.name ?? catId;
          const emoji = cat?.emoji ?? '💰';
          const color = cat?.color ?? '#6b7280';
          const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
          const barPct = (amount / maxAmount) * 100;
          const prior = priorCatTotals[catId] ?? 0;
          const delta = prior > 0 ? ((amount - prior) / prior) * 100 : null;
          const topTxn = catTopTxn[catId];

          return (
            <div key={catId} className="px-4 sm:px-5 py-3.5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base leading-none flex-shrink-0">{emoji}</span>
                  <span className="text-sm font-medium text-white/85 truncate">{label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {delta !== null && hasSelection && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{
                        color: delta > 10 ? '#ef4444' : delta < -10 ? '#22c55e' : 'rgba(255,255,255,0.4)',
                        background: delta > 10 ? 'rgba(239,68,68,0.1)' : delta < -10 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                    </span>
                  )}
                  <span className="text-xs text-white/35">{pct.toFixed(1)}%</span>
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {formatCurrency(amount, defaultCurrency)}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.8 }}
                />
              </div>

              {/* Top transaction */}
              {topTxn && (
                <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                  <span className="text-white/20">Top:</span>
                  <span className="text-white/45 truncate max-w-[200px]">{topTxn.notes || 'Transaction'}</span>
                  <span className="text-white/25">·</span>
                  <span>{formatDate(topTxn.date, 'short')}</span>
                  <span className="text-white/25">·</span>
                  <span className="text-white/50 font-medium tabular-nums">
                    {formatCurrency(topTxn.convertedAmount || topTxn.amount, defaultCurrency)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─────────────────────────── main component ───────────────────────────────

export default function SpendingHeatmap() {
  const transactions = useTransactionStore((s) => s.transactions);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const categories = useCategoriesStore((s) => s.categories);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<string | null>(null);

  // ── Build date grid (52 weeks back from today, aligned to Sunday) ──
  const { weeks, endDate, startDate } = useMemo(() => {
    const today = new Date();
    const endDate = toLocalDateStr(today);

    const startRaw = new Date(today);
    startRaw.setDate(startRaw.getDate() - 364);
    // Snap back to Sunday
    startRaw.setDate(startRaw.getDate() - startRaw.getDay());
    const startDate = toLocalDateStr(startRaw);

    const weeks: (string | null)[][] = [];
    let curr = startDate;
    while (curr <= endDate) {
      const week: (string | null)[] = [];
      for (let d = 0; d < 7; d++) {
        if (curr <= endDate) {
          week.push(curr);
          curr = addDays(curr, 1);
        } else {
          week.push(null);
        }
      }
      weeks.push(week);
    }

    return { weeks, endDate, startDate };
  }, []);

  // ── Process transactions into day-level spend map ──
  const { dayMap, dailyAverage, spendDays } = useMemo(() => {
    const dayMap = new Map<string, DaySpend>();

    for (const txn of transactions) {
      if (txn.type !== 'expense') continue;
      const date = parseDate(txn.date);
      if (date < startDate || date > endDate) continue;

      if (!dayMap.has(date)) {
        dayMap.set(date, { date, total: 0, byCategory: {}, transactions: [] });
      }
      const day = dayMap.get(date)!;
      const amount = txn.convertedAmount || txn.amount;
      day.total += amount;
      day.byCategory[txn.category] = (day.byCategory[txn.category] || 0) + amount;
      day.transactions.push(txn);
    }

    const spendDays = [...dayMap.values()].filter(d => d.total > 0);
    const totalSpend = spendDays.reduce((s, d) => s + d.total, 0);
    const dailyAverage = spendDays.length > 0 ? totalSpend / spendDays.length : 0;

    return { dayMap, dailyAverage, spendDays };
  }, [transactions, startDate, endDate]);

  // ── Intensity thresholds (quartiles of spending days) ──
  const { p25, p50, p75 } = useMemo(() => {
    if (spendDays.length === 0) return { p25: 0, p50: 0, p75: 0 };
    const sorted = spendDays.map(d => d.total).sort((a, b) => a - b);
    return {
      p25: sorted[Math.floor(sorted.length * 0.25)] ?? 0,
      p50: sorted[Math.floor(sorted.length * 0.50)] ?? 0,
      p75: sorted[Math.floor(sorted.length * 0.75)] ?? 0,
    };
  }, [spendDays]);

  function getIntensity(total: number): 0 | 1 | 2 | 3 | 4 {
    if (total <= 0) return 0;
    if (total <= p25) return 1;
    if (total <= p50) return 2;
    if (total <= p75) return 3;
    return 4;
  }

  // ── Selection range (ordered) ──
  const [selMin, selMax] = useMemo<[string | null, string | null]>(() => {
    if (!selStart && !selEnd) return [null, null];
    const a = selStart ?? selEnd!;
    const b = selEnd ?? selStart!;
    return a <= b ? [a, b] : [b, a];
  }, [selStart, selEnd]);

  const hasSelection = !!(selMin && selMax);

  // ── Stats for selected period (or full window if none) ──
  const stats = useMemo(() => {
    const rangeStart = selMin ?? startDate;
    const rangeEnd = selMax ?? endDate;
    const numDays = daysBetween(rangeStart, rangeEnd) + 1;

    let totalSpend = 0;
    let peakDay = { date: '', amount: 0 };
    const catTotals: Record<string, number> = {};
    const catTopTxn: Record<string, Transaction> = {};

    for (const txn of transactions) {
      if (txn.type !== 'expense') continue;
      const date = parseDate(txn.date);
      if (date < rangeStart || date > rangeEnd) continue;

      const amount = txn.convertedAmount || txn.amount;
      totalSpend += amount;
      catTotals[txn.category] = (catTotals[txn.category] || 0) + amount;
      const topAmt = catTopTxn[txn.category]
        ? (catTopTxn[txn.category].convertedAmount || catTopTxn[txn.category].amount)
        : -1;
      if (amount > topAmt) catTopTxn[txn.category] = txn;
    }

    for (const [date, data] of dayMap) {
      if (date >= rangeStart && date <= rangeEnd && data.total > peakDay.amount) {
        peakDay = { date, amount: data.total };
      }
    }

    const perDay = numDays > 0 ? totalSpend / numDays : 0;
    const yearlyPace = perDay * 365;

    // Prior equivalent period
    const priorEnd = addDays(rangeStart, -1);
    const priorStart = addDays(rangeStart, -numDays);
    const priorCatTotals: Record<string, number> = {};
    let priorTotal = 0;
    for (const txn of transactions) {
      if (txn.type !== 'expense') continue;
      const date = parseDate(txn.date);
      if (date < priorStart || date > priorEnd) continue;
      const amount = txn.convertedAmount || txn.amount;
      priorTotal += amount;
      priorCatTotals[txn.category] = (priorCatTotals[txn.category] || 0) + amount;
    }

    return { totalSpend, perDay, yearlyPace, peakDay, catTotals, catTopTxn, priorCatTotals, priorTotal, numDays };
  }, [selMin, selMax, startDate, endDate, transactions, dayMap]);

  // ── Month labels for heatmap top ──
  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const month = parseInt(firstDay.split('-')[1], 10) - 1;
        if (month !== lastMonth) {
          labels.push({ label: MONTH_NAMES[month], colIndex: wi });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [weeks]);

  // ── Mouse handlers ──
  function handleMouseDown(date: string, e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = date;
    setSelStart(date);
    setSelEnd(date);
  }

  function handleMouseEnter(date: string, dayData: DaySpend | undefined, e: React.MouseEvent) {
    if (isDragging && dragStartRef.current) {
      setSelStart(dragStartRef.current);
      setSelEnd(date);
    }
    const total = dayData?.total ?? 0;
    if (total > 0) {
      const vsAvg = dailyAverage > 0 ? ((total - dailyAverage) / dailyAverage) * 100 : 0;
      setTooltip({
        date,
        total,
        byCategory: dayData?.byCategory ?? {},
        vsAvg,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    } else {
      setTooltip(null);
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleMouseLeave() {
    setTooltip(null);
    if (isDragging) setIsDragging(false);
  }

  function clearSelection() {
    setSelStart(null);
    setSelEnd(null);
  }

  // ── Render ──
  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Spending Heatmap</h1>
          <p className="text-white/35 text-sm mt-0.5">Daily activity over the last 12 months · click or drag to select</p>
        </div>
        {hasSelection && (
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 rounded-xl text-sm font-medium text-white/55 hover:text-white/85 transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Heatmap card ── */}
      <GlassCard padding="none">
        <div
          className="p-4 sm:p-5 select-none"
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
        >
          <div className="overflow-x-auto">
            <div className="flex" style={{ minWidth: `${weeks.length * CELL_UNIT + 36}px` }}>
              {/* Day label column */}
              <div
                className="flex flex-col mr-1.5 flex-shrink-0"
                style={{ width: 26, paddingTop: 24 }}
              >
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    style={{ height: CELL_SIZE, marginBottom: CELL_GAP }}
                    className="flex items-center justify-end text-[9px] text-white/22 font-medium pr-1"
                  >
                    {/* Show Mon, Wed, Fri */}
                    {(i === 1 || i === 3 || i === 5) ? label : ''}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="flex-1">
                {/* Month labels row */}
                <div className="relative" style={{ height: 22 }}>
                  {monthLabels.map(({ label, colIndex }) => (
                    <span
                      key={`${label}-${colIndex}`}
                      className="absolute text-[10px] text-white/35 font-medium"
                      style={{ left: colIndex * CELL_UNIT, top: 4 }}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {/* Week columns */}
                <div className="flex" style={{ gap: CELL_GAP }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col" style={{ gap: CELL_GAP }}>
                      {week.map((date, di) => {
                        if (!date) {
                          return <div key={di} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                        }
                        const dayData = dayMap.get(date);
                        const total = dayData?.total ?? 0;
                        const intensity = getIntensity(total);
                        const inSel = hasSelection && date >= selMin! && date <= selMax!;
                        const dimmed = hasSelection && !inSel;

                        return (
                          <div
                            key={di}
                            title={date}
                            style={{
                              width: CELL_SIZE,
                              height: CELL_SIZE,
                              borderRadius: 3,
                              cursor: 'pointer',
                              backgroundColor: INTENSITY_COLORS[intensity],
                              outline: inSel ? '1px solid rgba(255,255,255,0.35)' : 'none',
                              outlineOffset: '1px',
                              opacity: dimmed ? 0.35 : 1,
                              transition: 'opacity 0.08s',
                            }}
                            onMouseDown={(e) => handleMouseDown(date, e)}
                            onMouseEnter={(e) => handleMouseEnter(date, dayData, e)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-4 justify-end">
            <span className="text-[9px] text-white/25 mr-0.5">Low spend</span>
            {INTENSITY_COLORS.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 2,
                  backgroundColor: color,
                  border: i === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              />
            ))}
            <span className="text-[9px] text-white/25 ml-0.5">High spend</span>
          </div>
        </div>
      </GlassCard>

      {/* ── Summary stats (shown only when selection active) ── */}
      {hasSelection && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Spend',
              value: formatCurrency(stats.totalSpend, defaultCurrency),
              sub: `${stats.numDays} day${stats.numDays !== 1 ? 's' : ''}`,
            },
            {
              label: 'Per Day',
              value: formatCurrency(stats.perDay, defaultCurrency),
              sub: 'avg daily spend',
            },
            {
              label: 'Yearly Pace',
              value: formatCurrency(stats.yearlyPace, defaultCurrency, true),
              sub: 'annualised',
            },
            {
              label: 'Peak Day',
              value: formatCurrency(stats.peakDay.amount, defaultCurrency),
              sub: stats.peakDay.date
                ? new Date(stats.peakDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—',
            },
          ].map((stat) => (
            <GlassCard key={stat.label} padding="sm">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1">
                {stat.label}
              </p>
              <p className="text-lg font-bold text-white tabular-nums leading-tight">{stat.value}</p>
              {stat.sub && (
                <p className="text-[11px] text-white/35 mt-0.5">{stat.sub}</p>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Category breakdown ── */}
      <CategoryBreakdown
        catTotals={stats.catTotals}
        catTopTxn={stats.catTopTxn}
        priorCatTotals={stats.priorCatTotals}
        totalSpend={stats.totalSpend}
        categories={categories}
        defaultCurrency={defaultCurrency}
        hasSelection={hasSelection}
      />

      {/* Tooltip */}
      {tooltip && (
        <HeatmapTooltip
          tooltip={tooltip}
          categories={categories}
          defaultCurrency={defaultCurrency}
        />
      )}
    </div>
  );
}
