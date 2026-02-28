// ============================================================
// STOCK PORTFOLIO
// ============================================================
export interface StockTrade {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  buyPrice: number;
  buyDate: string; // ISO date string
  sellPrice: number | null;
  sellDate: string | null;
  notes: string;
  assetCategory: 'stocks' | 'bonds' | 'crypto' | 'other';
}

export interface CurrentHolding {
  ticker: string;
  name: string;
  assetCategory: 'stocks' | 'bonds' | 'crypto' | 'other';
  sharesHeld: number;
  blendedCostBasis: number; // weighted avg buy price
  currentPrice: number;
  currentValue: number;
  costBasisTotal: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  portfolioPercent: number;
  lastPriceUpdate: string | null; // ISO datetime
}

export interface AllocationTarget {
  mode: 'none' | 'category' | 'individual';
  targets: Record<string, number>; // { "stocks": 30 } or { "AAPL": 10 }
}

export interface AllocationDrift {
  name: string;
  targetPercent: number;
  actualPercent: number;
  driftPercent: number;
  isDrifted: boolean;
}

// ============================================================
// TRANSACTIONS & SPENDING
// ============================================================
export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO date string
  notes: string;
  type: 'expense' | 'income';
  paymentMethod: 'cash' | string; // 'cash' or card id
  cardId: string | null;
  currency: string; // e.g. "USD", "EUR"
  convertedAmount: number; // amount in default currency
  isAutoAdded: boolean;
  installmentPlanId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
}

export interface Card {
  id: string;
  name: string;
  color: string; // hex color for visual distinction
  isActive: boolean;
}

export interface SpendingCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isDefault: boolean;
}

// ============================================================
// BUDGETS
// ============================================================
export interface MonthlyBudget {
  id: string;
  category: string;
  amount: number;
  month: number; // 1-12
  year: number;
}

export interface MonthlyBudgetSummary {
  month: number;
  year: number;
  totalBudgeted: number;
  totalSpent: number;
  totalOverrun: number;
}

// ============================================================
// RECURRING PAYMENTS & INSTALLMENTS
// ============================================================
export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  frequency: 'weekly' | 'monthly' | 'yearly';
  dayOfMonth: number | null; // for monthly/yearly
  dayOfWeek: number | null;  // 0-6 for weekly
  startDate: string; // ISO date
  endDate: string | null;
  isActive: boolean;
  notes: string;
  nextDueDate: string; // ISO date, computed and stored
}

export interface InstallmentPlan {
  id: string;
  name: string;
  totalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  remainingInstallments: number;
  category: string;
  dayOfMonth: number;
  startDate: string; // ISO date
  isActive: boolean;
  notes: string;
  nextPaymentDate: string; // ISO date
}

// ============================================================
// NET WORTH
// ============================================================
export interface ManualEntry {
  id: string;
  name: string;
  value: number;
  isLiability: boolean;
  assetCategory: string; // 'cash_savings' | 'real_estate' | 'crypto' | 'vehicle' | 'other' | 'mortgage' | 'student_loans' | 'credit_card_debt' | 'car_loan'
  lastUpdated: string; // ISO date
}

export interface NetWorthSnapshot {
  id: string;
  date: string; // ISO date
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  portfolioValue: number;
  manualAssetsTotal: number;
}

export interface NetWorthCalculation {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  portfolioValue: number;
  manualAssetsTotal: number;
  manualLiabilitiesTotal: number;
}

// ============================================================
// SETTINGS
// ============================================================
export interface ExchangeRate {
  currency: string; // e.g. "EUR"
  rateToDefault: number; // 1 EUR = X default currency
}

export interface Settings {
  hasCompletedSetup: boolean;
  userName: string;
  userNickname: string;
  portfolioMode: 'simple' | 'detailed';
  defaultCurrency: string; // "USD"
  exchangeRates: ExchangeRate[];
  alphaVantageApiKey: string;
  alphaVantageRequestsUsedToday: number;
  alphaVantageRequestsResetDate: string; // ISO date
  fireTarget: number | null;
  activityFeedShowTransactions: boolean;
  activityFeedShowTrades: boolean;
  activityFeedShowRecurring: boolean;
  lastBackupDate: string | null;
  budgetAlertsEnabled: boolean;
}

// ============================================================
// FIRE CALCULATORS (no persistence, just types for hook returns)
// ============================================================
export interface FireProjectionPoint {
  year: number;
  portfolioValue: number;
}

export interface SWRTableRow {
  rate: number;
  annualSpending: number;
  monthlySpending: number;
  label: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
  isHighlighted: boolean;
}

export interface CompoundChartPoint {
  year: number;
  contributed: number;
  growth: number;
  total: number;
}
