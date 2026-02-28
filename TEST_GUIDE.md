# 🧪 Net Worth Tracker - Complete Testing Guide

**App Status:** ✅ **LIVE** at http://localhost:5173
**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS v4
**Stores:** 9 persistent Zustand stores (localStorage auto-saved)
**Pages:** 6 (Setup Wizard, Dashboard, Portfolio, Spending, FIRE, Settings)

---

## 🚀 Quick Start Tests

### 1. **First-Time Launch (Fresh Browser)**
1. Go to http://localhost:5173
2. **Expected:** Redirects to `/setup` → Step 1: "Hello there! 👋"
3. Enter full name (e.g., "Eitan Cohen") and nickname (auto-fills as "Eitan")
4. Click **Continue**
5. **Expected:** Step 2: Privacy screen with "Hello, Eitan! 😊"
6. Click **Got it, let's set up!**
7. **Expected:** Step 3: Currency selector (default: USD)
8. Select a currency and click **Continue**
9. **Expected:** Step 4: Portfolio mode choice
   - Choose **Simple** → enter $50,000 → click **Continue**
   - OR **Skip for now** → click **Continue**
10. **Expected:** Step 5: Add payment cards
    - Click **+ Add Card** → enter "Visa Sapphire" → pick a color → click **Add**
    - Or click **Skip for now** → click **Continue**
11. **Expected:** Step 6: FIRE Target (optional)
    - Enter $1,000,000 → click **Continue**
    - OR check "I don't have a target yet" → click **Continue**
12. **Expected:** Step 7: "You're ready to go! 🎉"
    - Review summary of settings
    - Click **Go to Dashboard** → should go to `/dashboard`
13. **Expected:** Can't access setup again
    - Try navigating directly to `/setup` → should redirect to `/dashboard`

---

## 📊 Dashboard Testing

### 2. **Net Worth Display**
1. On Dashboard, you should see:
   - **Net worth hero** with large number at top
   - Three cards: **Total Assets**, **Total Liabilities**, **This Month Spending**
   - FIRE Progress bar (if you set a target in setup)
   - Portfolio Holdings preview (if you added holdings)

2. **Test calculations:**
   - Net Worth = Total Assets - Total Liabilities
   - In simple mode: Total Assets = $50,000 (from setup)
   - Total Liabilities = $0 (none added)
   - Expected Net Worth = $50,000

### 3. **Add Assets/Liabilities (via Settings)**
1. Go to **Settings** page
2. Scroll to **Data Management** section
3. Export Full Backup as JSON (should download a file)
4. Try **Clear All Data** → type "DELETE" → confirm (should erase everything)
5. Reload the app → should redirect to `/setup` again (starting fresh)

---

## 💼 Portfolio Testing

### 4. **Add Stock Trade**
1. Go to **Portfolio** page
2. Click **+ Add Trade**
3. Modal appears: enter fields:
   - Ticker: `AAPL`
   - Quantity: `10`
   - Price per Share: `150.50`
   - Asset Category: `Stocks`
4. Click **Save Trade**
5. **Expected:**
   - Modal closes
   - New holding card appears showing:
     - Ticker: AAPL
     - Shares Held: 10
     - Current Price: $150.50
     - Current Value: $1,505
     - Unrealized Gain: $0 (no price change yet)

### 5. **Add Another Buy (Blended Cost Basis)**
1. Click **+ Add Trade** again
2. Add another AAPL trade:
   - Ticker: `AAPL`
   - Quantity: `10`
   - Price per Share: `160.00`
3. **Expected:**
   - Holding updates to 20 shares
   - Blended cost basis shows as avg: (150.50 + 160) / 2 = ~$155.25
   - Total cost basis: 20 × $155.25 = $3,105
   - Current value: 20 × current price

### 6. **Portfolio Summary**
1. Header shows:
   - **Total Value:** sum of all holdings × current price
   - **Total Invested:** sum of cost bases
   - **Unrealized Gain:** Value - Invested (color: green if positive, red if negative)

### 7. **Simple Mode Overlay**
1. If you chose "Simple" during setup:
   - Portfolio page should show a **blurred overlay**
   - Button: **Switch to Detailed Portfolio**
   - Can't interact with holdings until you switch

---

## 💳 Spending Testing

### 8. **Add Transaction**
1. Go to **Spending** page
2. Click **+ Add Transaction**
3. Modal appears:
   - Toggle **Expense** or **Income**
   - Enter Amount: `45.50`
   - Select Category: (e.g., `Food & Dining`)
4. Click **Save**
5. **Expected:**
   - Transaction appears in list
   - Amount shows as `-45.50` (red) for expense or `+45.50` (green) for income
   - Date defaults to today
   - Counter at top updates: "+1 transaction"

### 9. **Add Multiple Transactions**
1. Add 3-4 transactions in different categories
2. Monthly spending total updates automatically
3. Each transaction shows:
   - Category name
   - Date
   - Colored amount (green for income, red for expense)

### 10. **Tabs**
1. Top of Spending page has 2 tabs:
   - **Transactions** (active) - shows list
   - **Recurring & Installments** - shows placeholder "Coming Soon"
2. Click tab to switch (both should work)

---

## 🔥 FIRE Calculators Testing

### 11. **Tab 1: FIRE Number**
1. Go to **FIRE** page (4 tabs at top)
2. On **FIRE Number** tab:
   - Enter Annual Expenses: `40000`
   - Enter Withdrawal Rate %: `4`
3. **Expected:**
   - Result shows: **$1,000,000** (40,000 / 0.04)
   - Button appears: **Set as FIRE Target**
4. Click **Set as FIRE Target**
5. **Expected:**
   - Button changes to **✓ Set as Target**
   - Go to Dashboard → FIRE Progress bar should appear with 0% (no savings yet)

### 12. **Tab 2: Time to FIRE**
1. On **Time to FIRE** tab:
   - Current Savings: `150000`
   - Monthly Contributions: `2000`
   - Expected Annual Return %: `7`
   - FIRE Target: `1000000` (auto-filled from Tab 1)
2. **Expected:**
   - Years to FIRE: ~14.3
   - Target Year: 2038 or 2039
   - Shows projection calculation

### 13. **Tab 3: SWR Table**
1. On **SWR Table** tab:
   - Enter Total Savings: `800000`
2. **Expected:**
   - Table appears with 7 rows (3% to 6%)
   - Each row shows: Rate, Annual, Monthly, Safety label
   - 4% row is highlighted (standard recommendation)
   - Colors: Green for ≤3.5%, Yellow for 3.5-4%, Orange for 4-5%, Red for >5%

### 14. **Tab 4: Compound Interest**
1. On **Compound Interest** tab:
   - Initial: `10000`
   - Monthly Contribution: `500`
   - Annual Return %: `7`
   - Years: `20`
2. **Expected:**
   - Total Contributed: ~130,000
   - Total Growth: calculated growth
   - Final Value: sum of both

---

## ⚙️ Settings Testing

### 15. **Currency Settings**
1. Go to **Settings** page
2. Find **Currency Settings** section
3. Change currency to **EUR**
4. Go to Dashboard → all amounts should show **€** instead of **$**
5. Go back to Settings → confirm EUR is still selected

### 16. **API Configuration**
1. Find **API Configuration** section
2. Enter Alpha Vantage API key (get free one at alphavantage.co)
3. Click **Save API Key**
4. (Key is now saved for stock price fetching)
5. You can test it later when we add "Refresh All Prices" in Portfolio

### 17. **Data Export**
1. Add some data (trades, transactions)
2. Click **📥 Export Full Backup (JSON)**
   - File downloads: `networth-backup-YYYY-MM-DD.json`
3. Click **📊 Export Transactions (CSV)**
   - File downloads: `transactions-YYYY-MM-DD.csv`
4. Check "Last backup:" timestamp updates

### 18. **Clear All Data (Danger Zone)**
1. Click **🗑️ Clear All Data**
2. Modal: "Type DELETE to confirm"
3. Type `DELETE`
4. Click **Clear All Data**
5. **Expected:** All stores clear, app redirects to setup

---

## 🎨 UI & Design Testing

### 19. **Dark Theme & Glassmorphism**
- [ ] Background is dark (#0a0a0f)
- [ ] Cards have glass effect (semi-transparent white bg + blur)
- [ ] Accents: Green (#00d632), Red (#ff4757), Blue (#5865f2)
- [ ] Text is white/readable on dark bg
- [ ] Hover effects work on buttons and cards

### 20. **Responsive Design**
1. **Desktop (1920px width):**
   - Sidebar visible on left
   - 3-column layouts for cards
   - Full width for tables
2. **Tablet (768px width):**
   - Sidebar might collapse
   - 2-column layouts
3. **Mobile (375px width):**
   - Sidebar hidden
   - Bottom nav bar appears
   - 1-column layouts
   - Test by resizing browser window

### 21. **Navigation**
1. Sidebar (desktop) or Bottom Nav (mobile) should show:
   - 📊 Dashboard
   - 💼 Portfolio
   - 💳 Spending
   - 🔥 FIRE
   - ⚙️ Settings
2. Click each → should navigate correctly
3. TopBar shows page title + user greeting ("Hello, Eitan 👋")

---

## 💾 Data Persistence Testing

### 22. **localStorage Auto-Save**
1. Add some data:
   - Add a stock trade in Portfolio
   - Add a transaction in Spending
   - Change currency in Settings
2. **Refresh the page** (F5)
3. **Expected:**
   - All data persists
   - Trades, transactions, settings all restored
   - This is handled by Zustand persist middleware

### 23. **Multiple Tabs**
1. Open the app in **2 browser tabs**
2. In Tab 1: Add a trade in Portfolio
3. In Tab 2: Go to Dashboard
4. **Expected:**
   - Portfolio value on Dashboard updates automatically
   - Both tabs stay in sync

---

## ✅ Full Feature Checklist

**Onboarding Wizard:**
- [ ] 7 steps all functional
- [ ] Progress bar shows correct step
- [ ] Name/nickname auto-fill works
- [ ] Currency selection persists
- [ ] Portfolio mode (Simple/Detailed) works
- [ ] Cards can be added/removed
- [ ] FIRE target optional
- [ ] Final summary correct

**Dashboard:**
- [ ] Net worth calculation correct
- [ ] Assets - Liabilities = Net Worth
- [ ] FIRE progress bar appears (if target set)
- [ ] Portfolio holdings preview shows

**Portfolio:**
- [ ] Add trade modal works
- [ ] Holding cards appear with correct values
- [ ] Blended cost basis calculated correctly
- [ ] Unrealized gain shows with % and color
- [ ] Simple mode overlay shows (if applicable)

**Spending:**
- [ ] Add transaction works
- [ ] Expense/income toggle works
- [ ] Color-coded amounts (red/green)
- [ ] Monthly filtering works
- [ ] Tabs work (Transactions/Recurring)

**FIRE:**
- [ ] All 4 tabs work
- [ ] FIRE Number calculates correctly
- [ ] Time to FIRE shows projection
- [ ] SWR table has 7 rows, color-coded
- [ ] Compound interest calculates
- [ ] Can set FIRE target

**Settings:**
- [ ] Currency dropdown works
- [ ] API key saves
- [ ] Export JSON downloads file
- [ ] Export CSV downloads file
- [ ] Clear All Data with "DELETE" confirmation works

---

## 🐛 Known Limitations (v1)

- ❌ Recurring payments auto-add logic not yet connected
- ❌ Installment plans not yet connected
- ❌ Charts (Recharts) not yet implemented (placeholders only)
- ❌ Allocation drift badges not yet calculated
- ❌ Import JSON feature not yet implemented
- ❌ Budget alerts not yet connected
- ❌ Alpha Vantage price fetching not yet integrated

---

## 📝 Notes

- All data is stored in **browser localStorage** (private, secure)
- Max 730 net worth snapshots stored (2-year history)
- Up to 25 Alpha Vantage requests per day (free tier)
- Exchange rate conversion happens at transaction entry time
- Blended cost basis = weighted average of all buys for a ticker

---

**Ready to test? Open http://localhost:5173 in your browser!** 🚀
