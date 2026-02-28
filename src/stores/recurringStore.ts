import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RecurringPayment, InstallmentPlan } from '../types/index';

interface RecurringStore {
  recurringPayments: RecurringPayment[];
  installmentPlans: InstallmentPlan[];
  addRecurringPayment: (payment: RecurringPayment) => void;
  updateRecurringPayment: (id: string, updates: Partial<RecurringPayment>) => void;
  deleteRecurringPayment: (id: string) => void;
  addInstallmentPlan: (plan: InstallmentPlan) => void;
  updateInstallmentPlan: (id: string, updates: Partial<InstallmentPlan>) => void;
  deleteInstallmentPlan: (id: string) => void;
}

export const useRecurringStore = create<RecurringStore>()(
  persist(
    (set) => ({
      recurringPayments: [],
      installmentPlans: [],
      addRecurringPayment: (payment) =>
        set((state) => ({ recurringPayments: [...state.recurringPayments, payment] })),
      updateRecurringPayment: (id, updates) =>
        set((state) => ({
          recurringPayments: state.recurringPayments.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deleteRecurringPayment: (id) =>
        set((state) => ({
          recurringPayments: state.recurringPayments.filter((p) => p.id !== id),
        })),
      addInstallmentPlan: (plan) =>
        set((state) => ({ installmentPlans: [...state.installmentPlans, plan] })),
      updateInstallmentPlan: (id, updates) =>
        set((state) => ({
          installmentPlans: state.installmentPlans.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deleteInstallmentPlan: (id) =>
        set((state) => ({
          installmentPlans: state.installmentPlans.filter((p) => p.id !== id),
        })),
    }),
    { name: 'nw-recurring' }
  )
);
