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

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=IBM&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return false;
    const data = await response.json();
    if (data['Information']) return false;
    return true;
  } catch {
    return false;
  }
}
