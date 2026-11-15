import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import type {
  GitHubSettings,
  ProxySettings,
  ShayariLokConfig,
} from '../types/config';
import {
  ANDROID_SCHEMA_FIELDS,
  buildAndroidEndpoints,
  generateFirestoreRealtimeListenerCode,
  generateJavaZeroDepClient,
  generateKotlinModelsAndRepo,
  generateManifestAndFirestoreSnippet,
  generateRemoteControlGateCode,
  pickFallbackAndroidEndpoint,
  pickPrimaryAndroidEndpoint,
  summarizeConfigStats,
  type AndroidEndpointItem,
} from '../utils/androidIntegration';
import { PACKAGE_ID, serializeConfigJson } from '../utils/configHelpers';
import { copyTextWithFeedback } from '../utils/clipboardToast';

interface AndroidApiSectionProps {
  config: ShayariLokConfig;
  githubSettings: GitHubSettings;
  proxySettings: ProxySettings;
  user: User | null;
  activeSiteId?: string;
  activePackageId?: string;
  onOpenGitHubSync: () => void;
  onOpenProxySettings: () => void;
}

type CodeTabId = 'kotlin' | 'firestore' | 'java' | 'control' | 'manifest';

interface EndpointProbeState {
  status: 'idle' | 'loading' | 'ok' | 'error';
  detail: string;
}

export const AndroidApiSection: React.FC<AndroidApiSectionProps> = ({
  config,
  githubSettings,
  proxySettings,
  user,
  activeSiteId,
  activePackageId,
  onOpenGitHubSync,
  onOpenProxySettings,
}) => {
  const [activeTab, setActiveTab] = useState<CodeTabId>('kotlin');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, EndpointProbeState>>({});

  const targetSiteId = activeSiteId || user?.uid;
  const targetPackageId = activePackageId || PACKAGE_ID;

  const endpoints = useMemo(
    () => buildAndroidEndpoints(githubSettings, proxySettings, targetSiteId),
    [githubSettings, proxySettings, targetSiteId]
  );

  const primaryUrl = useMemo(
    () => pickPrimaryAndroidEndpoint(endpoints),
    [endpoints]
  );
  const fallbackUrl = useMemo(
    () => pickFallbackAndroidEndpoint(endpoints),
    [endpoints]
  );
  const firestoreUrl =
    endpoints.find((e) => e.id === 'firestore-rest')?.url ?? '';

  const liveJson = useMemo(() => serializeConfigJson(config), [config]);
  const stats = useMemo(() => summarizeConfigStats(config), [config]);
  const repoConfigured = Boolean(
    githubSettings.owner.trim() && githubSettings.repo.trim()
  );

  const codeSnippets: Record<
    CodeTabId,
    { label: string; filename: string; code: string }
  > = useMemo(
    () => ({
      kotlin: {
        label: 'Kotlin (OkHttp + Gson)',
        filename: 'ShayariConfig.kt + ConfigRepository.kt',
        code: generateKotlinModelsAndRepo(primaryUrl, fallbackUrl),
      },
      firestore: {
        label: 'Firestore Live (100-300ms)',
        filename: 'FirestoreRealtimeRepository.kt',
        code: generateFirestoreRealtimeListenerCode(targetSiteId),
      },
      java: {
        label: 'Java (No Library Needed)',
        filename: 'ShayariConfigManager.java',
        code: generateJavaZeroDepClient(primaryUrl, fallbackUrl),
      },
      control: {
        label: 'Maintenance & Force Update',
        filename: 'MainActivity.kt (Remote Control Gate)',
        code: generateRemoteControlGateCode(),
      },
      manifest: {
        label: 'Gradle, Manifest & Cloud REST',
        filename: 'AndroidManifest.xml + build.gradle.kts',
        code: generateManifestAndFirestoreSnippet(firestoreUrl),
      },
    }),
    [primaryUrl, fallbackUrl, firestoreUrl, targetSiteId]
  );

  const handleCopy = async (id: string, value: string, label?: string) => {
    const ok = await copyTextWithFeedback(value, label);
    if (ok) {
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([liveJson + '\n'], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleTestEndpoint = async (ep: AndroidEndpointItem) => {
    setProbes((prev) => ({
      ...prev,
      [ep.id]: { status: 'loading', detail: 'Fetching endpoint...' },
    }));
    const started = performance.now();
    try {
      const sep = ep.url.includes('?') ? '&' : '?';
      const res = await fetch(`${ep.url}${sep}t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const latency = Math.round(performance.now() - started);
      if (!res.ok) {
        setProbes((prev) => ({
          ...prev,
          [ep.id]: {
            status: 'error',
            detail: `HTTP ${res.status} (${latency}ms) — Ensure config.json is published first.`,
          },
        }));
        return;
      }
      const data = (await res.json()) as Record<string, unknown>;
      if (ep.format === 'firestore_rest_document') {
        const hasFields = Boolean(data && typeof data.fields === 'object');
        setProbes((prev) => ({
          ...prev,
          [ep.id]: {
            status: hasFields ? 'ok' : 'error',
            detail: hasFields
              ? `Live OK (${latency}ms) · Firestore REST JSON active`
              : `HTTP ${res.status} (${latency}ms) · Document missing fields`,
          },
        }));
        return;
      }

      const shayariCount = Array.isArray(data.shayari_list)
        ? data.shayari_list.length
        : 0;
      const version = Number(data.latest_version_code ?? 0);
      setProbes((prev) => ({
        ...prev,
        [ep.id]: {
          status: 'ok',
          detail: `Live OK (${latency}ms) · v${version} · ${shayariCount} shayaris`,
        },
      }));
    } catch (err) {
      const latency = Math.round(performance.now() - started);
      setProbes((prev) => ({
        ...prev,
        [ep.id]: {
          status: 'error',
          detail: `${err instanceof Error ? err.message : 'Network error'} (${latency}ms)`,
        },
      }));
    }
  };

  const activeSnippet = codeSnippets[activeTab];

  return (
    <div className="space-y-6">
      {/* Header Overview & Quick Export Actions */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Android User App API, Live JSON Endpoints &amp; SDK Code
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                एडमिन पैनल से पब्लिश किया गया सारा डेटा (शायरी, कैटेगरी, बेल नोटिफिकेशन, मेंटेनेंस मोड, फ़ोर्स अपडेट और AdMob कंट्रोल) सीधे नीचे दिए गए URL और एंड्रॉइड कोड से आपके यूजर ऐप (<code className="font-mono text-xs">{PACKAGE_ID}</code>) में लाइव सिंक होता है।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopy('full-json', liveJson, 'config.json')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
            >
              {copiedId === 'full-json' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-700">Copied Successfully!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy config.json</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download config.json</span>
            </button>
          </div>
        </div>

        {/* Snapshot of Remote Control Values */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Payload Size</div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
              {(stats.totalBytes / 1024).toFixed(2)} KB
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Live Shayaris</div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
              {stats.shayariCount} ({stats.categoryCount} cats)
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Force Update Version</div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
              v{config.latest_version_code}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Maintenance / Ads</div>
            <div className="mt-1 text-sm font-bold">
              <span
                className={
                  config.maintenance_mode ? 'text-red-700' : 'text-emerald-700'
                }
              >
                {config.maintenance_mode ? 'Locked' : 'Online'}
              </span>
              <span className="text-slate-400"> · </span>
              <span className="text-slate-700">
                {config.ads_enabled ? 'Ads ON' : 'Ads OFF'}
              </span>
            </div>
          </div>
        </div>

        {!repoConfigured && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                आपका GitHub Repository अभी सेट नहीं है, इसलिए नीचे के URL में{' '}
                <code className="font-mono font-semibold">
                  YOUR_GITHUB_USERNAME/YOUR_CONFIG_REPO
                </code>{' '}
                दिख रहा है। रिपो जोड़ते ही आपका 100% लाइव API लिंक तैयार हो जाएगा।
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenGitHubSync}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Connect GitHub Repo</span>
            </button>
          </div>
        )}
      </section>

      {/* Active JSON Endpoints List */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Live Data Endpoints (GET JSON URLs for Android App)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              यूजर ऐप में सबसे पहले <strong>jsDelivr CDN</strong> या{' '}
              <strong>GitHub Raw</strong> लिंक डालें—एडमिन से{' '}
              <strong>Publish Changes</strong> दबाते ही ऐप में डेटा अपने आप अपडेट हो जाएगा।
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenProxySettings}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap self-start sm:self-auto"
          >
            Proxy &amp; Worker Settings →
          </button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
          {endpoints.map((ep) => {
            const probe = probes[ep.id];
            const isCopied = copiedId === `ep-${ep.id}`;
            return (
              <div key={ep.id} className="p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {ep.label}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                        ep.ready
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {ep.badge}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleTestEndpoint(ep)}
                      disabled={probe?.status === 'loading'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-60"
                    >
                      {probe?.status === 'loading' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>Test Live</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopy(`ep-${ep.id}`, ep.url, ep.label)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="text-emerald-700">Copied Successfully!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>

                    {ep.ready && (
                      <a
                        href={ep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${ep.label} in new tab`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500">{ep.description}</p>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-indigo-800 break-all select-all">
                  {ep.url}
                </div>

                {probe && probe.detail && (
                  <div
                    role="status"
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                      probe.status === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : probe.status === 'error'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {probe.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Ready-to-Paste Android User App Code */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Code2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Ready-to-Paste Android User App Code
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                आपके ऊपर वाले लाइव URL पहले से कोड में भरे हुए हैं—सीधे Android Studio में कॉपी करें।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleCopy(
                `code-${activeTab}`,
                activeSnippet.code,
                activeSnippet.filename
              )
            }
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 whitespace-nowrap self-start sm:self-auto"
          >
            {copiedId === `code-${activeTab}` ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-emerald-700">Copied Successfully!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Android code language and control tabs"
          className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl"
        >
          {(Object.keys(codeSnippets) as CodeTabId[]).map((tabId) => {
            const active = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tabId)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {codeSnippets[tabId].label}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>{activeSnippet.filename}</span>
            <span>Package: {targetPackageId}</span>
          </div>
          <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[460px]">
            <code>{activeSnippet.code}</code>
          </pre>
        </div>
      </section>

      {/* 15-Field JSON Contract & Live Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              15-Field <code className="font-mono text-sm">config.json</code>{' '}
              Remote Control Contract
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5 font-medium">JSON Key</th>
                  <th className="py-2 px-2.5 font-medium">Type</th>
                  <th className="py-2 px-2.5 font-medium">Android App Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ANDROID_SCHEMA_FIELDS.map((field) => (
                  <tr key={field.key}>
                    <td className="py-2 px-2.5 font-mono text-indigo-700 font-semibold whitespace-nowrap">
                      {field.key}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-500 whitespace-nowrap">
                      {field.type}
                    </td>
                    <td className="py-2 px-2.5 text-slate-700">
                      {field.controlPurpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Live Generated <code className="font-mono text-sm">config.json</code>
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                void handleCopy('schema-json', liveJson, 'config.json')
              }
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              {copiedId === 'schema-json' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-700" />
                  <span className="text-emerald-700">Copied Successfully!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre className="flex-1 p-4 bg-slate-950 text-emerald-300 rounded-xl text-xs font-mono overflow-auto leading-relaxed max-h-[520px]">
            <code>{liveJson}</code>
          </pre>
        </section>
      </div>
    </div>
  );
};
