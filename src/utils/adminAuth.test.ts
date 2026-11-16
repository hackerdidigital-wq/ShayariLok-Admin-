import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORIZED_ADMIN_EMAILS,
  PRIMARY_ADMIN_EMAIL,
  SECONDARY_ADMIN_EMAIL,
  classifyFirebaseAuthError,
  hasSandboxQueryFlag,
  isAuthorizedAdminEmail,
  isLocalPreviewHost,
} from './adminAuth';

test('isAuthorizedAdminEmail validates verified admins and rejects unverified or random emails', () => {
  assert.ok(AUTHORIZED_ADMIN_EMAILS.includes('baamniyad749@gmail.com'));
  assert.equal(isAuthorizedAdminEmail(PRIMARY_ADMIN_EMAIL, true), true);
  assert.equal(isAuthorizedAdminEmail(SECONDARY_ADMIN_EMAIL, true), true);
  assert.equal(isAuthorizedAdminEmail('BAMNIYAD749@GMAIL.COM', true), true);
  assert.equal(isAuthorizedAdminEmail('BAAMNIYAD749@GMAIL.COM', true), true);
  assert.equal(isAuthorizedAdminEmail(PRIMARY_ADMIN_EMAIL, false), false);
  assert.equal(isAuthorizedAdminEmail(SECONDARY_ADMIN_EMAIL, false), false);
  assert.equal(isAuthorizedAdminEmail('intruder@gmail.com', true), false);
  assert.equal(
    isAuthorizedAdminEmail('co-admin@shayarilok.in', true, ['co-admin@shayarilok.in']),
    true
  );
});

test('isLocalPreviewHost recognizes localhost and blocks github.io as non-local production', () => {
  assert.equal(isLocalPreviewHost('localhost'), true);
  assert.equal(isLocalPreviewHost('127.0.0.1'), true);
  assert.equal(isLocalPreviewHost('cyberking.github.io'), false);
  assert.equal(isLocalPreviewHost('shayarilok.in'), false);
});

test('hasSandboxQueryFlag detects autostart/sandbox/demo query params', () => {
  assert.equal(hasSandboxQueryFlag('?autostart=1', ''), true);
  assert.equal(hasSandboxQueryFlag('', '#/dashboard?sandbox=1'), true);
  assert.equal(hasSandboxQueryFlag('', '#/dashboard'), false);
});

test('classifyFirebaseAuthError gives actionable guidance for unauthorized GitHub Pages domain', () => {
  const diag = classifyFirebaseAuthError(
    { code: 'auth/unauthorized-domain', message: 'Firebase: Error (auth/unauthorized-domain).' },
    'cyberking.github.io'
  );
  assert.equal(diag.code, 'auth/unauthorized-domain');
  assert.match(diag.hint, /cyberking\.github\.io/);
});
