// ── Checksum ────────────────────────────────────────────────────────────────

export async function computeChecksum(obj: unknown): Promise<string> {
  const text = JSON.stringify(obj);
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Sync meta ────────────────────────────────────────────────────────────────

const SYNC_META_KEY = 'nw-sync-meta';

export interface StoreSyncMeta {
  checksum: string;
  pushedAt: string;  // ISO
  pulledAt: string;  // ISO
}

export type SyncMeta = Record<string, StoreSyncMeta>;

export function getSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : {};
  } catch {
    return {};
  }
}

export function setSyncMeta(meta: SyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

export function updateStoreMeta(storeKey: string, patch: Partial<StoreSyncMeta>): void {
  const meta = getSyncMeta();
  meta[storeKey] = { ...(meta[storeKey] ?? { checksum: '', pushedAt: '', pulledAt: '' }), ...patch };
  setSyncMeta(meta);
}

export function clearSyncMeta(): void {
  localStorage.removeItem(SYNC_META_KEY);
}

// ── Last-synced user tracking ─────────────────────────────────────────────────

const LAST_SYNC_USER_KEY = 'nw-sync-user-id';

export function getLastSyncUserId(): string | null {
  return localStorage.getItem(LAST_SYNC_USER_KEY);
}

export function setLastSyncUserId(userId: string): void {
  localStorage.setItem(LAST_SYNC_USER_KEY, userId);
}

// ── Merge helpers ─────────────────────────────────────────────────────────────

/** Dedup-union two arrays by a string id field. Remote records win on collision. */
export function mergeArraysById<T extends Record<string, unknown>>(
  local: T[],
  remote: T[],
  idField: keyof T = 'id',
): T[] {
  const map = new Map<unknown, T>();
  for (const item of local) map.set(item[idField], item);
  for (const item of remote) map.set(item[idField], item); // remote overwrites on conflict
  return Array.from(map.values());
}

// ── Store keys ────────────────────────────────────────────────────────────────

export const APPEND_STORE_KEYS = new Set([
  'nw-transactions',
  'nw-portfolio',
  'nw-networth',
]);

export const ALL_STORE_KEYS = [
  'nw-settings',
  'nw-transactions',
  'nw-portfolio',
  'nw-recurring',
  'nw-budgets',
  'nw-networth',
  'nw-cards',
  'nw-categories',
  'nw-allocation',
];
