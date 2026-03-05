import { ALPHA_VANTAGE_BASE_URL } from '../utils/constants';

export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
}

export async function fetchStockQuote(
  ticker: string,
  apiKey: string
): Promise<StockQuote> {
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  if (data['Note']) throw new Error('Rate limit reached');
  if (data['Information']) throw new Error('Invalid API key');

  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) {
    throw new Error(`No data for ${ticker}`);
  }

  return {
    ticker,
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change'] ?? '0'),
    changePercent: parseFloat(quote['10. change percent']?.replace('%', '') ?? '0'),
  };
}

export async function searchSymbol(
  query: string,
  apiKey: string
): Promise<SymbolSearchResult | null> {
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  if (data['Note']) throw new Error('Rate limit reached');
  if (data['Information']) throw new Error('Invalid API key');

  const matches = data['bestMatches'];
  if (!matches || matches.length === 0) return null;

  const best = matches[0];
  return {
    symbol: best['1. symbol'],
    name: best['2. name'],
  };
}

export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  apiKey: string
): Promise<number> {
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${encodeURIComponent(fromCurrency)}&to_currency=${encodeURIComponent(toCurrency)}&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  if (data['Note']) throw new Error('Rate limit reached');
  if (data['Information']) throw new Error('Invalid API key');

  const rate = data['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
  if (!rate) throw new Error(`No FX data for ${fromCurrency}/${toCurrency}`);
  return parseFloat(rate);
}

/**
 * Fetch the historical closing price for a stock on a specific date.
 * Uses TIME_SERIES_DAILY — tries compact output first (last ~100 days);
 * falls back to full output if the date is older.
 * Counts as one API request (shared with the stocks quota).
 */
export async function fetchHistoricalPrice(
  ticker: string,
  date: string, // ISO date, e.g. "2024-01-15"
  apiKey: string
): Promise<number> {
  const tryFetch = async (outputsize: 'compact' | 'full'): Promise<number | null> => {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&outputsize=${outputsize}&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data['Note']) throw new Error('Rate limit reached');
    if (data['Information']) throw new Error('Invalid API key');
    const series = data['Time Series (Daily)'];
    if (!series) throw new Error(`No daily data for ${ticker}`);
    const day = series[date];
    if (!day) return null; // date not in this output
    const close = day['4. close'];
    if (!close) return null;
    return parseFloat(close);
  };

  // Try compact first (last ~100 trading days — saves API quota)
  const price = await tryFetch('compact');
  if (price !== null) return price;

  // Date is older — retry with full history
  const priceFull = await tryFetch('full');
  if (priceFull !== null) return priceFull;

  throw new Error(`No price data for ${ticker} on ${date}. The date may be a weekend, holiday, or pre-listing.`);
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=IBM&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return false;
    const data = await response.json();
    if (data['Information']) return false;
    if (data['Note']) return false;
    // Require actual stock data — an empty Global Quote means the key was rejected
    const quote = data['Global Quote'];
    if (!quote || !quote['01. symbol']) return false;
    return true;
  } catch {
    return false;
  }
}
