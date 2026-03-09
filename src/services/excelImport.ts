import * as XLSX from 'xlsx';
import { getTodayISO } from '../utils/formatters';
import type { StockTrade, ExchangeRate } from '../types/index';

type AssetCategory = 'stocks' | 'bonds' | 'crypto' | 'other';

export interface ImportRow {
  // Stored on import (in default currency)
  ticker: string;
  name: string;
  quantity: number;
  avgCost: number;        // → StockTrade.buyPrice, converted to defaultCurrency
  market: 'global' | 'tase';

  // Original values (in native currency, agorot normalized to ILS) — display only
  rawAvgCost: number;     // col L, agorot→ILS if TASE
  rawLastRate: number;    // col C, agorot→ILS if TASE

  // Currency info
  currency: string;       // col N — native currency (USD, ILS, …)
  conversionRate: number | null;  // exchange rate applied (null = same as default currency)
  noRateAvailable: boolean;       // true when currency ≠ defaultCurrency but no rate found in store

  // Display-only (not stored) — values as-is from broker
  totalValue: number;     // col H — broker total value (already in base unit, not agorot)
  totalPL: number;        // col F — total P/L (already in base unit)
  totalYield: number;     // col G — % yield
  positionRatio: number;  // col M — portfolio weight %

  // Editable in preview before import
  buyDate: string;
  assetCategory: AssetCategory;

  // Conflict detection
  hasConflict: boolean;
  existingQty: number;
  existingBlendedCost: number;
  projectedQty: number;
  projectedBlendedCost: number;

  // Row state
  selected: boolean;
  rowKey: string;
}

/** Auto-detect asset category from security name. */
function autoCategory(name: string): AssetCategory {
  const u = name.toUpperCase();
  if (
    u.includes('ETF') ||
    u.startsWith('ISH') ||
    u.includes('ISHARES') ||
    u.includes('VANECK') ||
    u.includes('VANGUARD') ||
    u.includes('INVESCO') ||
    u.includes('SPDR') ||
    u.includes('GLOBAL X')
  ) return 'other';
  return 'stocks';
}

/** Parse a raw cell value to a number. Handles strings with commas, %, etc. */
function toNum(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/[,%\s]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Parse a broker portfolio .xlsx file into ImportRow objects.
 *
 * Normalisation rules applied:
 *  1. TASE stocks (currency = ILS): Last rate & Average cost are in AGOROT
 *     (1/100 of a shekel). Divide by 100 to get ILS.
 *     Note: Total value and Total p/l are already in ILS — no conversion needed.
 *  2. Foreign-currency stocks (e.g. USD): multiply Average cost by the stored
 *     rateToDefault exchange rate to convert to the user's default currency.
 *     If no rate is found the raw value is kept and `noRateAvailable` is set.
 */
export async function parsePortfolioExcel(
  file: File,
  existingTrades: StockTrade[],
  defaultCurrency: string,
  exchangeRates: ExchangeRate[],
): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

        // Build existing position map: ticker → { totalQty, totalCost (in default currency) }
        const posMap: Record<string, { qty: number; cost: number }> = {};
        for (const t of existingTrades) {
          if (t.sellPrice !== null) continue;
          if (!posMap[t.ticker]) posMap[t.ticker] = { qty: 0, cost: 0 };
          posMap[t.ticker].qty += t.quantity;
          posMap[t.ticker].cost += t.quantity * t.buyPrice;
        }

        const today = getTodayISO();
        const rows: ImportRow[] = [];

        rawRows.forEach((row, i) => {
          const name = String(row['Name'] ?? '').trim();
          const symbol = String(row['Symbol'] ?? '').trim();
          if (!name || !symbol) return;

          // TASE stocks use numeric security IDs (e.g. "1159235") as their symbol.
          // When the symbol is purely numeric, fall back to the Name column for the ticker.
          const ticker = /^\d+$/.test(symbol) ? name : symbol.toUpperCase();
          const currency = String(row['Currency'] ?? 'USD').trim().toUpperCase();
          const market: 'global' | 'tase' = currency === 'ILS' ? 'tase' : 'global';

          const rawLastRateExcel = toNum(row['Last rate']);
          const rawAvgCostExcel = toNum(row['Average cost']);
          const quantity = toNum(row['Quantity']);
          const totalValue = toNum(row['Total value']);
          const positionRatio = toNum(row['Position ratio']);
          const totalPL = toNum(row['Total p/l']);
          const totalYield = toNum(row['Total yield']);

          // ── Step 1: Normalise agorot → ILS for TASE stocks ──────────────────
          // Israeli brokers quote Last rate and Average cost in agorot (1/100 ₪).
          // Total value and Total p/l are already expressed in ILS.
          const rawAvgCost = currency === 'ILS' ? rawAvgCostExcel / 100 : rawAvgCostExcel;
          const rawLastRate = currency === 'ILS' ? rawLastRateExcel / 100 : rawLastRateExcel;

          // ── Step 2: Convert to default currency ──────────────────────────────
          let avgCost = rawAvgCost;
          let conversionRate: number | null = null;
          let noRateAvailable = false;

          if (currency !== defaultCurrency) {
            const rate = exchangeRates.find((r) => r.currency === currency);
            if (rate) {
              avgCost = rawAvgCost * rate.rateToDefault;
              conversionRate = rate.rateToDefault;
            } else {
              // No stored rate — keep raw value but flag it so the user knows
              noRateAvailable = true;
            }
          }

          // ── Conflict detection (using converted avgCost so blending is apples-to-apples) ──
          const existing = posMap[ticker];
          const hasConflict = !!existing;
          const existingQty = existing?.qty ?? 0;
          const existingBlendedCost = existing ? existing.cost / existing.qty : 0;
          const projectedQty = existingQty + quantity;
          const projectedBlendedCost = hasConflict
            ? (existing.cost + quantity * avgCost) / projectedQty
            : avgCost;

          rows.push({
            ticker,
            name,
            quantity,
            avgCost,           // stored value (in defaultCurrency)
            market,
            rawAvgCost,        // display value (native currency, normalised)
            rawLastRate,       // display value (native currency, normalised)
            currency,
            conversionRate,
            noRateAvailable,
            totalValue,
            totalPL,
            totalYield,
            positionRatio,
            buyDate: today,
            assetCategory: autoCategory(name),
            hasConflict,
            existingQty,
            existingBlendedCost,
            projectedQty,
            projectedBlendedCost,
            selected: true,
            rowKey: `${ticker}-${i}`,
          });
        });

        resolve(rows);
      } catch (err: any) {
        reject(new Error(err?.message ?? 'Failed to parse Excel file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
