import { create } from 'zustand';

type QuickAddTarget = null | 'expense' | 'income' | 'trade' | 'import-excel';

interface QuickAddStore {
  target: QuickAddTarget;
  setTarget: (t: QuickAddTarget) => void;
}

export const useQuickAddStore = create<QuickAddStore>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
}));
