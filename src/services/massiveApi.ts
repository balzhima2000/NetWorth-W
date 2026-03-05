/**
 * Massive (Polygon.io) financial data API service.
 * Massive.com is Polygon.io rebranded (October 2025).
 * Base URL: https://api.massive.com (legacy: https://api.polygon.io)
 */

const MASSIVE_BASE_URL = 'https://api.massive.com';

/**
 * Fetch real-time currency conversion rate using Massive/Polygon's FX API.
 * Endpoint: GET /v1/conversion/{from}/{to}
 * Response includes `converted` field with the exchange rate.
 */
export async function fetchExchangeRateMassive(
  fromCurrency: string,
  toCurrency: string,
  apiKey: string
): Promise<number> {
  // Attempt 1: real-time conversion (requires paid Currencies plan)
  const convUrl = `${MASSIVE_BASE_URL}/v1/conversion/${encodeURIComponent(fromCurrency)}/${encodeURIComponent(toCurrency)}?amount=1&precision=6&apiKey=${apiKey}`;
  const convResp = await fetch(convUrl);

  if (convResp.ok) {
    const data = await convResp.json();
    if (data.status !== 'ERROR' && data.converted != null) {
      return data.converted as number;
    }
  }

  if (convResp.status === 403) {
    // Real-time endpoint requires a paid plan — fall back to previous day's close (free Basic Currencies tier)
    const ticker = `C:${fromCurrency}${toCurrency}`;
    const aggUrl = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev?adjusted=true&apiKey=${apiKey}`;
    const aggResp = await fetch(aggUrl);
    if (aggResp.ok) {
      const aggData = await aggResp.json();
      const rate = aggData.results?.[0]?.c;
      if (rate != null) return rate as number;
    }
    throw new Error(
      'Forex data unavailable — upgrade your Massive/Polygon plan at massive.com/pricing, or switch provider to Alpha Vantage (free)'
    );
  }

  throw new Error(`HTTP ${convResp.status}`);
}

/**
 * Test a Massive/Polygon API key by attempting a real USD→EUR conversion.
 */
export async function testMassiveKey(apiKey: string): Promise<boolean> {
  try {
    await fetchExchangeRateMassive('USD', 'EUR', apiKey);
    return true;
  } catch {
    return false;
  }
}
