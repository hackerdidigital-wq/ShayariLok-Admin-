import React, { useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowDown,
  ArrowUp,
  Bold,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  FileText,
  Heading2,
  HelpCircle,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Moon,
  Palette,
  Pencil,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AppBannerItem,
  AppControlStudioConfig,
  AppLocalizationExtras,
  FaqItem,
  GitHubSettings,
  ProxyAttemptLog,
  ProxySettings,
  ShayariLokConfig,
  ThemePresetId,
} from '../types/config';
import {
  DEFAULT_FAQ_CATEGORIES,
  deleteBanner,
  deleteFaqItem,
  deletePrivacySection,
  extractFaqCategories,
  filterFaqItems,
  isValidExternalActionUrl,
  moveBannerOrder,
  toggleBannerActive,
  upsertBanner,
  upsertFaqItem,
  upsertPrivacySection,
} from '../utils/appControlStudio';
import { isGitHubConfigured, uploadImageToGitHub } from '../utils/githubApi';
import { compressImageFileToBase64 } from '../utils/imageUpload';
import { THEME_PRESETS } from '../utils/localizationAndExtras';

export type AppStudioTabId = 'banners' | 'branding' | 'privacy' | 'faqs';

interface AppControlStudioSectionProps {
  config: ShayariLokConfig;
  extras: AppLocalizationExtras;
  control: AppControlStudioConfig;
  initialTab?: AppStudioTabId;
  user: User | null;
  realtimeStatus: 'live' | 'syncing' | 'local';
  lastSyncLatencyMs: number | null;
  githubSettings: GitHubSettings;
  proxySettings: ProxySettings;
  hostedPrivacyUrl?: string;
  onUpdateConfig: (patch: Partial<ShayariLokConfig>, instantSync?: boolean) => void;
  onUpdateExtras: (next: AppLocalizationExtras, instantSync?: boolean) => void;
  onUpdateControl: (next: AppControlStudioConfig, instantSync?: boolean) => void;
  onSaveAppConfigNow: () => Promise<void>;
  onAttemptLog?: (log: ProxyAttemptLog) => void;
}

export const AppControlStudioSection: React.FC<AppControlStudioSectionProps> = ({
  config,
  extras,
  control,
  initialTab = 'banners',
  user,
  realtimeStatus,
  lastSyncLatencyMs,
  githubSettings,
  proxySettings,
  hostedPrivacyUrl,
  onUpdateConfig,
  onUpdateExtras,
  onUpdateControl,
  onSaveAppConfigNow,
  onAttemptLog,
}) => {
  const [activeTab, setActiveTab] = useState<AppStudioTabId>(initialTab);
  const [savingCloud, setSavingCloud] = useState(false);

  // Banner CRUD state
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerActionUrl, setBannerActionUrl] = useState('');
  const [bannerCtaLabel, setBannerCtaLabel] = useState('Open Now');
  const [bannerActive, setBannerActive] = useState(true);
  const [bannerError, setBannerError] = useState('');
  const [uploadingBannerImg, setUploadingBannerImg] = useState(false);
  const [failedBannerImages, setFailedBannerImages] = useState<Record<string, boolean>>({});
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);

  // Branding & Logo state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadMsg, setLogoUploadMsg] = useState('');
  const [logoImgFailed, setLogoImgFailed] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Privacy Policy Editor state
  const privacyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [privacyPreviewMode, setPrivacyPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [secHeading, setSecHeading] = useState('');
  const [secBody, setSecBody] = useState('');
  const [editingSecId, setEditingSecId] = useState<string | null>(null);

  // FAQ CRUD state
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState('All');
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState<string>(DEFAULT_FAQ_CATEGORIES[0]);
  const [faqCustomCategory, setFaqCustomCategory] = useState('');
  const [faqActive, setFaqActive] = useState(true);
  const [faqError, setFaqError] = useState('');

  const githubWriteReady = isGitHubConfigured(githubSettings, true);

  const handleSaveCloudNow = async () => {
    setSavingCloud(true);
    try {
      await onSaveAppConfigNow();
    } finally {
      setSavingCloud(false);
    }
  };

  // --- Banner Upload & Handlers ---
  const resetBannerForm = () => {
    setEditingBannerId(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerImageUrl('');
    setBannerActionUrl('');
    setBannerCtaLabel('Open Now');
    setBannerActive(true);
    setBannerError('');
  };

  const handlePickBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBannerError('');
    setUploadingBannerImg(true);
    try {
      const compressed = await compressImageFileToBase64(file, 960, 0.78);
      if (githubWriteReady) {
        const repoPath = `images/banner-${Date.now()}.${compressed.ext}`;
        const uploaded = await uploadImageToGitHub(
          githubSettings,
          repoPath,
          compressed.base64,
          `Upload carousel banner image`,
          proxySettings,
          onAttemptLog
        );
        setBannerImageUrl(uploaded.jsdelivrUrl);
      } else {
        const smallPreview = await compressImageFileToBase64(file, 640, 0.68);
        setBannerImageUrl(smallPreview.previewDataUrl);
      }
    } catch (err) {
      setBannerError(
        err instanceof Error ? err.message : 'बैनर इमेज अपलोड विफल रही।'
      );
    } finally {
      setUploadingBannerImg(false);
    }
  };

  const handleSubmitBanner = (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError('');
    if (!bannerTitle.trim()) {
      setBannerError('बैनर का शीर्षक (Title) लिखना आवश्यक है।');
      return;
    }
    if (bannerActionUrl.trim() && !isValidExternalActionUrl(bannerActionUrl)) {
      setBannerError(
        'क्लिक लिंक https://, http://, whatsapp:// या tg:// से शुरू होना चाहिए।'
      );
      return;
    }

    const nextBanners = upsertBanner(control.banners, {
      id: editingBannerId ?? undefined,
      title: bannerTitle,
      subtitle: bannerSubtitle,
      imageUrl: bannerImageUrl,
      actionUrl: bannerActionUrl,
      ctaLabel: bannerCtaLabel,
      active: bannerActive,
    });
    onUpdateControl({ ...control, banners: nextBanners }, true);
    resetBannerForm();
  };

  const handleEditBanner = (banner: AppBannerItem) => {
    setEditingBannerId(banner.id);
    setBannerTitle(banner.title);
    setBannerSubtitle(banner.subtitle);
    setBannerImageUrl(banner.imageUrl);
    setBannerActionUrl(banner.actionUrl);
    setBannerCtaLabel(banner.ctaLabel);
    setBannerActive(banner.active);
    setBannerError('');
  };

  // --- Logo Upload & Theme Handlers ---
  const handlePickLogoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoUploadMsg('');
    setUploadingLogo(true);
    try {
      const compressed = await compressImageFileToBase64(file, 360, 0.8);
      if (githubWriteReady) {
        const repoPath = `images/app-logo-${Date.now()}.${compressed.ext}`;
        const uploaded = await uploadImageToGitHub(
          githubSettings,
          repoPath,
          compressed.base64,
          'Upload ShayariLok app logo',
          proxySettings,
          onAttemptLog
        );
        onUpdateControl({ ...control, app_logo_url: uploaded.jsdelivrUrl }, true);
        setLogoUploadMsg('Logo uploaded to CDN & synced.');
      } else {
        onUpdateControl(
          { ...control, app_logo_url: compressed.previewDataUrl },
          true
        );
        setLogoUploadMsg('Logo compressed & synced live.');
      }
      setLogoImgFailed(false);
    } catch (err) {
      setLogoUploadMsg(
        err instanceof Error ? err.message : 'Logo upload failed.'
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const theme = extras.dynamic_theme;
  const updateThemePatch = (patch: Partial<typeof theme>) => {
    onUpdateExtras(
      {
        ...extras,
        dynamic_theme: {
          ...theme,
          ...patch,
        },
      },
      true
    );
  };

  // --- Privacy Markdown Toolbar ---
  const insertPrivacyMarkdown = (
    prefix: string,
    suffix = '',
    placeholder = 'text'
  ) => {
    const el = privacyTextareaRef.current;
    const current = control.privacy_policy_text;
    if (!el) {
      onUpdateControl({
        ...control,
        privacy_policy_text: `${current}\n${prefix}${placeholder}${suffix}`,
      });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const selected = current.slice(start, end) || placeholder;
    const updated =
      current.slice(0, start) + prefix + selected + suffix + current.slice(end);
    onUpdateControl({ ...control, privacy_policy_text: updated });
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    });
  };

  const handleSavePrivacySection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secHeading.trim() && !secBody.trim()) return;
    const nextSections = upsertPrivacySection(control.privacy_policy_sections, {
      id: editingSecId ?? undefined,
      heading: secHeading,
      body: secBody,
    });
    onUpdateControl(
      { ...control, privacy_policy_sections: nextSections },
      true
    );
    setEditingSecId(null);
    setSecHeading('');
    setSecBody('');
  };

  // --- FAQ CRUD ---
  const faqCategories = useMemo(
    () => extractFaqCategories(control.faqs),
    [control.faqs]
  );
  const filteredFaqs = useMemo(
    () => filterFaqItems(control.faqs, faqCategoryFilter, faqSearch),
    [control.faqs, faqCategoryFilter, faqSearch]
  );

  const resetFaqForm = () => {
    setEditingFaqId(null);
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqCategory(DEFAULT_FAQ_CATEGORIES[0]);
    setFaqCustomCategory('');
    setFaqActive(true);
    setFaqError('');
  };

  const handleSubmitFaq = (e: React.FormEvent) => {
    e.preventDefault();
    setFaqError('');
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      setFaqError('प्रश्न (Question) और उत्तर (Answer) दोनों भरें।');
      return;
    }
    const resolvedCategory =
      faqCategory === '__custom__'
        ? faqCustomCategory.trim() || 'General'
        : faqCategory;
    const nextFaqs = upsertFaqItem(control.faqs, {
      id: editingFaqId ?? undefined,
      question: faqQuestion,
      answer: faqAnswer,
      category: resolvedCategory,
      active: faqActive,
    });
    onUpdateControl({ ...control, faqs: nextFaqs }, true);
    resetFaqForm();
  };

  const handleEditFaq = (item: FaqItem) => {
    setEditingFaqId(item.id);
    setFaqQuestion(item.question);
    setFaqAnswer(item.answer);
    if (
      (DEFAULT_FAQ_CATEGORIES as readonly string[]).includes(item.category)
    ) {
      setFaqCategory(item.category);
      setFaqCustomCategory('');
    } else {
      setFaqCategory('__custom__');
      setFaqCustomCategory(item.category);
    }
    setFaqActive(item.active);
    setFaqError('');
  };

  const TABS: Array<{
    id: AppStudioTabId;
    label: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'banners',
      label: 'Banners & Links',
      count: control.banners.length,
      icon: ImageIcon,
    },
    { id: 'branding', label: 'Branding & Dark Mode', icon: Palette },
    { id: 'privacy', label: 'Privacy & Legal', icon: ShieldCheck },
    {
      id: 'faqs',
      label: 'FAQ Manager',
      count: control.faqs.length,
      icon: HelpCircle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Studio Control Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono text-slate-700 font-semibold">
              publicSites/appConfig/main
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Radio className="w-3 h-3 text-emerald-600" />
              <span>
                {realtimeStatus === 'live'
                  ? `Firestore Live${lastSyncLatencyMs ? ` (${lastSyncLatencyMs}ms)` : ''}`
                  : realtimeStatus === 'syncing'
                    ? 'Syncing...'
                    : 'Local Preview Mode'}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {control.banners.length} banners · {control.faqs.length} FAQs
            </span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Live App Control Studio (Banners, Branding, Legal &amp; FAQs)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            बैनर, क्लिक लिंक, ऐप लोगो, डार्क/लाइट थीम, प्राइवेसी पॉलिसी और FAQ सीधे User App में लाइव सिंक करें।
          </p>
        </div>

        <button
          type="button"
          disabled={savingCloud}
          onClick={() => void handleSaveCloudNow()}
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <CloudUpload className="w-4 h-4" />
          <span>
            {savingCloud
              ? 'Syncing to Firestore...'
              : user
                ? 'Save & Sync AppConfig Live'
                : 'Save Local Preview'}
          </span>
        </button>
      </section>

      {/* Segmented Navigation Tabs */}
      <div
        role="tablist"
        aria-label="App Control Studio sections"
        className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-fit"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DYNAMIC BANNER & CLICKABLE LINK MANAGER */}
      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Create / Edit Banner Form */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingBannerId ? 'Edit Carousel Banner' : 'Add Carousel Banner'}
              </h3>
              {editingBannerId && (
                <button
                  type="button"
                  onClick={resetBannerForm}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 whitespace-nowrap"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitBanner} className="space-y-4">
              <div>
                <label
                  htmlFor="banner-title-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Banner Headline *
                </label>
                <input
                  id="banner-title-input"
                  type="text"
                  required
                  maxLength={120}
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. Join ShayariLok WhatsApp Channel"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="banner-subtitle-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Subtitle / Description
                </label>
                <input
                  id="banner-subtitle-input"
                  type="text"
                  maxLength={240}
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="Daily curated Hindi & Urdu couplets"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="banner-action-url-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Clickable Redirect URL (WhatsApp / Social / Custom)
                </label>
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    id="banner-action-url-input"
                    type="text"
                    maxLength={500}
                    value={bannerActionUrl}
                    onChange={(e) => setBannerActionUrl(e.target.value)}
                    placeholder="https://whatsapp.com/channel/..."
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="banner-cta-input"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Button Label
                  </label>
                  <input
                    id="banner-cta-input"
                    type="text"
                    maxLength={40}
                    value={bannerCtaLabel}
                    onChange={(e) => setBannerCtaLabel(e.target.value)}
                    placeholder="Open Now"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bannerActive}
                      onChange={(e) => setBannerActive(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Show in Active Carousel</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="banner-image-url-input"
                  className="block text-xs font-medium text-slate-700"
                >
                  Banner Image URL or Upload
                </label>
                <div className="flex gap-2">
                  <input
                    id="banner-image-url-input"
                    type="text"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://... or upload image"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => void handlePickBannerImage(e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingBannerImg}
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingBannerImg ? 'Uploading...' : 'Upload'}</span>
                  </button>
                </div>
              </div>

              {bannerError && (
                <p
                  role="alert"
                  className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  {bannerError}
                </p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{editingBannerId ? 'Update Banner' : 'Add Banner'}</span>
              </button>
            </form>
          </section>

          {/* Right: Active Banners List & Carousel Preview */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Carousel Banners ({control.banners.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Synced to Firestore{' '}
                  <code className="font-mono">publicSites/appConfig/banners</code>
                </p>
              </div>
            </div>

            {control.banners.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">
                  No Carousel Banners Configured
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add your first promotional or WhatsApp channel banner using the form on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {control.banners.map((banner, idx) => {
                  const hasValidUrl = isValidExternalActionUrl(banner.actionUrl);
                  const imgBroken = failedBannerImages[banner.id];
                  return (
                    <div
                      key={banner.id}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12">
                        {/* Thumbnail / Visual Preview */}
                        <div className="sm:col-span-4 relative min-h-[120px] bg-slate-900 overflow-hidden">
                          {banner.imageUrl && !imgBroken ? (
                            <img
                              src={banner.imageUrl}
                              alt={banner.title}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedBannerImages((prev) => ({
                                  ...prev,
                                  [banner.id]: true,
                                }))
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full p-4 flex flex-col justify-between text-white"
                              style={{
                                background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
                              }}
                            >
                              <span className="font-mono text-[10px] uppercase tracking-wider opacity-80">
                                Banner #{idx + 1}
                              </span>
                              <div className="font-display text-sm font-bold leading-snug line-clamp-2">
                                {banner.title}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Banner Details & Actions */}
                        <div className="sm:col-span-8 p-4 flex flex-col justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-display text-sm font-bold text-slate-900">
                                {banner.title}
                              </h4>
                              <span
                                className={`text-[11px] font-semibold shrink-0 ${
                                  banner.active
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                                }`}
                              >
                                {banner.active ? 'Active' : 'Paused'}
                              </span>
                            </div>
                            {banner.subtitle && (
                              <p className="text-xs text-slate-600">
                                {banner.subtitle}
                              </p>
                            )}
                            <div className="text-xs text-slate-500 font-mono truncate pt-0.5">
                              {banner.actionUrl ? (
                                <a
                                  href={hasValidUrl ? banner.actionUrl : undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-indigo-700 hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{banner.actionUrl}</span>
                                </a>
                              ) : (
                                'No redirect URL attached'
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                aria-label={`Move banner ${banner.title} up`}
                                onClick={() =>
                                  onUpdateControl(
                                    {
                                      ...control,
                                      banners: moveBannerOrder(
                                        control.banners,
                                        banner.id,
                                        'up'
                                      ),
                                    },
                                    true
                                  )
                                }
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === control.banners.length - 1}
                                aria-label={`Move banner ${banner.title} down`}
                                onClick={() =>
                                  onUpdateControl(
                                    {
                                      ...control,
                                      banners: moveBannerOrder(
                                        control.banners,
                                        banner.id,
                                        'down'
                                      ),
                                    },
                                    true
                                  )
                                }
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateControl(
                                    {
                                      ...control,
                                      banners: toggleBannerActive(
                                        control.banners,
                                        banner.id
                                      ),
                                    },
                                    true
                                  )
                                }
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap"
                              >
                                {banner.active ? 'Pause' : 'Activate'}
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label={`Edit banner ${banner.title}`}
                                onClick={() => handleEditBanner(banner)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md whitespace-nowrap"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete banner ${banner.title}`}
                                onClick={() =>
                                  onUpdateControl(
                                    {
                                      ...control,
                                      banners: deleteBanner(
                                        control.banners,
                                        banner.id
                                      ),
                                    },
                                    true
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md whitespace-nowrap"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: BRANDING, LOGO, THEME & DARK MODE CONTROLLER */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                Branding, Logo &amp; Global Theme Controller
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                App Name, Logo URL, Primary/Accent रंग और Global Dark/Light Mode डिफ़ॉल्ट को नियंत्रित करें।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="studio-app-name-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  App Name (<code className="font-mono">app_name</code>)
                </label>
                <input
                  id="studio-app-name-input"
                  type="text"
                  maxLength={80}
                  value={config.app_name}
                  onChange={(e) => onUpdateConfig({ app_name: e.target.value })}
                  placeholder="Shayari Lok"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="studio-logo-url-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  App Logo URL (<code className="font-mono">app_logo_url</code>)
                </label>
                <div className="flex gap-2">
                  <input
                    id="studio-logo-url-input"
                    type="text"
                    value={control.app_logo_url}
                    onChange={(e) => {
                      setLogoImgFailed(false);
                      onUpdateControl({
                        ...control,
                        app_logo_url: e.target.value,
                      });
                    }}
                    placeholder="https://... or upload logo"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => void handlePickLogoImage(e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => logoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingLogo ? '...' : 'Upload'}</span>
                  </button>
                </div>
                {logoUploadMsg && (
                  <p className="text-[11px] text-emerald-700 mt-1">
                    {logoUploadMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Global Dark / Light Mode Default Toggle */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {theme.darkModeEnabled ? (
                  <Moon className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Global User App Default Mode:{' '}
                    {theme.darkModeEnabled ? 'Dark Mode' : 'Light Mode'}
                  </div>
                  <p className="text-xs text-slate-500">
                    चालू करने पर यूजर ऐप सभी यूजर्स के लिए डिफ़ॉल्ट रूप से Dark Theme में खुलेगा।
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={theme.darkModeEnabled}
                aria-label="Toggle global dark mode default"
                onClick={() =>
                  updateThemePatch({ darkModeEnabled: !theme.darkModeEnabled })
                }
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  theme.darkModeEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    theme.darkModeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Primary & Accent Theme Colors + Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="branding-primary-color"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Primary Color ({theme.primaryColor})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="branding-primary-color"
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) =>
                      updateThemePatch({ primaryColor: e.target.value })
                    }
                    className="h-9 w-12 rounded border border-slate-200 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    aria-label="Primary color hex"
                    value={theme.primaryColor}
                    onChange={(e) =>
                      updateThemePatch({ primaryColor: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="branding-accent-color"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Accent Color ({theme.accentColor})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="branding-accent-color"
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) =>
                      updateThemePatch({ accentColor: e.target.value })
                    }
                    className="h-9 w-12 rounded border border-slate-200 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    aria-label="Accent color hex"
                    value={theme.accentColor}
                    onChange={(e) =>
                      updateThemePatch({ accentColor: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(THEME_PRESETS) as ThemePresetId[]).map((presetKey) => {
                const preset = THEME_PRESETS[presetKey];
                const isSelected = theme.presetId === presetKey;
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => updateThemePatch({ ...preset.config })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {preset.label}
                      </span>
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: preset.config.primaryColor }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right: Live Mobile User App Branding Preview */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Live User App Theme Preview
                </h3>
                <p className="text-xs text-slate-500">
                  {theme.darkModeEnabled ? 'Dark Canvas Active' : 'Light Canvas Active'}
                </p>
              </div>
            </div>

            <div
              className={`border rounded-2xl overflow-hidden transition-colors ${
                theme.darkModeEnabled
                  ? 'bg-slate-950 border-slate-800 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div
                className="px-4 py-3.5 text-white flex items-center gap-3"
                style={{
                  background: theme.gradientEnabled
                    ? `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`
                    : theme.primaryColor,
                }}
              >
                {control.app_logo_url && !logoImgFailed ? (
                  <img
                    src={control.app_logo_url}
                    alt={`${config.app_name} logo`}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoImgFailed(true)}
                    className="w-9 h-9 rounded-lg object-cover bg-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-display font-bold text-sm shrink-0">
                    {(config.app_name || 'S').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm truncate">
                    {config.app_name || 'Shayari Lok'}
                  </div>
                  <div className="text-[11px] opacity-85">
                    v{config.latest_version_code} · Live Preview
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {control.banners[0] && (
                  <div
                    className="p-3 rounded-xl text-white text-xs space-y-1"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <div className="font-bold">{control.banners[0].title}</div>
                    <div className="opacity-85">
                      {control.banners[0].ctaLabel} →
                    </div>
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    theme.darkModeEnabled
                      ? 'bg-slate-900 border-slate-800 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <p className="leading-relaxed">
                    {config.shayari_list[0]?.text ||
                      'दिल की बात, शायरी के साथ।'}
                  </p>
                  <div className="flex justify-end">
                    <span
                      className="px-2.5 py-1 rounded text-[11px] font-semibold text-white"
                      style={{ backgroundColor: theme.accentColor }}
                    >
                      Share Shayari
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: PRIVACY POLICY & LEGAL EDITOR */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Privacy Policy &amp; Legal Editor
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  ऐप की Privacy Policy शीर्षक, पूरा टेक्स्ट, सेक्शन और लाइव URL अपडेट करें।
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setPrivacyPreviewMode('edit')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md ${
                    privacyPreviewMode === 'edit'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyPreviewMode('preview')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md ${
                    privacyPreviewMode === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Live Preview
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="privacy-title-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Policy Title (<code className="font-mono">privacy_policy_title</code>)
                </label>
                <input
                  id="privacy-title-input"
                  type="text"
                  maxLength={160}
                  value={control.privacy_policy_title}
                  onChange={(e) =>
                    onUpdateControl({
                      ...control,
                      privacy_policy_title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="privacy-updated-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Effective Date
                </label>
                <input
                  id="privacy-updated-input"
                  type="text"
                  maxLength={30}
                  value={control.privacy_last_updated}
                  onChange={(e) =>
                    onUpdateControl({
                      ...control,
                      privacy_last_updated: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="studio-privacy-url-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Policy URL (<code className="font-mono">privacy_policy_url</code>)
                </label>
                <div className="flex gap-2">
                  <input
                    id="studio-privacy-url-input"
                    type="url"
                    value={config.privacy_policy_url}
                    onChange={(e) =>
                      onUpdateConfig({ privacy_policy_url: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  />
                  {hostedPrivacyUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ privacy_policy_url: hostedPrivacyUrl }, true)
                      }
                      className="px-2.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 whitespace-nowrap shrink-0"
                    >
                      Use Hosted
                    </button>
                  )}
                </div>
              </div>
            </div>

            {privacyPreviewMode === 'edit' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="privacy-body-textarea"
                    className="text-xs font-medium text-slate-700"
                  >
                    Full Privacy Policy Content (
                    <code className="font-mono">privacy_policy_text</code>)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertPrivacyMarkdown('**', '**', 'bold')}
                      aria-label="Bold"
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPrivacyMarkdown('*', '*', 'italic')}
                      aria-label="Italic"
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPrivacyMarkdown('\n## ', '', 'Heading')}
                      aria-label="Heading"
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPrivacyMarkdown('\n- ', '', 'List item')}
                      aria-label="Bullet list"
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <textarea
                  ref={privacyTextareaRef}
                  id="privacy-body-textarea"
                  rows={9}
                  value={control.privacy_policy_text}
                  onChange={(e) =>
                    onUpdateControl({
                      ...control,
                      privacy_policy_text: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>
            ) : (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-display text-base font-bold text-slate-900">
                    {control.privacy_policy_title}
                  </h4>
                  <span className="font-mono text-xs text-slate-500">
                    Updated: {control.privacy_last_updated}
                  </span>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {control.privacy_policy_text}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSaveCloudNow()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save &amp; Sync Privacy Policy</span>
              </button>
            </div>
          </section>

          {/* Structured Privacy Sections for Native App */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="font-display text-sm font-bold text-slate-900">
                Structured Legal Sections ({control.privacy_policy_sections.length})
              </h3>
            </div>

            <form
              onSubmit={handleSavePrivacySection}
              className="grid grid-cols-1 md:grid-cols-12 gap-3"
            >
              <input
                type="text"
                placeholder="Section heading (e.g. 4. Data Retention)"
                value={secHeading}
                onChange={(e) => setSecHeading(e.target.value)}
                className="md:col-span-4 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder="Section body text..."
                value={secBody}
                onChange={(e) => setSecBody(e.target.value)}
                className="md:col-span-6 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              />
              <button
                type="submit"
                className="md:col-span-2 px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
              >
                {editingSecId ? 'Update Section' : 'Add Section'}
              </button>
            </form>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {control.privacy_policy_sections.map((sec) => (
                <div
                  key={sec.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">
                      {sec.heading}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{sec.body}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSecId(sec.id);
                        setSecHeading(sec.heading);
                        setSecBody(sec.body);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateControl(
                          {
                            ...control,
                            privacy_policy_sections: deletePrivacySection(
                              control.privacy_policy_sections,
                              sec.id
                            ),
                          },
                          true
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: FAQ MANAGEMENT SYSTEM */}
      {activeTab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Create / Update FAQ */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingFaqId ? 'Edit FAQ Entry' : 'Create New FAQ'}
              </h3>
              {editingFaqId && (
                <button
                  type="button"
                  onClick={resetFaqForm}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitFaq} className="space-y-4">
              <div>
                <label
                  htmlFor="faq-category-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Category
                </label>
                <select
                  id="faq-category-select"
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  {DEFAULT_FAQ_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">Custom Category...</option>
                </select>
              </div>

              {faqCategory === '__custom__' && (
                <div>
                  <label
                    htmlFor="faq-custom-category"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Custom Category Name
                  </label>
                  <input
                    id="faq-custom-category"
                    type="text"
                    maxLength={60}
                    value={faqCustomCategory}
                    onChange={(e) => setFaqCustomCategory(e.target.value)}
                    placeholder="e.g. Premium Membership"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="faq-question-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Question *
                </label>
                <input
                  id="faq-question-input"
                  type="text"
                  required
                  maxLength={300}
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="How do users bookmark their favorite Shayari?"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="faq-answer-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Answer *
                </label>
                <textarea
                  id="faq-answer-input"
                  required
                  rows={4}
                  maxLength={2000}
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Write a clear answer for the User App FAQ screen..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={faqActive}
                  onChange={(e) => setFaqActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Visible in User App FAQ Screen</span>
              </label>

              {faqError && (
                <p
                  role="alert"
                  className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  {faqError}
                </p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{editingFaqId ? 'Update FAQ' : 'Add FAQ Item'}</span>
              </button>
            </form>
          </section>

          {/* Right: Filterable FAQ List */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  User App FAQs ({filteredFaqs.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Synced to Firestore{' '}
                  <code className="font-mono">publicSites/appConfig/faqs</code>
                </p>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  aria-label="Search FAQs"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search FAQs..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {faqCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFaqCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    faqCategoryFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">
                  No FAQs Found
                </div>
                <p className="text-xs text-slate-500">
                  Add a new help topic or adjust your category filter.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredFaqs.map((faq, idx) => (
                  <div key={faq.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono tabular-nums">
                            #{idx + 1}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{faq.category}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              faq.active ? 'text-emerald-700' : 'text-slate-400'
                            }
                          >
                            {faq.active ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-bold text-slate-900">
                          {faq.question}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Edit FAQ ${faq.question}`}
                          onClick={() => handleEditFaq(faq)}
                          className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-md"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete FAQ ${faq.question}`}
                          onClick={() =>
                            onUpdateControl(
                              {
                                ...control,
                                faqs: deleteFaqItem(control.faqs, faq.id),
                              },
                              true
                            )
                          }
                          className="p-1.5 text-red-700 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
