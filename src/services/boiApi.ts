/**
 * Bank of Israel (BOI) exchange rate API service.
 * Free public API — no authentication required.
 * Publishes official daily rates for 14 currencies against ILS.
 *
 * Supported currencies: USD, GBP, JPY, EUR, AUD, CAD, DKK, NOK, ZAR, SEK, CHF, JOD, LBP, EGP
 *
 * Note: All rates are TO ILS. This provider only makes sense when the app's
 * default currency is ILS.
 */

const BOI_URL = 'https://www.boi.org.il/PublicApi/GetExchangeRates?asXml=false';

/**
 * Fetch all BOI exchange rates in a single API call.
 * Returns a map of currency code → ILS per 1 unit of that currency.
 * Handles the `unit` field (e.g. JPY unit=100: rate is per 100 JPY, not per 1).
 */
export async function fetchBOIExchangeRates(): Promise<Map<string, number>> {
  const res = await fetch(BOI_URL);
  if (!res.ok) throw new Error(`Bank of Israel API error: HTTP ${res.status}`);
  const data = await res.json();
  const map = new Map<string, number>();
  for (const entry of data.exchangeRates ?? []) {
    const rate = (entry.currentExchangeRate as number) / (entry.unit as number);
    map.set(entry.key as string, rate);
  }
  return map;
}

/**
 * Fetch the ILS rate for a single currency.
 * Makes one BOI API call (fetches all currencies) then returns the requested one.
 */
export async function fetchBOIExchangeRate(currency: string): Promise<number> {
  const rates = await fetchBOIExchangeRates();
  const rate = rates.get(currency.toUpperCase());
  if (rate == null) {
    throw new Error(
      `Bank of Israel does not publish rates for ${currency}. ` +
      `Supported: USD, EUR, GBP, JPY, AUD, CAD, CHF, SEK, NOK, DKK, JOD, EGP, LBP, ZAR`
    );
  }
  return rate;
}
