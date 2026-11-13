import test from 'node:test';
import assert from 'node:assert/strict';
import type { GitHubSettings, ProxySettings } from '../types/config';
import {
  buildAndroidMirrorUrls,
  buildProxiedGitHubUrl,
  buildTargetGitHubApiUrl,
  DEFAULT_PROXY_SETTINGS,
  normalizeProxySettings,
  normalizeProxyUrl,
  resolveMirrorTemplateUrl,
  resolveRouteChain,
  sanitizeProxySettingsForFirestore,
  shouldAttachAuthHeader,
} from './proxyEngine';

const sampleGitHub: GitHubSettings = {
  owner: 'cyberking',
  repo: 'shayarilok-config',
  branch: 'main',
  path: 'data/config.json',
  token: 'ghp_secret_token_123',
};

test('normalizeProxyUrl trims trailing slashes and rejects non-http schemes', () => {
  assert.equal(
    normalizeProxyUrl('  https://worker.example.workers.dev/  '),
    'https://worker.example.workers.dev'
  );
  assert.equal(normalizeProxyUrl('javascript:alert(1)'), '');
  assert.equal(normalizeProxyUrl('not-a-url'), '');
});

test('buildProxiedGitHubUrl formats worker, prefix, and mirror routes accurately', () => {
  const target = buildTargetGitHubApiUrl(sampleGitHub, true);
  assert.equal(
    target,
    'https://api.github.com/repos/cyberking/shayarilok-config/contents/data/config.json?ref=main'
  );

  assert.equal(
    buildProxiedGitHubUrl(target, '', 'direct'),
    target
  );

  assert.equal(
    buildProxiedGitHubUrl(
      target,
      'https://gh-proxy.shayarilok.workers.dev/',
      'worker'
    ),
    'https://gh-proxy.shayarilok.workers.dev/repos/cyberking/shayarilok-config/contents/data/config.json?ref=main'
  );

  assert.equal(
    buildProxiedGitHubUrl(target, 'https://cors-relay.example.com/?url=', 'prefix'),
    `https://cors-relay.example.com/?url=${encodeURIComponent(target)}`
  );

  assert.equal(
    resolveMirrorTemplateUrl(
      'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}',
      sampleGitHub
    ),
    'https://cdn.jsdelivr.net/gh/cyberking/shayarilok-config@main/data/config.json'
  );
});

test('shouldAttachAuthHeader prevents leaking PAT to public prefix or CDN mirrors', () => {
  const proxyOptOut: ProxySettings = {
    ...DEFAULT_PROXY_SETTINGS,
    mode: 'cloudflare_worker',
    forwardPatThroughProxy: false,
  };
  assert.equal(shouldAttachAuthHeader('direct', proxyOptOut, true), true);
  assert.equal(shouldAttachAuthHeader('worker', proxyOptOut, true), false);
  assert.equal(shouldAttachAuthHeader('prefix', proxyOptOut, true), false);
  assert.equal(shouldAttachAuthHeader('mirror', proxyOptOut, true), false);

  const proxyOptIn: ProxySettings = {
    ...proxyOptOut,
    forwardPatThroughProxy: true,
  };
  assert.equal(shouldAttachAuthHeader('worker', proxyOptIn, true), true);
  assert.equal(shouldAttachAuthHeader('prefix', proxyOptIn, true), false);
  assert.equal(shouldAttachAuthHeader('mirror', proxyOptIn, true), false);
});

test('resolveRouteChain builds ordered failover routes and blocks PUT on prefix/mirror', () => {
  const settings = normalizeProxySettings({
    mode: 'cloudflare_worker',
    primaryProxyUrl: 'https://primary.workers.dev/',
    fallbackNodes: [
      {
        id: 'n1',
        label: 'Backup Worker',
        url: 'https://backup.workers.dev',
        enabled: true,
        kind: 'worker',
      },
      {
        id: 'n2',
        label: 'Public CORS Prefix',
        url: 'https://cors.example.com/?url=',
        enabled: true,
        kind: 'prefix',
      },
      {
        id: 'n3',
        label: 'Disabled Node',
        url: 'https://disabled.workers.dev',
        enabled: false,
        kind: 'worker',
      },
    ],
    autoFallbackToDirect: true,
  });

  const getRoutes = resolveRouteChain(settings, 'GET');
  assert.deepEqual(
    getRoutes.map((r) => r.id),
    ['primary-worker', 'n1', 'n2', 'direct-github']
  );

  const putRoutes = resolveRouteChain(settings, 'PUT');
  assert.deepEqual(
    putRoutes.map((r) => r.id),
    ['primary-worker', 'n1', 'direct-github']
  );
});

test('buildAndroidMirrorUrls includes custom worker /raw route and CDN endpoints', () => {
  const proxy: ProxySettings = {
    ...DEFAULT_PROXY_SETTINGS,
    mode: 'cloudflare_worker',
    primaryProxyUrl: 'https://gh-proxy.shayarilok.workers.dev',
  };
  const urls = buildAndroidMirrorUrls(sampleGitHub, proxy);
  assert.equal(urls[0].id, 'worker-raw');
  assert.equal(
    urls[0].url,
    'https://gh-proxy.shayarilok.workers.dev/raw/cyberking/shayarilok-config/main/data/config.json'
  );
  assert.ok(urls.some((u) => u.id === 'jsdelivr-cdn'));
  assert.ok(urls.some((u) => u.id === 'raw-github'));
});

test('sanitizeProxySettingsForFirestore strips customHeaderValue secret and bounds lists', () => {
  const dirty: ProxySettings = {
    ...DEFAULT_PROXY_SETTINGS,
    mode: 'cloudflare_worker',
    primaryProxyUrl: 'https://worker.dev',
    timeoutMs: 999999,
    maxRetries: 99,
    customHeaderName: 'X-Proxy-Key',
    customHeaderValue: 'super-secret-value-do-not-sync',
  };
  const sanitized = sanitizeProxySettingsForFirestore(dirty);
  assert.equal('customHeaderValue' in sanitized, false);
  assert.equal(sanitized.timeoutMs, 60000);
  assert.equal(sanitized.maxRetries, 5);
  assert.equal(sanitized.customHeaderName, 'X-Proxy-Key');
});
