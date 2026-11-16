import type { ShayariLokConfig } from '../types/config';
import {
  filterTombstonedSeedConfig,
  isScopeInitialized,
  markScopeInitialized,
} from './cacheTombstones';
import { DEFAULT_CONFIG, PACKAGE_ID, normalizeConfig } from './configHelpers';

const APPS_REGISTRY_KEY = 'shayarilok_multi_app_registry_v1';
const ACTIVE_APP_KEY = 'shayarilok_active_app_id_v1';
const LEGACY_DRAFT_KEY = 'shayari_lok_local_draft';
const CANONICAL_DRAFT_KEY = 'shayarilok_local_draft_v1';

export interface ManagedAppProfile {
  id: string;
  name: string;
  packageId: string;
  githubPath: string;
  accentColor: 'indigo' | 'emerald' | 'rose' | 'amber';
  createdAt: string;
}

export const DEFAULT_APP_PROFILE: ManagedAppProfile = {
  id: 'default',
  name: 'Shayari Lok',
  packageId: PACKAGE_ID,
  githubPath: 'config.json',
  accentColor: 'indigo',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export function sanitizeAppSlug(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
  return cleaned || `app_${Date.now().toString(36)}`;
}

export function normalizeAppProfile(raw: unknown): ManagedAppProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = String(obj.id ?? '').trim();
  const name = String(obj.name ?? '').trim();
  if (!id || !name) return null;
  const accentRaw = String(obj.accentColor ?? 'indigo');
  const accentColor =
    accentRaw === 'emerald' || accentRaw === 'rose' || accentRaw === 'amber'
      ? accentRaw
      : 'indigo';
  return {
    id: id === 'default' ? 'default' : sanitizeAppSlug(id),
    name: name.slice(0, 60),
    packageId:
      String(obj.packageId ?? PACKAGE_ID).trim().slice(0, 120) || PACKAGE_ID,
    githubPath:
      String(obj.githubPath ?? 'config.json').trim().slice(0, 256) || 'config.json',
    accentColor,
    createdAt: String(obj.createdAt ?? new Date().toISOString()),
  };
}

export function loadManagedApps(): ManagedAppProfile[] {
  if (typeof window === 'undefined') return [DEFAULT_APP_PROFILE];
  try {
    const raw = window.localStorage.getItem(APPS_REGISTRY_KEY);
    if (!raw) return [DEFAULT_APP_PROFILE];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [DEFAULT_APP_PROFILE];
    const valid = parsed
      .map(normalizeAppProfile)
      .filter((item): item is ManagedAppProfile => item !== null);
    const hasDefault = valid.some((a) => a.id === 'default');
    return hasDefault ? valid : [DEFAULT_APP_PROFILE, ...valid];
  } catch {
    return [DEFAULT_APP_PROFILE];
  }
}

export function saveManagedApps(apps: ManagedAppProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    const ensured = apps.some((a) => a.id === 'default')
      ? apps
      : [DEFAULT_APP_PROFILE, ...apps];
    window.localStorage.setItem(APPS_REGISTRY_KEY, JSON.stringify(ensured.slice(0, 20)));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadActiveAppId(apps: ReadonlyArray<ManagedAppProfile>): string {
  if (typeof window === 'undefined') return 'default';
  try {
    const saved = window.localStorage.getItem(ACTIVE_APP_KEY);
    if (saved && apps.some((a) => a.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore
  }
  return 'default';
}

export function saveActiveAppId(appId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_APP_KEY, appId);
  } catch {
    // Ignore
  }
}

export function createManagedAppProfile(
  input: {
    name: string;
    packageId: string;
    githubPath?: string;
    accentColor?: ManagedAppProfile['accentColor'];
  },
  existing: ReadonlyArray<ManagedAppProfile>
): ManagedAppProfile {
  const cleanName = input.name.trim().slice(0, 60) || 'New App';
  let slug = sanitizeAppSlug(cleanName);
  if (slug === 'default' || existing.some((a) => a.id === slug)) {
    slug = `${slug}_${Date.now().toString(36).slice(-4)}`;
  }
  const cleanPackage =
    input.packageId.trim().slice(0, 120) || `com.cyberking.${slug}`;
  const cleanPath =
    input.githubPath?.trim().slice(0, 256) || `apps/${slug}/config.json`;

  return {
    id: slug,
    name: cleanName,
    packageId: cleanPackage,
    githubPath: cleanPath,
    accentColor: input.accentColor ?? 'emerald',
    createdAt: new Date().toISOString(),
  };
}

export function getAppDraftStorageKey(appId: string): string {
  return appId === 'default'
    ? LEGACY_DRAFT_KEY
    : `shayarilok_app_draft_${appId}_v1`;
}

export function hasAppDraftStored(appId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(getAppDraftStorageKey(appId))) return true;
    if (
      appId === 'default' &&
      window.localStorage.getItem(CANONICAL_DRAFT_KEY)
    ) {
      return true;
    }
    return isScopeInitialized(`config:${appId}`);
  } catch {
    return false;
  }
}

export function loadAppDraft(
  app: ManagedAppProfile
): ShayariLokConfig {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_CONFIG, app_name: app.name };
  }
  try {
    const raw =
      window.localStorage.getItem(getAppDraftStorageKey(app.id)) ??
      (app.id === 'default'
        ? window.localStorage.getItem(CANONICAL_DRAFT_KEY)
        : null);
    if (!raw) {
      if (isScopeInitialized(`config:${app.id}`)) {
        return {
          ...DEFAULT_CONFIG,
          app_name: app.name,
          force_update_url: `https://play.google.com/store/apps/details?id=${app.packageId}`,
          shayari_list: [],
          notifications: [],
        };
      }
      if (app.id === 'default') {
        return filterTombstonedSeedConfig('default', { ...DEFAULT_CONFIG });
      }
      return {
        ...DEFAULT_CONFIG,
        app_name: app.name,
        force_update_url: `https://play.google.com/store/apps/details?id=${app.packageId}`,
        shayari_list: [],
        notifications: [],
      };
    }
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CONFIG, app_name: app.name };
  }
}

export function saveAppDraft(appId: string, config: ShayariLokConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(config);
    window.localStorage.setItem(getAppDraftStorageKey(appId), serialized);
    if (appId === 'default') {
      window.localStorage.setItem(CANONICAL_DRAFT_KEY, serialized);
    }
    markScopeInitialized(`config:${appId}`);
  } catch {
    // Ignore
  }
}

export function resolveFirestoreSiteId(uid: string, appId: string): string {
  const cleanUid = uid.trim();
  const cleanAppId = appId.trim();
  if (!cleanUid) return '';
  if (!cleanAppId || cleanAppId === 'default') return cleanUid;
  const safeApp = cleanAppId.replace(/[^a-zA-Z0-9-]/g, '-');
  return `${cleanUid}_${safeApp}`;
}
