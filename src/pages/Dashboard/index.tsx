import { useEffect, useState, useMemo, useRef } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { GlassCard, Button, EmptyState } from '../../components/ui';
import { formatCurrency, formatDate, getCurrentMonthYear, getTodayISO } from '../../utils/formatters';
import { calculateCurrentHoldings } from '../../utils/calculations';
import { NetWorthLineChart } from '../../components/charts/NetWorthLineChart';
import { TREND_PERIODS } from '../../utils/constants';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';

type TrendPeriod = typeof TREND_PERIODS[number];

// ── Presentational building blocks ───────────────────────────────────────────

function MetricCell({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider leading-none">
        {label}
      </p>
      <p
        className="font-mono font-semibold text-sm mt-1 leading-none tabular-nums"
        style={{ color: color ?? 'rgba(255,255,255,0.85)' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-white/25 mt-0.5 leading-none">{sub}</p>
      )}
    </div>
  );
}

type InsightSeverity = 'alert' | 'warning' | 'info' | 'positive';

interface InsightItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  href: string;
  severity: InsightSeverity;
}

const SEVERITY_STYLES: Record<InsightSeverity, {
  border: string;
  bg: string;
  badgeBg: string;
  badgeText: string;
}> = {
  alert:    { border: '#EF4444', bg: 'rgba(239,68,68,0.08)',  badgeBg: 'rgba(239,68,68,0.18)',  badgeText: '#F87171' },
  warning:  { border: '#F59E0B', bg: 'rgba(245,158,11,0.08)', badgeBg: 'rgba(245,158,11,0.18)', badgeText: '#FCD34D' },
  info:     { border: '#3B82F6', bg: 'rgba(59,130,246,0.07)', badgeBg: 'rgba(59,130,246,0.18)', badgeText: '#60A5FA' },
  positive: { border: '#10B981', bg: 'rgba(16,185,129,0.07)', badgeBg: 'rgba(16,185,129,0.18)', badgeText: '#34D399' },
};

function InsightAlert({
  item,
  onClick,
}: {
  item: InsightItem;
  onClick: () => void;
}) {
  const s = SEVERITY_STYLES[item.severity];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      style={{
        background: s.bg,
        borderLeft: `3px solid ${s.border}`,
      }}
    >
      <span className="text-base leading-none flex-shrink-0 w-5 text-center">{item.icon}</span>
      <span className="flex-1 text-sm text-white/80 font-medium leading-snug">{item.label}</span>
      <span
        className="text-[11px] font-semibold font-mono px-2.5 py-1 rounded-full flex-shrink-0 leading-none"
        style={{ background: s.badgeBg, color: s.badgeText }}
      >
        {item.value}
      </span>
      <svg
        className="flex-shrink-0 opacity-30"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
      >
        <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

interface WealthSegment {
  label: string;
  value: number;
  color: string;
}

function WealthCompositionDonut({
  segments,
  total,
  liabilities,
  currency,
  size = 'md',
}: {
  segments: WealthSegment[];
  total: number;
  liabilities: number;
  currency: string;
  size?: 'sm' | 'md';
}) {
  if (total <= 0) return null;
  const active = segments.filter((s) => s.value > 1);
  if (active.length === 0) return null;

  const dim = size === 'sm' ? 120 : 148;
  const r = size === 'sm' ? 42 : 52;
  const sw = size === 'sm' ? 13 : 16;
  const cx = dim / 2, cy = dim / 2;
  const circumference = 2 * Math.PI * r;
  const GAP_ARC = active.length > 1 ? (3 / 360) * circumference : 0;

  let cumulativeDeg = -90;

  return (
    <div className={`flex ${size === 'sm' ? 'flex-col items-start gap-3' : 'items-center gap-8'}`}>
      {/* Donut SVG */}
      <div className="relative flex-shrink-0" style={{ width: dim, height: dim }}>
        <svg viewBox={`0 0 ${dim} ${dim}`} width={dim} height={dim}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={sw}
          />
          {/* Segments */}
          {active.map((s) => {
            const pct = s.value / total;
            const arc = Math.max(pct * circumference - GAP_ARC, 0);
            const startDeg = cumulativeDeg;
            cumulativeDeg += pct * 360;
            return (
              <circle
                key={s.label}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={sw}
                strokeDasharray={`${arc} ${circumference}`}
                strokeLinecap="butt"
                transform={`rotate(${startDeg} ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 700ms ease' }}
              />
            );
          })}
        </svg>
        {/* Center label overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p
            className="font-bold font-mono leading-none tabular-nums"
            style={{
              fontSize: size === 'sm' ? 11 : 13,
              color: 'rgba(255,255,255,0.82)',
            }}
          >
            {formatCurrency(total, currency)}
          </p>
          <p
            className="uppercase tracking-widest leading-none mt-1"
            style={{ fontSize: 7, color: 'rgba(255,255,255,0.28)' }}
          >
            assets
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className={`${size === 'sm' ? 'flex flex-wrap gap-x-4 gap-y-2' : 'flex-1 grid grid-cols-2 gap-x-8 gap-y-3'}`}>
        {active.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: s.color }}
            />
            <div className="min-w-0">
              <p className="text-[11px] text-white/40 leading-none truncate">{s.label}</p>
              <p className="text-xs font-mono text-white/70 mt-0.5 leading-none">
                {formatCurrency(s.value, currency)}
              </p>
              <p className="text-[10px] text-white/25 mt-0.5 leading-none">
                {((s.value / total) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        ))}
        {liabilities > 0 && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500/60" />
            <div className="min-w-0">
              <p className="text-[11px] text-white/40 leading-none">Debt</p>
              <p
                className="text-xs font-mono mt-0.5 leading-none"
                style={{ color: 'rgba(239,68,68,0.75)' }}
              >
                −{formatCurrency(liabilities, currency)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ── Store subscriptions ────────────────────────────────────────
  const trades = usePortfolioStore((s) => s.trades);
  const currentPrices = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);

  const manualEntries = useNetWorthStore((s) => s.manualEntries);
  const addSnapshot = useNetWorthStore((s) => s.addSnapshot);
  const lastSnapshotDate = useNetWorthStore((s) => s.lastSnapshotDate);
  const snapshots = useNetWorthStore((s) => s.snapshots);
  const getSnapshotsByRange = useNetWorthStore((s) => s.getSnapshotsByRange);

  const transactions = useTransactionStore((s) => s.transactions);
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const getBudgetsByMonth = useBudgetStore((s) => s.getBudgetsByMonth);

  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const userNickname = useSettingsStore((s) => s.userNickname);
  const activityFeedShowTransactions = useSettingsStore((s) => s.activityFeedShowTransactions);
  const activityFeedShowRecurring = useSettingsStore((s) => s.activityFeedShowRecurring);
  const setActivityFeedSettings = useSettingsStore((s) => s.setActivityFeedSettings);

  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>(TREND_PERIODS[1]);

  // ── Core financial calculations ────────────────────────────────
  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates]
  );

  const portfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const assetsManual = manualEntries.filter((e) => !e.isLiability);
  const assetsTotal_manual = assetsManual.reduce((sum, e) => sum + e.value, 0);
  const liabilitiesTotal = manualEntries
    .filter((e) => e.isLiability)
    .reduce((sum, e) => sum + e.value, 0);
  const totalAssets = portfolioValue + assetsTotal_manual;
  const netWorth = totalAssets - liabilitiesTotal;

  // Exchange rate helper
  const getRate = (currency: string) => {
    if (!currency || currency === defaultCurrency) return 1;
    const r = exchangeRates.find((x) => x.currency === currency);
    return r ? r.rateToDefault : 1;
  };

  // ── Time-based calculations ────────────────────────────────────
  const { month, year } = getCurrentMonthYear();

  const monthExpenses = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year && t.type === 'expense';
      }),
    [transactions, month, year]
  );
  const monthSpending = monthExpenses.reduce((sum, t) => sum + t.convertedAmount, 0);

  const monthIncomeTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year && t.type === 'income';
      }),
    [transactions, month, year]
  );
  const monthIncome = monthIncomeTransactions.reduce((sum, t) => sum + t.convertedAmount, 0);
  const monthCashFlow = monthIncome - monthSpending;

  // Previous month spending
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthSpending = useMemo(
    () =>
      transactions
        .filter((t) => {
          const d = new Date(t.date);
          return (
            d.getMonth() + 1 === prevMonth &&
            d.getFullYear() === prevYear &&
            t.type === 'expense'
          );
        })
        .reduce((sum, t) => sum + t.convertedAmount, 0),
    [transactions, prevMonth, prevYear]
  );
  const spendingVsLastMonth =
    prevMonthSpending > 0
      ? ((monthSpending - prevMonthSpending) / prevMonthSpending) * 100
      : null;

  // ── Chart data + period delta ──────────────────────────────────
  const chartData = useMemo(
    () => getSnapshotsByRange(selectedPeriod.days),
    [snapshots, selectedPeriod]
  );

  const netWorthChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].netWorth;
    const last = chartData[chartData.length - 1].netWorth;
    return {
      amount: last - first,
      percent: first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0,
    };
  }, [chartData]);

  // ── Upcoming recurring (rest of this month) ──────────────────────
  const dueSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return recurringPayments.filter((p) => {
      if (!p.isActive) return false;
      const due = new Date(p.nextDueDate);
      return due >= today && due <= endOfMonth;
    });
  }, [recurringPayments]);

  const dueSoonTotal = dueSoon.reduce(
    (sum, p) => sum + p.amount * getRate(p.currency ?? defaultCurrency),
    0
  );

  // ── Budget attention ───────────────────────────────────────────
  const budgetsOverLimit = useMemo(() => {
    const budgets = getBudgetsByMonth(month, year);
    return budgets.filter((b) => {
      const spent = monthExpenses
        .filter((t) => t.category === b.category)
        .reduce((sum, t) => sum + t.convertedAmount, 0);
      return spent > b.amount;
    });
  }, [monthExpenses, month, year, getBudgetsByMonth]);

  // ── Insights strip ─────────────────────────────────────────────
  const insightItems = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];

    if (budgetsOverLimit.length > 0) {
      items.push({
        id: 'budgets',
        icon: '🚨',
        label: budgetsOverLimit.length === 1
          ? `1 budget exceeded — review your spending`
          : `${budgetsOverLimit.length} budgets exceeded — review your spending`,
        value: 'Over limit',
        href: '/spending',
        severity: 'alert',
      });
    }

    if (dueSoon.length > 0) {
      items.push({
        id: 'due',
        icon: '📅',
        label: `${dueSoon.length} recurring payment${dueSoon.length > 1 ? 's' : ''} due within 7 days`,
        value: formatCurrency(dueSoonTotal, defaultCurrency),
        href: '/spending',
        severity: 'warning',
      });
    }

    if (spendingVsLastMonth !== null && Math.abs(spendingVsLastMonth) >= 5) {
      const up = spendingVsLastMonth > 0;
      items.push({
        id: 'spending-trend',
        icon: up ? '📈' : '📉',
        label: up
          ? `Spending up ${spendingVsLastMonth.toFixed(0)}% vs last month`
          : `Spending down ${Math.abs(spendingVsLastMonth).toFixed(0)}% vs last month`,
        value: `${up ? '+' : ''}${spendingVsLastMonth.toFixed(0)}%`,
        href: '/spending',
        severity: up ? 'warning' : 'positive',
      });
    }

    return items;
  }, [
    budgetsOverLimit,
    dueSoon,
    dueSoonTotal,
    spendingVsLastMonth,
    defaultCurrency,
  ]);

  // ── Wealth composition ────────────────────────────────────────
  const wealthSegments = useMemo<WealthSegment[]>(() => {
    const cash = assetsManual
      .filter((e) => e.assetCategory === 'cash_savings')
      .reduce((s, e) => s + e.value, 0);
    const realEstate = assetsManual
      .filter((e) => e.assetCategory === 'real_estate')
      .reduce((s, e) => s + e.value, 0);
    const crypto = assetsManual
      .filter((e) => e.assetCategory === 'crypto')
      .reduce((s, e) => s + e.value, 0);
    const vehicle = assetsManual
      .filter((e) => e.assetCategory === 'vehicle')
      .reduce((s, e) => s + e.value, 0);
    const other = assetsManual
      .filter((e) => !['cash_savings', 'real_estate', 'crypto', 'vehicle'].includes(e.assetCategory))
      .reduce((s, e) => s + e.value, 0);

    return [
      { label: 'Portfolio', value: portfolioValue, color: '#3B82F6' },
      { label: 'Cash', value: cash, color: '#10B981' },
      { label: 'Real Estate', value: realEstate, color: '#8B5CF6' },
      { label: 'Crypto', value: crypto, color: '#F59E0B' },
      { label: 'Vehicle', value: vehicle, color: '#06B6D4' },
      { label: 'Other', value: other, color: '#6B7280' },
    ];
  }, [assetsManual, portfolioValue]);

  // ── Top spending categories this month ────────────────────────
  // Mirrors the Spending page's categorySpend logic: transactions + recurring
  const topSpendingCategories = useMemo(() => {
    const catMap = new Map<string, number>();

    // 1. Regular expense transactions
    monthExpenses.forEach((t) => {
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.convertedAmount);
    });

    // 2. Recurring payments that fired this month but don't have a matching auto-added tx
    const todayStr = getTodayISO();
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStr = `${year}-${pad(month)}`;

    recurringPayments.forEach((rp) => {
      if (!rp.isActive || rp.type !== 'expense') return;
      if (rp.startDate > `${monthStr}-31`) return;
      if (rp.endDate && rp.endDate < `${monthStr}-01`) return;

      const rpCurrency = rp.currency ?? defaultCurrency;
      const rpRate = exchangeRates.find(r => r.currency === rpCurrency);
      const converted = rpCurrency === defaultCurrency ? rp.amount : rpRate ? rp.amount * rpRate.rateToDefault : rp.amount;

      const addIfNotPresent = (dueDateStr: string) => {
        if (dueDateStr < rp.startDate || dueDateStr > todayStr) return;
        if (rp.endDate && dueDateStr > rp.endDate) return;
        const alreadyCovered = monthExpenses.some(
          t => t.isAutoAdded && t.category === rp.category && t.date === dueDateStr && Math.abs(t.convertedAmount - converted) < 0.01
        );
        if (!alreadyCovered) catMap.set(rp.category, (catMap.get(rp.category) ?? 0) + converted);
      };

      if (rp.frequency === 'monthly' && rp.dayOfMonth) {
        const day = Math.min(rp.dayOfMonth, new Date(year, month, 0).getDate());
        addIfNotPresent(`${monthStr}-${pad(day)}`);
      } else if (rp.frequency === 'weekly' && rp.dayOfWeek !== null) {
        const daysInM = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInM; d++) {
          if (new Date(year, month - 1, d).getDay() === rp.dayOfWeek) {
            addIfNotPresent(`${monthStr}-${pad(d)}`);
          }
        }
      } else if (rp.frequency === 'yearly') {
        const startD = new Date(rp.startDate);
        if (startD.getMonth() + 1 === month) {
          const day = Math.min(startD.getDate(), new Date(year, month, 0).getDate());
          addIfNotPresent(`${monthStr}-${pad(day)}`);
        }
      }
    });

    return [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amount]) => ({ cat, amount }));
  }, [monthExpenses, recurringPayments, year, month, defaultCurrency, exchangeRates]);

  // ── Improved activity feed ─────────────────────────────────────
  const dueSoonActivity = useMemo(
    () =>
      activityFeedShowRecurring
        ? dueSoon
            .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
            .slice(0, 4)
        : [],
    [dueSoon, activityFeedShowRecurring]
  );

  const recentTransactions = useMemo(
    () =>
      activityFeedShowTransactions
        ? [...transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 12)
        : [],
    [transactions, activityFeedShowTransactions]
  );

  // ── Greeting ──────────────────────────────────────────────────
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 5
      ? 'Good Night'
      : greetingHour < 12
      ? 'Good Morning'
      : greetingHour < 18
      ? 'Good Afternoon'
      : 'Good Evening';
  const greetingEmoji =
    greetingHour < 5
      ? '🌙'
      : greetingHour < 12
      ? '☀️'
      : greetingHour < 18
      ? '🌤️'
      : '🌆';

  // ── Page title + daily snapshot ────────────────────────────────
  useEffect(() => {
    document.title = 'Dashboard — NetWorth Tracker';
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastSnapshotDate !== today) {
      addSnapshot({
        id: crypto.randomUUID(),
        date: today,
        totalAssets,
        totalLiabilities: liabilitiesTotal,
        netWorth,
        portfolioValue,
        manualAssetsTotal: assetsTotal_manual,
      });
    }
  }, [trades, manualEntries, currentPrices]);

  // ── Count-up animation (mobile hero number) ───────────────────
  const [displayNetWorth, setDisplayNetWorth] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isMobile) return;
    if (hasAnimated.current) {
      setDisplayNetWorth(netWorth);
      return;
    }
    hasAnimated.current = true;
    const target = netWorth;
    const duration = 900;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayNetWorth(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [netWorth, isMobile]);

  // ── Shared sub-renders ─────────────────────────────────────────

  const periodSelector = (
    <div className="flex gap-1">
      {TREND_PERIODS.map((p) => (
        <button
          key={p.label}
          onClick={() => setSelectedPeriod(p)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 ${
            selectedPeriod.label === p.label
              ? 'bg-[#10B981] text-white'
              : 'text-white/40 hover:text-white/70 hover:bg-white/10'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  const insightsStrip = insightItems.length > 0 ? (
    <div className="space-y-2">
      {insightItems.map((item) => (
        <InsightAlert
          key={item.id}
          item={item}
          onClick={() => navigate(item.href)}
        />
      ))}
    </div>
  ) : null;

  const isPositive = netWorthChange ? netWorthChange.amount >= 0 : true;
  const changeColor = isPositive ? '#22C55E' : '#EF4444';

  // ──────────────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // ──────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-3 stagger-children">

        {/* Greeting */}
        <div className="pt-1">
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-0.5">
            {greeting} {greetingEmoji}
          </p>
          <h2 className="text-lg font-semibold text-white leading-tight">
            {userNickname ? userNickname : 'Your Dashboard'}
          </h2>
        </div>

        {/* Hero card */}
        <GlassCard padding="lg">
          {/* Label + badge */}
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-white/45 text-xs font-medium uppercase tracking-widest">Net Worth</p>
            {netWorthChange && (
              <span
                className="text-xs font-semibold font-mono px-2.5 py-1 rounded-full"
                style={{
                  background: `${changeColor}18`,
                  color: changeColor,
                  border: `1px solid ${changeColor}28`,
                }}
              >
                {isPositive ? '+' : ''}{netWorthChange.percent.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Animated net worth number */}
          <h1
            className="text-4xl font-bold text-white font-mono leading-none"
            style={{ letterSpacing: '-0.5px' }}
          >
            {formatCurrency(displayNetWorth, defaultCurrency)}
          </h1>

          {netWorthChange && (
            <p className="text-sm font-mono mt-1.5" style={{ color: changeColor }}>
              {isPositive ? '+' : ''}{formatCurrency(netWorthChange.amount, defaultCurrency)}
              <span className="text-white/25 ml-1.5 text-xs">vs {selectedPeriod.label}</span>
            </p>
          )}

          {/* Period selector */}
          <div className="mt-3">{periodSelector}</div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="mt-3">
              <NetWorthLineChart data={chartData} currency={defaultCurrency} />
            </div>
          )}

          {/* Stats strip */}
          <div
            className="grid mt-4 pt-4 gap-3"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              gridTemplateColumns: `repeat(${2 + (liabilitiesTotal > 0 ? 1 : 0) + (monthCashFlow !== 0 && monthIncome > 0 ? 1 : 0)}, 1fr)`,
            }}
          >
            <MetricCell
              label="Assets"
              value={formatCurrency(totalAssets, defaultCurrency)}
              color="#22C55E"
            />
            {liabilitiesTotal > 0 && (
              <MetricCell
                label="Debt"
                value={formatCurrency(liabilitiesTotal, defaultCurrency)}
                color="#EF4444"
              />
            )}
            <MetricCell
              label="Spent"
              value={formatCurrency(monthSpending, defaultCurrency)}
            />
            {monthIncome > 0 && (
              <MetricCell
                label="Cash Flow"
                value={`${monthCashFlow >= 0 ? '+' : ''}${formatCurrency(monthCashFlow, defaultCurrency)}`}
                color={monthCashFlow >= 0 ? '#22C55E' : '#EF4444'}
              />
            )}
          </div>
        </GlassCard>

        {/* Insights strip */}
        {insightsStrip && (
          <div>{insightsStrip}</div>
        )}

        {/* Spending summary */}
        {(monthSpending > 0 || monthIncome > 0) && (
          <GlassCard padding="md">
            <div className="flex items-start justify-between mb-3">
              <p className="text-white/45 text-xs font-medium uppercase tracking-wider">This Month</p>
              {spendingVsLastMonth !== null && (
                <span
                  className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background: spendingVsLastMonth > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    color: spendingVsLastMonth > 0 ? '#EF4444' : '#22C55E',
                  }}
                >
                  {spendingVsLastMonth > 0 ? '+' : ''}{spendingVsLastMonth.toFixed(0)}% vs last month
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCell
                label="Spent"
                value={formatCurrency(monthSpending, defaultCurrency)}
                sub={`${monthExpenses.length} transactions`}
              />
              {monthIncome > 0 && (
                <MetricCell
                  label="Income"
                  value={formatCurrency(monthIncome, defaultCurrency)}
                  color="#22C55E"
                />
              )}
            </div>
            {/* Top categories mini */}
            {topSpendingCategories.length > 0 && (
              <div
                className="mt-3 pt-3 space-y-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                {topSpendingCategories.slice(0, 3).map(({ cat, amount }) => (
                  <div key={cat} className="flex items-center justify-between">
                    <p className="text-[11px] text-white/45 capitalize">{cat}</p>
                    <p className="text-[11px] font-mono text-white/60">
                      {formatCurrency(amount, defaultCurrency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* Activity feed */}
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActivityFeedSettings({ showTransactions: !activityFeedShowTransactions })}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  activityFeedShowTransactions
                    ? 'bg-[#10B981]/20 text-[#10B981]'
                    : 'bg-white/5 text-white/30'
                }`}
              >
                💳
              </button>
              <button
                onClick={() => setActivityFeedSettings({ showRecurring: !activityFeedShowRecurring })}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  activityFeedShowRecurring
                    ? 'bg-[#10B981]/20 text-[#10B981]'
                    : 'bg-white/5 text-white/30'
                }`}
              >
                🔄
              </button>
            </div>
          </div>

          {dueSoonActivity.length === 0 && recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-white/30 text-sm">No recent activity</p>
              <p className="text-white/20 text-xs mt-0.5">Tap + to add your first entry</p>
            </div>
          ) : (
            <div className="space-y-1">
              {dueSoonActivity.length > 0 && (
                <>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider px-1 mb-2">
                    Due soon
                  </p>
                  {dueSoonActivity.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(245,158,11,0.07)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: 'rgba(245,158,11,0.12)' }}
                        >
                          🔄
                        </span>
                        <div>
                          <p className="text-white text-sm font-medium leading-tight">{p.name}</p>
                          <p className="text-white/30 text-[11px] mt-0.5">{formatDate(p.nextDueDate, 'short')}</p>
                        </div>
                      </div>
                      <p className="font-mono text-sm font-semibold ml-3" style={{ color: '#F59E0B' }}>
                        {formatCurrency(p.amount, p.currency ?? defaultCurrency)}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {recentTransactions.length > 0 && (
                <>
                  {dueSoonActivity.length > 0 && (
                    <div className="pt-2 pb-1">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider px-1">Recent</p>
                    </div>
                  )}
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                          💳
                        </span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate leading-tight">{tx.category}</p>
                          <p className="text-white/30 text-[11px] mt-0.5">{formatDate(tx.date, 'short')}</p>
                        </div>
                      </div>
                      <p
                        className="font-mono text-sm font-semibold ml-3 flex-shrink-0"
                        style={{ color: tx.type === 'expense' ? '#EF4444' : '#22C55E' }}
                      >
                        {tx.type === 'expense' ? '-' : '+'}
                        {formatCurrency(tx.convertedAmount, defaultCurrency)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </GlassCard>

        {/* Top holdings (compact) */}
        {holdings.length > 0 && (
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/45 text-xs font-medium uppercase tracking-wider">
                Top Holdings
              </p>
              <button
                onClick={() => navigate('/portfolio')}
                className="text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
              >
                View all →
              </button>
            </div>
            <div className="space-y-1.5">
              {holdings.slice(0, 3).map((h) => (
                <div
                  key={h.ticker}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#10B981] text-[9px] font-bold leading-none">
                        {h.ticker.slice(0, 3)}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm truncate">{h.ticker}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-white font-mono text-sm">
                      {formatCurrency(h.currentValue, defaultCurrency)}
                    </p>
                    <p
                      className="text-[11px] font-mono"
                      style={{ color: h.unrealizedGain >= 0 ? '#22C55E' : '#EF4444' }}
                    >
                      {h.unrealizedGain >= 0 ? '+' : ''}{h.unrealizedGainPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Wealth composition — bottom, donut */}
        {totalAssets > 0 && wealthSegments.filter(s => s.value > 1).length > 0 && (
          <GlassCard padding="md">
            <p className="text-white/45 text-xs font-medium uppercase tracking-wider mb-4">
              Wealth Composition
            </p>
            <WealthCompositionDonut
              segments={wealthSegments}
              total={totalAssets}
              liabilities={liabilitiesTotal}
              currency={defaultCurrency}
              size="sm"
            />
          </GlassCard>
        )}

        {/* Welcome empty state */}
        {holdings.length === 0 && totalAssets === 0 && transactions.length === 0 && (
          <GlassCard padding="lg" className="text-center py-8">
            <p className="text-4xl mb-3">💰</p>
            <h3 className="text-white font-semibold mb-2">Welcome to NetWorth Tracker</h3>
            <p className="text-white/40 text-sm mb-4">
              Start by adding your portfolio holdings, assets, or transactions.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="primary" onClick={() => navigate('/portfolio')}>Add Holdings</Button>
              <Button variant="secondary" onClick={() => navigate('/spending')}>Add Transaction</Button>
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ──────────────────────────────────────────────────────────────

  const hasAnyData =
    holdings.length > 0 || totalAssets > 0 || transactions.length > 0;

  return (
    <div className="space-y-5">

      {/* Greeting */}
      <div>
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">
          {greeting} {greetingEmoji}
        </p>
        <h2 className="text-2xl font-bold text-white mt-0.5">
          {userNickname ? `Hello, ${userNickname}` : 'Dashboard'}
        </h2>
      </div>

      {/* ── Hero — net worth command centre ── */}
      <GlassCard padding="lg">
        <div className="space-y-4">

          {/* Header row: label + period selector */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Net Worth</p>
            {periodSelector}
          </div>

          {/* Primary number + delta */}
          <div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white font-mono"
              style={{ letterSpacing: '-0.5px' }}
            >
              {formatCurrency(netWorth, defaultCurrency)}
            </h1>
            {netWorthChange && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: changeColor }}
                >
                  {isPositive ? '+' : ''}
                  {formatCurrency(netWorthChange.amount, defaultCurrency)}
                </span>
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: `${changeColor}18`,
                    color: changeColor,
                    border: `1px solid ${changeColor}28`,
                  }}
                >
                  {netWorthChange.percent >= 0 ? '+' : ''}
                  {netWorthChange.percent.toFixed(2)}%
                </span>
                <span className="text-white/25 text-xs">vs {selectedPeriod.label} ago</span>
              </div>
            )}
          </div>

          {/* Chart */}
          {chartData.length > 1 ? (
            <NetWorthLineChart data={chartData} currency={defaultCurrency} />
          ) : (
            <div
              className="h-48 flex items-center justify-center rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <p className="text-white/20 text-sm">
                Not enough data yet — check back tomorrow
              </p>
            </div>
          )}

          {/* Metrics strip */}
          <div
            className="grid gap-4 pt-4"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              gridTemplateColumns: `repeat(${
                4 + (liabilitiesTotal > 0 ? 0 : -1) + (monthIncome > 0 ? 0 : -1)
              }, 1fr)`,
            }}
          >
            <MetricCell
              label="Total Assets"
              value={formatCurrency(totalAssets, defaultCurrency)}
              color="#22C55E"
              sub={portfolioValue > 0 ? `Portfolio: ${formatCurrency(portfolioValue, defaultCurrency)}` : undefined}
            />
            {liabilitiesTotal > 0 && (
              <MetricCell
                label="Liabilities"
                value={formatCurrency(liabilitiesTotal, defaultCurrency)}
                color="#EF4444"
              />
            )}
            <MetricCell
              label="Month Spending"
              value={formatCurrency(monthSpending, defaultCurrency)}
              sub={`${monthExpenses.length} transactions`}
            />
            {monthIncome > 0 && (
              <MetricCell
                label="Cash Flow"
                value={`${monthCashFlow >= 0 ? '+' : ''}${formatCurrency(monthCashFlow, defaultCurrency)}`}
                color={monthCashFlow >= 0 ? '#22C55E' : '#EF4444'}
                sub={`Income: ${formatCurrency(monthIncome, defaultCurrency)}`}
              />
            )}
          </div>
        </div>
      </GlassCard>

      {/* Insights strip */}
      {insightsStrip && (
        <div>{insightsStrip}</div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* ── LEFT COLUMN — spending focus ── */}
        <div className="space-y-5">

          {/* Spending summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">
                  Monthly Spending
                </p>
                {spendingVsLastMonth !== null && (
                  <span
                    className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full"
                    style={{
                      background: spendingVsLastMonth > 0
                        ? 'rgba(239,68,68,0.1)'
                        : 'rgba(34,197,94,0.1)',
                      color: spendingVsLastMonth > 0 ? '#EF4444' : '#22C55E',
                    }}
                  >
                    {spendingVsLastMonth > 0 ? '+' : ''}{spendingVsLastMonth.toFixed(0)}% vs last mo
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold font-mono" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {formatCurrency(monthSpending, defaultCurrency)}
              </h3>
              <p className="text-xs text-white/30 mt-1">
                {monthExpenses.length} transaction{monthExpenses.length !== 1 ? 's' : ''} this month
              </p>
              {prevMonthSpending > 0 && (
                <p className="text-xs text-white/25 mt-0.5">
                  Last month: {formatCurrency(prevMonthSpending, defaultCurrency)}
                </p>
              )}
              <button
                onClick={() => navigate('/spending')}
                className="mt-3 text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
              >
                View spending →
              </button>
            </GlassCard>

            {monthIncome > 0 ? (
              <GlassCard padding="md">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">
                  Cash Flow
                </p>
                <h3
                  className="text-2xl font-bold font-mono"
                  style={{ color: monthCashFlow >= 0 ? '#22C55E' : '#EF4444' }}
                >
                  {monthCashFlow >= 0 ? '+' : ''}
                  {formatCurrency(monthCashFlow, defaultCurrency)}
                </h3>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/30">Income</p>
                    <p className="text-xs font-mono text-[#22C55E]">
                      {formatCurrency(monthIncome, defaultCurrency)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/30">Expenses</p>
                    <p className="text-xs font-mono text-white/60">
                      {formatCurrency(monthSpending, defaultCurrency)}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard padding="md">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">
                  Portfolio
                </p>
                <h3 className="text-2xl font-bold font-mono text-[#3B82F6]">
                  {formatCurrency(portfolioValue, defaultCurrency)}
                </h3>
                {holdings.length > 0 && (
                  <p className="text-xs text-white/30 mt-1">
                    {holdings.length} position{holdings.length !== 1 ? 's' : ''}
                    {totalAssets > 0 && ` · ${((portfolioValue / totalAssets) * 100).toFixed(0)}% of assets`}
                  </p>
                )}
                <button
                  onClick={() => navigate('/portfolio')}
                  className="mt-3 text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
                >
                  View portfolio →
                </button>
              </GlassCard>
            )}
          </div>

          {/* Top spending categories */}
          {topSpendingCategories.length > 0 && (
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Top Categories</h2>
                <button
                  onClick={() => navigate('/spending')}
                  className="text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
                >
                  All spending →
                </button>
              </div>
              <div className="space-y-3">
                {topSpendingCategories.map(({ cat, amount }) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-white/60 font-medium capitalize">{cat}</p>
                      <p className="text-xs font-mono text-white/75">
                        {formatCurrency(amount, defaultCurrency)}
                      </p>
                    </div>
                    <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(amount / topSpendingCategories[0].amount) * 100}%`,
                          background: 'linear-gradient(90deg, #10B981, #34D399)',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

        </div>

        {/* ── RIGHT COLUMN (sticky rail) ── */}
        <div className="space-y-4 xl:sticky xl:top-6">

          {/* Recent Activity */}
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActivityFeedSettings({ showTransactions: !activityFeedShowTransactions })}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#10B981]/50 ${
                    activityFeedShowTransactions
                      ? 'bg-[#10B981]/20 text-[#10B981]'
                      : 'bg-white/5 text-white/30 hover:text-white/50'
                  }`}
                >
                  💳
                </button>
                <button
                  onClick={() => setActivityFeedSettings({ showRecurring: !activityFeedShowRecurring })}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#10B981]/50 ${
                    activityFeedShowRecurring
                      ? 'bg-[#10B981]/20 text-[#10B981]'
                      : 'bg-white/5 text-white/30 hover:text-white/50'
                  }`}
                >
                  🔄
                </button>
              </div>
            </div>

            {dueSoonActivity.length === 0 && recentTransactions.length === 0 ? (
              <EmptyState
                icon={!activityFeedShowTransactions && !activityFeedShowRecurring ? '👁️' : '📋'}
                title={
                  !activityFeedShowTransactions && !activityFeedShowRecurring
                    ? 'All feeds hidden'
                    : 'No recent activity'
                }
                description={
                  !activityFeedShowTransactions && !activityFeedShowRecurring
                    ? 'Use the toggles to show transactions or recurring payments.'
                    : 'Add your first transaction in Spending.'
                }
                action={
                  activityFeedShowTransactions || activityFeedShowRecurring ? (
                    <Button variant="secondary" size="sm" onClick={() => navigate('/spending')}>
                      Go to Spending
                    </Button>
                  ) : undefined
                }
                className="py-6"
              />
            ) : (
              <div className="space-y-0.5">
                {dueSoonActivity.length > 0 && (
                  <>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider px-1 pb-1.5">
                      Due soon
                    </p>
                    {dueSoonActivity.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-2.5 py-2.5 rounded-xl"
                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.10)' }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background: 'rgba(245,158,11,0.12)' }}
                          >
                            🔄
                          </span>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate leading-tight">{p.name}</p>
                            <p className="text-white/30 text-[11px] mt-0.5">{formatDate(p.nextDueDate, 'short')}</p>
                          </div>
                        </div>
                        <p className="font-mono text-sm font-semibold ml-2 flex-shrink-0" style={{ color: '#F59E0B' }}>
                          {formatCurrency(p.amount, p.currency ?? defaultCurrency)}
                        </p>
                      </div>
                    ))}
                  </>
                )}
                {recentTransactions.length > 0 && (
                  <>
                    {dueSoonActivity.length > 0 && (
                      <div className="pt-2 pb-1">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider px-1">Recent</p>
                      </div>
                    )}
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-2.5 py-2.5 rounded-xl hover:bg-white/[0.07] transition-colors"
                        style={{ background: 'rgba(255,255,255,0.035)' }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                          >
                            💳
                          </span>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate leading-tight">{tx.category}</p>
                            <p className="text-white/30 text-[11px] mt-0.5">{formatDate(tx.date, 'short')}</p>
                          </div>
                        </div>
                        <p
                          className="font-mono text-sm font-semibold ml-2 flex-shrink-0"
                          style={{ color: tx.type === 'expense' ? '#EF4444' : '#22C55E' }}
                        >
                          {tx.type === 'expense' ? '-' : '+'}
                          {formatCurrency(tx.convertedAmount, defaultCurrency)}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </GlassCard>

          {/* Top holdings */}
          {holdings.length > 0 && (
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Top Holdings</h2>
                <button
                  onClick={() => navigate('/portfolio')}
                  className="text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-1">
                {holdings
                  .sort((a, b) => b.currentValue - a.currentValue)
                  .slice(0, 5)
                  .map((h) => (
                    <div
                      key={h.ticker}
                      onClick={() => navigate('/portfolio')}
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#10B981] text-[9px] font-bold leading-none">
                            {h.ticker.slice(0, 3)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-xs leading-tight">{h.ticker}</p>
                          <p className="text-white/30 text-[10px]">
                            {h.sharesHeld % 1 === 0 ? h.sharesHeld.toFixed(0) : h.sharesHeld.toFixed(2)}{' '}
                            {h.sharesHeld === 1 ? 'share' : 'shares'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-white font-mono text-xs">
                          {formatCurrency(h.currentValue, defaultCurrency)}
                        </p>
                        <p
                          className="text-[10px] font-mono"
                          style={{ color: h.unrealizedGain >= 0 ? '#22C55E' : '#EF4444' }}
                        >
                          {h.unrealizedGain >= 0 ? '+' : ''}
                          {h.unrealizedGainPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </GlassCard>
          )}

        </div>
      </div>

      {/* Wealth Composition — full-width at bottom */}
      {totalAssets > 0 && wealthSegments.filter(s => s.value > 1).length > 0 && (
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white">Wealth Composition</h2>
            <p className="text-xs text-white/30">
              {formatCurrency(totalAssets, defaultCurrency)} total assets
            </p>
          </div>
          <WealthCompositionDonut
            segments={wealthSegments}
            total={totalAssets}
            liabilities={liabilitiesTotal}
            currency={defaultCurrency}
          />
        </GlassCard>
      )}

      {/* Welcome empty state */}
      {!hasAnyData && (
        <GlassCard padding="lg" className="text-center py-8">
          <p className="text-4xl mb-3">💰</p>
          <h3 className="text-white font-semibold mb-2">Welcome to NetWorth Tracker!</h3>
          <p className="text-white/40 text-sm mb-4">
            Start by adding your portfolio holdings, assets, or transactions.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" onClick={() => navigate('/portfolio')}>
              Add Holdings
            </Button>
            <Button variant="secondary" onClick={() => navigate('/spending')}>
              Add Transaction
            </Button>
            <Button variant="ghost" onClick={() => navigate('/settings')}>
              Add Assets
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
