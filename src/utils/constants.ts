// App-wide constants

export const APP_NAME = 'NetWorth Tracker';

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
];

export const ASSET_CATEGORIES = [
  { id: 'stocks', label: 'Stocks', color: '#3B82F6' },
  { id: 'bonds', label: 'Bonds', color: '#10B981' },
  { id: 'crypto', label: 'Crypto', color: '#F59E0B' },
  { id: 'other', label: 'Other', color: '#6B7280' },
] as const;

export const ASSET_CATEGORY_COLORS: Record<string, string> = {
  stocks: '#3B82F6',
  bonds:  '#10B981',
  crypto: '#F59E0B',
  other:  '#6B7280',
};

export const MANUAL_ASSET_CATEGORIES = [
  { id: 'cash_savings', label: 'Cash & Savings', emoji: '💵' },
  { id: 'real_estate', label: 'Real Estate', emoji: '🏠' },
  { id: 'crypto', label: 'Crypto', emoji: '₿' },
  { id: 'vehicle', label: 'Vehicle', emoji: '🚗' },
  { id: 'other', label: 'Other', emoji: '💼' },
];

export const MANUAL_LIABILITY_CATEGORIES = [
  { id: 'mortgage', label: 'Mortgage', emoji: '🏦' },
  { id: 'student_loans', label: 'Student Loans', emoji: '🎓' },
  { id: 'credit_card_debt', label: 'Credit Card Debt', emoji: '💳' },
  { id: 'car_loan', label: 'Car Loan', emoji: '🚗' },
  { id: 'other', label: 'Other', emoji: '💰' },
];

export const CARD_COLORS = [
  '#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#06B6D4',
  '#EC4899', '#8B5CF6', '#22C55E', '#F97316', '#64748B',
];

export const CHART_COLORS = {
  green:  '#10B981',
  red:    '#EF4444',
  blue:   '#3B82F6',
  amber:  '#F59E0B',
  purple: '#8B5CF6',
  cyan:   '#06B6D4',
  pink:   '#EC4899',
  gray:   '#6B7280',
};

export const ALPHA_VANTAGE_MAX_REQUESTS = 25;
export const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

export const TREND_PERIODS = [
  { label: '30D', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: null },
] as const;

export const BUDGET_OVERRUN_PERIODS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
  { label: 'All', months: null },
] as const;
