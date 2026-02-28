import { useEffect } from 'react';
import { useRecurringStore } from '../stores/recurringStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { addWeeks, addMonths, addYears, isBefore, startOfDay } from 'date-fns';

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

  useEffect(() => {
    const today = startOfDay(new Date());

    // Process recurring payments
    recurringPayments.forEach((rp) => {
      if (!rp.isActive) return;
      if (rp.endDate && isBefore(new Date(rp.endDate), today)) return;

      let nextDue = startOfDay(new Date(rp.nextDueDate));

      while (isBefore(nextDue, today) || nextDue.getTime() === today.getTime()) {
        // Add the transaction
        addTransaction({
          id: crypto.randomUUID(),
          amount: rp.amount,
          category: rp.category,
          date: nextDue.toISOString().split('T')[0],
          notes: `${rp.name} (recurring)`,
          type: rp.type,
          paymentMethod: 'cash',
          cardId: null,
          currency: defaultCurrency,
          convertedAmount: rp.amount,
          isAutoAdded: true,
          installmentPlanId: null,
          installmentNumber: null,
          installmentTotal: null,
        });

        // Advance next due date
        if (rp.frequency === 'weekly') {
          nextDue = addWeeks(nextDue, 1);
        } else if (rp.frequency === 'monthly') {
          nextDue = addMonths(nextDue, 1);
        } else {
          nextDue = addYears(nextDue, 1);
        }
      }

      updateRecurringPayment(rp.id, { nextDueDate: nextDue.toISOString().split('T')[0] });
    });

    // Process installment plans
    installmentPlans.forEach((ip) => {
      if (!ip.isActive || ip.remainingInstallments <= 0) return;

      let nextPayment = startOfDay(new Date(ip.nextPaymentDate));
      let remaining = ip.remainingInstallments;
      let installmentNum = ip.totalInstallments - remaining + 1;

      while ((isBefore(nextPayment, today) || nextPayment.getTime() === today.getTime()) && remaining > 0) {
        addTransaction({
          id: crypto.randomUUID(),
          amount: ip.installmentAmount,
          category: ip.category,
          date: nextPayment.toISOString().split('T')[0],
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
        nextPaymentDate: nextPayment.toISOString().split('T')[0],
        isActive: remaining > 0,
      });
    });
  }, []); // Run once on mount
}
