import type { AdminSection, ShayariItem, ShayariLokConfig } from '../types/config';
import type { EnterpriseTabId } from './enterpriseSettings';

export type PublicSitePageId =
  | 'home'
  | 'shayari'
  | 'suvichar'
  | 'updates'
  | 'privacy';

export type AppRouteState =
  | { view: 'admin'; section: Exclude<AdminSection, 'settings'> }
  | { view: 'settings'; tab: EnterpriseTabId | null }
  | { view: 'site'; page: PublicSitePageId };

export interface PublicRepoOverride {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export interface StandaloneShareOptions {
  page?: PublicSitePageId;
  siteId?: string | null;
  repoOverride?: PublicRepoOverride | null;
}

const ADMIN_SECTIONS: ReadonlyArray<Exclude<AdminSection, 'settings'>> = [
  'dashboard',
  'shayari',
  'notifications',
  'localization',
  'monetization',
  'android-api',
  'social-monitor',
  'proxy',
  'sync',
  'website',
];

const SETTINGS_TABS: ReadonlyArray<EnterpriseTabId> = [
  'identity',
  'guardrails',
  'snapshots',
  'backup',
  'bulk_import',
  'hygiene',
  'print_report',
  'pin_lock',
  'appearance',
  'security_vault',
];

const PUBLIC_PAGES: ReadonlyArray<PublicSitePageId> = [
  'home',
  'shayari',
  'suvichar',
  'updates',
  'privacy',
];

export function parseAppRoute(hash: string): AppRouteState {
  const cleaned = (hash || '').replace(/^#\/?/, '').split('?')[0].trim();
  if (!cleaned) {
    return { view: 'admin', section: 'dashboard' };
  }

  const segments = cleaned.split('/').filter(Boolean);
  const head = segments[0];

  if (head === 'settings') {
    const candidate = segments[1] as EnterpriseTabId | undefined;
    if (candidate && SETTINGS_TABS.includes(candidate)) {
      return { view: 'settings', tab: candidate };
    }
    return { view: 'settings', tab: null };
  }

  if (head === 'site') {
    const candidate = segments[1] as PublicSitePageId | undefined;
    if (candidate && PUBLIC_PAGES.includes(candidate)) {
      return { view: 'site', page: candidate };
    }
    return { view: 'site', page: 'home' };
  }

  if (
    head &&
    ADMIN_SECTIONS.includes(head as Exclude<AdminSection, 'settings'>)
  ) {
    return {
      view: 'admin',
      section: head as Exclude<AdminSection, 'settings'>,
    };
  }

  return { view: 'admin', section: 'dashboard' };
}

export function buildAdminHash(section: Exclude<AdminSection, 'settings'>): string {
  return `#/${section}`;
}

export function buildSettingsHash(tab?: EnterpriseTabId | null): string {
  return tab ? `#/settings/${tab}` : '#/settings';
}

export function buildPublicSiteHash(page: PublicSitePageId = 'home'): string {
  return page === 'home' ? '#/site' : `#/site/${page}`;
}

export function parsePublicRepoOverride(input: string): PublicRepoOverride | null {
  const rawQuery = (input || '').includes('?') ? (input || '').split('?')[1] : input;
  const queryPart = rawQuery.split('#')[0];
  if (!queryPart) return null;
  const params = new URLSearchParams(queryPart);
  const owner = (params.get('owner') || '').trim();
  const repo = (params.get('repo') || '').trim();
  if (!owner || !repo) return null;
  return {
    owner,
    repo,
    branch: (params.get('branch') || 'main').trim() || 'main',
    path: (params.get('path') || 'config.json').trim() || 'config.json',
  };
}

export function parseStandaloneQuery(search: string, hash: string): {
  page: PublicSitePageId;
  siteId: string | null;
  repoOverride: PublicRepoOverride | null;
} {
  const cleanSearch = (search || '').replace(/^\?/, '');
  const searchParams = new URLSearchParams(cleanSearch);
  const hashClean = (hash || '').replace(/^#\/?/, '').split('?')[0].trim();
  const pageCandidate = (searchParams.get('page') || hashClean) as PublicSitePageId;
  const page: PublicSitePageId = PUBLIC_PAGES.includes(pageCandidate)
    ? pageCandidate
    : 'home';
  const siteIdRaw = (searchParams.get('site') || '').trim();
  const siteId = /^[a-zA-Z0-9_-]{1,128}$/.test(siteIdRaw) ? siteIdRaw : null;
  const repoOverride =
    parsePublicRepoOverride(search) ?? parsePublicRepoOverride(hash);
  return { page, siteId, repoOverride };
}

export type StandaloneHtmlFile =
  | 'website.html'
  | 'privacy.html'
  | 'terms.html'
  | 'about.html'
  | 'contact.html';

export function resolveDirectoryBase(origin: string, pathname: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const rawPath = pathname || '/';
  const dirPath = rawPath.replace(
    /(?:index|website|privacy|terms|about|contact)\.html$/i,
    ''
  );
  const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  return `${cleanOrigin}${normalizedDir}`;
}

export function buildStandaloneEntryUrl(
  entryHtml: StandaloneHtmlFile,
  origin: string,
  pathname: string,
  options: StandaloneShareOptions = {}
): string {
  const baseDir = resolveDirectoryBase(origin, pathname);
  const params = new URLSearchParams();
  if (entryHtml === 'website.html' && options.page && options.page !== 'home') {
    params.set('page', options.page);
  }
  if (options.siteId) {
    params.set('site', options.siteId);
  }
  if (
    options.repoOverride &&
    options.repoOverride.owner &&
    options.repoOverride.repo
  ) {
    params.set('owner', options.repoOverride.owner);
    params.set('repo', options.repoOverride.repo);
    params.set('branch', options.repoOverride.branch || 'main');
    params.set('path', options.repoOverride.path || 'config.json');
  }
  const qs = params.toString();
  return `${baseDir}${entryHtml}${qs ? `?${qs}` : ''}`;
}

export function buildFullPublicUrl(
  origin: string,
  pathname: string,
  page: PublicSitePageId,
  repoOverride?: PublicRepoOverride | null
): string {
  const base = `${origin.replace(/\/+$/, '')}${pathname || '/'}`;
  const hash = buildPublicSiteHash(page);
  if (repoOverride && repoOverride.owner && repoOverride.repo) {
    const params = new URLSearchParams({
      owner: repoOverride.owner,
      repo: repoOverride.repo,
      branch: repoOverride.branch || 'main',
      path: repoOverride.path || 'config.json',
    });
    return `${base}${hash}?${params.toString()}`;
  }
  return `${base}${hash}`;
}

export function filterPublicShayaris(
  list: ShayariItem[],
  category: string,
  query: string
): ShayariItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return list.filter((item) => {
    const matchesCategory =
      !category || category === 'All' || item.category === category;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;
    return (
      item.text.toLowerCase().includes(normalizedQuery) ||
      item.author.toLowerCase().includes(normalizedQuery) ||
      item.category.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function groupCategoryCounts(
  config: ShayariLokConfig
): Array<{ category: string; count: number }> {
  const map = new Map<string, number>();
  for (const cat of config.categories) {
    if (cat !== 'All') map.set(cat, 0);
  }
  for (const item of config.shayari_list) {
    const cat = item.category || 'Uncategorized';
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}

export function isLegacyPlaceholderPolicyUrl(url: string): boolean {
  const trimmed = (url || '').trim().toLowerCase();
  if (!trimmed) return true;
  return (
    trimmed === 'https://shayarilok.in/privacy-policy' ||
    trimmed === 'http://shayarilok.in/privacy-policy' ||
    trimmed === 'https://shayarilok.in' ||
    trimmed === 'http://shayarilok.in' ||
    trimmed.startsWith('https://shayarilok.in/') ||
    trimmed.startsWith('http://shayarilok.in/')
  );
}

export function resolveEffectivePolicyUrl(
  configuredUrl: string,
  hostedPrivacyHref?: string
): string {
  const fallback = hostedPrivacyHref?.trim() || './privacy.html';
  if (isLegacyPlaceholderPolicyUrl(configuredUrl)) {
    return fallback;
  }
  return configuredUrl.trim();
}

