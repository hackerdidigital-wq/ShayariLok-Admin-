import type {
  AppLocalizationExtras,
  CountryItem,
  DynamicThemeConfig,
  EngagementToolsConfig,
  LanguageItem,
  LanguageUiLabels,
  ScheduledNotificationItem,
  ShayariLokConfig,
  ThemePresetId,
} from '../types/config';
import { normalizeConfig } from './configHelpers';

const EXTRAS_STORAGE_PREFIX = 'shayari_lok_extras_v1_';

export const WORLD_LANGUAGE_PRESETS: ReadonlyArray<LanguageItem> = [
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    rtl: false,
    enabled: true,
    uiLabels: {
      appTitle: 'शायरी लोक',
      homeTab: 'होम',
      categoriesTab: 'श्रेणियाँ',
      favoritesTab: 'पसंदीदा',
      settingsTab: 'सेटिंग्स',
      languageLabel: 'भाषा चुनें',
      shareButton: 'शेयर करें',
      copyButton: 'कॉपी करें',
    },
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
    enabled: true,
    uiLabels: {
      appTitle: 'Shayari Lok',
      homeTab: 'Home',
      categoriesTab: 'Categories',
      favoritesTab: 'Favorites',
      settingsTab: 'Settings',
      languageLabel: 'Select Language',
      shareButton: 'Share',
      copyButton: 'Copy',
    },
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    rtl: false,
    enabled: false,
    uiLabels: {
      appTitle: 'Shayari Lok',
      homeTab: 'Inicio',
      categoriesTab: 'Categorías',
      favoritesTab: 'Favoritos',
      settingsTab: 'Ajustes',
      languageLabel: 'Elegir idioma',
      shareButton: 'Compartir',
      copyButton: 'Copiar',
    },
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    rtl: true,
    enabled: false,
    uiLabels: {
      appTitle: 'شاعری لوک',
      homeTab: 'ہوم',
      categoriesTab: 'زمرے',
      favoritesTab: 'پسندیدہ',
      settingsTab: 'ترتیبات',
      languageLabel: 'زبان منتخب کریں',
      shareButton: 'شیئر کریں',
      copyButton: 'کاپی کریں',
    },
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    rtl: false,
    enabled: false,
    uiLabels: {
      appTitle: 'Shayari Lok',
      homeTab: 'Accueil',
      categoriesTab: 'Catégories',
      favoritesTab: 'Favoris',
      settingsTab: 'Paramètres',
      languageLabel: 'Choisir la langue',
      shareButton: 'Partager',
      copyButton: 'Copier',
    },
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇦🇪',
    rtl: true,
    enabled: false,
    uiLabels: {
      appTitle: 'شاعري لوك',
      homeTab: 'الرئيسية',
      categoriesTab: 'التصنيفات',
      favoritesTab: 'المفضلة',
      settingsTab: 'الإعدادات',
      languageLabel: 'اختر اللغة',
      shareButton: 'مشاركة',
      copyButton: 'نسخ',
    },
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇧🇩',
    rtl: false,
    enabled: false,
    uiLabels: {
      appTitle: 'শায়েরি লোক',
      homeTab: 'হোম',
      categoriesTab: 'বিভাগ',
      favoritesTab: 'পছন্দ',
      settingsTab: 'সেটিংস',
      languageLabel: 'ভাষা নির্বাচন করুন',
      shareButton: 'শেয়ার',
      copyButton: 'কপি',
    },
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    rtl: false,
    enabled: false,
    uiLabels: {
      appTitle: 'शायरी लोक',
      homeTab: 'मुख्यपृष्ठ',
      categoriesTab: 'वर्ग',
      favoritesTab: 'आवडते',
      settingsTab: 'सेटिंग्ज',
      languageLabel: 'भाषा निवडा',
      shareButton: 'शेअर करा',
      copyButton: 'कॉपी करा',
    },
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    rtl: false,
    enabled: false,
    uiLabels: {
      appTitle: 'ਸ਼ਾਇਰੀ ਲੋਕ',
      homeTab: 'ਹੋਮ',
      categoriesTab: 'ਸ਼੍ਰੇਣੀਆਂ',
      favoritesTab: 'ਮਨਪਸੰਦ',
      settingsTab: 'ਸੈਟਿੰਗਜ਼',
      languageLabel: 'ਭਾਸ਼ਾ ਚੁਣੋ',
      shareButton: 'ਸ਼ੇਅਰ ਕਰੋ',
      copyButton: 'ਕਾਪੀ ਕਰੋ',
    },
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    rtl: false,
    enabled: false,
    uiLabels: {
      appTitle: 'Shayari Lok',
      homeTab: 'Início',
      categoriesTab: 'Categorias',
      favoritesTab: 'Favoritos',
      settingsTab: 'Configurações',
      languageLabel: 'Selecionar idioma',
      shareButton: 'Compartilhar',
      copyButton: 'Copiar',
    },
  },
];

export const WORLD_COUNTRY_PRESETS: ReadonlyArray<CountryItem> = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    dialCode: '+91',
    currency: 'INR',
    defaultLanguageCode: 'hi',
    enabled: true,
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    dialCode: '+1',
    currency: 'USD',
    defaultLanguageCode: 'en',
    enabled: true,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    dialCode: '+971',
    currency: 'AED',
    defaultLanguageCode: 'ar',
    enabled: false,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    dialCode: '+44',
    currency: 'GBP',
    defaultLanguageCode: 'en',
    enabled: false,
  },
  {
    code: 'ES',
    name: 'Spain',
    flag: '🇪🇸',
    dialCode: '+34',
    currency: 'EUR',
    defaultLanguageCode: 'es',
    enabled: false,
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    dialCode: '+33',
    currency: 'EUR',
    defaultLanguageCode: 'fr',
    enabled: false,
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    dialCode: '+966',
    currency: 'SAR',
    defaultLanguageCode: 'ar',
    enabled: false,
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    dialCode: '+1',
    currency: 'CAD',
    defaultLanguageCode: 'en',
    enabled: false,
  },
  {
    code: 'PK',
    name: 'Pakistan',
    flag: '🇵🇰',
    dialCode: '+92',
    currency: 'PKR',
    defaultLanguageCode: 'ur',
    enabled: false,
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    flag: '🇧🇩',
    dialCode: '+880',
    currency: 'BDT',
    defaultLanguageCode: 'bn',
    enabled: false,
  },
];

export const THEME_PRESETS: Record<
  ThemePresetId,
  {
    label: string;
    subtitle: string;
    config: DynamicThemeConfig;
  }
> = {
  indigo_editorial: {
    label: 'Indigo Editorial',
    subtitle: 'Crisp studio indigo + rose accents',
    config: {
      presetId: 'indigo_editorial',
      primaryColor: '#4f46e5',
      accentColor: '#e11d48',
      surfaceStyle: 'clean_card',
      cardCornerRadius: 16,
      darkModeEnabled: false,
      gradientEnabled: true,
      fontScale: 'normal',
    },
  },
  royal_midnight: {
    label: 'Royal Midnight',
    subtitle: 'Deep night reading canvas with amber glow',
    config: {
      presetId: 'royal_midnight',
      primaryColor: '#6366f1',
      accentColor: '#f59e0b',
      surfaceStyle: 'dark_ink',
      cardCornerRadius: 20,
      darkModeEnabled: true,
      gradientEnabled: true,
      fontScale: 'large',
    },
  },
  emerald_sufi: {
    label: 'Emerald Sufi',
    subtitle: 'Calm sage emerald & teal serenity',
    config: {
      presetId: 'emerald_sufi',
      primaryColor: '#059669',
      accentColor: '#0d9488',
      surfaceStyle: 'minimal_outline',
      cardCornerRadius: 18,
      darkModeEnabled: false,
      gradientEnabled: false,
      fontScale: 'normal',
    },
  },
  rose_shayari: {
    label: 'Rose Shayari',
    subtitle: 'Warm crimson poetry aesthetic',
    config: {
      presetId: 'rose_shayari',
      primaryColor: '#be123c',
      accentColor: '#fb7185',
      surfaceStyle: 'glass_soft',
      cardCornerRadius: 22,
      darkModeEnabled: false,
      gradientEnabled: true,
      fontScale: 'large',
    },
  },
};

export const DEFAULT_SCHEDULED_NOTIFICATIONS: ScheduledNotificationItem[] = [
  {
    id: 'sched-morning-suvichar',
    title: 'सुबह का सुविचार तैयार है',
    message: 'आज की नई प्रेरणादायक शायरी और सुविचार पढ़ें।',
    targetLanguage: 'hi',
    targetCountry: 'IN',
    scheduledFor: '2026-11-16T07:30',
    repeatMode: 'daily',
    status: 'scheduled',
  },
  {
    id: 'sched-global-weekend',
    title: 'Weekend Poetry Digest',
    message: 'Fresh Love & Attitude status lines added for your region.',
    targetLanguage: 'all',
    targetCountry: 'all',
    scheduledFor: '2026-11-21T19:00',
    repeatMode: 'weekly',
    status: 'scheduled',
  },
];

export const DEFAULT_ENGAGEMENT_TOOLS: EngagementToolsConfig = {
  dailyStreakEnabled: true,
  moodFilterEnabled: true,
  oneTapWhatsAppShare: true,
  confettiOnFavorite: true,
  dailyShayariGoal: 5,
  pollQuestion: 'आपको किस तरह की शायरी सबसे ज़्यादा पसंद है?',
  pollOptionA: 'रोमांटिक व दिल से',
  pollOptionB: 'मोटिवेशन और एटीट्यूड',
};

export const DEFAULT_APP_EXTRAS: AppLocalizationExtras = {
  default_language_code: 'hi',
  default_country_code: 'IN',
  supported_languages: WORLD_LANGUAGE_PRESETS.slice(0, 2).map((item) => ({
    ...item,
    uiLabels: { ...item.uiLabels },
  })),
  supported_countries: WORLD_COUNTRY_PRESETS.slice(0, 2).map((item) => ({
    ...item,
  })),
  dynamic_theme: { ...THEME_PRESETS.indigo_editorial.config },
  scheduled_notifications: DEFAULT_SCHEDULED_NOTIFICATIONS.map((item) => ({
    ...item,
  })),
  engagement_tools: { ...DEFAULT_ENGAGEMENT_TOOLS },
};

function sanitizeCode(value: unknown, fallback: string, uppercase = false): string {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 10);
  const resolved = cleaned.length >= 2 ? cleaned : fallback;
  return uppercase ? resolved.toUpperCase() : resolved.toLowerCase();
}

function sanitizeUiLabels(
  raw: unknown,
  fallbackName: string
): LanguageUiLabels {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const eng = WORLD_LANGUAGE_PRESETS[1].uiLabels;
  return {
    appTitle:
      String(obj.appTitle ?? '').trim().slice(0, 40) ||
      (fallbackName === 'Hindi' ? 'शायरी लोक' : eng.appTitle),
    homeTab: String(obj.homeTab ?? '').trim().slice(0, 30) || eng.homeTab,
    categoriesTab:
      String(obj.categoriesTab ?? '').trim().slice(0, 30) || eng.categoriesTab,
    favoritesTab:
      String(obj.favoritesTab ?? '').trim().slice(0, 30) || eng.favoritesTab,
    settingsTab:
      String(obj.settingsTab ?? '').trim().slice(0, 30) || eng.settingsTab,
    languageLabel:
      String(obj.languageLabel ?? '').trim().slice(0, 50) || eng.languageLabel,
    shareButton:
      String(obj.shareButton ?? '').trim().slice(0, 30) || eng.shareButton,
    copyButton:
      String(obj.copyButton ?? '').trim().slice(0, 30) || eng.copyButton,
  };
}

function isValidThemePreset(val: unknown): val is ThemePresetId {
  return (
    val === 'indigo_editorial' ||
    val === 'royal_midnight' ||
    val === 'emerald_sufi' ||
    val === 'rose_shayari'
  );
}

function isValidSurfaceStyle(
  val: unknown
): val is DynamicThemeConfig['surfaceStyle'] {
  return (
    val === 'clean_card' ||
    val === 'glass_soft' ||
    val === 'minimal_outline' ||
    val === 'dark_ink'
  );
}

function isValidFontScale(
  val: unknown
): val is DynamicThemeConfig['fontScale'] {
  return val === 'compact' || val === 'normal' || val === 'large';
}

export function normalizeAppExtras(raw: unknown): AppLocalizationExtras {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_APP_EXTRAS,
      supported_languages: DEFAULT_APP_EXTRAS.supported_languages.map((l) => ({
        ...l,
        uiLabels: { ...l.uiLabels },
      })),
      supported_countries: DEFAULT_APP_EXTRAS.supported_countries.map((c) => ({
        ...c,
      })),
      dynamic_theme: { ...DEFAULT_APP_EXTRAS.dynamic_theme },
      scheduled_notifications: DEFAULT_APP_EXTRAS.scheduled_notifications.map(
        (n) => ({ ...n })
      ),
      engagement_tools: { ...DEFAULT_APP_EXTRAS.engagement_tools },
    };
  }

  const obj = raw as Record<string, unknown>;

  const rawLangs = Array.isArray(obj.supported_languages)
    ? obj.supported_languages
    : DEFAULT_APP_EXTRAS.supported_languages;

  const seenLangCodes = new Set<string>();
  const supported_languages: LanguageItem[] = [];
  for (const item of rawLangs) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const code = sanitizeCode(rec.code, '', false);
    if (!code || seenLangCodes.has(code)) continue;
    seenLangCodes.add(code);
    const name = String(rec.name ?? code).trim().slice(0, 50) || code.toUpperCase();
    supported_languages.push({
      code,
      name,
      nativeName: String(rec.nativeName ?? name).trim().slice(0, 50) || name,
      flag: String(rec.flag ?? '🌐').trim().slice(0, 12) || '🌐',
      rtl: typeof rec.rtl === 'boolean' ? rec.rtl : code === 'ur' || code === 'ar',
      enabled: typeof rec.enabled === 'boolean' ? rec.enabled : true,
      uiLabels: sanitizeUiLabels(rec.uiLabels, name),
    });
    if (supported_languages.length >= 40) break;
  }

  if (supported_languages.length === 0) {
    supported_languages.push(
      ...DEFAULT_APP_EXTRAS.supported_languages.map((l) => ({
        ...l,
        uiLabels: { ...l.uiLabels },
      }))
    );
  }

  const requestedDefaultLang = sanitizeCode(
    obj.default_language_code,
    supported_languages[0].code,
    false
  );
  const default_language_code = supported_languages.some(
    (l) => l.code === requestedDefaultLang
  )
    ? requestedDefaultLang
    : supported_languages[0].code;

  const rawCountries = Array.isArray(obj.supported_countries)
    ? obj.supported_countries
    : DEFAULT_APP_EXTRAS.supported_countries;

  const seenCountryCodes = new Set<string>();
  const supported_countries: CountryItem[] = [];
  for (const item of rawCountries) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const code = sanitizeCode(rec.code, '', true);
    if (!code || seenCountryCodes.has(code)) continue;
    seenCountryCodes.add(code);
    supported_countries.push({
      code,
      name: String(rec.name ?? code).trim().slice(0, 60) || code,
      flag: String(rec.flag ?? '🏳️').trim().slice(0, 12) || '🏳️',
      dialCode: String(rec.dialCode ?? '+1').trim().slice(0, 12) || '+1',
      currency: String(rec.currency ?? 'USD').trim().slice(0, 10).toUpperCase() || 'USD',
      defaultLanguageCode: sanitizeCode(
        rec.defaultLanguageCode,
        default_language_code,
        false
      ),
      enabled: typeof rec.enabled === 'boolean' ? rec.enabled : true,
    });
    if (supported_countries.length >= 60) break;
  }

  if (supported_countries.length === 0) {
    supported_countries.push(
      ...DEFAULT_APP_EXTRAS.supported_countries.map((c) => ({ ...c }))
    );
  }

  const requestedDefaultCountry = sanitizeCode(
    obj.default_country_code,
    supported_countries[0].code,
    true
  );
  const default_country_code = supported_countries.some(
    (c) => c.code === requestedDefaultCountry
  )
    ? requestedDefaultCountry
    : supported_countries[0].code;

  const rawTheme =
    obj.dynamic_theme && typeof obj.dynamic_theme === 'object'
      ? (obj.dynamic_theme as Record<string, unknown>)
      : {};
  const baseTheme = THEME_PRESETS.indigo_editorial.config;
  const radiusNum = Number(rawTheme.cardCornerRadius);
  const dynamic_theme: DynamicThemeConfig = {
    presetId: isValidThemePreset(rawTheme.presetId)
      ? rawTheme.presetId
      : baseTheme.presetId,
    primaryColor:
      typeof rawTheme.primaryColor === 'string' && rawTheme.primaryColor.trim()
        ? rawTheme.primaryColor.trim().slice(0, 20)
        : baseTheme.primaryColor,
    accentColor:
      typeof rawTheme.accentColor === 'string' && rawTheme.accentColor.trim()
        ? rawTheme.accentColor.trim().slice(0, 20)
        : baseTheme.accentColor,
    surfaceStyle: isValidSurfaceStyle(rawTheme.surfaceStyle)
      ? rawTheme.surfaceStyle
      : baseTheme.surfaceStyle,
    cardCornerRadius: Number.isFinite(radiusNum)
      ? Math.min(36, Math.max(0, Math.trunc(radiusNum)))
      : baseTheme.cardCornerRadius,
    darkModeEnabled:
      typeof rawTheme.darkModeEnabled === 'boolean'
        ? rawTheme.darkModeEnabled
        : baseTheme.darkModeEnabled,
    gradientEnabled:
      typeof rawTheme.gradientEnabled === 'boolean'
        ? rawTheme.gradientEnabled
        : baseTheme.gradientEnabled,
    fontScale: isValidFontScale(rawTheme.fontScale)
      ? rawTheme.fontScale
      : baseTheme.fontScale,
  };

  const rawSched = Array.isArray(obj.scheduled_notifications)
    ? obj.scheduled_notifications
    : DEFAULT_SCHEDULED_NOTIFICATIONS;
  const scheduled_notifications: ScheduledNotificationItem[] = rawSched
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object')
    )
    .slice(0, 50)
    .map((item, idx): ScheduledNotificationItem => {
      const repeatMode: ScheduledNotificationItem['repeatMode'] =
        item.repeatMode === 'daily'
          ? 'daily'
          : item.repeatMode === 'weekly'
            ? 'weekly'
            : 'once';
      const status: ScheduledNotificationItem['status'] =
        item.status === 'paused' ? 'paused' : 'scheduled';
      return {
        id:
          String(item.id ?? `sched-${idx + 1}`).trim().slice(0, 60) ||
          `sched-${idx + 1}`,
        title: String(item.title ?? '').trim().slice(0, 120),
        message: String(item.message ?? '').trim().slice(0, 300),
        targetLanguage:
          String(item.targetLanguage ?? 'all').trim().slice(0, 10) || 'all',
        targetCountry:
          String(item.targetCountry ?? 'all').trim().slice(0, 10) || 'all',
        scheduledFor:
          String(item.scheduledFor ?? '2026-11-16T09:00').trim().slice(0, 40) ||
          '2026-11-16T09:00',
        repeatMode,
        status,
      };
    })
    .filter((item) => item.title.length > 0 && item.message.length > 0);

  const rawEng =
    obj.engagement_tools && typeof obj.engagement_tools === 'object'
      ? (obj.engagement_tools as Record<string, unknown>)
      : {};
  const goalNum = Number(rawEng.dailyShayariGoal);
  const engagement_tools: EngagementToolsConfig = {
    dailyStreakEnabled:
      typeof rawEng.dailyStreakEnabled === 'boolean'
        ? rawEng.dailyStreakEnabled
        : DEFAULT_ENGAGEMENT_TOOLS.dailyStreakEnabled,
    moodFilterEnabled:
      typeof rawEng.moodFilterEnabled === 'boolean'
        ? rawEng.moodFilterEnabled
        : DEFAULT_ENGAGEMENT_TOOLS.moodFilterEnabled,
    oneTapWhatsAppShare:
      typeof rawEng.oneTapWhatsAppShare === 'boolean'
        ? rawEng.oneTapWhatsAppShare
        : DEFAULT_ENGAGEMENT_TOOLS.oneTapWhatsAppShare,
    confettiOnFavorite:
      typeof rawEng.confettiOnFavorite === 'boolean'
        ? rawEng.confettiOnFavorite
        : DEFAULT_ENGAGEMENT_TOOLS.confettiOnFavorite,
    dailyShayariGoal: Number.isFinite(goalNum)
      ? Math.min(50, Math.max(1, Math.trunc(goalNum)))
      : DEFAULT_ENGAGEMENT_TOOLS.dailyShayariGoal,
    pollQuestion:
      String(rawEng.pollQuestion ?? DEFAULT_ENGAGEMENT_TOOLS.pollQuestion)
        .trim()
        .slice(0, 200) || DEFAULT_ENGAGEMENT_TOOLS.pollQuestion,
    pollOptionA:
      String(rawEng.pollOptionA ?? DEFAULT_ENGAGEMENT_TOOLS.pollOptionA)
        .trim()
        .slice(0, 80) || DEFAULT_ENGAGEMENT_TOOLS.pollOptionA,
    pollOptionB:
      String(rawEng.pollOptionB ?? DEFAULT_ENGAGEMENT_TOOLS.pollOptionB)
        .trim()
        .slice(0, 80) || DEFAULT_ENGAGEMENT_TOOLS.pollOptionB,
  };

  return {
    default_language_code,
    default_country_code,
    supported_languages,
    supported_countries,
    dynamic_theme,
    scheduled_notifications,
    engagement_tools,
  };
}

export function loadAppExtras(appId: string): AppLocalizationExtras {
  try {
    const raw = localStorage.getItem(`${EXTRAS_STORAGE_PREFIX}${appId}`);
    if (!raw) return normalizeAppExtras(null);
    return normalizeAppExtras(JSON.parse(raw));
  } catch {
    return normalizeAppExtras(null);
  }
}

export function saveAppExtras(
  appId: string,
  extras: AppLocalizationExtras
): void {
  try {
    localStorage.setItem(
      `${EXTRAS_STORAGE_PREFIX}${appId}`,
      JSON.stringify(normalizeAppExtras(extras))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function addLanguageToExtras(
  extras: AppLocalizationExtras,
  input: Partial<LanguageItem> & { code: string; name: string }
): AppLocalizationExtras {
  const code = sanitizeCode(input.code, '', false);
  if (!code) return extras;
  if (extras.supported_languages.some((l) => l.code === code)) {
    return {
      ...extras,
      supported_languages: extras.supported_languages.map((l) =>
        l.code === code ? { ...l, enabled: true } : l
      ),
    };
  }
  const preset = WORLD_LANGUAGE_PRESETS.find((p) => p.code === code);
  const newItem: LanguageItem = {
    code,
    name: input.name.trim().slice(0, 50) || preset?.name || code.toUpperCase(),
    nativeName:
      input.nativeName?.trim().slice(0, 50) ||
      preset?.nativeName ||
      input.name.trim().slice(0, 50) ||
      code.toUpperCase(),
    flag: input.flag?.trim().slice(0, 12) || preset?.flag || '🌐',
    rtl:
      typeof input.rtl === 'boolean'
        ? input.rtl
        : preset?.rtl ?? (code === 'ur' || code === 'ar'),
    enabled: true,
    uiLabels: sanitizeUiLabels(
      input.uiLabels ?? preset?.uiLabels,
      input.name.trim()
    ),
  };

  return normalizeAppExtras({
    ...extras,
    supported_languages: [...extras.supported_languages, newItem],
  });
}

export function toggleLanguageEnabled(
  extras: AppLocalizationExtras,
  code: string
): AppLocalizationExtras {
  if (code === extras.default_language_code) {
    return extras;
  }
  return {
    ...extras,
    supported_languages: extras.supported_languages.map((l) =>
      l.code === code ? { ...l, enabled: !l.enabled } : l
    ),
  };
}

export function setDefaultLanguage(
  extras: AppLocalizationExtras,
  code: string
): AppLocalizationExtras {
  if (!extras.supported_languages.some((l) => l.code === code)) {
    return extras;
  }
  return {
    ...extras,
    default_language_code: code,
    supported_languages: extras.supported_languages.map((l) =>
      l.code === code ? { ...l, enabled: true } : l
    ),
  };
}

export function removeLanguageFromExtras(
  extras: AppLocalizationExtras,
  code: string
): AppLocalizationExtras {
  if (
    extras.supported_languages.length <= 1 ||
    code === extras.default_language_code
  ) {
    return extras;
  }
  return {
    ...extras,
    supported_languages: extras.supported_languages.filter(
      (l) => l.code !== code
    ),
  };
}

export function updateLanguageLabels(
  extras: AppLocalizationExtras,
  code: string,
  labels: Partial<LanguageUiLabels>
): AppLocalizationExtras {
  return {
    ...extras,
    supported_languages: extras.supported_languages.map((l) =>
      l.code === code
        ? {
            ...l,
            uiLabels: sanitizeUiLabels(
              { ...l.uiLabels, ...labels },
              l.name
            ),
          }
        : l
    ),
  };
}

export function addCountryToExtras(
  extras: AppLocalizationExtras,
  input: Partial<CountryItem> & { code: string; name: string }
): AppLocalizationExtras {
  const code = sanitizeCode(input.code, '', true);
  if (!code) return extras;
  if (extras.supported_countries.some((c) => c.code === code)) {
    return {
      ...extras,
      supported_countries: extras.supported_countries.map((c) =>
        c.code === code ? { ...c, enabled: true } : c
      ),
    };
  }
  const preset = WORLD_COUNTRY_PRESETS.find((p) => p.code === code);
  const newCountry: CountryItem = {
    code,
    name: input.name.trim().slice(0, 60) || preset?.name || code,
    flag: input.flag?.trim().slice(0, 12) || preset?.flag || '🏳️',
    dialCode: input.dialCode?.trim().slice(0, 12) || preset?.dialCode || '+1',
    currency:
      input.currency?.trim().slice(0, 10).toUpperCase() ||
      preset?.currency ||
      'USD',
    defaultLanguageCode: sanitizeCode(
      input.defaultLanguageCode ?? preset?.defaultLanguageCode,
      extras.default_language_code,
      false
    ),
    enabled: true,
  };

  return normalizeAppExtras({
    ...extras,
    supported_countries: [...extras.supported_countries, newCountry],
  });
}

export function toggleCountryEnabled(
  extras: AppLocalizationExtras,
  code: string
): AppLocalizationExtras {
  if (code === extras.default_country_code) {
    return extras;
  }
  return {
    ...extras,
    supported_countries: extras.supported_countries.map((c) =>
      c.code === code ? { ...c, enabled: !c.enabled } : c
    ),
  };
}

export function setDefaultCountry(
  extras: AppLocalizationExtras,
  code: string
): AppLocalizationExtras {
  if (!extras.supported_countries.some((c) => c.code === code)) {
    return extras;
  }
  return {
    ...extras,
    default_country_code: code,
    supported_countries: extras.supported_countries.map((c) =>
      c.code === code ? { ...c, enabled: true } : c
    ),
  };
}

export function removeCountryFromExtras(
  extras: AppLocalizationExtras,
  code: string
): AppLocalizationExtras {
  if (
    extras.supported_countries.length <= 1 ||
    code === extras.default_country_code
  ) {
    return extras;
  }
  return {
    ...extras,
    supported_countries: extras.supported_countries.filter(
      (c) => c.code !== code
    ),
  };
}

export function addScheduledNotification(
  extras: AppLocalizationExtras,
  input: Omit<ScheduledNotificationItem, 'id' | 'status'>
): AppLocalizationExtras {
  const title = input.title.trim().slice(0, 120);
  const message = input.message.trim().slice(0, 300);
  if (!title || !message) return extras;

  const entry: ScheduledNotificationItem = {
    id: `sched-${Date.now().toString(36)}`,
    title,
    message,
    targetLanguage: input.targetLanguage.trim() || 'all',
    targetCountry: input.targetCountry.trim() || 'all',
    scheduledFor: input.scheduledFor.trim() || '2026-11-16T09:00',
    repeatMode:
      input.repeatMode === 'daily' || input.repeatMode === 'weekly'
        ? input.repeatMode
        : 'once',
    status: 'scheduled',
  };

  return normalizeAppExtras({
    ...extras,
    scheduled_notifications: [entry, ...extras.scheduled_notifications],
  });
}

export function toggleScheduledNotificationStatus(
  extras: AppLocalizationExtras,
  id: string
): AppLocalizationExtras {
  return {
    ...extras,
    scheduled_notifications: extras.scheduled_notifications.map((item) =>
      item.id === id
        ? {
            ...item,
            status: item.status === 'scheduled' ? 'paused' : 'scheduled',
          }
        : item
    ),
  };
}

export function removeScheduledNotification(
  extras: AppLocalizationExtras,
  id: string
): AppLocalizationExtras {
  return {
    ...extras,
    scheduled_notifications: extras.scheduled_notifications.filter(
      (item) => item.id !== id
    ),
  };
}

export function resolveAndroidLocaleStrings(
  extras: AppLocalizationExtras,
  requestedLanguageCode?: string
): {
  language: LanguageItem;
  country: CountryItem;
} {
  const enabledLangs = extras.supported_languages.filter((l) => l.enabled);
  const langPool =
    enabledLangs.length > 0 ? enabledLangs : extras.supported_languages;

  const language =
    langPool.find((l) => l.code === requestedLanguageCode) ??
    langPool.find((l) => l.code === extras.default_language_code) ??
    langPool[0];

  const enabledCountries = extras.supported_countries.filter((c) => c.enabled);
  const countryPool =
    enabledCountries.length > 0 ? enabledCountries : extras.supported_countries;

  const country =
    countryPool.find((c) => c.code === extras.default_country_code) ??
    countryPool[0];

  return { language, country };
}

export function serializeFullConfigWithExtras(
  config: ShayariLokConfig,
  extras: AppLocalizationExtras
): string {
  const safeConfig = normalizeConfig(config);
  const safeExtras = normalizeAppExtras(extras);
  return JSON.stringify(
    {
      ...safeConfig,
      default_language_code: safeExtras.default_language_code,
      default_country_code: safeExtras.default_country_code,
      supported_languages: safeExtras.supported_languages,
      supported_countries: safeExtras.supported_countries,
      dynamic_theme: safeExtras.dynamic_theme,
      scheduled_notifications: safeExtras.scheduled_notifications,
      engagement_tools: safeExtras.engagement_tools,
    },
    null,
    2
  );
}
