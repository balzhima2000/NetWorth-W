# networth-tracker — Project Memory

## Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **State**: Zustand with `persist` middleware (localStorage)
- **Routing**: React Router v6

## Key stores
| Store | localStorage key | Purpose |
|---|---|---|
| `settingsStore` | `nw-settings` | App settings, API keys, exchange rates table |
| `transactionStore` | `nw-transactions` | One-off income/expense transactions |
| `recurringStore` | `nw-recurring` | Recurring payments & installment plans |
| `portfolioStore` | `nw-portfolio` | Stock trades & current holdings |

## Exchange rate policy

**Rule: rates are applied at entry time only. Historical converted amounts are immutable.**

- `Transaction.convertedAmount` is set once when the transaction is created, using the rate available at that moment. It is never updated afterwards.
- `RecurringPayment` has **no** `convertedAmount` field — it stores only `amount` + `currency`. Conversion happens when the recurring payment generates a `Transaction`; the resulting `Transaction.convertedAmount` is then permanently fixed.
- **Refresh All** (Settings → Currency) only updates the global `exchangeRates` table in `settingsStore`. It does **not** touch any stored `convertedAmount` on existing transactions or recurring payments.
- `recalculateRatesForCurrency` was removed in commit `c0ae4bc` because it retroactively overwrote historical `convertedAmount` values on every rate refresh — violating the above rule.

## FX provider
`settingsStore.fxProvider` controls which service is used:

| Value | Provider | Auth | Notes |
|---|---|---|---|
| `'boi'` | **Frankfurter** (`api.frankfurter.app`) | None (free) | ECB-backed, CORS-enabled, ~33 currencies |
| `'alpha-vantage'` | Alpha Vantage | `fxApiKey` | 25 req/day free tier |
| `'massive'` | Massive/Polygon | `fxApiKey` | No daily cap |

The Bank of Israel's own APIs (`boi.org.il`, `edge.boi.org.il`) were tested and confirmed to lack CORS headers — they cannot be called from the browser. Frankfurter is the correct free alternative.

**Frankfurter rate formula**: `GET /latest?from=<baseCurrency>` → `data.rates[X]` = "how many X per 1 baseCurrency" → `rateToDefault = 1 / data.rates[currency]`

## Portfolio price policy

**Rule: user-entered trade prices are immutable. API refresh only updates the current-price lookup.**

Two separate price concepts exist:

| Field | Location | Set by | Ever overwritten by API? |
|---|---|---|---|
| `buyPrice` / `sellPrice` | `StockTrade` (persisted) | User entry only (`handleSaveTrade`) | ❌ Never |
| `currentPrices[ticker]` | `portfolioStore` (persisted) | "Refresh Prices" only (`handleRefreshPrices`) | ✅ Yes, intentional |

- **Refresh Prices** calls `updateCurrentPrice(ticker, price)` → modifies only `currentPrices` + `lastPriceUpdates`. It never calls `updateTrade` or touches any `StockTrade` field.
- `CurrentHolding` is **not stored** — it is computed on-demand by `calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates)`. When `currentPrices[ticker]` is absent (no refresh yet), `currentPrice` falls back to `blendedCostBasis` (the weighted average buy price from trades).
- `setCurrentPrices` was removed as dead code — it was defined in the store but never called anywhere.

### API keys & which holdings they cover
| API key | Provider | Holdings covered |
|---|---|---|
| `stocksApiKey` | Alpha Vantage | `market === 'global'` holdings |
| `israeliApiKey` | TASE DataHub | `market === 'tase'` holdings |

"Refresh Prices" is enabled if the user has either key with relevant holdings (not gated on `stocksApiKey` alone).

## Broker Excel import

`src/services/excelImport.ts` — `parsePortfolioExcel(file, existingTrades, defaultCurrency, exchangeRates)`

Parses a broker `.xlsx` snapshot (one row = one open position) into `ImportRow[]` objects ready for preview and import. Key normalisation rules:

1. **Agorot → ILS**: TASE stocks quote Last rate and Average cost in agorot (1/100 ₪). Divide by 100. Total value / P&L are already in ILS — do **not** divide.
2. **Currency conversion**: Foreign-currency average cost is multiplied by `ExchangeRate.rateToDefault` to convert to the user's `defaultCurrency`. If no rate is stored, `noRateAvailable = true` (shown in orange in the preview).
3. **Numeric symbols**: Israeli TASE stocks use numeric security IDs as their Symbol (e.g. `"1159235"`). When Symbol is purely numeric, the **Name** column is used as the ticker instead.
4. **Market detection**: `currency === 'ILS'` → `market = 'tase'`, else `market = 'global'`.

### Column mapping
| Col | Header | Stored? | Notes |
|-----|--------|---------|-------|
| A | Name | ✅ `StockTrade.name` (also ticker if Symbol is numeric) | |
| B | Symbol | ✅ `StockTrade.ticker` | Falls back to Name when purely numeric |
| C | Last rate | ❌ preview only | |
| J | Quantity | ✅ `StockTrade.quantity` | |
| L | Average cost | ✅ `StockTrade.buyPrice` | Normalised (agorot→ILS) + converted to defaultCurrency |
| N | Currency | ✅ `StockTrade.market` | ILS→tase, else→global |

### Entry points
- **Portfolio page**: `📥 Import Excel` button → `ExcelImportModal.tsx` (preview modal)
- **Setup wizard step 5**: `Step5ExcelImport.tsx` (inline, no modal) — shown for Detailed mode only; skipped for Simple mode

## Setup wizard

`src/pages/Setup/index.tsx` — 8-step linear wizard

```
1 Name → 2 Privacy → 3 Currency → 4 Portfolio → [5 Import Holdings] → 6 Cards → 7 FIRE → 8 Done
```

- Step 5 is **automatically skipped** when `portfolioMode === 'simple'` (skip in `handleNext` at step 4; skip-back in `handleBack` at step 6).
- Step 8 Done screen shows a summary including holdings imported count (from `portfolioStore.trades`).

## Auto-push
All committed fixes are automatically pushed to the remote (`git push` after every commit).

## File map (key files)
```
src/
  services/
    boiApi.ts               — Frankfurter FX fetching
    alphaVantageApi.ts      — Alpha Vantage FX fetching
    massiveApi.ts           — Massive/Polygon FX fetching
    excelImport.ts          — Broker .xlsx parsing → ImportRow[]
  stores/
    settingsStore.ts        — Settings, exchange rates table, API key tracking
    transactionStore.ts     — Transactions (no recalculation functions)
    recurringStore.ts       — Recurring payments & installment plans (CRUD only)
    portfolioStore.ts       — Stock trades + currentPrices lookup (separate from buyPrice)
  pages/
    Settings/index.tsx      — All settings UI including FX provider config & Refresh All
    Portfolio/
      index.tsx             — Portfolio page with Import Excel button
      ExcelImportModal.tsx  — Standalone Excel import modal (post-setup)
    Setup/
      index.tsx             — 8-step wizard orchestrator with skip logic
      Step5ExcelImport.tsx  — Inline Excel import step (setup wizard only)
  types/index.ts            — All TypeScript interfaces (Transaction, RecurringPayment, etc.)
```
