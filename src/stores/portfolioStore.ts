import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StockTrade } from '../types/index';

interface PortfolioStore {
  trades: StockTrade[];
  currentPrices: Record<string, number>;
  lastPriceUpdates: Record<string, string>;
  addTrade: (trade: StockTrade) => void;
  updateTrade: (id: string, updates: Partial<StockTrade>) => void;
  deleteTrade: (id: string) => void;
  updateCurrentPrice: (ticker: string, price: number) => void;
  setCurrentPrices: (prices: Record<string, number>) => void;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      trades: [],
      currentPrices: {},
      lastPriceUpdates: {},
      addTrade: (trade) => set((state) => ({ trades: [...state.trades, trade] })),
      updateTrade: (id, updates) =>
        set((state) => ({
          trades: state.trades.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTrade: (id) =>
        set((state) => ({ trades: state.trades.filter((t) => t.id !== id) })),
      updateCurrentPrice: (ticker, price) =>
        set((state) => ({
          currentPrices: { ...state.currentPrices, [ticker]: price },
          lastPriceUpdates: {
            ...state.lastPriceUpdates,
            [ticker]: new Date().toISOString(),
          },
        })),
      setCurrentPrices: (prices) =>
        set((state) => {
          const now = new Date().toISOString();
          const updates: Record<string, string> = {};
          Object.keys(prices).forEach((ticker) => {
            updates[ticker] = now;
          });
          return {
            currentPrices: { ...state.currentPrices, ...prices },
            lastPriceUpdates: { ...state.lastPriceUpdates, ...updates },
          };
        }),
    }),
    { name: 'nw-portfolio' }
  )
);
