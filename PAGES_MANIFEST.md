# Net Worth Tracker - Pages Implementation

Created: 2026-02-28
Total Files: 5 main pages

## Files Created

### 1. Dashboard (C:/Users/eitan/Documents/networth-tracker/src/pages/Dashboard/index.tsx)
**Purpose:** Net worth overview and summary page

**Features:**
- Net worth hero display with current total
- Summary cards showing Total Assets, Total Liabilities, Monthly Spending
- FIRE progress bar with percentage towards goal
- Portfolio holdings preview (top 5 holdings)
- Empty state messaging for new users
- Automatic daily snapshot calculation via useEffect

**Zustand Integration:**
- `usePortfolioStore`: trades, currentPrices, lastPriceUpdates
- `useNetWorthStore`: manualEntries, addSnapshot, lastSnapshotDate
- `useTransactionStore`: transactions
- `useSettingsStore`: fireTarget, defaultCurrency

**Key Functions:**
- `calculateCurrentHoldings()`: Calculates portfolio values
- `getCurrentMonthYear()`: Gets current month for spending calc
- `formatCurrency()`: Formats currency display

---

### 2. Portfolio (C:/Users/eitan/Documents/networth-tracker/src/pages/Portfolio/index.tsx)
**Purpose:** Stock portfolio management and trading

**Features:**
- Summary cards: Total Value, Total Invested, Unrealized Gain
- Add Trade button with modal form
- Current Holdings grid (responsive cards)
- Holding details: shares, current price, current value, gain/loss
- Refresh All Prices button (when API key configured)
- Portfolio mode overlay (simple vs detailed mode)
- Asset category badges

**Zustand Integration:**
- `usePortfolioStore`: trades, currentPrices, lastPriceUpdates, addTrade, updateCurrentPrice
- `useAllocationStore`: Portfolio allocation tracking
- `useSettingsStore`: portfolioMode, defaultCurrency, alphaVantageApiKey

**Key Components:**
- GlassCard with hover effect
- Input fields for ticker, quantity, price
- Select dropdown for asset categories
- Modal for adding trades

---

### 3. Spending (C:/Users/eitan/Documents/networth-tracker/src/pages/Spending/index.tsx)
**Purpose:** Transaction and expense tracking

**Features:**
- Spending Overview with monthly totals
- Two tabs: Transactions & Recurring/Installments
- Add Transaction button with modal
- Transaction list showing date, category, amount
- Income/Expense toggle in modal
- Category selection dropdown
- Monthly transaction filtering and totaling

**Zustand Integration:**
- `useTransactionStore`: transactions, addTransaction, lastUsedPaymentMethod
- `useBudgetStore`: budgets, addBudget
- `useCategoriesStore`: categories list
- `useSettingsStore`: defaultCurrency

**Key Features:**
- Type toggle (Expense/Income)
- Amount input with validation
- Category selection with proper formatting
- Color coding: red for expenses, green for income
- Monthly aggregation

---

### 4. Fire (C:/Users/eitan/Documents/networth-tracker/src/pages/Fire/index.tsx)
**Purpose:** FIRE (Financial Independence, Retire Early) calculators with 4 tabs

**Features:**
1. **FIRE Number Tab**: Calculate required savings based on annual expenses and withdrawal rate
2. **Time to FIRE Tab**: Calculate years until FIRE goal based on current savings and monthly contributions
3. **SWR Table Tab**: Safe withdrawal rate analysis table showing different spending scenarios
4. **Compound Interest Tab**: Calculate investment growth over time

**Zustand Integration:**
- `useSettingsStore`: fireTarget, setFireTarget, defaultCurrency

**Calculation Functions Used:**
- `calcFireNumber()`: FIRE = expenses / (withdrawal rate / 100)
- `calcYearsToFire()`: Time to reach target with monthly contributions
- `calcSWRTable()`: Generate SWR analysis table
- `calcCompoundInterest()`: Calculate compound growth

**UI Elements:**
- Tab navigation system
- Input sections with labels and placeholders
- Result display sections
- Formatted currency output
- Progress indicators where applicable

---

### 5. Settings (C:/Users/eitan/Documents/networth-tracker/src/pages/Settings/index.tsx)
**Purpose:** Application configuration and data management

**Features:**
- API Configuration section for Alpha Vantage key
- Currency settings with full currency list
- Data Management section with export options:
  - Export Full Backup (JSON)
  - Export Transactions (CSV)
  - Last backup timestamp display
- Danger Zone with Clear All Data option
- Confirmation modal for destructive actions

**Zustand Integration:**
- `useSettingsStore`: currency, API key settings, lastBackupDate
- `usePortfolioStore`, `useTransactionStore`, `useBudgetStore`: For data reset
- `useNetWorthStore`, `useCardsStore`, `useRecurringStore`: For clearing all data
- `useCategoriesStore`, `useAllocationStore`: For reset functionality

**Key Functions:**
- `handleExportJson()`: Export all data as JSON backup
- `handleExportCsv()`: Export transactions as CSV
- `handleClearAll()`: Clear all store data with "DELETE" confirmation

---

## Common Imports Across All Pages

```typescript
import React, { useState, useEffect } from 'react';
import { GlassCard, Button, Badge, Input, Select, Modal, Tabs, ProgressBar } from '../../components/ui';
import { formatCurrency, getCurrentMonthYear } from '../../utils/formatters';
import { calculateCurrentHoldings, calcFireNumber } from '../../utils/calculations';
import { CURRENCIES, ASSET_CATEGORIES } from '../../utils/constants';
```

## Store Dependencies

All pages use Zustand stores from:
- `../../stores/portfolioStore`
- `../../stores/networthStore`
- `../../stores/transactionStore`
- `../../stores/settingsStore`
- `../../stores/budgetStore`
- `../../stores/categoriesStore`
- `../../stores/cardsStore`
- `../../stores/recurringStore`
- `../../stores/allocationStore`

## Styling Approach

All pages use:
- Tailwind CSS for styling
- Glass morphism cards (GlassCard component)
- Responsive grid layouts (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Custom color scheme:
  - Green: #00d632 (gains, positive values)
  - Red: #ff4757 (losses, negative values)
  - White with opacity for text hierarchy
  - Bg: Dark background with glass effect

## State Management

Pages implement:
- Local component state via `useState()` for form inputs and UI state
- Global state via Zustand hooks for data persistence
- useEffect for side effects (e.g., daily snapshot calculation in Dashboard)

## TypeScript Support

All files are properly typed with:
- React.FC or default function exports
- Type annotations for props
- Proper event handler typing
- Union types for state (e.g., type 'expense' | 'income')

## Next Steps / TODOs

1. Dashboard: Implement price update logic and alerts
2. Portfolio: Add sell trade functionality and trade history
3. Spending: Implement recurring payments and installments
4. Fire: Implement full FIRE calculation functions
5. Settings: Integrate actual export/import functionality
6. All pages: Add loading states and error handling
7. Add routing to connect pages in main app
