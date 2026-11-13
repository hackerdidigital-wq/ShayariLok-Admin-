import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bell,
  BookOpenText,
  Check,
  CloudUpload,
  Copy,
  ExternalLink,
  Globe,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  GitHubSettings,
  ShayariLokConfig,
  WebsiteContentSettings,
} from '../types/config';
import { isGitHubConfigured } from '../utils/githubApi';
import {
  buildStandaloneEntryUrl,
  type PublicSitePageId,
} from '../utils/siteRoutes';

interface WebsiteHubSectionProps {
  config: ShayariLokConfig;
  websiteContent: WebsiteContentSettings;
  githubSettings: GitHubSettings;
  user: User | null;
  liveSyncing: boolean;
  onSyncLiveWebsiteNow: () => Promise<void>;
  onOpenPublicPage: (page: PublicSitePageId) => void;
}

const LIVE_SITES: Array<{
  page: PublicSitePageId;
  entryHtml: 'website.html' | 'privacy.html';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    page: 'home',
    entryHtml: 'website.html',
    title: 'Official App Website (Standalone URL)',
    subtitle:
      'अलग URL (website.html) पर खुलने वाली लाइव वेबसाइट — Photo Shayari कार्ड्स, आज के सुविचार, नोटिफिकेशन बेल और डाउनलोड बटन के साथ (बिना Admin Panel लिंक के)।',
    icon: Globe,
  },
  {
    page: 'shayari',
    entryHtml: 'website.html',
    title: 'Live Shayari & Search Portal',
    subtitle:
      'वेब विज़िटर्स के लिए अलग लाइव शायरी लाइब्रेरी: कैटेगरी फ़िल्टर, हिंदी/Hinglish सर्च और 1-क्लिक कॉपी।',
    icon: BookOpenText,
  },
  {
    page: 'suvichar',
    entryHtml: 'website.html',
    title: 'Daily Suvichar (सुविचार) Portal',
    subtitle:
      'प्रेरणादायक हिंदी सुविचार का समर्पित लाइव पेज — आपके एडमिन पैनल से तुरंत अपडेट होता है।',
    icon: Sparkles,
  },
  {
    page: 'updates',
    entryHtml: 'website.html',
    title: 'Updates & Notification Feed',
    subtitle:
      'नोटिफिकेशन पैनल से कंट्रोल होने वाले लाइव बेल अलर्ट, पिन अनाउंसमेंट और रिलीज़ वर्ज़न की वेबसाइट।',
    icon: Bell,
  },
  {
    page: 'privacy',
    entryHtml: 'privacy.html',
    title: 'Standalone Privacy Policy Website',
    subtitle:
      'बिल्कुल अलग URL (privacy.html) पर होस्ट किया गया Privacy Policy पेज — सीधे Play Console और ऐप में लिंक करने के लिए।',
    icon: ShieldCheck,
  },
];

export const WebsiteHubSection: React.FC<WebsiteHubSectionProps> = ({
  config,
  websiteContent,
  githubSettings,
  user,
  liveSyncing,
  onSyncLiveWebsiteNow,
  onOpenPublicPage,
}) => {
  const [copiedPage, setCopiedPage] = useState<PublicSitePageId | null>(null);
  const [includeGitHubQuery, setIncludeGitHubQuery] = useState(true);
  const [includeCloudSiteId, setIncludeCloudSiteId] = useState(true);

  const githubReady = isGitHubConfigured(githubSettings, false);
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '/';

  const getShareUrl = (
    page: PublicSitePageId,
    entryHtml: 'website.html' | 'privacy.html'
  ) =>
    buildStandaloneEntryUrl(entryHtml, origin, pathname, {
      page,
      siteId: user && includeCloudSiteId ? user.uid : null,
      repoOverride:
        githubReady && includeGitHubQuery
          ? {
              owner: githubSettings.owner,
              repo: githubSettings.repo,
              branch: githubSettings.branch || 'main',
              path: githubSettings.path || 'config.json',
            }
          : null,
    });

  const handleCopy = async (
    page: PublicSitePageId,
    entryHtml: 'website.html' | 'privacy.html'
  ) => {
    try {
      await navigator.clipboard.writeText(getShareUrl(page, entryHtml));
      setCopiedPage(page);
      window.setTimeout(() => {
        setCopiedPage((prev) => (prev === page ? null : prev));
      }, 1800);
    } catch {
      // Ignore if clipboard API restricted
    }
  };

  const mainSiteUrl = getShareUrl('home', 'website.html');
  const mainPrivacyUrl = getShareUrl('privacy', 'privacy.html');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Standalone Live Websites &amp; Privacy Policy URLs
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            नीचे दिए गए सभी लिंक अलग पब्लिक URL (<code className="font-mono">website.html</code> व <code className="font-mono">privacy.html</code>) पर खुलते हैं—इन पर विज़िटर्स को आपका Admin Panel नहीं दिखता और एडमिन से हर बदलाव रीयल-टाइम सिंक होता है।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {user && (
            <button
              type="button"
              disabled={liveSyncing}
              onClick={() => void onSyncLiveWebsiteNow()}
              className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-60"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{liveSyncing ? 'Syncing Cloud...' : 'Publish Live Sync'}</span>
            </button>
          )}

          <a
            href={mainSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 whitespace-nowrap"
          >
            <Globe className="w-4 h-4" />
            <span>Open Website URL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href={mainPrivacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Open Privacy URL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {(githubReady || user) && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-slate-700">
            Shareable URLs embed real-time sync parameters so any external user device sees live updates.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {user && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCloudSiteId}
                  onChange={(e) => setIncludeCloudSiteId(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Embed Realtime Cloud ID (?site=)</span>
              </label>
            )}
            {githubReady && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGitHubQuery}
                  onChange={(e) => setIncludeGitHubQuery(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Embed GitHub Repo Query</span>
              </label>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {LIVE_SITES.map((site) => {
          const Icon = site.icon;
          const shareUrl = getShareUrl(site.page, site.entryHtml);
          const isCopied = copiedPage === site.page;

          return (
            <div
              key={site.page}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-5 h-5 text-indigo-600 shrink-0" />
                    <h3 className="font-display text-base font-bold text-slate-900">
                      {site.title}
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-emerald-700 font-semibold">
                    {site.entryHtml}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {site.subtitle}
                </p>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-600 truncate">
                  {shareUrl}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                  {site.page === 'shayari'
                    ? `${config.shayari_list.length} shayaris`
                    : site.page === 'suvichar'
                      ? `${websiteContent.suvichar_list.length} suvichars`
                      : site.page === 'updates'
                        ? `${config.notifications.length} alerts`
                        : `v${config.latest_version_code}`}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy(site.page, site.entryHtml)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPublicPage(site.page)}
                    className="px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                  >
                    Preview Here
                  </button>

                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    <span>Open Direct Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
