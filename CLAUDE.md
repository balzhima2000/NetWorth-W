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
- **Refresh All** (Account → Currency) only updates the global `exchangeRates` table in `settingsStore`. It does **not** touch any stored `convertedAmount` on existing transactions or recurring payments.
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

### Entry points (William-native, 2026-07)
The parsing service (`excelImport.ts`) is unchanged; the UI is now a William modal.
- **Portfolio page**: `Import` toolbar button → `src/pages/WilliamPortfolio/ImportExcelModal.tsx` (William-styled upload → preview → import; reuses `parsePortfolioExcel`, writes via `addTrade` + `updateCurrentPrice`).
- **Dashboard finish-setup card**: the "Import your holdings" card mounts the same `ImportExcelModal` (shown only when `portfolioMode === 'detailed' && trades === 0`).

## Setup (William)

`src/pages/WilliamSetup/index.tsx` — lean **3-step** onboarding: `Name → Portfolio → Done`, route `/william/setup`. Input is held locally and committed once on finish.

- The deferred tasks (cards, FIRE goal, device sync, import holdings) are **not** steps — they live on the dashboard as "Finish setting up" cards (`WilliamDashboard/FinishSetup.tsx`), each auto-hiding once its store state shows it's done.
- **Restore from a backup** is inline on step 1 (file picker → confirm modal → `useRestoreBackup` applies + completes setup). No separate restore route.
- The classic 8-step `pages/Setup` wizard was **deleted** (2026-07) — see "Classic app retired" below.

## Workflow rules
- **Auto-push**: Unless told otherwise, always push after executing the user's orders.
- **No emojis, anywhere** (Balzhima's call): never use emojis in product UI, copy/microcopy, Figma designs, or code/comments. This includes onboarding greetings (no 👋) and success screens (no 🎉) — use plain words or a drawn glyph/icon instead. Functional line-drawn icons (e.g. a close ✕, chevrons) are fine; decorative pictographs are not.

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
  hooks/
    useRefreshPrices.ts     — Live price refresh (global/TASE/crypto) → currentPrices; { refresh, refreshing, progress, canRefresh }
    useRestoreBackup.ts     — Parse + apply a JSON backup to all stores (shared by Account→Data + WilliamSetup)
  pages/
    WilliamSetup/index.tsx  — Lean 3-step onboarding (route /william/setup)
    WilliamDashboard/       — Dashboard + FinishSetup.tsx (finish-setup cards)
    WilliamPortfolio/
      index.tsx             — Portfolio screen (route /william/portfolio); Refresh uses useRefreshPrices
      ImportExcelModal.tsx  — William Excel import modal (Portfolio Import + finish-setup card)
      modals.tsx            — AddTradeModal / AddTransactionModal / SetTargetsModal
    WilliamAccount/         — Account hub + sub-pages (Api, Currency, Categories, Cards, Data, Danger, …)
  types/index.ts            — All TypeScript interfaces (Transaction, RecurringPayment, etc.)
```

## Classic app retired (2026-07)
The original non-William app is **deleted** — William is the only app. Removed: `pages/{Dashboard,Portfolio,Spending,Fire,Settings,Setup,SpendingHeatmap}`, `components/layout` (AppShell/Sidebar/TopBar/MobileNav/BackupReminderBanner), `components/mobile/QuickAddFAB`, and the classic routes (`/setup`, `/dashboard`, `/portfolio`, `/spending`, `/fire`, `/settings` — these now 404). The three features William used to bridge to classic for (Refresh prices, Excel import, backup restore) are now native (see the hooks + `ImportExcelModal` above). `App.tsx` holds only the `/william/*` routes + a root redirect. **Dead `components/ui/` removed (2026-07):** the old classic primitives (`Button`, `Modal`, `Badge`, `Drawer`, `Input`, `GlassCard`, `ProgressBar`, `Tabs`, `EmptyState`, barrel `index.ts`) were orphaned after the retirement and are deleted; **only `components/ui/Toast.tsx` remains** (still imported by `App.tsx` + `useToast`). All William UI lives in `components/william/`.

## Design system — Figma file

**File:** `WMI3ZpbuD4zvKIe4yqFA5A` 

### Pages
| Page | ID | Contents |
|---|---|---|
| Foundations | 6:2 | Type scale, spacing, radius, color swatches |
| Button | 11:2 | Button component set (3 styles × 3 states = 9 variants) + **Action Button** set (197:60) |
| Card | 13:2 | Card component (Default + Hover) |
| Badge | 14:3 | Badge component set (Positive/Negative/Neutral/Accent) |
| Screens/Dashboard | 15:2 | Dashboard v2 Desktop (22:3, 1440×1140) + Mobile (26:3, 375×1622) |
| Chip & Layering | 30:2 | Chip component (Neutral/Outline/Inverse) |
| Icons | 92:2 | All icon components (see below) |
| States | — | Skeleton / EmptyState / Alert / ChartTooltip / loading + edge-case reference |
| Documentation | — | **Visual component reference** — `Dashboard Components — Light` + `Dashboard Components — Dark` boards (dark = clone with Color collection mode set to Dark). Every component + all states + the screen Patterns (activity row, insight callout, breakdown bar). Each master also carries a Dev-Mode `description`. |
| Archive | 150:1750 | Old/reference frames |

### Icon components (Icons page, 92:2)
Pixel dot-matrix style. Master size 64×64. DOT=6, GAP=2, UNIT=8.  
**Rule: always use `rescale(targetSize/64)` to size instances — never `resize(w,h)`.**

| Component | ID (64px) | ID (24px) | Purpose |
|---|---|---|---|
| Icon/Home | 92:3 | — | Nav |
| Icon/Portfolio | 92:25 | — | Nav |
| Icon/Spending | 92:45 | — | Nav |
| Icon/Fire | 92:77 | — | Nav |
| Icon/Account | 92:103 | — | Nav |
| Icon/Trade | 118:1274 | 118:1275 | Action button |
| Icon/Income | 118:1330 | 118:1368 | Action button |
| Icon/Expense | 118:1331 | 118:1369 | Action button |
| Icon/Star | 215:2217 | — | Misc |
| Icon/Refresh | 387:1065 | — | Portfolio "Refresh prices" (circular arrow) |
| Icon/Import | 387:1076 | — | Portfolio "Import" (download → tray) |
| Icon/Target | 429:1084 | — | "Set/Edit targets" (ring + bullseye) |
| Icon/Plus | 429:1098 | — | "Add trade" / add actions |

**⚠️ Toolbar buttons** use the standard `<Button pill size="m">` (M = **36px** per the Button master `897:7790`, re-audited 2026-07 — the earlier "38px, size=toolbar, Medium label" note was drift from the master). All toolbar pills carry the master's **14px SemiBold** label · **16px** horizontal pad · **6px** gap. **Refresh/Import** = `secondary` (white pill on the grey canvas); **Add trade** = `primary` (dark), plus glyph 16px. Row gap = **10px desktop** (`gap-2.5`) / **8px mobile** (`gap-2`). Buttons hug content (Figma manually undersized its Add-trade frame to 110px; we don't, to avoid clipping the label). *(An older Figma usage frame 358:146 drew 38px — that was an instance override; the component master is 36.)*

### Action Button component (Button page, set 197:60)
Dashboard action buttons (Trade/Income/Expense). Variant property `Action`.
- Structure: VERTICAL auto-layout wrapper (8px gap, center) → **54×34 pill** (`cornerRadius 999`, fill = `color/btn-primary`) containing a **22px** icon instance → 13px Medium label bound to `color/text-secondary`. (Code `ActionButton.tsx` matches: `h-[34px] w-[54px]` pill, 22px icon. An older note here said "54px circle / 34px icon" — stale.)
- Variants: `Action=Trade` (197:2), `Action=Income` (197:22), `Action=Expense` (197:41).
- Both Dashboard screens (desktop `954:244`, mobile `954:390`) use instances of this set — no more inline button frames. Mobile was unified from 50px → 54px circles.

### Variable collections (re-audited 2026-07)
| Collection | ID | Modes | Vars |
|---|---|---|---|
| Primitives | VariableCollectionId:202:2306 | Value | 47 (blue/neutral/orange/lime ramps) |
| Color | VariableCollectionId:2:2 | Light / Dark | 32 |
| Spacing | VariableCollectionId:3:2 | Value | 8 |
| Radius | VariableCollectionId:3:11 | Value | 4 |

Color collection includes 12 **`color/btn-*` tokens** (Light/Dark, all aliasing the neutral ramp). 8 were recreated 2026-07 after the originals were deleted but stayed bound ("ghost variables"); the primary family was added when the Button set moved off the generic accent tokens: `btn-primary` (n800/n0) · `btn-primary-hover` (n700/n50) · `btn-primary-pressed` (n600/n500) · `btn-on-primary` (n0/n900, default/hover labels) · `btn-on-primary-pressed` (n0/n0 — white stays on the grey pressed fill in dark) · `btn-neutral` (n0/n800) · `btn-neutral-hover` (n100/n700) · `btn-neutral-pressed` (n200/n600) · `btn-subtle-hover` (n100/n800) · `btn-subtle-pressed` (n200/n700) · `btn-disabled` (n200/n800) · `btn-disabled-text` (n400/n600). The Button sets (897:7790 light / 1325:11930 dark) bind ONLY btn-* for fills/labels (plus `color/border` outlines + `color/focus` rings); the Danger set's Disabled state also uses `btn-disabled`/`btn-disabled-text`. ⚠️ **Never combine a variable-bound paint color with paint opacity** — instances re-resolve bound paints and normalize opacity back to 1 (the danger 10%/20% overlays kept spontaneously reverting to solid orange until replaced). State tints must be their own mode-aware tokens. The Danger set uses `btn-danger-hover` (orange/200 L · orange/900 D) and `btn-danger-pressed` (orange/300 L · orange/800 D) as single fills — no alpha overlays. `docs/annotation` (#8a38f5, ex-"DS Purple") is the doc-chrome purple: annotation components + component-set frame strokes; never product UI. Navigation/Lists pages intentionally bind a few **remote Apple-library** variables (`Fills/Tertiary`, `Labels/Secondary`) on iOS reference frames — do not "fix" those.

### Typeface (2026-07): Instrument Sans replaced Inter — everywhere
The sans is **Instrument Sans** (Google Fonts; styles Regular/Medium/**SemiBold** — no space/Bold), in both code (`--w-font-sans`, loaded via `src/index.css` @import; Inter no longer requested) and Figma (all 900+ text nodes swapped; Geist Mono + the Apple-library iOS reference frames untouched). **Max weight is 700** — there is no Black/900: `.ty-display` and the hero numbers moved from 900/`font-black` to 700/`font-bold`, and `.william` sets `font-synthesis: none` so faux-bold can never render (Balzhima's call: true 700 over synthetic 900). Any doc below that still says "Inter X" reads "Instrument Sans X" (Figma style name for Semi Bold is **"SemiBold"**).

### Color palette + visual direction (Superpower-inspired, since 2026-06)

Adapted aesthetic = **cool neutral greys + white · hairline borders · frosted-glass floating surfaces · color ONLY on money direction**.

> **History note:** a warm-paper/cream neutral ramp was trialled (2026-06) but **reverted**. The final, intended palette is **cool grey + white** (Tailwind-style neutral scale). Do not reintroduce warm/cream neutrals.

**Core color concept (decided 2026-06, final):** *Chromatic color appears only on money movement — lime = up, orange = down. Everything else is monochrome.*
- **Accent is NEUTRAL, not orange.** `color/accent` → `neutral/900` (Light) / `neutral/0` (Dark). The data line, action-button circles, FIRE bar, and active nav are black-in-light / white-in-dark. Do **not** make the accent orange.
- **Orange #FF6A0D = `color/negative` only.** Every negative monetary value (e.g. −$3,140, −$25) and the expense feed use orange. Reserved exclusively for loss/spend — never for accent, nav, or focus.
- **Lime = `color/positive`.** Every positive value (+$1,268, +25.20%, +2.4%) uses lime.
- **Known tradeoff (accepted):** orange `#FF6A0D` as *text* on light surfaces is ~2.8:1 (fails WCAG AA). Balzhima accepted this risk for the identity. Do not "fix" it by darkening unless asked.

**Base:** cool neutral greys + white (Tailwind-style neutral scale)  
**Primary action:** **mid-grey** — `color/surface-inverse` → `neutral/400` (#a3a3a3). This is **intentional** (Balzhima's call, 2026-06): primary buttons and action-button circles render mid-grey, not near-black. Do not "fix" to neutral/900.  
**Positive:** lime (#D6F377 bg) · **Negative:** orange #FF6A0D  
Violet was considered and rejected. Do not reintroduce it. Primitives were renamed: `green/*`→`lime/*`, `amber/*`→`orange/*`.

**Cool neutral ramp** (current, intended):
| Token | Hex | Used for |
|---|---|---|
| `neutral/0` | #ffffff | white — page bg + card surface |
| `neutral/50` | #fafafa | subtle raised |
| `neutral/200` | #e5e5e5 | **hairline border** |
| `neutral/400` | #a3a3a3 | `surface-inverse` → primary button + action circles (mid-grey, intentional) |
| `neutral/900` | #171717 | text-primary, accent (data line / active nav / FIRE bar) |
| `neutral/0–950` | … | standard Tailwind neutral steps in between |

| Accent/semantic | Hex / mapping |
|---|---|
| `color/accent` / `color/focus` | `neutral/900` (L) / `neutral/0` (D) — **monochrome, not orange** |
| `orange/500` / `color/negative` | #FF6A0D (loss/spend only; ~2.8:1 on light — accepted) |
| `lime/100` / `color/positive-bg` | #D6F377 |
| `lime/600` / `color/positive` | dark lime (L) · `lime/300` in Dark |

**Key semantic bindings (Light mode):**
- `color/bg` → `neutral/100` (#f5f5f5 page; Dark → `neutral/950` #0a0a0a). Code: `--w-canvas`.
- `color/surface` → `neutral/0` (white cards; Dark → n900 #171717)
- `color/border` → `neutral/200` (#e5e5e5 — controls/dividers only, see below)
- `color/surface-inverse` → `neutral/400` (#a3a3a3 — mid-grey primary, intentional)
- **⚠️ Cards are BORDERLESS (Balzhima's call, 2026-07): page/card separation is TONAL** — white surface on the n100 grey canvas (n900 on n950 in dark). No hairline on any Card master or card-like surface. `color/border` remains on **controls, dividers, and floating chrome only**: inputs, Secondary button, outline chips/pills, menus, month picker, nav, modals, chart tooltips, row dividers. Interactive-card **hover** affordance: accent border in Figma (`Card / Interactive` Hover/Focus keep strokes; Default/Pressed have none) / `hover:bg-raised` in code. Code net-worth card = white wrapper + grey (`raised`) inner balance panel — matches the rebuilt `Card / NetWorth`.

**Full token set (27 `color/*`, added 2026-06 to fill gaps):**
- Surfaces: `bg · surface · surface-raised · surface-sunken · surface-inverse · surface-inverse-hover`
- Text: `text-primary · text-secondary · text-muted · text-on-inverse · on-accent`
- Lines/accent: `border · accent · accent-hover · accent-bg · focus` (focus tracks accent — neutral)
- Money: `positive · positive-bg · negative · negative-bg`
- Categorical **chart palette**: `chart-1` blue · `chart-2` teal · `chart-3` amber · `chart-4` indigo · `chart-5` rose (for allocation/FIRE charts; avoids lime/orange which are reserved for money direction). `blue`/`blue-bg` retained.
- **Fixed:** inactive nav-pill icons were mis-bound to a non-existent `color/chart-5` → rebound to `color/text-secondary`.

**⚠️ Allocation / net-worth breakdown bar — per-theme colors (do NOT change):** Stocks = `accent` · Cash = lime · Crypto = blue · Other = `accent-bg`. Cash/Crypto use the **pale `-bg` tint in light** (`positive-bg`/`blue-bg`) but the **BRIGHT token in dark** (`positive` #bef264 / `blue` #60a5fa) — the dark `-bg` tints are nearly invisible on a dark surface. Balzhima set the dark board's segments to the bright tokens by hand. Code mirrors this via mode-aware `--w-alloc-lime` / `--w-alloc-blue`. **The Documentation Light & Dark boards intentionally differ here — do not "re-sync" the dark board by re-cloning the light one, or you'll overwrite this.**
- Code mirror in `src/styles/william.css` (`--w-sunken`, `--w-on-inverse`, `--w-focus`, `--w-chart-1..5`).

**⚠️ Chart color rule — NEVER invent colors.** Every fill in a chart must bind to an existing design system token via `setBoundVariableForPaint`. No raw hex values, no hardcoded RGB, no opacity hacks.

**The single chart color palette (all chart types):** `color/accent` · `color/positive-bg` · `color/blue-bg` · `color/accent-bg` — in that exact order, confirmed from the ByCategory reference node (708:3259). Use these tokens in order for however many series/categories you have:
- 1st series/category → `color/accent`
- 2nd series/category → `color/positive-bg`
- 3rd series/category → `color/blue-bg`
- 4th series/category → `color/accent-bg`

This applies to **all chart types**: breakdown bars, donut charts, paired bar charts, split bars. Example: Spend vs Income bars → spending = `color/accent`, income = `color/positive-bg`.

**Nav surfaces are OPAQUE (not frosted).** The NavPill masters use a solid fill + 1px border, NOT translucency/blur (a frosted treatment was trialled in code but caused dark-mode discoloration and didn't match the masters — reverted). Exact specs:
- **FloatingNav (desktop, 202:2605):** fill `color/surface`, border `color/border`, r999, pad 8 (10 left), gap 6. Items r999, icon 20 + label 14. Active = `accent-bg` pill + `accent` text (pad 10/14); inactive = `text-secondary` (pad 10); **account = 36×36 `accent-bg` circle**.
- **TabBar (mobile, 202:2606):** fill `color/bg`, border `color/border`, r999, ~340w, gap 30, pad 6/20. 4 items (50px): icon 24 + label 11. Active = `text-primary`; inactive = `text-muted` (no pill on mobile). Account is NOT in the tab bar (it's in the mobile header).

**Button state fills (masters):** Primary hover = `color/surface-inverse-hover` (#737373 / #a3a3a3 dark), pressed = darker; Secondary/Ghost hover & pressed = `color/surface-raised`; disabled = `color/border` fill + `text-muted`. Code mirrors via `--w-inverse-hover`.

**Action Button tokens (2026-07):** circles run on the `btn-primary` family — Default/Active = `btn-primary`, Hover = `btn-primary-hover`, Pressed = `btn-primary-pressed` (pressed is now a distinct step; hover previously = pressed = `surface-inverse-hover`). Icon dots = `btn-on-primary` (`btn-on-primary-pressed` in Pressed variants), labels = `text-secondary`. The three duplicate `Action=Trade, State=Active` variant names (which made both sets report "component set has existing errors") were fixed to Income/Expense. In code, Active = scale 95% + brightness.

**Token audit (2026-06):** every fill/stroke in the component masters + dashboard screens is variable-bound — no raw colors. 27 semantic `color/*` tokens (Color collection) + neutral/blue/lime/orange primitive ramps. The only non-variable colors were the doc-only darkening overlays used to *depict* hover/pressed; the corresponding code states now use real tokens.

**RangeSelector/Segment:** track + segments are **`rounded-full`** (r999); selected segment = `color/surface` fill, **no border**; segment pad 6/14.

**⚠️ Dashboard layout gaps + value font sizes are PER-BREAKPOINT (mobile ≠ desktop)** — re-verified 2026-07 against the current **Home** section `1076:13528` (Desktop `954:244` · Mobile `954:390` · dark variants `971:2` / `971:1889`; old IDs 22:3/26:3 are dead). Mobile is tighter:
| Container / element | Mobile | Desktop |
|---|---|---|
| Main stack | 18 | 20 |
| Top row (cols) | 18 | 20 |
| Portfolio + This-Month **row gap** | **12** | 20 |
| Graph card gap | 14 | 18 |
| FIRE card gap | 8 | 10 |
| Portfolio/Month card gap | 6 | 10 |
| Recent activity gap | 10 | 12 |
| Net-worth hero font | 36 | 44 |
| Stat-card value font (Portfolio/Month) | **22** | 32 |
Code uses responsive classes (`gap-[18px] md:gap-5`, `gap-x-3 gap-y-[18px] md:gap-5`, `text-[22px] md:text-[32px]`, etc). The This-Month wrap bug was caused by using desktop values (gap 20 + 32px font) on mobile.

### Radius + card padding scale (verified against Figma, 2026-06)
Radius: `sm 8 · md 12 · lg 20 · full 999`. **Standard card radius = 20 (`lg`).** Exceptions: net-worth grey wrapper 24, white inner balance card 18, activity rows / See-all 16, insight callout / chart tooltip 12.
Card padding: **20px** standard (`p-5`); graph card **24** (`p-6`); activity rows 16/18; net-worth wrapper 12 (18 bottom). Code: `--w-radius-card: 20px`. (The earlier code used r16/p-6 — corrected.)

### Components & states (handoff-ready, 2026-06)
Pre-dev audit pass added the missing interaction/data states and cleaned duplicates.

**Components (canonical):**
| Component | Set ID | Variants / states |
|---|---|---|
| Button | 11:21 | Style {Primary/Secondary/Ghost} × State {Default/Hover/Pressed/Focus/Disabled/Loading} (18) |
| Action Button | 197:60 | Action {Trade/Income/Expense} — **single source of truth** (dupes 209:1782, 216:2787 deleted; dark frames re-pointed here) |
| Segment | 231:54 | State {Default/Hover/Selected/Pressed/Focus} |
| RangeSelector | 231:55 | composed 1W/1M/1Y/YTD/ALL (1M selected) |
| Card | 13:11 | State {Default/Hover/Pressed/Focus} — Hover=accent border, Pressed=raised fill, Focus=accent ring. **Static cards use Default only** |
| Card / Interactive | 292:26 | **Clickable/navigational card** — whole surface is the action (trailing → affordance) + Default/Hover/Pressed/Focus. Used by the FIRE card. Static cards omit these states |
| Badge | 14:12 | Tone {Positive/Negative/Neutral}. Neutral = `accent-bg` fill + `accent` text (updated 2026-06, was raised+secondary) |
| Chip | 30:9 | Style {Neutral/Outline/Inverse} (updated 2026-06): Neutral = `surface-sunken` + `text-secondary`; Outline = `surface` + `border` + `text-primary`; Inverse = `surface-inverse` (mid-grey) + `text-on-inverse` (was ink/black) |
| Skeleton | 237:3 | loading placeholder (animate shimmer in code) |
| EmptyState | 237:4 | icon + H2 + body + CTA (swap per context) |
| Alert | 237:37 | Tone {Error/Info} — inline fetch-failure banner + Retry |
| ChartTooltip | 240:24 | hover date + value |

**Interaction states:** every interactive component documents Default/Hover/Pressed/Focus (+Disabled/Loading for Button, Selected for Segment, Active for NavPill items). Action Button, Chip, and NavPill item states are shown in the docs; Alert's Retry is a Button/Ghost instance (inherits all button states). EmptyState = icon + H2 + body + primary CTA. RangeSelector composed control is shown in the Segment entry. **Focus ring in code = `ring-ink` (neutral accent).** ⚠️ Re-audit 2026-07: a `color/focus` token **does exist** in the Figma Color collection (**`#525252`, n600** in Light) and the Button set's focus/active state binds it — i.e. Figma specs a *soft n600 grey* focus, not the near-black accent the code uses. Not yet reconciled: the dark-mode value of `color/focus` couldn't be read from the MCP (no focused node lives in a dark frame), and a dim grey ring would *lower* dark-mode contrast vs the current white ring — so the code deliberately keeps `ring-ink` pending a confirmed dark value + a cross-component focus-color decision. (Earlier note claimed the token was removed — false.) Static elements (Badge, Skeleton, Icon, ChartTooltip, breakdown bar) are stateless by design. The Documentation page shows all states in light + dark.

**States page** holds Skeleton / EmptyState / Alert / ChartTooltip / a `NetWorthCard / Loading` example / an `Edge cases (reference)` frame (negative net worth, long numbers, 0%/100% FIRE).

**Chart** is hand-drawn in Figma (lines/vectors) — **build with Recharts**, not from the vectors. Spec: 2 lines (primary = `color/accent` neutral, comparison = grey `color/text-muted`), dotted projection to an end-dot; hover → `ChartTooltip` + crosshair; empty/insufficient data → `EmptyState` pattern.

**Nav**: active item = neutral pill (`color/surface`) + `color/text-primary` icon/label; inactive = `color/text-muted`. NavPill is a baked component (`NavPill/Desktop/Light` 202:2605, `NavPill/Mobile/Light` 202:2606); dark mode renders via tokens (verified).

**Open question for dev:** negative *total* net worth — currently shown orange in the edge-case frame (following negative=orange), but a balance isn't a delta. Confirm whether totals should be orange or stay neutral.

### UI consistency rule (Heuristic #4)

**Toolbar action buttons must be identical in style and size across all screens.** The reference is the Portfolio screen header (370:1455). Any new screen that has an Add/primary action button must match exactly:
- **Size**: M = 38px height, `px-4` horizontal padding, pill (`cornerRadius 999`)
- **Fill**: `color/surface-inverse` (mid-grey, primary style)
- **Label**: 14px Inter Semi Bold
- **Icon**: 16px plus glyph (dot-matrix `Icon/Plus`)
- **Gap**: 6px between icon and label

The label text can differ by screen context ("Add trade" on Portfolio, "Add" or "Add transaction" on Spending) but every other property is locked. Before building a new screen's header, screenshot the Portfolio header as the reference — do not estimate sizes from memory.

### Figma Plugin API rules (for Claude)
These rules prevent wasted iterations:

1. **`rescale(factor)` not `resize(w,h)`** — `resize` only changes bounding box on non-auto-layout frames; `rescale` proportionally scales all children. Use `rescale(targetSize / masterSize)`.
2. **Auto-layout child order = visual order** — to place an icon *before* a text label, use `parent.insertChild(0, instance)`. `appendChild` puts it last.
3. **Pixel art in auto-layout frames** — disable layout first: `frame.layoutMode = 'NONE'`, then set `x`/`y` on each dot. Otherwise dots stack in a row.
4. **Transparent containers** — new frames/auto-layout containers get a white fill by default. Set `fills = []` to make them transparent.
5. **TEXT nodes have no `layoutMode`** — guard with `if (!('children' in node)) return` before accessing layout properties in `findAll` callbacks.
6. **Instances vs components** — always call `component.createInstance()` to place a component in a frame; never move the component master itself.
7. **`setCurrentPageAsync`** — use `await figma.setCurrentPageAsync(page)` to switch pages; `figma.currentPage = page` is not supported.

---

## Portfolio screen + Forms (designed 2026-06, Screens/Dashboard page 15:2)

The Portfolio surface was designed in Figma (desktop 1440 + mobile 375), reusing William tokens/components. Frames live on **page 15:2** in two sections: **"Portfolio — Final"** (370:1455) and the modal/menu sections below.

### Portfolio screen structure
- **Header**: title + subtitle (`6 holdings · Updated 2h ago`) + actions. Actions are **icon + label pills** (all three, incl. Refresh — not icon-only). Desktop = right-aligned `Refresh · Import · + Add trade`. **Mobile = `+ Add trade · Refresh · Import`** (Add trade primary first, all equal pills, none full-width — Figma 488:6940).
- **Bento row**: *Portfolio Value* summary card (value, gain merged line `↑ +$… · +%`, invested, # positions) + *Allocation* card.
- **Allocation card**: documented breakdown bar (**gap 3, segment r4**, palette `accent · positive-bg · blue-bg · accent-bg`) + legend (top-3 holdings + "Other" = real sum). Header has a **"Set targets"** button (entry to rebalancing).
- **Holdings table**: columns **Asset · Price · Shares · Market Value · Gain ($) · Return (%)**. Gain $ and Return % are **separate columns** (so all three are sortable).
- **Canonical default list screen:** `Foundations page → Portfolio v2 / Desktop → Content → HoldingsCard` — node **`362:140`**. This is the single source of truth for the holdings table layout, column widths, typography, badge treatment, and sort defaults. Do not redesign the list without updating this reference frame. Key defaults: **default sort = Market Value, descending**; asset market badge = "Global" or "TASE" outline chip next to ticker; TASE prices show ₪ (already divided by 100 from agorot at import); Price / Market Value / Gain columns use **Geist Mono** (tabular numbers); Gain and Return use `color/positive` (lime) for positive values, `color/negative` (orange) for negative. Documented on the Documentation page as "Doc/Holdings Table" (node `669:1902`).

### Sorting = sortable columns (NOT a segmented control)
- The old Value/Gain/Return segment implied *view switching*; replaced with **sortable column headers**. To make sortability obvious, **all 3 sortable headers (Market value / Gain / Return) always show a `↓` arrow**: inactive = `text-muted` label + **40%-opacity** arrow (brightens to full on hover, pointer cursor); active = **`font-semibold` `text-ink`** label + the live direction arrow (`↓` desc / `↑` asc). Non-sortable headers (Asset/Price/Shares) stay plain `text-muted`, no arrow. In Figma the active label+arrow use **Geist Mono SemiBold**; inactive arrows are **Geist Mono Medium, `text-muted`, 40% opacity** (applied to all 3 desktop ColHeaders: 411:1505, 488:6619, 417:1887).
- **Sort direction (asc/desc):** holdings can sort both ways. **Desktop** column headers use the standard table pattern — click the active column to flip direction (`↓`/`↑`); click another column to switch field (resets to desc). **Mobile** uses an **explicit direction toggle** in the dropdown menu (a `DESCENDING`/`ASCENDING` row with arrow), NOT tap-the-field-to-flip — field rows just select (keep direction, show ✓). Tapping the toggle flips in place and keeps the menu open. Code: `usePortfolioData(sortBy, sortDir)`; `sortDir` state + `toggleDir()` in `WilliamPortfolio/index.tsx`.
- **Mobile sort control = outline pill, NO icon.** A dot-matrix sort glyph was trialled but read too much like the Trade icon — removed. The trigger is an **outline pill** (`surface` + `border` + `text-primary`) so it reads as an adjustable control, showing `FIELD ↓` (arrow = current direction). **Exact specs (Figma 499:2167):** mono labels are **12px / 0.6px letter-spacing**; trigger pad 12/6, gap 6; menu = `surface` + `border` r12, **200px** wide, pad 6, **2px gap** between items; items pad 12/10, r8; selected field = `accent-bg` + `accent` text + ✓ (the ✓ is **Inter 13px, not mono**); a 1px `border` divider separates the field rows from the `DESCENDING`/`ASCENDING` toggle row (toggle arrow is **Geist Mono 13px**).
- **Many-holdings edge case**: `— Many holdings` desktop frame (14 rows) confirms the table scales (page grows / scrolls).

### Add modals (Trade / Income / Expense) — section "Add Transaction Modals" (497:1973)
- **Desktop** = centered dialog on a 45% black scrim; **mobile** = bottom sheet (drag handle, top-rounded r24, full-width primary CTA, ✕ dismisses).
- **Trade** fields: Buy/Sell · Ticker + Name · Global/TASE · Quantity · Price(+currency) · Date · Asset category · Notes.
- **Income/Expense** fields: type segment · **Amount** · Category · Date · Payment method (expense) / Destination (income) · Notes.
- **Money-direction carries into inputs**: the Amount renders **orange (expense) / lime (income)** — the only chromatic color in the form.

### Set Targets modal + drift state
- **Set Targets modal** (section "Sort Menu & Set Targets" 503:2167): By category / By holding segment · row per holding (current % + target % input) · running **Total allocated** with a `Balanced` badge at 100% · footer `Turn off targets` · Cancel · Save.
- **Allocation drift state** (section "Allocation — Targets / Drift" 508:2167): once targets set, the allocation bar shows **target tick markers** (thin vertical lines at each target boundary) + legend **"vs target" drift chips** (+2% / −1% …); "Set targets" → **"Edit targets"**.
- **⚠️ Drift is NEUTRAL, never money-direction color.** Over/under target is not a gain/loss — drift chips + ticks use neutral/`text-secondary`, NOT orange/lime. (The black `accent` first segment hides a black tick → that segment was set to **grey** in the drift card by Balzhima for tick contrast.)

### Conventions locked this round
- **Date format = `DD.MM.YYYY`** (e.g. `09.06.2026`) everywhere.
- **All dropdown/select arrows are `Geist Mono` Medium** (▾ / ↓) — matches the tabular-number treatment. Apply to every future dropdown.

### Forms components (Forms page 509:140) — new, formalized 2026-06
Field/menu styles were extracted from the modals into reusable components. Shared style: fill `surface-sunken`, 1px `border`, **r12**, 44px height, label 13 `text-secondary`, value 15 `text-primary` / placeholder `text-muted`.
| Component | ID | Variants |
|---|---|---|
| Input | 509:149 | State {Default / Focus (accent 2px border) / Error (negative border) / Disabled} |
| Select | 510:146 | State {Default / Focus}; trailing `▾` Geist Mono |
| Textarea | 510:147 | single (76px, top-aligned) |
| MenuItem | 511:145 | State {Default / Selected (accent-bg + accent + ✓)} |
| Menu | 511:146 | popover: surface + border r12, pad 6, item gap 2 |
- The modal **type toggles** (Buy/Sell, Expense/Income, By category/By holding) reuse the **Segment** pattern (sunken track, selected = `surface` pill).

### Code implementation (shipped)
- **Screen**: `src/pages/WilliamPortfolio/` (`index.tsx` + `usePortfolioData.ts`), route `/william/portfolio`. Display via `calculateCurrentHoldings`; sortable columns (desktop) / sort dropdown (mobile); allocation top-3 + Other.
- **Allocation drift state** (coded): when `allocationStore.mode === 'individual'`, the hook adds per-row `target` + `drift`; the card shows **target tick markers** (neutral grey `bg-muted` #737373, **2×10px rounded, vertically centered** on the 14px bar — `top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full` — grey reads on every segment incl. the black NVDA one, so no segment recolor needed; the "marks your target weight" caption uses a matching 2×10 rect prefix, not a glyph; matches Figma 508:2167 where ticks are 2×10 `rounded-rectangle`s), **neutral "vs target" drift chips** (`vs target` is `hidden md:inline`), and **"Set targets" → "Edit targets"**. Bar is continuous (no gaps) in drift mode so ticks align to cumulative target %.
- **Modals**: `src/pages/WilliamPortfolio/modals.tsx` — `AddTradeModal`, `AddTransactionModal` (income/expense), `SetTargetsModal`, wired to real stores (`addTrade`, `addTransaction`, `allocationStore.setAllocation`). Mounted on **both** the Portfolio screen (Add trade, Set targets) and the **Dashboard** action buttons (Trade/Income/Expense). **Refresh** uses `useRefreshPrices` and **Import** opens `ImportExcelModal` — both native now (no `/portfolio` bridge).
- **New william components**: `Modal` (responsive — desktop dialog / mobile bottom sheet, scrim, Esc + scroll-lock) and `Field` primitives (`Field`, `TextInput`, `Textarea`, `SelectInput` with mono `↓`, `SegmentToggle`). `Button` gained a **`pill`** prop (the Figma master is a pill at every size, so `pill` **defaults to `true`**; pass `pill={false}` for the r12 rect) and a **`size`** prop — see the Button size scale below.

### Button size scale — ported 1:1 from the Figma Button master (2026-07 re-audit)
**Aligned to the Figma Button master `897:7790`.** The master ships **3 sizes (S/M/L)** with a **14px SemiBold** label at *every* size — only height / horizontal pad / icon change. The code `Button` (`src/components/william/Button.tsx`) takes `size?: 'l'|'m'|'s'|'xs'` (default `m`); `xs` is a **code-only** inline size with no Figma peer:
| Size | Height | H-pad | Label | Icon | Used for |
|---|---|---|---|---|---|
| **L** | **42px** | px-5 (20) | 14px SemiBold | 20 | prominent CTAs — modal confirm/cancel, empty-state + dashboard "Add trade" |
| **M** | **36px** | px-4 (16) | 14px SemiBold | 18 | **default** — Portfolio toolbar pills (Refresh/Import/Add trade) |
| **S** | **27px** | px-[18] | 14px SemiBold | 16 | compact secondary — Set/Edit targets |
| **XS** | 28px | px-3 | 12px Medium | 14 | code-only — chips / inline (Account CRUD, sort-trigger mirror) |
- The master's default **shape is a pill (r999) at every size**, so the code `pill` prop now **defaults to `true`**; pass `pill={false}` for a 12px-radius rect.
- ⚠️ **Figma-internal inconsistency (flagged 2026-07):** the separate **Danger button** master (`899:7421`) draws **Large = 44px**, 2px taller than the regular Button's 42px. `DangerButton.tsx` mirrors its own master (L=44); `Button.tsx` uses 42. Both are faithful — reconcile in Figma when convenient.
- History: the earlier `44 / 38 / 32 / 28` scale + `rounded-xl` default + Medium labels were a code-side decision that had drifted from the master; re-synced 2026-07 per Balzhima ("Figma is right").
- **Variants (all borderless, 2026-07)**: `primary` · `secondary` (Figma "Neutral": WHITE pill for the grey canvas — page-level toolbars like Portfolio Refresh/Import) · **`tonal`** (Figma "Tonal": n100 grey pill for buttons ON white cards + modal footers — Set targets, Edit, modal Cancels, sort trigger; light `#f5f5f5`, dark n800) · `ghost` (Figma "Subtle"). Secondary/tonal share the darkened hover/pressed ladder (n200/n300 light) via `--w-btn-*` vars mirroring the Figma `color/btn-*` tokens. Rule of thumb: **grey canvas → secondary, white surface → tonal**. `color/negative` light = orange/600 (`#ea580c`, readable text); `negative-bg` = orange/100.
- **List components** (`src/components/william/List.tsx` ↔ Figma Lists page 928:7777): `List` (borderless card, px-5, `divide-y` inset hairlines) · `ListRow` (Short 58px single-line / Tall 60px with subtitle; optional 3×32 `marker` bar, `trailing`, `chevron`, `danger`) · `ListHeader` (18 SemiBold + mono action). Account groups + dashboard Recent activity (= Figma `Card / Activity`: header w/ SEE ALL, category marker bars hashed into the chart palette, income = positive lime) are composed from these. Figma Account frames are Row (Height=Short) instances; Row masters carry a top hairline divider (disabled on each card's first row). Destructive styling is **not** a Button variant — it lives in the standalone **`DangerButton`** (`src/components/william/DangerButton.tsx`, deliberately detached so destructive styles aren't reachable via the generic `variant` switch). Its variants: **`outline`** (default — `surface` fill, `border-negative`, `text-negative`, hover tints `bg-negative-bg` pale orange #fed7aa light / #431407 dark; Account → Danger zone triggers, desktop modal Delete) and **`subtle`** (borderless, transparent fill, `text-negative`, hover `bg-negative-bg`; low-emphasis destructive actions, e.g. the stacked mobile Delete in Edit Recurring — replaced the old `ghost + !text-negative` hack). Same size/pill API as Button. In Figma: the standalone **"Danger button"** set (`899:7421`, Buttons page) — Type {Primary = code `outline` · Neutral = tinted negative-bg fill (no code equivalent yet) · Subtle = code `subtle`} × State {Default/Hover/Pressed/Active/Disabled} × Size {S/M/L}. State fills (all types) are single mode-aware tokens: Hover = `negative-bg` (`btn-danger-hover` for Neutral) · Pressed = `btn-danger-pressed` · Active = orange stroke ring · Disabled = `btn-disabled`/`btn-disabled-text` (Subtle disabled stays transparent + muted label).
- **Date fields** use a **text input in `DD.MM.YYYY`** (helpers `isoToDDMM`/`ddmmToISO`) — not native date input — to honor the format.
- **Icon**: added `refresh / import / target / plus` dot-matrix glyphs (coords re-extracted from masters incl. Balzhima's Refresh edit).

---

## Account / Settings + theme (William) — designed & partially shipped 2026-06

Figma frames on the **Screens** page: `Account — Desktop` (572:2167) + `Account — Mobile` (577:2300). The old monolithic `/settings` is being split into isolated William pages reached from an **Account hub**.

### Theme (Light / Dark / Auto) — shipped
- `Settings.theme: 'light'|'dark'|'auto'` (default `auto`) in `settingsStore` (persisted) + `setTheme`.
- **`useWilliamTheme()`** (`components/william/useWilliamTheme.ts`), mounted in `App.tsx`, resolves the preference (auto → `matchMedia('(prefers-color-scheme: dark)')`, live-updating) and sets **`data-theme` on `<html>`**.
- CSS: dark tokens now also key off **`html[data-theme="dark"] .william`** (added alongside the existing `.william[data-theme="dark"]` / `.dark .william`), plus a global `html[data-theme="dark"]` page-bg rule. The toggle flips every William page at once.

### Account hub + routing — shipped
- `WilliamAccount` (`src/pages/WilliamAccount/index.tsx`), route **`/william/account`**. Theme toggle (3-seg, top) → grouped link rows → desktop footer. The William **nav account button now points here** (was `/settings`).
- **Grouping** (`sections.ts`, single source of truth): Connections (api, currency) · Money setup (expense-categories, income-categories, cards, income-destinations, assets) · Account & data (sync, data, danger). Danger zone row is `text-negative`.
- **Footer**: `balzhima.com` + Eitan's GitHub (`github.com/eitanrub7980`).
- Sub-pages: `/william/account/:slug` → `AccountSection` maps slug → page (`AccountSubPage` shell = back-to-Account header + title). **All 10 sections are ported to William pages** (Api, Currency, Categories[expense/income], Cards, IncomeDestinations, Assets, Sync, Data, Danger) — each reads/writes the same stores as classic `/settings` (categoriesStore, cardsStore, networthStore, settingsStore, exportImport service, supabase auth/sync). CRUD uses the william `Modal` + `Field`; Danger's hard-delete still requires typing `DELETE` and wipes `sync_stores`.

---

## Spending + All Transactions screens (designed 2026-06)

Figma frames on **Screens page** (15:2):
| Frame | Node | Size |
|---|---|---|
| Spending — Desktop | `617:2543` | 1440×1014 |
| Spending — Mobile | `617:2544` | 375×1287 |
| All Transactions — Desktop | `629:2786` | 1440×1084 |
| All Transactions — Mobile | `629:2787` | 375×1005 |

### Month-filtered view header — component (630:2923)
Header pattern for any view that shows content filtered by a selected month. Used by both Spending ("Spending for") and All Transactions ("Transactions for") pages.

Structure: `HORIZONTAL` auto-layout — title text (Inter SemiBold 32px, `color/text-primary`) + **month picker pill**.

**Month picker pill:** `r = 999`, fill `color/surface` + 1px `color/border`, text "June 2026 ▾" where the `▾` is **Geist Mono Medium** (same as all dropdown arrows). On mobile the title and pill sit on **separate lines** (title row + pill row below), not inline.

### Spending bento (desktop 617:2543)
Three-row bento grid:
| Row | Left card | Width | Right card | Width | Height |
|---|---|---|---|---|---|
| 1 | Hero (THIS MONTH SPENT + value + trend badge) | 472 | By Category (donut + legend + Set targets) | 708 | **337** (auto — hugs ByCategory content) |
| 2 | Recent (transaction list + See all ›) | 708 | Budgets (3 budget bars, no "View all") | 472 | 359 |
| 3 | Recurring nav card | 590 | Trends nav card | 590 | 76 |

Row 2 cards are equal-height via `layoutSizingVertical = 'FILL'` (both FILL the 359px row).

### Recurring + Trends nav cards
Mini nav cards that link to dedicated sub-pages. Each card: `HORIZONTAL` auto-layout, icon (20px) + VERTICAL text stack (title 15px SemiBold + subtitle 13px `text-secondary`). Present on both Spending desktop (Row 3) and Spending mobile (stacked between By Category and Recent).

- **Icon/Recurring** (657:1398) — ↻ dot-matrix circular arrow (18 dots): arc clockwise upper-left→bottom + arrowhead wings at end
- **Icon/Trends** (657:1421) — rising line chart with axes (22 dots): Y-axis + X-axis + jagged ascending data line

### Transaction list date headers
Date group headers (e.g. "TODAY · JUN 14", "JUN 12") are **plain text with no background fill** on both desktop and mobile. Mobile date headers had grey fills that were removed — do not re-add them. Category markers follow the standard `3×32 r2` rectangle rule.

### Budgets card
Summary card showing 3 budget category rows with progress bars. **No "View all ›" link** — there is no dedicated Budgets page yet; the card is purely informational. Desktop: node `636:4500` (inside spending desktop). Mobile: node `625:2720` (inside spending mobile).

---

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

**Color model (restraint = credibility) — final concept: "color = money direction":** warm-paper neutrals = base · monochrome (black/white) = accent, data line, nav, primary action · **lime = up / orange = down** are the *only* chromatic colors, applied exclusively to gain/loss values. The dashboard is greyscale except where money moves. This is stronger than the earlier "orange as accent" idea — it ties color to meaning, not decoration. (Tradeoff: orange-as-text fails AA on light surfaces ~2.8:1; accepted for identity.) Violet was considered and rejected.

**Material model (Superpower-inspired):** no shadows — elevation = paper-bg vs warm-white surface + hairline border; frosted glass (translucency + background blur) reserved for floating chrome (nav, overlays). Story angle: studied a reference product (superpower.com), extracted its *system rules* (warm neutrals, sparing accent, depth-without-shadow, blur), and re-derived them into our token layer rather than copying screens — the whole UI shifted by editing ~14 variables + removing effects, no per-screen rework.

**Process narrative (strong portfolio angle):** ran as a design-critique loop with Balzhima as editor; changed direction on evidence (the action-buttons decision); verified technical feasibility against the real codebase (Recharts) *before* committing to a design.

> Detailed running notes live in the auto-memory `project_redesign.md` / `ui-surface-style.md`. This section is the durable case-study lens to apply going forward.
