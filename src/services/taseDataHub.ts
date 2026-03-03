/**
 * TASE DataHub API service
 *
 * Free products used (register at https://datahub.tase.co.il/login):
 *   • Securities - Basic    → TA-125 (TLV125) index stocks
 *   • Mutual Funds - Basic  → All TASE-listed ETFs and mutual funds
 *
 * Auth: `apikey` request header (one key covers all subscribed products)
 * Rate limit: 10 requests / 2 seconds (no daily cap)
 *
 * NOTE: The Mutual Funds endpoint path (`/mutualFunds/basic`) is a best-guess
 * based on naming patterns. Confirm the exact path and response field names
 * via the "Try it out" curl example in the TASE DataHub developer portal after
 * subscribing to "Mutual Funds - Basic".
 */

const BASE = 'https://datahubapi.tase.co.il';

function headers(apiKey: string): HeadersInit {
  return {
    apikey: apiKey,
    accept: 'application/json',
    'accept-language': 'en',
  };
}

export interface TaseSecurity {
  securityId: number;
  name: string;
  ticker: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutual Funds - Basic  (ETFs + mutual funds, including non-TA-125 securities)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch current price for a TASE-listed mutual fund or ETF.
 * Uses the Mutual Funds - Basic free product.
 * NOTE: Adjust endpoint path and price field once a live response is inspected.
 */
export async function fetchTaseMutualFundPrice(
  securityId: number,
  apiKey: string
): Promise<number> {
  const url = `${BASE}/mutualFunds/basic?securityId=${securityId}`;
  const res = await fetch(url, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list: any[] = data?.result ?? data ?? [];
  const item = list[0];
  if (!item) throw new Error(`No mutual fund data for securityId ${securityId}`);
  const price =
    item.closingPrice ?? item.ClosingPrice ??
    item.nav         ?? item.Nav          ?? // mutual funds often use NAV
    item.price       ?? item.Price;
  if (price == null) throw new Error('No price field in mutual fund response');
  return parseFloat(price);
}

/**
 * Search TASE-listed mutual funds / ETFs by name or ticker.
 */
export async function searchTaseMutualFund(
  query: string,
  apiKey: string
): Promise<TaseSecurity | null> {
  const url = `${BASE}/mutualFunds/basic?name=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list: any[] = data?.result ?? data ?? [];
  if (!list.length) return null;
  const first = list[0];
  return {
    securityId: first.securityId ?? first.SecurityId,
    name: first.name ?? first.Name ?? first.fundName ?? first.FundName ?? query,
    ticker: first.ticker ?? first.Ticker ?? query,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined lookups — tries Securities first, falls back to Mutual Funds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search any TASE security by name or ticker.
 * Tries Securities - Basic (TA-125 stocks) first, then Mutual Funds - Basic (ETFs).
 */
export async function searchTaseSecurity(
  query: string,
  apiKey: string
): Promise<TaseSecurity | null> {
  // 1. Try stocks (TA-125)
  try {
    const url = `${BASE}/securities/basic?name=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: headers(apiKey) });
    if (res.ok) {
      const data = await res.json();
      const list: any[] = data?.result ?? data ?? [];
      if (list.length) {
        const first = list[0];
        return {
          securityId: first.securityId ?? first.SecurityId,
          name: first.name ?? first.Name ?? query,
          ticker: first.ticker ?? first.Ticker ?? query,
        };
      }
    }
  } catch { /* fall through to mutual funds */ }

  // 2. Fall back to mutual funds / ETFs
  return searchTaseMutualFund(query, apiKey);
}

/**
 * Fetch the latest price for any TASE-listed security by its numeric ID.
 * Tries Securities - Basic (TA-125 stocks) first, then Mutual Funds - Basic (ETFs).
 */
export async function fetchTaseSecurityPrice(
  securityId: number,
  apiKey: string
): Promise<number> {
  // 1. Try stocks (TA-125)
  try {
    const url = `${BASE}/securities/basic?securityId=${securityId}`;
    const res = await fetch(url, { headers: headers(apiKey) });
    if (res.ok) {
      const data = await res.json();
      const list: any[] = data?.result ?? data ?? [];
      const item = list[0];
      if (item) {
        const price = item.closingPrice ?? item.ClosingPrice ?? item.price ?? item.Price;
        if (price != null) return parseFloat(price);
      }
    }
  } catch { /* fall through to mutual funds */ }

  // 2. Fall back to mutual funds / ETFs
  return fetchTaseMutualFundPrice(securityId, apiKey);
}

/**
 * Test whether a TASE DataHub API key is valid.
 * 200 or 400 (valid key, bad params) both indicate the key is accepted.
 */
export async function testTaseKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/securities/basic`, { headers: headers(apiKey) });
    return res.ok || res.status === 400;
  } catch {
    return false;
  }
}
