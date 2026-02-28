# Pages Quick Reference Guide

## Dashboard Page
File: src/pages/Dashboard/index.tsx | 151 lines | 6.6 KB

Purpose: Central hub showing net worth overview
Key Features:
- Net worth hero display (5xl font-mono)
- Three summary cards (Assets, Liabilities, Monthly Spending)  
- FIRE progress bar with percentage
- Top 5 portfolio holdings preview
- Automatic daily snapshot calculation

Zustand Stores:
- portfolioStore: trades, currentPrices, lastPriceUpdates
- networthStore: manualEntries, addSnapshot, lastSnapshotDate
- transactionStore: transactions
- settingsStore: fireTarget, defaultCurrency

## Portfolio Page
File: src/pages/Portfolio/index.tsx | 191 lines | 7.7 KB

Purpose: Stock portfolio management and trading
Key Features:
- Summary cards (Total Value, Invested, Unrealized Gain)
- Add Trade modal with form
- Holdings grid (responsive 3-column layout)
- Holding cards with performance metrics
- Refresh prices button
- Portfolio mode overlay (simple vs detailed)

Actions:
- Add new stock trade
- View holdings performance
- Refresh current prices
- Switch portfolio modes

## Spending Page
File: src/pages/Spending/index.tsx | 174 lines | 6.2 KB

Purpose: Track expenses and income
Key Features:
- Monthly spending overview
- Two tabs: Transactions & Recurring/Installments
- Add Transaction modal
- Transaction list with date, category, amount
- Income/Expense toggle
- Color coded: Red=expense, Green=income

Functionality:
- Monthly transaction filtering
- Category selection from store
- Income/Expense type toggle
- Auto currency conversion

## Fire Page
File: src/pages/Fire/index.tsx | 83 lines | 3.1 KB

Purpose: FIRE planning calculators
Four Calculator Tabs:
1. FIRE Number: Calculate target based on expenses and withdrawal rate
2. Time to FIRE: Years to reach goal with monthly contributions
3. SWR Table: Safe withdrawal rate analysis
4. Compound Interest: Investment growth projections

Features:
- Input validation
- Real-time calculations
- Set FIRE target from calculator
- Currency formatting

## Settings Page
File: src/pages/Settings/index.tsx | 127 lines | 5.0 KB

Purpose: Application configuration and data management
Sections:
1. API Configuration: Alpha Vantage API key setup
2. Currency Settings: Select default currency
3. Data Management: Export backups (JSON/CSV)
4. Danger Zone: Clear all data with confirmation

Actions:
- Save API key for live stock prices
- Change currency globally
- Export full data backup
- Export transactions as CSV
- Clear all data (requires "DELETE" confirmation)

## Store Integration

Stores Used Across Pages:
- portfolioStore: Dashboard, Portfolio, Settings
- networthStore: Dashboard, Settings
- transactionStore: Dashboard, Spending, Settings
- settingsStore: All 5 pages
- budgetStore: Spending, Settings
- categoriesStore: Spending
- cardsStore: Settings
- allocationStore: Portfolio, Settings
- recurringStore: Settings

## Common UI Components

GlassCard: Frosted glass container with padding options
Button: Primary, secondary, ghost, danger variants
Badge: Color-coded labels (green, red, blue)
Input: Text/number inputs with labels
Select: Dropdown selections
Modal: Dialog boxes with footer actions
Tabs: Tab navigation system
ProgressBar: Visual progress indicator

## Styling Summary

Colors:
- Green #00d632: Gains, progress, positive
- Red #ff4757: Losses, negative, danger
- White/opacity: Text hierarchy

Layout:
- space-y-6: Vertical spacing
- grid-cols-1 md:grid-cols-2 lg:grid-cols-3: Responsive grids
- Mobile-first approach

Typography:
- text-5xl: Hero text
- text-3xl: Page headers
- text-xl: Section headers
- font-mono: Numbers/currency

## Key Files Location

All files in: C:/Users/eitan/Documents/networth-tracker/src/pages/

- C:/Users/eitan/Documents/networth-tracker/src/pages/Dashboard/index.tsx
- C:/Users/eitan/Documents/networth-tracker/src/pages/Portfolio/index.tsx
- C:/Users/eitan/Documents/networth-tracker/src/pages/Spending/index.tsx
- C:/Users/eitan/Documents/networth-tracker/src/pages/Fire/index.tsx
- C:/Users/eitan/Documents/networth-tracker/src/pages/Settings/index.tsx

Total: 726 lines | 28.1 KB of code

