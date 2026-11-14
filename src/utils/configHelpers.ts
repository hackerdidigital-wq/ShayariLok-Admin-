import type {
  NotificationItem,
  ShayariItem,
  ShayariLokConfig,
} from '../types/config';

export const PACKAGE_ID = 'com.cyberking.shayarilok';

export const DEFAULT_CONFIG: ShayariLokConfig = {
  app_name: 'Shayari Lok',
  latest_version_code: 1,
  force_update_url: 'https://play.google.com/store/apps/details?id=com.cyberking.shayarilok',
  maintenance_mode: false,
  maintenance_message:
    'हम ऐप को और बेहतर बना रहे हैं। कृपया कुछ समय बाद पुनः प्रयास करें।',
  privacy_policy_url: 'https://shayarilok.in/privacy-policy',
  social_link: 'https://t.me/shayarilok_official',
  ads_enabled: true,
  banner_ad_id: 'ca-app-pub-3940256099942544/6300978111',
  interstitial_ad_id: 'ca-app-pub-3940256099942544/1033173712',
  announcement_title: 'नई हिंदी शायरी संग्रह लाइव है',
  announcement_message:
    'आज ही Love और Motivation कैटेगरी में नई चुनिंदा शायरियाँ पढ़ें और दोस्तों के साथ शेयर करें।',
  notifications: [
    {
      id: 1,
      title: 'आज की ख़ास शायरी',
      message: 'दिल को छू लेने वाली नई मोहब्बत शायरियाँ जोड़ दी गई हैं।',
      badge: 'Shayari Alert',
      time_label: 'Today',
    },
    {
      id: 2,
      title: 'Shayari Lok v1.0 Live',
      message: 'वन-टैप कॉपी और WhatsApp शेयर फ़ीचर के साथ नया अपडेट उपलब्ध है।',
      badge: 'App Info',
      time_label: 'Pinned',
    },
  ],
  categories: ['All', 'Love', 'Attitude', 'Motivation', 'Sad'],
  shayari_list: [
    {
      id: 1,
      category: 'Love',
      text: 'तेरी ख़ामोशी भी मुझसे कुछ कहती है,\nहर धड़कन में तेरी ही याद रहती है।',
      author: 'अज्ञात',
    },
    {
      id: 2,
      category: 'Attitude',
      text: 'हम वो नहीं जो वक़्त के साथ बदल जाएं,\nहम वो हैं जो वक़्त का रुख मोड़ कर दिखाएं।',
      author: 'CyberKing',
    },
    {
      id: 3,
      category: 'Motivation',
      text: 'मंज़िलें उन्हीं को मिलती हैं जिनके सपनों में जान होती है,\nपंखों से कुछ नहीं होता, हौसलों से उड़ान होती है।',
      author: 'रफ़्तार',
    },
    {
      id: 4,
      category: 'Sad',
      text: 'कुछ दर्द ऐसे भी होते हैं जो बयाँ नहीं होते,\nबस आँखों की नमी में चुपचाप बह जाते हैं।',
      author: 'राही',
    },
    {
      id: 5,
      category: 'Love',
      text: 'Kabhi lafzon mein na dhoondhna wafa meri,\nKhamoshiyon mein bhi sirf tera hi naam likha hai.',
      author: 'Aarav',
    },
  ],
};

export function ensureAllFirstCategory(categories: string[]): string[] {
  const seen = new Set<string>(['All']);
  const cleaned: string[] = ['All'];
  for (const raw of categories) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    cleaned.push(trimmed);
  }
  return cleaned;
}

export function getNextId(items: ReadonlyArray<{ id: number }>): number {
  if (items.length === 0) return 1;
  let maxId = 0;
  for (const item of items) {
    const numeric = Number.isFinite(item.id) ? Math.trunc(item.id) : 0;
    if (numeric > maxId) maxId = numeric;
  }
  return maxId + 1;
}

export function normalizeConfig(raw: unknown): ShayariLokConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const rawNotifications = Array.isArray(obj.notifications) ? obj.notifications : [];
  const notifications: NotificationItem[] = rawNotifications
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: Number.isInteger(Number(item.id)) && Number(item.id) > 0 ? Number(item.id) : idx + 1,
      title: String(item.title ?? '').trim(),
      message: String(item.message ?? '').trim(),
      badge: String(item.badge ?? 'App Info').trim() || 'App Info',
      time_label: String(item.time_label ?? 'Today').trim() || 'Today',
    }));

  const rawCategories = Array.isArray(obj.categories)
    ? obj.categories.map((c) => String(c ?? ''))
    : DEFAULT_CONFIG.categories;
  const categories = ensureAllFirstCategory(rawCategories);

  const rawShayaris = Array.isArray(obj.shayari_list) ? obj.shayari_list : [];
  const shayari_list: ShayariItem[] = rawShayaris
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: Number.isInteger(Number(item.id)) && Number(item.id) > 0 ? Number(item.id) : idx + 1,
      category: String(item.category ?? 'Love').trim() || 'Love',
      text: String(item.text ?? ''),
      author: String(item.author ?? 'अज्ञात').trim() || 'अज्ञात',
      image_url: String(item.image_url ?? '').trim(),
    }));

  const parsedVersion = Number.parseInt(String(obj.latest_version_code ?? 1), 10);

  return {
    app_name: String(obj.app_name ?? DEFAULT_CONFIG.app_name).trim() || DEFAULT_CONFIG.app_name,
    latest_version_code: Number.isFinite(parsedVersion) && parsedVersion >= 1 ? parsedVersion : 1,
    force_update_url: String(obj.force_update_url ?? ''),
    maintenance_mode: Boolean(obj.maintenance_mode),
    maintenance_message: String(obj.maintenance_message ?? ''),
    privacy_policy_url: String(obj.privacy_policy_url ?? ''),
    social_link: String(obj.social_link ?? ''),
    ads_enabled: Boolean(obj.ads_enabled),
    banner_ad_id: String(obj.banner_ad_id ?? ''),
    interstitial_ad_id: String(obj.interstitial_ad_id ?? ''),
    announcement_title: String(obj.announcement_title ?? ''),
    announcement_message: String(obj.announcement_message ?? ''),
    notifications,
    categories,
    shayari_list,
  };
}

/**
 * Serializes ONLY the exact 15 schema fields expected by the Android user app.
 */
export function serializeConfigJson(config: ShayariLokConfig): string {
  const ordered: ShayariLokConfig = {
    app_name: config.app_name,
    latest_version_code: Math.trunc(config.latest_version_code),
    force_update_url: config.force_update_url,
    maintenance_mode: config.maintenance_mode,
    maintenance_message: config.maintenance_message,
    privacy_policy_url: config.privacy_policy_url,
    social_link: config.social_link,
    ads_enabled: config.ads_enabled,
    banner_ad_id: config.banner_ad_id,
    interstitial_ad_id: config.interstitial_ad_id,
    announcement_title: config.announcement_title,
    announcement_message: config.announcement_message,
    notifications: config.notifications.map((n) => ({
      id: Math.trunc(n.id),
      title: n.title,
      message: n.message,
      badge: n.badge,
      time_label: n.time_label,
    })),
    categories: ensureAllFirstCategory(config.categories),
    shayari_list: config.shayari_list.map((s) => ({
      id: Math.trunc(s.id),
      category: s.category,
      text: s.text,
      author: s.author,
      image_url: String(s.image_url ?? '').trim(),
    })),
  };
  return JSON.stringify(ordered, null, 2);
}

export function hasUnsavedChanges(
  current: ShayariLokConfig,
  baseline: ShayariLokConfig
): boolean {
  return serializeConfigJson(current) !== serializeConfigJson(baseline);
}

export function filterShayaris(
  list: ReadonlyArray<ShayariItem>,
  category: string,
  query: string
): ShayariItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return list.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;
    return (
      item.text.toLowerCase().includes(normalizedQuery) ||
      item.author.toLowerCase().includes(normalizedQuery) ||
      item.category.toLowerCase().includes(normalizedQuery) ||
      String(item.id).includes(normalizedQuery)
    );
  });
}

/**
 * Ensures outgoing Firestore draft payloads satisfy firebase-blueprint.json bounds.
 */
export function prepareDraftForFirestore(config: ShayariLokConfig): ShayariLokConfig {
  const normalized = normalizeConfig(config);
  return {
    app_name: normalized.app_name.slice(0, 80) || 'Shayari Lok',
    latest_version_code: Math.min(9999999, Math.max(1, Math.trunc(normalized.latest_version_code))),
    force_update_url: normalized.force_update_url.slice(0, 500),
    maintenance_mode: normalized.maintenance_mode,
    maintenance_message: normalized.maintenance_message.slice(0, 1000),
    privacy_policy_url: normalized.privacy_policy_url.slice(0, 500),
    social_link: normalized.social_link.slice(0, 500),
    ads_enabled: normalized.ads_enabled,
    banner_ad_id: normalized.banner_ad_id.slice(0, 120),
    interstitial_ad_id: normalized.interstitial_ad_id.slice(0, 120),
    announcement_title: normalized.announcement_title.slice(0, 200),
    announcement_message: normalized.announcement_message.slice(0, 1000),
    categories: ensureAllFirstCategory(normalized.categories).slice(0, 50),
    notifications: normalized.notifications.slice(0, 100),
    shayari_list: normalized.shayari_list.slice(0, 500).map((s) => ({
      ...s,
      image_url: String(s.image_url ?? '').trim().slice(0, 500),
    })),
  };
}
