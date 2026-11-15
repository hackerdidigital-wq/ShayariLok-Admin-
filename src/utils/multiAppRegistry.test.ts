import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_APP_PROFILE,
  createManagedAppProfile,
  getAppDraftStorageKey,
  resolveFirestoreSiteId,
  sanitizeAppSlug,
} from './multiAppRegistry';

test('sanitizeAppSlug produces clean lowercase identifiers', () => {
  assert.equal(sanitizeAppSlug('Suvichar Lok Pro!'), 'suvichar_lok_pro');
  assert.equal(sanitizeAppSlug('Shayari Status 2026'), 'shayari_status_2026');
});

test('createManagedAppProfile builds unique multi-app profiles with isolated config path', () => {
  const created = createManagedAppProfile(
    { name: 'Suvichar Daily', packageId: 'com.cyberking.suvichar' },
    [DEFAULT_APP_PROFILE]
  );
  assert.equal(created.id, 'suvichar_daily');
  assert.equal(created.packageId, 'com.cyberking.suvichar');
  assert.equal(created.githubPath, 'apps/suvichar_daily/config.json');
});

test('resolveFirestoreSiteId preserves primary UID for default app and namespaces additional apps', () => {
  assert.equal(resolveFirestoreSiteId('adminUid123', 'default'), 'adminUid123');
  assert.equal(
    resolveFirestoreSiteId('adminUid123', 'suvichar_daily'),
    'adminUid123_suvichar-daily'
  );
  assert.equal(getAppDraftStorageKey('default'), 'shayari_lok_local_draft');
  assert.equal(
    getAppDraftStorageKey('suvichar_daily'),
    'shayarilok_app_draft_suvichar_daily_v1'
  );
});
