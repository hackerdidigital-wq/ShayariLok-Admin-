import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from './configHelpers';
import {
  DEFAULT_WEBSITE_CONTENT,
  normalizeWebsiteContent,
  preparePublicSiteForFirestore,
} from './websiteContent';

test('normalizeWebsiteContent restores defaults and bounds lists safely', () => {
  const defaults = normalizeWebsiteContent(null);
  assert.equal(defaults.controls.showNotificationBell, true);
  assert.equal(defaults.controls.showSuvicharSection, true);
  assert.equal(defaults.suvichar_list.length >= 4, true);
  assert.equal(defaults.photo_shayari_list.length >= 4, true);

  const custom = normalizeWebsiteContent({
    heroHeadline: '   नया सुविचार और शायरी   ',
    controls: {
      showNotificationBell: false,
      showSuvicharSection: true,
    },
    suvichar_list: [
      { id: 10, text: 'सकारात्मक रहें', author: 'कवि', category: 'प्रेरणा' },
      { id: 11, text: '   ', author: 'Empty' },
    ],
    photo_shayari_list: [
      { id: 5, text: 'शाम सुहानी है', author: 'अमन', category: 'Love', theme: 'invalid_theme' },
    ],
  });

  assert.equal(custom.heroHeadline, 'नया सुविचार और शायरी');
  assert.equal(custom.controls.showNotificationBell, false);
  assert.equal(custom.controls.showAnnouncementBanner, true);
  assert.equal(custom.suvichar_list.length, 1);
  assert.equal(custom.photo_shayari_list.length, 1);
  assert.equal(custom.photo_shayari_list[0].theme, 'sunset_love');
});

test('preparePublicSiteForFirestore strips internal ad unit IDs and bounds arrays', () => {
  const payload = preparePublicSiteForFirestore(
    DEFAULT_CONFIG,
    DEFAULT_WEBSITE_CONTENT,
    'CyberKing Studios',
    'support@shayarilok.in'
  ) as Record<string, unknown>;

  assert.equal('banner_ad_id' in payload, false);
  assert.equal('interstitial_ad_id' in payload, false);
  assert.equal(payload.organizationName, 'CyberKing Studios');
  assert.equal(payload.app_name, DEFAULT_CONFIG.app_name);
  assert.equal(Array.isArray(payload.suvichar_list), true);
  assert.equal(Array.isArray(payload.photo_shayari_list), true);
  assert.equal(
    (payload.websiteControls as Record<string, boolean>).showNotificationBell,
    true
  );
});

test('preparePublicSiteForFirestore with extras and edge-case inputs satisfies all Firestore publicSites bounds', async () => {
  const { DEFAULT_APP_EXTRAS } = await import('./localizationAndExtras');
  const dirtyConfig = {
    ...DEFAULT_CONFIG,
    app_name: '   ',
    latest_version_code: 1.9,
    shayari_list: [
      {
        id: 7.8,
        category: 'Love',
        text: 'A'.repeat(2500),
        author: 'B'.repeat(120),
        image_url: 'https://cdn.jsdelivr.net/gh/u/r@main/' + 'x'.repeat(600),
      },
    ],
  };

  const payload = preparePublicSiteForFirestore(
    dirtyConfig,
    DEFAULT_WEBSITE_CONTENT,
    '   ',
    '',
    {
      ...DEFAULT_APP_EXTRAS,
      dynamic_theme: {
        ...DEFAULT_APP_EXTRAS.dynamic_theme,
        cardCornerRadius: 18.7,
      },
      engagement_tools: {
        ...DEFAULT_APP_EXTRAS.engagement_tools,
        dailyShayariGoal: 9.4,
      },
    }
  );

  assert.equal(payload.app_name, 'Shayari Lok');
  assert.equal(payload.organizationName, 'CyberKing Studios');
  assert.equal(payload.categories[0], 'All');
  assert.equal(Number.isInteger(payload.latest_version_code), true);
  assert.equal(Number.isInteger(payload.shayari_list[0].id), true);
  assert.equal(payload.shayari_list[0].text.length <= 2000, true);
  assert.equal(payload.shayari_list[0].image_url.length <= 500, true);
  assert.equal('dynamic_theme' in payload, true);
  if ('dynamic_theme' in payload) {
    assert.equal(Number.isInteger(payload.dynamic_theme.cardCornerRadius), true);
    assert.equal(Number.isInteger(payload.engagement_tools.dailyShayariGoal), true);
    assert.equal(payload.default_language_code.length >= 2, true);
    assert.equal(payload.default_country_code.length >= 2, true);
  }
});

