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
  const url = `${MASSIVE_BASE_URL}/v1/conversion/${encodeURIComponent(fromCurrency)}/${encodeURIComponent(toCurrency)}?amount=1&precision=6&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.status === 'ERROR' || data.converted == null) {
    throw new Error(data.error ?? `No conversion data for ${fromCurrency}/${toCurrency}`);
  }
  return data.converted as number;
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
