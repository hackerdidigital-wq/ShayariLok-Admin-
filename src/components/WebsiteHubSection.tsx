import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bell,
  BookOpenText,
  Check,
  CloudUpload,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  GitHubSettings,
  ShayariLokConfig,
  WebsiteContentSettings,
} from '../types/config';
import { copyTextWithFeedback } from '../utils/clipboardToast';
import { isGitHubConfigured } from '../utils/githubApi';
import {
  buildStandaloneEntryUrl,
  resolveDirectoryBase,
  type PublicSitePageId,
  type StandaloneHtmlFile,
} from '../utils/siteRoutes';

interface WebsiteHubSectionProps {
  config: ShayariLokConfig;
  websiteContent: WebsiteContentSettings;
  githubSettings: GitHubSettings;
  user: User | null;
  liveSyncing: boolean;
  onSyncLiveWebsiteNow: () => Promise<void>;
  onOpenPublicPage: (page: PublicSitePageId) => void;
  onOpenPinSettings?: () => void;
}

interface StandalonePortalCard {
  key: string;
  page?: PublicSitePageId;
  entryHtml: StandaloneHtmlFile;
  cleanRoute?: string;
  customDomainExample: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LIVE_SITES: StandalonePortalCard[] = [
  {
    key: 'home',
    page: 'home',
    entryHtml: 'website.html',
    customDomainExample: 'https://shayarilok.in/website.html',
    title: 'Official App Website (Standalone URL)',
    subtitle:
      'पूरी तरह स्वतंत्र वेबसाइट (website.html) — Photo Shayari कार्ड्स, आज के सुविचार, नोटिफिकेशन बेल व WhatsApp/Facebook/Instagram/YouTube फुटर आइकॉन के साथ (बिना Admin/Login/GitHub लिंक के)।',
    icon: Globe,
  },
  {
    key: 'shayari',
    page: 'shayari',
    entryHtml: 'website.html',
    customDomainExample: 'https://shayarilok.in/website.html?page=shayari',
    title: 'Live Shayari & Search Portal',
    subtitle:
      'वेब विज़िटर्स के लिए अलग लाइव शायरी लाइब्रेरी: कैटेगरी फ़िल्टर, हिंदी/Hinglish सर्च और 1-क्लिक कॉपी।',
    icon: BookOpenText,
  },
  {
    key: 'suvichar',
    page: 'suvichar',
    entryHtml: 'website.html',
    customDomainExample: 'https://shayarilok.in/website.html?page=suvichar',
    title: 'Daily Suvichar (सुविचार) Portal',
    subtitle:
      'प्रेरणादायक हिंदी सुविचार का समर्पित लाइव पेज — आपके एडमिन पैनल से तुरंत अपडेट होता है।',
    icon: Sparkles,
  },
  {
    key: 'updates',
    page: 'updates',
    entryHtml: 'website.html',
    customDomainExample: 'https://shayarilok.in/website.html?page=updates',
    title: 'Updates & Notification Feed',
    subtitle:
      'नोटिफिकेशन पैनल से कंट्रोल होने वाले लाइव बेल अलर्ट, पिन अनाउंसमेंट और रिलीज़ वर्ज़न की वेबसाइट।',
    icon: Bell,
  },
  {
    key: 'privacy',
    page: 'privacy',
    entryHtml: 'privacy.html',
    cleanRoute: 'privacy-policy/',
    customDomainExample: 'https://shayarilok.in/privacy-policy/',
    title: 'Privacy Policy (Standalone)',
    subtitle:
      'शुद्ध HTML/CSS/JS से बना अलग Privacy Policy पेज (/privacy-policy/ व privacy.html) — सीधे Play Console और ऐप में लिंक करने के लिए।',
    icon: ShieldCheck,
  },
  {
    key: 'terms',
    entryHtml: 'terms.html',
    cleanRoute: 'terms/',
    customDomainExample: 'https://shayarilok.in/terms/',
    title: 'Terms & Conditions (Standalone)',
    subtitle:
      'कस्टम डोमेन तैयार Terms & Conditions पेज (/terms/ व terms.html) — बिना किसी एडमिन, लॉगिन या डैशबोर्ड लिंक के।',
    icon: FileText,
  },
  {
    key: 'about',
    entryHtml: 'about.html',
    cleanRoute: 'about/',
    customDomainExample: 'https://shayarilok.in/about/',
    title: 'About Shayari Lok (Standalone)',
    subtitle:
      'Shayari Lok और CyberKing Studio के बारे में समर्पित पब्लिक पेज (/about/ व about.html) — सोशल मीडिया प्रोफाइल्स के साथ।',
    icon: Info,
  },
  {
    key: 'contact',
    entryHtml: 'contact.html',
    cleanRoute: 'contact/',
    customDomainExample: 'https://shayarilok.in/contact/',
    title: 'Contact & Support (Standalone)',
    subtitle:
      'यूज़र सहायता, कॉपीराइट/DMCA अनुरोध व ईमेल संपर्क के लिए स्वतंत्र पेज (/contact/ व contact.html)।',
    icon: Mail,
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
  onOpenPinSettings,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [includeGitHubQuery, setIncludeGitHubQuery] = useState(true);
  const [includeCloudSiteId, setIncludeCloudSiteId] = useState(true);

  const githubReady = isGitHubConfigured(githubSettings, false);
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '/';

  const getShareUrl = (site: StandalonePortalCard) => {
    if (site.cleanRoute) {
      return `${resolveDirectoryBase(origin, pathname)}${site.cleanRoute}`;
    }
    return buildStandaloneEntryUrl(site.entryHtml, origin, pathname, {
      page: site.page,
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
  };

  const handleCopy = async (site: StandalonePortalCard) => {
    const labelMap: Record<string, string> = {
      privacy: 'Privacy Policy URL',
      terms: 'Terms & Conditions URL',
      about: 'About Page URL',
      contact: 'Contact Page URL',
    };
    const ok = await copyTextWithFeedback(
      getShareUrl(site),
      labelMap[site.key] ?? 'Website URL'
    );
    if (ok) {
      setCopiedKey(site.key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === site.key ? null : prev));
      }, 2000);
    }
  };

  const mainSiteUrl = getShareUrl(LIVE_SITES[0]);
  const mainPrivacyUrl = getShareUrl(LIVE_SITES[4]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Standalone Live Websites &amp; Custom Domain Public Pages
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            सभी पब्लिक पेज (<code className="font-mono">website.html</code>,{' '}
            <code className="font-mono">/privacy-policy/</code>,{' '}
            <code className="font-mono">/terms/</code>,{' '}
            <code className="font-mono">/about/</code> व{' '}
            <code className="font-mono">/contact/</code>) 100% शुद्ध HTML/CSS/JS हैं—इनमें कहीं भी Admin, Dashboard, Login या GitHub का नाम/लिंक नहीं है।
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
          const shareUrl = getShareUrl(site);
          const isCopied = copiedKey === site.key;

          return (
            <div
              key={site.key}
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
                    {site.cleanRoute ? `/${site.cleanRoute}` : site.entryHtml}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {site.subtitle}
                </p>

                <div className="space-y-1">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-600 truncate">
                    {shareUrl}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 truncate">
                    Custom Domain: {site.customDomainExample}
                  </div>
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
                    onClick={() => void handleCopy(site)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-emerald-700 font-semibold">Copied Successfully!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  {site.page && (
                    <button
                      type="button"
                      onClick={() => onOpenPublicPage(site.page!)}
                      className="px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                    >
                      Preview Here
                    </button>
                  )}

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

      {/* Strict Admin vs Public Website Isolation Card */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-display text-sm font-bold text-slate-900">
              100% Isolated Public Websites — Zero Admin, Login or Dashboard References
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              यूज़र को शेयर किए जाने वाले <code className="font-mono">website.html</code>,{' '}
              <code className="font-mono">/privacy-policy/</code>, <code className="font-mono">/terms/</code>,{' '}
              <code className="font-mono">/about/</code> व <code className="font-mono">/contact/</code> अलग शुद्ध HTML/CSS/JS फाइलें हैं। इनमें एडमिन पैनल का कोई नाम, बटन या रूट शामिल नहीं होता।
            </p>
          </div>
        </div>
        {onOpenPinSettings && (
          <button
            type="button"
            onClick={onOpenPinSettings}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin PIN Lock</span>
          </button>
        )}
      </div>
    </div>
  );
};
