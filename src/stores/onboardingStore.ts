import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Tracks which dashboard "Finish setting up" cards the user has dismissed.
 * Whether a task is *done* is derived from real store state at render time;
 * this only persists explicit dismissals.
 */
interface OnboardingStore {
  dismissed: string[];
  dismiss: (id: string) => void;
  dismissMany: (ids: string[]) => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      dismissed: [],
      dismiss: (id) => set((s) => (s.dismissed.includes(id) ? s : { dismissed: [...s.dismissed, id] })),
      dismissMany: (ids) => set((s) => ({ dismissed: Array.from(new Set([...s.dismissed, ...ids])) })),
    }),
    { name: 'nw-onboarding' },
  ),
);
