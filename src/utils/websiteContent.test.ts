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
