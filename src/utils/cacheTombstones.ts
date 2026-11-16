import type {
  NotificationItem,
  PhotoShayariCard,
  ScheduledNotificationItem,
  ShayariItem,
  ShayariLokConfig,
  SuvicharItem,
  WebsiteContentSettings,
} from '../types/config';

const TOMBSTONES_STORAGE_KEY = 'shayarilok_deleted_tombstones_v1';

export interface TombstoneStore {
  initializedScopes: Record<string, boolean>;
  deletedShayariKeys: Record<string, string[]>;
  deletedNotificationKeys: Record<string, string[]>;
  deletedSuvicharKeys: string[];
  deletedPhotoShayariKeys: string[];
  deletedScheduledNotifIds: string[];
  deletedBannerIds: string[];
  deletedFaqIds: string[];
  deletedSocialUserIds: string[];
  deletedSocialEdgeIds: string[];
  deletedChatRoomIds: string[];
  deletedChatMessageIds: string[];
}

function createEmptyStore(): TombstoneStore {
  return {
    initializedScopes: {},
    deletedShayariKeys: {},
    deletedNotificationKeys: {},
    deletedSuvicharKeys: [],
    deletedPhotoShayariKeys: [],
    deletedScheduledNotifIds: [],
    deletedBannerIds: [],
    deletedFaqIds: [],
    deletedSocialUserIds: [],
    deletedSocialEdgeIds: [],
    deletedChatRoomIds: [],
    deletedChatMessageIds: [],
  };
}

function normalizeStringList(raw: unknown, max = 500): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const val = String(entry ?? '').trim();
    if (!val || seen.has(val)) continue;
    seen.add(val);
    out.push(val);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeScopedMap(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const cleanKey = key.trim();
    if (!cleanKey) continue;
    out[cleanKey] = normalizeStringList(val);
  }
  return out;
}

export function normalizeTombstoneStore(raw: unknown): TombstoneStore {
  if (!raw || typeof raw !== 'object') return createEmptyStore();
  const obj = raw as Record<string, unknown>;
  const initializedScopes: Record<string, boolean> = {};
  if (obj.initializedScopes && typeof obj.initializedScopes === 'object') {
    for (const [k, v] of Object.entries(
      obj.initializedScopes as Record<string, unknown>
    )) {
      if (v === true && k.trim()) {
        initializedScopes[k.trim()] = true;
      }
    }
  }
  return {
    initializedScopes,
    deletedShayariKeys: normalizeScopedMap(obj.deletedShayariKeys),
    deletedNotificationKeys: normalizeScopedMap(obj.deletedNotificationKeys),
    deletedSuvicharKeys: normalizeStringList(obj.deletedSuvicharKeys),
    deletedPhotoShayariKeys: normalizeStringList(obj.deletedPhotoShayariKeys),
    deletedScheduledNotifIds: normalizeStringList(obj.deletedScheduledNotifIds),
    deletedBannerIds: normalizeStringList(obj.deletedBannerIds),
    deletedFaqIds: normalizeStringList(obj.deletedFaqIds),
    deletedSocialUserIds: normalizeStringList(obj.deletedSocialUserIds),
    deletedSocialEdgeIds: normalizeStringList(obj.deletedSocialEdgeIds),
    deletedChatRoomIds: normalizeStringList(obj.deletedChatRoomIds),
    deletedChatMessageIds: normalizeStringList(obj.deletedChatMessageIds),
  };
}

export function loadTombstoneStore(): TombstoneStore {
  if (typeof window === 'undefined') return createEmptyStore();
  try {
    const raw = window.localStorage.getItem(TOMBSTONES_STORAGE_KEY);
    if (!raw) return createEmptyStore();
    return normalizeTombstoneStore(JSON.parse(raw));
  } catch {
    return createEmptyStore();
  }
}

export function saveTombstoneStore(store: TombstoneStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      TOMBSTONES_STORAGE_KEY,
      JSON.stringify(normalizeTombstoneStore(store))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function buildShayariTombstoneKey(item: Pick<ShayariItem, 'id' | 'text'>): string {
  const normText = item.text.replace(/\s+/g, ' ').trim().slice(0, 120);
  return `${Math.trunc(item.id)}::${normText}`;
}

export function buildNotificationTombstoneKey(
  item: Pick<NotificationItem, 'id' | 'title' | 'message'>
): string {
  const norm = `${item.title}::${item.message}`.replace(/\s+/g, ' ').trim().slice(0, 120);
  return `${Math.trunc(item.id)}::${norm}`;
}

export function buildSuvicharTombstoneKey(
  item: Pick<SuvicharItem, 'id' | 'text'>
): string {
  const norm = item.text.replace(/\s+/g, ' ').trim().slice(0, 120);
  return `${Math.trunc(item.id)}::${norm}`;
}

export function buildPhotoShayariTombstoneKey(
  item: Pick<PhotoShayariCard, 'id' | 'text'>
): string {
  const norm = item.text.replace(/\s+/g, ' ').trim().slice(0, 120);
  return `${Math.trunc(item.id)}::${norm}`;
}

export function isScopeInitialized(scopeKey: string): boolean {
  const store = loadTombstoneStore();
  return Boolean(store.initializedScopes[scopeKey]);
}

export function markScopeInitialized(scopeKey: string): void {
  if (!scopeKey.trim()) return;
  const store = loadTombstoneStore();
  if (store.initializedScopes[scopeKey]) return;
  store.initializedScopes[scopeKey] = true;
  saveTombstoneStore(store);
}

function mergeUnique(existing: string[], additions: string[]): string[] {
  const seen = new Set(existing);
  const out = [...existing];
  for (const val of additions) {
    if (val && !seen.has(val)) {
      seen.add(val);
      out.push(val);
    }
  }
  return out.slice(-500);
}

export function recordDeletedConfigItems(
  appId: string,
  prevConfig: ShayariLokConfig,
  nextConfig: ShayariLokConfig
): void {
  const nextShayariKeys = new Set(
    nextConfig.shayari_list.map(buildShayariTombstoneKey)
  );
  const deletedShayaris = prevConfig.shayari_list
    .map(buildShayariTombstoneKey)
    .filter((k) => !nextShayariKeys.has(k));

  const nextNotifKeys = new Set(
    nextConfig.notifications.map(buildNotificationTombstoneKey)
  );
  const deletedNotifs = prevConfig.notifications
    .map(buildNotificationTombstoneKey)
    .filter((k) => !nextNotifKeys.has(k));

  const store = loadTombstoneStore();
  store.initializedScopes[`config:${appId}`] = true;

  if (deletedShayaris.length > 0) {
    store.deletedShayariKeys[appId] = mergeUnique(
      store.deletedShayariKeys[appId] ?? [],
      deletedShayaris
    );
  }
  if (deletedNotifs.length > 0) {
    store.deletedNotificationKeys[appId] = mergeUnique(
      store.deletedNotificationKeys[appId] ?? [],
      deletedNotifs
    );
  }
  saveTombstoneStore(store);
}

export function unmarkReaddedConfigItems(
  appId: string,
  config: ShayariLokConfig
): void {
  const store = loadTombstoneStore();
  const activeShayaris = new Set(
    config.shayari_list.map(buildShayariTombstoneKey)
  );
  const activeNotifs = new Set(
    config.notifications.map(buildNotificationTombstoneKey)
  );
  let changed = false;

  if (store.deletedShayariKeys[appId]?.length) {
    const filtered = store.deletedShayariKeys[appId].filter(
      (k) => !activeShayaris.has(k)
    );
    if (filtered.length !== store.deletedShayariKeys[appId].length) {
      store.deletedShayariKeys[appId] = filtered;
      changed = true;
    }
  }
  if (store.deletedNotificationKeys[appId]?.length) {
    const filtered = store.deletedNotificationKeys[appId].filter(
      (k) => !activeNotifs.has(k)
    );
    if (filtered.length !== store.deletedNotificationKeys[appId].length) {
      store.deletedNotificationKeys[appId] = filtered;
      changed = true;
    }
  }
  if (changed) {
    saveTombstoneStore(store);
  }
}

export function filterTombstonedSeedConfig(
  appId: string,
  seedConfig: ShayariLokConfig
): ShayariLokConfig {
  const store = loadTombstoneStore();
  const deletedShayaris = new Set(store.deletedShayariKeys[appId] ?? []);
  const deletedNotifs = new Set(store.deletedNotificationKeys[appId] ?? []);
  return {
    ...seedConfig,
    shayari_list: seedConfig.shayari_list.filter(
      (item) => !deletedShayaris.has(buildShayariTombstoneKey(item))
    ),
    notifications: seedConfig.notifications.filter(
      (item) => !deletedNotifs.has(buildNotificationTombstoneKey(item))
    ),
  };
}

export function clearConfigTombstonesForApp(appId: string): void {
  const store = loadTombstoneStore();
  delete store.deletedShayariKeys[appId];
  delete store.deletedNotificationKeys[appId];
  store.initializedScopes[`config:${appId}`] = true;
  saveTombstoneStore(store);
}

export function recordDeletedWebsiteContentItems(
  prevContent: WebsiteContentSettings,
  nextContent: WebsiteContentSettings
): void {
  const nextSuvKeys = new Set(
    nextContent.suvichar_list.map(buildSuvicharTombstoneKey)
  );
  const deletedSuv = prevContent.suvichar_list
    .map(buildSuvicharTombstoneKey)
    .filter((k) => !nextSuvKeys.has(k));

  const nextPhotoKeys = new Set(
    nextContent.photo_shayari_list.map(buildPhotoShayariTombstoneKey)
  );
  const deletedPhotos = prevContent.photo_shayari_list
    .map(buildPhotoShayariTombstoneKey)
    .filter((k) => !nextPhotoKeys.has(k));

  const store = loadTombstoneStore();
  store.initializedScopes.websiteContent = true;
  if (deletedSuv.length > 0) {
    store.deletedSuvicharKeys = mergeUnique(store.deletedSuvicharKeys, deletedSuv);
  }
  if (deletedPhotos.length > 0) {
    store.deletedPhotoShayariKeys = mergeUnique(
      store.deletedPhotoShayariKeys,
      deletedPhotos
    );
  }
  saveTombstoneStore(store);
}

export function recordDeletedScheduledNotifications(
  prevList: ReadonlyArray<ScheduledNotificationItem>,
  nextList: ReadonlyArray<ScheduledNotificationItem>
): void {
  const nextIds = new Set(nextList.map((n) => n.id));
  const deletedIds = prevList.map((n) => n.id).filter((id) => !nextIds.has(id));
  if (deletedIds.length === 0) return;
  const store = loadTombstoneStore();
  store.deletedScheduledNotifIds = mergeUnique(
    store.deletedScheduledNotifIds,
    deletedIds
  );
  saveTombstoneStore(store);
}

export function recordDeletedSocialEntities(targets: {
  userIds?: string[];
  edgeIds?: string[];
  roomIds?: string[];
  messageIds?: string[];
}): void {
  const store = loadTombstoneStore();
  store.initializedScopes.sandboxSocial = true;
  if (targets.userIds?.length) {
    store.deletedSocialUserIds = mergeUnique(
      store.deletedSocialUserIds,
      targets.userIds
    );
  }
  if (targets.edgeIds?.length) {
    store.deletedSocialEdgeIds = mergeUnique(
      store.deletedSocialEdgeIds,
      targets.edgeIds
    );
  }
  if (targets.roomIds?.length) {
    store.deletedChatRoomIds = mergeUnique(
      store.deletedChatRoomIds,
      targets.roomIds
    );
  }
  if (targets.messageIds?.length) {
    store.deletedChatMessageIds = mergeUnique(
      store.deletedChatMessageIds,
      targets.messageIds
    );
  }
  saveTombstoneStore(store);
}

export function clearSocialTombstones(): void {
  const store = loadTombstoneStore();
  store.deletedSocialUserIds = [];
  store.deletedSocialEdgeIds = [];
  store.deletedChatRoomIds = [];
  store.deletedChatMessageIds = [];
  saveTombstoneStore(store);
}
