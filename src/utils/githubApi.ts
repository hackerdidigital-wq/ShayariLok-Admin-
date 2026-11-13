import type { GitHubSettings, ShayariLokConfig } from '../types/config';
import { decodeUtf8Base64, encodeUtf8Base64 } from './base64';
import { normalizeConfig, serializeConfigJson } from './configHelpers';

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
  window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

export function loadSavedSha(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY_SHA) ?? '';
}

export function saveLocalSha(sha: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY_SHA, sha);
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
  window.localStorage.setItem(STORAGE_KEY_DRAFT, serializeConfigJson(config));
}

function buildContentsUrl(settings: GitHubSettings, includeRef: boolean): string {
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
}

export async function fetchGitHubConfig(
  settings: GitHubSettings
): Promise<GitHubFetchResult> {
  if (!isGitHubConfigured(settings, false)) {
    throw new Error('GitHub Owner, Repository, और File Path भरें।');
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (settings.token.trim()) {
    headers.Authorization = `Bearer ${settings.token.trim()}`;
  }

  const url = buildContentsUrl(settings, true);
  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const apiMessage =
      typeof errBody?.message === 'string' ? errBody.message : response.statusText;
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
  };
}

export interface GitHubPublishResult {
  sha: string;
  commitSha: string;
  commitUrl?: string;
}

export async function publishGitHubConfig(
  settings: GitHubSettings,
  config: ShayariLokConfig,
  currentSha: string,
  commitMessage?: string
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

  const url = buildContentsUrl(settings, false);
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${settings.token.trim()}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const apiMessage =
      typeof errBody?.message === 'string' ? errBody.message : response.statusText;
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
  };
}
