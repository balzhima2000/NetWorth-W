/**
 * Data hook for the William Spending page.
 * Derives everything the "Spending for <month>" screen shows from the
 * transaction, category, budget and settings stores — all scoped to the
 * selected month.
 */
import { useMemo } from 'react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Transaction } from '../../types/index';

export interface CategorySlice {
  id: string;
  name: string;
  amount: number;
  pct: number; // 0–100 of total spend
}
export interface RecentRow {
  id: string;
  name: string;      // notes if present, else category name
  category: string;  // category display name
  color: string;     // category marker color (native hex)
  amount: number;    // converted amount, always positive
  isExpense: boolean;
}
export interface BudgetRow {
  id: string;
  name: string;
  spent: number;
  limit: number;
  over: boolean;
  pct: number; // fill %, capped 0–100
}

const daysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();

export function useSpendingData(month: number, year: number) {
  const transactions   = useTransactionStore((s) => s.transactions);
  const expenseCats    = useCategoriesStore((s) => s.categories);
  const incomeCats     = useCategoriesStore((s) => s.incomeCategories);
  const budgets        = useBudgetStore((s) => s.budgets);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);

  return useMemo(() => {
    const catInfo = (id: string) => {
      const c = expenseCats.find((x) => x.id === id) ?? incomeCats.find((x) => x.id === id);
      return { name: c?.name ?? id, color: c?.color ?? '#737373' };
    };

    const inMonth = (t: Transaction) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    };
    const monthTx = transactions.filter(inMonth);
    const expenses = monthTx.filter((t) => t.type === 'expense');

    const totalSpent = expenses.reduce((s, t) => s + t.convertedAmount, 0);

    // ── Previous month, for the "vs last month" delta ──
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    const prevSpent = transactions
      .filter((t) => t.type === 'expense')
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((s, t) => s + t.convertedAmount, 0);
    const deltaPct = prevSpent > 0 ? ((totalSpent - prevSpent) / prevSpent) * 100 : null;

    // ── By category — top 3 named categories + everything else as "Other" ──
    // The misc "other" category is always folded into the aggregate so it never
    // appears as its own slice (which would collide with the "Other" bucket).
    const MISC_ID = 'other';
    const byCatMap: Record<string, number> = {};
    expenses.forEach((t) => { byCatMap[t.category] = (byCatMap[t.category] ?? 0) + t.convertedAmount; });
    const ranked = Object.entries(byCatMap)
      .filter(([id]) => id !== MISC_ID)
      .map(([id, amount]) => ({ id, name: catInfo(id).name, amount }))
      .sort((a, b) => b.amount - a.amount);
    const top = ranked.slice(0, 3);
    const otherAmount =
      ranked.slice(3).reduce((s, r) => s + r.amount, 0) + (byCatMap[MISC_ID] ?? 0);
    const categories: CategorySlice[] = [
      ...top,
      ...(otherAmount > 0 ? [{ id: '__other__', name: 'Other', amount: otherAmount }] : []),
    ].map((r) => ({ ...r, pct: totalSpent > 0 ? (r.amount / totalSpent) * 100 : 0 }));

    // ── Recent — latest transactions in the month ──
    const recent: RecentRow[] = [...monthTx]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((t) => {
        const info = catInfo(t.category);
        return {
          id: t.id,
          name: t.notes?.trim() || info.name,
          category: info.name,
          color: info.color,
          amount: Math.abs(t.convertedAmount),
          isExpense: t.type === 'expense',
        };
      });

    // ── Budgets — this month's budgets vs spend ──
    const budgetRows: BudgetRow[] = budgets
      .filter((b) => b.month === month && b.year === year && b.amount > 0)
      .map((b) => {
        const spent = byCatMap[b.category] ?? 0;
        const over = spent > b.amount;
        return {
          id: b.id,
          name: catInfo(b.category).name,
          spent,
          limit: b.amount,
          over,
          pct: Math.min(Math.max((spent / b.amount) * 100, 0), 100),
        };
      });

    // ── Daily average — spend ÷ days elapsed (current month) or days in month ──
    const now = new Date();
    const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
    const dayCount = isCurrentMonth ? now.getDate() : daysInMonth(month, year);
    const dailyAverage = dayCount > 0 ? totalSpent / dayCount : 0;

    return {
      defaultCurrency,
      totalSpent,
      deltaPct,
      categories,
      recent,
      budgetRows,
      dailyAverage,
      hasData: monthTx.length > 0,
    };
  }, [transactions, expenseCats, incomeCats, budgets, defaultCurrency, month, year]);
}
