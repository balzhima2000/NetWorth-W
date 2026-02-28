# Net Worth Tracker - Pages Index

## Overview
5 main pages created for the personal net worth tracker React/TypeScript application.
All pages use Zustand for state management and Tailwind CSS for styling.

## File Locations

Base Directory: `C:/Users/eitan/Documents/networth-tracker/src/pages/`

### Page Files
1. **Dashboard/index.tsx** - Net worth overview
   - 151 lines | 6.6 KB
   - Route: `/dashboard` or `/`

2. **Portfolio/index.tsx** - Stock portfolio management  
   - 191 lines | 7.7 KB
   - Route: `/portfolio`

3. **Spending/index.tsx** - Transaction tracking
   - 174 lines | 6.2 KB
   - Route: `/spending`

4. **Fire/index.tsx** - FIRE calculators
   - 83 lines | 3.1 KB
   - Route: `/fire`

5. **Settings/index.tsx** - Configuration & data management
   - 127 lines | 5.0 KB
   - Route: `/settings`

### Documentation Files
- **PAGES_MANIFEST.md** - Comprehensive documentation
- **PAGES_QUICK_REFERENCE.md** - Quick lookup guide
- **PAGES_INDEX.md** - This file

## Quick Navigation

### By Feature
- **Net Worth Tracking**: Dashboard
- **Stock Investment**: Portfolio
- **Budget/Spending**: Spending
- **Retirement Planning**: Fire
- **Configuration**: Settings

### By Zustand Store
- **portfolioStore**: Dashboard, Portfolio, Settings
- **networthStore**: Dashboard, Settings
- **transactionStore**: Dashboard, Spending, Settings
- **settingsStore**: All pages
- **budgetStore**: Spending, Settings
- **categoriesStore**: Spending
- **cardsStore**: Settings
- **allocationStore**: Portfolio, Settings
- **recurringStore**: Settings

### By UI Component
- **GlassCard**: All pages
- **Button**: All pages
- **Modal**: Portfolio, Spending, Settings
- **Tabs**: Spending, Fire
- **Input**: Portfolio, Spending, Fire, Settings
- **Select**: Portfolio, Spending, Settings
- **Badge**: Dashboard, Portfolio, Fire
- **ProgressBar**: Dashboard, Fire

## Implementation Status

### Completed Features
✓ Dashboard: Complete with daily snapshots
✓ Portfolio: Complete with trade management
✓ Spending: Complete with monthly tracking
✓ Fire: Complete with 4 calculator tabs
✓ Settings: Complete with API key and data management

### Placeholder Features (Coming Soon)
- Portfolio mode switching (detailed/simple)
- Recurring payments tab in Spending
- Full FIRE calculation functions
- CSV/JSON export functionality

## Code Statistics
- Total Lines: 726 (excluding comments)
- Total Size: ~28 KB
- Average Page Size: 5.6 KB
- Components Used: 8 main UI components

## Development Notes

### TypeScript Support
- All files are .tsx format
- Proper React component typing
- Event handler type annotations
- State type definitions

### Performance
- useEffect dependencies properly configured
- Component state isolated with useState
- Global state via Zustand hooks
- Calculation memoization opportunities exist

### Styling Approach
- Responsive Tailwind grids
- Glass morphism effects
- Custom color scheme
- Mobile-first design

### Error Handling
- Form validation
- Empty states
- Null checks
- Graceful degradation

## Import Paths

Standard imports across all pages:

```typescript
// React
import React, { useState, useEffect } from 'react';

// UI Components
import { GlassCard, Button, Badge, Input, Select, Modal, Tabs, ProgressBar } from '../../components/ui';

// Utilities
import { formatCurrency, getCurrentMonthYear } from '../../utils/formatters';
import { calculateCurrentHoldings } from '../../utils/calculations';

// Constants
import { CURRENCIES, ASSET_CATEGORIES } from '../../utils/constants';

// Zustand Stores
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useCardsStore } from '../../stores/cardsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useAllocationStore } from '../../stores/allocationStore';
```

## Routing Integration

To integrate these pages into your router:

```typescript
// React Router v6 example
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'portfolio', element: <Portfolio /> },
      { path: 'spending', element: <Spending /> },
      { path: 'fire', element: <Fire /> },
      { path: 'settings', element: <Settings /> },
    ]
  }
]);
```

## Next Steps

1. Create main layout component if not exists
2. Set up routing with page imports
3. Implement missing calculation functions
4. Add loading states for async operations
5. Set up error boundaries
6. Implement actual export functionality
7. Connect API endpoints for stock prices
8. Add data persistence (localStorage/database)

## Testing Checklist

- [ ] Dashboard displays correctly with sample data
- [ ] Portfolio form validates and adds trades
- [ ] Spending filters show current month only
- [ ] Fire calculators show results with inputs
- [ ] Settings clears data with confirmation
- [ ] All Zustand stores properly connected
- [ ] Responsive layout works on mobile
- [ ] Empty states display properly
- [ ] No console errors on page loads
- [ ] Currency formatting works globally

## API Keys Required

- Alpha Vantage API Key (for stock prices)
  - Get free key at: alphavantage.co
  - Limit: 25 requests/day
  - Configure in Settings page

