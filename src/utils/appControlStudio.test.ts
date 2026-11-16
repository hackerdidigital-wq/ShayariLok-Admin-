import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from './configHelpers';
import { DEFAULT_APP_EXTRAS } from './localizationAndExtras';
import {
  DEFAULT_APP_CONTROL_CONFIG,
  GOOGLE_TEST_ADMOB_CONFIG,
  deleteBanner,
  deleteFaqItem,
  deletePrivacySection,
  extractFaqCategories,
  filterFaqItems,
  isValidExternalActionUrl,
  moveBannerOrder,
  normalizeAppControlConfig,
  prepareAppConfigMainForFirestore,
  toggleBannerActive,
  upsertBanner,
  upsertFaqItem,
  upsertPrivacySection,
  validateAdMobId,
} from './appControlStudio';

test('Banner CRUD handles create, edit, external link attachment, reorder, toggle, and delete', () => {
  let list = [...DEFAULT_APP_CONTROL_CONFIG.banners];
  const initialCount = list.length;

  list = upsertBanner(list, {
    title: 'Diwali Shayari Festival',
    subtitle: 'Share festive wishes in one tap',
    imageUrl: 'https://cdn.jsdelivr.net/gh/test/repo/banner.jpg',
    actionUrl: 'https://whatsapp.com/channel/test123',
    ctaLabel: 'Open WhatsApp',
    active: true,
  });
  assert.equal(list.length, initialCount + 1);
  const added = list[list.length - 1];
  assert.equal(added.actionUrl, 'https://whatsapp.com/channel/test123');

  list = upsertBanner(list, {
    ...added,
    title: 'Diwali Special Updated',
    actionUrl: 'https://instagram.com/shayarilok',
  });
  assert.equal(list.length, initialCount + 1);
  assert.equal(
    list.find((b) => b.id === added.id)?.actionUrl,
    'https://instagram.com/shayarilok'
  );

  list = toggleBannerActive(list, added.id);
  assert.equal(list.find((b) => b.id === added.id)?.active, false);

  list = moveBannerOrder(list, added.id, 'up');
  assert.equal(list[1].id, added.id);

  list = deleteBanner(list, added.id);
  assert.equal(list.length, initialCount);
  assert.equal(list.some((b) => b.id === added.id), false);
});

test('isValidExternalActionUrl validates WhatsApp, social, and HTTPS links', () => {
  assert.equal(isValidExternalActionUrl('https://whatsapp.com/channel/123'), true);
  assert.equal(isValidExternalActionUrl('whatsapp://send?text=Hi'), true);
  assert.equal(isValidExternalActionUrl('tg://resolve?domain=shayarilok'), true);
  assert.equal(isValidExternalActionUrl('javascript:alert(1)'), false);
  assert.equal(isValidExternalActionUrl(''), false);
});

test('validateAdMobId accurately validates AdMob App ID (~) vs Unit IDs (/)', () => {
  assert.equal(validateAdMobId(GOOGLE_TEST_ADMOB_CONFIG.admob_app_id, 'app').valid, true);
  assert.equal(validateAdMobId(GOOGLE_TEST_ADMOB_CONFIG.banner_ad_id, 'app').valid, false);
  assert.equal(validateAdMobId(GOOGLE_TEST_ADMOB_CONFIG.banner_ad_id, 'unit').valid, true);
  assert.equal(validateAdMobId(GOOGLE_TEST_ADMOB_CONFIG.native_ad_id, 'unit').valid, true);
  assert.equal(validateAdMobId('invalid-id', 'unit').valid, false);
});

test('Privacy Policy sections CRUD updates cleanly', () => {
  let sections = [...DEFAULT_APP_CONTROL_CONFIG.privacy_policy_sections];
  const initialCount = sections.length;

  sections = upsertPrivacySection(sections, {
    heading: '4. Children Privacy',
    body: 'We comply with family safety guidelines.',
  });
  assert.equal(sections.length, initialCount + 1);
  const created = sections[sections.length - 1];

  sections = upsertPrivacySection(sections, {
    id: created.id,
    heading: '4. Family & Children Privacy',
    body: 'Updated policy compliance section.',
  });
  assert.equal(sections.length, initialCount + 1);
  assert.equal(
    sections.find((s) => s.id === created.id)?.heading,
    '4. Family & Children Privacy'
  );

  sections = deletePrivacySection(sections, created.id);
  assert.equal(sections.length, initialCount);
});

test('FAQ CRUD, category extraction, and search filtering work deterministically', () => {
  let faqs = [...DEFAULT_APP_CONTROL_CONFIG.faqs];
  const initialCount = faqs.length;

  faqs = upsertFaqItem(faqs, {
    question: 'How to enable Dark Mode?',
    answer: 'Open Settings and toggle Night Reading Mode.',
    category: 'App & Updates',
    active: true,
  });
  assert.equal(faqs.length, initialCount + 1);

  const cats = extractFaqCategories(faqs);
  assert.equal(cats[0], 'All');
  assert.ok(cats.includes('App & Updates'));

  const searchHits = filterFaqItems(faqs, 'App & Updates', 'Dark Mode');
  assert.equal(searchHits.length, 1);
  assert.equal(searchHits[0].question, 'How to enable Dark Mode?');

  faqs = deleteFaqItem(faqs, searchHits[0].id);
  assert.equal(faqs.length, initialCount);
});

test('normalizeAppControlConfig preserves explicit empty arrays without reviving deleted seeds', () => {
  const normalized = normalizeAppControlConfig({
    banners: [],
    faqs: [],
    privacy_policy_sections: [],
  });
  assert.deepEqual(normalized.banners, []);
  assert.deepEqual(normalized.faqs, []);
  assert.deepEqual(normalized.privacy_policy_sections, []);
});

test('prepareAppConfigMainForFirestore serializes complete AdMob, Logo, Banners, Privacy, FAQ, and Dark Mode state', () => {
  const payload = prepareAppConfigMainForFirestore(
    'uid_admin_1',
    DEFAULT_CONFIG,
    {
      ...DEFAULT_APP_EXTRAS,
      dynamic_theme: {
        ...DEFAULT_APP_EXTRAS.dynamic_theme,
        darkModeEnabled: true,
        primaryColor: '#1d4ed8',
      },
    },
    {
      ...DEFAULT_APP_CONTROL_CONFIG,
      app_logo_url: 'https://cdn.example.com/logo.png',
    }
  );
  assert.equal(payload.ownerId, 'uid_admin_1');
  assert.equal(payload.admob_app_id, GOOGLE_TEST_ADMOB_CONFIG.admob_app_id);
  assert.equal(payload.native_ad_id, GOOGLE_TEST_ADMOB_CONFIG.native_ad_id);
  assert.equal(payload.app_logo_url, 'https://cdn.example.com/logo.png');
  assert.equal(payload.default_theme_mode, 'dark');
  assert.equal(payload.dynamic_theme.primaryColor, '#1d4ed8');
  assert.ok(payload.banners.length >= 1);
  assert.ok(payload.faqs.length >= 1);
  assert.ok(payload.privacy_policy_text.includes('Privacy Policy'));
});
