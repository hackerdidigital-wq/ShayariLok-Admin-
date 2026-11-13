import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpenText,
  Check,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
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
import { PHOTO_THEME_META } from '../utils/websiteContent';

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
  const [heroImgError, setHeroImgError] = useState(false);
  const [brokenPhotoThemes, setBrokenPhotoThemes] = useState<
    Partial<Record<PhotoShayariThemeId, boolean>>
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
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      // Ignore if clipboard API blocked in non-secure context
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract — Zero Admin Chrome */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          {isPrivacyOnlyMode && standaloneWebsiteHref ? (
            <a
              href={standaloneWebsiteHref}
              className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              {brandName}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onNavigatePage('home')}
              className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
            >
              {brandName}
            </button>
          )}

          {/* Zone 2: 5 Concise Single-Line Nav Links */}
          <nav
            aria-label="Website navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
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
                        ? 'text-indigo-700 font-semibold border-b-2 border-indigo-600'
                        : 'hover:text-slate-900'
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
                    className="whitespace-nowrap shrink-0 pb-0.5 hover:text-slate-900 transition-colors"
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
                      ? 'text-indigo-700 font-semibold border-b-2 border-indigo-600'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Live Notification Bell + Download CTA + Preview Back + Mobile Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {onBackToAdmin && (
              <button
                type="button"
                onClick={onBackToAdmin}
                className="hidden sm:inline-flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                ← Admin
              </button>
            )}
            {controls.showNotificationBell && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifDrawerOpen((prev) => !prev)}
                  aria-label="Open live notifications"
                  aria-expanded={notifDrawerOpen}
                  className="relative p-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                >
                  <Bell className="w-4 h-4" />
                  {config.notifications.length > 0 && (
                    <span
                      data-testid="website-notif-badge"
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-indigo-700 text-white font-mono text-[10px] font-bold tabular-nums"
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
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download App</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? 'Close website menu' : 'Open website menu'}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
            >
              {mobileNavOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
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
          {onBackToAdmin && (
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                onBackToAdmin();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50/60"
            >
              ← Back to Admin Panel
            </button>
          )}
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
                  return (
                    <article
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-3">
                        <div className="text-xs font-medium text-slate-500 font-mono tabular-nums">
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
                return (
                  <article
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-slate-500 font-mono tabular-nums">
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

      {/* PAGE 5: Standalone Hosted Privacy Policy Website */}
      {page === 'privacy' && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6">
            <div className="flex items-start gap-3 pb-5 border-b border-slate-200">
              <ShieldCheck className="w-6 h-6 text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  Privacy Policy — {brandName}
                </h1>
                <p className="mt-1 text-xs font-mono text-slate-500 tabular-nums">
                  Package: {PACKAGE_ID} · Publisher: {orgName}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>{orgName}</strong> built the <strong>{brandName}</strong>{' '}
                application ({PACKAGE_ID}) as an ad-supported / community Hindi
                &amp; Hinglish Shayari and Suvichar platform. This standalone page
                informs Android app users and website visitors regarding our
                policies on data collection, remote configuration, and third-party
                services.
              </p>

              <h2 className="font-display text-base font-bold text-slate-900 pt-2">
                1. Remote Content &amp; Real-Time Configuration
              </h2>
              <p>
                {brandName} fetches curated shayari lists, photo shayari cards,
                suvichar thoughts, app announcements, and maintenance notices via
                remote JSON and cloud sync. Reading content or copying shayaris to
                your clipboard does not require user registration or personal
                account tracking.
              </p>

              <h2 className="font-display text-base font-bold text-slate-900 pt-2">
                2. Advertising &amp; Third-Party Services (Google AdMob)
              </h2>
              <p>
                {config.ads_enabled
                  ? 'Advertising is currently enabled in this release using Google AdMob. AdMob may collect anonymized device identifiers and diagnostic signals to serve relevant ads in accordance with Google Privacy Policies.'
                  : 'Advertising is currently paused in the active remote configuration. No third-party ad networks are serving banners or interstitials while ads remain disabled.'}
              </p>

              <h2 className="font-display text-base font-bold text-slate-900 pt-2">
                3. Contact, Official Website &amp; Policy URL
              </h2>
              <p>
                For privacy inquiries or content takedown requests, contact{' '}
                <span className="font-mono text-slate-900">
                  {supportEmail || 'support@shayarilok.in'}
                </span>
                .
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      Official Shayari Lok Website
                    </div>
                    {standaloneWebsiteHref ? (
                      <a
                        href={standaloneWebsiteHref}
                        className="font-mono text-xs text-indigo-700 underline break-all"
                      >
                        {standaloneWebsiteHref}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigatePage('home')}
                        className="font-mono text-xs text-indigo-700 underline"
                      >
                        Open {brandName} Live Website
                      </button>
                    )}
                  </div>
                  {standaloneWebsiteHref ? (
                    <a
                      href={standaloneWebsiteHref}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
                    >
                      <span>Open Official Website</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigatePage('home')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg hover:bg-indigo-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
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
                    className="font-mono text-indigo-700 underline break-all"
                  >
                    {resolveEffectivePolicyUrl(
                      config.privacy_policy_url,
                      standalonePrivacyHref
                    )}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Clean Public Footer — Zero Admin Console Links */}
      <footer className="bg-white border-t border-slate-200 px-4 sm:px-8 py-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-800">{brandName}</span> ·{' '}
            {orgName} · {PACKAGE_ID}
            {publicSyncState === 'live' && ' · Real-Time Live Sync Active'}
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
                    className="hover:text-slate-900"
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
                  <a key={item.id} href={targetUrl} className="hover:text-slate-900">
                    {item.label}
                  </a>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigatePage(item.id)}
                  className="hover:text-slate-900"
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
};
