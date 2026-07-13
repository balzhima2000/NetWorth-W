import { useMemo, useState } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useSettingsStore } from '../stores/settingsStore';
import { calculateCurrentHoldings } from '../utils/calculations';
import { ALPHA_VANTAGE_MAX_REQUESTS } from '../utils/constants';
import { fetchStockQuote } from '../services/alphaVantage';
import { fetchTaseSecurityPrice } from '../services/taseDataHub';
import { fetchCoinlayerLivePrices } from '../services/coinlayer';
import { useToast } from './useToast';

/**
 * Live price refresh for the current holdings — extracted from the classic
 * Portfolio page so the William Portfolio screen can refresh natively instead
 * of bridging to `/portfolio`.
 *
 * Fetches per market: global (Alpha Vantage) · TASE (DataHub) · crypto
 * (Coinlayer), writing results to `currentPrices` via `updateCurrentPrice`.
 * `canRefresh` gates the button: true when there's at least one holding whose
 * market has a usable API key (and quota, for Alpha Vantage).
 */
export function useRefreshPrices() {
  const trades = usePortfolioStore((s) => s.trades);
  const currentPrices = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);
  const updateCurrentPrice = usePortfolioStore((s) => s.updateCurrentPrice);

  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const stocksApiKey = useSettingsStore((s) => s.stocksApiKey);
  const stocksRequestsToday = useSettingsStore((s) => s.stocksRequestsToday);
  const decrementStocksRequests = useSettingsStore((s) => s.decrementStocksRequests);
  const resetRequestsIfNewDay = useSettingsStore((s) => s.resetRequestsIfNewDay);
  const israeliApiKey = useSettingsStore((s) => s.israeliApiKey);
  const cryptoApiKey = useSettingsStore((s) => s.cryptoApiKey);

  const toast = useToast();

  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates],
  );

  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState('');
  const requestsRemaining = ALPHA_VANTAGE_MAX_REQUESTS - stocksRequestsToday;

  const hasRefreshableGlobal =
    holdings.some((h) => (h.market ?? 'global') === 'global' && h.assetCategory !== 'crypto') &&
    !!stocksApiKey && requestsRemaining > 0;
  const hasRefreshableTase = holdings.some((h) => h.market === 'tase') && !!israeliApiKey;
  const hasRefreshableCrypto = holdings.some((h) => h.assetCategory === 'crypto') && !!cryptoApiKey;
  const canRefresh = hasRefreshableGlobal || hasRefreshableTase || hasRefreshableCrypto;

  const refresh = async () => {
    const cryptoHoldings = holdings.filter((h) => h.assetCategory === 'crypto');
    const globalHoldings = holdings.filter((h) => (h.market ?? 'global') === 'global' && h.assetCategory !== 'crypto');
    const taseHoldings = holdings.filter((h) => h.market === 'tase');
    if (globalHoldings.length > 0 && !stocksApiKey && taseHoldings.length === 0 && cryptoHoldings.length === 0) {
      toast.error('Add your Alpha Vantage Stocks API key in Account first.');
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
        setProgress(`Rate limit reached after ${done} updates`);
        break;
      }
      setProgress(`Updating ${h.ticker} (${done + 1}/${total})...`);
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
      setProgress(`Updating ${h.ticker} (${done + 1}/${total})...`);
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
        toast.error('Add your Coinlayer API key in Account to refresh crypto prices.');
      } else {
        setProgress('Updating crypto prices...');
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
      toast.error('Price refresh failed. Check your API keys in Account.');
    }
    setProgress('');
    setRefreshing(false);
  };

  return { refresh, refreshing, progress, canRefresh };
}
