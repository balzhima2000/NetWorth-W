import { useState, useMemo, useEffect } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useQuickAddStore } from '../../stores/quickAddStore';
import { useToast } from '../../hooks/useToast';
import { useAllocationStore } from '../../stores/allocationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNetWorthStore } from '../../stores/networthStore';
import {
  GlassCard, Button, AssetCategoryBadge, Modal, ConfirmDialog,
  Input, Select, Drawer, EmptyState, Tabs,
} from '../../components/ui';
import { AllocationPieChart } from '../../components/charts/AllocationPieChart';
import { formatCurrency, formatDate, formatRelativeTime, getTodayISO } from '../../utils/formatters';
import { calculateCurrentHoldings } from '../../utils/calculations';
import { ASSET_CATEGORIES, ALPHA_VANTAGE_MAX_REQUESTS, CURRENCIES } from '../../utils/constants';
import { fetchStockQuote, searchSymbol, fetchHistoricalPrice } from '../../services/alphaVantage';
import { fetchTaseSecurityPrice, fetchTaseHistoricalPrice } from '../../services/taseDataHub';
import { searchCoin } from '../../services/coinGecko';
import { fetchCoinlayerLivePrices, fetchCoinlayerHistoricalPrice } from '../../services/coinlayer';
import { useAutoFetchExchangeRates } from '../../hooks/useAutoFetchExchangeRates';
import { ExcelImportModal } from './ExcelImportModal';
import PlannerPage from './PlannerPage';
import type { ImportRow } from '../../services/excelImport';
import type { StockTrade, CurrentHolding } from '../../types/index';

type AssetCategory = 'stocks' | 'bonds' | 'crypto' | 'other';

export default function Portfolio() {
  const trades = usePortfolioStore((s) => s.trades);
  const currentPrices = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);
  const addTrade = usePortfolioStore((s) => s.addTrade);
  const updateTrade = usePortfolioStore((s) => s.updateTrade);
  const deleteTrade = usePortfolioStore((s) => s.deleteTrade);
  const updateCurrentPrice = usePortfolioStore((s) => s.updateCurrentPrice);
  const priceSources = usePortfolioStore((s) => s.priceSources);

  const allocationMode = useAllocationStore((s) => s.mode);
  const allocationTargets = useAllocationStore((s) => s.targets);
  const setAllocation = useAllocationStore((s) => s.setAllocation);

  const portfolioMode = useSettingsStore((s) => s.portfolioMode);
  const setPortfolioMode = useSettingsStore((s) => s.setPortfolioMode);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const stocksApiKey = useSettingsStore((s) => s.stocksApiKey);
  const stocksRequestsToday = useSettingsStore((s) => s.stocksRequestsToday);
  const decrementStocksRequests = useSettingsStore((s) => s.decrementStocksRequests);
  const resetRequestsIfNewDay = useSettingsStore((s) => s.resetRequestsIfNewDay);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const israeliApiKey = useSettingsStore((s) => s.israeliApiKey);
  const cryptoApiKey = useSettingsStore((s) => s.cryptoApiKey);

  const manualEntries = useNetWorthStore((s) => s.manualEntries);
  const deleteManualEntry = useNetWorthStore((s) => s.deleteManualEntry);

  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates]
  );

  useAutoFetchExchangeRates(trades);

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.costBasisTotal, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const pieData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    holdings.forEach((h) => {
      byCategory[h.assetCategory] = (byCategory[h.assetCategory] ?? 0) + h.currentValue;
    });
    return Object.entries(byCategory).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [holdings]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState('');
  const requestsRemaining = ALPHA_VANTAGE_MAX_REQUESTS - stocksRequestsToday;

  // Can refresh if there are global holdings with a stocks API key + quota, or TASE holdings with an Israeli API key
  const hasRefreshableGlobal = holdings.some((h) => (h.market ?? 'global') === 'global' && h.assetCategory !== 'crypto') && !!stocksApiKey && requestsRemaining > 0;
  const hasRefreshableTase = holdings.some((h) => h.market === 'tase') && !!israeliApiKey;
  const hasRefreshableCrypto = holdings.some((h) => h.assetCategory === 'crypto') && !!cryptoApiKey;
  const canRefreshPrices = hasRefreshableGlobal || hasRefreshableTase || hasRefreshableCrypto;

  const [showTradeModal, setShowTradeModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<StockTrade | null>(null);
  const [drawerTicker, setDrawerTicker] = useState<string | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [tradeDate, setTradeDate] = useState(getTodayISO());
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('stocks');
  const [tradeNotes, setTradeNotes] = useState('');
  const [tradeCurrency, setTradeCurrency] = useState('USD');
  const [fetchingHistoricalPrice, setFetchingHistoricalPrice] = useState(false);
  const [inputMode, setInputMode] = useState<'units' | 'amount'>('units');
  const [totalAmount, setTotalAmount] = useState('');
  const [lookingUpName, setLookingUpName] = useState(false);
  const [tickerError, setTickerError] = useState('');
  const [tradeMkt, setTradeMkt] = useState<'global' | 'tase'>('global');
  const [deleteTradeId, setDeleteTradeId] = useState<string | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [sortBy, setSortBy] = useState<'value' | 'gain' | 'return'>('value');
  const [activeTab, setActiveTab] = useState<'holdings' | 'planner'>('holdings');

  const [showExcelImport, setShowExcelImport] = useState(false);

  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocMode, setAllocMode] = useState<'none' | 'category' | 'individual'>(allocationMode);
  const [allocTargets, setAllocTargets] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(allocationTargets).map(([k, v]) => [k, String(v)]))
  );

  const toast = useToast();

  // Page title
  useEffect(() => { document.title = 'Portfolio — NetWorth Tracker'; }, []);

  // Quick-add FAB handler
  const quickAddTarget = useQuickAddStore((s) => s.target);
  const setQuickAddTarget = useQuickAddStore((s) => s.setTarget);
  useEffect(() => {
    if (quickAddTarget === 'trade') {
      openAddTrade();
      setQuickAddTarget(null);
    }
  }, [quickAddTarget]);

  const openAddTrade = (forTicker?: string) => {
    setEditingTrade(null);
    setTradeType('buy');
    setTicker(forTicker ?? '');
    setCompanyName('');
    setQuantity('');
    setPrice('');
    setTradeDate(getTodayISO());
    setAssetCategory('stocks');
    setTradeNotes('');
    setTickerError('');
    setTradeCurrency('USD');
    setTradeMkt('global');
    setInputMode('units');
    setTotalAmount('');
    setShowTradeModal(true);
  };

  const openEditTrade = (trade: StockTrade) => {
    setEditingTrade(trade);
    setTradeType(trade.sellPrice !== null ? 'sell' : 'buy');
    setTicker(trade.ticker);
    setCompanyName(trade.name);
    setQuantity(String(trade.quantity));
    setPrice(String(trade.sellPrice !== null ? trade.sellPrice : trade.buyPrice));
    setTradeDate(trade.sellPrice !== null ? (trade.sellDate ?? getTodayISO()) : trade.buyDate);
    setAssetCategory(trade.assetCategory);
    setTradeNotes(trade.notes);
    setTickerError('');
    setTradeCurrency(trade.currency ?? defaultCurrency);
    setTradeMkt(trade.market ?? 'global');
    setShowTradeModal(true);
  };

  const handleTickerBlur = async () => {
    if (!ticker || companyName) return;
    if (assetCategory === 'crypto') {
      setLookingUpName(true);
      try {
        const results = await searchCoin(ticker);
        if (results.length > 0) {
          setCompanyName(results[0].name);
          setTicker(results[0].symbol); // store uppercase symbol (BTC, ETH) for Coinlayer
        }
      } catch {}
      setLookingUpName(false);
      return;
    }
    if (!stocksApiKey) return;
    setLookingUpName(true);
    try {
      const result = await searchSymbol(ticker, stocksApiKey);
      if (result) setCompanyName(result.name);
    } catch {}
    setLookingUpName(false);
  };

  const validateSell = (): boolean => {
    if (tradeType !== 'sell') return true;
    const finalTick = ticker.toUpperCase();
    const holding = holdings.find((h) => h.ticker === finalTick);
    const qty = parseFloat(quantity);
    if (!holding || qty > holding.sharesHeld) {
      setTickerError(`You only hold ${holding?.sharesHeld ?? 0} of ${finalTick}`);
      return false;
    }
    setTickerError('');
    return true;
  };

  const handleFetchHistoricalPrice = async () => {
    if (!ticker || !tradeDate) return;
    setFetchingHistoricalPrice(true);
    try {
      let fetched: number;
      if (assetCategory === 'crypto') {
        if (!cryptoApiKey) throw new Error('Add your Coinlayer API key in Settings first.');
        fetched = await fetchCoinlayerHistoricalPrice(ticker.toUpperCase(), tradeDate, cryptoApiKey);
      } else if (tradeMkt === 'tase') {
        if (!israeliApiKey) throw new Error('Add your TASE API key in Settings first.');
        fetched = await fetchTaseHistoricalPrice(parseInt(ticker), tradeDate, israeliApiKey);
      } else {
        if (!stocksApiKey) throw new Error('Add your Stocks API key in Settings first.');
        fetched = await fetchHistoricalPrice(ticker, tradeDate, stocksApiKey);
        decrementStocksRequests();
      }
      setPrice(fetched.toString());
      toast.success(`Closing price for ${tradeDate} fetched.`);
    } catch (e: any) {
      toast.error(e.message || 'Could not fetch historical price.');
    } finally {
      setFetchingHistoricalPrice(false);
    }
  };

  const handleSaveTrade = () => {
    const needsQty = inputMode === 'units' ? !quantity : !totalAmount;
    if (!ticker || needsQty || !price) return;
    if (!validateSell()) return;
    const upperTicker = assetCategory === 'crypto' ? ticker.toLowerCase() : ticker.toUpperCase();
    const px = parseFloat(price); // stored in native currency (tradeCurrency), no conversion
    const qty = inputMode === 'amount' ? parseFloat(totalAmount) / px : parseFloat(quantity);
    if (editingTrade) {
      updateTrade(editingTrade.id, {
        ticker: upperTicker, name: companyName || upperTicker, quantity: qty,
        buyPrice: tradeType === 'buy' ? px : editingTrade.buyPrice,
        buyDate: tradeType === 'buy' ? tradeDate : editingTrade.buyDate,
        sellPrice: tradeType === 'sell' ? px : null,
        sellDate: tradeType === 'sell' ? tradeDate : null,
        assetCategory, notes: tradeNotes, market: tradeMkt,
      });
    } else {
      const buyRateToDefault =
        tradeCurrency === defaultCurrency
          ? 1
          : (exchangeRates.find((r) => r.currency === tradeCurrency)?.rateToDefault ?? 1);
      addTrade({
        id: crypto.randomUUID(), ticker: upperTicker, name: companyName || upperTicker,
        quantity: qty, buyPrice: tradeType === 'buy' ? px : 0,
        buyDate: tradeType === 'buy' ? tradeDate : getTodayISO(),
        sellPrice: tradeType === 'sell' ? px : null,
        sellDate: tradeType === 'sell' ? tradeDate : null,
        assetCategory, notes: tradeNotes, market: tradeMkt,
        currency: tradeCurrency,
        buyRateToDefault, // locked at entry time, never updated
      });
    }
    setShowTradeModal(false);
    toast.success(editingTrade ? 'Trade updated.' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} trade recorded for ${upperTicker}.`);
  };

  const handleRefreshPrices = async () => {
    const cryptoHoldings = holdings.filter((h) => h.assetCategory === 'crypto');
    const globalHoldings = holdings.filter((h) => (h.market ?? 'global') === 'global' && h.assetCategory !== 'crypto');
    const taseHoldings = holdings.filter((h) => h.market === 'tase');
    if (globalHoldings.length > 0 && !stocksApiKey && taseHoldings.length === 0 && cryptoHoldings.length === 0) {
      toast.error('Add your Alpha Vantage Stocks API key in Settings first.');
      return;
    }
    if (refreshing) return;
    resetRequestsIfNewDay();
    setRefreshing(true);
    const total = holdings.length;
    let done = 0;

    // ── Global holdings (Alpha Vantage) ──
    for (const h of globalHoldings) {
      if (!stocksApiKey) break;
      if (stocksRequestsToday + done >= ALPHA_VANTAGE_MAX_REQUESTS) {
        setRefreshProgress(`Rate limit reached after ${done} updates`);
        break;
      }
      setRefreshProgress(`Updating ${h.ticker} (${done + 1}/${total})...`);
      try {
        const quote = await fetchStockQuote(h.ticker, stocksApiKey);
        updateCurrentPrice(h.ticker, quote.price);
        decrementStocksRequests();
        done++;
      } catch (e: any) {
        if (e.message === 'Rate limit reached') break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    // ── TASE holdings (TASE DataHub) ──
    for (const h of taseHoldings) {
      if (!israeliApiKey) continue;
      setRefreshProgress(`Updating ${h.ticker} (${done + 1}/${total})...`);
      try {
        const price = await fetchTaseSecurityPrice(parseInt(h.ticker), israeliApiKey);
        updateCurrentPrice(h.ticker, price);
        done++;
      } catch { /* silent fail per holding */ }
      await new Promise((r) => setTimeout(r, 300));
    }

    // ── Crypto holdings (Coinlayer) ──
    if (cryptoHoldings.length > 0) {
      if (!cryptoApiKey) {
        toast.error('Add your Coinlayer API key in Settings to refresh crypto prices.');
      } else {
        setRefreshProgress('Updating crypto prices...');
        try {
          const prices = await fetchCoinlayerLivePrices(cryptoHoldings.map((h) => h.ticker), cryptoApiKey);
          for (const h of cryptoHoldings) {
            const p = prices[h.ticker];
            if (p != null) { updateCurrentPrice(h.ticker, p); done++; }
          }
        } catch (e: any) {
          toast.error(e.message || 'Crypto price refresh failed.');
        }
      }
    }

    if (done === total) {
      toast.success(`Prices updated for all ${done} holding${done !== 1 ? 's' : ''}.`);
    } else if (done > 0) {
      toast.info(`Updated ${done} of ${total} tickers.`);
    } else {
      toast.error('Price refresh failed. Check your API keys in Settings.');
    }
    setRefreshProgress(done === total ? `✅ Updated ${done} tickers` : `Updated ${done} of ${total}`);
    setTimeout(() => setRefreshProgress(''), 4000);
    setRefreshing(false);
  };

  const handleSwitchToDetailed = () => {
    const portfolioEntry = manualEntries.find((e) => e.name.toLowerCase().includes('portfolio') && !e.isLiability);
    if (portfolioEntry) deleteManualEntry(portfolioEntry.id);
    setPortfolioMode('detailed');
    setShowSwitchConfirm(false);
  };

  const handleSaveAllocation = () => {
    const parsedTargets: Record<string, number> = {};
    Object.entries(allocTargets).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) parsedTargets[k] = n;
    });
    setAllocation({ mode: allocMode, targets: parsedTargets });
    setShowAllocationModal(false);
    toast.success('Allocation targets saved.');
  };

  const handleExcelImport = (rows: ImportRow[]) => {
    rows.forEach((row) => {
      addTrade({
        id: crypto.randomUUID(),
        ticker: row.ticker,
        name: row.name,
        quantity: row.quantity,
        buyPrice: row.buyPrice,
        buyDate: row.buyDate,
        sellPrice: null,
        sellDate: null,
        assetCategory: row.assetCategory,
        notes: '',
        market: row.market,
        currency: row.currency,
      });
      // Seed current price from Excel's Last Rate so gain is visible before a manual refresh
      updateCurrentPrice(row.ticker, row.rawLastRate, 'excel');
    });
    toast.success(
      `Imported ${rows.length} holding${rows.length !== 1 ? 's' : ''} — prices seeded from Excel snapshot`
    );
  };

  const drawerTrades = drawerTicker
    ? trades.filter((t) => t.ticker === drawerTicker).sort((a, b) => b.buyDate.localeCompare(a.buyDate))
    : [];

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      if (sortBy === 'gain') return b.unrealizedGain - a.unrealizedGain;
      if (sortBy === 'return') return b.unrealizedGainPercent - a.unrealizedGainPercent;
      return b.currentValue - a.currentValue;
    });
  }, [holdings, sortBy]);

  const getDriftInfo = (h: CurrentHolding) => {
    if (allocationMode === 'none') return null;
    const key = allocationMode === 'category' ? h.assetCategory : h.ticker;
    const target = allocationTargets[key];
    if (target === undefined) return null;
    const drift = h.portfolioPercent - target;
    return { target, drift };
  };

  return (
    <div className="space-y-5">

      {/* ── Portfolio Tabs — always at top in detailed mode ── */}
      {portfolioMode === 'detailed' && (
        <Tabs
          tabs={[
            { id: 'holdings', label: '📊 Holdings' },
            { id: 'planner', label: '✏️ Planner' },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as 'holdings' | 'planner')}
        />
      )}

      {/* ── Top Summary — hidden in Planner for full immersion ── */}
      {(portfolioMode !== 'detailed' || activeTab === 'holdings') && (
      <GlassCard padding="lg">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

          {/* Left: financial summary + actions */}
          <div className="flex-1 flex flex-col gap-4">

            {/* Portfolio value */}
            <div>
              <p className="text-white/35 text-xs font-medium tracking-wide uppercase mb-1.5">Portfolio Value</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white font-mono leading-none">
                {formatCurrency(totalValue, defaultCurrency)}
              </h2>
            </div>

            {/* Gain + Return */}
            <div className="flex items-start gap-6">
              <div>
                <p className="text-white/30 text-xs mb-0.5">Unrealized Gain</p>
                <p className={`text-xl font-semibold font-mono ${totalGain >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain, defaultCurrency)}
                </p>
              </div>
              <div className="w-px bg-white/8 self-stretch" />
              <div>
                <p className="text-white/30 text-xs mb-0.5">Return</p>
                <p className={`text-xl font-semibold font-mono ${totalGainPct >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={() => openAddTrade()}>+ Add Trade</Button>
              <div className="w-px h-4 bg-white/10" />
              <Button size="sm" variant="secondary" onClick={() => setShowExcelImport(true)}>📥 Import Excel</Button>
              <Button size="sm" variant="secondary" onClick={handleRefreshPrices} disabled={!canRefreshPrices || refreshing}>
                {refreshing ? '⏳ Refreshing…' : '🔄 Refresh Prices'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setAllocMode(allocationMode);
                setAllocTargets(Object.fromEntries(Object.entries(allocationTargets).map(([k, v]) => [k, String(v)])));
                setShowAllocationModal(true);
              }}>⚖️ Allocation</Button>
            </div>

            {/* Subtle status */}
            {stocksApiKey && requestsRemaining < ALPHA_VANTAGE_MAX_REQUESTS && (
              <p className="text-white/22 text-xs">{requestsRemaining}/{ALPHA_VANTAGE_MAX_REQUESTS} requests remaining today</p>
            )}
            {refreshProgress && <p className="text-[#22C55E] text-xs animate-pulse">{refreshProgress}</p>}
          </div>

          {/* Right: allocation chart */}
          {pieData.length > 0 && (
            <div className="flex flex-row lg:flex-col items-center lg:items-end gap-4 lg:gap-3 lg:min-w-[160px]">
              <AllocationPieChart data={pieData} currency={defaultCurrency} size={130} />
              <div className="flex flex-col gap-1.5 lg:items-end">
                {pieData.map((d) => {
                  const cat = ASSET_CATEGORIES.find((c) => c.id === d.name);
                  const pct = ((d.value / totalValue) * 100).toFixed(0);
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat?.color }} />
                      <span className="text-white/40">{cat?.label ?? d.name}</span>
                      <span className="text-white/55 font-mono tabular-nums ml-auto">{pct}%</span>
                    </div>
                  );
                })}
                <p className="text-white/20 text-xs mt-0.5">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
      )}

      {/* ── Planner Tab ──────────────────────────────────────────────────── */}
      {portfolioMode === 'detailed' && activeTab === 'planner' && (
        <PlannerPage
          holdings={holdings}
          totalValue={totalValue}
          defaultCurrency={defaultCurrency}
        />
      )}

      {/* ── Simple Mode Overlay ──────────────────────────────────────────── */}
      {portfolioMode === 'simple' && (
        <div className="relative">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
            <GlassCard padding="lg" className="text-center max-w-sm mx-4">
              <p className="text-4xl mb-3">📊</p>
              <h3 className="text-white font-semibold mb-2">Simple Portfolio Mode</h3>
              <p className="text-white/50 text-sm mb-4">Switch to Detailed to track individual stocks. Your Portfolio placeholder asset will be removed automatically.</p>
              <Button variant="primary" onClick={() => setShowSwitchConfirm(true)}>Switch to Detailed</Button>
            </GlassCard>
          </div>
          <div className="blur-sm opacity-20 pointer-events-none h-40 bg-white/5 rounded-2xl" />
        </div>
      )}

      {/* ── Holdings ────────────────────────────────────────────────────── */}
      {portfolioMode === 'detailed' && activeTab === 'holdings' && (
        <div className="space-y-3">

          {/* Section header + sort toolbar */}
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Holdings</h2>
              <p className="text-white/30 text-xs mt-0.5">Tap a card to view trade history</p>
            </div>
            {holdings.length > 1 && (
              <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-1">
                {([['value', 'Value'], ['gain', 'Gain'], ['return', 'Return']] as const).map(([opt, label]) => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-all ${sortBy === opt ? 'bg-white/10 text-white/75' : 'text-white/25 hover:text-white/45'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {holdings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedHoldings.map((h) => {
                const driftInfo = getDriftInfo(h);
                return (
                  <GlassCard
                    key={h.ticker}
                    padding="md"
                    className="cursor-pointer hover:bg-white/[0.07] transition-colors"
                    onClick={() => setDrawerTicker(h.ticker)}
                  >
                    {/* Header: ticker + name + badges */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-xl font-bold text-white font-mono leading-none">{h.ticker}</h3>
                          <p className="text-xs text-white/22 font-mono leading-none">
                            {h.sharesHeld % 1 === 0 ? h.sharesHeld.toFixed(0) : h.sharesHeld.toFixed(4)}&nbsp;{h.sharesHeld === 1 ? 'share' : 'shares'}
                          </p>
                        </div>
                        <p className="text-xs text-white/32 mt-0.5 truncate max-w-[180px]">{h.name}</p>
                        {priceSources[h.ticker] === 'excel' && (
                          <p className="text-xs text-amber-400/55 mt-0.5">Excel snapshot</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                        <AssetCategoryBadge category={h.assetCategory} />
                        {/* Only show drift badge in individual mode — category-level drift on a single stock is confusing */}
                        {allocationMode === 'individual' && driftInfo && Math.abs(driftInfo.drift) >= 2 && (
                          <span className={`text-xs font-mono ${Math.abs(driftInfo.drift) > 5 ? 'text-[#EF4444]/65' : 'text-amber-400/65'}`}>
                            {driftInfo.drift > 0 ? '+' : ''}{driftInfo.drift.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hero: value */}
                    <p className="text-2xl font-bold font-mono text-white leading-none mb-1.5">
                      {formatCurrency(h.currentValue, defaultCurrency)}
                    </p>

                    {/* Gain row */}
                    <div className={`flex items-baseline gap-2 mb-3 ${h.unrealizedGain >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      <span className="text-sm font-mono font-medium">
                        {h.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(h.unrealizedGain, defaultCurrency)}
                      </span>
                      <span className="text-xs font-mono opacity-65">
                        {h.unrealizedGain >= 0 ? '+' : ''}{h.unrealizedGainPercent.toFixed(2)}%
                      </span>
                    </div>

                    {/* Secondary details footer */}
                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center gap-1.5 text-xs text-white/28 font-mono flex-wrap">
                      <span>
                        {formatCurrency(h.currentPrice, h.currency)}
                        {h.lastPriceUpdate && (
                          <span className="text-white/15 ml-1">{formatRelativeTime(h.lastPriceUpdate)}</span>
                        )}
                      </span>
                      <span className="text-white/15">·</span>
                      <span>avg {formatCurrency(h.blendedCostBasis, h.currency)}</span>
                    </div>

                    {/* Allocation line — only meaningful in individual mode */}
                    {allocationMode === 'individual' && driftInfo && (
                      <p className="text-xs text-white/18 mt-1.5 font-mono">
                        {h.portfolioPercent.toFixed(1)}% actual · {driftInfo.target}% target
                      </p>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="📈"
              title="No holdings yet"
              description="Add your first stock trade to start tracking your portfolio."
              action={<Button variant="primary" size="sm" onClick={() => openAddTrade()}>+ Add Trade</Button>}
            />
          )}
        </div>
      )}

      {/* Trade History Drawer */}
      <Drawer isOpen={!!drawerTicker} onClose={() => setDrawerTicker(null)} title={`${drawerTicker ?? ''} — Trade History`} width="md">
        <div className="space-y-4">
          <Button variant="primary" size="sm" onClick={() => { openAddTrade(drawerTicker ?? ''); setDrawerTicker(null); }} fullWidth>
            + Add Trade for {drawerTicker}
          </Button>
          {drawerTrades.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">No trades found</p>
          ) : (
            <div className="space-y-2">
              {drawerTrades.map((trade) => {
                const isSell = trade.sellPrice !== null;
                return (
                  <div key={trade.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSell ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#22C55E]/20 text-[#22C55E]'}`}>
                          {isSell ? 'SELL' : 'BUY'}
                        </span>
                        <span className="text-white font-mono text-sm">{trade.quantity} shares</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { openEditTrade(trade); setDrawerTicker(null); }} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 active:bg-white/15 active:scale-[0.92] transition-all duration-150">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => { setDeleteTradeId(trade.id); }} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 active:bg-[#EF4444]/20 active:scale-[0.92] transition-all duration-150">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-white/50">
                      <div className="flex justify-between"><span>{isSell ? 'Sell Price' : 'Buy Price'}</span><span className="text-white font-mono">{formatCurrency(isSell ? trade.sellPrice! : trade.buyPrice, trade.currency ?? defaultCurrency)}</span></div>
                      <div className="flex justify-between"><span>Total</span><span className="text-white font-mono">{formatCurrency((isSell ? trade.sellPrice! : trade.buyPrice) * trade.quantity, trade.currency ?? defaultCurrency)}</span></div>
                      <div className="flex justify-between"><span>Date</span><span>{formatDate(isSell ? trade.sellDate! : trade.buyDate)}</span></div>
                      {trade.notes && <p className="text-white/30 italic mt-1">"{trade.notes}"</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      {/* Add/Edit Trade Modal */}
      <Modal isOpen={showTradeModal} onClose={() => setShowTradeModal(false)} title={editingTrade ? 'Edit Trade' : 'Add Trade'} size="md"
        footer={<><Button variant="ghost" onClick={() => setShowTradeModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveTrade} disabled={!ticker || (inputMode === 'units' ? !quantity : !totalAmount) || !price}>{editingTrade ? 'Save Changes' : tradeType === 'buy' ? 'Add Buy' : 'Add Sell'}</Button></>}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setTradeType('buy')} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${tradeType === 'buy' ? 'bg-[#22C55E] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Buy</button>
            <button onClick={() => setTradeType('sell')} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${tradeType === 'sell' ? 'bg-[#EF4444] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Sell</button>
          </div>
          {assetCategory !== 'crypto' && (
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={tradeMkt === 'tase'}
                onChange={(e) => { const mkt = e.target.checked ? 'tase' : 'global'; setTradeMkt(mkt); setTradeCurrency(mkt === 'tase' ? 'ILS' : 'USD'); setTicker(''); setCompanyName(''); setTickerError(''); }}
                className="w-4 h-4 rounded accent-[#10B981]"
              />
              🇮🇱 Tel Aviv Stock Exchange (TASE)
            </label>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={assetCategory === 'crypto' ? 'Coin ID' : tradeMkt === 'tase' ? 'Security ID' : 'Ticker Symbol'}
              placeholder={assetCategory === 'crypto' ? 'e.g. bitcoin, ethereum' : tradeMkt === 'tase' ? 'e.g. 1159235' : 'AAPL'}
              value={ticker}
              onChange={(e) => { setTicker(tradeMkt === 'tase' ? e.target.value : e.target.value.toUpperCase()); setCompanyName(''); setTickerError(''); }}
              onBlur={handleTickerBlur}
              error={tickerError}
              required
            />
            <Input label={lookingUpName ? 'Looking up...' : 'Security Name'} placeholder={tradeMkt === 'tase' ? 'iShares MSCI ACWI...' : 'Apple Inc.'} value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={lookingUpName} />
          </div>
          {!editingTrade && assetCategory === 'crypto' && (
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
              <button
                onClick={() => { setInputMode('units'); setTotalAmount(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${inputMode === 'units' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                By Units
              </button>
              <button
                onClick={() => { setInputMode('amount'); setQuantity(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${inputMode === 'amount' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                By Amount
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inputMode === 'units' ? (
              <Input label={assetCategory === 'crypto' ? 'Amount' : 'Shares'} type="number" inputMode="decimal" placeholder="10" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            ) : (
              <Input label={`Total ${tradeType === 'sell' ? 'Proceeds' : 'Investment'}`} type="number" inputMode="decimal" placeholder="500.00" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
            )}
            <div className="flex gap-2 items-end">
              <Input label={tradeType === 'sell' ? 'Sell Price' : 'Buy Price'} type="number" inputMode="decimal" placeholder="150.00" value={price} onChange={(e) => setPrice(e.target.value)} required />
              {(assetCategory === 'crypto' ? cryptoApiKey : (tradeMkt === 'global' ? stocksApiKey : israeliApiKey)) && ticker && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFetchHistoricalPrice}
                  disabled={fetchingHistoricalPrice || !ticker || !tradeDate}
                  style={{ marginBottom: '2px' }}
                  title="Fetch end-of-day closing price for this date"
                >
                  {fetchingHistoricalPrice ? '…' : '⬇ Fetch'}
                </Button>
              )}
            </div>
          </div>
          <Select
            label="Price Currency"
            value={tradeCurrency}
            onChange={(e) => setTradeCurrency(e.target.value)}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
          />
          {inputMode === 'units' && quantity && price && parseFloat(quantity) > 0 && parseFloat(price) > 0 && (
            <p className="text-white/40 text-sm">Total: <span className="text-white font-mono">
              {formatCurrency(parseFloat(quantity) * parseFloat(price), tradeCurrency)}
            </span></p>
          )}
          {inputMode === 'amount' && totalAmount && price && parseFloat(price) > 0 && (
            <p className="text-white/40 text-sm">≈ <span className="text-white font-mono">{(parseFloat(totalAmount) / parseFloat(price)).toFixed(6)}</span> {assetCategory === 'crypto' ? 'coins' : 'shares'}</p>
          )}
          <Input label="Date" type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
          <Select label="Asset Category" value={assetCategory} onChange={(e) => {
            const cat = e.target.value as AssetCategory;
            setAssetCategory(cat);
            if (cat === 'crypto') { setTradeMkt('global'); setTradeCurrency('USD'); setTicker(''); setCompanyName(''); }
            else { setInputMode('units'); setTotalAmount(''); }
          }} options={ASSET_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
          <Input label="Notes (optional)" placeholder="Any notes..." value={tradeNotes} onChange={(e) => setTradeNotes(e.target.value)} />
        </div>
      </Modal>

      {/* Allocation Modal */}
      <Modal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)} title="Allocation Targets" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAllocationModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveAllocation}>Save Targets</Button></>}>
        <div className="space-y-5">
          <p className="text-white/50 text-sm">Set target percentages to track drift from your ideal portfolio allocation.</p>
          <div className="space-y-2">
            {(['none', 'category', 'individual'] as const).map((mode) => (
              <button key={mode} onClick={() => setAllocMode(mode)} className={`w-full text-left p-3 rounded-xl border transition-all ${allocMode === mode ? 'border-[#10B981] bg-[#10B981]/10' : 'border-white/10 bg-white/5 hover:bg-white/8'}`}>
                <p className="text-white font-medium">{mode === 'none' ? '❌ None — No targets' : mode === 'category' ? '📦 By Category — Stocks / Bonds / Crypto / Other' : '🎯 By Individual Asset — Per ticker'}</p>
              </button>
            ))}
          </div>
          {allocMode === 'category' && (
            <div className="space-y-3">
              {ASSET_CATEGORIES.map((cat) => (
                <Input key={cat.id} label={`${cat.label} %`} type="number" inputMode="decimal" placeholder="0" value={allocTargets[cat.id] ?? ''} onChange={(e) => setAllocTargets({ ...allocTargets, [cat.id]: e.target.value })} />
              ))}
            </div>
          )}
          {allocMode === 'individual' && (
            <div className="space-y-3">
              {holdings.map((h) => (
                <div key={h.ticker} className="flex items-center gap-3">
                  <span className="text-white font-mono w-16">{h.ticker}</span>
                  <Input type="number" inputMode="decimal" placeholder="0" value={allocTargets[h.ticker] ?? ''} onChange={(e) => setAllocTargets({ ...allocTargets, [h.ticker]: e.target.value })} />
                  <span className="text-white/40 text-sm">%</span>
                </div>
              ))}
              {holdings.length === 0 && <p className="text-white/40 text-sm">Add holdings first</p>}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog isOpen={showSwitchConfirm} onClose={() => setShowSwitchConfirm(false)} onConfirm={handleSwitchToDetailed} title="Switch to Detailed Portfolio" message="This will remove your Portfolio placeholder asset and let you enter individual stock trades. Are you sure?" confirmLabel="Switch" confirmVariant="primary" />
      <ConfirmDialog isOpen={!!deleteTradeId} onClose={() => setDeleteTradeId(null)} onConfirm={() => { if (deleteTradeId) { deleteTrade(deleteTradeId); setDeleteTradeId(null); } }} title="Delete Trade" message="Delete this trade? This cannot be undone." confirmLabel="Delete" confirmVariant="danger" />

      {/* Excel import modal */}
      <ExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        existingTrades={trades}
        onImport={handleExcelImport}
      />
    </div>
  );
}
