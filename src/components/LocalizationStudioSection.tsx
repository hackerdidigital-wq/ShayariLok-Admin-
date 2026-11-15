import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BellPlus,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  Globe2,
  Languages,
  Palette,
  PauseCircle,
  PlayCircle,
  Plus,
  Radio,
  RotateCcw,
  Share2,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  AppLocalizationExtras,
  CountryItem,
  DynamicThemeConfig,
  LanguageItem,
  LanguageUiLabels,
  ScheduledNotificationItem,
  ShayariLokConfig,
  ThemePresetId,
} from '../types/config';
import { generateAndroidLocaleSyncCode } from '../utils/androidIntegration';
import { copyTextWithFeedback } from '../utils/clipboardToast';
import {
  THEME_PRESETS,
  WORLD_COUNTRY_PRESETS,
  WORLD_LANGUAGE_PRESETS,
  addCountryToExtras,
  addLanguageToExtras,
  addScheduledNotification,
  removeCountryFromExtras,
  removeLanguageFromExtras,
  removeScheduledNotification,
  resolveAndroidLocaleStrings,
  setDefaultCountry,
  setDefaultLanguage,
  toggleCountryEnabled,
  toggleLanguageEnabled,
  toggleScheduledNotificationStatus,
  updateLanguageLabels,
} from '../utils/localizationAndExtras';

interface LocalizationStudioSectionProps {
  config: ShayariLokConfig;
  extras: AppLocalizationExtras;
  onUpdateExtras: (next: AppLocalizationExtras, instantSync?: boolean) => void;
  user: User | null;
  activeSiteId?: string;
  realtimeStatus: 'live' | 'syncing' | 'local';
  onSyncLiveNow: () => Promise<void>;
}

type StudioTabId = 'languages' | 'countries' | 'preview' | 'addons';

const INITIAL_CUSTOM_LABELS: LanguageUiLabels = {
  appTitle: 'Shayari Lok',
  homeTab: 'Home',
  categoriesTab: 'Categories',
  favoritesTab: 'Favorites',
  settingsTab: 'Settings',
  languageLabel: 'Select Language',
  shareButton: 'Share',
  copyButton: 'Copy',
};

export const LocalizationStudioSection: React.FC<
  LocalizationStudioSectionProps
> = ({
  config,
  extras,
  onUpdateExtras,
  user,
  activeSiteId,
  realtimeStatus,
  onSyncLiveNow,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTabId>('languages');

  // Language + form state
  const [showAddLangForm, setShowAddLangForm] = useState(false);
  const [langCode, setLangCode] = useState('');
  const [langName, setLangName] = useState('');
  const [langNative, setLangNative] = useState('');
  const [langFlag, setLangFlag] = useState('🌐');
  const [langRtl, setLangRtl] = useState(false);
  const [langLabels, setLangLabels] = useState<LanguageUiLabels>({
    ...INITIAL_CUSTOM_LABELS,
  });
  const [editingLabelLangCode, setEditingLabelLangCode] = useState<string | null>(
    null
  );

  // Country + form state
  const [showAddCountryForm, setShowAddCountryForm] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [countryFlag, setCountryFlag] = useState('🏳️');
  const [countryDial, setCountryDial] = useState('+1');
  const [countryCurrency, setCountryCurrency] = useState('USD');
  const [countryDefaultLang, setCountryDefaultLang] = useState(
    extras.default_language_code
  );

  // Interactive User App Preview state
  const [previewLangCode, setPreviewLangCode] = useState(
    extras.default_language_code
  );
  const [previewCountryCode, setPreviewCountryCode] = useState(
    extras.default_country_code
  );
  const [previewMood, setPreviewMood] = useState('Romantic');
  const [previewPollVote, setPreviewPollVote] = useState<'A' | 'B' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Push Notification Scheduler form
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushTargetLang, setPushTargetLang] = useState('all');
  const [pushTargetCountry, setPushTargetCountry] = useState('all');
  const [pushDatetime, setPushDatetime] = useState('2026-11-18T19:30');
  const [pushRepeat, setPushRepeat] = useState<'once' | 'daily' | 'weekly'>(
    'daily'
  );

  const enabledLanguages = useMemo(
    () => extras.supported_languages.filter((l) => l.enabled),
    [extras.supported_languages]
  );
  const enabledCountries = useMemo(
    () => extras.supported_countries.filter((c) => c.enabled),
    [extras.supported_countries]
  );

  const availableLanguagePresets = useMemo(
    () =>
      WORLD_LANGUAGE_PRESETS.filter(
        (p) =>
          !extras.supported_languages.some(
            (existing) => existing.code === p.code && existing.enabled
          )
      ),
    [extras.supported_languages]
  );

  const availableCountryPresets = useMemo(
    () =>
      WORLD_COUNTRY_PRESETS.filter(
        (p) =>
          !extras.supported_countries.some(
            (existing) => existing.code === p.code && existing.enabled
          )
      ),
    [extras.supported_countries]
  );

  const targetSiteId = activeSiteId || user?.uid || 'YOUR_ADMIN_UID';
  const kotlinLocaleCode = useMemo(
    () => generateAndroidLocaleSyncCode(targetSiteId),
    [targetSiteId]
  );

  const activePreviewLocale = useMemo(() => {
    const resolved = resolveAndroidLocaleStrings(extras, previewLangCode);
    const chosenCountry =
      enabledCountries.find((c) => c.code === previewCountryCode) ??
      resolved.country;
    return {
      language: resolved.language,
      country: chosenCountry,
    };
  }, [extras, previewLangCode, previewCountryCode, enabledCountries]);

  const sampleShayari = config.shayari_list[0] ?? {
    id: 1,
    category: 'Love',
    author: 'शायरी लोक',
    text: 'दिल की हर धड़कन में तेरा ही नाम बसा है,\nहर दुआ में आज भी बस तेरा ही साथ मांगा है।',
  };

  const handleCopy = async (id: string, value: string, label: string) => {
    const ok = await copyTextWithFeedback(value, label);
    if (ok) {
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    }
  };

  const handleQuickAddLanguage = (preset: LanguageItem) => {
    const next = addLanguageToExtras(extras, { ...preset, enabled: true });
    onUpdateExtras(next, true);
    setPreviewLangCode(preset.code);
  };

  const handleCreateCustomLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!langCode.trim() || !langName.trim()) return;
    const next = addLanguageToExtras(extras, {
      code: langCode.trim(),
      name: langName.trim(),
      nativeName: langNative.trim() || langName.trim(),
      flag: langFlag.trim() || '🌐',
      rtl: langRtl,
      enabled: true,
      uiLabels: langLabels,
    });
    onUpdateExtras(next, true);
    setPreviewLangCode(langCode.trim().toLowerCase());
    setLangCode('');
    setLangName('');
    setLangNative('');
    setLangFlag('🌐');
    setLangRtl(false);
    setLangLabels({ ...INITIAL_CUSTOM_LABELS });
    setShowAddLangForm(false);
  };

  const handleQuickAddCountry = (preset: CountryItem) => {
    const next = addCountryToExtras(extras, { ...preset, enabled: true });
    onUpdateExtras(next, true);
    setPreviewCountryCode(preset.code);
  };

  const handleCreateCustomCountry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryCode.trim() || !countryName.trim()) return;
    const normalizedCode = countryCode.trim().toUpperCase();
    const next = addCountryToExtras(extras, {
      code: normalizedCode,
      name: countryName.trim(),
      flag: countryFlag.trim() || '🏳️',
      dialCode: countryDial.trim() || '+1',
      currency: countryCurrency.trim().toUpperCase() || 'USD',
      defaultLanguageCode: countryDefaultLang,
      enabled: true,
    });
    onUpdateExtras(next, true);
    setPreviewCountryCode(normalizedCode);
    setCountryCode('');
    setCountryName('');
    setCountryFlag('🏳️');
    setCountryDial('+1');
    setCountryCurrency('USD');
    setShowAddCountryForm(false);
  };

  const handleApplyThemePreset = (presetId: ThemePresetId) => {
    const presetConfig = THEME_PRESETS[presetId].config;
    onUpdateExtras(
      {
        ...extras,
        dynamic_theme: { ...presetConfig },
      },
      true
    );
  };

  const handlePatchTheme = (patch: Partial<DynamicThemeConfig>) => {
    onUpdateExtras(
      {
        ...extras,
        dynamic_theme: {
          ...extras.dynamic_theme,
          ...patch,
        },
      },
      false
    );
  };

  const handleSchedulePush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushMessage.trim()) return;
    const next = addScheduledNotification(extras, {
      title: pushTitle,
      message: pushMessage,
      targetLanguage: pushTargetLang,
      targetCountry: pushTargetCountry,
      scheduledFor: pushDatetime,
      repeatMode: pushRepeat,
    });
    onUpdateExtras(next, true);
    setPushTitle('');
    setPushMessage('');
  };

  const theme = extras.dynamic_theme;

  return (
    <div className="space-y-6">
      {/* Studio Overview & Live Cloud Push Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Languages className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Multi-Language, Countries, Dynamic Theme &amp; Engagement Studio
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                यहाँ से नए देश (Countries) और भाषाएँ (Languages) जोड़ें, User App Settings को लाइव टेस्ट करें, और Dynamic Theme व भाषा-आधारित नोटिफिकेशन शेड्यूल करें — हर सेव किया बदलाव तुरंत Firebase (<code className="font-mono text-xs">publicSites</code>) में अपडेट होता है।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                realtimeStatus === 'live'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : realtimeStatus === 'syncing'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>
                {realtimeStatus === 'live'
                  ? 'Firebase Synced'
                  : realtimeStatus === 'syncing'
                    ? 'Syncing...'
                    : 'Local Workspace'}
              </span>
            </span>

            <button
              type="button"
              onClick={() => {
                onUpdateExtras(extras, true);
                void onSyncLiveNow();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save &amp; Sync to Firebase</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Active Languages</div>
            <div className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
              {enabledLanguages.length}{' '}
              <span className="text-xs font-mono text-slate-500">
                (Default: {extras.default_language_code.toUpperCase()})
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Target Countries</div>
            <div className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
              {enabledCountries.length}{' '}
              <span className="text-xs font-mono text-slate-500">
                (Primary: {extras.default_country_code})
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Active App Theme</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
              <span
                className="inline-block w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                style={{ backgroundColor: theme.primaryColor }}
              />
              <span className="truncate">
                {THEME_PRESETS[theme.presetId].label}
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Scheduled Push Queue</div>
            <div className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
              {
                extras.scheduled_notifications.filter(
                  (n) => n.status === 'scheduled'
                ).length
              }{' '}
              <span className="text-xs font-normal text-slate-500">active</span>
            </div>
          </div>
        </div>

        {/* Workspace Sub-Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Localization and advanced features tabs"
          className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl"
        >
          {(
            [
              {
                id: 'languages',
                label: 'Multi-Language (+)',
                icon: Languages,
              },
              {
                id: 'countries',
                label: 'Countries & Regions (+)',
                icon: Globe2,
              },
              {
                id: 'preview',
                label: 'User App Settings Preview & Kotlin',
                icon: Smartphone,
              },
              {
                id: 'addons',
                label: 'AI Themes, Push Scheduler & Engagement',
                icon: Sparkles,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  selected
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-indigo-600" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* TAB 1: MULTI-LANGUAGE + ADD & EDIT */}
      {activeTab === 'languages' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Add New Languages to Shayari Lok (+ Button)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  1-क्लिक से लोकप्रिय भाषाएँ जोड़ें या अपनी कस्टम भाषा और बटन अनुवाद (UI Labels) बनाएँ।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLangForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 whitespace-nowrap self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddLangForm ? 'Close Custom Form' : 'Add Custom Language'}</span>
              </button>
            </div>

            {availableLanguagePresets.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Quick-Add World Languages
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableLanguagePresets.map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => handleQuickAddLanguage(preset)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {preset.flag} {preset.name} ({preset.nativeName})
                      </span>
                      {preset.rtl && (
                        <span className="font-mono text-[10px] px-1 py-0.2 bg-white border border-indigo-200 rounded">
                          RTL
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showAddLangForm && (
              <form
                onSubmit={handleCreateCustomLanguage}
                className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
              >
                <div className="text-sm font-bold text-slate-900">
                  Custom Language &amp; Localized Android App Strings
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label
                      htmlFor="custom-lang-code"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      ISO Code * (e.g. de, ja)
                    </label>
                    <input
                      id="custom-lang-code"
                      type="text"
                      required
                      maxLength={10}
                      value={langCode}
                      onChange={(e) => setLangCode(e.target.value)}
                      placeholder="de"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="custom-lang-name"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Language Name *
                    </label>
                    <input
                      id="custom-lang-name"
                      type="text"
                      required
                      maxLength={50}
                      value={langName}
                      onChange={(e) => setLangName(e.target.value)}
                      placeholder="German"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="custom-lang-native"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Native Display Name
                    </label>
                    <input
                      id="custom-lang-native"
                      type="text"
                      maxLength={50}
                      value={langNative}
                      onChange={(e) => setLangNative(e.target.value)}
                      placeholder="Deutsch"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="custom-lang-flag"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Flag Emoji
                    </label>
                    <input
                      id="custom-lang-flag"
                      type="text"
                      maxLength={8}
                      value={langFlag}
                      onChange={(e) => setLangFlag(e.target.value)}
                      placeholder="🇩🇪"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={langRtl}
                        onChange={(e) => setLangRtl(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>RTL Layout (Arabic/Urdu)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      App Title Label
                    </label>
                    <input
                      type="text"
                      value={langLabels.appTitle}
                      onChange={(e) =>
                        setLangLabels({ ...langLabels, appTitle: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Home Tab
                    </label>
                    <input
                      type="text"
                      value={langLabels.homeTab}
                      onChange={(e) =>
                        setLangLabels({ ...langLabels, homeTab: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Categories Tab
                    </label>
                    <input
                      type="text"
                      value={langLabels.categoriesTab}
                      onChange={(e) =>
                        setLangLabels({
                          ...langLabels,
                          categoriesTab: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Settings Tab
                    </label>
                    <input
                      type="text"
                      value={langLabels.settingsTab}
                      onChange={(e) =>
                        setLangLabels({
                          ...langLabels,
                          settingsTab: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLangForm(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Language &amp; Sync</span>
                  </button>
                </div>
              </form>
            )}

            {/* Active Languages Table / Cards */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {extras.supported_languages.map((lang) => {
                const isDefault = extras.default_language_code === lang.code;
                const isEditingLabels = editingLabelLangCode === lang.code;
                return (
                  <div key={lang.code} className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl leading-none" aria-hidden="true">
                          {lang.flag}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {lang.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({lang.nativeName})
                            </span>
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {lang.code}
                            </span>
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {lang.rtl ? 'RTL' : 'LTR'}
                            </span>
                            {isDefault && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Default App Language
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 truncate">
                            UI: {lang.uiLabels.appTitle} · {lang.uiLabels.homeTab} ·{' '}
                            {lang.uiLabels.categoriesTab} · {lang.uiLabels.favoritesTab}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateExtras(
                                setDefaultLanguage(extras, lang.code),
                                true
                              )
                            }
                            className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingLabelLangCode(
                              isEditingLabels ? null : lang.code
                            )
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                        >
                          {isEditingLabels ? 'Done Labels' : 'Edit UI Labels'}
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={lang.enabled}
                          aria-label={`Toggle ${lang.name} availability`}
                          disabled={isDefault}
                          onClick={() =>
                            onUpdateExtras(
                              toggleLanguageEnabled(extras, lang.code),
                              true
                            )
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
                            lang.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              lang.enabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateExtras(
                                removeLanguageFromExtras(extras, lang.code),
                                true
                              )
                            }
                            aria-label={`Remove ${lang.name}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditingLabels && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {(
                          [
                            ['appTitle', 'App Title'],
                            ['homeTab', 'Home Tab'],
                            ['categoriesTab', 'Categories Tab'],
                            ['favoritesTab', 'Favorites Tab'],
                            ['settingsTab', 'Settings Tab'],
                            ['languageLabel', 'Language Selector'],
                            ['shareButton', 'Share Button'],
                            ['copyButton', 'Copy Button'],
                          ] as const
                        ).map(([fieldKey, fieldLabel]) => (
                          <div key={fieldKey}>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              {fieldLabel}
                            </label>
                            <input
                              type="text"
                              value={lang.uiLabels[fieldKey]}
                              onChange={(e) =>
                                onUpdateExtras(
                                  updateLanguageLabels(extras, lang.code, {
                                    [fieldKey]: e.target.value,
                                  }),
                                  false
                                )
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: COUNTRIES & REGIONS + ADD */}
      {activeTab === 'countries' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Countries &amp; Regional Distribution (+ Button)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                नए देश जोड़ें ताकि यूजर ऐप में रीजनल भाषा, करेंसी और देश-वार शायरी नोटिफिकेशन सक्रिय हो सके।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCountryForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddCountryForm ? 'Close Country Form' : 'Add Custom Country'}</span>
            </button>
          </div>

          {availableCountryPresets.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Quick-Add Countries
              </div>
              <div className="flex flex-wrap gap-2">
                {availableCountryPresets.map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleQuickAddCountry(preset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {preset.flag} {preset.name} ({preset.code})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showAddCountryForm && (
            <form
              onSubmit={handleCreateCustomCountry}
              className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <div>
                  <label
                    htmlFor="custom-country-code"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    ISO Code * (e.g. DE)
                  </label>
                  <input
                    id="custom-country-code"
                    type="text"
                    required
                    maxLength={10}
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="DE"
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label
                    htmlFor="custom-country-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Country Name *
                  </label>
                  <input
                    id="custom-country-name"
                    type="text"
                    required
                    maxLength={60}
                    value={countryName}
                    onChange={(e) => setCountryName(e.target.value)}
                    placeholder="Germany"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Flag Emoji
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={countryFlag}
                    onChange={(e) => setCountryFlag(e.target.value)}
                    placeholder="🇩🇪"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Dial Code
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={countryDial}
                    onChange={(e) => setCountryDial(e.target.value)}
                    placeholder="+49"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={countryCurrency}
                    onChange={(e) => setCountryCurrency(e.target.value)}
                    placeholder="EUR"
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="custom-country-lang"
                    className="text-xs font-medium text-slate-700"
                  >
                    Default Language for Country:
                  </label>
                  <select
                    id="custom-country-lang"
                    value={countryDefaultLang}
                    onChange={(e) => setCountryDefaultLang(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {extras.supported_languages.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.flag} {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCountryForm(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Country &amp; Sync</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {extras.supported_countries.map((country) => {
              const isPrimary = extras.default_country_code === country.code;
              return (
                <div
                  key={country.code}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl leading-none" aria-hidden="true">
                      {country.flag}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {country.name}
                        </span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {country.code} · {country.dialCode} · {country.currency}
                        </span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          Lang: {country.defaultLanguageCode.toUpperCase()}
                        </span>
                        {isPrimary && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Primary Region
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateExtras(
                            setDefaultCountry(extras, country.code),
                            true
                          )
                        }
                        className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={country.enabled}
                      aria-label={`Toggle ${country.name} availability`}
                      disabled={isPrimary}
                      onClick={() =>
                        onUpdateExtras(
                          toggleCountryEnabled(extras, country.code),
                          true
                        )
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
                        country.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          country.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateExtras(
                            removeCountryFromExtras(extras, country.code),
                            true
                          )
                        }
                        aria-label={`Remove ${country.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 3: USER APP SETTINGS LIVE SIMULATOR & KOTLIN CODE */}
      {activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Android App Preview */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Live User App Settings Preview
                </h3>
                <p className="text-xs text-slate-500">
                  किसी भी भाषा पर क्लिक करें — पूरा यूजर ऐप UI और RTL/LTR लेआउट तुरंत बदल जाएगा।
                </p>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activePreviewLocale.language.rtl ? 'RTL' : 'LTR'}
              </span>
            </div>

            <div
              dir={activePreviewLocale.language.rtl ? 'rtl' : 'ltr'}
              className={`border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-colors ${
                theme.darkModeEnabled
                  ? 'bg-slate-950 text-slate-100'
                  : 'bg-slate-50 text-slate-900'
              }`}
            >
              {/* Simulated App Top Bar */}
              <div
                className="px-4 py-3.5 text-white flex items-center justify-between gap-2"
                style={{
                  background: theme.gradientEnabled
                    ? `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`
                    : theme.primaryColor,
                }}
              >
                <div className="font-display font-bold text-sm truncate">
                  {activePreviewLocale.language.uiLabels.appTitle}
                </div>
                <span className="text-[11px] font-mono bg-white/20 px-2 py-0.5 rounded">
                  {activePreviewLocale.country.flag}{' '}
                  {activePreviewLocale.country.code}
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Daily Reading Streak Pill */}
                {extras.engagement_tools.dailyStreakEnabled && (
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                      theme.darkModeEnabled
                        ? 'bg-slate-900 border-slate-800 text-amber-300'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Flame className="w-3.5 h-3.5" />
                      <span>
                        Daily Goal: {extras.engagement_tools.dailyShayariGoal}{' '}
                        Shayaris
                      </span>
                    </span>
                    <span className="font-mono text-[11px]">3d Streak</span>
                  </div>
                )}

                {/* User App Country Selector */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                    Country / Region ({enabledCountries.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledCountries.map((country) => {
                      const active =
                        activePreviewLocale.country.code === country.code;
                      return (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => setPreviewCountryCode(country.code)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                            active
                              ? 'border-transparent text-white font-semibold'
                              : theme.darkModeEnabled
                                ? 'bg-slate-900 border-slate-700 text-slate-200'
                                : 'bg-white border-slate-200 text-slate-700'
                          }`}
                          style={
                            active
                              ? { backgroundColor: theme.primaryColor }
                              : undefined
                          }
                        >
                          {country.flag} {country.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* User App Language Switcher */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold">
                    {activePreviewLocale.language.uiLabels.languageLabel}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {enabledLanguages.map((lang) => {
                      const active =
                        activePreviewLocale.language.code === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setPreviewLangCode(lang.code)}
                          className={`px-2.5 py-2 text-xs rounded-lg border text-start transition-colors ${
                            active
                              ? 'border-transparent text-white font-semibold'
                              : theme.darkModeEnabled
                                ? 'bg-slate-900 border-slate-700 text-slate-200'
                                : 'bg-white border-slate-200 text-slate-800'
                          }`}
                          style={
                            active
                              ? { backgroundColor: theme.primaryColor }
                              : undefined
                          }
                        >
                          {lang.flag} {lang.nativeName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mood Filter & Sample Shayari Card */}
                {extras.engagement_tools.moodFilterEnabled && (
                  <div className="flex flex-wrap gap-1.5">
                    {['Romantic', 'Sad', 'Motivated', 'Attitude'].map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setPreviewMood(mood)}
                        className={`px-2 py-0.5 text-[11px] rounded border ${
                          previewMood === mood
                            ? 'text-white border-transparent'
                            : theme.darkModeEnabled
                              ? 'border-slate-700 text-slate-300'
                              : 'border-slate-200 text-slate-600 bg-white'
                        }`}
                        style={
                          previewMood === mood
                            ? { backgroundColor: theme.accentColor }
                            : undefined
                        }
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`p-4 border space-y-3 ${
                    theme.darkModeEnabled
                      ? 'bg-slate-900 border-slate-800 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  style={{ borderRadius: `${theme.cardCornerRadius}px` }}
                >
                  <div
                    className={`leading-relaxed whitespace-pre-line font-medium ${
                      theme.fontScale === 'large'
                        ? 'text-sm'
                        : theme.fontScale === 'compact'
                          ? 'text-xs'
                          : 'text-[13px]'
                    }`}
                  >
                    {sampleShayari.text}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/30">
                    <span className="text-[11px] opacity-70">
                      — {sampleShayari.author}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-2 py-1 text-[11px] font-semibold text-white rounded"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {activePreviewLocale.language.uiLabels.copyButton}
                      </span>
                      <span
                        className="px-2 py-1 text-[11px] font-semibold text-white rounded flex items-center gap-1"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        <Share2 className="w-3 h-3" />
                        <span>
                          {activePreviewLocale.language.uiLabels.shareButton}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Poll Preview */}
                <div
                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                    theme.darkModeEnabled
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="font-semibold">
                    {extras.engagement_tools.pollQuestion}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['A', 'B'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPreviewPollVote(opt)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium ${
                          previewPollVote === opt
                            ? 'text-white border-transparent'
                            : theme.darkModeEnabled
                              ? 'border-slate-700 text-slate-300'
                              : 'border-slate-200 text-slate-700'
                        }`}
                        style={
                          previewPollVote === opt
                            ? { backgroundColor: theme.primaryColor }
                            : undefined
                        }
                      >
                        {opt === 'A'
                          ? extras.engagement_tools.pollOptionA
                          : extras.engagement_tools.pollOptionB}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Localized Bottom Tab Bar */}
              <div
                className={`grid grid-cols-4 border-t text-center py-2 text-[11px] font-medium ${
                  theme.darkModeEnabled
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div style={{ color: theme.primaryColor }} className="font-bold">
                  {activePreviewLocale.language.uiLabels.homeTab}
                </div>
                <div>
                  {activePreviewLocale.language.uiLabels.categoriesTab}
                </div>
                <div>
                  {activePreviewLocale.language.uiLabels.favoritesTab}
                </div>
                <div>{activePreviewLocale.language.uiLabels.settingsTab}</div>
              </div>
            </div>
          </section>

          {/* Ready-to-Paste Android Kotlin LocaleSettingsManager.kt */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Android User App Sync Code (<code className="font-mono text-xs">LocaleSettingsManager.kt</code>)
                </h3>
                <p className="text-xs text-slate-500">
                  Firebase <code className="font-mono">publicSites/{targetSiteId}</code> से लाइव भाषाएँ, देश और डायनामिक थीम सिंक करके ऐप की भाषा तुरंत बदलता है।
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleCopy(
                    'kotlin-locale-sync',
                    kotlinLocaleCode,
                    'LocaleSettingsManager.kt'
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 whitespace-nowrap self-start sm:self-auto"
              >
                {copiedId === 'kotlin-locale-sync' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-700">Copied Successfully!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Kotlin Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="flex-1 p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-auto leading-relaxed max-h-[560px]">
              <code>{kotlinLocaleCode}</code>
            </pre>
          </section>
        </div>
      )}

      {/* TAB 4: AI ADDITIONS (DYNAMIC THEME, PUSH SCHEDULER, ENGAGEMENT TOOLS) */}
      {activeTab === 'addons' && (
        <div className="space-y-6">
          {/* 1. Dynamic App Theme Controller */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-2.5">
                <Palette className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Dynamic App Theme Controller (Live UI Styling)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    बिना ऐप अपडेट किए सभी यूजर्स के लिए ऐप के प्राइमरी रंग, कार्ड कॉर्नर रेडियस और डार्क मोड को तुरंत बदलें।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleApplyThemePreset('indigo_editorial')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Editorial Theme</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(THEME_PRESETS) as ThemePresetId[]).map(
                (presetKey) => {
                  const preset = THEME_PRESETS[presetKey];
                  const active = theme.presetId === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => handleApplyThemePreset(presetKey)}
                      className={`p-3.5 rounded-xl border text-left transition-colors ${
                        active
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {preset.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{
                              backgroundColor: preset.config.primaryColor,
                            }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{
                              backgroundColor: preset.config.accentColor,
                            }}
                          />
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {preset.subtitle}
                      </p>
                    </button>
                  );
                }
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Primary Color ({theme.primaryColor})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) =>
                      handlePatchTheme({ primaryColor: e.target.value })
                    }
                    className="h-9 w-12 rounded border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) =>
                      handlePatchTheme({ primaryColor: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Accent Color ({theme.accentColor})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) =>
                      handlePatchTheme({ accentColor: e.target.value })
                    }
                    className="h-9 w-12 rounded border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) =>
                      handlePatchTheme({ accentColor: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Card Corner Radius ({theme.cardCornerRadius}px)
                </label>
                <input
                  type="range"
                  min={0}
                  max={36}
                  value={theme.cardCornerRadius}
                  onChange={(e) =>
                    handlePatchTheme({
                      cardCornerRadius: Number(e.target.value),
                    })
                  }
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Typography Scale
                </label>
                <select
                  value={theme.fontScale}
                  onChange={(e) =>
                    handlePatchTheme({
                      fontScale: e.target.value as DynamicThemeConfig['fontScale'],
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="large">Large Reading</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={theme.darkModeEnabled}
                  onChange={(e) =>
                    onUpdateExtras(
                      {
                        ...extras,
                        dynamic_theme: {
                          ...theme,
                          darkModeEnabled: e.target.checked,
                        },
                      },
                      true
                    )
                  }
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Force Night / Dark Reading Canvas</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={theme.gradientEnabled}
                  onChange={(e) =>
                    onUpdateExtras(
                      {
                        ...extras,
                        dynamic_theme: {
                          ...theme,
                          gradientEnabled: e.target.checked,
                        },
                      },
                      true
                    )
                  }
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Gradient Header Toolbar</span>
              </label>
            </div>
          </section>

          {/* 2. Language & Country Targeted Push Notification Scheduler */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-start gap-2.5 pb-3 border-b border-slate-100">
              <CalendarClock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Scheduled Push Notifications (Targeted by Country &amp; Language)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  किसी खास देश और भाषा के यूजर्स के लिए रोज़ाना या साप्ताहिक शायरी नोटिफिकेशन शेड्यूल करें।
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSchedulePush}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  placeholder="Notification Title (e.g. शाम की स्पेशल शायरी)"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  placeholder="Message body shown on user lock screen..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
                <select
                  value={pushTargetLang}
                  onChange={(e) => setPushTargetLang(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="all">All Languages</option>
                  {extras.supported_languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>

                <select
                  value={pushTargetCountry}
                  onChange={(e) => setPushTargetCountry(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="all">All Countries</option>
                  {extras.supported_countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>

                <input
                  type="datetime-local"
                  value={pushDatetime}
                  onChange={(e) => setPushDatetime(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                />

                <select
                  value={pushRepeat}
                  onChange={(e) =>
                    setPushRepeat(
                      e.target.value as ScheduledNotificationItem['repeatMode']
                    )
                  }
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="once">One-Time</option>
                  <option value="daily">Daily Repeat</option>
                  <option value="weekly">Weekly Repeat</option>
                </select>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  <BellPlus className="w-3.5 h-3.5" />
                  <span>Schedule Push</span>
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {extras.scheduled_notifications.map((sched) => (
                <div
                  key={sched.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {sched.title}
                      </span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Lang: {sched.targetLanguage.toUpperCase()} · Country:{' '}
                        {sched.targetCountry.toUpperCase()}
                      </span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {sched.repeatMode} · {sched.scheduledFor.replace('T', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{sched.message}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateExtras(
                          toggleScheduledNotificationStatus(extras, sched.id),
                          true
                        )
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border ${
                        sched.status === 'scheduled'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {sched.status === 'scheduled' ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Scheduled</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Paused</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateExtras(
                          removeScheduledNotification(extras, sched.id),
                          true
                        )
                      }
                      aria-label={`Delete scheduled push ${sched.title}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. User Engagement & Retention Boosters */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-start gap-2.5 pb-3 border-b border-slate-100">
              <Flame className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  User Engagement &amp; Retention Boosters (Live Community Poll + Streaks)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  यूजर्स को रोज़ ऐप खोलने के लिए प्रेरित करने वाले फ़ीचर्स — Daily Streak, Mood Chips, WhatsApp Status Share और Live Poll।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(
                [
                  ['dailyStreakEnabled', 'Daily Reading Streak'],
                  ['moodFilterEnabled', 'Mood Filter Chips'],
                  ['oneTapWhatsAppShare', '1-Tap WhatsApp Share'],
                  ['confettiOnFavorite', 'Heart Confetti Animation'],
                ] as const
              ).map(([key, label]) => {
                const enabled = extras.engagement_tools[key];
                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <span className="text-xs font-semibold text-slate-800">
                      {label}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() =>
                        onUpdateExtras(
                          {
                            ...extras,
                            engagement_tools: {
                              ...extras.engagement_tools,
                              [key]: !enabled,
                            },
                          },
                          true
                        )
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${
                        enabled ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Daily Reading Goal ({extras.engagement_tools.dailyShayariGoal}{' '}
                  Shayaris/day)
                </label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={extras.engagement_tools.dailyShayariGoal}
                  onChange={(e) =>
                    onUpdateExtras(
                      {
                        ...extras,
                        engagement_tools: {
                          ...extras.engagement_tools,
                          dailyShayariGoal: Number(e.target.value),
                        },
                      },
                      false
                    )
                  }
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Live App Community Poll Question
                  </label>
                  <input
                    type="text"
                    value={extras.engagement_tools.pollQuestion}
                    onChange={(e) =>
                      onUpdateExtras(
                        {
                          ...extras,
                          engagement_tools: {
                            ...extras.engagement_tools,
                            pollQuestion: e.target.value,
                          },
                        },
                        false
                      )
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Poll Option A
                  </label>
                  <input
                    type="text"
                    value={extras.engagement_tools.pollOptionA}
                    onChange={(e) =>
                      onUpdateExtras(
                        {
                          ...extras,
                          engagement_tools: {
                            ...extras.engagement_tools,
                            pollOptionA: e.target.value,
                          },
                        },
                        false
                      )
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Poll Option B
                  </label>
                  <input
                    type="text"
                    value={extras.engagement_tools.pollOptionB}
                    onChange={(e) =>
                      onUpdateExtras(
                        {
                          ...extras,
                          engagement_tools: {
                            ...extras.engagement_tools,
                            pollOptionB: e.target.value,
                          },
                        },
                        false
                      )
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
