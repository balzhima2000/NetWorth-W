import { useState, useMemo, useEffect } from 'react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useQuickAddStore } from '../../stores/quickAddStore';
import { useToast } from '../../hooks/useToast';
import { useBudgetStore } from '../../stores/budgetStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useCardsStore } from '../../stores/cardsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import {
  GlassCard, Button, Input, Select, Modal, ConfirmDialog,
  ProgressBar, Tabs, EmptyState,
} from '../../components/ui';
import { formatCurrency, formatDate, getCurrentMonthYear, getTodayISO } from '../../utils/formatters';
import { CURRENCIES } from '../../utils/constants';
import { fetchExchangeRate } from '../../services/alphaVantage';
import type { Transaction, RecurringPayment } from '../../types/index';

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getNextDueDate(frequency: string, startDate: string, dayOfMonth: number | null): string {
  // Always base the first due date on startDate, NOT today.
  // useAutoAdd will handle adding any past-due transactions when it runs.
  const [sy, sm, sd] = startDate.split('-').map(Number);
  if (frequency === 'monthly' && dayOfMonth) {
    // First occurrence: month of startDate, on dayOfMonth
    const d = new Date(sy, sm - 1, dayOfMonth);
    // If dayOfMonth falls before the actual startDate in that month, push one month
    if (d.getTime() < new Date(sy, sm - 1, sd).getTime()) d.setMonth(d.getMonth() + 1);
    return localDateStr(d);
  }
  // Weekly and yearly: first due date = startDate itself
  return startDate;
}

type BudgetStatus = 'exceeded' | 'warning' | 'caution' | 'healthy' | 'none';

function getBudgetStatus(spent: number, budget: number | undefined): BudgetStatus {
  if (!budget || budget === 0) return 'none';
  const pct = (spent / budget) * 100;
  if (pct >= 100) return 'exceeded';
  if (pct >= 90)  return 'warning';
  if (pct >= 75)  return 'caution';
  return 'healthy';
}

const BUDGET_STATUS_ORDER: Record<BudgetStatus, number> = {
  exceeded: 0, warning: 1, caution: 2, healthy: 3, none: 4,
};

function getDateLabel(dateStr: string): string {
  const today = getTodayISO();
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = localDateStr(yd);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: y !== new Date().getFullYear() ? 'numeric' : undefined });
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  valueColor?: string;
  children?: React.ReactNode;
  className?: string;
}
function MetricTile({ label, value, sub, subColor = 'text-white/40', valueColor = 'text-white', children, className = '' }: MetricTileProps) {
  return (
    <GlassCard padding="md" className={className}>
      <p className="text-white/45 text-xs font-medium tracking-wide uppercase mb-1.5">{label}</p>
      <p className={`text-xl font-bold font-mono ${valueColor}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
      {children}
    </GlassCard>
  );
}

interface BudgetStatusBadgeProps { status: BudgetStatus; pct: number }
function BudgetStatusBadge({ status, pct }: BudgetStatusBadgeProps) {
  if (status === 'healthy' || status === 'none') return null;
  const map: Record<BudgetStatus, { label: string; color: string }> = {
    exceeded: { label: 'Over budget', color: '#EF4444' },
    warning:  { label: `${Math.round(pct)}%`,  color: '#F59E0B' },
    caution:  { label: `${Math.round(pct)}%`,  color: '#EAB308' },
    healthy:  { label: '', color: '' },
    none:     { label: '', color: '' },
  };
  const { label, color } = map[status];
  return (
    <span className="text-xs font-mono font-medium" style={{ color }}>{label}</span>
  );
}

interface SpendingCategory { id: string; name: string; emoji: string; color: string }
interface MonthlyBudget { id: string; category: string; amount: number; month: number; year: number }

interface BudgetCardProps {
  cat: SpendingCategory;
  budget: MonthlyBudget | undefined;
  spent: number;
  status: BudgetStatus;
  pct: number;
  defaultCurrency: string;
  onEdit: () => void;
  onDelete: () => void;
}
function BudgetCard({ cat, budget, spent, status, pct, defaultCurrency, onEdit, onDelete }: BudgetCardProps) {
  const fillWidth = budget ? Math.min(pct, 100) : 0;
  const overAmount = budget ? spent - budget.amount : 0;
  const remaining = budget ? budget.amount - spent : 0;

  // Status-aware colors — restrained, native to the app
  const statusColor =
    status === 'exceeded' ? 'rgba(239,68,68,0.70)' :
    status === 'warning'  ? 'rgba(245,158,11,0.65)' :
    status === 'caution'  ? 'rgba(234,179,8,0.55)'  :
    'rgba(255,255,255,0.22)';

  const barColor =
    status === 'exceeded' ? '#EF4444' :
    status === 'warning'  ? '#F59E0B' :
    status === 'caution'  ? '#EAB308' :
    '#10B981';

  const barOpacity = status === 'healthy' ? 0.45 : 0.75;

  const subText =
    !budget ? (spent > 0 ? `${formatCurrency(spent, defaultCurrency)} spent, no limit` : 'No budget set') :
    status === 'exceeded' ? `Over by ${formatCurrency(overAmount, defaultCurrency)}` :
    `${formatCurrency(remaining, defaultCurrency)} left`;

  return (
    <div className="glass rounded-xl">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <span className="text-sm flex-shrink-0 opacity-60">{cat.emoji}</span>

          {/* Name + sub */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-white/75 text-sm font-medium leading-tight">{cat.name}</p>
              <p className="text-xs leading-tight" style={{ color: statusColor }}>{subText}</p>
            </div>
          </div>

          {/* Amounts + action */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {budget && (
              <p className="text-sm font-mono text-white/50 tabular-nums">
                {formatCurrency(spent, defaultCurrency)}
                <span className="text-white/20"> / {formatCurrency(budget.amount, defaultCurrency)}</span>
              </p>
            )}
            <button
              onClick={onEdit}
              className="text-xs text-white/28 hover:text-white/60 transition-colors"
            >
              {budget ? 'Edit' : 'Set'}
            </button>
            {budget && (
              <button
                onClick={onDelete}
                className="text-white/15 hover:text-white/35 transition-colors"
                aria-label="Remove budget"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress track */}
        <div className="mt-2.5 h-0.5 rounded-full bg-white/[0.05]">
          {budget && (
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${fillWidth}%`, background: barColor, opacity: barOpacity }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Spending() {
  const transactions = useTransactionStore((s) => s.transactions);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const setLastUsedPaymentMethod = useTransactionStore((s) => s.setLastUsedPaymentMethod);

  const budgets = useBudgetStore((s) => s.budgets);
  const addBudget = useBudgetStore((s) => s.addBudget);
  const updateBudget = useBudgetStore((s) => s.updateBudget);
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);

  const categories = useCategoriesStore((s) => s.categories);
  const incomeCategories = useCategoriesStore((s) => s.incomeCategories);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const fxApiKey = useSettingsStore((s) => s.fxApiKey);
  const defaultExpensePayment = useSettingsStore((s) => s.defaultExpensePayment);
  const defaultIncomeDestination = useSettingsStore((s) => s.defaultIncomeDestination);
  const decrementFxRequests = useSettingsStore((s) => s.decrementFxRequests);
  const cards = useCardsStore((s) => s.cards).filter((c) => c.isActive);
  const incomeDestinations = useCardsStore((s) => s.incomeDestinations);
  const addIncomeDestination = useCardsStore((s) => s.addIncomeDestination);
  const deleteIncomeDestination = useCardsStore((s) => s.deleteIncomeDestination);

  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const addRecurringPayment = useRecurringStore((s) => s.addRecurringPayment);
  const updateRecurringPayment = useRecurringStore((s) => s.updateRecurringPayment);
  const deleteRecurringPayment = useRecurringStore((s) => s.deleteRecurringPayment);
  const installmentPlans = useRecurringStore((s) => s.installmentPlans);
  const addInstallmentPlan = useRecurringStore((s) => s.addInstallmentPlan);
  const deleteInstallmentPlan = useRecurringStore((s) => s.deleteInstallmentPlan);

  const [activeTab, setActiveTab] = useState('transactions');
  const toast = useToast();

  useEffect(() => { document.title = 'Spending — NetWorth Tracker'; }, []);

  const quickAddTarget = useQuickAddStore((s) => s.target);
  const setQuickAddTarget = useQuickAddStore((s) => s.setTarget);
  useEffect(() => {
    if (quickAddTarget === 'expense' || quickAddTarget === 'income') {
      openAddTx(quickAddTarget);
      setQuickAddTarget(null);
    }
  }, [quickAddTarget]);

  // ── Transaction modal state ──────────────────────────────────────────────
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txDate, setTxDate] = useState(getTodayISO());
  const [txNotes, setTxNotes] = useState('');
  const [txPayment, setTxPayment] = useState(defaultExpensePayment);
  const [txCurrency, setTxCurrency] = useState(defaultCurrency);
  const [txRate, setTxRate] = useState('');
  const [fetchingTxRate, setFetchingTxRate] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [showAddDestination, setShowAddDestination] = useState(false);
  const [newDestName, setNewDestName] = useState('');

  // ── Budget modal state ───────────────────────────────────────────────────
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  // ── Filter state ─────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  // ── Recurring modal state ────────────────────────────────────────────────
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringPayment | null>(null);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('');
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');
  const [recFrequency, setRecFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recDayOfMonth, setRecDayOfMonth] = useState('1');
  const [recStartDate, setRecStartDate] = useState(getTodayISO());
  const [recEndDate, setRecEndDate] = useState('');
  const [recNotes, setRecNotes] = useState('');
  const [recCurrency, setRecCurrency] = useState(defaultCurrency);
  const [deleteRecurringId, setDeleteRecurringId] = useState<string | null>(null);

  // ── Installment modal state ──────────────────────────────────────────────
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [instName, setInstName] = useState('');
  const [instTotal, setInstTotal] = useState('');
  const [instCount, setInstCount] = useState('');
  const [instCategory, setInstCategory] = useState('');
  const [instDay, setInstDay] = useState('1');
  const [instStartDate, setInstStartDate] = useState(getTodayISO());
  const [instNotes, setInstNotes] = useState('');
  const [deleteInstId, setDeleteInstId] = useState<string | null>(null);

  const { month, year } = getCurrentMonthYear();

  // ── Core month calculations ──────────────────────────────────────────────

  const txToDefault = (t: Transaction): number => {
    if (t.currency === defaultCurrency) return t.amount;
    return t.convertedAmount; // always use stored value — never recalculate from live rates
  };

  const monthTransactions = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }), [transactions, month, year]);

  const monthSpending = useMemo(() => {
    // Transaction-based total
    let total = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + txToDefault(t), 0);
    // Add recurring payments that fired this month but weren't auto-added (legacy gap)
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStr = `${year}-${pad(month)}`;
    const todayStr = getTodayISO();
    recurringPayments.forEach((rp) => {
      if (!rp.isActive || rp.type !== 'expense') return;
      if (rp.startDate > `${monthStr}-31`) return;
      if (rp.endDate && rp.endDate < `${monthStr}-01`) return;
      const rpCurrency = rp.currency ?? defaultCurrency;
      const rpRate = exchangeRates.find(r => r.currency === rpCurrency);
      const converted = rpCurrency === defaultCurrency ? rp.amount : rpRate ? rp.amount * rpRate.rateToDefault : rp.amount;
      const addGap = (dueDateStr: string) => {
        if (dueDateStr < rp.startDate || dueDateStr > todayStr) return;
        if (rp.endDate && dueDateStr > rp.endDate) return;
        const covered = monthTransactions.some(t => t.isAutoAdded && t.category === rp.category && t.date === dueDateStr && Math.abs(txToDefault(t) - converted) < 0.01);
        if (!covered) total += converted;
      };
      if (rp.frequency === 'monthly' && rp.dayOfMonth) {
        addGap(`${monthStr}-${pad(Math.min(rp.dayOfMonth, new Date(year, month, 0).getDate()))}`);
      } else if (rp.frequency === 'weekly' && rp.dayOfWeek !== null) {
        for (let d = 1; d <= new Date(year, month, 0).getDate(); d++)
          if (new Date(year, month - 1, d).getDay() === rp.dayOfWeek) addGap(`${monthStr}-${pad(d)}`);
      } else if (rp.frequency === 'yearly') {
        const s = new Date(rp.startDate);
        if (s.getMonth() + 1 === month) addGap(`${monthStr}-${pad(Math.min(s.getDate(), new Date(year, month, 0).getDate()))}`);
      }
    });
    return total;
  }, [monthTransactions, recurringPayments, year, month, defaultCurrency, exchangeRates]);

  const monthIncome = useMemo(() =>
    monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + txToDefault(t), 0),
    [monthTransactions]);

  // Previous month for MoM comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthSpending = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((sum, t) => sum + txToDefault(t), 0);
  }, [transactions, prevMonth, prevYear]);

  // Derived analytics
  const today = new Date();
  const elapsedDays = today.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyAvg = elapsedDays > 0 ? monthSpending / elapsedDays : 0;

  const currentMonthBudgets = useMemo(() =>
    budgets.filter((b) => b.month === month && b.year === year),
    [budgets, month, year]);

  const totalBudget = useMemo(() =>
    currentMonthBudgets.reduce((sum, b) => sum + b.amount, 0),
    [currentMonthBudgets]);

  const budgetUsedPct = totalBudget > 0 ? (monthSpending / totalBudget) * 100 : null;
  const remainingBudget = totalBudget > 0 ? totalBudget - monthSpending : null;
  const savingsRate = monthIncome > 0 ? ((monthIncome - monthSpending) / monthIncome) * 100 : null;
  const netThisMonth = monthIncome - monthSpending;

  // Pacing: how much should we have spent by today vs actual
  const pacingBudget = totalBudget > 0 ? totalBudget * (elapsedDays / daysInMonth) : null;
  const pacingDelta = pacingBudget !== null ? monthSpending - pacingBudget : null;

  // Category spending (current month expenses + recurring that have already fired)
  const categorySpend = useMemo(() => {
    const map: Record<string, number> = {};

    // 1. Regular transactions
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + txToDefault(t);
    });

    // 2. Recurring payments that fired this month but DON'T yet have an auto-added
    //    transaction (handles legacy payments whose nextDueDate was set incorrectly).
    //    Skip any recurring payment that already has an auto-added transaction this
    //    month to avoid double-counting.
    const todayStr = getTodayISO();
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStr = `${year}-${pad(month)}`;

    recurringPayments.forEach((rp) => {
      if (!rp.isActive || rp.type !== 'expense') return;
      if (rp.startDate > `${monthStr}-31`) return;
      if (rp.endDate && rp.endDate < `${monthStr}-01`) return;

      const rpCurrency = rp.currency ?? defaultCurrency;
      const rpRate = exchangeRates.find(r => r.currency === rpCurrency);
      const converted = rpCurrency === defaultCurrency ? rp.amount : rpRate ? rp.amount * rpRate.rateToDefault : rp.amount;

      // Helper: only add if no auto-added transaction already covers this date
      const addIfNotPresent = (dueDateStr: string) => {
        if (dueDateStr < rp.startDate || dueDateStr > todayStr) return;
        if (rp.endDate && dueDateStr > rp.endDate) return;
        const alreadyCovered = monthTransactions.some(
          t => t.isAutoAdded && t.category === rp.category && t.date === dueDateStr && Math.abs(txToDefault(t) - converted) < 0.01
        );
        if (!alreadyCovered) map[rp.category] = (map[rp.category] ?? 0) + converted;
      };

      if (rp.frequency === 'monthly' && rp.dayOfMonth) {
        const day = Math.min(rp.dayOfMonth, new Date(year, month, 0).getDate());
        addIfNotPresent(`${monthStr}-${pad(day)}`);
      } else if (rp.frequency === 'weekly' && rp.dayOfWeek !== null) {
        const daysInM = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInM; d++) {
          if (new Date(year, month - 1, d).getDay() === rp.dayOfWeek) {
            addIfNotPresent(`${monthStr}-${pad(d)}`);
          }
        }
      } else if (rp.frequency === 'yearly') {
        const startD = new Date(rp.startDate);
        if (startD.getMonth() + 1 === month) {
          const day = Math.min(startD.getDate(), new Date(year, month, 0).getDate());
          addIfNotPresent(`${monthStr}-${pad(day)}`);
        }
      }
    });

    return map;
  }, [monthTransactions, recurringPayments, year, month, defaultCurrency, exchangeRates]);

  // Category spending prev month (for MoM)
  const prevCategorySpend = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
      })
      .forEach(t => { map[t.category] = (map[t.category] ?? 0) + txToDefault(t); });
    return map;
  }, [transactions, prevMonth, prevYear]);

  const largestCatEntry = useMemo(() => {
    const entries = Object.entries(categorySpend).sort(([, a], [, b]) => b - a);
    return entries[0] ?? null;
  }, [categorySpend]);

  // Upcoming recurring in next 7 days
  const upcomingRecurring = useMemo(() => {
    const todayStr = getTodayISO();
    const d7 = new Date();
    d7.setDate(d7.getDate() + 7);
    const d7str = localDateStr(d7);
    const d30 = new Date();
    d30.setDate(d30.getDate() + 30);
    const d30str = localDateStr(d30);

    let total7 = 0; let count7 = 0;
    let total30 = 0; let count30 = 0;

    recurringPayments.forEach((rp) => {
      if (!rp.isActive || rp.type !== 'expense') return;
      if (rp.endDate && rp.endDate < todayStr) return;
      const rpCurrency = rp.currency ?? defaultCurrency;
      const rpRate = exchangeRates.find(r => r.currency === rpCurrency);
      const converted = rpCurrency === defaultCurrency ? rp.amount : rpRate ? rp.amount * rpRate.rateToDefault : rp.amount;
      if (rp.nextDueDate > todayStr && rp.nextDueDate <= d7str) { total7 += converted; count7++; }
      if (rp.nextDueDate > todayStr && rp.nextDueDate <= d30str) { total30 += converted; count30++; }
    });
    return { total7, count7, total30, count30 };
  }, [recurringPayments, exchangeRates, defaultCurrency]);

  // Also compute month-end upcoming for the summary tile (remaining this month)
  const { upcomingTotal, upcomingCount } = useMemo(() => {
    const todayStr = getTodayISO();
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStr = `${year}-${pad(month)}`;
    const daysInM = new Date(year, month, 0).getDate();
    const monthEnd = `${monthStr}-${pad(daysInM)}`;
    let total = 0, count = 0;
    recurringPayments.forEach((rp) => {
      if (!rp.isActive || rp.type !== 'expense') return;
      if (rp.endDate && rp.endDate < todayStr) return;
      if (rp.nextDueDate > todayStr && rp.nextDueDate <= monthEnd && rp.nextDueDate.startsWith(monthStr)) {
        const rpCurrency = rp.currency ?? defaultCurrency;
        const rpRate = exchangeRates.find(r => r.currency === rpCurrency);
        const converted = rpCurrency === defaultCurrency ? rp.amount : rpRate ? rp.amount * rpRate.rateToDefault : rp.amount;
        total += converted; count++;
      }
    });
    return { upcomingTotal: total, upcomingCount: count };
  }, [recurringPayments, exchangeRates, defaultCurrency, month, year]);

  const missingRateCurrencies = useMemo(() => {
    const missing = new Set<string>();
    monthTransactions.forEach(t => {
      if (t.currency !== defaultCurrency && !exchangeRates.find(r => r.currency === t.currency)) missing.add(t.currency);
    });
    return [...missing];
  }, [monthTransactions, exchangeRates, defaultCurrency]);

  // Budget attention: categories at caution/warning/exceeded
  const budgetAttention = useMemo(() => {
    return currentMonthBudgets
      .map(b => {
        const spent = categorySpend[b.category] ?? 0;
        const status = getBudgetStatus(spent, b.amount);
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return { budget: b, spent, status, pct };
      })
      .filter(x => x.status !== 'healthy' && x.status !== 'none')
      .sort((a, b) => BUDGET_STATUS_ORDER[a.status] - BUDGET_STATUS_ORDER[b.status]);
  }, [currentMonthBudgets, categorySpend]);

  // ── Filtered + sorted transactions ──────────────────────────────────────

  const filteredTx = useMemo(() => {
    return [...transactions]
      .filter(t => {
        if (filterDateFrom && t.date < filterDateFrom) return false;
        if (filterDateTo && t.date > filterDateTo) return false;
        if (filterCategory && t.category !== filterCategory) return false;
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterPayment !== 'all' && t.paymentMethod !== filterPayment) return false;
        if (txTypeFilter !== 'all' && t.type !== txTypeFilter) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterDateFrom, filterDateTo, filterCategory, filterType, filterPayment, txTypeFilter]);

  const hasFilters = !!(filterDateFrom || filterDateTo || filterCategory || filterType !== 'all' || filterPayment !== 'all');

  // Group transactions by date
  const groupedTx = useMemo(() => {
    const groups: { dateLabel: string; dateStr: string; txs: Transaction[] }[] = [];
    let lastDate = '';
    for (const tx of filteredTx) {
      if (tx.date !== lastDate) {
        groups.push({ dateLabel: getDateLabel(tx.date), dateStr: tx.date, txs: [] });
        lastDate = tx.date;
      }
      groups[groups.length - 1].txs.push(tx);
    }
    return groups;
  }, [filteredTx]);

  // Sorted budget rows
  const sortedBudgetRows = useMemo(() => {
    return categories.map(cat => {
      const budget = currentMonthBudgets.find(b => b.category === cat.id);
      const spent = categorySpend[cat.id] ?? 0;
      const status = getBudgetStatus(spent, budget?.amount);
      const pct = budget ? (spent / budget.amount) * 100 : 0;
      return { cat, budget, spent, status, pct };
    }).sort((a, b) => BUDGET_STATUS_ORDER[a.status] - BUDGET_STATUS_ORDER[b.status]);
  }, [categories, currentMonthBudgets, categorySpend]);

  // Sorted recurring payments
  const sortedRecurring = useMemo(() => {
    return [...recurringPayments].sort((a, b) => {
      // Active before paused, then by next due date
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.nextDueDate.localeCompare(b.nextDueDate);
    });
  }, [recurringPayments]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const allCategories = [...categories, ...incomeCategories];
  const getCategoryInfo = (catId: string) =>
    allCategories.find(c => c.id === catId) ?? { name: catId, emoji: '💰', color: '#6b7280' };

  const getConvertedAmount = (amount: number, currency: string): number => {
    if (currency === defaultCurrency) return amount;
    const rate = exchangeRates.find(r => r.currency === currency);
    return rate ? amount * rate.rateToDefault : amount;
  };

  const paymentOptions = [
    { value: 'cash', label: '💵 Cash' },
    ...cards.map(c => ({ value: c.id, label: `💳 ${c.name}` })),
  ];

  const destinationOptions = incomeDestinations.map(d => ({ value: d.id, label: `${d.icon} ${d.name}` }));

  // ── Transaction handlers ─────────────────────────────────────────────────

  const openAddTx = (type: 'expense' | 'income' = 'expense') => {
    setEditingTx(null);
    setTxType(type);
    setTxAmount('');
    setTxCategory((type === 'expense' ? categories[0] : incomeCategories[0])?.id ?? '');
    setTxDate(getTodayISO());
    setTxNotes('');
    setTxPayment(type === 'income' ? defaultIncomeDestination : defaultExpensePayment);
    setTxCurrency(defaultCurrency);
    setTxRate('');
    setShowAddDestination(false);
    setNewDestName('');
    setShowAddTx(true);
  };

  const txCategoryOptions = txType === 'expense' ? categories : incomeCategories;

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx); setTxType(tx.type); setTxAmount(String(tx.amount));
    setTxCategory(tx.category); setTxDate(tx.date); setTxNotes(tx.notes);
    setTxPayment(tx.paymentMethod); setTxCurrency(tx.currency);
    if (tx.currency !== defaultCurrency && tx.amount > 0) {
      setTxRate((tx.convertedAmount / tx.amount).toFixed(6));
    } else {
      setTxRate('');
    }
    setShowAddTx(true);
  };

  const handleFetchTxRate = async () => {
    if (!txCurrency || !fxApiKey) return;
    setFetchingTxRate(true);
    try {
      const rate = await fetchExchangeRate(txCurrency, defaultCurrency, fxApiKey);
      setTxRate(rate.toString());
      decrementFxRequests();
    } catch { /* keep empty */ }
    finally { setFetchingTxRate(false); }
  };

  const handleSaveTx = () => {
    if (!txAmount || !txCategory) return;
    const amount = parseFloat(txAmount);
    let convertedAmount: number;
    if (txCurrency !== defaultCurrency && txRate && parseFloat(txRate) > 0) {
      convertedAmount = amount * parseFloat(txRate);
    } else {
      convertedAmount = getConvertedAmount(amount, txCurrency);
    }
    const cardId = txPayment !== 'cash' ? txPayment : null;
    setLastUsedPaymentMethod(txPayment);

    if (editingTx) {
      updateTransaction(editingTx.id, { amount, convertedAmount, category: txCategory, date: txDate, notes: txNotes, type: txType, paymentMethod: txPayment, cardId, currency: txCurrency });
      toast.success('Transaction updated.');
    } else {
      // Budget threshold check before adding
      if (txType === 'expense') {
        const catBudget = currentMonthBudgets.find(b => b.category === txCategory);
        if (catBudget && catBudget.amount > 0) {
          const existingSpend = categorySpend[txCategory] ?? 0;
          const newSpend = existingSpend + convertedAmount;
          const prevPct = (existingSpend / catBudget.amount) * 100;
          const newPct = (newSpend / catBudget.amount) * 100;
          const catName = getCategoryInfo(txCategory).name;
          if (newPct >= 100 && prevPct < 100) {
            const over = newSpend - catBudget.amount;
            setTimeout(() => toast.error(`${catName} exceeded its budget by ${formatCurrency(over, defaultCurrency)}`), 300);
          } else if (newPct >= 90 && prevPct < 90) {
            setTimeout(() => toast.info(`${catName} is at ${Math.round(newPct)}% of its monthly budget`), 300);
          } else if (newPct >= 75 && prevPct < 75) {
            setTimeout(() => toast.info(`${catName} reached 75% of its budget`), 300);
          }
        }
      }
      addTransaction({ id: crypto.randomUUID(), amount, convertedAmount, category: txCategory, date: txDate, notes: txNotes, type: txType, paymentMethod: txPayment, cardId, currency: txCurrency, isAutoAdded: false, installmentPlanId: null, installmentNumber: null, installmentTotal: null });
      toast.success('Transaction added.');
    }
    setShowAddTx(false);
  };

  // ── Budget handlers ──────────────────────────────────────────────────────

  const openSetBudget = (catId: string) => {
    const existing = currentMonthBudgets.find(b => b.category === catId);
    setBudgetCategory(catId); setBudgetAmount(existing ? String(existing.amount) : '');
    setShowBudgetModal(true);
  };

  const handleSaveBudget = () => {
    if (!budgetAmount || !budgetCategory) return;
    const existing = currentMonthBudgets.find(b => b.category === budgetCategory);
    if (existing) { updateBudget(existing.id, { amount: parseFloat(budgetAmount) }); }
    else { addBudget({ id: crypto.randomUUID(), category: budgetCategory, amount: parseFloat(budgetAmount), month, year }); }
    setShowBudgetModal(false);
  };

  // ── Recurring handlers ───────────────────────────────────────────────────

  const openAddRecurring = () => {
    setEditingRecurring(null); setRecName(''); setRecAmount('');
    setRecCategory(categories[0]?.id ?? ''); setRecType('expense');
    setRecFrequency('monthly'); setRecDayOfMonth('1'); setRecStartDate(getTodayISO());
    setRecEndDate(''); setRecNotes(''); setRecCurrency(defaultCurrency); setShowAddRecurring(true);
  };

  const recCategoryOptions = recType === 'expense' ? categories : incomeCategories;

  const openEditRecurring = (p: RecurringPayment) => {
    setEditingRecurring(p); setRecName(p.name); setRecAmount(String(p.amount));
    setRecCategory(p.category); setRecType(p.type); setRecFrequency(p.frequency);
    setRecDayOfMonth(String(p.dayOfMonth ?? 1)); setRecStartDate(p.startDate);
    setRecEndDate(p.endDate ?? ''); setRecNotes(p.notes); setRecCurrency(p.currency ?? defaultCurrency); setShowAddRecurring(true);
  };

  const handleSaveRecurring = () => {
    if (!recName || !recAmount) return;
    const dayOfMonth = recFrequency !== 'weekly' ? parseInt(recDayOfMonth) : null;
    const nextDueDate = getNextDueDate(recFrequency, recStartDate, dayOfMonth);
    const data: RecurringPayment = { id: editingRecurring?.id ?? crypto.randomUUID(), name: recName, amount: parseFloat(recAmount), currency: recCurrency, category: recCategory, type: recType, frequency: recFrequency, dayOfMonth, dayOfWeek: null, startDate: recStartDate, endDate: recEndDate || null, isActive: editingRecurring?.isActive ?? true, notes: recNotes, nextDueDate };
    if (editingRecurring) { updateRecurringPayment(editingRecurring.id, data); toast.success('Recurring payment updated.'); }
    else { addRecurringPayment(data); toast.success('Recurring payment added.'); }
    setShowAddRecurring(false);
  };

  // ── Installment handlers ─────────────────────────────────────────────────

  const openAddInstallment = () => {
    setInstName(''); setInstTotal(''); setInstCount(''); setInstCategory(categories[0]?.id ?? '');
    setInstDay('1'); setInstStartDate(getTodayISO()); setInstNotes('');
    setShowAddInstallment(true);
  };

  const handleSaveInstallment = () => {
    if (!instName || !instTotal || !instCount) return;
    const totalAmount = parseFloat(instTotal);
    const totalInstallments = parseInt(instCount);
    const installmentAmount = totalAmount / totalInstallments;
    const startYear = parseInt(instStartDate.split('-')[0]);
    const startMonth = parseInt(instStartDate.split('-')[1]) - 1;
    const nextPaymentDate = new Date(startYear, startMonth, parseInt(instDay)).toISOString().split('T')[0];
    addInstallmentPlan({ id: crypto.randomUUID(), name: instName, totalAmount, installmentAmount, totalInstallments, remainingInstallments: totalInstallments, category: instCategory, dayOfMonth: parseInt(instDay), startDate: instStartDate, isActive: true, notes: instNotes, nextPaymentDate });
    setShowAddInstallment(false);
    toast.success(`Installment plan created: ${totalInstallments} payments of ${formatCurrency(installmentAmount, defaultCurrency)}.`);
  };

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const spendingTabs = [
    { id: 'transactions', label: '💳 Transactions' },
    { id: 'budgets', label: '🎯 Budgets' },
    { id: 'recurring', label: '🔄 Recurring' },
  ];

  const budgetCatInfo = getCategoryInfo(budgetCategory);

  // ── MoM helpers ──────────────────────────────────────────────────────────

  const momChange = prevMonthSpending > 0 ? ((monthSpending - prevMonthSpending) / prevMonthSpending) * 100 : null;
  const momLabel = momChange !== null
    ? `${momChange >= 0 ? '+' : ''}${Math.round(momChange)}% vs last month`
    : null;

  const pacingLabel = pacingDelta !== null
    ? pacingDelta > 0
      ? `${formatCurrency(pacingDelta, defaultCurrency)} ahead of pace`
      : `${formatCurrency(Math.abs(pacingDelta), defaultCurrency)} under pace`
    : null;

  // Top categories for breakdown
  const topCategories = useMemo(() => {
    const entries = Object.entries(categorySpend)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const maxVal = entries[0]?.[1] ?? 1;
    return entries.map(([catId, spent]) => {
      const cat = getCategoryInfo(catId);
      const budget = currentMonthBudgets.find(b => b.category === catId);
      const prev = prevCategorySpend[catId] ?? 0;
      const change = prev > 0 ? ((spent - prev) / prev) * 100 : null;
      const status = getBudgetStatus(spent, budget?.amount);
      return { catId, cat, spent, barWidth: (spent / maxVal) * 100, change, status, budget };
    });
  }, [categorySpend, currentMonthBudgets, prevCategorySpend]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Spending</h1>
          <p className="text-white/45 text-sm">
            {new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {missingRateCurrencies.length > 0 && (
              <span className="ml-2 text-amber-400/80">⚠ No rate for {missingRateCurrencies.join(', ')}</span>
            )}
          </p>
        </div>
        <Button variant="primary" onClick={() => openAddTx()}>+ Add Transaction</Button>
      </div>

      {/* ── Summary Tiles ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Primary row: Spending + Net */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Spending card */}
          <GlassCard padding="md">
            <p className="text-white/45 text-xs font-medium tracking-wide uppercase mb-2">This Month Spent</p>
            <div className="flex items-end justify-between gap-2 mb-3">
              <p className="text-3xl font-bold font-mono text-[#EF4444]">
                {formatCurrency(monthSpending, defaultCurrency)}
              </p>
              {momLabel && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${momChange! >= 0 ? 'bg-[#EF4444]/10 text-[#EF4444]/80' : 'bg-[#22C55E]/10 text-[#22C55E]/80'}`}>
                  {momLabel}
                </span>
              )}
            </div>

            {totalBudget > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-xs">
                    {budgetUsedPct !== null ? `${Math.round(budgetUsedPct)}% of budget` : 'Budget'}
                  </span>
                  <span className="text-white/40 text-xs font-mono">
                    {formatCurrency(monthSpending, defaultCurrency)} / {formatCurrency(totalBudget, defaultCurrency)}
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(monthSpending, totalBudget)}
                  max={totalBudget}
                  colorAuto
                />
                {remainingBudget !== null && (
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-xs font-medium ${remainingBudget >= 0 ? 'text-white/40' : 'text-[#EF4444]/70'}`}>
                      {remainingBudget >= 0 ? 'Budget left' : 'Over budget'}
                    </span>
                    <span className={`text-xs font-mono font-semibold ${remainingBudget >= 0 ? 'text-white/75' : 'text-[#EF4444]'}`}>
                      {remainingBudget < 0 ? '-' : ''}{formatCurrency(Math.abs(remainingBudget), defaultCurrency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {upcomingCount > 0 && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                <div>
                  <p className="text-white/35 text-xs">Upcoming this month</p>
                  <p className="text-amber-400/80 text-sm font-mono font-medium">
                    +{formatCurrency(upcomingTotal, defaultCurrency)} ({upcomingCount})
                  </p>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Income card */}
          <GlassCard padding="md">
            <p className="text-white/45 text-xs font-medium tracking-wide uppercase mb-2">Income</p>
            <p className="text-3xl font-bold font-mono mb-3 text-[#22C55E]">
              {formatCurrency(monthIncome, defaultCurrency)}
            </p>

            <div className="flex items-center gap-4 mt-auto pt-3 border-t border-white/5">
              <div>
                <p className="text-white/35 text-xs">Net this month</p>
                <p className={`text-sm font-mono font-semibold ${netThisMonth >= 0 ? 'text-[#22C55E]/80' : 'text-[#EF4444]/80'}`}>
                  {netThisMonth >= 0 ? '+' : ''}{formatCurrency(netThisMonth, defaultCurrency)}
                </p>
              </div>
              {savingsRate !== null && (
                <div>
                  <p className="text-white/35 text-xs">Savings rate</p>
                  <p className={`text-sm font-mono font-semibold ${savingsRate >= 20 ? 'text-[#22C55E]/80' : savingsRate >= 0 ? 'text-white/70' : 'text-[#EF4444]/80'}`}>
                    {Math.round(savingsRate)}%
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Secondary row: small tiles */}
        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            label="Daily average"
            value={formatCurrency(dailyAvg, defaultCurrency)}
            sub={`Day ${elapsedDays} of ${daysInMonth}`}
          />
          {largestCatEntry ? (() => {
            const catInfo = getCategoryInfo(largestCatEntry[0]);
            return (
              <GlassCard padding="md">
                <p className="text-white/45 text-xs font-medium tracking-wide uppercase mb-1.5">Top category</p>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-white text-base font-medium truncate">{catInfo.emoji} {catInfo.name}</p>
                  <p className="text-white font-bold font-mono text-xl flex-shrink-0">{formatCurrency(largestCatEntry[1], defaultCurrency)}</p>
                </div>
              </GlassCard>
            );
          })() : (
            <MetricTile label="Top category" value="—" sub="No expenses yet" />
          )}
        </div>
      </div>

      {/* ── Insights / Alerts Strip ────────────────────────────────────────── */}
      {(budgetAttention.length > 0 || pacingLabel || topCategories.length > 0) && (
        <div className="space-y-3">

          {/* Category breakdown */}
          {topCategories.length > 0 && (
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/60 text-xs font-medium tracking-wide uppercase">Spending by Category</p>
                {pacingLabel && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${pacingDelta! > 0 ? 'bg-[#EF4444]/10 text-[#EF4444]/70' : 'bg-[#22C55E]/10 text-[#22C55E]/70'}`}>
                    {pacingLabel}
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {topCategories.map(({ catId, cat, spent, barWidth, change, status, budget }) => (
                  <div key={catId} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{cat.emoji}</span>
                        <span className="text-white/75 text-sm truncate">{cat.name}</span>
                        {change !== null && (
                          <span className={`text-xs ${change > 15 ? 'text-[#EF4444]/70' : change < -10 ? 'text-[#22C55E]/70' : 'text-white/30'}`}>
                            {change >= 0 ? '+' : ''}{Math.round(change)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {status !== 'none' && status !== 'healthy' && (
                          <BudgetStatusBadge status={status} pct={budget ? (spent / budget.amount) * 100 : 0} />
                        )}
                        <span className={`text-sm font-mono ${status === 'exceeded' ? 'text-[#EF4444]' : 'text-white/70'}`}>
                          {formatCurrency(spent, defaultCurrency)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background: status === 'exceeded' ? '#EF4444' : status === 'warning' ? '#F59E0B' : status === 'caution' ? '#EAB308' : cat.color ?? '#10B981',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs tabs={spendingTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TRANSACTIONS TAB                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">

          {/* Quick type filters + filter toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              {(['all', 'expense', 'income'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTxTypeFilter(t); setFilterPayment('all'); setFilterCategory(''); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    txTypeFilter === t
                      ? t === 'expense' ? 'bg-[#EF4444]/15 text-[#EF4444]'
                        : t === 'income' ? 'bg-[#22C55E]/15 text-[#22C55E]'
                        : 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 ${showFilters ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:text-white hover:bg-white/[0.07]'}`}
              >
                Filters
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {hasFilters && <span className="px-1.5 py-0.5 bg-[#10B981] text-black rounded text-[10px] font-bold leading-none">{[filterDateFrom, filterDateTo, filterCategory, filterType !== 'all' && filterType, filterPayment !== 'all' && filterPayment].filter(Boolean).length}</span>}
              </button>
            </div>
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <GlassCard padding="md">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Input label="From Date" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                <Input label="To Date" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                {(() => {
                  const activeType = filterType !== 'all' ? filterType : txTypeFilter !== 'all' ? txTypeFilter : 'all';
                  const catList = activeType === 'income' ? incomeCategories : activeType === 'expense' ? categories : allCategories;
                  return (
                    <Select label="Category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                      options={[{ value: '', label: 'All Categories' }, ...catList.map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }))]} />
                  );
                })()}
                <Select label="Type" value={filterType} onChange={e => { setFilterType(e.target.value); setFilterPayment('all'); setFilterCategory(''); }}
                  options={[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]} />
                {(() => {
                  // Derive active type from both filter signals
                  const activeType = filterType !== 'all' ? filterType : txTypeFilter !== 'all' ? txTypeFilter : 'all';
                  if (activeType === 'income') {
                    return (
                      <Select label="Destination" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                        options={[{ value: 'all', label: 'All Destinations' }, ...incomeDestinations.map(d => ({ value: d.id, label: `${d.icon} ${d.name}` }))]} />
                    );
                  }
                  if (activeType === 'expense') {
                    return (
                      <Select label="Payment Method" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                        options={[{ value: 'all', label: 'All Methods' }, { value: 'cash', label: '💵 Cash' }, ...cards.map(c => ({ value: c.id, label: `💳 ${c.name}` }))]} />
                    );
                  }
                  // All — show combined
                  return (
                    <Select label="Method / Destination" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'cash', label: '💵 Cash' },
                        ...cards.map(c => ({ value: c.id, label: `💳 ${c.name}` })),
                        ...incomeDestinations.filter(d => d.id !== 'cash').map(d => ({ value: d.id, label: `${d.icon} ${d.name}` })),
                      ]} />
                  );
                })()}
              </div>
              {hasFilters && (
                <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterCategory(''); setFilterType('all'); setFilterPayment('all'); }}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </GlassCard>
          )}

          {/* Date-grouped transaction list */}
          {groupedTx.length > 0 ? (
            <div className="space-y-4">
              {groupedTx.map(group => (
                <div key={group.dateStr}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-white/40 text-xs font-medium">{group.dateLabel}</p>
                    <div className="flex-1 h-px bg-white/5" />
                    <p className="text-white/25 text-xs font-mono">
                      {group.txs.reduce((sum, t) => sum + (t.type === 'expense' ? -txToDefault(t) : txToDefault(t)), 0) >= 0 ? '+' : ''}
                      {formatCurrency(
                        group.txs.reduce((sum, t) => sum + (t.type === 'expense' ? -txToDefault(t) : txToDefault(t)), 0),
                        defaultCurrency, true
                      )}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {group.txs.map(tx => {
                      const cat = getCategoryInfo(tx.category);
                      const cardName = tx.cardId ? (cards.find(c => c.id === tx.cardId)?.name ?? 'Card') : 'Cash';
                      return (
                        <GlassCard key={tx.id} padding="md">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cat.color}22` }}>
                              {cat.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-white/85 text-sm font-medium truncate">{cat.name}</p>
                                {tx.isAutoAdded && <span className="text-xs bg-white/8 text-white/35 px-1.5 py-0.5 rounded">Auto</span>}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <p className="text-white/35 text-xs">{cardName}</p>
                                {tx.notes && (
                                  <><span className="text-white/15 text-xs">·</span><p className="text-white/35 text-xs truncate max-w-[120px]">{tx.notes}</p></>
                                )}
                                {tx.installmentPlanId && (
                                  <><span className="text-white/15 text-xs">·</span><p className="text-white/35 text-xs">Installment {tx.installmentNumber}/{tx.installmentTotal}</p></>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <p className={`font-mono font-semibold text-sm ${tx.type === 'expense' ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                                {tx.type === 'expense' ? '−' : '+'}{formatCurrency(txToDefault(tx), defaultCurrency)}
                                {tx.currency !== defaultCurrency && (
                                  <span className="text-white/25 text-xs ml-1 font-normal">({formatCurrency(tx.amount, tx.currency)})</span>
                                )}
                              </p>
                              {!tx.isAutoAdded && (
                                <>
                                  <button onClick={() => openEditTx(tx)} className="p-1.5 rounded-lg text-white/25 hover:text-white/65 hover:bg-white/8 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                  <button onClick={() => setDeleteTxId(tx.id)} className="p-1.5 rounded-lg text-white/25 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="💳"
              title="No transactions found"
              description={hasFilters || txTypeFilter !== 'all' ? 'No transactions match your filters.' : 'Add your first transaction to start tracking.'}
              action={!hasFilters && txTypeFilter === 'all' ? <Button variant="primary" size="sm" onClick={() => openAddTx()}>+ Add Transaction</Button> : undefined}
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BUDGETS TAB                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'budgets' && (
        <div className="space-y-3">

          {/* Budget tab summary strip */}
          {(() => {
            const budgetedCount   = currentMonthBudgets.length;
            const unsetCount      = categories.length - budgetedCount;
            const attentionCount  = budgetAttention.length;
            // Total remaining = sum of positive remaining per budgeted category
            const totalPositiveRemaining = currentMonthBudgets.reduce((sum, b) => {
              const s = categorySpend[b.category] ?? 0;
              return sum + Math.max(0, b.amount - s);
            }, 0);

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <MetricTile
                  label="Active budgets"
                  value={`${budgetedCount} / ${categories.length}`}
                  sub="categories budgeted"
                />
                <MetricTile
                  label="Need attention"
                  value={attentionCount > 0 ? String(attentionCount) : '✓ All good'}
                  sub={attentionCount > 0 ? `over limit or near it` : 'within limits'}
                  valueColor={attentionCount > 0 ? 'text-[#F59E0B]' : 'text-[#22C55E]'}
                />
                <MetricTile
                  label="Total remaining"
                  value={budgetedCount > 0 ? formatCurrency(totalPositiveRemaining, defaultCurrency) : '—'}
                  sub={budgetedCount > 0 ? `across ${budgetedCount} budget${budgetedCount > 1 ? 's' : ''}` : 'no budgets set'}
                  valueColor={budgetedCount > 0 ? 'text-[#22C55E]' : 'text-white/30'}
                />
                <MetricTile
                  label="Without budget"
                  value={String(unsetCount)}
                  sub={unsetCount > 0 ? 'categories untracked' : 'all categories set'}
                  valueColor={unsetCount > 0 ? 'text-white/55' : 'text-[#22C55E]'}
                />
              </div>
            );
          })()}

          {/* Budget cards sorted by severity */}
          <div className="space-y-2">
            {sortedBudgetRows.map(({ cat, budget, spent, status, pct }) => (
              <BudgetCard
                key={cat.id}
                cat={cat}
                budget={budget}
                spent={spent}
                status={status}
                pct={pct}
                defaultCurrency={defaultCurrency}
                onEdit={() => openSetBudget(cat.id)}
                onDelete={() => budget && deleteBudget(budget.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RECURRING TAB                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">

          {/* Upcoming summary */}
          {upcomingRecurring.count30 > 0 && (
            <MetricTile
              label="Due in next 30 days"
              value={formatCurrency(upcomingRecurring.total30, defaultCurrency)}
              sub={`${upcomingRecurring.count30} payment${upcomingRecurring.count30 > 1 ? 's' : ''} upcoming`}
              valueColor="text-white/70"
            />
          )}

          {/* Recurring Payments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Recurring Payments</h2>
              <Button variant="secondary" size="sm" onClick={openAddRecurring}>+ Add</Button>
            </div>
            {sortedRecurring.length > 0 ? (
              <div className="space-y-1.5">
                {sortedRecurring.map(p => {
                  const cat = getCategoryInfo(p.category);
                  const daysUntil = Math.ceil((new Date(p.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const urgencyColor = daysUntil <= 3 ? 'text-amber-400' : daysUntil <= 7 ? 'text-amber-400/70' : 'text-white/40';

                  return (
                    <GlassCard key={p.id} padding="md">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: `${cat.color}22` }}>
                          {cat.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white/85 text-sm font-medium">{p.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-[#22C55E]/12 text-[#22C55E]/80' : 'bg-white/8 text-white/35'}`}>
                              {p.isActive ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-white/35 text-xs capitalize">{p.frequency}</span>
                            <span className="text-white/15 text-xs">·</span>
                            <span className={`text-xs ${urgencyColor}`}>
                              {daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : daysUntil < 0 ? 'Overdue' : `Due ${formatDate(p.nextDueDate, 'short')}`}
                            </span>
                            <span className="text-white/15 text-xs">·</span>
                            <span className="text-white/35 text-xs">{cat.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className="mr-1.5 text-right">
                            <p className={`font-mono font-semibold text-sm ${p.type === 'expense' ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                              {p.type === 'expense' ? '−' : '+'}{formatCurrency(p.amount, p.currency ?? defaultCurrency)}
                            </p>
                            {(() => {
                              const rpCurrency = p.currency ?? defaultCurrency;
                              if (rpCurrency === defaultCurrency) return null;
                              const rate = exchangeRates.find(r => r.currency === rpCurrency);
                              if (!rate) return <p className="text-white/25 text-xs">{rpCurrency}</p>;
                              return <p className="text-white/25 text-xs">{formatCurrency(p.amount * rate.rateToDefault, defaultCurrency)}</p>;
                            })()}
                          </div>
                          <button onClick={() => updateRecurringPayment(p.id, { isActive: !p.isActive })} className="p-1.5 rounded-lg text-white/25 hover:text-white/65 hover:bg-white/8 transition-colors text-sm" title={p.isActive ? 'Pause' : 'Resume'}>
                            {p.isActive ? '⏸' : '▶'}
                          </button>
                          <button onClick={() => openEditRecurring(p)} className="p-1.5 rounded-lg text-white/25 hover:text-white/65 hover:bg-white/8 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDeleteRecurringId(p.id)} className="p-1.5 rounded-lg text-white/25 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="🔄" title="No recurring payments" description="Add subscriptions, rent, salary or other recurring transactions." action={<Button variant="primary" size="sm" onClick={openAddRecurring}>+ Add Recurring</Button>} />
            )}
          </div>

          {/* Installment Plans */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Installment Plans</h2>
              <Button variant="secondary" size="sm" onClick={openAddInstallment}>+ Add Plan</Button>
            </div>
            {installmentPlans.length > 0 ? (
              <div className="space-y-1.5">
                {installmentPlans.map(p => {
                  const cat = getCategoryInfo(p.category);
                  const paid = p.totalInstallments - p.remainingInstallments;
                  return (
                    <GlassCard key={p.id} padding="md">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5" style={{ background: `${cat.color}22` }}>
                          {cat.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white/85 text-sm font-medium">{p.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-white/55 font-mono text-xs">{formatCurrency(p.installmentAmount, defaultCurrency)}/mo</p>
                              <button onClick={() => setDeleteInstId(p.id)} className="p-1.5 rounded-lg text-white/25 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-white/35 text-xs mb-2">{paid} of {p.totalInstallments} paid · Next: {formatDate(p.nextPaymentDate, 'short')} · Total: {formatCurrency(p.totalAmount, defaultCurrency)}</p>
                          <ProgressBar value={paid} max={p.totalInstallments} color="blue" />
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="📋" title="No installment plans" description="Track split payments for large purchases." action={<Button variant="primary" size="sm" onClick={openAddInstallment}>+ Add Plan</Button>} />
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Add/Edit Transaction */}
      <Modal isOpen={showAddTx} onClose={() => setShowAddTx(false)} title={editingTx ? 'Edit Transaction' : 'Add Transaction'} size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAddTx(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveTx} disabled={!txAmount || !txCategory}>{editingTx ? 'Save Changes' : 'Add Transaction'}</Button></>}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => { setTxType('expense'); setTxCategory(''); setTxPayment(defaultExpensePayment); setShowAddDestination(false); setNewDestName(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${txType === 'expense' ? 'bg-[#EF4444] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Expense</button>
            <button onClick={() => { setTxType('income'); setTxCategory(''); setTxPayment(defaultIncomeDestination); setShowAddDestination(false); setNewDestName(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${txType === 'income' ? 'bg-[#22C55E] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Income</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" inputMode="decimal" placeholder="0.00" value={txAmount} onChange={e => setTxAmount(e.target.value)} required />
            <Select label="Currency" value={txCurrency} onChange={e => {
              const cur = e.target.value;
              setTxCurrency(cur);
              const stored = exchangeRates.find(r => r.currency === cur);
              setTxRate(stored ? stored.rateToDefault.toString() : '');
            }} options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} ${c.symbol}` }))} />
          </div>
          {txCurrency !== defaultCurrency && (
            <div className="flex gap-2 items-end -mt-2">
              <Input
                label={`Rate (1 ${txCurrency} = ? ${defaultCurrency})`}
                type="number" inputMode="decimal" placeholder="0.00"
                value={txRate} onChange={e => setTxRate(e.target.value)}
              />
              {fxApiKey && (
                <Button variant="ghost" size="sm" onClick={handleFetchTxRate} disabled={fetchingTxRate} style={{ marginBottom: '2px' }}>
                  {fetchingTxRate ? '…' : '⬇ Fetch'}
                </Button>
              )}
            </div>
          )}
          {txCurrency !== defaultCurrency && txAmount && (
            <p className="text-white/40 text-xs -mt-2">
              ≈ {formatCurrency(
                txRate && parseFloat(txRate) > 0
                  ? (parseFloat(txAmount) || 0) * parseFloat(txRate)
                  : getConvertedAmount(parseFloat(txAmount) || 0, txCurrency),
                defaultCurrency
              )} in {defaultCurrency}
              {!txRate && !exchangeRates.find(r => r.currency === txCurrency) && (
                <span className="text-amber-400 ml-1">(no exchange rate — enter rate above)</span>
              )}
            </p>
          )}
          <Select label="Category" value={txCategory} onChange={e => setTxCategory(e.target.value)} options={txCategoryOptions.map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }))} required />
          <Input label="Date" type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
          {txType === 'income' ? (
            <div className="space-y-2">
              <Select label="Destination" value={txPayment} onChange={e => setTxPayment(e.target.value)} options={destinationOptions} />
              {/* Inline add-account row */}
              {showAddDestination ? (
                <div className="flex gap-2 items-center">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Account name (e.g. Chase Checking)"
                    value={newDestName}
                    onChange={e => setNewDestName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newDestName.trim()) {
                        const id = crypto.randomUUID();
                        addIncomeDestination({ id, name: newDestName.trim(), icon: '🏦' });
                        setTxPayment(id);
                        setNewDestName('');
                        setShowAddDestination(false);
                      } else if (e.key === 'Escape') {
                        setShowAddDestination(false);
                        setNewDestName('');
                      }
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#10B981]/50"
                  />
                  <button
                    disabled={!newDestName.trim()}
                    onClick={() => {
                      if (!newDestName.trim()) return;
                      const id = crypto.randomUUID();
                      addIncomeDestination({ id, name: newDestName.trim(), icon: '🏦' });
                      setTxPayment(id);
                      setNewDestName('');
                      setShowAddDestination(false);
                    }}
                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 disabled:opacity-40 transition-all"
                  >Add</button>
                  <button onClick={() => { setShowAddDestination(false); setNewDestName(''); }} className="px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 transition-all">✕</button>
                </div>
              ) : (
                <button onClick={() => setShowAddDestination(true)} className="text-xs text-[#10B981]/70 hover:text-[#10B981] transition-colors flex items-center gap-1">
                  <span>+</span> Add bank account or other account
                </button>
              )}
              {/* Allow deleting custom destinations (not cash) */}
              {txPayment !== 'cash' && incomeDestinations.find(d => d.id === txPayment) && (
                <button
                  onClick={() => { deleteIncomeDestination(txPayment); setTxPayment(incomeDestinations[0]?.id ?? 'cash'); }}
                  className="text-xs text-[#EF4444]/60 hover:text-[#EF4444] transition-colors"
                >Remove this account</button>
              )}
            </div>
          ) : (
            <Select label="Payment Method" value={txPayment} onChange={e => setTxPayment(e.target.value)} options={paymentOptions} />
          )}
          <Input label="Notes (optional)" placeholder="Description..." value={txNotes} onChange={e => setTxNotes(e.target.value)} />
        </div>
      </Modal>

      {/* Add/Edit Recurring */}
      <Modal isOpen={showAddRecurring} onClose={() => setShowAddRecurring(false)} title={editingRecurring ? 'Edit Recurring Payment' : 'Add Recurring Payment'} size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAddRecurring(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveRecurring} disabled={!recName || !recAmount}>{editingRecurring ? 'Save Changes' : 'Add Recurring'}</Button></>}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => { setRecType('expense'); setRecCategory(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${recType === 'expense' ? 'bg-[#EF4444] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Expense</button>
            <button onClick={() => { setRecType('income'); setRecCategory(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${recType === 'income' ? 'bg-[#22C55E] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Income</button>
          </div>
          <Input label="Name" placeholder="Netflix, Rent, Salary..." value={recName} onChange={e => setRecName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" inputMode="decimal" placeholder="0.00" value={recAmount} onChange={e => setRecAmount(e.target.value)} required />
            <Select label="Currency" value={recCurrency} onChange={e => setRecCurrency(e.target.value)} options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` }))} />
          </div>
          <Select label="Category" value={recCategory} onChange={e => setRecCategory(e.target.value)} options={recCategoryOptions.map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }))} />
          <Select label="Frequency" value={recFrequency} onChange={e => setRecFrequency(e.target.value as 'weekly' | 'monthly' | 'yearly')} options={FREQUENCIES} />
          {recFrequency !== 'weekly' && <Input label="Day of Month" type="number" inputMode="numeric" placeholder="1" value={recDayOfMonth} onChange={e => setRecDayOfMonth(e.target.value)} hint="1–28 recommended" />}
          <Input label="Start Date" type="date" value={recStartDate} onChange={e => setRecStartDate(e.target.value)} />
          <Input label="End Date (optional)" type="date" value={recEndDate} onChange={e => setRecEndDate(e.target.value)} />
          <Input label="Notes (optional)" placeholder="Optional notes..." value={recNotes} onChange={e => setRecNotes(e.target.value)} />
        </div>
      </Modal>

      {/* Add Installment Plan */}
      <Modal isOpen={showAddInstallment} onClose={() => setShowAddInstallment(false)} title="Add Installment Plan" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAddInstallment(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveInstallment} disabled={!instName || !instTotal || !instCount}>Add Plan</Button></>}>
        <div className="space-y-4">
          <Input label="Plan Name" placeholder="iPhone payment, Furniture..." value={instName} onChange={e => setInstName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Total Amount" type="number" inputMode="decimal" placeholder="1200" value={instTotal} onChange={e => setInstTotal(e.target.value)} required />
            <Input label="# Installments" type="number" inputMode="numeric" placeholder="12" value={instCount} onChange={e => setInstCount(e.target.value)} required />
          </div>
          {instTotal && instCount && parseInt(instCount) > 0 && (
            <p className="text-[#22C55E] text-sm font-mono">{formatCurrency(parseFloat(instTotal) / parseInt(instCount), defaultCurrency)} per installment</p>
          )}
          <Select label="Category" value={instCategory} onChange={e => setInstCategory(e.target.value)} options={categories.map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }))} />
          <Input label="Day of Month" type="number" inputMode="numeric" placeholder="1" value={instDay} onChange={e => setInstDay(e.target.value)} hint="Which day each installment is due" />
          <Input label="Start Date" type="date" value={instStartDate} onChange={e => setInstStartDate(e.target.value)} />
          <Input label="Notes (optional)" value={instNotes} onChange={e => setInstNotes(e.target.value)} />
        </div>
      </Modal>

      {/* Set Budget */}
      <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title={`Set Budget — ${budgetCatInfo.emoji} ${budgetCatInfo.name}`} size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowBudgetModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveBudget} disabled={!budgetAmount}>Save Budget</Button></>}>
        <Input label={`Monthly Budget (${defaultCurrency})`} type="number" inputMode="decimal" placeholder="500" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} autoFocus />
      </Modal>

      {/* Confirm Dialogs */}
      <ConfirmDialog isOpen={!!deleteTxId} onClose={() => setDeleteTxId(null)} onConfirm={() => { if (deleteTxId) { deleteTransaction(deleteTxId); setDeleteTxId(null); toast.success('Transaction deleted.'); } }} title="Delete Transaction" message="Delete this transaction? This cannot be undone." confirmLabel="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteRecurringId} onClose={() => setDeleteRecurringId(null)} onConfirm={() => { if (deleteRecurringId) { deleteRecurringPayment(deleteRecurringId); setDeleteRecurringId(null); toast.success('Recurring payment removed.'); } }} title="Delete Recurring Payment" message="This will delete the recurring payment. Already-added transactions remain." confirmLabel="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteInstId} onClose={() => setDeleteInstId(null)} onConfirm={() => { if (deleteInstId) { deleteInstallmentPlan(deleteInstId); setDeleteInstId(null); toast.success('Installment plan removed.'); } }} title="Delete Installment Plan" message="This will delete the plan. Already-added transactions remain." confirmLabel="Delete" confirmVariant="danger" />
    </div>
  );
}
