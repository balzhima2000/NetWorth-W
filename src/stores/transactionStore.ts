import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction } from '../types/index';

interface TransactionStore {
  transactions: Transaction[];
  lastUsedPaymentMethod: string; // 'cash' or card id
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setLastUsedPaymentMethod: (method: string) => void;
  getTransactionsByMonth: (month: number, year: number) => Transaction[];
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      lastUsedPaymentMethod: 'cash',
      addTransaction: (tx) => set((state) => ({ transactions: [...state.transactions, tx] })),
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
      setLastUsedPaymentMethod: (method) => set({ lastUsedPaymentMethod: method }),
      getTransactionsByMonth: (month, year) => {
        return get().transactions.filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        });
      },
    }),
    { name: 'nw-transactions' }
  )
);
