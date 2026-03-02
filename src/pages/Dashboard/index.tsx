import { useEffect, useState, useMemo } from 'react';
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
  const userNickname = useSettingsStore((s) => s.userNickname);
  const activityFeedShowTransactions = useSettingsStore((s) => s.activityFeedShowTransactions);
  const activityFeedShowRecurring = useSettingsStore((s) => s.activityFeedShowRecurring);
  const setActivityFeedSettings = useSettingsStore((s) => s.setActivityFeedSettings);

  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>(TREND_PERIODS[1]); // 3M default

  // Calculate current net worth
  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates),
    [trades, currentPrices, lastPriceUpdates]
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
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';

  const isMobile = useIsMobile();

  // ── Mobile view ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-4 pb-24">
        {/* Net Worth card */}
        <GlassCard padding="lg">
          <p className="text-white/40 text-sm mb-1">{greeting}{userNickname ? `, ${userNickname}` : ''} 👋</p>
          <p className="text-white/50 text-xs mb-2">Net Worth</p>
          <h1 className="text-3xl font-bold text-white font-mono">
            {formatCurrency(netWorth, defaultCurrency, true)}
          </h1>
          {netWorthChange && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-sm font-mono ${netWorthChange.amount >= 0 ? 'text-[#00d632]' : 'text-[#ff4757]'}`}>
                {netWorthChange.amount >= 0 ? '+' : ''}{formatCurrency(netWorthChange.amount, defaultCurrency, true)}
              </span>
              <span className={`text-xs font-mono ${netWorthChange.amount >= 0 ? 'text-[#00d632]' : 'text-[#ff4757]'}`}>
                ({netWorthChange.percent >= 0 ? '+' : ''}{netWorthChange.percent.toFixed(2)}%)
              </span>
            </div>
          )}
          {/* Mini stats row */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-white/8">
            <div className="flex-1">
              <p className="text-white/40 text-xs">This Month</p>
              <p className="text-white font-mono font-semibold text-sm mt-0.5">
                -{formatCurrency(monthSpending, defaultCurrency, true)}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-white/40 text-xs">Assets</p>
              <p className="text-[#00d632] font-mono font-semibold text-sm mt-0.5">
                {formatCurrency(totalAssets, defaultCurrency, true)}
              </p>
            </div>
            {liabilitiesTotal > 0 && (
              <div className="flex-1">
                <p className="text-white/40 text-xs">Liabilities</p>
                <p className="text-[#ff4757] font-mono font-semibold text-sm mt-0.5">
                  {formatCurrency(liabilitiesTotal, defaultCurrency, true)}
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard padding="md">
          <h2 className="text-base font-semibold text-white mb-3">Recent Activity</h2>
          {activityItems.length > 0 ? (
            <div className="space-y-2">
              {activityItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.emoji}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{item.label}</p>
                      <p className="text-white/30 text-xs">{formatDate(item.date, 'short')}</p>
                    </div>
                  </div>
                  <p className={`font-mono text-sm font-semibold ${item.amountType === 'expense' ? 'text-[#ff4757]' : 'text-[#00d632]'}`}>
                    {item.amountType === 'expense' ? '-' : '+'}{formatCurrency(item.amount, defaultCurrency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center py-6">No recent activity — use the + button to add your first entry</p>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Net Worth Hero */}
      <GlassCard padding="lg">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-sm mb-1">{greeting}{userNickname ? `, ${userNickname}` : ''} 👋</p>
              <p className="text-white/50 text-sm mb-3">Your Net Worth</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-mono">
                {formatCurrency(netWorth, defaultCurrency, true)}
              </h1>

              {netWorthChange && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-sm font-mono ${netWorthChange.amount >= 0 ? 'text-[#00d632]' : 'text-[#ff4757]'}`}>
                    {netWorthChange.amount >= 0 ? '+' : ''}{formatCurrency(netWorthChange.amount, defaultCurrency, true)}
                  </span>
                  <span className={`text-sm font-mono ${netWorthChange.amount >= 0 ? 'text-[#00d632]' : 'text-[#ff4757]'}`}>
                    ({netWorthChange.percent >= 0 ? '+' : ''}{netWorthChange.percent.toFixed(2)}%)
                  </span>
                  <span className="text-white/30 text-xs">vs {selectedPeriod.label} ago</span>
                </div>
              )}
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-1">
            {TREND_PERIODS.map((period) => (
              <button
                key={period.label}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedPeriod.label === period.label
                    ? 'bg-[#5865f2] text-white'
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard padding="md">
          <p className="text-white/50 text-sm mb-2">Total Assets</p>
          <h3 className="text-xl sm:text-2xl font-bold text-[#00d632] font-mono">
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
          <p className="text-white/50 text-sm mb-2">Total Liabilities</p>
          <h3 className="text-xl sm:text-2xl font-bold text-[#ff4757] font-mono">
            {formatCurrency(liabilitiesTotal, defaultCurrency, true)}
          </h3>
          {liabilitiesTotal === 0 && <p className="text-xs text-white/30 mt-2">No liabilities 🎉</p>}
        </GlassCard>

        <GlassCard padding="md">
          <p className="text-white/50 text-sm mb-2">This Month Spending</p>
          <h3 className="text-xl sm:text-2xl font-bold text-white font-mono">
            {formatCurrency(monthSpending, defaultCurrency, true)}
          </h3>
          <p className="text-xs text-white/30 mt-2">{monthTransactions.length} transactions</p>
        </GlassCard>
      </div>

      {/* FIRE Progress */}
      {fireTarget && fireProgress !== null && (
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/50 text-sm">🔥 FIRE Progress</p>
              <p className="text-white/30 text-xs mt-0.5">Target: {formatCurrency(fireTarget, defaultCurrency, true)}</p>
            </div>
            <div className="text-right">
              <Badge variant={fireProgress >= 100 ? 'green' : 'blue'}>{fireProgress.toFixed(1)}%</Badge>
              {fireRemaining !== null && fireRemaining > 0 && (
                <p className="text-xs text-white/30 mt-1">{formatCurrency(fireRemaining, defaultCurrency, true)} to go</p>
              )}
              {fireProgress >= 100 && <p className="text-xs text-[#00d632] mt-1">🎉 You've reached FIRE!</p>}
            </div>
          </div>
          <ProgressBar value={fireProgress} max={100} color={fireProgress >= 100 ? 'green' : 'blue'} />
        </GlassCard>
      )}

      {/* Portfolio Top Holdings */}
      {holdings.length > 0 && (
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Top Holdings</h2>
            <button onClick={() => navigate('/portfolio')} className="text-[#5865f2] text-sm hover:text-[#5865f2]/70 transition-colors">
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {holdings.slice(0, 5).map((h) => (
              <div key={h.ticker} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#5865f2]/20 flex items-center justify-center">
                    <span className="text-[#5865f2] text-xs font-bold">{h.ticker.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{h.ticker}</p>
                    <p className="text-white/30 text-xs">{h.sharesHeld} shares</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-mono text-sm">{formatCurrency(h.currentValue, defaultCurrency, true)}</p>
                  <p className={`text-xs font-mono ${h.unrealizedGain >= 0 ? 'text-[#00d632]' : 'text-[#ff4757]'}`}>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivityFeedSettings({ showTransactions: !activityFeedShowTransactions })}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${activityFeedShowTransactions ? 'bg-[#5865f2]/20 text-[#5865f2]' : 'bg-white/5 text-white/30'}`}
            >
              💳 Tx
            </button>
            <button
              onClick={() => setActivityFeedSettings({ showRecurring: !activityFeedShowRecurring })}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${activityFeedShowRecurring ? 'bg-[#5865f2]/20 text-[#5865f2]' : 'bg-white/5 text-white/30'}`}
            >
              🔄 Rec
            </button>
          </div>
        </div>

        {activityItems.length > 0 ? (
          <div className="space-y-2">
            {activityItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.emoji}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-white/30 text-xs">{formatDate(item.date, 'short')}</p>
                  </div>
                </div>
                <p className={`font-mono text-sm font-semibold ${item.amountType === 'expense' ? 'text-[#ff4757]' : 'text-[#00d632]'}`}>
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
            className="py-8"
          />
        )}
      </GlassCard>

      {/* Empty state if no data */}
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
