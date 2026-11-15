import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from './configHelpers';
import {
  DEFAULT_APP_EXTRAS,
  THEME_PRESETS,
  WORLD_COUNTRY_PRESETS,
  WORLD_LANGUAGE_PRESETS,
  addCountryToExtras,
  addLanguageToExtras,
  addScheduledNotification,
  normalizeAppExtras,
  removeCountryFromExtras,
  removeLanguageFromExtras,
  resolveAndroidLocaleStrings,
  serializeFullConfigWithExtras,
  setDefaultCountry,
  setDefaultLanguage,
  toggleCountryEnabled,
  toggleLanguageEnabled,
  toggleScheduledNotificationStatus,
  updateLanguageLabels,
} from './localizationAndExtras';

test('adding world languages preserves uniqueness, RTL flags, and custom UI labels', () => {
  const spanish = WORLD_LANGUAGE_PRESETS.find((l) => l.code === 'es')!;
  const urdu = WORLD_LANGUAGE_PRESETS.find((l) => l.code === 'ur')!;

  let next = addLanguageToExtras(DEFAULT_APP_EXTRAS, spanish);
  next = addLanguageToExtras(next, urdu);
  assert.equal(next.supported_languages.length, 4);

  const urduEntry = next.supported_languages.find((l) => l.code === 'ur');
  assert.equal(urduEntry?.rtl, true);
  assert.equal(urduEntry?.uiLabels.homeTab, 'ہوم');

  // Re-adding existing code re-enables rather than duplicating
  next = toggleLanguageEnabled(next, 'es');
  assert.equal(
    next.supported_languages.find((l) => l.code === 'es')?.enabled,
    false
  );
  next = addLanguageToExtras(next, spanish);
  assert.equal(next.supported_languages.length, 4);
  assert.equal(
    next.supported_languages.find((l) => l.code === 'es')?.enabled,
    true
  );

  // Default language cannot be disabled or deleted until another is chosen
  const lockedDisable = toggleLanguageEnabled(next, 'hi');
  assert.equal(
    lockedDisable.supported_languages.find((l) => l.code === 'hi')?.enabled,
    true
  );
  const lockedDelete = removeLanguageFromExtras(next, 'hi');
  assert.equal(lockedDelete.supported_languages.length, 4);

  // Switching default allows removing previous one
  next = setDefaultLanguage(next, 'es');
  assert.equal(next.default_language_code, 'es');
  next = removeLanguageFromExtras(next, 'hi');
  assert.equal(next.supported_languages.some((l) => l.code === 'hi'), false);
});

test('country presets, default country guard, and live locale resolver switch UI cleanly', () => {
  const uae = WORLD_COUNTRY_PRESETS.find((c) => c.code === 'AE')!;
  const spainLang = WORLD_LANGUAGE_PRESETS.find((l) => l.code === 'es')!;

  let next = addCountryToExtras(DEFAULT_APP_EXTRAS, uae);
  next = addLanguageToExtras(next, spainLang);
  next = setDefaultCountry(next, 'AE');
  assert.equal(next.default_country_code, 'AE');

  // Cannot remove or disable default country AE
  assert.equal(removeCountryFromExtras(next, 'AE').supported_countries.length, 3);
  assert.equal(
    toggleCountryEnabled(next, 'AE').supported_countries.find((c) => c.code === 'AE')?.enabled,
    true
  );

  // Can update inline UI labels and resolve them dynamically
  next = updateLanguageLabels(next, 'es', { homeTab: 'Poemas' });
  const resolved = resolveAndroidLocaleStrings(next, 'es');
  assert.equal(resolved.language.code, 'es');
  assert.equal(resolved.language.uiLabels.homeTab, 'Poemas');
  assert.equal(resolved.country.code, 'AE');
});

test('normalizeAppExtras enforces Firestore security bounds (<=40 langs, <=60 countries, <=50 notifs, radius 0..36, goal 1..50)', () => {
  const manyLangs = Array.from({ length: 55 }, (_, i) => ({
    code: `l${i + 10}`,
    name: `Lang ${i}`,
  }));
  const manyCountries = Array.from({ length: 75 }, (_, i) => ({
    code: `C${i + 10}`,
    name: `Country ${i}`,
  }));
  const manySched = Array.from({ length: 65 }, (_, i) => ({
    id: `s${i}`,
    title: `Title ${i}`,
    message: `Msg ${i}`,
    targetLanguage: 'hi',
    targetCountry: 'IN',
    scheduledFor: '2026-11-16T08:00',
    repeatMode: 'daily',
    status: 'scheduled',
  }));

  const normalized = normalizeAppExtras({
    supported_languages: manyLangs,
    supported_countries: manyCountries,
    scheduled_notifications: manySched,
    dynamic_theme: {
      ...THEME_PRESETS.royal_midnight.config,
      cardCornerRadius: 999,
    },
    engagement_tools: {
      dailyShayariGoal: 200,
    },
  });

  assert.equal(normalized.supported_languages.length, 40);
  assert.equal(normalized.supported_countries.length, 60);
  assert.equal(normalized.scheduled_notifications.length, 50);
  assert.equal(normalized.dynamic_theme.cardCornerRadius, 36);
  assert.equal(normalized.engagement_tools.dailyShayariGoal, 50);
});

test('scheduled notifications and extended JSON export include theme, languages, countries, and engagement tools', () => {
  let next = addScheduledNotification(DEFAULT_APP_EXTRAS, {
    title: 'Diwali Special',
    message: 'New festive shayaris live now',
    targetLanguage: 'hi',
    targetCountry: 'IN',
    scheduledFor: '2026-11-18T18:00',
    repeatMode: 'once',
  });
  const newestId = next.scheduled_notifications[0].id;
  next = toggleScheduledNotificationStatus(next, newestId);
  assert.equal(next.scheduled_notifications[0].status, 'paused');

  const json = serializeFullConfigWithExtras(DEFAULT_CONFIG, next);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  assert.equal(parsed.app_name, DEFAULT_CONFIG.app_name);
  assert.equal(parsed.default_language_code, 'hi');
  assert.equal(Array.isArray(parsed.supported_languages), true);
  assert.equal(Array.isArray(parsed.supported_countries), true);
  assert.equal(typeof parsed.dynamic_theme, 'object');
  assert.equal(typeof parsed.engagement_tools, 'object');
});
