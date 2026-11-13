import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONFIG,
  ensureAllFirstCategory,
  filterShayaris,
  getNextId,
  hasUnsavedChanges,
  normalizeConfig,
  serializeConfigJson,
} from './configHelpers';

test('ensureAllFirstCategory always keeps All at index 0 and removes duplicates', () => {
  assert.deepEqual(ensureAllFirstCategory(['Love', 'All', 'Sad', 'Love', '  ']), [
    'All',
    'Love',
    'Sad',
  ]);
  assert.deepEqual(ensureAllFirstCategory([]), ['All']);
});

test('getNextId returns auto-incremented unique integer ID', () => {
  assert.equal(getNextId([]), 1);
  assert.equal(getNextId([{ id: 1 }, { id: 7 }, { id: 3 }]), 8);
});

test('serializeConfigJson outputs exact 15 schema keys matching user app', () => {
  const jsonStr = serializeConfigJson(DEFAULT_CONFIG);
  const parsed = JSON.parse(jsonStr);
  const expectedKeys = [
    'app_name',
    'latest_version_code',
    'force_update_url',
    'maintenance_mode',
    'maintenance_message',
    'privacy_policy_url',
    'social_link',
    'ads_enabled',
    'banner_ad_id',
    'interstitial_ad_id',
    'announcement_title',
    'announcement_message',
    'notifications',
    'categories',
    'shayari_list',
  ];
  assert.deepEqual(Object.keys(parsed), expectedKeys);
  assert.equal(typeof parsed.latest_version_code, 'number');
  assert.equal(typeof parsed.maintenance_mode, 'boolean');
  assert.equal(typeof parsed.ads_enabled, 'boolean');
  assert.equal(parsed.categories[0], 'All');
});

test('normalizeConfig safely coerces partial or malformed JSON payloads', () => {
  const normalized = normalizeConfig({
    app_name: 'Shayari Lok Pro',
    latest_version_code: '4',
    maintenance_mode: 1,
    categories: ['Motivation', 'All'],
    shayari_list: [{ id: 10, category: 'Motivation', text: 'Line 1\nLine 2', author: 'Test' }],
  });
  assert.equal(normalized.app_name, 'Shayari Lok Pro');
  assert.equal(normalized.latest_version_code, 4);
  assert.equal(normalized.maintenance_mode, true);
  assert.deepEqual(normalized.categories, ['All', 'Motivation']);
  assert.equal(normalized.shayari_list[0].id, 10);
});

test('hasUnsavedChanges detects modifications accurately', () => {
  const copy = normalizeConfig(JSON.parse(serializeConfigJson(DEFAULT_CONFIG)));
  assert.equal(hasUnsavedChanges(copy, DEFAULT_CONFIG), false);
  copy.latest_version_code += 1;
  assert.equal(hasUnsavedChanges(copy, DEFAULT_CONFIG), true);
});

test('filterShayaris filters by category and Hindi/Hinglish search query', () => {
  const allLove = filterShayaris(DEFAULT_CONFIG.shayari_list, 'Love', '');
  assert.equal(allLove.length, 2);

  const hindiMatch = filterShayaris(DEFAULT_CONFIG.shayari_list, 'All', 'ख़ामोशी');
  assert.equal(hindiMatch.length, 1);
  assert.equal(hindiMatch[0].id, 1);

  const authorMatch = filterShayaris(DEFAULT_CONFIG.shayari_list, 'All', 'CyberKing');
  assert.equal(authorMatch.length, 1);
  assert.equal(authorMatch[0].id, 2);
});
