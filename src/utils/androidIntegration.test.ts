import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANDROID_SCHEMA_FIELDS,
  buildAndroidEndpoints,
  generateAndroidLocaleSyncCode,
  generateFirestoreRealtimeListenerCode,
  generateJavaZeroDepClient,
  generateKotlinModelsAndRepo,
  generateRemoteControlGateCode,
  pickFallbackAndroidEndpoint,
  pickPrimaryAndroidEndpoint,
} from './androidIntegration';
import { DEFAULT_GITHUB_SETTINGS } from './githubApi';
import { DEFAULT_PROXY_SETTINGS } from './proxyEngine';

test('buildAndroidEndpoints generates CDN, Raw, and Firestore REST URLs cleanly', () => {
  const endpoints = buildAndroidEndpoints(
    {
      ...DEFAULT_GITHUB_SETTINGS,
      owner: 'cyberking',
      repo: 'shayarilok-data',
      branch: 'main',
      path: 'config.json',
    },
    {
      ...DEFAULT_PROXY_SETTINGS,
      primaryProxyUrl: 'https://proxy.shayarilok.workers.dev/',
    },
    'uid_admin_99'
  );

  assert.equal(endpoints.some((e) => e.id === 'worker-proxy-raw' && e.ready), true);
  const jsdelivr = endpoints.find((e) => e.id === 'jsdelivr-cdn');
  assert.equal(
    jsdelivr?.url,
    'https://cdn.jsdelivr.net/gh/cyberking/shayarilok-data@main/config.json'
  );
  const raw = endpoints.find((e) => e.id === 'raw-github');
  assert.equal(
    raw?.url,
    'https://raw.githubusercontent.com/cyberking/shayarilok-data/main/config.json'
  );
  const firestore = endpoints.find((e) => e.id === 'firestore-rest');
  assert.equal(firestore?.ready, true);
  assert.equal(
    firestore?.url.endsWith('/documents/publicSites/uid_admin_99'),
    true
  );

  assert.equal(
    pickPrimaryAndroidEndpoint(endpoints),
    'https://proxy.shayarilok.workers.dev/raw/cyberking/shayarilok-data/main/config.json'
  );
  assert.equal(
    pickFallbackAndroidEndpoint(endpoints),
    'https://raw.githubusercontent.com/cyberking/shayarilok-data/main/config.json'
  );
});

test('code generators include all 15 config fields and maintenance/force-update gates', () => {
  assert.equal(ANDROID_SCHEMA_FIELDS.length, 15);
  const kotlin = generateKotlinModelsAndRepo('https://cdn.example/c.json', 'https://raw.example/c.json');
  assert.equal(kotlin.includes('maintenance_mode'), true);
  assert.equal(kotlin.includes('latest_version_code'), true);
  assert.equal(kotlin.includes('shayari_list'), true);
  assert.equal(kotlin.includes('image_url'), true);

  const java = generateJavaZeroDepClient('https://cdn.example/c.json', 'https://raw.example/c.json');
  assert.equal(java.includes('HttpURLConnection'), true);
  assert.equal(java.includes('privacy_policy_url'), true);
  assert.equal(java.includes('image_url'), true);

  const gate = generateRemoteControlGateCode();
  assert.equal(gate.includes('config.maintenanceMode'), true);
  assert.equal(gate.includes('BuildConfig.VERSION_CODE'), true);

  const firestoreLive = generateFirestoreRealtimeListenerCode('admin_site_app2');
  assert.equal(firestoreLive.includes('FirestoreRealtimeRepository'), true);
  assert.equal(firestoreLive.includes('addSnapshotListener'), true);
  assert.equal(firestoreLive.includes('publicSites'), true);
  assert.equal(firestoreLive.includes('admin_site_app2'), true);

  const localeSync = generateAndroidLocaleSyncCode('admin_site_app2');
  assert.equal(localeSync.includes('LocaleSettingsManager'), true);
  assert.equal(localeSync.includes('supported_languages'), true);
  assert.equal(localeSync.includes('supported_countries'), true);
  assert.equal(localeSync.includes('setApplicationLocales'), true);
  assert.equal(localeSync.includes('dynamic_theme'), true);
});
