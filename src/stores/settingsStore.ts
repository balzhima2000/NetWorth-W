import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, ExchangeRate } from '../types/index';

interface SettingsStore extends Settings {
  setHasCompletedSetup: (v: boolean) => void;
  setUserName: (name: string) => void;
  setUserNickname: (nickname: string) => void;
  setPortfolioMode: (mode: 'simple' | 'detailed') => void;
  setDefaultCurrency: (currency: string) => void;
  setExchangeRates: (rates: ExchangeRate[]) => void;
  addExchangeRate: (rate: ExchangeRate) => void;
  removeExchangeRate: (currency: string) => void;
  setAlphaVantageApiKey: (key: string) => void;
  decrementApiRequests: () => void;
  resetApiRequestsIfNewDay: () => void;
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
  defaultCurrency: 'USD',
  exchangeRates: [],
  alphaVantageApiKey: '',
  alphaVantageRequestsUsedToday: 0,
  alphaVantageRequestsResetDate: new Date().toISOString().split('T')[0],
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
      setAlphaVantageApiKey: (key) => set({ alphaVantageApiKey: key }),
      decrementApiRequests: () =>
        set((state) => ({
          alphaVantageRequestsUsedToday: state.alphaVantageRequestsUsedToday + 1,
        })),
      resetApiRequestsIfNewDay: () => {
        const today = new Date().toISOString().split('T')[0];
        const state = get();
        if (state.alphaVantageRequestsResetDate !== today) {
          set({
            alphaVantageRequestsUsedToday: 0,
            alphaVantageRequestsResetDate: today,
          });
        }
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
    { name: 'nw-settings' }
  )
);
