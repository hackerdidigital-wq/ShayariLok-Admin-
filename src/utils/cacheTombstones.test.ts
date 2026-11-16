import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from './configHelpers';
import {
  clearConfigTombstonesForApp,
  clearSocialTombstones,
  filterTombstonedSeedConfig,
  recordDeletedConfigItems,
  recordDeletedScheduledNotifications,
  recordDeletedWebsiteContentItems,
} from './cacheTombstones';
import { loadLocalDraft, saveLocalDraft } from './githubApi';
import {
  DEFAULT_APP_EXTRAS,
  loadAppExtras,
  saveAppExtras,
} from './localizationAndExtras';
import { DEFAULT_APP_PROFILE, loadAppDraft, saveAppDraft } from './multiAppRegistry';
import {
  DEMO_APP_USERS,
  loadSandboxSocialState,
  saveSandboxSocialState,
} from './socialMonitor';
import {
  DEFAULT_WEBSITE_CONTENT,
  loadWebsiteContent,
  saveWebsiteContent,
} from './websiteContent';

function withMockBrowserStorage(run: (store: Map<string, string>) => void): void {
  const store = new Map<string, string>();
  const prevWindow = (globalThis as { window?: unknown }).window;

  const mockStorage = {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
  };

  (globalThis as { window?: unknown }).window = {
    localStorage: mockStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  try {
    run(store);
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
}

test('deleted shayaris and notifications remain wiped across draft reload and empty storage key', () => {
  withMockBrowserStorage((store) => {
    const initial = loadAppDraft(DEFAULT_APP_PROFILE);
    assert.equal(initial.shayari_list.length, DEFAULT_CONFIG.shayari_list.length);

    // Delete all shayaris and notifications
    const wiped = {
      ...initial,
      shayari_list: [],
      notifications: [],
    };
    recordDeletedConfigItems('default', initial, wiped);
    saveAppDraft('default', wiped);

    // Reload via both multiAppRegistry and githubApi loaders
    const reloaded = loadAppDraft(DEFAULT_APP_PROFILE);
    assert.equal(reloaded.shayari_list.length, 0);
    assert.equal(reloaded.notifications.length, 0);

    const standaloneDraft = loadLocalDraft();
    assert.ok(standaloneDraft);
    assert.equal(standaloneDraft.shayari_list.length, 0);
    assert.equal(standaloneDraft.notifications.length, 0);

    // Even if draft storage keys are dropped while tombstone scope remains initialized, seed items stay excluded
    store.delete('shayari_lok_local_draft');
    store.delete('shayarilok_local_draft_v1');

    const filteredSeed = filterTombstonedSeedConfig('default', DEFAULT_CONFIG);
    assert.equal(filteredSeed.shayari_list.length, 0);
    assert.equal(filteredSeed.notifications.length, 0);

    const afterKeyDrop = loadAppDraft(DEFAULT_APP_PROFILE);
    assert.equal(afterKeyDrop.shayari_list.length, 0);
    assert.equal(afterKeyDrop.notifications.length, 0);

    const standaloneAfterDrop = loadLocalDraft();
    assert.ok(standaloneAfterDrop);
    assert.equal(standaloneAfterDrop.shayari_list.length, 0);

    // Only explicit Factory Reset clears tombstones
    clearConfigTombstonesForApp('default');
    saveAppDraft('default', { ...DEFAULT_CONFIG });
    assert.equal(
      loadAppDraft(DEFAULT_APP_PROFILE).shayari_list.length,
      DEFAULT_CONFIG.shayari_list.length
    );
  });
});

test('saveLocalDraft and saveAppDraft synchronize canonical and legacy keys', () => {
  withMockBrowserStorage(() => {
    const custom = {
      ...DEFAULT_CONFIG,
      shayari_list: [DEFAULT_CONFIG.shayari_list[0]],
    };
    saveLocalDraft(custom);
    const viaAppRegistry = loadAppDraft(DEFAULT_APP_PROFILE);
    assert.equal(viaAppRegistry.shayari_list.length, 1);
    assert.equal(viaAppRegistry.shayari_list[0].id, DEFAULT_CONFIG.shayari_list[0].id);
  });
});

test('deleted suvichar, photo shayari, and scheduled notifications are never re-injected', () => {
  withMockBrowserStorage((store) => {
    const initialWeb = loadWebsiteContent();
    assert.ok(initialWeb.suvichar_list.length > 0);
    assert.ok(initialWeb.photo_shayari_list.length > 0);

    const nextWeb = {
      ...DEFAULT_WEBSITE_CONTENT,
      suvichar_list: [],
      photo_shayari_list: [],
    };
    recordDeletedWebsiteContentItems(initialWeb, nextWeb);
    saveWebsiteContent(nextWeb);

    // Simulate cache key removal without wiping tombstones
    store.delete('shayari_lok_website_content_v1');
    const reloadedWeb = loadWebsiteContent();
    assert.equal(reloadedWeb.suvichar_list.length, 0);
    assert.equal(reloadedWeb.photo_shayari_list.length, 0);

    // Scheduled notifications
    const initialExtras = loadAppExtras('default');
    assert.ok(initialExtras.scheduled_notifications.length > 0);

    const nextExtras = {
      ...DEFAULT_APP_EXTRAS,
      scheduled_notifications: [],
    };
    recordDeletedScheduledNotifications(
      initialExtras.scheduled_notifications,
      nextExtras.scheduled_notifications
    );
    saveAppExtras('default', nextExtras);

    store.delete('shayari_lok_extras_v1_default');
    const reloadedExtras = loadAppExtras('default');
    assert.equal(reloadedExtras.scheduled_notifications.length, 0);
  });
});

test('sandbox social state keeps deleted dummy users, edges, and chat rooms wiped across reload', () => {
  withMockBrowserStorage(() => {
    const initial = loadSandboxSocialState();
    assert.equal(initial.users.length, DEMO_APP_USERS.length);

    const targetDummy = initial.users.find((u) => /vikram/i.test(u.displayName)) ?? initial.users[0];
    const remaining = {
      users: initial.users.filter((u) => u.uid !== targetDummy.uid),
      edges: initial.edges.filter(
        (e) => e.actorId !== targetDummy.uid && e.targetId !== targetDummy.uid
      ),
      rooms: initial.rooms.filter(
        (r) => !r.participantIds.includes(targetDummy.uid)
      ),
      messages: initial.messages,
    };

    saveSandboxSocialState(remaining, {
      userIds: [targetDummy.uid],
      edgeIds: initial.edges
        .filter((e) => e.actorId === targetDummy.uid || e.targetId === targetDummy.uid)
        .map((e) => e.id),
      roomIds: initial.rooms
        .filter((r) => r.participantIds.includes(targetDummy.uid))
        .map((r) => r.id),
    });

    const afterReload = loadSandboxSocialState();
    assert.equal(
      afterReload.users.some((u) => u.uid === targetDummy.uid),
      false
    );
    assert.equal(
      afterReload.rooms.some((r) => r.participantIds.includes(targetDummy.uid)),
      false
    );

    // Deleting everything stays empty on reload
    saveSandboxSocialState(
      { users: [], edges: [], rooms: [], messages: {} },
      {
        userIds: afterReload.users.map((u) => u.uid),
        edgeIds: afterReload.edges.map((e) => e.id),
        roomIds: afterReload.rooms.map((r) => r.id),
      }
    );
    const wipedReload = loadSandboxSocialState();
    assert.equal(wipedReload.users.length, 0);
    assert.equal(wipedReload.edges.length, 0);
    assert.equal(wipedReload.rooms.length, 0);

    // Clear tombstones explicitly works cleanly when re-seeding
    clearSocialTombstones();
  });
});
