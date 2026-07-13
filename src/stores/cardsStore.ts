import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card } from '../types/index';

export interface IncomeDestination {
  id: string;
  name: string;
}

const DEFAULT_DESTINATIONS: IncomeDestination[] = [
  { id: 'cash', name: 'Cash' },
];

interface CardsStore {
  cards: Card[];
  addCard: (card: Card) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  incomeDestinations: IncomeDestination[];
  addIncomeDestination: (dest: IncomeDestination) => void;
  deleteIncomeDestination: (id: string) => void;
}

export const useCardsStore = create<CardsStore>()(
  persist(
    (set) => ({
      cards: [],
      addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
      updateCard: (id, updates) =>
        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCard: (id) =>
        set((state) => ({ cards: state.cards.filter((c) => c.id !== id) })),
      incomeDestinations: DEFAULT_DESTINATIONS,
      addIncomeDestination: (dest) =>
        set((state) => ({ incomeDestinations: [...state.incomeDestinations, dest] })),
      deleteIncomeDestination: (id) =>
        set((state) => ({
          incomeDestinations: state.incomeDestinations.filter((d) => d.id !== id),
        })),
    }),
    { name: 'nw-cards' }
  )
);
