import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card } from '../types/index';

interface CardsStore {
  cards: Card[];
  addCard: (card: Card) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
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
    }),
    { name: 'nw-cards' }
  )
);
