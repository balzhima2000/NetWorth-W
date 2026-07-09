/**
 * Demo / placeholder dataset.
 *
 * Purpose: so the app (esp. the William preview screens) always renders with
 * realistic data filled in instead of empty states — useful while designing.
 *
 * Safety:
 *  - Runs only when `hasCompletedSetup` is false, i.e. this install has no real
 *    user yet. A real account (post-setup) is never touched, and demo rows can
 *    never leak into cloud sync (sync only runs for signed-in, set-up users).
 *  - Each store is seeded only when it is still empty, so it's idempotent and
 *    never duplicates or overwrites anything the user has since added.
 *
 * Everything is dated relative to "now" at runtime, so the dataset stays filled
 * (this month's spending, recent activity, the net-worth chart) whenever viewed.
 *
 * Default currency is ILS (see settingsStore). Native USD holdings carry an
 * exchange rate so conversion to ILS works.
 */
import { usePortfolioStore } from '../stores/portfolioStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useRecurringStore } from '../stores/recurringStore';
import { useNetWorthStore } from '../stores/networthStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useCardsStore } from '../stores/cardsStore';
import { useSettingsStore } from '../stores/settingsStore';
import type {
  StockTrade,
  Transaction,
  RecurringPayment,
  InstallmentPlan,
  ManualEntry,
  NetWorthSnapshot,
  MonthlyBudget,
  Card,
  ExchangeRate,
} from '../types/index';

// ── date helpers (evergreen — relative to today) ──────────────────────────────
const NOW = new Date();
const iso = (d: Date) => d.toISOString();
const isoDate = (d: Date) => d.toISOString().split('T')[0];
/** A date in the current month on the given day-of-month (clamped to today). */
const thisMonth = (day: number) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), Math.min(day, NOW.getDate()));
  return iso(d);
};
const daysAgo = (n: number) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; };
const monthsAgo = (n: number) => { const d = new Date(NOW); d.setMonth(d.getMonth() - n); return d; };

// USD → ILS (native holdings priced in USD convert to the ILS default currency).
const USD = 3.7;
const USD_HIST = 3.55; // rate captured at purchase time (historic cost basis)

// ── Portfolio ─────────────────────────────────────────────────────────────────
const trade = (t: Partial<StockTrade> & Pick<StockTrade, 'id' | 'ticker' | 'name' | 'quantity' | 'buyPrice' | 'currency'>): StockTrade => ({
  sellPrice: null, sellDate: null, notes: '', assetCategory: 'stocks',
  market: 'global', buyDate: iso(monthsAgo(8)), ...t,
});

const DEMO_TRADES: StockTrade[] = [
  trade({ id: 'demo-aapl', ticker: 'AAPL', name: 'Apple Inc.',            quantity: 25,   buyPrice: 165, currency: 'USD', buyRateToDefault: USD_HIST, buyDate: iso(monthsAgo(11)) }),
  trade({ id: 'demo-msft', ticker: 'MSFT', name: 'Microsoft Corp.',       quantity: 12,   buyPrice: 320, currency: 'USD', buyRateToDefault: USD_HIST, buyDate: iso(monthsAgo(9)) }),
  trade({ id: 'demo-nvda', ticker: 'NVDA', name: 'NVIDIA Corp.',          quantity: 18,   buyPrice: 95,  currency: 'USD', buyRateToDefault: 3.45,     buyDate: iso(monthsAgo(6)) }),
  trade({ id: 'demo-voo',  ticker: 'VOO',  name: 'Vanguard S&P 500 ETF',  quantity: 9,    buyPrice: 405, currency: 'USD', buyRateToDefault: USD_HIST, buyDate: iso(monthsAgo(14)) }),
  trade({ id: 'demo-btc',  ticker: 'BTC',  name: 'Bitcoin',               quantity: 0.15, buyPrice: 42000, currency: 'USD', buyRateToDefault: 3.6,    assetCategory: 'crypto', buyDate: iso(monthsAgo(10)) }),
  trade({ id: 'demo-teva', ticker: 'TEVA', name: 'Teva Pharmaceutical',   quantity: 120,  buyPrice: 45,  currency: 'ILS', market: 'tase', buyRateToDefault: 1, buyDate: iso(monthsAgo(7)) }),
  trade({ id: 'demo-eslt', ticker: 'ESLT', name: 'Elbit Systems',         quantity: 10,   buyPrice: 900, currency: 'ILS', market: 'tase', buyRateToDefault: 1, buyDate: iso(monthsAgo(5)) }),
];

// Current native-currency prices (drives live value + gain).
const DEMO_PRICES: Record<string, number> = {
  AAPL: 232, MSFT: 430, NVDA: 168, VOO: 512, BTC: 95000, TEVA: 58, ESLT: 1250,
};

// ── Cards ─────────────────────────────────────────────────────────────────────
const DEMO_CARDS: Card[] = [
  { id: 'demo-card-visa', name: 'Visa •• 4291', color: '#3b82f6', isActive: true },
  { id: 'demo-card-amex', name: 'Amex Gold',    color: '#f59e0b', isActive: true },
];

// ── Transactions (this month + a little history) ──────────────────────────────
const tx = (t: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'category' | 'type' | 'date'>): Transaction => ({
  notes: '', paymentMethod: 'cash', cardId: null, currency: 'ILS',
  convertedAmount: t.amount!, isAutoAdded: false,
  installmentPlanId: null, installmentNumber: null, installmentTotal: null, ...t,
});

const DEMO_TRANSACTIONS: Transaction[] = [
  // income
  tx({ id: 'demo-tx-salary',    amount: 18000, category: 'salary',    type: 'income',  date: thisMonth(1),  notes: 'Monthly salary' }),
  tx({ id: 'demo-tx-freelance', amount: 3200,  category: 'freelance', type: 'income',  date: thisMonth(5),  notes: 'Design project' }),
  // expenses — this month
  tx({ id: 'demo-tx-rent',   amount: 5200, category: 'housing',       type: 'expense', date: thisMonth(1),  notes: 'Rent',            paymentMethod: 'demo-card-visa', cardId: 'demo-card-visa' }),
  tx({ id: 'demo-tx-groc1',  amount: 640,  category: 'food',          type: 'expense', date: thisMonth(8),  notes: 'Groceries',       paymentMethod: 'demo-card-visa', cardId: 'demo-card-visa' }),
  tx({ id: 'demo-tx-rest',   amount: 245,  category: 'food',          type: 'expense', date: thisMonth(6),  notes: 'Dinner out',      paymentMethod: 'demo-card-amex', cardId: 'demo-card-amex' }),
  tx({ id: 'demo-tx-fuel',   amount: 380,  category: 'transport',     type: 'expense', date: thisMonth(4),  notes: 'Fuel' }),
  tx({ id: 'demo-tx-netflx', amount: 55,   category: 'subscriptions', type: 'expense', date: thisMonth(3),  notes: 'Netflix' }),
  tx({ id: 'demo-tx-pharm',  amount: 120,  category: 'health',        type: 'expense', date: thisMonth(7),  notes: 'Pharmacy' }),
  tx({ id: 'demo-tx-shop',   amount: 430,  category: 'shopping',      type: 'expense', date: thisMonth(5),  notes: 'Clothes',         paymentMethod: 'demo-card-amex', cardId: 'demo-card-amex' }),
  tx({ id: 'demo-tx-cinema', amount: 92,   category: 'entertainment', type: 'expense', date: thisMonth(2),  notes: 'Cinema' }),
  tx({ id: 'demo-tx-coffee', amount: 32,   category: 'food',          type: 'expense', date: thisMonth(9),  notes: 'Coffee' }),
];
// Append several prior months of history (for month-over-month + Trends). Done
// after the array + helpers are defined so there's no initialization-order risk.
DEMO_TRANSACTIONS.push(...priorMonths());

/** A date `m` months back on day `d`. */
function backMonth(m: number, d: number) {
  return iso(new Date(NOW.getFullYear(), NOW.getMonth() - m, d));
}

/** Build a realistic set of expenses + salary for the last 5 completed months,
 *  with slight per-month variation so the Trends chart and MoM read naturally. */
function priorMonths(): Transaction[] {
  const out: Transaction[] = [];
  for (let m = 1; m <= 5; m++) {
    const jitter = 1 + (((m * 37) % 11) - 5) / 100; // ±5% variation per month
    const r = (n: number) => Math.round(n * jitter);
    const rows: Array<[string, number, string, number]> = [
      ['salary',        18000, 'salary',        1],
      ['rent',          5200,  'housing',       1],
      ['groceries-a',   r(680), 'food',         7],
      ['groceries-b',   r(520), 'food',         21],
      ['transport',     r(360), 'transport',    5],
      ['subs',          55,    'subscriptions', 3],
      ['dining',        r(230), 'food',         14],
      ['shopping',      r(390), 'shopping',     12],
      ['health',        r(140), 'health',       18],
    ];
    for (const [slug, amount, category, day] of rows) {
      out.push(tx({
        id: `demo-tx-${slug}-m${m}`, amount, category,
        type: category === 'salary' ? 'income' : 'expense',
        date: backMonth(m, day),
      }));
    }
  }
  return out;
}

// ── Recurring + installment ───────────────────────────────────────────────────
const nextDue = (day: number) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), day);
  if (d < NOW) d.setMonth(d.getMonth() + 1);
  return iso(d);
};
const rec = (r: Partial<RecurringPayment> & Pick<RecurringPayment, 'id' | 'name' | 'amount' | 'category' | 'type' | 'dayOfMonth'>): RecurringPayment => ({
  currency: 'ILS', frequency: 'monthly', dayOfWeek: null,
  startDate: iso(monthsAgo(6)), endDate: null, isActive: true, notes: '',
  nextDueDate: nextDue(r.dayOfMonth ?? 1), ...r,
});

const DEMO_RECURRING: RecurringPayment[] = [
  rec({ id: 'demo-rec-netflix', name: 'Netflix',  amount: 55,   category: 'subscriptions', type: 'expense', dayOfMonth: 3 }),
  rec({ id: 'demo-rec-spotify', name: 'Spotify',  amount: 20,   category: 'subscriptions', type: 'expense', dayOfMonth: 7 }),
  rec({ id: 'demo-rec-gym',     name: 'Gym',      amount: 199,  category: 'health',        type: 'expense', dayOfMonth: 1 }),
  rec({ id: 'demo-rec-rent',    name: 'Rent',     amount: 5200, category: 'housing',       type: 'expense', dayOfMonth: 1 }),
  rec({ id: 'demo-rec-salary',  name: 'Salary',   amount: 18000, category: 'salary',       type: 'income',  dayOfMonth: 1 }),
];

const DEMO_INSTALLMENTS: InstallmentPlan[] = [
  {
    id: 'demo-inst-iphone', name: 'iPhone 15 Pro', totalAmount: 5000, installmentAmount: 417,
    totalInstallments: 12, remainingInstallments: 8, category: 'shopping', currency: 'ILS',
    dayOfMonth: 10, startDate: iso(monthsAgo(4)), isActive: true, notes: '', nextPaymentDate: nextDue(10),
  },
];

// ── Net worth: manual entries + snapshots ─────────────────────────────────────
const DEMO_MANUAL: ManualEntry[] = [
  { id: 'demo-mn-cash',  name: 'Cash savings', value: 120000,  isLiability: false, assetCategory: 'cash_savings', lastUpdated: iso(daysAgo(3)) },
  { id: 'demo-mn-flat',  name: 'Apartment',    value: 1750000, isLiability: false, assetCategory: 'real_estate', lastUpdated: iso(daysAgo(20)) },
  { id: 'demo-mn-mort',  name: 'Mortgage',     value: 980000,  isLiability: true,  assetCategory: 'mortgage',    lastUpdated: iso(daysAgo(20)) },
];

/** ~180 daily net-worth snapshots, trending up with mild noise → a full chart. */
function buildSnapshots(): NetWorthSnapshot[] {
  const days = 180;
  const start = 880000;
  const end = 1027000;
  const out: NetWorthSnapshot[] = [];
  for (let i = days; i >= 0; i--) {
    const t = (days - i) / days; // 0 → 1
    const trend = start + (end - start) * t;
    const noise = Math.sin(i * 0.7) * 9000 + Math.cos(i * 0.23) * 5000;
    const netWorth = Math.round(trend + noise);
    const d = daysAgo(i);
    out.push({
      id: `demo-snap-${i}`, date: isoDate(d),
      totalAssets: netWorth + 980000, totalLiabilities: 980000,
      netWorth, portfolioValue: Math.round(120000 + 20000 * t), manualAssetsTotal: 1870000,
    });
  }
  return out;
}

// ── Budgets (current month) ───────────────────────────────────────────────────
const DEMO_BUDGETS: MonthlyBudget[] = [
  { id: 'demo-bud-food',  category: 'food',      amount: 2500, month: NOW.getMonth() + 1, year: NOW.getFullYear() },
  { id: 'demo-bud-trans', category: 'transport', amount: 1200, month: NOW.getMonth() + 1, year: NOW.getFullYear() },
  { id: 'demo-bud-shop',  category: 'shopping',  amount: 1000, month: NOW.getMonth() + 1, year: NOW.getFullYear() },
];

const DEMO_RATES: ExchangeRate[] = [
  { currency: 'USD', rateToDefault: USD },
  { currency: 'EUR', rateToDefault: 4.0 },
];

/**
 * Seed placeholder data into any store that is still empty. No-op once the user
 * has completed setup (a real install) — so it never touches real data.
 */
export function seedDemoData(): void {
  const settings = useSettingsStore.getState();
  if (settings.hasCompletedSetup) return;

  // Portfolio
  const portfolio = usePortfolioStore.getState();
  if (portfolio.trades.length === 0) {
    usePortfolioStore.setState({
      trades: DEMO_TRADES,
      currentPrices: DEMO_PRICES,
      lastPriceUpdates: Object.fromEntries(Object.keys(DEMO_PRICES).map((k) => [k, iso(daysAgo(0))])),
      priceSources: Object.fromEntries(Object.keys(DEMO_PRICES).map((k) => [k, 'live' as const])),
    });
  }

  // Cards
  if (useCardsStore.getState().cards.length === 0) {
    useCardsStore.setState({ cards: DEMO_CARDS });
  }

  // Transactions
  if (useTransactionStore.getState().transactions.length === 0) {
    useTransactionStore.setState({ transactions: DEMO_TRANSACTIONS });
  }

  // Recurring + installments
  const recurring = useRecurringStore.getState();
  if (recurring.recurringPayments.length === 0 && recurring.installmentPlans.length === 0) {
    useRecurringStore.setState({ recurringPayments: DEMO_RECURRING, installmentPlans: DEMO_INSTALLMENTS });
  }

  // Net worth (manual entries + snapshots)
  const networth = useNetWorthStore.getState();
  if (networth.manualEntries.length === 0 && networth.snapshots.length === 0) {
    const snaps = buildSnapshots();
    useNetWorthStore.setState({
      manualEntries: DEMO_MANUAL,
      snapshots: snaps,
      lastSnapshotDate: snaps[snaps.length - 1]?.date ?? null,
    });
  }

  // Budgets
  if (useBudgetStore.getState().budgets.length === 0) {
    useBudgetStore.setState({ budgets: DEMO_BUDGETS });
  }

  // Settings — only fill gaps (exchange rates + FIRE inputs), never overwrite.
  const patch: Partial<typeof settings> = {};
  if (settings.exchangeRates.length === 0) patch.exchangeRates = DEMO_RATES;
  if (settings.fireAnnualExpenses == null) patch.fireAnnualExpenses = 180000;
  if (settings.fireMonthlyContribution == null) patch.fireMonthlyContribution = 6000;
  if (settings.fireCurrentAge == null) patch.fireCurrentAge = 32;
  if (settings.fireTargetAge == null) patch.fireTargetAge = 50;
  if (!settings.userName) patch.userName = 'Alex';
  if (Object.keys(patch).length > 0) useSettingsStore.setState(patch);
}
