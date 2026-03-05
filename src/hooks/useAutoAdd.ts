import { useEffect } from 'react';
import { useRecurringStore } from '../stores/recurringStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { addWeeks, addMonths, addYears, isBefore, startOfDay } from 'date-fns';

/** Parse a YYYY-MM-DD string as a LOCAL date (avoids UTC-shift off-by-one) */
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date using LOCAL components (avoids UTC-shift off-by-one) */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Hook that runs auto-add logic for recurring payments and installments on app startup.
 * Call this once in App.tsx or Dashboard.
 */
export function useAutoAdd() {
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const installmentPlans = useRecurringStore((s) => s.installmentPlans);
  const updateRecurringPayment = useRecurringStore((s) => s.updateRecurringPayment);
  const updateInstallmentPlan = useRecurringStore((s) => s.updateInstallmentPlan);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);

  useEffect(() => {
    const today = startOfDay(new Date());

    // Process recurring payments
    recurringPayments.forEach((rp) => {
      if (!rp.isActive) return;
      if (rp.endDate && isBefore(parseLocalDate(rp.endDate), today)) return;

      let nextDue = startOfDay(parseLocalDate(rp.nextDueDate));

      const rpCurrency = rp.currency ?? defaultCurrency;
      const rpRate = exchangeRates.find((r) => r.currency === rpCurrency);
      const rpConverted = rpCurrency === defaultCurrency
        ? rp.amount
        : rpRate ? rp.amount * rpRate.rateToDefault : 0; // 0 = rate unknown; Refresh All in Settings will fix retroactively

      while (isBefore(nextDue, today) || nextDue.getTime() === today.getTime()) {
        // Add the transaction
        addTransaction({
          id: crypto.randomUUID(),
          amount: rp.amount,
          category: rp.category,
          date: localDateStr(nextDue),
          notes: `${rp.name} (recurring)`,
          type: rp.type,
          paymentMethod: 'cash',
          cardId: null,
          currency: rpCurrency,
          convertedAmount: rpConverted,
          isAutoAdded: true,
          installmentPlanId: null,
          installmentNumber: null,
          installmentTotal: null,
        });

        // Advance next due date — for monthly, snap back to dayOfMonth to prevent drift
        if (rp.frequency === 'weekly') {
          nextDue = addWeeks(nextDue, 1);
        } else if (rp.frequency === 'monthly') {
          if (rp.dayOfMonth) {
            nextDue = startOfDay(new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, rp.dayOfMonth));
          } else {
            nextDue = addMonths(nextDue, 1);
          }
        } else {
          nextDue = addYears(nextDue, 1);
        }
      }

      updateRecurringPayment(rp.id, { nextDueDate: localDateStr(nextDue) });
    });

    // Process installment plans
    installmentPlans.forEach((ip) => {
      if (!ip.isActive || ip.remainingInstallments <= 0) return;

      let nextPayment = startOfDay(parseLocalDate(ip.nextPaymentDate));
      let remaining = ip.remainingInstallments;
      let installmentNum = ip.totalInstallments - remaining + 1;

      while ((isBefore(nextPayment, today) || nextPayment.getTime() === today.getTime()) && remaining > 0) {
        addTransaction({
          id: crypto.randomUUID(),
          amount: ip.installmentAmount,
          category: ip.category,
          date: localDateStr(nextPayment),
          notes: `Payment ${installmentNum} of ${ip.totalInstallments} — ${ip.name}`,
          type: 'expense',
          paymentMethod: 'cash',
          cardId: null,
          currency: defaultCurrency,
          convertedAmount: ip.installmentAmount,
          isAutoAdded: true,
          installmentPlanId: ip.id,
          installmentNumber: installmentNum,
          installmentTotal: ip.totalInstallments,
        });

        remaining--;
        installmentNum++;
        nextPayment = addMonths(nextPayment, 1);
      }

      updateInstallmentPlan(ip.id, {
        remainingInstallments: remaining,
        nextPaymentDate: localDateStr(nextPayment),
        isActive: remaining > 0,
      });
    });
  }, []); // Run once on mount
}
