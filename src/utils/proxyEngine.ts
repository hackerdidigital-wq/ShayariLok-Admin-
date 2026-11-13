import type {
  GitHubSettings,
  ProxyAttemptLog,
  ProxyDiagnosticResult,
  ProxyMode,
  ProxyNode,
  ProxyNodeKind,
  ProxySettings,
} from '../types/config';

const STORAGE_KEY_PROXY = 'shayarilok_proxy_settings_v1';

export const DEFAULT_PROXY_SETTINGS: ProxySettings = {
  mode: 'direct',
  primaryProxyUrl: '',
  rawMirrorUrl:
    'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}',
  fallbackNodes: [],
  timeoutMs: 10000,
  maxRetries: 1,
  autoFallbackToDirect: true,
  forwardPatThroughProxy: false,
  customHeaderName: '',
  customHeaderValue: '',
};

export interface RouteCandidate {
  id: string;
  label: string;
  kind: 'direct' | ProxyNodeKind;
  proxyBaseUrl: string;
}

export function normalizeProxyUrl(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
}

export function normalizeProxySettings(raw: unknown): ProxySettings {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;

  const validModes: ProxyMode[] = [
    'direct',
    'cloudflare_worker',
    'custom_prefix',
    'mirror_read',
  ];
  const mode = validModes.includes(obj.mode as ProxyMode)
    ? (obj.mode as ProxyMode)
    : 'direct';

  const rawNodes = Array.isArray(obj.fallbackNodes) ? obj.fallbackNodes : [];
  const fallbackNodes: ProxyNode[] = rawNodes
    .filter((n): n is Record<string, unknown> =>
      Boolean(n && typeof n === 'object')
    )
    .slice(0, 10)
    .map((n, index) => {
      const kind: ProxyNodeKind =
        n.kind === 'prefix' || n.kind === 'mirror' ? n.kind : 'worker';
      return {
        id: String(n.id ?? `node-${index + 1}`).slice(0, 64),
        label:
          String(n.label ?? `Fallback Node ${index + 1}`)
            .trim()
            .slice(0, 60) || `Fallback Node ${index + 1}`,
        url: String(n.url ?? '').trim().slice(0, 500),
        enabled: n.enabled !== false,
        kind,
      };
    });

  const parsedTimeout = Number.parseInt(String(obj.timeoutMs ?? 10000), 10);
  const timeoutMs = Number.isFinite(parsedTimeout)
    ? Math.min(60000, Math.max(1000, parsedTimeout))
    : 10000;

  const parsedRetries = Number.parseInt(String(obj.maxRetries ?? 1), 10);
  const maxRetries = Number.isFinite(parsedRetries)
    ? Math.min(5, Math.max(0, parsedRetries))
    : 1;

  return {
    mode,
    primaryProxyUrl: String(obj.primaryProxyUrl ?? '').trim().slice(0, 500),
    rawMirrorUrl:
      String(obj.rawMirrorUrl ?? '').trim().slice(0, 500) ||
      DEFAULT_PROXY_SETTINGS.rawMirrorUrl,
    fallbackNodes,
    timeoutMs,
    maxRetries,
    autoFallbackToDirect: obj.autoFallbackToDirect !== false,
    forwardPatThroughProxy: Boolean(obj.forwardPatThroughProxy),
    customHeaderName: String(obj.customHeaderName ?? '').trim().slice(0, 80),
    customHeaderValue: String(obj.customHeaderValue ?? '').trim().slice(0, 200),
  };
}

export function loadProxySettings(): ProxySettings {
  if (typeof window === 'undefined') return { ...DEFAULT_PROXY_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PROXY);
    if (!raw) return { ...DEFAULT_PROXY_SETTINGS };
    return normalizeProxySettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PROXY_SETTINGS };
  }
}

export function saveProxySettings(settings: ProxySettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY_PROXY,
      JSON.stringify(normalizeProxySettings(settings))
    );
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

/**
 * Strips local-only secret header value before persisting to Firestore.
 */
export function sanitizeProxySettingsForFirestore(settings: ProxySettings) {
  const clean = normalizeProxySettings(settings);
  return {
    mode: clean.mode,
    primaryProxyUrl: clean.primaryProxyUrl,
    rawMirrorUrl: clean.rawMirrorUrl,
    fallbackNodes: clean.fallbackNodes.map((node) => ({
      id: node.id,
      label: node.label,
      url: node.url,
      enabled: node.enabled,
      kind: node.kind,
    })),
    timeoutMs: clean.timeoutMs,
    maxRetries: clean.maxRetries,
    autoFallbackToDirect: clean.autoFallbackToDirect,
    forwardPatThroughProxy: clean.forwardPatThroughProxy,
    customHeaderName: clean.customHeaderName,
  };
}

export function buildTargetGitHubApiUrl(
  settings: GitHubSettings,
  includeRef: boolean
): string {
  const owner = encodeURIComponent(settings.owner.trim());
  const repo = encodeURIComponent(settings.repo.trim());
  const cleanPath = settings.path
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  const base = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;
  if (!includeRef || !settings.branch.trim()) return base;
  return `${base}?ref=${encodeURIComponent(settings.branch.trim())}`;
}

export function resolveMirrorTemplateUrl(
  template: string,
  settings: GitHubSettings
): string {
  const trimmed = template.trim();
  if (!trimmed) return '';
  const owner = encodeURIComponent(settings.owner.trim() || 'owner');
  const repo = encodeURIComponent(settings.repo.trim() || 'repo');
  const branch = encodeURIComponent(settings.branch.trim() || 'main');
  const cleanPath = settings.path
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');

  return trimmed
    .replace(/\{owner\}/gi, owner)
    .replace(/\{repo\}/gi, repo)
    .replace(/\{branch\}/gi, branch)
    .replace(/\{path\}/gi, cleanPath || 'config.json');
}

export function buildProxiedGitHubUrl(
  targetGitHubUrl: string,
  proxyBaseUrl: string,
  kind: 'direct' | ProxyNodeKind,
  ghSettings?: GitHubSettings
): string {
  if (kind === 'direct') return targetGitHubUrl;

  const trimmedProxy = proxyBaseUrl.trim();
  if (!trimmedProxy) return targetGitHubUrl;

  if (kind === 'mirror') {
    if (ghSettings) {
      return resolveMirrorTemplateUrl(trimmedProxy, ghSettings);
    }
    return trimmedProxy;
  }

  if (kind === 'worker') {
    const cleanBase = normalizeProxyUrl(trimmedProxy);
    if (!cleanBase) return targetGitHubUrl;
    if (targetGitHubUrl.startsWith('https://api.github.com')) {
      return `${cleanBase}${targetGitHubUrl.slice('https://api.github.com'.length)}`;
    }
    return `${cleanBase}/?url=${encodeURIComponent(targetGitHubUrl)}`;
  }

  // kind === 'prefix'
  if (
    trimmedProxy.endsWith('?') ||
    trimmedProxy.endsWith('=') ||
    trimmedProxy.includes('?url=') ||
    trimmedProxy.includes('&url=')
  ) {
    return `${trimmedProxy}${encodeURIComponent(targetGitHubUrl)}`;
  }
  if (trimmedProxy.endsWith('/')) {
    return `${trimmedProxy}${targetGitHubUrl}`;
  }
  return `${trimmedProxy}/?url=${encodeURIComponent(targetGitHubUrl)}`;
}

/**
 * Security guard: Never forward GitHub PAT to public prefix/CDN proxies.
 * PAT is sent ONLY to direct api.github.com, or to a self-hosted Worker when explicitly opted in.
 */
export function shouldAttachAuthHeader(
  candidateKind: 'direct' | ProxyNodeKind,
  proxy: ProxySettings,
  hasToken: boolean
): boolean {
  if (!hasToken) return false;
  if (candidateKind === 'direct') return true;
  if (candidateKind === 'worker') return proxy.forwardPatThroughProxy;
  return false;
}

export function resolveRouteChain(
  proxy: ProxySettings,
  operation: 'GET' | 'PUT'
): RouteCandidate[] {
  const directCandidate: RouteCandidate = {
    id: 'direct-github',
    label: 'Direct GitHub API',
    kind: 'direct',
    proxyBaseUrl: 'https://api.github.com',
  };

  if (proxy.mode === 'direct') {
    return [directCandidate];
  }

  const chain: RouteCandidate[] = [];
  const cleanPrimary = normalizeProxyUrl(proxy.primaryProxyUrl);

  if (proxy.mode === 'cloudflare_worker' && cleanPrimary) {
    chain.push({
      id: 'primary-worker',
      label: 'Primary Worker Proxy',
      kind: 'worker',
      proxyBaseUrl: cleanPrimary,
    });
  } else if (
    proxy.mode === 'custom_prefix' &&
    proxy.primaryProxyUrl.trim() &&
    operation === 'GET'
  ) {
    chain.push({
      id: 'primary-prefix',
      label: 'Primary CORS Prefix',
      kind: 'prefix',
      proxyBaseUrl: proxy.primaryProxyUrl.trim(),
    });
  } else if (proxy.mode === 'mirror_read') {
    if (operation === 'PUT' && cleanPrimary) {
      chain.push({
        id: 'mirror-write-worker',
        label: 'Primary Worker Proxy',
        kind: 'worker',
        proxyBaseUrl: cleanPrimary,
      });
    } else if (operation === 'GET' && cleanPrimary) {
      chain.push({
        id: 'mirror-primary-worker',
        label: 'Primary Worker Proxy',
        kind: 'worker',
        proxyBaseUrl: cleanPrimary,
      });
    }
  }

  for (const node of proxy.fallbackNodes) {
    if (!node.enabled || !node.url.trim()) continue;
    // Do not send PUT mutations through public prefix or read-only mirror nodes
    if (operation === 'PUT' && node.kind !== 'worker') continue;
    if (node.kind === 'mirror') continue;

    chain.push({
      id: node.id,
      label: node.label,
      kind: node.kind,
      proxyBaseUrl: node.url.trim(),
    });
  }

  if (proxy.autoFallbackToDirect || chain.length === 0) {
    chain.push(directCandidate);
  }

  return chain;
}

export interface AndroidMirrorUrlItem {
  id: string;
  label: string;
  url: string;
  description: string;
}

export function buildAndroidMirrorUrls(
  gh: GitHubSettings,
  proxy: ProxySettings
): AndroidMirrorUrlItem[] {
  const owner = gh.owner.trim() || 'your-username';
  const repo = gh.repo.trim() || 'shayari-lok-config';
  const branch = gh.branch.trim() || 'main';
  const filePath = gh.path.trim().replace(/^\/+/, '') || 'config.json';

  const placeholderSettings: GitHubSettings = {
    owner,
    repo,
    branch,
    path: filePath,
    token: '',
  };

  const items: AndroidMirrorUrlItem[] = [
    {
      id: 'raw-github',
      label: 'GitHub Raw (Default)',
      url: `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${filePath}`,
      description: 'Direct GitHub Raw endpoint for Android HttpURLConnection.',
    },
    {
      id: 'jsdelivr-cdn',
      label: 'jsDelivr Global CDN Mirror',
      url: `https://cdn.jsdelivr.net/gh/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}@${encodeURIComponent(branch)}/${filePath}`,
      description: 'ISP-friendly global CDN edge cache with automatic purge support.',
    },
    {
      id: 'statically-cdn',
      label: 'Statically CDN Mirror',
      url: `https://cdn.statically.io/gh/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${filePath}`,
      description: 'Secondary global CDN mirror for failover in Android app.',
    },
  ];

  const cleanWorker = normalizeProxyUrl(proxy.primaryProxyUrl);
  if (cleanWorker) {
    items.unshift({
      id: 'worker-raw',
      label: 'Custom Cloudflare Worker Proxy (Recommended)',
      url: `${cleanWorker}/raw/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${filePath}`,
      description: 'Bypasses ISP throttling and adds clean JSON caching headers.',
    });
  }

  if (
    proxy.rawMirrorUrl.trim() &&
    !proxy.rawMirrorUrl.includes('cdn.jsdelivr.net')
  ) {
    items.push({
      id: 'custom-mirror',
      label: 'Configured Custom Mirror',
      url: resolveMirrorTemplateUrl(proxy.rawMirrorUrl, placeholderSettings),
      description: 'Resolved URL from your custom Read Mirror template.',
    });
  }

  return items;
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export async function executeProxiedRequest(params: {
  operation: 'GET' | 'PUT';
  targetUrl: string;
  proxy: ProxySettings;
  ghSettings: GitHubSettings;
  baseHeaders: Record<string, string>;
  body?: string;
  onAttempt?: (log: ProxyAttemptLog) => void;
}): Promise<{
  response: Response;
  routeLabel: string;
  latencyMs: number;
}> {
  const {
    operation,
    targetUrl,
    proxy,
    ghSettings,
    baseHeaders,
    body,
    onAttempt,
  } = params;
  const routes = resolveRouteChain(proxy, operation);
  const hasToken = ghSettings.token.trim().length > 0;
  let lastError: Error | null = null;
  let lastResponse: {
    response: Response;
    routeLabel: string;
    latencyMs: number;
  } | null = null;

  for (const route of routes) {
    const finalUrl = buildProxiedGitHubUrl(
      targetUrl,
      route.proxyBaseUrl,
      route.kind,
      ghSettings
    );

    const reqHeaders: Record<string, string> = { ...baseHeaders };
    if (shouldAttachAuthHeader(route.kind, proxy, hasToken)) {
      reqHeaders.Authorization = `Bearer ${ghSettings.token.trim()}`;
    }
    if (
      route.kind === 'worker' &&
      proxy.customHeaderName.trim() &&
      proxy.customHeaderValue.trim()
    ) {
      reqHeaders[proxy.customHeaderName.trim()] = proxy.customHeaderValue.trim();
    }

    const totalAttempts = 1 + Math.max(0, proxy.maxRetries);
    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      const started = performance.now();
      try {
        const response = await fetchWithTimeout(
          finalUrl,
          {
            method: operation,
            headers: reqHeaders,
            cache: 'no-store',
            body: operation === 'PUT' ? body : undefined,
          },
          proxy.timeoutMs
        );
        const latencyMs = Math.round(performance.now() - started);

        onAttempt?.({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          operation,
          routeLabel: route.label,
          targetUrl: finalUrl,
          statusCode: response.status,
          latencyMs,
          ok: response.ok,
          detail: response.ok
            ? `HTTP ${response.status} OK`
            : `HTTP ${response.status} ${response.statusText}`,
        });

        // Do not retry 4xx auth/validation/conflict errors; handle or pass back directly
        if (response.ok) {
          return { response, routeLabel: route.label, latencyMs };
        }
        lastResponse = { response, routeLabel: route.label, latencyMs };
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
      } catch (err) {
        const latencyMs = Math.round(performance.now() - started);
        const detail =
          err instanceof Error && err.name === 'AbortError'
            ? `Timeout after ${proxy.timeoutMs}ms`
            : err instanceof Error
              ? err.message
              : 'Network request failed';
        lastError = new Error(`${route.label}: ${detail}`);

        onAttempt?.({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          operation,
          routeLabel: route.label,
          targetUrl: finalUrl,
          statusCode: null,
          latencyMs,
          ok: false,
          detail,
        });
      }
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw lastError ?? new Error('All proxy and direct GitHub routes failed.');
}

export async function probeProxyEndpoint(
  id: string,
  label: string,
  kind: 'direct' | ProxyNodeKind,
  url: string,
  timeoutMs: number,
  customHeaders?: Record<string, string>
): Promise<ProxyDiagnosticResult> {
  const started = performance.now();
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(customHeaders ?? {}),
        },
        cache: 'no-store',
      },
      timeoutMs
    );
    const latencyMs = Math.round(performance.now() - started);
    return {
      id,
      label,
      kind,
      url,
      ok: res.ok,
      statusCode: res.status,
      latencyMs,
      detail: res.ok
        ? `Reachable (${res.status})`
        : `HTTP ${res.status} ${res.statusText}`,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - started);
    const detail =
      err instanceof Error && err.name === 'AbortError'
        ? `Timed out (${timeoutMs}ms)`
        : err instanceof Error
          ? err.message
          : 'Unreachable / CORS blocked';
    return {
      id,
      label,
      kind,
      url,
      ok: false,
      statusCode: null,
      latencyMs,
      detail,
    };
  }
}

export const CLOUDFLARE_WORKER_TEMPLATE = `// Cloudflare Worker: Shayari Lok GitHub API & Raw Config Proxy
// Deploy for free at https://workers.cloudflare.com
export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-GitHub-Api-Version, X-Proxy-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 1. Android App Raw Config Mirror: /raw/{owner}/{repo}/{branch}/{path}
    if (url.pathname.startsWith('/raw/')) {
      const rawPath = url.pathname.slice('/raw/'.length);
      const rawRes = await fetch('https://raw.githubusercontent.com/' + rawPath, {
        headers: { 'User-Agent': 'ShayariLok-Proxy-Worker' },
      });
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'application/json; charset=utf-8');
      headers.set('Cache-Control', 'public, max-age=60');
      return new Response(rawRes.body, { status: rawRes.status, headers });
    }

    // 2. Admin Panel GitHub Contents API Proxy: /repos/...
    if (!url.pathname.startsWith('/repos/')) {
      return new Response(JSON.stringify({ ok: true, service: 'Shayari Lok Proxy' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = 'https://api.github.com' + url.pathname + url.search;
    const forwardHeaders = new Headers();
    forwardHeaders.set('User-Agent', 'ShayariLok-Admin-Proxy');
    forwardHeaders.set('Accept', request.headers.get('Accept') || 'application/vnd.github+json');
    if (request.headers.has('Authorization')) {
      forwardHeaders.set('Authorization', request.headers.get('Authorization'));
    }
    if (request.headers.has('Content-Type')) {
      forwardHeaders.set('Content-Type', request.headers.get('Content-Type'));
    }

    const ghRes = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: request.method === 'PUT' ? await request.text() : undefined,
    });

    const outHeaders = new Headers(corsHeaders);
    outHeaders.set('Content-Type', ghRes.headers.get('Content-Type') || 'application/json');
    return new Response(ghRes.body, { status: ghRes.status, headers: outHeaders });
  },
};`;
