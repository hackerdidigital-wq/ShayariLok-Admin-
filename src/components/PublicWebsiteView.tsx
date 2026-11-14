import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  ListOrdered,
  Menu,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { copyTextWithFeedback } from '../utils/clipboardToast';
import heroJournalImg from '../assets/images/shayari_hero_journal_1794594369519.jpg';
import loveSunsetImg from '../assets/images/shayari_love_sunset_1794595124934.jpg';
import rainWindowImg from '../assets/images/shayari_rain_window_1794595125243.jpg';
import suvicharDeskImg from '../assets/images/suvichar_morning_desk_1794595125343.jpg';
import type {
  PhotoShayariThemeId,
  ShayariLokConfig,
  WebsiteContentSettings,
} from '../types/config';
import { PACKAGE_ID } from '../utils/configHelpers';
import {
  filterPublicShayaris,
  groupCategoryCounts,
  resolveEffectivePolicyUrl,
  type PublicSitePageId,
} from '../utils/siteRoutes';
import {
  DEFAULT_WEBSITE_SOCIAL_LINKS,
  PHOTO_THEME_META,
} from '../utils/websiteContent';

interface PublicWebsiteViewProps {
  page: PublicSitePageId;
  onNavigatePage: (page: PublicSitePageId) => void;
  onBackToAdmin?: () => void;
  config: ShayariLokConfig;
  websiteContent: WebsiteContentSettings;
  organizationName: string;
  supportEmail: string;
  publicSyncState: 'local' | 'loading' | 'live' | 'error';
  publicSyncMessage: string;
  standalonePrivacyHref?: string;
  standaloneWebsiteHref?: string;
  isPrivacyOnlyMode?: boolean;
}

const SITE_NAV_ITEMS: Array<{ id: PublicSitePageId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'shayari', label: 'Shayari' },
  { id: 'suvichar', label: 'Suvichar' },
  { id: 'updates', label: 'Updates' },
  { id: 'privacy', label: 'Privacy' },
];

const THEME_IMAGE_SRC: Record<PhotoShayariThemeId, string> = {
  sunset_love: loveSunsetImg,
  morning_chai: suvicharDeskImg,
  monsoon_rain: rainWindowImg,
  journal_ink: heroJournalImg,
};

const THEME_FALLBACK_GRADIENT: Record<PhotoShayariThemeId, string> = {
  sunset_love: 'from-rose-950 via-amber-900 to-slate-950',
  morning_chai: 'from-emerald-950 via-amber-950 to-slate-950',
  monsoon_rain: 'from-slate-950 via-indigo-950 to-slate-900',
  journal_ink: 'from-stone-900 via-slate-900 to-indigo-950',
};

export const PublicWebsiteView: React.FC<PublicWebsiteViewProps> = ({
  page,
  onNavigatePage,
  onBackToAdmin,
  config,
  websiteContent,
  organizationName,
  supportEmail,
  publicSyncState,
  publicSyncMessage,
  standalonePrivacyHref,
  standaloneWebsiteHref,
  isPrivacyOnlyMode = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suvicharCategory, setSuvicharCategory] = useState<string>('All');
  const [suvicharSearch, setSuvicharSearch] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [heroImgError, setHeroImgError] = useState(false);
  const [brokenPhotoThemes, setBrokenPhotoThemes] = useState<
    Partial<Record<PhotoShayariThemeId, boolean>>
  >({});
  const [brokenShayariImgs, setBrokenShayariImgs] = useState<
    Record<number, boolean>
  >({});

  const brandName = config.app_name.trim() || 'Shayari Lok';
  const orgName = organizationName.trim() || 'CyberKing Studios';
  const controls = websiteContent.controls;

  const filteredShayaris = useMemo(
    () => filterPublicShayaris(config.shayari_list, selectedCategory, searchQuery),
    [config.shayari_list, selectedCategory, searchQuery]
  );
  const categoryCounts = useMemo(() => groupCategoryCounts(config), [config]);

  const suvicharCategories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const s of websiteContent.suvichar_list) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set);
  }, [websiteContent.suvichar_list]);

  const filteredSuvichars = useMemo(() => {
    const q = suvicharSearch.trim().toLowerCase();
    return websiteContent.suvichar_list.filter((item) => {
      const catMatch =
        suvicharCategory === 'All' || item.category === suvicharCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        item.text.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [websiteContent.suvichar_list, suvicharCategory, suvicharSearch]);

  const handleCopyText = async (key: string, text: string, author: string) => {
    const formatted = `${text}\n\n— ${author} (${brandName})`;
    const ok = await copyTextWithFeedback(formatted, brandName);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    }
  };

  const scrollToPolicySection = (sectionId: string) => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F7F7] text-slate-900 flex flex-col">
      {/* Classic Forest Green Top Header (#2D5E36 matching shayarilok.in) — Zero Admin Chrome */}
      <header className="sticky top-0 z-40 h-16 bg-[#2D5E36] text-white border-b border-[#234b2a] px-4 sm:px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4 sm:gap-6">
          {/* Zone 1: Classic Serif Brand Wordmark */}
          {isPrivacyOnlyMode && standaloneWebsiteHref ? (
            <a
              href={standaloneWebsiteHref}
              className="font-editorial-serif text-xl sm:text-2xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
            >
              {brandName}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onNavigatePage('home')}
              className="font-editorial-serif text-xl sm:text-2xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 text-left"
            >
              {brandName}
            </button>
          )}

          {/* Zone 2: 5 Concise Single-Line Nav Links */}
          <nav
            aria-label="Website navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-emerald-50/90"
          >
            {SITE_NAV_ITEMS.map((item) => {
              const active = page === item.id;
              if (
                !onBackToAdmin &&
                item.id === 'privacy' &&
                standalonePrivacyHref &&
                !isPrivacyOnlyMode
              ) {
                return (
                  <a
                    key={item.id}
                    href={standalonePrivacyHref}
                    className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors ${
                      active
                        ? 'text-white font-semibold border-b-2 border-white'
                        : 'hover:text-white'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              }
              if (isPrivacyOnlyMode && item.id !== 'privacy' && standaloneWebsiteHref) {
                const targetUrl =
                  item.id === 'home'
                    ? standaloneWebsiteHref
                    : `${standaloneWebsiteHref}${standaloneWebsiteHref.includes('?') ? '&' : '?'}page=${item.id}`;
                return (
                  <a
                    key={item.id}
                    href={targetUrl}
                    className="whitespace-nowrap shrink-0 pb-0.5 hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigatePage(item.id)}
                  className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors ${
                    active
                      ? 'text-white font-semibold border-b-2 border-white'
                      : 'hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Live Notification Bell + Download CTA + Mobile Menu (Zero Admin Button) */}
          <div className="flex items-center gap-2 shrink-0">
            {controls.showNotificationBell && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifDrawerOpen((prev) => !prev)}
                  aria-label="Open live notifications"
                  aria-expanded={notifDrawerOpen}
                  className="relative p-2.5 rounded-lg border border-white/25 bg-white/10 text-white hover:bg-white/20 transition-colors shrink-0"
                >
                  <Bell className="w-4 h-4" />
                  {config.notifications.length > 0 && (
                    <span
                      data-testid="website-notif-badge"
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-bold tabular-nums"
                    >
                      {config.notifications.length}
                    </span>
                  )}
                </button>

                {notifDrawerOpen && (
                  <div
                    role="region"
                    aria-label="Website live notifications"
                    className="fixed inset-x-4 top-[72px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-700" />
                        <span className="font-display text-sm font-bold text-slate-900">
                          Live Notifications ({config.notifications.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifDrawerOpen(false)}
                        aria-label="Close notifications drawer"
                        className="p-1 text-slate-500 hover:text-slate-900 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {controls.showAnnouncementBanner &&
                      (config.announcement_title || config.announcement_message) && (
                        <div className="p-3.5 bg-indigo-50/70 border-b border-indigo-100 space-y-1">
                          <div className="text-[11px] font-semibold text-indigo-700">
                            Pinned Announcement
                          </div>
                          <div className="text-xs font-semibold text-slate-900">
                            {config.announcement_title}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {config.announcement_message}
                          </p>
                        </div>
                      )}

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {config.notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          अभी कोई लाइव सूचना उपलब्ध नहीं है।
                        </div>
                      ) : (
                        config.notifications.map((n) => (
                          <div key={n.id} className="p-3.5 space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 tabular-nums">
                              <span className="font-semibold text-indigo-700">
                                {n.badge}
                              </span>
                              <span>{n.time_label}</span>
                            </div>
                            <div className="text-xs font-semibold text-slate-900">
                              {n.title}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        App v{config.latest_version_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNotifDrawerOpen(false);
                          if (isPrivacyOnlyMode && standaloneWebsiteHref) {
                            window.location.href = `${standaloneWebsiteHref}${standaloneWebsiteHref.includes('?') ? '&' : '?'}page=updates`;
                          } else {
                            onNavigatePage('updates');
                          }
                        }}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        View Updates Portal →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <a
              href={config.force_update_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#1f4626] bg-white rounded-lg hover:bg-emerald-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download App</span>
              <span className="sm:hidden">App</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? 'Close website menu' : 'Open website menu'}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-white hover:bg-white/10 shrink-0"
            >
              {mobileNavOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1">
          {SITE_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                if (
                  !onBackToAdmin &&
                  item.id === 'privacy' &&
                  standalonePrivacyHref &&
                  !isPrivacyOnlyMode
                ) {
                  window.location.href = standalonePrivacyHref;
                  return;
                }
                if (isPrivacyOnlyMode && item.id !== 'privacy' && standaloneWebsiteHref) {
                  const targetUrl =
                    item.id === 'home'
                      ? standaloneWebsiteHref
                      : `${standaloneWebsiteHref}${standaloneWebsiteHref.includes('?') ? '&' : '?'}page=${item.id}`;
                  window.location.href = targetUrl;
                  return;
                }
                onNavigatePage(item.id);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                page === item.id
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Live Maintenance Notice Banner (Controlled by Admin Notification Panel + config.json) */}
      {controls.showMaintenanceNotice && config.maintenance_mode && (
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-3"
        >
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 text-xs sm:text-sm font-medium text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Maintenance Notice:</strong> {config.maintenance_message}
            </span>
          </div>
        </div>
      )}

      {/* Optional Remote Repo / Cloud Loading Strip */}
      {publicSyncState === 'loading' && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 sm:px-8 py-2 text-xs text-indigo-800 text-center">
          Syncing live Shayari Lok content...
        </div>
      )}
      {publicSyncState === 'error' && publicSyncMessage && (
        <div className="bg-red-50 border-b border-red-200 px-4 sm:px-8 py-2 text-xs text-red-700 text-center">
          {publicSyncMessage}
        </div>
      )}

      {/* PAGE 1: Official Public Website Home */}
      {page === 'home' && (
        <main className="flex-1 w-full">
          {/* Hero Split */}
          <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6">
                <div className="space-y-4">
                  <div className="text-xs font-mono text-slate-500 tabular-nums">
                    {orgName} · {PACKAGE_ID} · Release v{config.latest_version_code}
                  </div>
                  <h1 className="font-display text-[clamp(1.9rem,3.8vw,3.2rem)] font-bold tracking-tight leading-[1.14] text-slate-900 text-balance">
                    {websiteContent.heroHeadline}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                    {websiteContent.heroSubheadline}
                  </p>
                </div>

                {/* Live Announcement from Admin Notification Panel */}
                {controls.showAnnouncementBanner &&
                  (config.announcement_title || config.announcement_message) && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="text-xs font-semibold text-indigo-700">
                        {config.announcement_title || 'Latest Announcement'}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700">
                        {config.announcement_message}
                      </p>
                    </div>
                  )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigatePage('shayari')}
                    className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-700 rounded-xl hover:bg-indigo-800 transition-colors whitespace-nowrap"
                  >
                    <BookOpenText className="w-4 h-4" />
                    <span>Explore All Shayaris</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {controls.showSuvicharSection && (
                    <button
                      type="button"
                      onClick={() => onNavigatePage('suvichar')}
                      className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>आज के सुविचार ({websiteContent.suvichar_list.length})</span>
                    </button>
                  )}

                  {config.social_link && (
                    <a
                      href={config.social_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      <span>Join Channel</span>
                      <ExternalLink className="w-4 h-4 text-slate-500" />
                    </a>
                  )}
                </div>
              </div>

              {/* Hero Image Card */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                {!heroImgError ? (
                  <img
                    src={heroJournalImg}
                    alt={`${brandName} Hindi poetry notebook and brass pen`}
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-64 lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-64 lg:h-full bg-gradient-to-br from-amber-50 via-stone-100 to-indigo-50 flex flex-col items-center justify-center p-8 text-center">
                    <BookOpenText className="w-10 h-10 text-indigo-700 mb-3" />
                    <div className="font-display text-lg font-bold text-slate-900">
                      {brandName}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Curated Hindi &amp; Hinglish Shayari Collection
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Full-Width 4-Metric Row */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-medium text-slate-500">
                  Live Shayaris
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {config.shayari_list.length}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-medium text-slate-500">
                  Photo Shayari &amp; Suvichar
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {websiteContent.photo_shayari_list.length + websiteContent.suvichar_list.length}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-medium text-slate-500">
                  Android Release
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  v{config.latest_version_code}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-medium text-slate-500">
                  Categories
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {categoryCounts.length}
                </div>
              </div>
            </div>
          </section>

          {/* PHOTO SHAYARI STUDIO CARDS */}
          {controls.showPhotoShayariSection &&
            websiteContent.photo_shayari_list.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>PHOTO SHAYARI GALLERY</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900">
                      फोटो शायरी डिज़ाइन कार्ड्स
                    </h2>
                    <p className="text-sm text-slate-600">
                      खूबसूरत बैकग्राउंड फ़ोटोग्राफ़ी पर सजी चुनिंदा हिंदी शायरियाँ — सीधे पढ़ें और कॉपी करें।
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {websiteContent.photo_shayari_list.map((card) => {
                    const copyKey = `photo-${card.id}`;
                    const isCopied = copiedKey === copyKey;
                    const themeImg = THEME_IMAGE_SRC[card.theme];
                    const imgBroken = Boolean(brokenPhotoThemes[card.theme]);

                    return (
                      <article
                        key={card.id}
                        className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group"
                      >
                        {!imgBroken ? (
                          <img
                            src={themeImg}
                            alt={`${card.category} photo shayari backdrop (${PHOTO_THEME_META[card.theme].label})`}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setBrokenPhotoThemes((prev) => ({
                                ...prev,
                                [card.theme]: true,
                              }))
                            }
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${THEME_FALLBACK_GRADIENT[card.theme]}`}
                          />
                        )}

                        {/* High-contrast dark scrim (>=4.5:1 white text contrast) */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/25" />

                        <div className="relative h-full p-6 sm:p-8 flex flex-col justify-between text-white">
                          <div className="flex items-center justify-between gap-2 text-xs font-mono text-white/85 tabular-nums">
                            <span>{card.category}</span>
                            <span>{PHOTO_THEME_META[card.theme].label}</span>
                          </div>

                          <div className="space-y-4">
                            <p className="font-display text-lg sm:text-xl font-semibold leading-relaxed whitespace-pre-line text-white drop-shadow-xs shayari-prose">
                              {card.text}
                            </p>

                            <div className="pt-3 border-t border-white/20 flex items-center justify-between gap-3">
                              <span className="text-xs sm:text-sm font-medium text-white/90">
                                — {card.author} · {brandName}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopyText(copyKey, card.text, card.author)
                                }
                                aria-label={`Copy photo shayari #${card.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white/95 rounded-lg hover:bg-white transition-colors shrink-0"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                                    <span className="text-emerald-700">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Shayari</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

          {/* TODAY'S SUVICHAR SECTION (Controlled live by Admin) */}
          {controls.showSuvicharSection &&
            websiteContent.suvichar_list.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>DAILY INSPIRATION</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900">
                      आज के सुविचार (Suvichar)
                    </h2>
                    <p className="text-sm text-slate-600">
                      दिन की सकारात्मक शुरुआत के लिए प्रेरणादायक हिंदी सुविचार।
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigatePage('suvichar')}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 self-start sm:self-auto"
                  >
                    <span>All Suvichars ({websiteContent.suvichar_list.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {websiteContent.suvichar_list.slice(0, 4).map((suvichar) => {
                    const copyKey = `suv-${suvichar.id}`;
                    const isCopied = copiedKey === copyKey;
                    return (
                      <article
                        key={suvichar.id}
                        className="bg-amber-50/55 border border-amber-200/80 rounded-2xl p-6 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="text-xs font-mono text-amber-900/80 tabular-nums">
                            {suvichar.category} · सुविचार #{suvichar.id}
                          </div>
                          <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed shayari-prose">
                            “{suvichar.text}”
                          </p>
                        </div>

                        <div className="pt-3 border-t border-amber-200/70 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-700">
                            — {suvichar.author}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopyText(
                                copyKey,
                                suvichar.text,
                                suvichar.author
                              )
                            }
                            aria-label={`Copy suvichar #${suvichar.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-amber-200 rounded-lg hover:bg-amber-100/60"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

          {/* Featured Live Shayari Feed */}
          <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Featured Shayari Collection
                </h2>
                <p className="text-sm text-slate-600">
                  कैटेगरी चुनें और किसी भी शायरी को 1-क्लिक में कॉपी करें।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                {config.categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-white text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredShayaris.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  इस कैटेगरी में अभी कोई शायरी उपलब्ध नहीं है।
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg"
                >
                  Show All Categories
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredShayaris.slice(0, 6).map((item) => {
                  const copyKey = `home-sh-${item.id}`;
                  const isCopied = copiedKey === copyKey;
                  const showItemImg = Boolean(
                    item.image_url?.trim() && !brokenShayariImgs[item.id]
                  );
                  return (
                    <article
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      {showItemImg && (
                        <img
                          src={item.image_url}
                          alt={`${item.category} shayari visual`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenShayariImgs((prev) => ({
                              ...prev,
                              [item.id]: true,
                            }))
                          }
                          className="w-full h-44 object-cover border-b border-slate-100"
                        />
                      )}
                      <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                        <div className="space-y-3">
                          <div className="text-xs font-medium text-[#2D5E36] font-mono tabular-nums">
                            {item.category} · #{item.id}
                          </div>
                          <p className="text-base text-slate-900 whitespace-pre-line leading-relaxed shayari-prose">
                            {item.text}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-600">
                            — {item.author}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopyText(copyKey, item.text, item.author)
                            }
                            aria-label={`Copy shayari #${item.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                <span className="text-emerald-700">Copied Successfully!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {filteredShayaris.length > 6 && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => onNavigatePage('shayari')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-indigo-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  <span>View All {filteredShayaris.length} Shayaris</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        </main>
      )}

      {/* PAGE 2: Full-Screen Shayari Reader Portal */}
      {page === 'shayari' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                {brandName} — Live Shayari &amp; Photo Library
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                सभी लाइव कैटेगरी और हिंदी/Hinglish शायरियाँ खोजें, पढ़ें और कॉपी करें।
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="शायरी या लेखक का नाम खोजें..."
                aria-label="Search public shayaris"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              {config.categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="font-mono text-xs text-slate-500 tabular-nums">
              Showing {filteredShayaris.length} of {config.shayari_list.length}{' '}
              shayaris
            </div>
          </div>

          {filteredShayaris.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <p className="text-sm text-slate-600">
                आपकी खोज से मेल खाने वाली कोई शायरी नहीं मिली।
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShayaris.map((item) => {
                const copyKey = `lib-${item.id}`;
                const isCopied = copiedKey === copyKey;
                const showItemImg = Boolean(
                  item.image_url?.trim() && !brokenShayariImgs[item.id]
                );
                return (
                  <article
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    {showItemImg && (
                      <img
                        src={item.image_url}
                        alt={`${item.category} shayari visual`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenShayariImgs((prev) => ({
                            ...prev,
                            [item.id]: true,
                          }))
                        }
                        className="w-full h-44 object-cover border-b border-slate-100"
                      />
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                      <div className="space-y-3">
                        <div className="text-xs font-medium text-[#2D5E36] font-mono tabular-nums">
                          {item.category} · #{item.id}
                        </div>
                        <p className="text-base text-slate-900 whitespace-pre-line leading-relaxed shayari-prose">
                          {item.text}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-600">
                          — {item.author}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyText(copyKey, item.text, item.author)
                          }
                          aria-label={`Copy shayari #${item.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="text-emerald-700">Copied Successfully!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* PAGE 3: Dedicated Suvichar Portal */}
      {page === 'suvichar' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                {brandName} — अनमोल सुविचार (Suvichar)
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                जीवन, सफलता और सकारात्मक सोच पर आधारित प्रेरणादायक सुविचार पढ़ें और शेयर करें।
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={suvicharSearch}
                onChange={(e) => setSuvicharSearch(e.target.value)}
                placeholder="सुविचार या लेखक खोजें..."
                aria-label="Search suvichars"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg w-fit">
            {suvicharCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSuvicharCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  suvicharCategory === cat
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredSuvichars.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-600">
              कोई सुविचार नहीं मिला।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredSuvichars.map((suv) => {
                const copyKey = `page-suv-${suv.id}`;
                const isCopied = copiedKey === copyKey;
                return (
                  <article
                    key={suv.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="text-xs font-mono text-amber-800 tabular-nums">
                        {suv.category} · #{suv.id}
                      </div>
                      <p className="text-base sm:text-lg text-slate-900 leading-relaxed shayari-prose">
                        “{suv.text}”
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600">
                        — {suv.author}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyText(copyKey, suv.text, suv.author)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* PAGE 4: Live Updates & Bell Notifications Portal */}
      {page === 'updates' && (
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="pb-5 border-b border-slate-200">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Updates, Notifications &amp; App Releases
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {brandName} एंड्रॉइड ऐप के ताज़ा अपडेट्स, घोषणाएं और कम्युनिटी सूचनाएं।
            </p>
          </div>

          {controls.showAnnouncementBanner && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
              <div className="text-xs font-semibold text-indigo-700">
                Pinned App Announcement
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {config.announcement_title || 'App Update Notice'}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {config.announcement_message}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Bell className="w-4 h-4 text-indigo-700" />
              <span>Active App Notifications ({config.notifications.length})</span>
            </div>

            {config.notifications.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                अभी कोई सूचना प्रकाशित नहीं की गई है।
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {config.notifications.map((n) => (
                  <div key={n.id} className="p-5 space-y-1.5">
                    <div className="text-xs font-mono text-slate-500 tabular-nums">
                      {n.badge} · {n.time_label} · #{n.id}
                    </div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {n.title}
                    </h3>
                    <p className="text-sm text-slate-600">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-slate-500 tabular-nums">
                Latest Build: v{config.latest_version_code} · {PACKAGE_ID}
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                Android App Download &amp; Community Channel
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <a
                href={config.force_update_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg hover:bg-indigo-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Get Latest APK / Play Store</span>
              </a>
              {config.social_link && (
                <a
                  href={config.social_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  <span>Follow Channel</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </main>
      )}

      {/* PAGE 5: Classic ("Purane Andaj") Hosted Privacy Policy Website */}
      {page === 'privacy' && (
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6">
            <div className="space-y-1.5">
              <h1 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-slate-900">
                Privacy Policy
              </h1>
              <p className="text-xs font-mono text-slate-500 tabular-nums">
                {brandName} · {PACKAGE_ID} · Published by {orgName}
              </p>
            </div>

            {/* Classic Bordered Collapsible Table of Contents Box */}
            <div className="border border-slate-300 rounded-md bg-[#FAFAFA] p-4 sm:p-5 max-w-md">
              <div className="flex items-center justify-between gap-3">
                <span className="font-editorial-serif text-lg font-bold text-slate-900">
                  Table of Contents
                </span>
                <button
                  type="button"
                  onClick={() => setTocOpen((prev) => !prev)}
                  aria-expanded={tocOpen}
                  aria-label="Toggle table of contents"
                  className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 rounded bg-white text-slate-600 hover:bg-slate-100"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  {tocOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {tocOpen && (
                <ol className="mt-3 space-y-1.5 text-sm font-editorial-serif text-slate-800">
                  {[
                    { id: 'who-we-are', num: '1.', label: 'Who we are' },
                    {
                      id: 'remote-config',
                      num: '2.',
                      label: 'Remote Shayari & Real-Time Configuration',
                    },
                    {
                      id: 'advertising',
                      num: '3.',
                      label: 'Advertising & Third-Party AdMob Services',
                    },
                    { id: 'cookies', num: '4.', label: 'Local Storage & Cookies' },
                    {
                      id: 'embedded-content',
                      num: '5.',
                      label: 'Images, Photo Shayari & External Links',
                    },
                    {
                      id: 'data-sharing',
                      num: '6.',
                      label: 'Who we share your data with',
                    },
                    {
                      id: 'data-retention',
                      num: '7.',
                      label: 'How long we retain your data',
                    },
                    {
                      id: 'your-rights',
                      num: '8.',
                      label: 'What rights you have over your data',
                    },
                    {
                      id: 'contact-official',
                      num: '9.',
                      label: 'Contact, Official Website & Policy URL',
                    },
                  ].map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => scrollToPolicySection(item.id)}
                        className="text-left hover:text-[#2D5E36] hover:underline transition-colors"
                      >
                        <span className="mr-1.5 text-slate-500">{item.num}</span>
                        <span>{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="space-y-6 text-[15px] text-slate-800 leading-relaxed font-editorial-serif">
              <section id="who-we-are" className="space-y-2 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  1. Who we are
                </h2>
                <p>
                  <strong>{orgName}</strong> publishes the{' '}
                  <strong>{brandName}</strong> Android application (
                  <span className="font-mono text-sm">{PACKAGE_ID}</span>) and
                  official web portal. Our platform delivers curated Hindi and
                  Hinglish Shayari, Photo Shayari cards, and daily Suvichar
                  thoughts without requiring mandatory account sign-up from
                  readers.
                </p>
              </section>

              <section id="remote-config" className="space-y-2 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  2. Remote Shayari &amp; Real-Time Configuration
                </h2>
                <p>
                  When you open {brandName}, the app and standalone website fetch
                  the latest Shayari collection, category chips, bell
                  notifications, maintenance status, and version update notices
                  from our remote configuration JSON feed. Standard HTTP request
                  headers (such as temporary IP delivery by CDN providers like
                  jsDelivr or GitHub) are processed only to serve content cleanly.
                </p>
              </section>

              <section id="advertising" className="space-y-2 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  3. Advertising &amp; Third-Party AdMob Services
                </h2>
                <p>
                  {config.ads_enabled
                    ? 'Advertising is currently enabled in this Android release using Google AdMob. AdMob may process Advertising ID and anonymized diagnostic signals to show relevant banner or interstitial ads in accordance with Google Privacy Policies.'
                    : 'Advertising is currently paused in the active remote configuration. No third-party ad networks are serving banners or interstitials while ads remain disabled.'}
                </p>
              </section>

              <section id="cookies" className="space-y-2 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  4. Local Storage &amp; Cookies
                </h2>
                <p>
                  We do not use invasive advertising tracking cookies on our
                  standalone reader site. Temporary browser cache or local state
                  may store selected category filters or recently fetched JSON
                  content purely to improve page load speed on mobile networks.
                </p>
              </section>

              <section id="embedded-content" className="space-y-2 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  5. Images, Photo Shayari &amp; External Links
                </h2>
                <p>
                  Shayari entries may include visual photo cards hosted via our
                  CDN, and the app may link to official Telegram/social channels
                  or Google Play Store for app updates. External destinations
                  operate under their own respective privacy terms.
                </p>
              </section>

              <section id="data-sharing" className="space-y-2 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  6. Who we share your data with
                </h2>
                <p>
                  We do not sell, rent, or trade personal user data. Only
                  non-personal diagnostic or ad-delivery signals processed by
                  Google Play Services / Google AdMob (when ads are active) are
                  handled under Google&apos;s security standards.
                </p>
              </section>

              <section id="data-retention" className="space-y-2 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  7. How long we retain your data
                </h2>
                <p>
                  Because {brandName} does not collect user registration
                  profiles, comments, or private contact books, we do not retain
                  personal reader accounts on our servers. Clipboard copies and
                  category selections stay entirely on your device.
                </p>
              </section>

              <section id="your-rights" className="space-y-2 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  8. What rights you have over your data
                </h2>
                <p>
                  You can reset your Android Advertising ID, clear app storage at
                  any time from device settings, or contact our support address
                  below regarding any content removal, copyright attribution, or
                  privacy request.
                </p>
              </section>

              <section id="contact-official" className="space-y-3 scroll-mt-20">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  9. Contact, Official Website &amp; Policy URL
                </h2>
                <p>
                  For privacy inquiries or takedown requests, email{' '}
                  <span className="font-mono text-sm text-slate-900 underline">
                    {supportEmail || 'support@shayarilok.in'}
                  </span>
                  .
                </p>

                <div className="font-sans p-4 bg-[#F7F7F7] border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">
                        Official {brandName} User Website
                      </div>
                      {standaloneWebsiteHref ? (
                        <a
                          href={standaloneWebsiteHref}
                          className="font-mono text-xs text-[#2D5E36] underline break-all"
                        >
                          {standaloneWebsiteHref}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigatePage('home')}
                          className="font-mono text-xs text-[#2D5E36] underline"
                        >
                          Open {brandName} Live Website
                        </button>
                      )}
                    </div>
                    {standaloneWebsiteHref ? (
                      <a
                        href={standaloneWebsiteHref}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2D5E36] rounded-lg hover:bg-[#234b2a] whitespace-nowrap shrink-0 self-start sm:self-auto"
                      >
                        <span>Open Official Website</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigatePage('home')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2D5E36] rounded-lg hover:bg-[#234b2a] whitespace-nowrap shrink-0 self-start sm:self-auto"
                      >
                        <span>Open Official Website</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                    Official Policy URL:{' '}
                    <a
                      href={resolveEffectivePolicyUrl(
                        config.privacy_policy_url,
                        standalonePrivacyHref
                      )}
                      className="font-mono text-[#2D5E36] underline break-all"
                    >
                      {resolveEffectivePolicyUrl(
                        config.privacy_policy_url,
                        standalonePrivacyHref
                      )}
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </article>
        </main>
      )}

      {/* Classic Dark Footer (#222222) — Zero Admin Console Links */}
      <footer className="bg-[#222222] text-slate-300 border-t border-black/30 px-4 sm:px-8 py-7 mt-auto">
        <div className="max-w-7xl mx-auto space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-editorial-serif text-base font-bold text-white">
                {brandName}
              </div>
              <div className="text-slate-400">
                {orgName} · {PACKAGE_ID}
                {publicSyncState === 'live' && ' · Real-Time Live Sync Active'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {SITE_NAV_ITEMS.map((item) => {
                if (
                  !onBackToAdmin &&
                  item.id === 'privacy' &&
                  standalonePrivacyHref &&
                  !isPrivacyOnlyMode
                ) {
                  return (
                    <a
                      key={item.id}
                      href={standalonePrivacyHref}
                      className="text-slate-300 hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  );
                }
                if (isPrivacyOnlyMode && item.id !== 'privacy' && standaloneWebsiteHref) {
                  const targetUrl =
                    item.id === 'home'
                      ? standaloneWebsiteHref
                      : `${standaloneWebsiteHref}${standaloneWebsiteHref.includes('?') ? '&' : '?'}page=${item.id}`;
                  return (
                    <a
                      key={item.id}
                      href={targetUrl}
                      className="text-slate-300 hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  );
                }
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigatePage(item.id)}
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-slate-400">
              Follow Shayari Lok on official social channels:
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              {(() => {
                const links =
                  websiteContent.socialLinks ?? DEFAULT_WEBSITE_SOCIAL_LINKS;
                return (
                  <>
                    <a
                      href={links.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]" aria-hidden="true">
                        <path d="M12.03 2C6.51 2 2.02 6.49 2.02 12c0 1.77.46 3.49 1.34 5.01L2 22l5.12-1.34A9.96 9.96 0 0 0 12.03 22C17.55 22 22.04 17.51 22.04 12S17.55 2 12.03 2Zm5.82 14.18c-.25.7-1.44 1.34-2 1.42-.52.08-1.18.11-1.91-.12-.44-.14-1-.32-1.72-.63-3.03-1.31-5.01-4.37-5.16-4.57-.15-.2-1.23-1.64-1.23-3.13 0-1.49.78-2.22 1.06-2.52.28-.3.61-.38.81-.38h.58c.19 0 .44-.07.69.53.25.6.86 2.1.94 2.25.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.54-.15.15-.31.31-.13.62.18.31.79 1.31 1.7 2.12 1.17 1.04 2.15 1.36 2.46 1.52.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.41-.25.69-.15.28.1 1.78.84 2.08.99.3.15.51.23.58.35.08.13.08.73-.17 1.43Z" />
                      </svg>
                      <span className="font-semibold">WhatsApp</span>
                    </a>
                    <a
                      href={links.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1877F2]" aria-hidden="true">
                        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06Z" />
                      </svg>
                      <span className="font-semibold">Facebook</span>
                    </a>
                    <a
                      href={links.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#E4405F]" aria-hidden="true">
                        <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                      </svg>
                      <span className="font-semibold">Instagram</span>
                    </a>
                    <a
                      href={links.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#FF0000]" aria-hidden="true">
                        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.54 12 3.54 12 3.54s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14c.5-1.89.5-5.81.5-5.81s0-3.92-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
                      </svg>
                      <span className="font-semibold">YouTube</span>
                    </a>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} {brandName} · {orgName}</span>
            <div className="flex flex-wrap items-center gap-4">
              <a href="./about.html" className="hover:text-white transition-colors">
                About Us
              </a>
              <a href="./contact.html" className="hover:text-white transition-colors">
                Contact
              </a>
              <a href="./terms.html" className="hover:text-white transition-colors">
                Terms &amp; Conditions
              </a>
              <a href="./privacy-policy/" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>

      {onBackToAdmin && (
        <button
          type="button"
          onClick={onBackToAdmin}
          className="fixed bottom-4 left-4 z-50 px-3 py-1.5 rounded-full bg-slate-900/85 text-white text-xs font-medium border border-white/15 shadow-lg hover:bg-slate-900 transition-colors"
        >
          ← Exit Preview
        </button>
      )}
    </div>
  );
};
