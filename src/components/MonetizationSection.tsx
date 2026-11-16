import React, { useState } from 'react';
import {
  Check,
  CloudUpload,
  Copy,
  ExternalLink,
  Globe,
  Shield,
  Smartphone,
} from 'lucide-react';
import type {
  AppControlStudioConfig,
  ShayariLokConfig,
} from '../types/config';
import {
  GOOGLE_TEST_ADMOB_CONFIG,
  validateAdMobId,
} from '../utils/appControlStudio';
import { copyTextWithFeedback } from '../utils/clipboardToast';
import { isLegacyPlaceholderPolicyUrl } from '../utils/siteRoutes';

interface MonetizationSectionProps {
  config: ShayariLokConfig;
  control: AppControlStudioConfig;
  onUpdate: (patch: Partial<ShayariLokConfig>, instantSync?: boolean) => void;
  onUpdateControl: (
    next: AppControlStudioConfig,
    instantSync?: boolean
  ) => void;
  onSaveAndSync: () => Promise<void>;
  hostedPrivacyUrl?: string;
  hostedWebsiteUrl?: string;
}

export const MonetizationSection: React.FC<MonetizationSectionProps> = ({
  config,
  control,
  onUpdate,
  onUpdateControl,
  onSaveAndSync,
  hostedPrivacyUrl,
  hostedWebsiteUrl,
}) => {
  const [copiedPolicy, setCopiedPolicy] = useState(false);
  const [savingAds, setSavingAds] = useState(false);

  const usingLegacyPlaceholder = isLegacyPlaceholderPolicyUrl(
    config.privacy_policy_url
  );
  const effectiveOpenHref =
    usingLegacyPlaceholder && hostedPrivacyUrl
      ? hostedPrivacyUrl
      : config.privacy_policy_url || hostedPrivacyUrl || './privacy.html';

  const appIdCheck = validateAdMobId(control.admob_app_id, 'app');
  const bannerCheck = validateAdMobId(config.banner_ad_id, 'unit');
  const interCheck = validateAdMobId(config.interstitial_ad_id, 'unit');
  const nativeCheck = validateAdMobId(control.native_ad_id, 'unit');

  const handleCopyHostedPolicy = async () => {
    const target = hostedPrivacyUrl || config.privacy_policy_url;
    if (!target) return;
    const ok = await copyTextWithFeedback(target, 'Privacy Policy URL');
    if (ok) {
      setCopiedPolicy(true);
      window.setTimeout(() => setCopiedPolicy(false), 2000);
    }
  };

  const handleSaveAdMobNow = async () => {
    setSavingAds(true);
    try {
      await onSaveAndSync();
    } finally {
      setSavingAds(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AdMob Control Center */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Google AdMob Control Center (
                <code className="font-mono text-xs text-slate-500">
                  ads_enabled · admob_app_id · native_ad_id
                </code>
                )
              </h2>
              <p className="text-sm text-slate-500">
                सभी विज्ञापन यूनिट्स को एक स्विच से ऑन/ऑफ़ करें और लाइव AdMob App, Banner, Interstitial व Native IDs तुरंत User App में सिंक करें।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-xs font-semibold ${
                config.ads_enabled ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {config.ads_enabled ? 'Ads Active' : 'Ads Paused'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={config.ads_enabled}
              aria-label="Toggle AdMob ads enabled"
              onClick={() =>
                onUpdate({ ads_enabled: !config.ads_enabled }, true)
              }
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                config.ads_enabled ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  config.ads_enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="admob-app-id-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              AdMob App ID (
              <code className="font-mono text-xs text-slate-500">
                admob_app_id
              </code>
              )
            </label>
            <input
              id="admob-app-id-input"
              type="text"
              value={control.admob_app_id}
              onChange={(e) =>
                onUpdateControl({ ...control, admob_app_id: e.target.value })
              }
              placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <p
              className={`mt-1 text-[11px] ${
                appIdCheck.valid ? 'text-slate-500' : 'text-amber-700'
              }`}
            >
              {appIdCheck.message}
            </p>
          </div>

          <div>
            <label
              htmlFor="banner-ad-id-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Banner Ad Unit ID (
              <code className="font-mono text-xs text-slate-500">
                banner_ad_id
              </code>
              )
            </label>
            <input
              id="banner-ad-id-input"
              type="text"
              value={config.banner_ad_id}
              onChange={(e) => onUpdate({ banner_ad_id: e.target.value })}
              placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <p
              className={`mt-1 text-[11px] ${
                bannerCheck.valid ? 'text-slate-500' : 'text-amber-700'
              }`}
            >
              {bannerCheck.message}
            </p>
          </div>

          <div>
            <label
              htmlFor="interstitial-ad-id-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Interstitial Ad Unit ID (
              <code className="font-mono text-xs text-slate-500">
                interstitial_ad_id
              </code>
              )
            </label>
            <input
              id="interstitial-ad-id-input"
              type="text"
              value={config.interstitial_ad_id}
              onChange={(e) => onUpdate({ interstitial_ad_id: e.target.value })}
              placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <p
              className={`mt-1 text-[11px] ${
                interCheck.valid ? 'text-slate-500' : 'text-amber-700'
              }`}
            >
              {interCheck.message}
            </p>
          </div>

          <div>
            <label
              htmlFor="native-ad-id-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Native Ad Unit ID (
              <code className="font-mono text-xs text-slate-500">
                native_ad_id
              </code>
              )
            </label>
            <input
              id="native-ad-id-input"
              type="text"
              value={control.native_ad_id}
              onChange={(e) =>
                onUpdateControl({ ...control, native_ad_id: e.target.value })
              }
              placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/wwwwwwwwww"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <p
              className={`mt-1 text-[11px] ${
                nativeCheck.valid ? 'text-slate-500' : 'text-amber-700'
              }`}
            >
              {nativeCheck.message}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            टेस्टिंग के लिए Google AdMob के आधिकारिक सैंपल IDs भरें या अपनी लाइव IDs सेव करके User App में सिंक करें।
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onUpdate({
                  banner_ad_id: GOOGLE_TEST_ADMOB_CONFIG.banner_ad_id,
                  interstitial_ad_id:
                    GOOGLE_TEST_ADMOB_CONFIG.interstitial_ad_id,
                });
                onUpdateControl({
                  ...control,
                  admob_app_id: GOOGLE_TEST_ADMOB_CONFIG.admob_app_id,
                  native_ad_id: GOOGLE_TEST_ADMOB_CONFIG.native_ad_id,
                });
              }}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Fill Google Test Ad IDs
            </button>
            <button
              type="button"
              disabled={savingAds}
              onClick={() => void handleSaveAdMobNow()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>
                {savingAds ? 'Syncing AdMob...' : 'Save & Sync AdMob Settings'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Social & Privacy Policy Links */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
          <Globe className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Social Community &amp; Privacy Links
            </h2>
            <p className="text-sm text-slate-500">
              Telegram/Instagram कम्युनिटी लिंक और Google Play / App Privacy Policy URL।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="social-link-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Social Link (
              <code className="font-mono text-xs text-slate-500">
                social_link
              </code>
              )
            </label>
            <div className="flex gap-2">
              <input
                id="social-link-input"
                type="url"
                value={config.social_link}
                onChange={(e) => onUpdate({ social_link: e.target.value })}
                placeholder="https://t.me/shayarilok_official"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              {config.social_link && (
                <a
                  href={config.social_link}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open social link in new tab"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="privacy-policy-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Privacy Policy URL (
              <code className="font-mono text-xs text-slate-500">
                privacy_policy_url
              </code>
              )
            </label>
            <div className="flex gap-2">
              <input
                id="privacy-policy-input"
                type="url"
                value={config.privacy_policy_url}
                onChange={(e) =>
                  onUpdate({ privacy_policy_url: e.target.value })
                }
                placeholder={hostedPrivacyUrl || 'https://your-domain/privacy.html'}
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <a
                href={effectiveOpenHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Open hosted privacy policy in new tab"
                className="p-2.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 shrink-0"
              >
                <Shield className="w-4 h-4" />
              </a>
            </div>

            {hostedPrivacyUrl && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({ privacy_policy_url: hostedPrivacyUrl })
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                >
                  Use Our Hosted Privacy URL
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyHostedPolicy()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  {copiedPolicy ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-700 font-semibold">
                        Copied Successfully!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Hosted URL</span>
                    </>
                  )}
                </button>
                {hostedWebsiteUrl && (
                  <a
                    href={hostedWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <span>Open Live Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {usingLegacyPlaceholder && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                डिफ़ॉल्ट <code className="font-mono">shayarilok.in/privacy-policy</code> की जगह ऊपर दिया <strong>Use Our Hosted Privacy URL</strong> दबाएँ ताकि ऐप और यूजर सीधे हमारी होस्टेड Privacy Policy और Website पर आएँ।
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
