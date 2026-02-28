import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AllocationTarget } from '../types/index';

interface AllocationStore extends AllocationTarget {
  setAllocation: (allocation: AllocationTarget) => void;
  setMode: (mode: AllocationTarget['mode']) => void;
  setTargets: (targets: Record<string, number>) => void;
  clearAllocation: () => void;
}

export const useAllocationStore = create<AllocationStore>()(
  persist(
    (set) => ({
      mode: 'none',
      targets: {},
      setAllocation: (allocation) => set(allocation),
      setMode: (mode) => set({ mode }),
      setTargets: (targets) => set({ targets }),
      clearAllocation: () => set({ mode: 'none', targets: {} }),
    }),
    { name: 'nw-allocation' }
  )
);
