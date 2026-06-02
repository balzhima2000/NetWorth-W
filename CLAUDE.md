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
| `'boi'` | **Frankfurter** (`api.frankfurter.app`) | None (free) | ECB-backed, CORS-enabled, ~33 currencies. Service file: `frankfurterApi.ts` |
| `'alpha-vantage'` | Alpha Vantage | `fxApiKey` | 25 req/day free tier |
| `'massive'` | Massive/Polygon | `fxApiKey` | No daily cap |

The Bank of Israel's own APIs (`boi.org.il`, `edge.boi.org.il`) were tested and confirmed to lack CORS headers — they cannot be called from the browser. Frankfurter is the correct free alternative.

**Frankfurter rate formula**: `GET /latest?from=<baseCurrency>` → `data.rates[X]` = "how many X per 1 baseCurrency" → `rateToDefault = 1 / data.rates[currency]`

## Portfolio price policy

**Rule: prices are stored in native currency. Conversion to `defaultCurrency` happens at display time only.**

Two separate price concepts exist:

| Field | Location | Set by | Currency | Ever overwritten by API? |
|---|---|---|---|---|
| `buyPrice` / `sellPrice` | `StockTrade` (persisted) | User entry only (`handleSaveTrade`) | Native (e.g. USD, ILS) | ❌ Never |
| `buyRateToDefault` | `StockTrade` (persisted) | Captured once in `handleSaveTrade` at trade entry time | — | ❌ Never — this is the historic rate used for cost basis |
| `currentPrices[ticker]` | `portfolioStore` (persisted) | "Refresh Prices" or Excel import | Native currency | ✅ Yes, intentional |

- `StockTrade.currency` (required) — the native price currency, e.g. `'USD'` for global stocks, `'ILS'` for TASE.
- **portfolioStore v1 migration** — existing trades without `currency` get it inferred: `market === 'tase'` → `'ILS'`, else `'USD'`.
- **Excel import** seeds `currentPrices[ticker]` from col C (Last Rate) so gain is visible immediately without a manual refresh.
- **Refresh Prices** calls `updateCurrentPrice(ticker, price)` → modifies only `currentPrices` + `lastPriceUpdates`. Never touches `StockTrade` fields.
- `CurrentHolding` is **not stored** — computed on-demand by `calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates)`.
  - `blendedCostBasis` and `currentPrice` → native currency
  - `currentValue` → `defaultCurrency` using the **live** `rateToDefault` (what the portfolio is worth now)
  - `costBasisTotal` → `defaultCurrency` using **`buyRateToDefault` per buy lot** (what you paid, at the rate when you bought) — legacy trades without this field fall back to current rate
  - `unrealizedGain` = `currentValue − costBasisTotal` → includes both price movement and FX movement
  - `unrealizedGainPercent` → % based on native prices only (currency-neutral, no FX effect)
  - When `currentPrices[ticker]` is absent, `currentPrice` falls back to `blendedCostBasis` (0% gain).

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

## Workflow rules
- **Auto-push**: Unless told otherwise, always push after executing the user's orders.
- **Preview viewport**: Always use the desktop/PC version (1920×1080) for previews by default, unless told otherwise.

## File map (key files)
```
src/
  services/
    frankfurterApi.ts       — Frankfurter FX fetching (fetchFrankfurterRates, fetchFrankfurterRate)
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

## Portfolio case study (ongoing — keep this in mind)

Balzhima is writing a portfolio case study about this redesign (transitioning from graphic/junior designer → product designer who ships alongside devs). **As we work, accumulate the rationale.** Every UX/UI decision should be capturable as: **problem** (from the audit) → **principle** applied → **before → after**. Nudge Balzhima to capture decisions while fresh — don't reconstruct from memory at the end.

**Running thesis:** *UI prominence ∝ frequency of use × relevance in context.*

**Persona — "The Intentional Investor":** financially literate, FIRE-minded, wants confidence/trust, professional-but-stylish. Two modes — *checking* (fast daily glance) vs *deep dive* (weekly). Design checking-mode first.

**Audit → fix → principle threads (the spine of the write-up):**
- Floating "+" FAB (mobile pattern, ambiguous, covers content) → contextual labeled actions + 3 dashboard action buttons.
- FIRE calculator on dashboard → split *configuration* (rare, own page) from *monitoring* (glanceable, actionable progress card).
- Inconsistent number fonts erode trust → one tabular type treatment, comma thousands.
- No hierarchy / left-hugging layout → Display hero number, full-width equal-height bento.
- Missing/inconsistent states → states-as-a-system (Button: 9 variants).

**Design-system story:** tokens-first, then components; semantic tokens give Light/Dark from one source and map 1:1 to CSS vars; layering metaphor = *nesting communicates ownership*.

**Color model (restraint = credibility):** black = primary action · violet = accent (selection/active/focus/data line) · green/red = semantic gain/loss · `chart-1..5` = categorical data. Four jobs, never mixed.

**Process narrative (strong portfolio angle):** ran as a design-critique loop with Balzhima as editor; changed direction on evidence (the action-buttons decision); verified technical feasibility against the real codebase (Recharts) *before* committing to a design.

> Detailed running notes live in the auto-memory `project_redesign.md` / `ui-surface-style.md`. This section is the durable case-study lens to apply going forward.
