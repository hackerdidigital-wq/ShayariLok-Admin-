import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_APP_USERS,
  DEMO_CHAT_ROOMS,
  DEMO_SOCIAL_EDGES,
  buildAndroidSocialFirestoreEndpoints,
  computeSocialOverview,
  filterAppUsers,
  filterChatRooms,
  generateAndroidSocialIntegrationCode,
  getUserRelationships,
} from './socialMonitor';

test('computeSocialOverview aggregates online, blocked, follows, likes, and flagged rooms', () => {
  const stats = computeSocialOverview(
    DEMO_APP_USERS,
    DEMO_SOCIAL_EDGES,
    DEMO_CHAT_ROOMS
  );
  assert.equal(stats.totalUsers, 4);
  assert.equal(stats.onlineUsers, 3);
  assert.equal(stats.blockedUsers, 0);
  assert.equal(stats.totalFollows, 4);
  assert.equal(stats.totalLikes, 4);
  assert.equal(stats.activeChatRooms, 2);
  assert.equal(stats.flaggedRooms, 1);
});

test('filterAppUsers filters by city, username, UID, and online/blocked flags', () => {
  const jaipurMatches = filterAppUsers(DEMO_APP_USERS, 'Jaipur', 'all');
  assert.equal(jaipurMatches.length, 1);
  assert.equal(jaipurMatches[0].uid, 'usr_aarav_101');

  const onlineOnly = filterAppUsers(DEMO_APP_USERS, '', 'online');
  assert.equal(onlineOnly.length, 3);

  const modifiedBlocked = DEMO_APP_USERS.map((u) =>
    u.uid === 'usr_spam_104' ? { ...u, isBlocked: true } : u
  );
  const blockedOnly = filterAppUsers(modifiedBlocked, '', 'blocked');
  assert.equal(blockedOnly.length, 1);
  assert.equal(blockedOnly[0].uid, 'usr_spam_104');
});

test('filterChatRooms finds spam rooms and participant names cleanly', () => {
  const flagged = filterChatRooms(DEMO_CHAT_ROOMS, '', true);
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].id, 'room_102_104');

  const byName = filterChatRooms(DEMO_CHAT_ROOMS, 'Priya', false);
  assert.equal(byName.length, 2);
});

test('getUserRelationships resolves exact followers, following, likedBy, and likedTargets', () => {
  const rel = getUserRelationships('usr_aarav_101', DEMO_SOCIAL_EDGES);
  assert.equal(rel.followers.length, 2);
  assert.equal(rel.following.length, 1);
  assert.equal(rel.likedBy.length, 2);
  assert.equal(rel.likedTargets.length, 2);
});

test('Android Firestore endpoint & code generator embeds exact databaseId and collection paths', () => {
  const endpoints = buildAndroidSocialFirestoreEndpoints({
    projectId: 'psychic-advantage-nsmzh',
    firestoreDatabaseId: 'ai-studio-f7f3be7b-496c-4d08-bf57-38a268f047a4',
  });
  assert.ok(endpoints.appUsersPath.endsWith('/appUsers'));
  assert.ok(endpoints.chatRoomsPath.endsWith('/chatRooms'));
  assert.ok(
    endpoints.baseDocumentApi.includes(
      'ai-studio-f7f3be7b-496c-4d08-bf57-38a268f047a4'
    )
  );

  const kotlin = generateAndroidSocialIntegrationCode({
    projectId: 'psychic-advantage-nsmzh',
    firestoreDatabaseId: 'ai-studio-f7f3be7b-496c-4d08-bf57-38a268f047a4',
    apiKey: 'AIzaTest',
    appId: '1:123:android:abc',
  });
  assert.match(kotlin, /ai-studio-f7f3be7b-496c-4d08-bf57-38a268f047a4/);
  assert.match(kotlin, /collection\("appUsers"\)/);
  assert.match(kotlin, /collection\("socialEdges"\)/);
  assert.match(kotlin, /collection\("chatRooms"\)/);
  assert.match(kotlin, /observeMyBlockStatus/);
});
