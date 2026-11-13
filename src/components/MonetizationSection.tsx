import React from 'react';
import { ExternalLink, Globe, Shield, Smartphone } from 'lucide-react';
import type { ShayariLokConfig } from '../types/config';

interface MonetizationSectionProps {
  config: ShayariLokConfig;
  onUpdate: (patch: Partial<ShayariLokConfig>) => void;
}

const GOOGLE_TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const GOOGLE_TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

export const MonetizationSection: React.FC<MonetizationSectionProps> = ({
  config,
  onUpdate,
}) => {
  return (
    <div className="space-y-6">
      {/* AdMob Master Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Google AdMob Monetization (
                <code className="font-mono text-xs text-slate-500">
                  ads_enabled
                </code>
                )
              </h2>
              <p className="text-sm text-slate-500">
                सभी विज्ञापन यूनिट्स को एक स्विच से ऑन/ऑफ़ करें और लाइव Ad Unit IDs अपडेट करें।
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
              onClick={() => onUpdate({ ads_enabled: !config.ads_enabled })}
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
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            टेस्टिंग के लिए Google AdMob के आधिकारिक सैंपल IDs का उपयोग कर सकते हैं।
          </p>
          <button
            type="button"
            onClick={() =>
              onUpdate({
                banner_ad_id: GOOGLE_TEST_BANNER,
                interstitial_ad_id: GOOGLE_TEST_INTERSTITIAL,
              })
            }
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Fill Google Test Ad IDs
          </button>
        </div>
      </section>

      {/* Social & Privacy Policy Links */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
          <Globe className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Social Community & Privacy Links
            </h2>
            <p className="text-sm text-slate-500">
              Telegram/Instagram कम्युनिटी लिंक और Google Play Privacy Policy URL।
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

          <div>
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
                placeholder="https://shayarilok.in/privacy-policy"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              {config.privacy_policy_url && (
                <a
                  href={config.privacy_policy_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open privacy policy link in new tab"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 shrink-0"
                >
                  <Shield className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
