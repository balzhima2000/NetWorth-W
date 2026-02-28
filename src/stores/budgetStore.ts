import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MonthlyBudget, MonthlyBudgetSummary } from '../types/index';

interface BudgetStore {
  budgets: MonthlyBudget[];
  summaries: MonthlyBudgetSummary[];
  addBudget: (budget: MonthlyBudget) => void;
  updateBudget: (id: string, updates: Partial<MonthlyBudget>) => void;
  deleteBudget: (id: string) => void;
  upsertSummary: (summary: MonthlyBudgetSummary) => void;
  getBudgetsByMonth: (month: number, year: number) => MonthlyBudget[];
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      budgets: [],
      summaries: [],
      addBudget: (budget) => set((state) => ({ budgets: [...state.budgets, budget] })),
      updateBudget: (id, updates) =>
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      deleteBudget: (id) =>
        set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) })),
      upsertSummary: (summary) =>
        set((state) => {
          const existing = state.summaries.findIndex(
            (s) => s.month === summary.month && s.year === summary.year
          );
          if (existing >= 0) {
            const updated = [...state.summaries];
            updated[existing] = summary;
            return { summaries: updated };
          }
          return { summaries: [...state.summaries, summary] };
        }),
      getBudgetsByMonth: (month, year) =>
        get().budgets.filter((b) => b.month === month && b.year === year),
    }),
    { name: 'nw-budgets' }
  )
);
