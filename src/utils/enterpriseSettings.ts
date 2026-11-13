import type { ShayariItem, ShayariLokConfig } from '../types/config';
import {
  ensureAllFirstCategory,
  getNextId,
  normalizeConfig,
} from './configHelpers';

const STORAGE_KEY_ENTERPRISE = 'shayarilok_enterprise_settings_v1';
const STORAGE_KEY_SNAPSHOTS = 'shayarilok_snapshots_v1';
const STORAGE_KEY_AUDIT = 'shayarilok_audit_log_v1';

export type EnterpriseTabId =
  | 'identity'
  | 'guardrails'
  | 'snapshots'
  | 'backup'
  | 'bulk_import'
  | 'hygiene'
  | 'print_report'
  | 'pin_lock'
  | 'appearance'
  | 'security_vault';

export interface EnterpriseSettings {
  adminDisplayName: string;
  organizationName: string;
  supportEmail: string;
  environment: 'production' | 'staging';
  autoSaveDraft: boolean;
  requireCommitMessage: boolean;
  strictSchemaGate: boolean;
  confirmMaintenancePublish: boolean;
  confirmBeforePublish: boolean;
  density: 'comfortable' | 'compact';
  devanagariScale: 'standard' | 'large';
  pinHash: string;
  autoLockMinutes: number;
}

export interface ConfigSnapshot {
  id: string;
  label: string;
  createdAt: string;
  versionCode: number;
  shayariCount: number;
  config: ShayariLokConfig;
}

export interface ActivityAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
}

export interface HygieneReport {
  duplicateShayaris: Array<{ id: number; text: string }>;
  emptyShayarisCount: number;
  unmappedCategories: string[];
  invalidUrls: string[];
  invalidAdIds: string[];
  issueCount: number;
}

export interface GuardrailResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export const DEFAULT_ENTERPRISE_SETTINGS: EnterpriseSettings = {
  adminDisplayName: 'Admin',
  organizationName: 'CyberKing Studio',
  supportEmail: '',
  environment: 'production',
  autoSaveDraft: true,
  requireCommitMessage: false,
  strictSchemaGate: true,
  confirmMaintenancePublish: true,
  confirmBeforePublish: false,
  density: 'comfortable',
  devanagariScale: 'standard',
  pinHash: '',
  autoLockMinutes: 0,
};

export function normalizeEnterpriseSettings(raw: unknown): EnterpriseSettings {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const autoLockParsed = Number.parseInt(
    String(obj.autoLockMinutes ?? 0),
    10
  );
  const allowedLocks = [0, 5, 15, 30];
  const autoLockMinutes = allowedLocks.includes(autoLockParsed)
    ? autoLockParsed
    : 0;

  return {
    adminDisplayName:
      String(obj.adminDisplayName ?? 'Admin').trim().slice(0, 60) || 'Admin',
    organizationName:
      String(obj.organizationName ?? 'CyberKing Studio')
        .trim()
        .slice(0, 80) || 'CyberKing Studio',
    supportEmail: String(obj.supportEmail ?? '').trim().slice(0, 120),
    environment: obj.environment === 'staging' ? 'staging' : 'production',
    autoSaveDraft: obj.autoSaveDraft !== false,
    requireCommitMessage: Boolean(obj.requireCommitMessage),
    strictSchemaGate: obj.strictSchemaGate !== false,
    confirmMaintenancePublish: obj.confirmMaintenancePublish !== false,
    confirmBeforePublish: Boolean(obj.confirmBeforePublish),
    density: obj.density === 'compact' ? 'compact' : 'comfortable',
    devanagariScale: obj.devanagariScale === 'large' ? 'large' : 'standard',
    pinHash: String(obj.pinHash ?? '').slice(0, 128),
    autoLockMinutes,
  };
}

export function loadEnterpriseSettings(): EnterpriseSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_ENTERPRISE_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ENTERPRISE);
    if (!raw) return { ...DEFAULT_ENTERPRISE_SETTINGS };
    return normalizeEnterpriseSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_ENTERPRISE_SETTINGS };
  }
}

export function saveEnterpriseSettings(settings: EnterpriseSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY_ENTERPRISE,
      JSON.stringify(normalizeEnterpriseSettings(settings))
    );
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function loadSnapshots(): ConfigSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === 'object' && item.config)
      )
      .slice(0, 12)
      .map((item, idx) => {
        const cfg = normalizeConfig(item.config);
        return {
          id: String(item.id ?? `snap-${idx}`),
          label: String(item.label ?? 'Snapshot').slice(0, 80),
          createdAt: String(item.createdAt ?? ''),
          versionCode: cfg.latest_version_code,
          shayariCount: cfg.shayari_list.length,
          config: cfg,
        };
      });
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: ConfigSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY_SNAPSHOTS,
      JSON.stringify(snapshots.slice(0, 12))
    );
  } catch {
    // Ignore storage errors
  }
}

export function loadAuditLog(): ActivityAuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_AUDIT);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 40) as ActivityAuditEntry[];
  } catch {
    return [];
  }
}

export function saveAuditLog(entries: ActivityAuditEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY_AUDIT,
      JSON.stringify(entries.slice(0, 40))
    );
  } catch {
    // Ignore storage errors
  }
}

function normalizeShayariText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function auditConfigHygiene(config: ShayariLokConfig): HygieneReport {
  const seen = new Set<string>();
  const duplicateShayaris: Array<{ id: number; text: string }> = [];
  let emptyShayarisCount = 0;

  const knownCategories = new Set(config.categories);
  const unmappedSet = new Set<string>();

  for (const item of config.shayari_list) {
    const norm = normalizeShayariText(item.text);
    if (!norm) {
      emptyShayarisCount++;
    } else if (seen.has(norm)) {
      duplicateShayaris.push({ id: item.id, text: item.text });
    } else {
      seen.add(norm);
    }

    const cat = item.category.trim();
    if (cat && !knownCategories.has(cat)) {
      unmappedSet.add(cat);
    }
  }

  const invalidUrls: string[] = [];
  const urlFields: Array<[string, string]> = [
    ['force_update_url', config.force_update_url],
    ['privacy_policy_url', config.privacy_policy_url],
    ['social_link', config.social_link],
  ];
  for (const [name, val] of urlFields) {
    const trimmed = val.trim();
    if (trimmed && !/^https?:\/\/\S+$/i.test(trimmed)) {
      invalidUrls.push(name);
    }
  }

  const invalidAdIds: string[] = [];
  if (
    config.banner_ad_id.trim() &&
    !config.banner_ad_id.trim().startsWith('ca-app-pub-')
  ) {
    invalidAdIds.push('banner_ad_id');
  }
  if (
    config.interstitial_ad_id.trim() &&
    !config.interstitial_ad_id.trim().startsWith('ca-app-pub-')
  ) {
    invalidAdIds.push('interstitial_ad_id');
  }

  const unmappedCategories = Array.from(unmappedSet);
  const issueCount =
    duplicateShayaris.length +
    emptyShayarisCount +
    unmappedCategories.length +
    invalidUrls.length +
    invalidAdIds.length;

  return {
    duplicateShayaris,
    emptyShayarisCount,
    unmappedCategories,
    invalidUrls,
    invalidAdIds,
    issueCount,
  };
}

export function deduplicateShayaris(config: ShayariLokConfig): {
  config: ShayariLokConfig;
  removedCount: number;
} {
  const seen = new Set<string>();
  const kept: ShayariItem[] = [];
  let removedCount = 0;

  for (const item of config.shayari_list) {
    const norm = normalizeShayariText(item.text);
    if (!norm || seen.has(norm)) {
      removedCount++;
      continue;
    }
    seen.add(norm);
    kept.push(item);
  }

  return {
    config: {
      ...config,
      shayari_list: kept,
    },
    removedCount,
  };
}

export function syncMissingCategories(config: ShayariLokConfig): {
  config: ShayariLokConfig;
  addedCount: number;
} {
  const existingSet = new Set(config.categories);
  const missing: string[] = [];
  for (const item of config.shayari_list) {
    const cat = item.category.trim();
    if (cat && !existingSet.has(cat)) {
      existingSet.add(cat);
      missing.push(cat);
    }
  }
  return {
    config: {
      ...config,
      categories: ensureAllFirstCategory([...config.categories, ...missing]),
    },
    addedCount: missing.length,
  };
}

export function parseBulkShayaris(
  rawInput: string,
  defaultCategory: string,
  defaultAuthor: string,
  existing: ReadonlyArray<ShayariItem>
): { itemsToAdd: ShayariItem[]; skippedDuplicates: number } {
  const trimmed = rawInput.trim();
  if (!trimmed) return { itemsToAdd: [], skippedDuplicates: 0 };

  const existingNormalized = new Set(
    existing.map((s) => normalizeShayariText(s.text)).filter(Boolean)
  );
  const fallbackCategory =
    defaultCategory.trim() && defaultCategory !== 'All'
      ? defaultCategory.trim()
      : 'Love';
  const fallbackAuthor = defaultAuthor.trim() || 'अज्ञात';

  const candidates: Array<{ text: string; category: string; author: string }> =
    [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (typeof entry === 'string') {
            candidates.push({
              text: entry.trim(),
              category: fallbackCategory,
              author: fallbackAuthor,
            });
          } else if (entry && typeof entry === 'object') {
            const obj = entry as Record<string, unknown>;
            const text = String(obj.text ?? '').trim();
            if (text) {
              candidates.push({
                text,
                category:
                  String(obj.category ?? fallbackCategory).trim() ||
                  fallbackCategory,
                author:
                  String(obj.author ?? fallbackAuthor).trim() ||
                  fallbackAuthor,
              });
            }
          }
        }
      }
    } catch {
      // Fall back to plain-text splitting if JSON parse fails
    }
  }

  if (candidates.length === 0) {
    const separator = /\n\s*---+\s*\n/.test(trimmed)
      ? /\n\s*---+\s*\n/
      : /\n\s*\n/;
    const blocks = trimmed.split(separator);
    for (const block of blocks) {
      const text = block.trim();
      if (text) {
        candidates.push({
          text,
          category: fallbackCategory,
          author: fallbackAuthor,
        });
      }
    }
  }

  const itemsToAdd: ShayariItem[] = [];
  let nextId = getNextId(existing);
  let skippedDuplicates = 0;

  for (const cand of candidates) {
    const norm = normalizeShayariText(cand.text);
    if (!norm) continue;
    if (existingNormalized.has(norm)) {
      skippedDuplicates++;
      continue;
    }
    existingNormalized.add(norm);
    itemsToAdd.push({
      id: nextId++,
      category: cand.category,
      text: cand.text,
      author: cand.author,
    });
  }

  return { itemsToAdd, skippedDuplicates };
}

export function validatePublishGuardrails(
  config: ShayariLokConfig,
  enterprise: EnterpriseSettings,
  commitMessage: string
): GuardrailResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (enterprise.requireCommitMessage && !commitMessage.trim()) {
    errors.push(
      'Guardrail Active: पब्लिश करने से पहले GitHub Sync सेक्शन में Commit Message लिखना आवश्यक है।'
    );
  }

  if (enterprise.strictSchemaGate) {
    if (!config.app_name.trim()) {
      errors.push('Guardrail Active: app_name खाली नहीं हो सकता।');
    }
    const hygiene = auditConfigHygiene(config);
    if (hygiene.emptyShayarisCount > 0) {
      errors.push(
        `Guardrail Active: ${hygiene.emptyShayarisCount} खाली शायरी एंट्री मिली है, पब्लिश से पहले हटाएं।`
      );
    }
    if (hygiene.invalidUrls.length > 0) {
      errors.push(
        `Guardrail Active: अमान्य URL फ़ील्ड (${hygiene.invalidUrls.join(', ')}) — http:// या https:// से शुरू होना चाहिए।`
      );
    }
  }

  if (enterprise.confirmMaintenancePublish && config.maintenance_mode) {
    warnings.push(
      'Maintenance Mode चालू है! लाइव होने पर यूज़र ऐप लॉक स्क्रीन दिखाएगा।'
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function fallbackHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    'fb-' +
    (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
  );
}

export async function hashPinCode(pin: string): Promise<string> {
  const salted = `shayarilok-admin-pin:${pin.trim()}`;
  try {
    if (globalThis.crypto?.subtle) {
      const encoded = new TextEncoder().encode(salted);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return (
        'sha256-' +
        Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );
    }
  } catch {
    // Fallback if subtle crypto unavailable
  }
  return fallbackHash(salted);
}

export async function verifyPinCode(
  pin: string,
  expectedHash: string
): Promise<boolean> {
  if (!expectedHash) return true;
  const computed = await hashPinCode(pin);
  return computed === expectedHash;
}

export function estimateLocalStorageBytes(): number {
  if (typeof window === 'undefined') return 0;
  try {
    let total = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const val = window.localStorage.getItem(key) ?? '';
      total += (key.length + val.length) * 2;
    }
    return total;
  } catch {
    return 0;
  }
}
