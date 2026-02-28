import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ManualEntry, NetWorthSnapshot } from '../types/index';

const MAX_SNAPSHOTS = 730;

interface NetWorthStore {
  manualEntries: ManualEntry[];
  snapshots: NetWorthSnapshot[];
  lastSnapshotDate: string | null;
  addManualEntry: (entry: ManualEntry) => void;
  updateManualEntry: (id: string, updates: Partial<ManualEntry>) => void;
  deleteManualEntry: (id: string) => void;
  addSnapshot: (snapshot: NetWorthSnapshot) => void;
  getSnapshotsByRange: (days: number | null) => NetWorthSnapshot[];
}

export const useNetWorthStore = create<NetWorthStore>()(
  persist(
    (set, get) => ({
      manualEntries: [],
      snapshots: [],
      lastSnapshotDate: null,
      addManualEntry: (entry) =>
        set((state) => ({ manualEntries: [...state.manualEntries, entry] })),
      updateManualEntry: (id, updates) =>
        set((state) => ({
          manualEntries: state.manualEntries.map((e) =>
            e.id === id ? { ...e, ...updates, lastUpdated: new Date().toISOString() } : e
          ),
        })),
      deleteManualEntry: (id) =>
        set((state) => ({
          manualEntries: state.manualEntries.filter((e) => e.id !== id),
        })),
      addSnapshot: (snapshot) =>
        set((state) => {
          const newSnapshots = [...state.snapshots, snapshot];
          // Prune to MAX_SNAPSHOTS, keeping newest
          const pruned = newSnapshots.slice(-MAX_SNAPSHOTS);
          return {
            snapshots: pruned,
            lastSnapshotDate: snapshot.date,
          };
        }),
      getSnapshotsByRange: (days) => {
        const snapshots = get().snapshots;
        if (days === null) return snapshots;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return snapshots.filter((s) => new Date(s.date) >= cutoff);
      },
    }),
    { name: 'nw-networth' }
  )
);
