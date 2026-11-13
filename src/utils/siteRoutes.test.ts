import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminHash,
  buildFullPublicUrl,
  buildPublicSiteHash,
  buildSettingsHash,
  buildStandaloneEntryUrl,
  filterPublicShayaris,
  groupCategoryCounts,
  isLegacyPlaceholderPolicyUrl,
  parseAppRoute,
  parsePublicRepoOverride,
  parseStandaloneQuery,
  resolveEffectivePolicyUrl,
} from './siteRoutes';
import { DEFAULT_CONFIG } from './configHelpers';

test('parseAppRoute routes admin, full-screen settings, and live website paths cleanly', () => {
  assert.deepEqual(parseAppRoute(''), { view: 'admin', section: 'dashboard' });
  assert.deepEqual(parseAppRoute('#/shayari'), {
    view: 'admin',
    section: 'shayari',
  });
  assert.deepEqual(parseAppRoute('#/website'), {
    view: 'admin',
    section: 'website',
  });
  assert.deepEqual(parseAppRoute('#/settings'), {
    view: 'settings',
    tab: null,
  });
  assert.deepEqual(parseAppRoute('#/settings/bulk_import'), {
    view: 'settings',
    tab: 'bulk_import',
  });
  assert.deepEqual(parseAppRoute('#/settings/unknown_tab'), {
    view: 'settings',
    tab: null,
  });
  assert.deepEqual(parseAppRoute('#/site'), { view: 'site', page: 'home' });
  assert.deepEqual(parseAppRoute('#/site/shayari'), {
    view: 'site',
    page: 'shayari',
  });
  assert.deepEqual(parseAppRoute('#/site/suvichar'), {
    view: 'site',
    page: 'suvichar',
  });
  assert.deepEqual(parseAppRoute('#/site/privacy?owner=u&repo=r'), {
    view: 'site',
    page: 'privacy',
  });
});

test('hash, standalone entry URLs, and query parsers work seamlessly', () => {
  assert.equal(buildAdminHash('proxy'), '#/proxy');
  assert.equal(buildSettingsHash(), '#/settings');
  assert.equal(buildSettingsHash('pin_lock'), '#/settings/pin_lock');
  assert.equal(buildPublicSiteHash('home'), '#/site');
  assert.equal(buildPublicSiteHash('suvichar'), '#/site/suvichar');
  assert.equal(buildPublicSiteHash('updates'), '#/site/updates');

  const url = buildFullPublicUrl(
    'https://example.github.io',
    '/ShayariLok-Admin/',
    'shayari',
    { owner: 'cyberking', repo: 'shayarilok-cfg', branch: 'main', path: 'config.json' }
  );
  assert.equal(
    url,
    'https://example.github.io/ShayariLok-Admin/#/site/shayari?owner=cyberking&repo=shayarilok-cfg&branch=main&path=config.json'
  );
  assert.deepEqual(parsePublicRepoOverride(url.split('.io/ShayariLok-Admin/')[1]), {
    owner: 'cyberking',
    repo: 'shayarilok-cfg',
    branch: 'main',
    path: 'config.json',
  });

  const standaloneSite = buildStandaloneEntryUrl(
    'website.html',
    'https://example.github.io',
    '/ShayariLok-Admin/index.html',
    { page: 'suvichar', siteId: 'uid_abc123' }
  );
  assert.equal(
    standaloneSite,
    'https://example.github.io/ShayariLok-Admin/website.html?page=suvichar&site=uid_abc123'
  );

  const standalonePrivacy = buildStandaloneEntryUrl(
    'privacy.html',
    'https://example.github.io',
    '/ShayariLok-Admin/',
    { siteId: 'uid_abc123' }
  );
  assert.equal(
    standalonePrivacy,
    'https://example.github.io/ShayariLok-Admin/privacy.html?site=uid_abc123'
  );

  const parsedStandalone = parseStandaloneQuery('?page=suvichar&site=uid_abc123', '');
  assert.equal(parsedStandalone.page, 'suvichar');
  assert.equal(parsedStandalone.siteId, 'uid_abc123');
});

test('filterPublicShayaris and groupCategoryCounts handle Hindi and category filtering', () => {
  const loveItems = filterPublicShayaris(DEFAULT_CONFIG.shayari_list, 'Love', '');
  assert.equal(loveItems.length > 0, true);
  assert.equal(loveItems.every((s) => s.category === 'Love'), true);

  const searchItems = filterPublicShayaris(
    DEFAULT_CONFIG.shayari_list,
    'All',
    'धड़कन'
  );
  assert.equal(searchItems.length > 0, true);

  const counts = groupCategoryCounts(DEFAULT_CONFIG);
  assert.equal(counts.some((c) => c.category === 'All'), false);
  assert.equal(counts.some((c) => c.category === 'Love' && c.count > 0), true);
});

test('resolveEffectivePolicyUrl replaces broken shayarilok.in placeholder with hosted privacy.html URL', () => {
  assert.equal(
    isLegacyPlaceholderPolicyUrl('https://shayarilok.in/privacy-policy'),
    true
  );
  assert.equal(isLegacyPlaceholderPolicyUrl(''), true);
  assert.equal(
    isLegacyPlaceholderPolicyUrl('https://example.github.io/ShayariLok-Admin/privacy.html'),
    false
  );
  assert.equal(
    resolveEffectivePolicyUrl(
      'https://shayarilok.in/privacy-policy',
      'https://example.github.io/ShayariLok-Admin/privacy.html'
    ),
    'https://example.github.io/ShayariLok-Admin/privacy.html'
  );
  assert.equal(
    resolveEffectivePolicyUrl(
      'https://custom.example.com/privacy',
      'https://example.github.io/ShayariLok-Admin/privacy.html'
    ),
    'https://custom.example.com/privacy'
  );
});


