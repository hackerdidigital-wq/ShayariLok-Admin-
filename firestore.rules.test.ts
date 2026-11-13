import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rules = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules enforces default-deny catch-all and rules_version 2', () => {
  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules validates email_verified, id poisoning, and strict keys', () => {
  assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /data\.keys\(\)\.hasAll\(/);
  assert.match(rules, /data\.keys\(\)\.hasOnly\(/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(/);
  assert.match(rules, /==\s*request\.time/);
});

test('firestore.rules covers every collection path declared in firebase-blueprint.json', () => {
  const paths = Object.keys(blueprint.firestore);
  assert.ok(paths.includes('/users/{userId}'));
  assert.ok(paths.includes('/users/{userId}/settings/{settingId}'));
  assert.ok(paths.includes('/users/{userId}/drafts/{draftId}'));
  assert.ok(paths.includes('/users/{userId}/publishLogs/{logId}'));
  assert.ok(paths.includes('/users/{userId}/proxyProfiles/{profileId}'));
  assert.ok(paths.includes('/publicSites/{siteId}'));

  assert.match(rules, /match \/users\/\{userId\}/);
  assert.match(rules, /match \/settings\/\{settingId\}/);
  assert.match(rules, /match \/drafts\/\{draftId\}/);
  assert.match(rules, /match \/publishLogs\/\{logId\}/);
  assert.match(rules, /match \/proxyProfiles\/\{profileId\}/);
  assert.match(rules, /match \/publicSites\/\{siteId\}/);
});

test('firestore.rules locks publishLogs against updates and deletes', () => {
  assert.match(rules, /allow update, delete:\s*if false;/);
});

test('firestore.rules restricts proxyProfile modes and bounds fallbackNodes', () => {
  assert.match(rules, /isValidProxyProfile/);
  assert.match(rules, /data\.fallbackNodes\.size\(\)\s*<=\s*10/);
});

test('firestore.rules validates publicSites schema and blocks list scraping', () => {
  assert.match(rules, /isValidPublicSite/);
  assert.match(rules, /match \/publicSites\/\{siteId\}\s*\{\s*allow get:\s*if isValidId\(siteId\);\s*allow list:\s*if false;/);
  assert.match(rules, /data\.suvichar_list\.size\(\)\s*<=\s*100/);
  assert.match(rules, /data\.photo_shayari_list\.size\(\)\s*<=\s*60/);
});

