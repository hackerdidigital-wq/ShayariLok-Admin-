import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from './configHelpers';
import {
  auditConfigHygiene,
  deduplicateShayaris,
  DEFAULT_ENTERPRISE_SETTINGS,
  hashPinCode,
  parseBulkShayaris,
  syncMissingCategories,
  validatePublishGuardrails,
  verifyPinCode,
} from './enterpriseSettings';

test('auditConfigHygiene detects duplicates, unmapped categories, invalid URLs, and AdMob IDs', () => {
  const dirty = {
    ...DEFAULT_CONFIG,
    force_update_url: 'ftp://invalid-url',
    banner_ad_id: 'bad-banner-id',
    shayari_list: [
      ...DEFAULT_CONFIG.shayari_list,
      {
        id: 99,
        category: 'Bewafa',
        text: DEFAULT_CONFIG.shayari_list[0].text + '   ',
        author: 'Copy',
      },
      {
        id: 100,
        category: 'Love',
        text: '   ',
        author: 'Empty',
      },
    ],
  };

  const report = auditConfigHygiene(dirty);
  assert.equal(report.duplicateShayaris.length, 1);
  assert.equal(report.duplicateShayaris[0].id, 99);
  assert.equal(report.emptyShayarisCount, 1);
  assert.deepEqual(report.unmappedCategories, ['Bewafa']);
  assert.deepEqual(report.invalidUrls, ['force_update_url']);
  assert.deepEqual(report.invalidAdIds, ['banner_ad_id']);
  assert.equal(report.issueCount, 5);
});

test('deduplicateShayaris and syncMissingCategories clean config safely', () => {
  const dirty = {
    ...DEFAULT_CONFIG,
    shayari_list: [
      ...DEFAULT_CONFIG.shayari_list,
      {
        id: 88,
        category: 'Dosti',
        text: DEFAULT_CONFIG.shayari_list[0].text,
        author: 'Dup',
      },
    ],
  };

  const synced = syncMissingCategories(dirty);
  assert.equal(synced.addedCount, 1);
  assert.equal(synced.config.categories[0], 'All');
  assert.ok(synced.config.categories.includes('Dosti'));

  const deduped = deduplicateShayaris(dirty);
  assert.equal(deduped.removedCount, 1);
  assert.equal(deduped.config.shayari_list.length, DEFAULT_CONFIG.shayari_list.length);
});

test('parseBulkShayaris imports multi-line --- blocks and skips existing duplicates', () => {
  const raw = [
    DEFAULT_CONFIG.shayari_list[0].text,
    '---',
    'सफ़र में धूप होगी तो चल सको तो चलो,\nसभी हैं भीड़ में तुम भी निकल सको तो चलो।',
    '---',
    'Waqt se ladkar jo naseeb badal de,\nInsaan wahi jo apni taqdeer badal de.',
  ].join('\n');

  const result = parseBulkShayaris(
    raw,
    'Motivation',
    'Nida Fazli',
    DEFAULT_CONFIG.shayari_list
  );
  assert.equal(result.skippedDuplicates, 1);
  assert.equal(result.itemsToAdd.length, 2);
  assert.equal(result.itemsToAdd[0].id, 6);
  assert.equal(result.itemsToAdd[1].id, 7);
  assert.equal(result.itemsToAdd[0].category, 'Motivation');
});

test('validatePublishGuardrails enforces commit message, valid URLs, and maintenance warning', () => {
  const enterprise = {
    ...DEFAULT_ENTERPRISE_SETTINGS,
    requireCommitMessage: true,
    strictSchemaGate: true,
    confirmMaintenancePublish: true,
  };

  const blocked = validatePublishGuardrails(
    { ...DEFAULT_CONFIG, maintenance_mode: true, privacy_policy_url: 'not-a-url' },
    enterprise,
    '   '
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.errors.length, 2);
  assert.equal(blocked.warnings.length, 1);

  const allowed = validatePublishGuardrails(
    DEFAULT_CONFIG,
    enterprise,
    'Release v2 update'
  );
  assert.equal(allowed.ok, true);
  assert.equal(allowed.errors.length, 0);
});

test('hashPinCode and verifyPinCode verify matching PIN and reject wrong PIN', async () => {
  const hash = await hashPinCode('4829');
  assert.ok(hash.length > 8);
  assert.equal(await verifyPinCode('4829', hash), true);
  assert.equal(await verifyPinCode('0000', hash), false);
});
