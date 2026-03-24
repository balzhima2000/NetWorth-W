import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import {
  computeChecksum,
  getSyncMeta,
  updateStoreMeta,
  clearSyncMeta,
  getLastSyncUserId,
  setLastSyncUserId,
  ALL_STORE_KEYS,
} from '../utils/syncHelpers';
import { useTransactionStore } from '../stores/transactionStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useNetWorthStore } from '../stores/networthStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCardsStore } from '../stores/cardsStore';
import { useCategoriesStore } from '../stores/categoriesStore';
import { useAllocationStore } from '../stores/allocationStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useRecurringStore } from '../stores/recurringStore';
import type { User } from '../lib/supabase';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncManagerState {
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  forcePull: () => Promise<void>;
  forcePush: () => Promise<void>;
}

// ── Read store state from localStorage (Zustand persist format) ─────────────

function readStorePayload(storeKey: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

// ── Apply payload to each store's in-memory state ──────────────────────────

function applyPayloadToStore(storeKey: string, payload: Record<string, unknown>) {
  switch (storeKey) {
    case 'nw-transactions':
      useTransactionStore.setState({
        transactions: (payload.transactions as typeof useTransactionStore['prototype']['transactions']) ?? [],
        lastUsedPaymentMethod: (payload.lastUsedPaymentMethod as string) ?? 'cash',
      });
      break;
    case 'nw-portfolio':
      usePortfolioStore.setState({
        trades: (payload.trades as typeof usePortfolioStore['prototype']['trades']) ?? [],
        currentPrices: (payload.currentPrices as Record<string, number>) ?? {},
        lastPriceUpdates: (payload.lastPriceUpdates as Record<string, string>) ?? {},
        priceSources: (payload.priceSources as Record<string, 'excel' | 'live'>) ?? {},
      });
      break;
    case 'nw-networth':
      useNetWorthStore.setState({
        manualEntries: (payload.manualEntries as typeof useNetWorthStore['prototype']['manualEntries']) ?? [],
        snapshots: (payload.snapshots as typeof useNetWorthStore['prototype']['snapshots']) ?? [],
        lastSnapshotDate: (payload.lastSnapshotDate as string | null) ?? null,
      });
      break;
    case 'nw-settings':
      useSettingsStore.setState(payload as unknown as Parameters<typeof useSettingsStore.setState>[0]);
      break;
    case 'nw-cards':
      useCardsStore.setState({ cards: (payload.cards as typeof useCardsStore['prototype']['cards']) ?? [] });
      break;
    case 'nw-categories':
      useCategoriesStore.setState({
        categories: (payload.categories as typeof useCategoriesStore['prototype']['categories']) ?? [],
        incomeCategories: (payload.incomeCategories as typeof useCategoriesStore['prototype']['incomeCategories']) ?? [],
      });
      break;
    case 'nw-allocation':
      useAllocationStore.setState({
        mode: (payload.mode as 'none' | 'category' | 'individual') ?? 'none',
        targets: (payload.targets as Record<string, number>) ?? {},
      });
      break;
    case 'nw-budgets':
      useBudgetStore.setState({
        budgets: (payload.budgets as typeof useBudgetStore['prototype']['budgets']) ?? [],
        summaries: (payload.summaries as typeof useBudgetStore['prototype']['summaries']) ?? [],
      });
      break;
    case 'nw-recurring':
      useRecurringStore.setState({
        recurringPayments: (payload.recurringPayments as typeof useRecurringStore['prototype']['recurringPayments']) ?? [],
        installmentPlans: (payload.installmentPlans as typeof useRecurringStore['prototype']['installmentPlans']) ?? [],
      });
      break;
  }

  // Also persist to localStorage in Zustand's format so the store survives refresh
  try {
    const raw = localStorage.getItem(storeKey);
    const current = raw ? (JSON.parse(raw) as { version?: number }) : { version: 0 };
    localStorage.setItem(storeKey, JSON.stringify({ ...current, state: payload }));
  } catch {
    // ignore storage errors
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────

export function useSyncManager(): SyncManagerState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const userRef = useRef<User | null>(null);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isSyncing = useRef(false);

  // ── Push one store to Supabase ───────────────────────────────────────────
  const pushStore = useCallback(async (storeKey: string, userId: string) => {
    const payload = readStorePayload(storeKey);
    if (!payload) return;

    const checksum = await computeChecksum(payload);
    const meta = getSyncMeta()[storeKey];
    if (meta?.checksum === checksum) return; // nothing changed

    const { error } = await supabase.from('sync_stores').upsert({
      user_id: userId,
      store_key: storeKey,
      payload,
      checksum,
      updated_at: new Date().toISOString(),
    });

    if (!error) {
      updateStoreMeta(storeKey, { checksum, pushedAt: new Date().toISOString() });
    }
  }, []);

  // ── Push all stores ──────────────────────────────────────────────────────
  const pushAll = useCallback(async (userId: string) => {
    await Promise.allSettled(ALL_STORE_KEYS.map((key) => pushStore(key, userId)));
    setLastSyncedAt(new Date());
  }, [pushStore]);

  // ── Pull one store from Supabase ─────────────────────────────────────────
  const pullStore = useCallback(async (storeKey: string, userId: string) => {
    const { data, error } = await supabase
      .from('sync_stores')
      .select('payload, checksum, updated_at')
      .eq('user_id', userId)
      .eq('store_key', storeKey)
      .single();

    if (error || !data) return;

    const remotePayload = data.payload as Record<string, unknown>;
    const remoteChecksum = data.checksum as string;

    const meta = getSyncMeta()[storeKey];
    if (meta?.checksum === remoteChecksum) {
      // Already in sync
      updateStoreMeta(storeKey, { pulledAt: new Date().toISOString() });
      return;
    }

    applyPayloadToStore(storeKey, remotePayload);
    updateStoreMeta(storeKey, { checksum: remoteChecksum, pulledAt: new Date().toISOString() });
  }, []);

  // ── Pull all stores ──────────────────────────────────────────────────────
  const pullAll = useCallback(async (userId: string) => {
    await Promise.allSettled(ALL_STORE_KEYS.map((key) => pullStore(key, userId)));
    setLastSyncedAt(new Date());
  }, [pullStore]);

  // ── Force push (exposed) ─────────────────────────────────────────────────
  const forcePush = useCallback(async () => {
    if (!userRef.current) return;
    setSyncStatus('syncing');
    try {
      // Clear meta so checksum check is bypassed — every store gets re-pushed
      clearSyncMeta();
      await pushAll(userRef.current.id);
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    }
  }, [pushAll]);

  // ── Force pull (exposed) ─────────────────────────────────────────────────
  const forcePull = useCallback(async () => {
    if (!userRef.current) return;
    setSyncStatus('syncing');
    try {
      await pullAll(userRef.current.id);
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    }
  }, [pullAll]);

  // ── Full sync: pull first, then push anything still newer locally ────────
  const fullSync = useCallback(async (userId: string) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setSyncStatus('syncing');
    try {
      await pullAll(userId);
      await pushAll(userId);
      setSyncStatus('idle');
    } catch {
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      isSyncing.current = false;
    }
  }, [pullAll, pushAll]);

  // ── Debounced push on store change ────────────────────────────────────────
  const schedulePush = useCallback((storeKey: string) => {
    if (!userRef.current) return;
    const userId = userRef.current.id;

    const existing = debounceTimers.current.get(storeKey);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      debounceTimers.current.delete(storeKey);
      pushStore(storeKey, userId).catch(() => {});
    }, 2000);

    debounceTimers.current.set(storeKey, timer);
  }, [pushStore]);

  // ── Auth state + lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseConfigured) return;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    const storeUnsubs: Array<() => void> = [];

    const startSync = async (user: User) => {
      userRef.current = user;

      // If this is a different user than last time, clear stale sync meta
      // so all stores are treated as un-synced and get a fresh push/pull.
      if (getLastSyncUserId() !== user.id) {
        clearSyncMeta();
        setLastSyncUserId(user.id);
      }

      // Initial full sync
      await fullSync(user.id);

      // Subscribe to each store to push on change
      const stores = [
        { key: 'nw-transactions', store: useTransactionStore },
        { key: 'nw-portfolio', store: usePortfolioStore },
        { key: 'nw-networth', store: useNetWorthStore },
        { key: 'nw-settings', store: useSettingsStore },
        { key: 'nw-cards', store: useCardsStore },
        { key: 'nw-categories', store: useCategoriesStore },
        { key: 'nw-allocation', store: useAllocationStore },
        { key: 'nw-budgets', store: useBudgetStore },
        { key: 'nw-recurring', store: useRecurringStore },
      ];

      for (const { key, store } of stores) {
        const unsub = store.subscribe(() => schedulePush(key));
        storeUnsubs.push(unsub);
      }

      // Supabase Realtime: receive pushes from other devices
      realtimeChannel = supabase
        .channel(`sync:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sync_stores',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as { store_key: string; payload: Record<string, unknown>; checksum: string } | null;
            if (!row) return;
            const meta = getSyncMeta()[row.store_key];
            if (meta?.checksum === row.checksum) return; // already have this version
            applyPayloadToStore(row.store_key, row.payload);
            updateStoreMeta(row.store_key, { checksum: row.checksum, pulledAt: new Date().toISOString() });
            setLastSyncedAt(new Date());
          },
        )
        .subscribe();
    };

    const stopSync = () => {
      userRef.current = null;
      storeUnsubs.forEach((fn) => fn());
      storeUnsubs.length = 0;
      if (realtimeChannel) {
        void supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      debounceTimers.current.forEach(clearTimeout);
      debounceTimers.current.clear();
      setSyncStatus('idle');
    };

    // Get current session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) void startSync(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void startSync(session.user);
      } else {
        stopSync();
      }
    });

    // Pull on window focus (pick up changes from other device)
    const handleFocus = () => {
      if (userRef.current) void pullAll(userRef.current.id);
    };
    window.addEventListener('focus', handleFocus);

    // Retry when coming back online
    const handleOnline = () => {
      if (userRef.current) void fullSync(userRef.current.id);
    };
    window.addEventListener('online', handleOnline);

    return () => {
      stopSync();
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [fullSync, pullAll, schedulePush]);

  return { syncStatus, lastSyncedAt, forcePull, forcePush };
}
