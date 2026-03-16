/**
 * Coinlayer API — crypto current & historical prices.
 * Free tier: 100 requests/month, USD only.
 * Sign up at https://coinlayer.com to get a free API key.
 * Docs: https://coinlayer.com/documentation
 */

const BASE = 'https://api.coinlayer.com';

export interface CoinlayerLiveResponse {
  success: boolean;
  rates: Record<string, number>; // e.g. { BTC: 50000, ETH: 3000 }
  timestamp: number;
  target: string; // e.g. "USD"
}

export interface CoinlayerHistoricalResponse {
  success: boolean;
  rates: Record<string, number>;
  date: string; // e.g. "2021-01-01"
  target: string;
}

/**
 * Fetch current prices for a list of crypto symbols.
 * @param symbols  Array of uppercase symbols, e.g. ["BTC", "ETH"]
 * @param apiKey   Coinlayer API key
 * @returns Map of symbol → price in USD
 */
export async function fetchCoinlayerLivePrices(
  symbols: string[],
  apiKey: string,
): Promise<Record<string, number>> {
  if (!symbols.length) return {};
  const syms = symbols.join(',');
  const res = await fetch(`${BASE}/live?access_key=${apiKey}&symbols=${syms}&target=USD`);
  if (!res.ok) throw new Error(`Coinlayer live failed: HTTP ${res.status}`);
  const data = await res.json() as CoinlayerLiveResponse & { error?: { type: string; info: string } };
  if (!data.success) throw new Error(`Coinlayer: ${data.error?.info ?? 'Request failed — check your API key.'} (${data.error?.type ?? ''})`);
  return data.rates;
}

/**
 * Fetch a coin's closing price for a specific past date.
 * @param symbol   Uppercase symbol, e.g. "BTC"
 * @param date     ISO date string YYYY-MM-DD
 * @param apiKey   Coinlayer API key
 * @returns Price in USD
 */
export async function fetchCoinlayerHistoricalPrice(
  symbol: string,
  date: string,
  apiKey: string,
): Promise<number> {
  const res = await fetch(`${BASE}/${date}?access_key=${apiKey}&symbols=${symbol}&target=USD`);
  if (!res.ok) throw new Error(`Coinlayer historical failed: HTTP ${res.status}`);
  const data = await res.json() as CoinlayerHistoricalResponse & { error?: { type: string; info: string } };
  if (!data.success) throw new Error(`Coinlayer: ${data.error?.info ?? 'Request failed — check your API key.'} (${data.error?.type ?? ''})`);
  const price = data.rates[symbol];
  if (price == null) throw new Error(`No price data for ${symbol} on ${date}`);
  return price;
}
