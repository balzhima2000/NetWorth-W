// Number and date formatting utilities

/**
 * Format a number as currency string
 * @param amount - numeric value
 * @param currency - ISO currency code e.g. "USD", "EUR"
 * @param compact - if true, abbreviate large numbers (e.g. $1.2M)
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${getCurrencySymbol(currency)}${m.toFixed(2)}M`;
  }
  if (compact && Math.abs(amount) >= 1_000) {
    const k = amount / 1_000;
    return `${getCurrencySymbol(currency)}${k.toFixed(1)}K`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unknown currencies
    return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
  }
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', ILS: '₪', JPY: '¥',
    CAD: 'CA$', AUD: 'A$', CHF: 'Fr', CNY: '¥', INR: '₹',
    BRL: 'R$', MXN: 'MX$', KRW: '₩', SGD: 'S$', HKD: 'HK$',
  };
  return symbols[currency] ?? currency + ' ';
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Format percent without sign prefix
 */
export function formatPercentUnsigned(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with commas
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a date string to display format
 */
export function formatDate(dateStr: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(dateStr);
  if (style === 'short') {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }
  if (style === 'long') {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

/**
 * Format a date as "MMM YYYY" for chart labels
 */
export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

/**
 * Format relative time (e.g. "2 hours ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr, 'short');
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current month and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
