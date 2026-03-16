/**
 * CoinGecko public API — no API key required, CORS-enabled.
 * Rate limit: ~10-30 requests/minute on free tier.
 * Docs: https://www.coingecko.com/api/documentation
 */

const BASE = 'https://api.coingecko.com/api/v3';

export interface CoinSearchResult {
  id: string;      // CoinGecko ID, e.g. "bitcoin"
  symbol: string;  // e.g. "BTC"
  name: string;    // e.g. "Bitcoin"
}

/** Search for coins by name or symbol. Returns up to 10 results. */
export async function searchCoin(query: string): Promise<CoinSearchResult[]> {
  const res = await fetch(`${BASE}/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`CoinGecko search failed: HTTP ${res.status}`);
  const data = await res.json() as { coins: Array<{ id: string; symbol: string; name: string }> };
  return data.coins.slice(0, 10).map((c) => ({
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
  }));
}

/**
 * Fetch current prices for multiple coins in one request.
 * @param coinIds  CoinGecko IDs e.g. ["bitcoin", "ethereum"]
 * @param vsCurrency  Target currency code, e.g. "usd", "ils"
 * @returns Map of coinId → price
 */
export async function fetchCoinPrices(
  coinIds: string[],
  vsCurrency = 'usd',
): Promise<Record<string, number>> {
  if (!coinIds.length) return {};
  const ids = coinIds.join(',');
  const cur = vsCurrency.toLowerCase();
  const res = await fetch(`${BASE}/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${cur}`);
  if (!res.ok) throw new Error(`CoinGecko price fetch failed: HTTP ${res.status}`);
  const data = await res.json() as Record<string, Record<string, number>>;
  const result: Record<string, number> = {};
  for (const [id, prices] of Object.entries(data)) {
    if (prices[cur] != null) result[id] = prices[cur];
  }
  return result;
}

/**
 * Fetch a coin's closing price for a specific past date.
 * @param coinId  CoinGecko ID e.g. "bitcoin"
 * @param date    ISO date string YYYY-MM-DD
 * @param vsCurrency  Target currency code, e.g. "usd"
 */
export async function fetchCoinHistoricalPrice(
  coinId: string,
  date: string,
  vsCurrency = 'usd',
): Promise<number> {
  // CoinGecko history API expects DD-MM-YYYY
  const [year, month, day] = date.split('-');
  const cgDate = `${day}-${month}-${year}`;
  const res = await fetch(`${BASE}/coins/${encodeURIComponent(coinId)}/history?date=${cgDate}`);
  if (!res.ok) throw new Error(`CoinGecko history failed: HTTP ${res.status}`);
  const data = await res.json() as { market_data?: { current_price?: Record<string, number> } };
  const price = data?.market_data?.current_price?.[vsCurrency.toLowerCase()];
  if (price == null) throw new Error(`No price data for ${coinId} on ${date}`);
  return price;
}
