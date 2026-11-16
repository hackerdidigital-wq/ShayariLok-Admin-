import type {
  AppBannerItem,
  AppControlStudioConfig,
  AppLocalizationExtras,
  FaqItem,
  PrivacyPolicySection,
  ShayariLokConfig,
} from '../types/config';
import {
  isScopeInitialized,
  loadTombstoneStore,
  markScopeInitialized,
  saveTombstoneStore,
} from './cacheTombstones';
import { normalizeAppExtras } from './localizationAndExtras';

const APP_CONTROL_STORAGE_PREFIX = 'shayarilok_app_control_v1_';

export const GOOGLE_TEST_ADMOB_CONFIG = {
  admob_app_id: 'ca-app-pub-3940256099942544~3347511713',
  banner_ad_id: 'ca-app-pub-3940256099942544/6300978111',
  interstitial_ad_id: 'ca-app-pub-3940256099942544/1033173712',
  native_ad_id: 'ca-app-pub-3940256099942544/2247696110',
} as const;

export const DEFAULT_FAQ_CATEGORIES = [
  'General',
  'Shayari & Content',
  'Account & Privacy',
  'App & Updates',
] as const;

export const DEFAULT_BANNERS: AppBannerItem[] = [
  {
    id: 'banner_whatsapp_channel',
    title: 'Join Official WhatsApp Shayari Channel',
    subtitle: 'रोज़ाना ताज़ा हिंदी शायरी और स्टेटस सीधे WhatsApp पर पाएँ।',
    imageUrl: '',
    actionUrl: 'https://whatsapp.com/channel/0029VaShayariLok',
    ctaLabel: 'Join Channel',
    active: true,
    order: 1,
  },
  {
    id: 'banner_photo_shayari',
    title: 'New Photo Shayari & Suvichar Collection',
    subtitle: 'प्रीमियम HD बैकग्राउंड कार्ड्स के साथ 1-टैप शेयर करें।',
    imageUrl: '',
    actionUrl: 'https://www.instagram.com/shayarilok_official',
    ctaLabel: 'Explore Cards',
    active: true,
    order: 2,
  },
];

export const DEFAULT_PRIVACY_SECTIONS: PrivacyPolicySection[] = [
  {
    id: 'sec_data_collection',
    heading: '1. Information We Collect',
    body: 'ShayariLok collects only basic profile details (display name, optional city, and Firebase user ID) required for social features, favorites sync, and community safety.',
  },
  {
    id: 'sec_admob_ads',
    heading: '2. Google AdMob & Analytics',
    body: 'We use Google AdMob to keep the app free. AdMob may use device advertising identifiers in compliance with Google Play Developer Policies.',
  },
  {
    id: 'sec_user_rights',
    heading: '3. Data Deletion & User Rights',
    body: 'Users may request account or data deletion at any time via the in-app support menu or our official privacy portal.',
  },
];

export const DEFAULT_PRIVACY_TEXT = [
  '# Shayari Lok Privacy Policy',
  '',
  'Effective Date: November 2026',
  '',
  'Thank you for using **Shayari Lok** (`com.cyberking.shayarilok`). Your privacy is important to us.',
  '',
  '## 1. Data & Permissions',
  '- We only store user profile metadata needed for bookmarks, community interactions, and moderation.',
  '- We never sell personal phone numbers, contacts, or private messages to third parties.',
  '',
  '## 2. Advertising (Google AdMob)',
  '- Banner, Interstitial, and Native ads are served via official Google Mobile Ads SDK.',
  '',
  '## 3. Contact & Support',
  '- Email: `support@shayarilok.in`',
].join('\n');

export const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'faq_copy_share',
    question: 'शायरी को WhatsApp या Instagram पर कैसे शेयर करें?',
    answer:
      'किसी भी शायरी कार्ड के नीचे दिए Copy या Share बटन पर टैप करें। आप फोटो कार्ड को सीधे इमेज के रूप में भी सेव और शेयर कर सकते हैं।',
    category: 'Shayari & Content',
    order: 1,
    active: true,
  },
  {
    id: 'faq_language_switch',
    question: 'ऐप की भाषा और देश (Hindi / English / Urdu) कैसे बदलें?',
    answer:
      'ऐप की Settings स्क्रीन में जाकर Language चुनें। भाषा चुनते ही पूरी ऐप स्क्रीन और लेआउट तुरंत अपडेट हो जाता है।',
    category: 'General',
    order: 2,
    active: true,
  },
  {
    id: 'faq_account_delete',
    question: 'क्या मैं अपना अकाउंट और चैट डेटा डिलीट कर सकता हूँ?',
    answer:
      'हाँ, Settings -> Privacy & Legal या support@shayarilok.in पर ईमेल करके आप अपने डेटा को स्थायी रूप से हटवा सकते हैं।',
    category: 'Account & Privacy',
    order: 3,
    active: true,
  },
];

export const DEFAULT_APP_CONTROL_CONFIG: AppControlStudioConfig = {
  banners: DEFAULT_BANNERS.map((b) => ({ ...b })),
  admob_app_id: GOOGLE_TEST_ADMOB_CONFIG.admob_app_id,
  native_ad_id: GOOGLE_TEST_ADMOB_CONFIG.native_ad_id,
  app_logo_url: '',
  privacy_policy_title: 'Shayari Lok Privacy Policy',
  privacy_policy_text: DEFAULT_PRIVACY_TEXT,
  privacy_policy_sections: DEFAULT_PRIVACY_SECTIONS.map((s) => ({ ...s })),
  privacy_last_updated: '2026-11-16',
  faqs: DEFAULT_FAQS.map((f) => ({ ...f })),
};

export function isValidExternalActionUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('whatsapp://') ||
    trimmed.startsWith('tg://') ||
    trimmed.startsWith('mailto:')
  ) {
    return trimmed.length <= 500;
  }
  return false;
}

export function validateAdMobId(
  value: string,
  kind: 'app' | 'unit'
): { valid: boolean; message: string } {
  const clean = value.trim();
  if (!clean) {
    return { valid: true, message: 'Optional / Not set' };
  }
  if (kind === 'app') {
    const ok = /^ca-app-pub-\d{16}~\d{10}$/.test(clean);
    return {
      valid: ok,
      message: ok
        ? 'Valid AdMob App ID (~ format)'
        : 'Format should be ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY',
    };
  }
  const ok = /^ca-app-pub-\d{16}\/\d{10}$/.test(clean);
  return {
    valid: ok,
    message: ok
      ? 'Valid AdMob Unit ID (/ format)'
      : 'Format should be ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  };
}

function sanitizeImageOrLogoUrl(raw: unknown, maxLen = 65000): string {
  const val = String(raw ?? '').trim();
  if (!val) return '';
  if (val.startsWith('data:image/')) {
    return val.slice(0, maxLen);
  }
  if (
    val.startsWith('https://') ||
    val.startsWith('http://') ||
    val.startsWith('/') ||
    val.startsWith('./')
  ) {
    return val.slice(0, 1000);
  }
  return '';
}

function sanitizeId(raw: unknown, fallback: string): string {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);
  return cleaned || fallback;
}

export function normalizeAppControlConfig(raw: unknown): AppControlStudioConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_APP_CONTROL_CONFIG,
      banners: DEFAULT_BANNERS.map((b) => ({ ...b })),
      privacy_policy_sections: DEFAULT_PRIVACY_SECTIONS.map((s) => ({ ...s })),
      faqs: DEFAULT_FAQS.map((f) => ({ ...f })),
    };
  }
  const obj = raw as Record<string, unknown>;

  const rawBanners = Array.isArray(obj.banners)
    ? obj.banners
    : DEFAULT_BANNERS;
  const seenBannerIds = new Set<string>();
  const banners: AppBannerItem[] = [];
  rawBanners.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') return;
    const rec = entry as Record<string, unknown>;
    const id = sanitizeId(rec.id, `banner_${idx + 1}`);
    if (seenBannerIds.has(id)) return;
    seenBannerIds.add(id);
    const title = String(rec.title ?? '').trim().slice(0, 120);
    if (!title) return;
    const orderNum = Number(rec.order);
    banners.push({
      id,
      title,
      subtitle: String(rec.subtitle ?? '').trim().slice(0, 240),
      imageUrl: sanitizeImageOrLogoUrl(rec.imageUrl),
      actionUrl: String(rec.actionUrl ?? '').trim().slice(0, 500),
      ctaLabel: String(rec.ctaLabel ?? 'Open Link').trim().slice(0, 40) || 'Open Link',
      active: typeof rec.active === 'boolean' ? rec.active : true,
      order:
        Number.isFinite(orderNum) && orderNum >= 1
          ? Math.trunc(orderNum)
          : banners.length + 1,
    });
  });

  const rawSections = Array.isArray(obj.privacy_policy_sections)
    ? obj.privacy_policy_sections
    : DEFAULT_PRIVACY_SECTIONS;
  const seenSecIds = new Set<string>();
  const privacy_policy_sections: PrivacyPolicySection[] = [];
  rawSections.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') return;
    const rec = entry as Record<string, unknown>;
    const id = sanitizeId(rec.id, `sec_${idx + 1}`);
    if (seenSecIds.has(id)) return;
    seenSecIds.add(id);
    const heading = String(rec.heading ?? '').trim().slice(0, 160);
    const body = String(rec.body ?? '').trim().slice(0, 4000);
    if (!heading && !body) return;
    privacy_policy_sections.push({
      id,
      heading: heading || `Section ${privacy_policy_sections.length + 1}`,
      body,
    });
  });

  const rawFaqs = Array.isArray(obj.faqs) ? obj.faqs : DEFAULT_FAQS;
  const seenFaqIds = new Set<string>();
  const faqs: FaqItem[] = [];
  rawFaqs.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') return;
    const rec = entry as Record<string, unknown>;
    const id = sanitizeId(rec.id, `faq_${idx + 1}`);
    if (seenFaqIds.has(id)) return;
    seenFaqIds.add(id);
    const question = String(rec.question ?? '').trim().slice(0, 300);
    const answer = String(rec.answer ?? '').trim().slice(0, 2000);
    if (!question || !answer) return;
    const orderNum = Number(rec.order);
    faqs.push({
      id,
      question,
      answer,
      category: String(rec.category ?? 'General').trim().slice(0, 60) || 'General',
      order:
        Number.isFinite(orderNum) && orderNum >= 1
          ? Math.trunc(orderNum)
          : faqs.length + 1,
      active: typeof rec.active === 'boolean' ? rec.active : true,
    });
  });

  return {
    banners: banners.slice(0, 30).sort((a, b) => a.order - b.order),
    admob_app_id: String(
      obj.admob_app_id ?? GOOGLE_TEST_ADMOB_CONFIG.admob_app_id
    )
      .trim()
      .slice(0, 120),
    native_ad_id: String(
      obj.native_ad_id ?? GOOGLE_TEST_ADMOB_CONFIG.native_ad_id
    )
      .trim()
      .slice(0, 120),
    app_logo_url: sanitizeImageOrLogoUrl(obj.app_logo_url),
    privacy_policy_title:
      String(obj.privacy_policy_title ?? 'Shayari Lok Privacy Policy')
        .trim()
        .slice(0, 160) || 'Shayari Lok Privacy Policy',
    privacy_policy_text:
      typeof obj.privacy_policy_text === 'string'
        ? obj.privacy_policy_text.slice(0, 16000)
        : DEFAULT_PRIVACY_TEXT,
    privacy_policy_sections: privacy_policy_sections.slice(0, 40),
    privacy_last_updated:
      String(obj.privacy_last_updated ?? '2026-11-16')
        .trim()
        .slice(0, 30) || '2026-11-16',
    faqs: faqs.slice(0, 100).sort((a, b) => a.order - b.order),
  };
}

export function loadAppControlConfig(appId: string): AppControlStudioConfig {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(`${APP_CONTROL_STORAGE_PREFIX}${appId}`)
        : null;
    if (!raw) {
      if (isScopeInitialized(`appControl:${appId}`)) {
        return normalizeAppControlConfig({
          banners: [],
          faqs: [],
        });
      }
      const tombstones = loadTombstoneStore();
      const delBanners = new Set(tombstones.deletedBannerIds);
      const delFaqs = new Set(tombstones.deletedFaqIds);
      return normalizeAppControlConfig({
        ...DEFAULT_APP_CONTROL_CONFIG,
        banners: DEFAULT_BANNERS.filter((b) => !delBanners.has(b.id)),
        faqs: DEFAULT_FAQS.filter((f) => !delFaqs.has(f.id)),
      });
    }
    return normalizeAppControlConfig(JSON.parse(raw));
  } catch {
    return isScopeInitialized(`appControl:${appId}`)
      ? normalizeAppControlConfig({ banners: [], faqs: [] })
      : normalizeAppControlConfig(null);
  }
}

export function saveAppControlConfig(
  appId: string,
  prev: AppControlStudioConfig | null,
  next: AppControlStudioConfig
): AppControlStudioConfig {
  const clean = normalizeAppControlConfig(next);
  if (prev) {
    const nextBannerIds = new Set(clean.banners.map((b) => b.id));
    const removedBanners = prev.banners
      .map((b) => b.id)
      .filter((id) => !nextBannerIds.has(id));
    const nextFaqIds = new Set(clean.faqs.map((f) => f.id));
    const removedFaqs = prev.faqs
      .map((f) => f.id)
      .filter((id) => !nextFaqIds.has(id));

    const store = loadTombstoneStore();
    store.initializedScopes[`appControl:${appId}`] = true;
    if (removedBanners.length > 0) {
      store.deletedBannerIds = Array.from(
        new Set([...store.deletedBannerIds, ...removedBanners])
      ).slice(-500);
    }
    if (removedFaqs.length > 0) {
      store.deletedFaqIds = Array.from(
        new Set([...store.deletedFaqIds, ...removedFaqs])
      ).slice(-500);
    }
    saveTombstoneStore(store);
  } else {
    markScopeInitialized(`appControl:${appId}`);
  }

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `${APP_CONTROL_STORAGE_PREFIX}${appId}`,
        JSON.stringify(clean)
      );
    }
  } catch {
    // Ignore storage quota errors
  }
  return clean;
}

export function upsertBanner(
  list: ReadonlyArray<AppBannerItem>,
  input: Omit<AppBannerItem, 'id' | 'order'> & { id?: string; order?: number }
): AppBannerItem[] {
  const title = input.title.trim().slice(0, 120);
  if (!title) return [...list];
  const existingIdx = input.id
    ? list.findIndex((b) => b.id === input.id)
    : -1;
  const maxOrder = list.reduce((acc, item) => Math.max(acc, item.order), 0);
  const entry: AppBannerItem = {
    id:
      input.id && input.id.trim()
        ? sanitizeId(input.id, `banner_${Date.now().toString(36)}`)
        : `banner_${Date.now().toString(36)}`,
    title,
    subtitle: input.subtitle.trim().slice(0, 240),
    imageUrl: sanitizeImageOrLogoUrl(input.imageUrl),
    actionUrl: input.actionUrl.trim().slice(0, 500),
    ctaLabel: input.ctaLabel.trim().slice(0, 40) || 'Open Link',
    active: Boolean(input.active),
    order:
      typeof input.order === 'number' && input.order >= 1
        ? Math.trunc(input.order)
        : existingIdx >= 0
          ? list[existingIdx].order
          : maxOrder + 1,
  };
  if (existingIdx >= 0) {
    return list.map((b, idx) => (idx === existingIdx ? entry : b));
  }
  return [...list, entry];
}

export function deleteBanner(
  list: ReadonlyArray<AppBannerItem>,
  id: string
): AppBannerItem[] {
  return list
    .filter((b) => b.id !== id)
    .map((b, idx) => ({ ...b, order: idx + 1 }));
}

export function toggleBannerActive(
  list: ReadonlyArray<AppBannerItem>,
  id: string
): AppBannerItem[] {
  return list.map((b) => (b.id === id ? { ...b, active: !b.active } : b));
}

export function moveBannerOrder(
  list: ReadonlyArray<AppBannerItem>,
  id: string,
  direction: 'up' | 'down'
): AppBannerItem[] {
  const sorted = [...list].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((b) => b.id === id);
  if (idx < 0) return sorted;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= sorted.length) return sorted;
  const swapped = [...sorted];
  const temp = swapped[idx];
  swapped[idx] = swapped[targetIdx];
  swapped[targetIdx] = temp;
  return swapped.map((item, i) => ({ ...item, order: i + 1 }));
}

export function upsertPrivacySection(
  list: ReadonlyArray<PrivacyPolicySection>,
  input: { id?: string; heading: string; body: string }
): PrivacyPolicySection[] {
  const heading = input.heading.trim().slice(0, 160);
  const body = input.body.trim().slice(0, 4000);
  if (!heading && !body) return [...list];
  const id = input.id?.trim()
    ? sanitizeId(input.id, `sec_${Date.now().toString(36)}`)
    : `sec_${Date.now().toString(36)}`;
  const idx = list.findIndex((s) => s.id === id);
  const next: PrivacyPolicySection = {
    id,
    heading: heading || `Section ${list.length + 1}`,
    body,
  };
  if (idx >= 0) {
    return list.map((s, i) => (i === idx ? next : s));
  }
  return [...list, next];
}

export function deletePrivacySection(
  list: ReadonlyArray<PrivacyPolicySection>,
  id: string
): PrivacyPolicySection[] {
  return list.filter((s) => s.id !== id);
}

export function upsertFaqItem(
  list: ReadonlyArray<FaqItem>,
  input: Omit<FaqItem, 'id' | 'order'> & { id?: string; order?: number }
): FaqItem[] {
  const question = input.question.trim().slice(0, 300);
  const answer = input.answer.trim().slice(0, 2000);
  if (!question || !answer) return [...list];
  const existingIdx = input.id
    ? list.findIndex((f) => f.id === input.id)
    : -1;
  const maxOrder = list.reduce((acc, item) => Math.max(acc, item.order), 0);
  const entry: FaqItem = {
    id:
      input.id && input.id.trim()
        ? sanitizeId(input.id, `faq_${Date.now().toString(36)}`)
        : `faq_${Date.now().toString(36)}`,
    question,
    answer,
    category: input.category.trim().slice(0, 60) || 'General',
    active: Boolean(input.active),
    order:
      typeof input.order === 'number' && input.order >= 1
        ? Math.trunc(input.order)
        : existingIdx >= 0
          ? list[existingIdx].order
          : maxOrder + 1,
  };
  if (existingIdx >= 0) {
    return list.map((f, idx) => (idx === existingIdx ? entry : f));
  }
  return [...list, entry];
}

export function deleteFaqItem(
  list: ReadonlyArray<FaqItem>,
  id: string
): FaqItem[] {
  return list
    .filter((f) => f.id !== id)
    .map((f, idx) => ({ ...f, order: idx + 1 }));
}

export function extractFaqCategories(list: ReadonlyArray<FaqItem>): string[] {
  const set = new Set<string>(DEFAULT_FAQ_CATEGORIES);
  for (const item of list) {
    if (item.category.trim()) set.add(item.category.trim());
  }
  return ['All', ...Array.from(set)];
}

export function filterFaqItems(
  list: ReadonlyArray<FaqItem>,
  category: string,
  searchQuery: string
): FaqItem[] {
  const q = searchQuery.trim().toLowerCase();
  return list.filter((item) => {
    if (category && category !== 'All' && item.category !== category) {
      return false;
    }
    if (!q) return true;
    return (
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });
}

export function prepareAppConfigMainForFirestore(
  uid: string,
  config: ShayariLokConfig,
  extras: AppLocalizationExtras,
  control: AppControlStudioConfig
) {
  const safeExtras = normalizeAppExtras(extras);
  const safeControl = normalizeAppControlConfig(control);

  return {
    ownerId: uid,
    app_name: config.app_name.trim().slice(0, 80) || 'Shayari Lok',
    app_logo_url: safeControl.app_logo_url,
    latest_version_code: Math.min(
      9999999,
      Math.max(1, Math.trunc(config.latest_version_code || 1))
    ),
    force_update_url: config.force_update_url.trim().slice(0, 500),
    maintenance_mode: Boolean(config.maintenance_mode),
    maintenance_message: config.maintenance_message.slice(0, 1000),
    ads_enabled: Boolean(config.ads_enabled),
    admob_app_id: safeControl.admob_app_id,
    banner_ad_id: config.banner_ad_id.trim().slice(0, 120),
    interstitial_ad_id: config.interstitial_ad_id.trim().slice(0, 120),
    native_ad_id: safeControl.native_ad_id,
    privacy_policy_url: config.privacy_policy_url.trim().slice(0, 500),
    privacy_policy_title: safeControl.privacy_policy_title,
    privacy_policy_text: safeControl.privacy_policy_text,
    privacy_policy_sections: safeControl.privacy_policy_sections,
    privacy_last_updated: safeControl.privacy_last_updated,
    social_link: config.social_link.trim().slice(0, 500),
    banners: safeControl.banners,
    faqs: safeControl.faqs,
    default_language_code: safeExtras.default_language_code,
    default_country_code: safeExtras.default_country_code,
    supported_languages: safeExtras.supported_languages,
    supported_countries: safeExtras.supported_countries,
    dynamic_theme: safeExtras.dynamic_theme,
    default_theme_mode: safeExtras.dynamic_theme.darkModeEnabled
      ? 'dark'
      : 'light',
  };
}
