import React from 'react';
import { AlertTriangle, Plus, ShieldCheck, Smartphone } from 'lucide-react';
import type { ShayariLokConfig } from '../types/config';
import { PACKAGE_ID } from '../utils/configHelpers';

interface DashboardSectionProps {
  config: ShayariLokConfig;
  onUpdate: (patch: Partial<ShayariLokConfig>) => void;
  onNavigate: (section: 'shayari' | 'notifications' | 'monetization' | 'android-api') => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  config,
  onUpdate,
  onNavigate,
}) => {
  const customCategoryCount = Math.max(0, config.categories.length - 1);

  return (
    <div className="space-y-6">
      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('shayari')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="text-xs font-medium text-slate-500">Total Shayaris</div>
          <div className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {config.shayari_list.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Across {customCategoryCount} categories
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="text-xs font-medium text-slate-500">Bell Notifications</div>
          <div className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {config.notifications.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Active items in user app
          </div>
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Latest Version Code</div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            v{config.latest_version_code}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500 truncate">
            {PACKAGE_ID}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('monetization')}
          className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
        >
          <div className="text-xs font-medium text-slate-500">App & Ads Status</div>
          <div className="mt-2 font-display text-xl font-bold text-slate-900">
            {config.maintenance_mode ? (
              <span className="text-red-700">Maintenance ON</span>
            ) : (
              <span className="text-emerald-700">Live & Healthy</span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            AdMob: {config.ads_enabled ? 'Enabled' : 'Paused'}
          </div>
        </button>
      </div>

      {/* App Identity & Remote Version Control */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              App Control & Force Update
            </h2>
            <p className="text-sm text-slate-500">
              एंड्रॉइड ऐप का नाम, वर्ज़न कोड और मेंटेनेंस मोड रिमोटली कंट्रोल करें।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs text-slate-500">
              Schema: app_name · latest_version_code · maintenance_mode
            </span>
            <button
              type="button"
              onClick={() => onNavigate('android-api')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Endpoint & Code</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="app-name-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              App Name (<code className="font-mono text-xs text-slate-500">app_name</code>)
            </label>
            <input
              id="app-name-input"
              type="text"
              value={config.app_name}
              onChange={(e) => onUpdate({ app_name: e.target.value })}
              placeholder="Shayari Lok"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="version-code-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Latest Version Code (
              <code className="font-mono text-xs text-slate-500">
                latest_version_code
              </code>
              )
            </label>
            <div className="flex items-center gap-2">
              <input
                id="version-code-input"
                type="number"
                min={1}
                step={1}
                value={config.latest_version_code}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  onUpdate({
                    latest_version_code:
                      Number.isFinite(val) && val >= 1 ? val : 1,
                  });
                }}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    latest_version_code: config.latest_version_code + 1,
                  })
                }
                aria-label="Increment latest version code by 1"
                className="flex items-center gap-1 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>1</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="force-update-url-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Force Update URL (
              <code className="font-mono text-xs text-slate-500">
                force_update_url
              </code>
              )
            </label>
            <input
              id="force-update-url-input"
              type="url"
              value={config.force_update_url}
              onChange={(e) => onUpdate({ force_update_url: e.target.value })}
              placeholder="https://play.google.com/store/apps/details?id=com.cyberking.shayarilok"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </section>

      {/* Maintenance Mode Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            {config.maintenance_mode ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Maintenance Mode (
                <code className="font-mono text-xs text-slate-500">
                  maintenance_mode
                </code>
                )
              </h2>
              <p className="text-sm text-slate-500">
                चालू करने पर यूजर ऐप में मुख्य स्क्रीन लॉक होकर नीचे लिखा संदेश दिखेगा।
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={config.maintenance_mode}
            aria-label="Toggle maintenance mode"
            onClick={() =>
              onUpdate({ maintenance_mode: !config.maintenance_mode })
            }
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
              config.maintenance_mode ? 'bg-red-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                config.maintenance_mode ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div>
          <label
            htmlFor="maintenance-message-input"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Maintenance Message (
            <code className="font-mono text-xs text-slate-500">
              maintenance_message
            </code>
            )
          </label>
          <textarea
            id="maintenance-message-input"
            rows={3}
            value={config.maintenance_message}
            onChange={(e) => onUpdate({ maintenance_message: e.target.value })}
            placeholder="ऐप मेंटेनेंस पर है, कृपया कुछ देर बाद प्रयास करें..."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </section>
    </div>
  );
};
