/**
 * Data hook for the William Recurring page (subscriptions & installments).
 * Normalises everything to a monthly figure in the default currency and
 * shapes it for the list + summary.
 */
import { useMemo } from 'react';
import { useRecurringStore } from '../../stores/recurringStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useSettingsStore } from '../../stores/settingsStore';

export interface SubRow {
  id: string;
  name: string;
  category: string;
  color: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDue: string;   // ISO
  amount: number;    // native amount (display currency = its own)
  currency: string;
  active: boolean;
}
export interface InstallRow {
  id: string;
  name: string;
  category: string;
  color: string;
  perMonth: number;  // native
  currency: string;
  paid: number;
  total: number;
  leftAmount: number; // native, remaining × perMonth
  pct: number;        // 0–100
  active: boolean;
}

// Monthly-normalisation multiplier for a recurring frequency.
const MONTHLY_FACTOR: Record<SubRow['frequency'], number> = {
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
};

export function useRecurringData() {
  const recurring     = useRecurringStore((s) => s.recurringPayments);
  const installments  = useRecurringStore((s) => s.installmentPlans);
  const expenseCats   = useCategoriesStore((s) => s.categories);
  const incomeCats    = useCategoriesStore((s) => s.incomeCategories);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates   = useSettingsStore((s) => s.exchangeRates);

  return useMemo(() => {
    const catInfo = (id: string) => {
      const c = expenseCats.find((x) => x.id === id) ?? incomeCats.find((x) => x.id === id);
      return { name: c?.name ?? id, color: c?.color ?? '#737373' };
    };
    // Convert a native amount to the default currency using the entry-time table.
    const toDefault = (amount: number, currency: string) => {
      if (!currency || currency === defaultCurrency) return amount;
      const rate = exchangeRates.find((r) => r.currency === currency)?.rateToDefault ?? 1;
      return amount * rate;
    };

    const subscriptions: SubRow[] = recurring.map((p) => {
      const info = catInfo(p.category);
      return {
        id: p.id, name: p.name, category: info.name, color: info.color,
        frequency: p.frequency, nextDue: p.nextDueDate, amount: p.amount,
        currency: p.currency || defaultCurrency, active: p.isActive,
      };
    });

    const installmentRows: InstallRow[] = installments.map((p) => {
      const info = catInfo(p.category);
      const paid = p.totalInstallments - p.remainingInstallments;
      return {
        id: p.id, name: p.name, category: info.name, color: info.color,
        perMonth: p.installmentAmount, currency: p.currency || defaultCurrency,
        paid, total: p.totalInstallments,
        leftAmount: p.remainingInstallments * p.installmentAmount,
        pct: p.totalInstallments > 0 ? (paid / p.totalInstallments) * 100 : 0,
        active: p.isActive,
      };
    });

    // ── Monthly totals (default currency) — active entries only ──
    const subsMonthly = recurring
      .filter((p) => p.isActive)
      .reduce((s, p) => s + toDefault(p.amount, p.currency || defaultCurrency) * MONTHLY_FACTOR[p.frequency], 0);
    const installMonthly = installments
      .filter((p) => p.isActive)
      .reduce((s, p) => s + toDefault(p.installmentAmount, p.currency || defaultCurrency), 0);

    const monthlyTotal = subsMonthly + installMonthly;
    const activeCount =
      recurring.filter((p) => p.isActive).length + installments.filter((p) => p.isActive).length;

    return {
      defaultCurrency,
      subscriptions,
      installments: installmentRows,
      subsMonthly,
      installMonthly,
      monthlyTotal,
      annualized: monthlyTotal * 12,
      activeCount,
      isEmpty: recurring.length === 0 && installments.length === 0,
    };
  }, [recurring, installments, expenseCats, incomeCats, defaultCurrency, exchangeRates]);
}
