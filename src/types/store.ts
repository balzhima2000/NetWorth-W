// Store slice types used by Zustand stores

export interface PortfolioStoreState {
  trades: import('./index').StockTrade[];
  currentPrices: Record<string, number>; // ticker -> current price
  lastPriceUpdates: Record<string, string>; // ticker -> ISO datetime
}

export interface PortfolioStoreActions {
  addTrade: (trade: import('./index').StockTrade) => void;
  updateTrade: (id: string, updates: Partial<import('./index').StockTrade>) => void;
  deleteTrade: (id: string) => void;
  updateCurrentPrice: (ticker: string, price: number) => void;
}

export type PortfolioStore = PortfolioStoreState & PortfolioStoreActions;
