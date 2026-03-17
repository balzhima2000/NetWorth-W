import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, ExchangeRate } from '../types/index';

const today = () => new Date().toISOString().split('T')[0];

interface SettingsStore extends Settings {
  setHasCompletedSetup: (v: boolean) => void;
  setUserName: (name: string) => void;
  setUserNickname: (nickname: string) => void;
  setPortfolioMode: (mode: 'simple' | 'detailed') => void;
  setDefaultCurrency: (currency: string) => void;
  setExchangeRates: (rates: ExchangeRate[]) => void;
  addExchangeRate: (rate: ExchangeRate) => void;
  removeExchangeRate: (currency: string) => void;
  // ── Per-slot API key setters ──
  setStocksApiKey: (key: string) => void;
  setFxApiKey: (key: string) => void;
  setFxProvider: (provider: 'alpha-vantage' | 'massive' | 'boi') => void;
  setIsraeliApiKey: (key: string) => void;
  setCryptoApiKey: (key: string) => void;
  // ── Per-slot request counters ──
  decrementStocksRequests: () => void;
  decrementFxRequests: () => void;
  decrementIsraeliRequests: () => void;
  resetRequestsIfNewDay: () => void;
  setFireTarget: (target: number | null) => void;
  setActivityFeedSettings: (settings: { showTransactions?: boolean; showTrades?: boolean; showRecurring?: boolean }) => void;
  setLastBackupDate: (date: string) => void;
  setBudgetAlertsEnabled: (enabled: boolean) => void;
}

const defaultSettings: Settings = {
  hasCompletedSetup: false,
  userName: '',
  userNickname: '',
  portfolioMode: 'detailed',
  defaultCurrency: 'ILS',
  exchangeRates: [],
  stocksApiKey: '',
  stocksRequestsToday: 0,
  stocksRequestsResetDate: today(),
  fxApiKey: '',
  fxProvider: 'alpha-vantage',
  fxRequestsToday: 0,
  fxRequestsResetDate: today(),
  israeliApiKey: '',
  israeliRequestsToday: 0,
  israeliRequestsResetDate: today(),
  cryptoApiKey: '',
  fireTarget: null,
  activityFeedShowTransactions: true,
  activityFeedShowTrades: true,
  activityFeedShowRecurring: true,
  lastBackupDate: null,
  budgetAlertsEnabled: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      setHasCompletedSetup: (v) => set({ hasCompletedSetup: v }),
      setUserName: (name) => set({ userName: name }),
      setUserNickname: (nickname) => set({ userNickname: nickname }),
      setPortfolioMode: (mode) => set({ portfolioMode: mode }),
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      setExchangeRates: (rates) => set({ exchangeRates: rates }),
      addExchangeRate: (rate) =>
        set((state) => ({
          exchangeRates: [
            ...state.exchangeRates.filter((r) => r.currency !== rate.currency),
            rate,
          ],
        })),
      removeExchangeRate: (currency) =>
        set((state) => ({
          exchangeRates: state.exchangeRates.filter((r) => r.currency !== currency),
        })),
      setStocksApiKey: (key) => set({ stocksApiKey: key }),
      setFxApiKey: (key) => set({ fxApiKey: key }),
      setFxProvider: (provider) => set({ fxProvider: provider }),
      setIsraeliApiKey: (key) => set({ israeliApiKey: key }),
      setCryptoApiKey: (key) => set({ cryptoApiKey: key }),
      decrementStocksRequests: () =>
        set((state) => ({ stocksRequestsToday: state.stocksRequestsToday + 1 })),
      decrementFxRequests: () =>
        set((state) => ({ fxRequestsToday: state.fxRequestsToday + 1 })),
      decrementIsraeliRequests: () =>
        set((state) => ({ israeliRequestsToday: state.israeliRequestsToday + 1 })),
      resetRequestsIfNewDay: () => {
        const t = today();
        const state = get();
        const updates: Partial<Settings> = {};
        if (state.stocksRequestsResetDate !== t) {
          updates.stocksRequestsToday = 0;
          updates.stocksRequestsResetDate = t;
        }
        if (state.fxRequestsResetDate !== t) {
          updates.fxRequestsToday = 0;
          updates.fxRequestsResetDate = t;
        }
        if (state.israeliRequestsResetDate !== t) {
          updates.israeliRequestsToday = 0;
          updates.israeliRequestsResetDate = t;
        }
        if (Object.keys(updates).length > 0) set(updates);
      },
      setFireTarget: (target) => set({ fireTarget: target }),
      setActivityFeedSettings: ({ showTransactions, showTrades, showRecurring }) =>
        set((state) => ({
          activityFeedShowTransactions: showTransactions ?? state.activityFeedShowTransactions,
          activityFeedShowTrades: showTrades ?? state.activityFeedShowTrades,
          activityFeedShowRecurring: showRecurring ?? state.activityFeedShowRecurring,
        })),
      setLastBackupDate: (date) => set({ lastBackupDate: date }),
      setBudgetAlertsEnabled: (enabled) => set({ budgetAlertsEnabled: enabled }),
    }),
    {
      name: 'nw-settings',
      version: 3,
      migrate: (persisted: any, version) => {
        if (version < 2) {
          const t = today();
          // Migrate old single alphaVantageApiKey → pre-fill both stocks and fx slots
          persisted.stocksApiKey = persisted.alphaVantageApiKey ?? '';
          persisted.fxApiKey     = persisted.alphaVantageApiKey ?? '';
          persisted.stocksRequestsToday     = persisted.alphaVantageRequestsUsedToday ?? 0;
          persisted.fxRequestsToday         = persisted.alphaVantageRequestsUsedToday ?? 0;
          persisted.stocksRequestsResetDate = persisted.alphaVantageRequestsResetDate ?? t;
          persisted.fxRequestsResetDate     = persisted.alphaVantageRequestsResetDate ?? t;
          persisted.israeliApiKey           = '';
          persisted.israeliRequestsToday    = 0;
          persisted.israeliRequestsResetDate = t;
        }
        if (version < 3) {
          // Add FX provider preference — default to alpha-vantage for existing users
          persisted.fxProvider = 'alpha-vantage';
        }
        return persisted;
      },
    }
  )
);
