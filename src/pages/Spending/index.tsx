import { useState, useMemo, useEffect } from 'react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useQuickAddStore } from '../../stores/quickAddStore';
import { useIsMobile } from '../../hooks/useIsMobile';
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

/** Format a Date using LOCAL components to avoid UTC timezone shift */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getNextDueDate(frequency: string, startDate: string, dayOfMonth: number | null): string {
  const today = new Date();
  // Parse startDate as local (YYYY-MM-DD) to avoid UTC shift
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  if (frequency === 'monthly' && dayOfMonth) {
    const d = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (d <= today) d.setMonth(d.getMonth() + 1);
    return localDateStr(d);
  }
  if (frequency === 'yearly') {
    const d = new Date(today.getFullYear(), start.getMonth(), start.getDate());
    if (d <= today) d.setFullYear(d.getFullYear() + 1);
    return localDateStr(d);
  }
  const d = new Date(today);
  d.setDate(d.getDate() + 7);
  return localDateStr(d);
}

export default function Spending() {
  const transactions = useTransactionStore((s) => s.transactions);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const lastUsedPaymentMethod = useTransactionStore((s) => s.lastUsedPaymentMethod);
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
  const decrementFxRequests = useSettingsStore((s) => s.decrementFxRequests);
  const cards = useCardsStore((s) => s.cards).filter((c) => c.isActive);

  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const addRecurringPayment = useRecurringStore((s) => s.addRecurringPayment);
  const updateRecurringPayment = useRecurringStore((s) => s.updateRecurringPayment);
  const deleteRecurringPayment = useRecurringStore((s) => s.deleteRecurringPayment);
  const installmentPlans = useRecurringStore((s) => s.installmentPlans);
  const addInstallmentPlan = useRecurringStore((s) => s.addInstallmentPlan);
  const deleteInstallmentPlan = useRecurringStore((s) => s.deleteInstallmentPlan);

  const [activeTab, setActiveTab] = useState('transactions');
  const toast = useToast();
  const isMobile = useIsMobile();

  // Page title
  useEffect(() => { document.title = 'Spending — NetWorth Tracker'; }, []);

  // Quick-add FAB handler
  const quickAddTarget = useQuickAddStore((s) => s.target);
  const setQuickAddTarget = useQuickAddStore((s) => s.setTarget);
  useEffect(() => {
    if (quickAddTarget === 'expense' || quickAddTarget === 'income') {
      openAddTx(quickAddTarget);
      setQuickAddTarget(null);
    }
  }, [quickAddTarget]);

  // Transaction modal
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txDate, setTxDate] = useState(getTodayISO());
  const [txNotes, setTxNotes] = useState('');
  const [txPayment, setTxPayment] = useState(lastUsedPaymentMethod);
  const [txCurrency, setTxCurrency] = useState(defaultCurrency);
  const [txRate, setTxRate] = useState('');
  const [fetchingTxRate, setFetchingTxRate] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);

  // Budget modal
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  // Recurring modal
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

  // Installment modal
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

  const monthTransactions = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }), [transactions, month, year]);

  /**
   * Convert a transaction to the default currency.
   * Priority: (1) current live rate from settings, (2) stored convertedAmount
   * (which may include a per-transaction rate the user entered at save time).
   * Never falls back to the raw foreign amount, which would silently mis-represent the total.
   */
  const txToDefault = (t: Transaction): number => {
    if (t.currency === defaultCurrency) return t.amount;
    const rate = exchangeRates.find((r) => r.currency === t.currency);
    if (rate) return t.amount * rate.rateToDefault;
    // No current rate — use whatever was stored (may be a per-transaction rate or raw amount)
    return t.convertedAmount;
  };

  const monthSpending = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + txToDefault(t), 0);
  const monthIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + txToDefault(t), 0);

  // Currencies used this month that have no exchange rate configured
  const missingRateCurrencies = useMemo(() => {
    const missing = new Set<string>();
    monthTransactions.forEach((t) => {
      if (t.currency !== defaultCurrency && !exchangeRates.find((r) => r.currency === t.currency)) {
        missing.add(t.currency);
      }
    });
    return [...missing];
  }, [monthTransactions, exchangeRates, defaultCurrency]);

  // Upcoming recurring expenses due later this month (not yet auto-added as transactions)
  const { upcomingTotal, upcomingCount } = useMemo(() => {
    const todayStr = getTodayISO();
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStr = `${year}-${pad(month)}`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${monthStr}-${pad(daysInMonth)}`;

    let total = 0;
    let count = 0;
    recurringPayments.forEach((rp) => {
      if (!rp.isActive) return;
      if (rp.type !== 'expense') return;
      if (rp.endDate && rp.endDate < todayStr) return;
      if (rp.nextDueDate > todayStr && rp.nextDueDate <= monthEnd && rp.nextDueDate.startsWith(monthStr)) {
        const rpCurrency = rp.currency ?? defaultCurrency;
        const rpRate = exchangeRates.find((r) => r.currency === rpCurrency);
        const converted = rpCurrency === defaultCurrency
          ? rp.amount
          : rpRate ? rp.amount * rpRate.rateToDefault : rp.amount;
        total += converted;
        count++;
      }
    });
    return { upcomingTotal: total, upcomingCount: count };
  }, [recurringPayments, exchangeRates, defaultCurrency, month, year]);

  const filteredTx = useMemo(() => {
    return [...transactions]
      .filter((t) => {
        if (filterDateFrom && t.date < filterDateFrom) return false;
        if (filterDateTo && t.date > filterDateTo) return false;
        if (filterCategory && t.category !== filterCategory) return false;
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterPayment !== 'all' && t.paymentMethod !== filterPayment) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterDateFrom, filterDateTo, filterCategory, filterType, filterPayment]);

  const hasFilters = !!(filterDateFrom || filterDateTo || filterCategory || filterType !== 'all' || filterPayment !== 'all');

  const allCategories = [...categories, ...incomeCategories];

  const getCategoryInfo = (catId: string) =>
    allCategories.find((c) => c.id === catId) ?? { name: catId, emoji: '💰', color: '#6b7280' };

  const getConvertedAmount = (amount: number, currency: string): number => {
    if (currency === defaultCurrency) return amount;
    const rate = exchangeRates.find((r) => r.currency === currency);
    return rate ? amount * rate.rateToDefault : amount;
  };

  const paymentOptions = [
    { value: 'cash', label: '💵 Cash' },
    ...cards.map((c) => ({ value: c.id, label: `💳 ${c.name}` })),
  ];

  const openAddTx = (type: 'expense' | 'income' = 'expense') => {
    setEditingTx(null);
    setTxType(type); setTxAmount('');
    setTxCategory((type === 'expense' ? categories[0] : incomeCategories[0])?.id ?? '');
    setTxDate(getTodayISO());
    setTxNotes(''); setTxPayment(lastUsedPaymentMethod); setTxCurrency(defaultCurrency);
    setTxRate('');
    setShowAddTx(true);
  };

  // Get category list for the current transaction type
  const txCategoryOptions = txType === 'expense' ? categories : incomeCategories;

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx); setTxType(tx.type); setTxAmount(String(tx.amount));
    setTxCategory(tx.category); setTxDate(tx.date); setTxNotes(tx.notes);
    setTxPayment(tx.paymentMethod); setTxCurrency(tx.currency);
    // Pre-fill rate from the stored convertedAmount (back-computed)
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
    } catch (e: any) {
      // inline error — keep field empty so user can type manually
    } finally {
      setFetchingTxRate(false);
    }
  };

  const handleSaveTx = () => {
    if (!txAmount || !txCategory) return;
    const amount = parseFloat(txAmount);
    let convertedAmount: number;
    if (txCurrency !== defaultCurrency && txRate && parseFloat(txRate) > 0) {
      // Per-transaction rate — local only, does not update global exchange rates
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
      addTransaction({ id: crypto.randomUUID(), amount, convertedAmount, category: txCategory, date: txDate, notes: txNotes, type: txType, paymentMethod: txPayment, cardId, currency: txCurrency, isAutoAdded: false, installmentPlanId: null, installmentNumber: null, installmentTotal: null });
      toast.success('Transaction added.');
    }
    setShowAddTx(false);
  };

  const currentMonthBudgets = budgets.filter((b) => b.month === month && b.year === year);

  const openSetBudget = (catId: string) => {
    const existing = currentMonthBudgets.find((b) => b.category === catId);
    setBudgetCategory(catId); setBudgetAmount(existing ? String(existing.amount) : '');
    setShowBudgetModal(true);
  };

  const handleSaveBudget = () => {
    if (!budgetAmount || !budgetCategory) return;
    const existing = currentMonthBudgets.find((b) => b.category === budgetCategory);
    if (existing) { updateBudget(existing.id, { amount: parseFloat(budgetAmount) }); }
    else { addBudget({ id: crypto.randomUUID(), category: budgetCategory, amount: parseFloat(budgetAmount), month, year }); }
    setShowBudgetModal(false);
  };

  const openAddRecurring = () => {
    setEditingRecurring(null); setRecName(''); setRecAmount('');
    setRecCategory(categories[0]?.id ?? ''); setRecType('expense');
    setRecFrequency('monthly'); setRecDayOfMonth('1'); setRecStartDate(getTodayISO());
    setRecEndDate(''); setRecNotes(''); setRecCurrency(defaultCurrency); setShowAddRecurring(true);
  };

  // Get category list for the current recurring type
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

  const spendingTabs = isMobile
    ? [{ id: 'transactions', label: '💳 Transactions' }]
    : [
        { id: 'transactions', label: '💳 Transactions' },
        { id: 'budgets', label: '🎯 Budgets' },
        { id: 'recurring', label: '🔄 Recurring' },
      ];

  const budgetCatId = budgetCategory;
  const budgetCatInfo = getCategoryInfo(budgetCatId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Spending</h1>
          <p className="text-white/50">Track transactions, budgets, and recurring payments</p>
        </div>
        <Button variant="primary" onClick={() => openAddTx()}>+ Add Transaction</Button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard padding="md">
          <p className="text-white/50 text-sm mb-1">This Month Spent</p>
          <h3 className="text-2xl font-bold text-[#EF4444] font-mono">{formatCurrency(monthSpending, defaultCurrency)}</h3>
          <p className="text-xs text-white/30 mt-1">{monthTransactions.filter(t => t.type === 'expense').length} expenses</p>
          {upcomingCount > 0 && (
            <p className="text-xs text-amber-400/70 mt-1">
              + {formatCurrency(upcomingTotal, defaultCurrency, true)} upcoming ({upcomingCount} recurring)
            </p>
          )}
          {missingRateCurrencies.length > 0 && (
            <p className="text-xs text-orange-400/80 mt-1">
              ⚠️ No rate for {missingRateCurrencies.join(', ')} — add in Settings
            </p>
          )}
        </GlassCard>
        <GlassCard padding="md">
          <p className="text-white/50 text-sm mb-1">This Month Income</p>
          <h3 className="text-2xl font-bold text-[#22C55E] font-mono">{formatCurrency(monthIncome, defaultCurrency)}</h3>
          <p className="text-xs text-white/30 mt-1">{monthTransactions.filter(t => t.type === 'income').length} income entries</p>
        </GlassCard>
        <GlassCard padding="md">
          <p className="text-white/50 text-sm mb-1">Net This Month</p>
          <h3 className={`text-2xl font-bold font-mono ${monthIncome - monthSpending >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {monthIncome - monthSpending >= 0 ? '+' : ''}{formatCurrency(monthIncome - monthSpending, defaultCurrency)}
          </h3>
          <p className="text-xs text-white/30 mt-1">income − expenses</p>
        </GlassCard>
      </div>

      <Tabs tabs={spendingTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant={showFilters ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowFilters(!showFilters)}>
              🔍 Filters {hasFilters && <span className="ml-1 px-1.5 py-0.5 bg-[#10B981] rounded text-xs">On</span>}
            </Button>
            {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterCategory(''); setFilterType('all'); setFilterPayment('all'); }}>✕ Clear</Button>}
            <span className="text-white/30 text-sm ml-auto">{filteredTx.length} transactions</span>
          </div>

          {showFilters && (
            <GlassCard padding="md">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Input label="From Date" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                <Input label="To Date" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                <Select label="Category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  options={[{ value: '', label: 'All Categories' }, ...allCategories.map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }))]} />
                <Select label="Type" value={filterType} onChange={e => setFilterType(e.target.value)}
                  options={[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]} />
                <Select label="Payment Method" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                  options={[{ value: 'all', label: 'All Methods' }, { value: 'cash', label: '💵 Cash' }, ...cards.map(c => ({ value: c.id, label: `💳 ${c.name}` }))]} />
              </div>
            </GlassCard>
          )}

          {filteredTx.length > 0 ? (
            <div className="space-y-2">
              {filteredTx.map((tx) => {
                const cat = getCategoryInfo(tx.category);
                const cardName = tx.cardId ? (cards.find(c => c.id === tx.cardId)?.name ?? 'Card') : 'Cash';
                return (
                  <GlassCard key={tx.id} padding="md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${cat.color}22` }}>
                        {cat.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">{cat.name}</p>
                          {tx.isAutoAdded && <span className="text-xs bg-white/10 text-white/40 px-1.5 py-0.5 rounded">Auto</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-white/40 text-xs">{formatDate(tx.date, 'short')}</p>
                          <span className="text-white/20 text-xs">·</span>
                          <p className="text-white/40 text-xs">{cardName}</p>
                          {tx.notes && (<><span className="text-white/20 text-xs">·</span><p className="text-white/40 text-xs truncate">{tx.notes}</p></>)}
                          {tx.installmentPlanId && (<><span className="text-white/20 text-xs">·</span><p className="text-white/40 text-xs">Payment {tx.installmentNumber} of {tx.installmentTotal}</p></>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className={`font-mono font-semibold ${tx.type === 'expense' ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                          {tx.type === 'expense' ? '-' : '+'}{formatCurrency(txToDefault(tx), defaultCurrency)}
                          {tx.currency !== defaultCurrency && <span className="text-white/30 text-xs ml-1">({formatCurrency(tx.amount, tx.currency)})</span>}
                        </p>
                        {!tx.isAutoAdded && (
                          <>
                            <button onClick={() => openEditTx(tx)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => setDeleteTxId(tx.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
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
          ) : (
            <EmptyState
              icon="💳"
              title="No transactions found"
              description={hasFilters ? "No transactions match your filters." : "Add your first transaction to start tracking."}
              action={!hasFilters ? <Button variant="primary" size="sm" onClick={() => openAddTx()}>+ Add Transaction</Button> : undefined}
            />
          )}
        </div>
      )}

      {/* BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <GlassCard padding="lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white">Monthly Budgets</h2>
              <p className="text-white/40 text-sm">Month {month}/{year}</p>
            </div>
            <div className="space-y-5">
              {categories.map((cat) => {
                const budget = currentMonthBudgets.find(b => b.category === cat.id);
                const spent = monthTransactions.filter(t => t.type === 'expense' && t.category === cat.id).reduce((sum, t) => sum + txToDefault(t), 0);
                const progress = budget ? (spent / budget.amount) * 100 : null;
                const barColor = !progress ? 'blue' : progress >= 100 ? 'red' : progress >= 80 ? 'amber' : 'green';
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="text-sm font-medium text-white">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">
                          <span className={spent > 0 ? (progress && progress >= 100 ? 'text-[#EF4444]' : 'text-white') : 'text-white/30'}>
                            {formatCurrency(spent, defaultCurrency, true)}
                          </span>
                          {budget && <span className="text-white/30"> / {formatCurrency(budget.amount, defaultCurrency, true)}</span>}
                        </span>
                        <button onClick={() => openSetBudget(cat.id)} className="text-xs text-[#10B981] hover:text-[#10B981]/70 underline transition-colors">
                          {budget ? 'Edit' : 'Set'}
                        </button>
                        {budget && <button onClick={() => deleteBudget(budget.id)} className="text-xs text-[#EF4444]/40 hover:text-[#EF4444] transition-colors">✕</button>}
                      </div>
                    </div>
                    {budget ? (
                      <ProgressBar value={Math.min(spent, budget.amount)} max={budget.amount} color={barColor} />
                    ) : (
                      <div className="h-2 rounded-full bg-white/5" />
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* RECURRING */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          {/* Recurring Payments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-white">Recurring Payments</h2>
              <Button variant="secondary" size="sm" onClick={openAddRecurring}>+ Add Recurring</Button>
            </div>
            {recurringPayments.length > 0 ? (
              <div className="space-y-2">
                {recurringPayments.map((p) => {
                  const cat = getCategoryInfo(p.category);
                  return (
                    <GlassCard key={p.id} padding="md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${cat.color}22` }}>
                          {cat.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{p.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-white/10 text-white/40'}`}>
                              {p.isActive ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-white/40 text-xs capitalize">{p.frequency}</p>
                            <span className="text-white/20 text-xs">·</span>
                            <p className="text-white/40 text-xs">Next: {formatDate(p.nextDueDate, 'short')}</p>
                            <span className="text-white/20 text-xs">·</span>
                            <p className="text-white/40 text-xs">{cat.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className="mr-2 text-right">
                            <p className={`font-mono font-semibold ${p.type === 'expense' ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                              {p.type === 'expense' ? '-' : '+'}{formatCurrency(p.amount, p.currency ?? defaultCurrency)}
                            </p>
                            {(() => {
                              const rpCurrency = p.currency ?? defaultCurrency;
                              if (rpCurrency === defaultCurrency) return null;
                              const rate = exchangeRates.find((r) => r.currency === rpCurrency);
                              if (!rate) return <p className="text-white/30 text-xs">{rpCurrency}</p>;
                              const converted = p.amount * rate.rateToDefault;
                              return (
                                <p className="text-white/30 text-xs whitespace-nowrap">
                                  ({formatCurrency(converted, defaultCurrency)} @ {parseFloat(rate.rateToDefault.toFixed(4))})
                                </p>
                              );
                            })()}
                          </div>
                          <button onClick={() => updateRecurringPayment(p.id, { isActive: !p.isActive })} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors text-sm" title={p.isActive ? 'Pause' : 'Resume'}>
                            {p.isActive ? '⏸' : '▶'}
                          </button>
                          <button onClick={() => openEditRecurring(p)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDeleteRecurringId(p.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
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
              <h2 className="text-xl font-semibold text-white">Installment Plans</h2>
              <Button variant="secondary" size="sm" onClick={openAddInstallment}>+ Add Plan</Button>
            </div>
            {installmentPlans.length > 0 ? (
              <div className="space-y-2">
                {installmentPlans.map((p) => {
                  const cat = getCategoryInfo(p.category);
                  const paid = p.totalInstallments - p.remainingInstallments;
                  return (
                    <GlassCard key={p.id} padding="md">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5" style={{ background: `${cat.color}22` }}>
                          {cat.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white font-medium">{p.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-white/60 font-mono text-sm">{formatCurrency(p.installmentAmount, defaultCurrency)}/mo</p>
                              <button onClick={() => setDeleteInstId(p.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-white/40 text-xs mb-2">{paid} of {p.totalInstallments} paid · Next: {formatDate(p.nextPaymentDate, 'short')} · Total: {formatCurrency(p.totalAmount, defaultCurrency, true)}</p>
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

      {/* ADD/EDIT TRANSACTION MODAL */}
      <Modal isOpen={showAddTx} onClose={() => setShowAddTx(false)} title={editingTx ? 'Edit Transaction' : 'Add Transaction'} size="md"
        footer={<><Button variant="ghost" onClick={() => setShowAddTx(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveTx} disabled={!txAmount || !txCategory}>{editingTx ? 'Save Changes' : 'Add Transaction'}</Button></>}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => { setTxType('expense'); setTxCategory(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${txType === 'expense' ? 'bg-[#EF4444] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Expense</button>
            <button onClick={() => { setTxType('income'); setTxCategory(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${txType === 'income' ? 'bg-[#22C55E] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Income</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" inputMode="decimal" placeholder="0.00" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} required />
            <Select label="Currency" value={txCurrency} onChange={(e) => {
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
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={txRate}
                onChange={(e) => setTxRate(e.target.value)}
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
          <Select label="Category" value={txCategory} onChange={(e) => setTxCategory(e.target.value)} options={txCategoryOptions.map(c => ({ value: c.id, label: `${c.emoji} ${c.name}` }))} required />
          <Input label="Date" type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          <Select label="Payment Method" value={txPayment} onChange={(e) => setTxPayment(e.target.value)} options={paymentOptions} />
          <Input label="Notes (optional)" placeholder="Description..." value={txNotes} onChange={(e) => setTxNotes(e.target.value)} />
        </div>
      </Modal>

      {/* ADD/EDIT RECURRING MODAL */}
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

      {/* ADD INSTALLMENT PLAN MODAL */}
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

      {/* Budget Modal */}
      <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title={`Set Budget — ${budgetCatInfo.emoji} ${budgetCatInfo.name}`} size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowBudgetModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveBudget} disabled={!budgetAmount}>Save Budget</Button></>}>
        <Input label={`Monthly Budget (${defaultCurrency})`} type="number" inputMode="decimal" placeholder="500" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} autoFocus />
      </Modal>

      {/* Confirm Dialogs */}
      <ConfirmDialog isOpen={!!deleteTxId} onClose={() => setDeleteTxId(null)} onConfirm={() => { if (deleteTxId) { deleteTransaction(deleteTxId); setDeleteTxId(null); toast.success('Transaction deleted.'); } }} title="Delete Transaction" message="Delete this transaction? This cannot be undone." confirmLabel="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteRecurringId} onClose={() => setDeleteRecurringId(null)} onConfirm={() => { if (deleteRecurringId) { deleteRecurringPayment(deleteRecurringId); setDeleteRecurringId(null); toast.success('Recurring payment removed.'); } }} title="Delete Recurring Payment" message="This will delete the recurring payment. Already-added transactions remain." confirmLabel="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={!!deleteInstId} onClose={() => setDeleteInstId(null)} onConfirm={() => { if (deleteInstId) { deleteInstallmentPlan(deleteInstId); setDeleteInstId(null); toast.success('Installment plan removed.'); } }} title="Delete Installment Plan" message="This will delete the plan. Already-added transactions remain." confirmLabel="Delete" confirmVariant="danger" />
    </div>
  );
}
