import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  Check,
  Cloud,
  Code2,
  Copy,
  DownloadCloud,
  Globe,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Waypoints,
} from 'lucide-react';
import type {
  GitHubSettings,
  ProxyAttemptLog,
  ProxyDiagnosticResult,
  ProxyMode,
  ProxyNode,
  ProxyNodeKind,
  ProxySettings,
} from '../types/config';
import {
  buildAndroidMirrorUrls,
  CLOUDFLARE_WORKER_TEMPLATE,
  normalizeProxyUrl,
  probeProxyEndpoint,
} from '../utils/proxyEngine';

interface ProxySectionProps {
  proxySettings: ProxySettings;
  onChangeProxySettings: (next: ProxySettings) => void;
  onSaveProxySettings: () => void;
  githubSettings: GitHubSettings;
  attemptLogs: ProxyAttemptLog[];
  onClearAttemptLogs: () => void;
  user: User | null;
  cloudBusy: boolean;
  onSaveCloudProxy: () => void;
  onLoadCloudProxy: () => void;
}

const MODE_OPTIONS: Array<{
  id: ProxyMode;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'direct',
    title: 'Direct GitHub API',
    subtitle: 'Default zero-hop connection to api.github.com.',
  },
  {
    id: 'cloudflare_worker',
    title: 'Cloudflare Worker Proxy',
    subtitle: 'Full GET + PUT routing via your private reverse proxy.',
  },
  {
    id: 'custom_prefix',
    title: 'Prefix / CORS Relay',
    subtitle: 'Read-only URL prefix relay (PAT blocked for safety).',
  },
  {
    id: 'mirror_read',
    title: 'CDN Mirror Read + API Write',
    subtitle: 'Ultra-fast CDN config fetch with direct/worker commits.',
  },
];

export const ProxySection: React.FC<ProxySectionProps> = ({
  proxySettings,
  onChangeProxySettings,
  onSaveProxySettings,
  githubSettings,
  attemptLogs,
  onClearAttemptLogs,
  user,
  cloudBusy,
  onSaveCloudProxy,
  onLoadCloudProxy,
}) => {
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeUrl, setNewNodeUrl] = useState('');
  const [newNodeKind, setNewNodeKind] = useState<ProxyNodeKind>('worker');
  const [nodeError, setNodeError] = useState('');

  const [testingRoutes, setTestingRoutes] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ProxyDiagnosticResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showWorkerCode, setShowWorkerCode] = useState(false);

  const androidUrls = useMemo(
    () => buildAndroidMirrorUrls(githubSettings, proxySettings),
    [githubSettings, proxySettings]
  );

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleAddFallbackNode = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newNodeLabel.trim();
    const url = newNodeUrl.trim();
    if (!label) {
      setNodeError('नोड का नाम दर्ज करें (जैसे Backup Worker)।');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setNodeError('मान्य http:// या https:// प्रॉक्सी URL दर्ज करें।');
      return;
    }
    if (proxySettings.fallbackNodes.length >= 10) {
      setNodeError('अधिकतम 10 फ़ॉलबैक प्रॉक्सी नोड्स जोड़े जा सकते हैं।');
      return;
    }

    const nextNode: ProxyNode = {
      id: `node-${Date.now()}`,
      label,
      url,
      enabled: true,
      kind: newNodeKind,
    };

    onChangeProxySettings({
      ...proxySettings,
      fallbackNodes: [...proxySettings.fallbackNodes, nextNode],
    });
    setNewNodeLabel('');
    setNewNodeUrl('');
    setNodeError('');
  };

  const handleToggleNode = (id: string) => {
    onChangeProxySettings({
      ...proxySettings,
      fallbackNodes: proxySettings.fallbackNodes.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n
      ),
    });
  };

  const handleDeleteNode = (id: string) => {
    onChangeProxySettings({
      ...proxySettings,
      fallbackNodes: proxySettings.fallbackNodes.filter((n) => n.id !== id),
    });
  };

  const handleRunDiagnostics = async () => {
    setTestingRoutes(true);
    const targets: Array<{
      id: string;
      label: string;
      kind: 'direct' | ProxyNodeKind;
      url: string;
      headers?: Record<string, string>;
    }> = [
      {
        id: 'direct-api',
        label: 'Direct GitHub API (zen)',
        kind: 'direct',
        url: 'https://api.github.com/zen',
      },
    ];

    const cleanPrimary = normalizeProxyUrl(proxySettings.primaryProxyUrl);
    if (cleanPrimary) {
      const customHeaders =
        proxySettings.customHeaderName.trim() &&
        proxySettings.customHeaderValue.trim()
          ? {
              [proxySettings.customHeaderName.trim()]:
                proxySettings.customHeaderValue.trim(),
            }
          : undefined;

      if (proxySettings.mode === 'custom_prefix') {
        targets.push({
          id: 'primary-prefix',
          label: 'Primary CORS Prefix',
          kind: 'prefix',
          url: `${proxySettings.primaryProxyUrl.trim()}${encodeURIComponent('https://api.github.com/zen')}`,
        });
      } else {
        targets.push({
          id: 'primary-worker',
          label: 'Primary Worker Proxy',
          kind: 'worker',
          url: `${cleanPrimary}/repos/${encodeURIComponent(githubSettings.owner.trim() || 'octocat')}/${encodeURIComponent(githubSettings.repo.trim() || 'Hello-World')}`,
          headers: customHeaders,
        });
      }
    }

    for (const node of proxySettings.fallbackNodes) {
      if (!node.enabled || !node.url.trim()) continue;
      const testUrl =
        node.kind === 'worker'
          ? `${normalizeProxyUrl(node.url) || node.url.trim()}/repos/octocat/Hello-World`
          : `${node.url.trim()}${encodeURIComponent('https://api.github.com/zen')}`;
      targets.push({
        id: node.id,
        label: node.label,
        kind: node.kind,
        url: testUrl,
      });
    }

    if (githubSettings.owner.trim() && githubSettings.repo.trim()) {
      const jsDelivrUrl = androidUrls.find((u) => u.id === 'jsdelivr-cdn')?.url;
      if (jsDelivrUrl) {
        targets.push({
          id: 'jsdelivr-mirror',
          label: 'jsDelivr CDN Mirror',
          kind: 'mirror',
          url: jsDelivrUrl,
        });
      }
    }

    const results = await Promise.all(
      targets.map((t) =>
        probeProxyEndpoint(
          t.id,
          t.label,
          t.kind,
          t.url,
          proxySettings.timeoutMs,
          t.headers
        )
      )
    );
    setDiagnostics(results);
    setTestingRoutes(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Proxy Mode & Core Routing Rules */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Waypoints className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Advanced Proxy & Failover Engine
              </h2>
              <p className="text-sm text-slate-500">
                ISP थ्रॉटलिंग, CORS ब्लॉक या लेटेंसी से बचने के लिए प्राइवेट Cloudflare Worker, CDN मिरर और मल्टी-नोड फ़ॉलबैक कॉन्फ़िगर करें।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSaveProxySettings}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save Proxy Settings</span>
          </button>
        </div>

        {/* Mode Grid */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700">Routing Mode</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MODE_OPTIONS.map((option) => {
              const selected = proxySettings.mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    onChangeProxySettings({ ...proxySettings, mode: option.id })
                  }
                  aria-pressed={selected}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      selected ? 'text-indigo-800' : 'text-slate-900'
                    }`}
                  >
                    {option.title}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {option.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Endpoints & Timing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="primary-proxy-url"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Primary Proxy Endpoint URL
            </label>
            <input
              id="primary-proxy-url"
              type="url"
              value={proxySettings.primaryProxyUrl}
              onChange={(e) =>
                onChangeProxySettings({
                  ...proxySettings,
                  primaryProxyUrl: e.target.value,
                })
              }
              placeholder={
                proxySettings.mode === 'custom_prefix'
                  ? 'https://your-cors-relay.example.com/?url='
                  : 'https://gh-proxy.yourname.workers.dev'
              }
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="raw-mirror-url"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              CDN / Raw Read Mirror Template
            </label>
            <input
              id="raw-mirror-url"
              type="url"
              value={proxySettings.rawMirrorUrl}
              onChange={(e) =>
                onChangeProxySettings({
                  ...proxySettings,
                  rawMirrorUrl: e.target.value,
                })
              }
              placeholder="https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">Presets:</span>
              <button
                type="button"
                onClick={() =>
                  onChangeProxySettings({
                    ...proxySettings,
                    rawMirrorUrl:
                      'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}',
                  })
                }
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                jsDelivr CDN
              </button>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangeProxySettings({
                    ...proxySettings,
                    rawMirrorUrl:
                      'https://cdn.statically.io/gh/{owner}/{repo}/{branch}/{path}',
                  })
                }
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Statically CDN
              </button>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangeProxySettings({
                    ...proxySettings,
                    rawMirrorUrl:
                      'https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}',
                  })
                }
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                GitHub Raw
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="proxy-timeout-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Request Timeout (ms)
            </label>
            <input
              id="proxy-timeout-input"
              type="number"
              min={1000}
              max={60000}
              step={500}
              value={proxySettings.timeoutMs}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                onChangeProxySettings({
                  ...proxySettings,
                  timeoutMs: Number.isFinite(v)
                    ? Math.min(60000, Math.max(1000, v))
                    : 10000,
                });
              }}
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="proxy-retries-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Retries Per Node (0–5)
            </label>
            <input
              id="proxy-retries-input"
              type="number"
              min={0}
              max={5}
              step={1}
              value={proxySettings.maxRetries}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                onChangeProxySettings({
                  ...proxySettings,
                  maxRetries: Number.isFinite(v)
                    ? Math.min(5, Math.max(0, v))
                    : 1,
                });
              }}
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="proxy-header-name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Custom Worker Header Name (Optional)
            </label>
            <input
              id="proxy-header-name"
              type="text"
              value={proxySettings.customHeaderName}
              onChange={(e) =>
                onChangeProxySettings({
                  ...proxySettings,
                  customHeaderName: e.target.value,
                })
              }
              placeholder="e.g. X-Proxy-Key"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="proxy-header-value"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Custom Worker Header Value (LocalStorage Only)
            </label>
            <input
              id="proxy-header-value"
              type="password"
              value={proxySettings.customHeaderValue}
              onChange={(e) =>
                onChangeProxySettings({
                  ...proxySettings,
                  customHeaderValue: e.target.value,
                })
              }
              placeholder="Optional secret key for your Worker"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Failover & PAT Security Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium text-slate-900">
                Auto-Fallback to Direct GitHub API
              </div>
              <p className="text-xs text-slate-500">
                अगर प्रॉक्सी नोड्स टाइमआउट या फ़ेल हों तो स्वचालित रूप से direct api.github.com का प्रयास करें।
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={proxySettings.autoFallbackToDirect}
              aria-label="Toggle auto-fallback to direct GitHub API"
              onClick={() =>
                onChangeProxySettings({
                  ...proxySettings,
                  autoFallbackToDirect: !proxySettings.autoFallbackToDirect,
                })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                proxySettings.autoFallbackToDirect
                  ? 'bg-indigo-600'
                  : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  proxySettings.autoFallbackToDirect
                    ? 'translate-x-5'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                {proxySettings.forwardPatThroughProxy ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                )}
                <span>Forward PAT to Private Worker</span>
              </div>
              <p className="text-xs text-slate-500">
                केवल अपने खुद के Cloudflare Worker के लिए ऑन करें; पब्लिक CORS प्रॉक्सी को PAT कभी नहीं भेजा जाता।
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={proxySettings.forwardPatThroughProxy}
              aria-label="Toggle PAT forwarding to private worker proxy"
              onClick={() =>
                onChangeProxySettings({
                  ...proxySettings,
                  forwardPatThroughProxy: !proxySettings.forwardPatThroughProxy,
                })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                proxySettings.forwardPatThroughProxy
                  ? 'bg-emerald-600'
                  : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  proxySettings.forwardPatThroughProxy
                    ? 'translate-x-5'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Cloud Sync Bar for Proxy Profile */}
        {user && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Cloud className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Signed in as <strong>{user.email}</strong> · Secret header value is never uploaded to Firestore.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onLoadCloudProxy}
                disabled={cloudBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Restore Cloud Proxy</span>
              </button>
              <button
                type="button"
                onClick={onSaveCloudProxy}
                disabled={cloudBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{cloudBusy ? 'Syncing...' : 'Sync Proxy to Cloud'}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Multi-Node Failover Pool */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Fallback Proxy Node Pool ({proxySettings.fallbackNodes.length}/10)
          </h2>
          <p className="text-sm text-slate-500">
            प्राइमरी रूट विफल होने पर एडमिन पैनल नीचे दिए गए क्रम में सक्षम (enabled) बैकअप नोड्स को आज़माएगा।
          </p>
        </div>

        <form
          onSubmit={handleAddFallbackNode}
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          <div className="md:col-span-3">
            <label htmlFor="fallback-label-input" className="sr-only">
              Fallback node label
            </label>
            <input
              id="fallback-label-input"
              type="text"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              placeholder="Node Label (e.g. Mumbai Worker)"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-5">
            <label htmlFor="fallback-url-input" className="sr-only">
              Fallback node URL
            </label>
            <input
              id="fallback-url-input"
              type="url"
              value={newNodeUrl}
              onChange={(e) => setNewNodeUrl(e.target.value)}
              placeholder="https://backup-proxy.workers.dev"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="fallback-kind-select" className="sr-only">
              Fallback node type
            </label>
            <select
              id="fallback-kind-select"
              value={newNodeKind}
              onChange={(e) => setNewNodeKind(e.target.value as ProxyNodeKind)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="worker">Worker (GET/PUT)</option>
              <option value="prefix">Prefix (GET only)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Node</span>
            </button>
          </div>
        </form>

        {nodeError && (
          <p className="text-xs font-medium text-red-700" role="alert">
            {nodeError}
          </p>
        )}

        {proxySettings.fallbackNodes.length === 0 ? (
          <div className="text-xs text-slate-500 py-5 border border-dashed border-slate-200 rounded-lg text-center">
            अभी कोई फ़ॉलबैक नोड नहीं जुड़ा है। ऊपर से एक बैकअप Worker या CORS Prefix जोड़ें।
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {proxySettings.fallbackNodes.map((node, idx) => (
              <div
                key={node.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span className="truncate">{node.label}</span>
                    <span className="text-xs text-slate-400" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {node.kind === 'worker' ? 'Worker' : 'Prefix'}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-slate-500 truncate">
                    {node.url}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleNode(node.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      node.enabled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {node.enabled ? 'Enabled' : 'Paused'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNode(node.id)}
                    aria-label={`Delete fallback node ${node.label}`}
                    className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Live Route Diagnostics & Request Trace */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Live Route Diagnostics & Latency Check
              </h2>
              <p className="text-sm text-slate-500">
                सीधे अपने ब्राउज़र से GitHub API, CDN मिरर्स और कॉन्फ़िगर किए गए प्रॉक्सी नोड्स की वास्तविक लेटेंसी (ms) जांचें।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleRunDiagnostics()}
            disabled={testingRoutes}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <RefreshCw
              className={`w-4 h-4 ${testingRoutes ? 'animate-spin' : ''}`}
            />
            <span>{testingRoutes ? 'Probing...' : 'Run Route Diagnostics'}</span>
          </button>
        </div>

        {diagnostics.length > 0 && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Route</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Latency</th>
                  <th className="py-2.5 px-3 font-medium">Endpoint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diagnostics.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {item.label}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-medium whitespace-nowrap ${
                        item.ok ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {item.detail}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-700 whitespace-nowrap">
                      {item.latencyMs !== null ? `${item.latencyMs} ms` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 max-w-xs truncate">
                      {item.url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">
              Recent Proxy Execution Trace
            </h3>
            {attemptLogs.length > 0 && (
              <button
                type="button"
                onClick={onClearAttemptLogs}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Clear Trace
              </button>
            )}
          </div>

          {attemptLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 border border-dashed border-slate-200 rounded-lg text-center">
              अभी कोई GitHub Sync/Publish कॉल नहीं चली है। अनुरोध चलने पर रूट, HTTP स्टेटस और लेटेंसी यहाँ दिखेगी।
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Time</th>
                    <th className="py-2.5 px-3 font-medium">Op</th>
                    <th className="py-2.5 px-3 font-medium">Route</th>
                    <th className="py-2.5 px-3 font-medium">Result</th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Latency
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attemptLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {log.operation}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                        {log.routeLabel}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-medium ${
                          log.ok ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {log.detail}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-700 whitespace-nowrap">
                        {log.latencyMs} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 4. Android App CDN Mirror URLs & Cloudflare Worker Template */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Android App Config Mirror URLs & Worker Script
              </h2>
              <p className="text-sm text-slate-500">
                आपके लाइव <code className="font-mono text-xs">Shayari Lok</code> एंड्रॉइड ऐप में <code className="font-mono text-xs">config.json</code> लोड करने के लिए तैयार CDN और Worker प्रॉक्सी एंडपॉइंट्स।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWorkerCode((prev) => !prev)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Code2 className="w-4 h-4" />
            <span>
              {showWorkerCode
                ? 'Hide Worker Script'
                : 'View Cloudflare Worker Script'}
            </span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {androidUrls.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">
                  {item.label}
                </div>
                <div className="text-xs text-slate-500">{item.description}</div>
                <div className="mt-1 font-mono text-xs text-indigo-700 break-all">
                  {item.url}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleCopy(item.id, item.url)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {showWorkerCode && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-slate-600">
                Deploy on Cloudflare Workers (Free Tier: 100k req/day) to proxy both GitHub Contents API & Raw Config
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleCopy('worker-template', CLOUDFLARE_WORKER_TEMPLATE)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 whitespace-nowrap"
              >
                {copiedId === 'worker-template' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied Script</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Worker Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{CLOUDFLARE_WORKER_TEMPLATE}</code>
            </pre>
          </div>
        )}
      </section>
    </div>
  );
};
