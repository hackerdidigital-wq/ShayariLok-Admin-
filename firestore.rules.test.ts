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
  assert.ok(paths.includes('/appUsers/{appUserId}'));
  assert.ok(paths.includes('/socialEdges/{edgeId}'));
  assert.ok(paths.includes('/chatRooms/{roomId}'));
  assert.ok(paths.includes('/chatRooms/{roomId}/messages/{messageId}'));

  assert.match(rules, /match \/users\/\{userId\}/);
  assert.match(rules, /match \/settings\/\{settingId\}/);
  assert.match(rules, /match \/drafts\/\{draftId\}/);
  assert.match(rules, /match \/publishLogs\/\{logId\}/);
  assert.match(rules, /match \/proxyProfiles\/\{profileId\}/);
  assert.match(rules, /match \/publicSites\/\{siteId\}/);
  assert.match(rules, /match \/appUsers\/\{appUserId\}/);
  assert.match(rules, /match \/socialEdges\/\{edgeId\}/);
  assert.match(rules, /match \/chatRooms\/\{roomId\}/);
  assert.match(rules, /match \/messages\/\{messageId\}/);
});

test('firestore.rules locks publishLogs against updates and deletes', () => {
  assert.match(rules, /allow update, delete:\s*if false;/);
});

test('firestore.rules restricts proxyProfile modes and bounds fallbackNodes', () => {
  assert.match(rules, /isValidProxyProfile/);
  assert.match(rules, /data\.fallbackNodes\.size\(\)\s*<=\s*10/);
});

test('firestore.rules validates publicSites schema, requires admin write, and protects list & subcollections', () => {
  assert.match(rules, /isValidPublicSite/);
  assert.match(rules, /match \/publicSites\/\{siteId\}\s*\{\s*allow get:\s*if isValidId\(siteId\);\s*allow list:\s*if isVerifiedAdminEmail\(\);/);
  assert.match(rules, /isAdmin\(\)\s*&&\s*isOwnerSiteId\(siteId\)/);
  assert.match(rules, /match \/\{subCollection\}\/\{docId\}/);
  assert.match(rules, /match \/\{nestedPath=\*\*\}/);
  assert.match(rules, /data\.suvichar_list\.size\(\)\s*<=\s*100/);
  assert.match(rules, /data\.photo_shayari_list\.size\(\)\s*<=\s*60/);
});

test('firestore.rules enforces /admins allowlist and admin-only workspace writes', () => {
  assert.ok(Object.keys(blueprint.firestore).includes('/admins/{adminUid}'));
  assert.match(rules, /match \/admins\/\{adminUid\}/);
  assert.match(rules, /isValidAdminAllowlist/);
  assert.match(rules, /match \/users\/\{userId\}[\s\S]*isAdmin\(\)\s*&&\s*isOwner\(userId\)/);
});

test('firestore.rules isolates appUsers PII, blocks spam users from chatting, and enforces 2-participant rooms', () => {
  assert.match(rules, /isValidAppUser/);
  assert.match(rules, /isValidSocialEdge/);
  assert.match(rules, /isValidChatRoom/);
  assert.match(rules, /isValidChatMessage/);
  assert.match(rules, /data\.isBlocked == false/);
  assert.match(rules, /data\.participantIds\.size\(\) == 2/);
  assert.match(rules, /isVerifiedAdminEmail\(\)/);
});

test('firestore.rules validates multi-language, countries, dynamic_theme, scheduled_notifications, and engagement_tools on publicSites', () => {
  assert.match(rules, /data\.supported_languages\.size\(\)\s*<=\s*40/);
  assert.match(rules, /data\.supported_countries\.size\(\)\s*<=\s*60/);
  assert.match(rules, /data\.dynamic_theme\.cardCornerRadius\s*<=\s*36/);
  assert.match(rules, /data\.scheduled_notifications\.size\(\)\s*<=\s*50/);
  assert.match(rules, /data\.engagement_tools\.dailyShayariGoal\s*<=\s*50/);
});

test('firestore.rules authorizes bamniyad749@gmail.com and baamniyad749@gmail.com with email_verified check', () => {
  assert.match(rules, /function isAdmin\(\)\s*\{\s*return isVerifiedAdminEmail\(\)\s*\|\|/);
  assert.match(rules, /'bamniyad749@gmail\.com'/);
  assert.match(rules, /'baamniyad749@gmail\.com'/);
  assert.match(rules, /!\('ownerId' in existing\(\)\)\s*\|\|\s*incoming\(\)\.ownerId == existing\(\)\.ownerId/);
  assert.match(rules, /\(isVerifiedAdminEmail\(\)\s*&&\s*isOwner\(siteId\)\)/);
});
