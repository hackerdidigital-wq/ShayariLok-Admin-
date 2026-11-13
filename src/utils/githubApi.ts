import type {
  GitHubSettings,
  ProxyAttemptLog,
  ProxySettings,
  ShayariLokConfig,
} from '../types/config';
import { decodeUtf8Base64, encodeUtf8Base64 } from './base64';
import { normalizeConfig, serializeConfigJson } from './configHelpers';
import {
  buildTargetGitHubApiUrl,
  DEFAULT_PROXY_SETTINGS,
  executeProxiedRequest,
  fetchWithTimeout,
  resolveMirrorTemplateUrl,
} from './proxyEngine';

const STORAGE_KEY_SETTINGS = 'shayarilok_github_settings_v1';
const STORAGE_KEY_SHA = 'shayarilok_github_sha_v1';
const STORAGE_KEY_DRAFT = 'shayarilok_local_draft_v1';

export const DEFAULT_GITHUB_SETTINGS: GitHubSettings = {
  owner: '',
  repo: '',
  branch: 'main',
  path: 'config.json',
  token: '',
};

export function loadGitHubSettings(): GitHubSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_GITHUB_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_GITHUB_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GitHubSettings>;
    return {
      owner: String(parsed.owner ?? '').trim(),
      repo: String(parsed.repo ?? '').trim(),
      branch: String(parsed.branch ?? 'main').trim() || 'main',
      path: String(parsed.path ?? 'config.json').trim() || 'config.json',
      token: String(parsed.token ?? '').trim(),
    };
  } catch {
    return { ...DEFAULT_GITHUB_SETTINGS };
  }
}

export function saveGitHubSettings(settings: GitHubSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function loadSavedSha(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY_SHA) ?? '';
  } catch {
    return '';
  }
}

export function saveLocalSha(sha: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SHA, sha);
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function loadLocalDraft(): ShayariLokConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DRAFT);
    if (!raw) return null;
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalDraft(config: ShayariLokConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_DRAFT, serializeConfigJson(config));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function isGitHubConfigured(
  settings: GitHubSettings,
  requireToken = false
): boolean {
  const hasRepo =
    settings.owner.trim().length > 0 &&
    settings.repo.trim().length > 0 &&
    settings.path.trim().length > 0;
  if (!hasRepo) return false;
  return requireToken ? settings.token.trim().length > 0 : true;
}

export interface GitHubFetchResult {
  config: ShayariLokConfig;
  sha: string;
  htmlUrl?: string;
  routeLabel: string;
  latencyMs: number;
}

export async function fetchGitHubConfig(
  settings: GitHubSettings,
  proxySettings: ProxySettings = DEFAULT_PROXY_SETTINGS,
  onAttempt?: (log: ProxyAttemptLog) => void
): Promise<GitHubFetchResult> {
  if (!isGitHubConfigured(settings, false)) {
    throw new Error('GitHub Owner, Repository, और File Path भरें।');
  }

  const targetUrl = buildTargetGitHubApiUrl(settings, true);

  // If Dual Mirror Read mode is selected, read config.json from fast CDN mirror first,
  // while still attempting to fetch SHA from Contents API (or configured Worker) so PUT remains ready.
  if (
    proxySettings.mode === 'mirror_read' &&
    proxySettings.rawMirrorUrl.trim()
  ) {
    const mirrorUrl = resolveMirrorTemplateUrl(
      proxySettings.rawMirrorUrl,
      settings
    );
    const started = performance.now();
    try {
      const mirrorRes = await fetchWithTimeout(
        mirrorUrl,
        { method: 'GET', cache: 'no-store' },
        proxySettings.timeoutMs
      );
      const latencyMs = Math.round(performance.now() - started);

      onAttempt?.({
        id: `${Date.now()}-mirror`,
        timestamp: new Date().toLocaleTimeString(),
        operation: 'GET',
        routeLabel: 'CDN Raw Mirror',
        targetUrl: mirrorUrl,
        statusCode: mirrorRes.status,
        latencyMs,
        ok: mirrorRes.ok,
        detail: mirrorRes.ok
          ? `HTTP ${mirrorRes.status} Mirror JSON`
          : `HTTP ${mirrorRes.status} Mirror failed`,
      });

      if (mirrorRes.ok) {
        const parsedMirror = (await mirrorRes.json()) as unknown;
        let resolvedSha = loadSavedSha();
        try {
          const shaAttempt = await executeProxiedRequest({
            operation: 'GET',
            targetUrl,
            proxy: proxySettings,
            ghSettings: settings,
            baseHeaders: {
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            onAttempt,
          });
          if (shaAttempt.response.ok) {
            const meta = (await shaAttempt.response.json()) as { sha?: string };
            if (meta.sha) resolvedSha = meta.sha;
          }
        } catch {
          // Keep existing cached SHA if Contents API metadata check fails on restricted ISP
        }

        return {
          config: normalizeConfig(parsedMirror),
          sha: resolvedSha,
          routeLabel: 'CDN Raw Mirror',
          latencyMs,
        };
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started);
      onAttempt?.({
        id: `${Date.now()}-mirror-err`,
        timestamp: new Date().toLocaleTimeString(),
        operation: 'GET',
        routeLabel: 'CDN Raw Mirror',
        targetUrl: mirrorUrl,
        statusCode: null,
        latencyMs,
        ok: false,
        detail: err instanceof Error ? err.message : 'Mirror fetch failed',
      });
    }
  }

  const { response, routeLabel, latencyMs } = await executeProxiedRequest({
    operation: 'GET',
    targetUrl,
    proxy: proxySettings,
    ghSettings: settings,
    baseHeaders: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    onAttempt,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const apiMessage =
      typeof errBody?.message === 'string'
        ? errBody.message
        : response.statusText;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`GitHub Auth Error (${response.status}): ${apiMessage}`);
    }
    if (response.status === 404) {
      throw new Error(
        `फ़ाइल या रिपॉज़िटरी नहीं मिली (404): ${settings.owner}/${settings.repo}/${settings.path}`
      );
    }
    throw new Error(`GitHub Load Failed (${response.status}): ${apiMessage}`);
  }

  const data = (await response.json()) as {
    sha?: string;
    content?: string;
    encoding?: string;
    html_url?: string;
  };

  if (!data.content || !data.sha) {
    throw new Error('GitHub API response में valid content या sha नहीं मिला।');
  }

  const decodedJson = decodeUtf8Base64(data.content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodedJson);
  } catch {
    throw new Error('रिपॉज़िटरी की config.json वैध JSON फॉर्मेट में नहीं है।');
  }

  return {
    config: normalizeConfig(parsed),
    sha: data.sha,
    htmlUrl: data.html_url,
    routeLabel,
    latencyMs,
  };
}

export interface GitHubPublishResult {
  sha: string;
  commitSha: string;
  commitUrl?: string;
  routeLabel: string;
  latencyMs: number;
}

export async function publishGitHubConfig(
  settings: GitHubSettings,
  config: ShayariLokConfig,
  currentSha: string,
  commitMessage?: string,
  proxySettings: ProxySettings = DEFAULT_PROXY_SETTINGS,
  onAttempt?: (log: ProxyAttemptLog) => void
): Promise<GitHubPublishResult> {
  if (!isGitHubConfigured(settings, true)) {
    throw new Error(
      'Publish करने के लिए GitHub Owner, Repo, Path और Personal Access Token (PAT) आवश्यक हैं।'
    );
  }

  const jsonContent = serializeConfigJson(config) + '\n';
  const encodedContent = encodeUtf8Base64(jsonContent);

  const payload: Record<string, string> = {
    message:
      commitMessage?.trim() ||
      `Update config.json via Shayari Lok Admin (v${config.latest_version_code}, ${config.shayari_list.length} shayaris)`,
    content: encodedContent,
    branch: settings.branch.trim() || 'main',
  };

  if (currentSha.trim()) {
    payload.sha = currentSha.trim();
  }

  const targetUrl = buildTargetGitHubApiUrl(settings, false);
  const { response, routeLabel, latencyMs } = await executeProxiedRequest({
    operation: 'PUT',
    targetUrl,
    proxy: proxySettings,
    ghSettings: settings,
    baseHeaders: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(payload),
    onAttempt,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const apiMessage =
      typeof errBody?.message === 'string'
        ? errBody.message
        : response.statusText;
    if (response.status === 409 || response.status === 422) {
      throw new Error(
        `SHA Conflict (${response.status}): रिमोट फ़ाइल बदल चुकी है। पहले "Sync from GitHub" करें। (${apiMessage})`
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `PAT Permission Error (${response.status}): Token में repo/contents write अनुमति नहीं है।`
      );
    }
    throw new Error(`GitHub Publish Failed (${response.status}): ${apiMessage}`);
  }

  const result = (await response.json()) as {
    content?: { sha?: string };
    commit?: { sha?: string; html_url?: string };
  };

  const newSha = result.content?.sha ?? '';
  if (!newSha) {
    throw new Error('GitHub ने नया file sha वापस नहीं किया।');
  }

  return {
    sha: newSha,
    commitSha: result.commit?.sha ?? newSha,
    commitUrl: result.commit?.html_url,
    routeLabel,
    latencyMs,
  };
}

