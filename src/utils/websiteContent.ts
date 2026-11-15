import type {
  AppLocalizationExtras,
  PhotoShayariCard,
  PhotoShayariThemeId,
  ShayariLokConfig,
  SuvicharItem,
  WebsiteContentSettings,
  WebsiteSocialLinks,
  WebsiteVisibilityControls,
} from '../types/config';
import { normalizeConfig } from './configHelpers';
import {
  normalizeEnterpriseSettings,
  type EnterpriseSettings,
} from './enterpriseSettings';
import { normalizeAppExtras } from './localizationAndExtras';

const WEBSITE_CONTENT_KEY = 'shayari_lok_website_content_v1';
export const LIVE_SYNC_CHANNEL_NAME = 'shayari_lok_live_sync';

export const PHOTO_THEME_META: Record<
  PhotoShayariThemeId,
  { label: string; subtitle: string }
> = {
  sunset_love: {
    label: 'Golden Terrace',
    subtitle: 'Romantic sunset lakeframe',
  },
  morning_chai: {
    label: 'Morning Study',
    subtitle: 'Sunlit notebook & kulhad chai',
  },
  monsoon_rain: {
    label: 'Monsoon Window',
    subtitle: 'Twilight raindrops & bokeh',
  },
  journal_ink: {
    label: 'Classic Ink',
    subtitle: 'Editorial poetry desk',
  },
};

export const DEFAULT_WEBSITE_CONTROLS: WebsiteVisibilityControls = {
  showNotificationBell: true,
  showAnnouncementBanner: true,
  showSuvicharSection: true,
  showPhotoShayariSection: true,
  showMaintenanceNotice: true,
};

export const DEFAULT_WEBSITE_SOCIAL_LINKS: WebsiteSocialLinks = {
  whatsapp: 'https://whatsapp.com/channel/0029VaShayariLok',
  facebook: 'https://www.facebook.com/shayarilok.official',
  instagram: 'https://www.instagram.com/shayarilok_official',
  youtube: 'https://www.youtube.com/@shayarilok',
};

export const DEFAULT_SUVICHAR_LIST: SuvicharItem[] = [
  {
    id: 1,
    category: 'सफलता',
    author: 'चाणक्य नीति प्रेरणा',
    text: 'सफलता किसी बड़े अवसर का इंतज़ार नहीं करती, बल्कि हर छोटे दिन को ईमानदारी से निखारने से बनती है।',
  },
  {
    id: 2,
    category: 'सकारात्मकता',
    author: 'शायरी लोक डेस्क',
    text: 'जब सोच शांत और नीयत साफ़ होती है, तो सबसे कठिन रास्ते भी धीरे-धीरे आसान दिखाई देने लगते हैं।',
  },
  {
    id: 3,
    category: 'जीवन',
    author: 'कबीर वाणी भाव',
    text: 'समय का सही उपयोग और मीठे बोल—ये दोनों इंसान की सबसे बड़ी पूंजी हैं जो हर जगह सम्मान दिलाती हैं।',
  },
  {
    id: 4,
    category: 'आत्मविश्वास',
    author: 'सुविचार संग्रह',
    text: 'मुश्किलें केवल यह परखने आती हैं कि आप अपने सपनों को सच करने के लिए कितने समर्पित हैं।',
  },
];

export const DEFAULT_PHOTO_SHAYARI_LIST: PhotoShayariCard[] = [
  {
    id: 1,
    category: 'Love',
    author: 'आरज़ू',
    theme: 'sunset_love',
    text: 'शाम ढलते ही तेरी यादों के चिराग़ जल उठते हैं,\nखामोश समंदर में भी दिल के जज़्बात मचल उठते हैं।',
  },
  {
    id: 2,
    category: 'Motivation',
    author: 'सवेरा',
    theme: 'morning_chai',
    text: 'हर सुबह एक नया कोरा पन्ना लेकर आती है,\nसच्ची मेहनत उस पर सुनहरी कहानी लिख जाती है।',
  },
  {
    id: 3,
    category: 'Sad',
    author: 'अमन',
    theme: 'monsoon_rain',
    text: 'खिड़की पर गिरती बारिश की हर बूँद पूछती है,\nवो कौन था जो बरसों से दिल के शहर में बसता है।',
  },
  {
    id: 4,
    category: 'Attitude',
    author: 'शायरी लोक',
    theme: 'journal_ink',
    text: 'क़लम की स्याही से लिखते हैं हम अपना मुक़द्दर,\nतूफ़ानों से डर जाएँ, इतने कमज़ोर नहीं हमारे सफ़र।',
  },
];

export const DEFAULT_WEBSITE_CONTENT: WebsiteContentSettings = {
  heroHeadline: 'दिल की बात, फोटो शायरी और सुविचार के साथ।',
  heroSubheadline:
    'Shayari Lok का लाइव वेब पोर्टल — खूबसूरत फोटो शायरी कार्ड्स, आज के सुविचार, ताज़ा नोटिफिकेशन और एंड्रॉइड ऐप अपडेट एक ही जगह।',
  controls: { ...DEFAULT_WEBSITE_CONTROLS },
  socialLinks: { ...DEFAULT_WEBSITE_SOCIAL_LINKS },
  suvichar_list: DEFAULT_SUVICHAR_LIST,
  photo_shayari_list: DEFAULT_PHOTO_SHAYARI_LIST,
};

function isValidTheme(theme: unknown): theme is PhotoShayariThemeId {
  return (
    theme === 'sunset_love' ||
    theme === 'morning_chai' ||
    theme === 'monsoon_rain' ||
    theme === 'journal_ink'
  );
}

export function normalizeWebsiteContent(raw: unknown): WebsiteContentSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_WEBSITE_CONTENT,
      controls: { ...DEFAULT_WEBSITE_CONTROLS },
      socialLinks: { ...DEFAULT_WEBSITE_SOCIAL_LINKS },
      suvichar_list: [...DEFAULT_SUVICHAR_LIST],
      photo_shayari_list: [...DEFAULT_PHOTO_SHAYARI_LIST],
    };
  }

  const obj = raw as Record<string, unknown>;
  const rawControls =
    obj.controls && typeof obj.controls === 'object'
      ? (obj.controls as Record<string, unknown>)
      : obj.websiteControls && typeof obj.websiteControls === 'object'
        ? (obj.websiteControls as Record<string, unknown>)
        : {};

  const controls: WebsiteVisibilityControls = {
    showNotificationBell:
      typeof rawControls.showNotificationBell === 'boolean'
        ? rawControls.showNotificationBell
        : DEFAULT_WEBSITE_CONTROLS.showNotificationBell,
    showAnnouncementBanner:
      typeof rawControls.showAnnouncementBanner === 'boolean'
        ? rawControls.showAnnouncementBanner
        : DEFAULT_WEBSITE_CONTROLS.showAnnouncementBanner,
    showSuvicharSection:
      typeof rawControls.showSuvicharSection === 'boolean'
        ? rawControls.showSuvicharSection
        : DEFAULT_WEBSITE_CONTROLS.showSuvicharSection,
    showPhotoShayariSection:
      typeof rawControls.showPhotoShayariSection === 'boolean'
        ? rawControls.showPhotoShayariSection
        : DEFAULT_WEBSITE_CONTROLS.showPhotoShayariSection,
    showMaintenanceNotice:
      typeof rawControls.showMaintenanceNotice === 'boolean'
        ? rawControls.showMaintenanceNotice
        : DEFAULT_WEBSITE_CONTROLS.showMaintenanceNotice,
  };

  const suvichar_list: SuvicharItem[] = Array.isArray(obj.suvichar_list)
    ? obj.suvichar_list
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .slice(0, 100)
        .map((item, idx) => ({
          id: Number.isFinite(Number(item.id)) && Number(item.id) > 0 ? Math.trunc(Number(item.id)) : idx + 1,
          text: String(item.text ?? '').trim().slice(0, 1000),
          author: String(item.author ?? 'शायरी लोक').trim().slice(0, 80) || 'शायरी लोक',
          category: String(item.category ?? 'जीवन').trim().slice(0, 50) || 'जीवन',
        }))
        .filter((item) => item.text.length > 0)
    : [...DEFAULT_SUVICHAR_LIST];

  const photo_shayari_list: PhotoShayariCard[] = Array.isArray(obj.photo_shayari_list)
    ? obj.photo_shayari_list
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .slice(0, 60)
        .map((item, idx) => ({
          id: Number.isFinite(Number(item.id)) && Number(item.id) > 0 ? Math.trunc(Number(item.id)) : idx + 1,
          text: String(item.text ?? '').trim().slice(0, 1000),
          author: String(item.author ?? 'शायरी लोक').trim().slice(0, 80) || 'शायरी लोक',
          category: String(item.category ?? 'Love').trim().slice(0, 50) || 'Love',
          theme: isValidTheme(item.theme) ? item.theme : 'sunset_love',
        }))
        .filter((item) => item.text.length > 0)
    : [...DEFAULT_PHOTO_SHAYARI_LIST];

  const rawSocial =
    obj.socialLinks && typeof obj.socialLinks === 'object'
      ? (obj.socialLinks as Record<string, unknown>)
      : {};

  const socialLinks: WebsiteSocialLinks = {
    whatsapp:
      typeof rawSocial.whatsapp === 'string' && rawSocial.whatsapp.trim()
        ? rawSocial.whatsapp.trim().slice(0, 500)
        : DEFAULT_WEBSITE_SOCIAL_LINKS.whatsapp,
    facebook:
      typeof rawSocial.facebook === 'string' && rawSocial.facebook.trim()
        ? rawSocial.facebook.trim().slice(0, 500)
        : DEFAULT_WEBSITE_SOCIAL_LINKS.facebook,
    instagram:
      typeof rawSocial.instagram === 'string' && rawSocial.instagram.trim()
        ? rawSocial.instagram.trim().slice(0, 500)
        : DEFAULT_WEBSITE_SOCIAL_LINKS.instagram,
    youtube:
      typeof rawSocial.youtube === 'string' && rawSocial.youtube.trim()
        ? rawSocial.youtube.trim().slice(0, 500)
        : DEFAULT_WEBSITE_SOCIAL_LINKS.youtube,
  };

  return {
    heroHeadline:
      typeof obj.heroHeadline === 'string' && obj.heroHeadline.trim()
        ? obj.heroHeadline.trim().slice(0, 240)
        : DEFAULT_WEBSITE_CONTENT.heroHeadline,
    heroSubheadline:
      typeof obj.heroSubheadline === 'string' && obj.heroSubheadline.trim()
        ? obj.heroSubheadline.trim().slice(0, 500)
        : DEFAULT_WEBSITE_CONTENT.heroSubheadline,
    controls,
    socialLinks,
    suvichar_list,
    photo_shayari_list,
  };
}

export function loadWebsiteContent(): WebsiteContentSettings {
  try {
    const raw = localStorage.getItem(WEBSITE_CONTENT_KEY);
    if (!raw) return normalizeWebsiteContent(null);
    return normalizeWebsiteContent(JSON.parse(raw));
  } catch {
    return normalizeWebsiteContent(null);
  }
}

export function saveWebsiteContent(content: WebsiteContentSettings): void {
  try {
    localStorage.setItem(WEBSITE_CONTENT_KEY, JSON.stringify(content));
  } catch {
    // Ignore storage quota errors
  }
}

export interface LiveWebsiteSyncPayload {
  config: ShayariLokConfig;
  websiteContent: WebsiteContentSettings;
  organizationName: string;
  supportEmail: string;
  updatedAtMs: number;
}

export function broadcastLiveWebsiteState(
  config: ShayariLokConfig,
  websiteContent: WebsiteContentSettings,
  enterprise: EnterpriseSettings
): void {
  if (typeof window === 'undefined') return;
  const payload: LiveWebsiteSyncPayload = {
    config,
    websiteContent,
    organizationName: enterprise.organizationName || 'CyberKing Studios',
    supportEmail: enterprise.supportEmail || 'support@shayarilok.in',
    updatedAtMs: Date.now(),
  };

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(LIVE_SYNC_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    } catch {
      // BroadcastChannel unsupported or closed
    }
  }
}

export function subscribeLocalLiveWebsiteState(
  onUpdate: (payload: Partial<LiveWebsiteSyncPayload>) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(LIVE_SYNC_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<LiveWebsiteSyncPayload>) => {
        if (!event.data || typeof event.data !== 'object') return;
        onUpdate({
          config: event.data.config ? normalizeConfig(event.data.config) : undefined,
          websiteContent: event.data.websiteContent
            ? normalizeWebsiteContent(event.data.websiteContent)
            : undefined,
          organizationName: event.data.organizationName,
          supportEmail: event.data.supportEmail,
          updatedAtMs: event.data.updatedAtMs,
        });
      };
    } catch {
      channel = null;
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (!event.key || !event.newValue) return;
    try {
      if (event.key === WEBSITE_CONTENT_KEY) {
        onUpdate({
          websiteContent: normalizeWebsiteContent(JSON.parse(event.newValue)),
          updatedAtMs: Date.now(),
        });
      } else if (event.key === 'shayari_lok_local_draft') {
        onUpdate({
          config: normalizeConfig(JSON.parse(event.newValue)),
          updatedAtMs: Date.now(),
        });
      } else if (event.key === 'shayari_lok_enterprise_v1') {
        const ent = normalizeEnterpriseSettings(JSON.parse(event.newValue));
        onUpdate({
          organizationName: ent.organizationName,
          supportEmail: ent.supportEmail,
          updatedAtMs: Date.now(),
        });
      }
    } catch {
      // Ignore malformed storage JSON
    }
  };

  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('storage', onStorage);
    if (channel) {
      channel.close();
    }
  };
}

export function preparePublicSiteForFirestore(
  config: ShayariLokConfig,
  websiteContent: WebsiteContentSettings,
  organizationName: string,
  supportEmail: string,
  extras?: AppLocalizationExtras
) {
  const safeConfig = normalizeConfig(config);
  const safeWeb = normalizeWebsiteContent(websiteContent);
  const base = {
    organizationName:
      (organizationName || 'CyberKing Studios').trim().slice(0, 120) ||
      'CyberKing Studios',
    supportEmail: (supportEmail || 'support@shayarilok.in').trim().slice(0, 254),
    app_name: safeConfig.app_name.trim().slice(0, 80) || 'Shayari Lok',
    latest_version_code: Math.min(
      9999999,
      Math.max(1, Math.trunc(safeConfig.latest_version_code || 1))
    ),
    force_update_url: safeConfig.force_update_url.slice(0, 500),
    maintenance_mode: Boolean(safeConfig.maintenance_mode),
    maintenance_message: safeConfig.maintenance_message.slice(0, 1000),
    privacy_policy_url: safeConfig.privacy_policy_url.slice(0, 500),
    social_link: safeConfig.social_link.slice(0, 500),
    ads_enabled: Boolean(safeConfig.ads_enabled),
    announcement_title: safeConfig.announcement_title.slice(0, 200),
    announcement_message: safeConfig.announcement_message.slice(0, 1000),
    categories: safeConfig.categories.slice(0, 50),
    notifications: safeConfig.notifications.slice(0, 100).map((n) => ({
      id: Math.trunc(n.id),
      title: String(n.title ?? '').slice(0, 200),
      message: String(n.message ?? '').slice(0, 1000),
      badge: String(n.badge ?? 'App Info').slice(0, 60) || 'App Info',
      time_label: String(n.time_label ?? 'Today').slice(0, 60) || 'Today',
    })),
    shayari_list: safeConfig.shayari_list.slice(0, 500).map((s) => ({
      id: Math.trunc(s.id),
      category: String(s.category ?? 'Love').slice(0, 80) || 'Love',
      text: String(s.text ?? '').slice(0, 2000),
      author: String(s.author ?? 'अज्ञात').slice(0, 80) || 'अज्ञात',
      image_url: String(s.image_url ?? '').trim().slice(0, 500),
    })),
    heroHeadline: safeWeb.heroHeadline.slice(0, 240),
    heroSubheadline: safeWeb.heroSubheadline.slice(0, 500),
    websiteControls: {
      showNotificationBell: Boolean(safeWeb.controls.showNotificationBell),
      showAnnouncementBanner: Boolean(safeWeb.controls.showAnnouncementBanner),
      showSuvicharSection: Boolean(safeWeb.controls.showSuvicharSection),
      showPhotoShayariSection: Boolean(safeWeb.controls.showPhotoShayariSection),
      showMaintenanceNotice: Boolean(safeWeb.controls.showMaintenanceNotice),
    },
    suvichar_list: safeWeb.suvichar_list.slice(0, 100),
    photo_shayari_list: safeWeb.photo_shayari_list.slice(0, 60),
  };

  if (!extras) {
    return base;
  }

  const safeExtras = normalizeAppExtras(extras);
  return {
    ...base,
    default_language_code: safeExtras.default_language_code,
    default_country_code: safeExtras.default_country_code,
    supported_languages: safeExtras.supported_languages,
    supported_countries: safeExtras.supported_countries,
    dynamic_theme: {
      presetId: safeExtras.dynamic_theme.presetId,
      primaryColor: safeExtras.dynamic_theme.primaryColor,
      accentColor: safeExtras.dynamic_theme.accentColor,
      surfaceStyle: safeExtras.dynamic_theme.surfaceStyle,
      cardCornerRadius: safeExtras.dynamic_theme.cardCornerRadius,
      darkModeEnabled: safeExtras.dynamic_theme.darkModeEnabled,
      gradientEnabled: safeExtras.dynamic_theme.gradientEnabled,
      fontScale: safeExtras.dynamic_theme.fontScale,
    },
    scheduled_notifications: safeExtras.scheduled_notifications,
    engagement_tools: {
      dailyStreakEnabled: safeExtras.engagement_tools.dailyStreakEnabled,
      moodFilterEnabled: safeExtras.engagement_tools.moodFilterEnabled,
      oneTapWhatsAppShare: safeExtras.engagement_tools.oneTapWhatsAppShare,
      confettiOnFavorite: safeExtras.engagement_tools.confettiOnFavorite,
      dailyShayariGoal: safeExtras.engagement_tools.dailyShayariGoal,
      pollQuestion: safeExtras.engagement_tools.pollQuestion,
      pollOptionA: safeExtras.engagement_tools.pollOptionA,
      pollOptionB: safeExtras.engagement_tools.pollOptionB,
    },
  };
}
