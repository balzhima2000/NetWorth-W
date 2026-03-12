import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpendingCategory } from '../types/index';

const DEFAULT_EXPENSE_CATEGORIES: SpendingCategory[] = [
  { id: 'food', name: 'Food & Dining', emoji: '🍽️', color: '#f59e0b', isDefault: true },
  { id: 'transport', name: 'Transport', emoji: '🚗', color: '#3b82f6', isDefault: true },
  { id: 'housing', name: 'Housing', emoji: '🏠', color: '#8b5cf6', isDefault: true },
  { id: 'health', name: 'Health', emoji: '💊', color: '#ef4444', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: '#ec4899', isDefault: true },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#06b6d4', isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', emoji: '📱', color: '#10b981', isDefault: true },
  { id: 'education', name: 'Education', emoji: '📚', color: '#f97316', isDefault: true },
  { id: 'other', name: 'Other', emoji: '💰', color: '#6b7280', isDefault: true },
];

const DEFAULT_INCOME_CATEGORIES: SpendingCategory[] = [
  { id: 'salary', name: 'Salary', emoji: '💼', color: '#10B981', isDefault: true },
  { id: 'freelance', name: 'Freelance', emoji: '🧑‍💻', color: '#10B981', isDefault: true },
  { id: 'investment', name: 'Dividends & Investments', emoji: '📈', color: '#10B981', isDefault: true },
  { id: 'rental', name: 'Rental Income', emoji: '🏘️', color: '#10B981', isDefault: true },
  { id: 'bonus', name: 'Bonus', emoji: '🎯', color: '#10B981', isDefault: true },
  { id: 'gift', name: 'Gift', emoji: '🎁', color: '#10B981', isDefault: true },
  { id: 'business', name: 'Business Income', emoji: '🏢', color: '#10B981', isDefault: true },
  { id: 'other_income', name: 'Other', emoji: '💰', color: '#6b7280', isDefault: true },
];

interface CategoriesStore {
  categories: SpendingCategory[];
  incomeCategories: SpendingCategory[];
  addCategory: (category: SpendingCategory) => void;
  updateCategory: (id: string, updates: Partial<SpendingCategory>) => void;
  deleteCategory: (id: string) => void;
  addIncomeCategory: (category: SpendingCategory) => void;
  updateIncomeCategory: (id: string, updates: Partial<SpendingCategory>) => void;
  deleteIncomeCategory: (id: string) => void;
}

export const useCategoriesStore = create<CategoriesStore>()(
  persist(
    (set) => ({
      categories: DEFAULT_EXPENSE_CATEGORIES,
      incomeCategories: DEFAULT_INCOME_CATEGORIES,
      addCategory: (category) =>
        set((state) => ({ categories: [...state.categories, category] })),
      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),
      addIncomeCategory: (category) =>
        set((state) => ({ incomeCategories: [...state.incomeCategories, category] })),
      updateIncomeCategory: (id, updates) =>
        set((state) => ({
          incomeCategories: state.incomeCategories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteIncomeCategory: (id) =>
        set((state) => ({
          incomeCategories: state.incomeCategories.filter((c) => c.id !== id),
        })),
    }),
    {
      name: 'nw-categories',
      // Migrate old data: if incomeCategories is missing, initialize with defaults
      onRehydrateStorage: () => (state) => {
        if (state && !state.incomeCategories) {
          state.incomeCategories = DEFAULT_INCOME_CATEGORIES;
        }
        // Strip old 'type' field from expense categories if present
        if (state && state.categories) {
          state.categories = state.categories
            .filter((c: any) => !c.type || c.type === 'expense' || c.type === 'both')
            .map((c: any) => {
              const { type: _type, ...rest } = c;
              return rest as SpendingCategory;
            });
        }
      },
    }
  )
);
