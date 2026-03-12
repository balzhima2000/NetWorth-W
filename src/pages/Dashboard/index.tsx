import { useEffect, useState, useMemo, useRef } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { GlassCard, Badge, Button, ProgressBar, EmptyState } from '../../components/ui';
import { formatCurrency, formatDate, getCurrentMonthYear } from '../../utils/formatters';
import { calculateCurrentHoldings } from '../../utils/calculations';
import { NetWorthLineChart } from '../../components/charts/NetWorthLineChart';
import { TREND_PERIODS } from '../../utils/constants';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';

type TrendPeriod = typeof TREND_PERIODS[number];

export default function Dashboard() {
  const navigate = useNavigate();

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

  const fireTarget = useSettingsStore((s) => s.fireTarget);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const userNickname = useSettingsStore((s) => s.userNickname);
  const activityFeedShowTransactions = useSettingsStore((s) => s.activityFeedShowTransactions);
  const activityFeedShowRecurring = useSettingsStore((s) => s.activityFeedShowRecurring);
  const setActivityFeedSettings = useSettingsStore((s) => s.setActivityFeedSettings);

  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>(TREND_PERIODS[1]); // 3M default

  // Calculate current net worth
  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates]
  );
  const portfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const assetsTotal = manualEntries.filter((e) => !e.isLiability).reduce((sum, e) => sum + e.value, 0);
  const liabilitiesTotal = manualEntries.filter((e) => e.isLiability).reduce((sum, e) => sum + e.value, 0);
  const totalAssets = portfolioValue + assetsTotal;
  const netWorth = totalAssets - liabilitiesTotal;

  // Page title
  useEffect(() => { document.title = 'Dashboard — NetWorth Tracker'; }, []);

  // Take daily snapshot
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
        manualAssetsTotal: assetsTotal,
      });
    }
  }, [trades, manualEntries, currentPrices]);

  // Chart data
  const chartData = useMemo(() => {
    return getSnapshotsByRange(selectedPeriod.days);
  }, [snapshots, selectedPeriod]);

  // Net worth change vs previous snapshot
  const netWorthChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].netWorth;
    const last = chartData[chartData.length - 1].netWorth;
    return { amount: last - first, percent: first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0 };
  }, [chartData]);

  // Current month spending
  const { month, year } = getCurrentMonthYear();
  const monthTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year && t.type === 'expense';
  });
  const monthSpending = monthTransactions.reduce((sum, t) => sum + t.convertedAmount, 0);

  // FIRE progress
  const fireProgress = fireTarget ? Math.min((netWorth / fireTarget) * 100, 100) : null;
  const fireRemaining = fireTarget ? Math.max(fireTarget - netWorth, 0) : null;

  // Activity feed
  const activityItems = useMemo(() => {
    const items: Array<{ id: string; type: 'transaction' | 'recurring'; date: string; label: string; amount: number; amountType: 'expense' | 'income' | 'neutral'; emoji: string }> = [];

    if (activityFeedShowTransactions) {
      transactions.slice(-20).reverse().forEach((tx) => {
        items.push({
          id: tx.id, type: 'transaction', date: tx.date,
          label: tx.category, amount: tx.convertedAmount,
          amountType: tx.type, emoji: '💳',
        });
      });
    }

    if (activityFeedShowRecurring) {
      recurringPayments.filter(p => p.isActive).forEach((p) => {
        items.push({
          id: p.id, type: 'recurring', date: p.nextDueDate,
          label: `${p.name} (due)`, amount: p.amount,
          amountType: p.type, emoji: '🔄',
        });
      });
    }

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  }, [transactions, recurringPayments, activityFeedShowTransactions, activityFeedShowRecurring]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 5 ? 'Good Night' : greetingHour < 12 ? 'Good Morning' : greetingHour < 18 ? 'Good Afternoon' : 'Good Evening';
  const greetingEmoji = greetingHour < 5 ? '🌙' : greetingHour < 12 ? '☀️' : greetingHour < 18 ? '🌤️' : '🌆';

  const isMobile = useIsMobile();

  // ── Count-up animation for the hero number ──────────────────
  const [displayNetWorth, setDisplayNetWorth] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isMobile) return;
    if (hasAnimated.current) {
      // After initial animation, track real value instantly
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
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayNetWorth(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [netWorth, isMobile]);

  // ── Mobile view ──────────────────────────────────────────────
  if (isMobile) {
    const isPositive = netWorthChange ? netWorthChange.amount >= 0 : true;
    const changeColor = isPositive ? '#22C55E' : '#EF4444';

    return (
      <div className="space-y-3 stagger-children">
        {/* ── Greeting ── */}
        <div className="pt-1">
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-0.5">
            {greeting} {greetingEmoji}
          </p>
          <h2 className="text-lg font-semibold text-white leading-tight">
            {userNickname ? userNickname : 'Your Dashboard'}
          </h2>
        </div>

        {/* ── Net Worth hero card ── */}
        <GlassCard padding="lg">
          {/* Label + change badge row */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/45 text-xs font-medium uppercase tracking-widest">Net Worth</p>
            {netWorthChange && (
              <span
                className="text-xs font-semibold font-mono px-2.5 py-1 rounded-full"
                style={{
                  background: `${changeColor}18`,
                  color: changeColor,
                  border: `1px solid ${changeColor}30`,
                }}
              >
                {isPositive ? '+' : ''}{netWorthChange.percent.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Animated number */}
          <h1
            className="text-4xl font-bold text-white font-mono leading-none"
            style={{ letterSpacing: '-0.5px' }}
          >
            {formatCurrency(displayNetWorth, defaultCurrency, true)}
          </h1>

          {netWorthChange && (
            <p className="text-sm font-mono mt-1.5" style={{ color: changeColor }}>
              {isPositive ? '+' : ''}{formatCurrency(netWorthChange.amount, defaultCurrency, true)}
              <span className="text-white/30 ml-1.5 text-xs">vs period start</span>
            </p>
          )}

          {/* ── Stats strip ── */}
          <div
            className="grid mt-4 pt-4 gap-3"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              gridTemplateColumns: liabilitiesTotal > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            }}
          >
            <div>
              <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider">This Month</p>
              <p className="text-white font-mono font-semibold text-sm mt-1">
                -{formatCurrency(monthSpending, defaultCurrency, true)}
              </p>
            </div>
            <div>
              <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider">Assets</p>
              <p className="font-mono font-semibold text-sm mt-1" style={{ color: '#22C55E' }}>
                {formatCurrency(totalAssets, defaultCurrency, true)}
              </p>
            </div>
            {liabilitiesTotal > 0 && (
              <div>
                <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider">Debt</p>
                <p className="font-mono font-semibold text-sm mt-1" style={{ color: '#EF4444' }}>
                  {formatCurrency(liabilitiesTotal, defaultCurrency, true)}
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* ── FIRE progress (only if target set) ── */}
        {fireProgress !== null && (
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-white/70 text-sm font-semibold">🔥 FIRE Progress</p>
              <span className="text-xs font-mono text-white/40">
                {fireProgress.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${fireProgress}%`,
                  background: 'linear-gradient(90deg, #10B981, #22C55E)',
                  transition: 'width 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </div>
            {fireRemaining !== null && fireRemaining > 0 && (
              <p className="text-white/35 text-xs mt-2">
                {formatCurrency(fireRemaining, defaultCurrency, true)} to go
              </p>
            )}
          </GlassCard>
        )}

        {/* ── Recent Activity ── */}
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            {activityItems.length > 0 && (
              <span className="text-xs text-white/30">{activityItems.length} items</span>
            )}
          </div>

          {activityItems.length > 0 ? (
            <div className="space-y-1.5">
              {activityItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    transition: 'transform 150ms ease, background 150ms ease',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Icon circle */}
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      {item.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate leading-tight">
                        {item.label}
                      </p>
                      <p className="text-white/30 text-[11px] mt-0.5">
                        {formatDate(item.date, 'short')}
                      </p>
                    </div>
                  </div>
                  <p
                    className="font-mono text-sm font-semibold ml-3 flex-shrink-0"
                    style={{ color: item.amountType === 'expense' ? '#EF4444' : '#22C55E' }}
                  >
                    {item.amountType === 'expense' ? '-' : '+'}
                    {formatCurrency(item.amount, defaultCurrency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-white/30 text-sm">No recent activity</p>
              <p className="text-white/20 text-xs mt-0.5">Tap + to add your first entry</p>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Greeting header — full width */}
      <div>
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">
          {greeting} {greetingEmoji}
        </p>
        <h2 className="text-2xl font-bold text-white mt-0.5">
          {userNickname ? `Hello, ${userNickname}` : 'Dashboard'}
        </h2>
      </div>

      {/* 2-column layout on xl+ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* ── LEFT COLUMN: Hero + Summary ── */}
        <div className="space-y-5">

          {/* Net Worth Hero */}
          <GlassCard padding="lg">
            <div className="space-y-4">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Net Worth</p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-mono" style={{ letterSpacing: '-0.5px' }}>
                  {formatCurrency(netWorth, defaultCurrency, true)}
                </h1>

                {netWorthChange && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-sm font-mono font-semibold ${netWorthChange.amount >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {netWorthChange.amount >= 0 ? '+' : ''}{formatCurrency(netWorthChange.amount, defaultCurrency, true)}
                    </span>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: `${netWorthChange.amount >= 0 ? '#22C55E' : '#EF4444'}18`,
                        color: netWorthChange.amount >= 0 ? '#22C55E' : '#EF4444',
                        border: `1px solid ${netWorthChange.amount >= 0 ? '#22C55E' : '#EF4444'}30`,
                      }}
                    >
                      {netWorthChange.percent >= 0 ? '+' : ''}{netWorthChange.percent.toFixed(2)}%
                    </span>
                    <span className="text-white/25 text-xs">vs {selectedPeriod.label} ago</span>
                  </div>
                )}
              </div>

              {/* Period Selector */}
              <div className="flex gap-1">
                {TREND_PERIODS.map((period) => (
                  <button
                    key={period.label}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 ${
                      selectedPeriod.label === period.label
                        ? 'bg-[#10B981] text-white'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* Chart */}
              {chartData.length > 1 ? (
                <NetWorthLineChart data={chartData} currency={defaultCurrency} />
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-white/20 text-sm">Not enough data to show a chart yet — check back tomorrow</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <GlassCard padding="md">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Total Assets</p>
              <h3 className="text-xl font-bold text-[#22C55E] font-mono">
                {formatCurrency(totalAssets, defaultCurrency, true)}
              </h3>
              <div className="mt-2 space-y-0.5">
                {portfolioValue > 0 && (
                  <p className="text-xs text-white/30">Portfolio: {formatCurrency(portfolioValue, defaultCurrency, true)}</p>
                )}
                {assetsTotal > 0 && (
                  <p className="text-xs text-white/30">Other: {formatCurrency(assetsTotal, defaultCurrency, true)}</p>
                )}
              </div>
            </GlassCard>

            <GlassCard padding="md">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Liabilities</p>
              <h3 className="text-xl font-bold text-[#EF4444] font-mono">
                {formatCurrency(liabilitiesTotal, defaultCurrency, true)}
              </h3>
              {liabilitiesTotal === 0 && <p className="text-xs text-white/25 mt-2">None 🎉</p>}
            </GlassCard>

            <GlassCard padding="md">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Month Spending</p>
              <h3 className="text-xl font-bold text-white font-mono">
                {formatCurrency(monthSpending, defaultCurrency, true)}
              </h3>
              <p className="text-xs text-white/30 mt-2">{monthTransactions.length} transactions</p>
            </GlassCard>
          </div>

        </div>

        {/* ── RIGHT COLUMN: sticky secondary panel ── */}
        <div className="space-y-4 xl:sticky xl:top-6 stagger-children">

          {/* FIRE Progress */}
          {fireTarget && fireProgress !== null && (
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/70 text-sm font-semibold">🔥 FIRE Progress</p>
                  <p className="text-white/30 text-xs mt-0.5">Target: {formatCurrency(fireTarget, defaultCurrency, true)}</p>
                </div>
                <div className="text-right">
                  <Badge variant={fireProgress >= 100 ? 'green' : 'blue'}>{fireProgress.toFixed(1)}%</Badge>
                  {fireRemaining !== null && fireRemaining > 0 && (
                    <p className="text-xs text-white/30 mt-1">{formatCurrency(fireRemaining, defaultCurrency, true)} to go</p>
                  )}
                  {fireProgress >= 100 && <p className="text-xs text-[#22C55E] mt-1">🎉 You've reached FIRE!</p>}
                </div>
              </div>
              <ProgressBar value={fireProgress} max={100} color={fireProgress >= 100 ? 'green' : 'blue'} />
            </GlassCard>
          )}

          {/* Portfolio Top Holdings */}
          {holdings.length > 0 && (
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Top Holdings</h2>
                <button
                  onClick={() => navigate('/portfolio')}
                  className="text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 rounded px-1"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-1.5">
                {holdings.slice(0, 5).map((h) => (
                  <div
                    key={h.ticker}
                    onClick={() => navigate('/portfolio')}
                    className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#10B981] text-[10px] font-bold leading-none">{h.ticker.slice(0, 3)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm leading-tight">{h.ticker}</p>
                        <p className="text-white/30 text-[11px]">{h.sharesHeld.toFixed(2)} shares</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-white font-mono text-sm">{formatCurrency(h.currentValue, defaultCurrency, true)}</p>
                      <p className={`text-[11px] font-mono ${h.unrealizedGain >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {h.unrealizedGain >= 0 ? '+' : ''}{h.unrealizedGainPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Activity Feed */}
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActivityFeedSettings({ showTransactions: !activityFeedShowTransactions })}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 ${activityFeedShowTransactions ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-white/5 text-white/30 hover:text-white/50'}`}
                >
                  💳 Tx
                </button>
                <button
                  onClick={() => setActivityFeedSettings({ showRecurring: !activityFeedShowRecurring })}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 ${activityFeedShowRecurring ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-white/5 text-white/30 hover:text-white/50'}`}
                >
                  🔄 Rec
                </button>
              </div>
            </div>

            {activityItems.length > 0 ? (
              <div className="space-y-1.5">
                {activityItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/[0.08] transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        {item.emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate leading-tight">{item.label}</p>
                        <p className="text-white/30 text-[10px] mt-0.5">{formatDate(item.date, 'short')}</p>
                      </div>
                    </div>
                    <p
                      className="font-mono text-xs font-semibold ml-2 flex-shrink-0"
                      style={{ color: item.amountType === 'expense' ? '#EF4444' : '#22C55E' }}
                    >
                      {item.amountType === 'expense' ? '-' : '+'}{formatCurrency(item.amount, defaultCurrency)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={!activityFeedShowTransactions && !activityFeedShowRecurring ? '👁️' : '📋'}
                title={!activityFeedShowTransactions && !activityFeedShowRecurring ? 'All feeds hidden' : 'No recent activity'}
                description={!activityFeedShowTransactions && !activityFeedShowRecurring
                  ? 'Use the toggles above to show transactions or recurring payments.'
                  : 'Add your first transaction in Spending to see activity here.'}
                action={activityFeedShowTransactions || activityFeedShowRecurring
                  ? <Button variant="secondary" size="sm" onClick={() => navigate('/spending')}>Go to Spending</Button>
                  : undefined
                }
                className="py-6"
              />
            )}
          </GlassCard>

        </div>
      </div>

      {/* Empty state if no data — full width */}
      {holdings.length === 0 && totalAssets === 0 && transactions.length === 0 && (
        <GlassCard padding="lg" className="text-center py-8">
          <p className="text-4xl mb-3">💰</p>
          <h3 className="text-white font-semibold mb-2">Welcome to NetWorth Tracker!</h3>
          <p className="text-white/40 text-sm mb-4">Start by adding your portfolio holdings, assets, or transactions.</p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" onClick={() => navigate('/portfolio')}>Add Holdings</Button>
            <Button variant="secondary" onClick={() => navigate('/spending')}>Add Transaction</Button>
            <Button variant="ghost" onClick={() => navigate('/settings')}>Add Assets</Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
