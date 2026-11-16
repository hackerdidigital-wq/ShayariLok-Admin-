import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_APP_USERS,
  DEMO_CHAT_ROOMS,
  DEMO_SOCIAL_EDGES,
  buildAndroidSocialFirestoreEndpoints,
  buildSocialCleanupPlan,
  computeSocialOverview,
  filterAppUsers,
  filterChatRooms,
  formatFirestoreTimestamp,
  generateAndroidSocialIntegrationCode,
  getUserRelationships,
  isDummyAppUser,
  isDummyChatRoom,
  isDummySocialEdge,
} from './socialMonitor';
import type { AppUserProfile, ChatRoomItem, SocialEdgeItem } from '../types/config';

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

test('dummy detection and buildSocialCleanupPlan isolate test data from real production users', () => {
  const realUser: AppUserProfile = {
    uid: 'real_uid_987',
    displayName: 'Kavita Joshi',
    username: 'kavita_poems',
    city: 'Pune',
    address: 'Kothrud',
    bio: 'Writing Hindi poetry',
    isOnline: true,
    isBlocked: false,
    blockReason: '',
    followersCount: 12,
    followingCount: 4,
    likesReceivedCount: 25,
    createdAt: '2026-11-15T10:00:00Z',
    updatedAt: '2026-11-15T10:00:00Z',
  };
  const toxicRealUser: AppUserProfile = {
    ...realUser,
    uid: 'real_uid_999',
    displayName: 'Toxic Account',
    username: 'toxic_999',
    isBlocked: true,
    blockReason: 'Abuse',
  };
  const realEdge: SocialEdgeItem = {
    id: 'edge_real_1',
    actorId: 'real_uid_987',
    targetId: 'real_uid_999',
    actorName: 'Kavita',
    targetName: 'Toxic',
    type: 'follow',
    createdAt: '2026-11-15T10:00:00Z',
  };
  const realRoom: ChatRoomItem = {
    id: 'room_real_only',
    participantIds: ['real_uid_987', 'real_uid_888'],
    participantNames: ['Kavita', 'Friend'],
    lastMessage: 'Hello',
    lastSenderId: 'real_uid_987',
    messageCount: 1,
    flaggedSpam: false,
    updatedAt: '2026-11-15T10:00:00Z',
  };

  assert.equal(isDummyAppUser(realUser), false);
  assert.equal(isDummyAppUser(DEMO_APP_USERS[0]), true);
  assert.equal(isDummySocialEdge(realEdge), false);
  assert.equal(isDummySocialEdge(DEMO_SOCIAL_EDGES[0]), true);
  assert.equal(isDummyChatRoom(realRoom), false);
  assert.equal(isDummyChatRoom(DEMO_CHAT_ROOMS[0]), true);

  const users = [...DEMO_APP_USERS, realUser, toxicRealUser];
  const edges = [...DEMO_SOCIAL_EDGES, realEdge];
  const rooms = [...DEMO_CHAT_ROOMS, realRoom];

  const dummyOnly = buildSocialCleanupPlan(users, edges, rooms, {
    includeBlockedOrFlagged: false,
  });
  assert.equal(dummyOnly.dummyUserCount, 4);
  assert.equal(dummyOnly.dummyEdgeCount, 8);
  assert.equal(dummyOnly.dummyRoomCount, 2);
  assert.equal(dummyOnly.userIds.includes('real_uid_987'), false);
  assert.equal(dummyOnly.userIds.includes('real_uid_999'), false);
  assert.equal(dummyOnly.edgeIds.includes('edge_real_1'), false);
  assert.equal(dummyOnly.roomIds.includes('room_real_only'), false);

  const withSpam = buildSocialCleanupPlan(users, edges, rooms, {
    includeBlockedOrFlagged: true,
  });
  assert.equal(withSpam.flaggedSpamUserCount, 1);
  assert.equal(withSpam.userIds.includes('real_uid_999'), true);
  assert.equal(withSpam.edgeIds.includes('edge_real_1'), true);
  assert.equal(withSpam.userIds.includes('real_uid_987'), false);
});

test('Android Firestore endpoint & code generator embeds exact databaseId, safe updates, and instant removal listener', () => {
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
  assert.match(kotlin, /observeMyProfileAndBlockStatus/);
  assert.match(kotlin, /roomRef\.update/);
  assert.match(kotlin, /userRef\.update/);
});

test('formatFirestoreTimestamp preserves receiver context for Firestore Timestamp.toDate()', () => {
  class MockFirestoreTimestamp {
    private ms: number;
    constructor(ms: number) {
      this.ms = ms;
    }
    toMillis() {
      return this.ms;
    }
    toDate() {
      return new Date(this.toMillis());
    }
  }

  const ts = new MockFirestoreTimestamp(1700000000000);
  assert.equal(formatFirestoreTimestamp(ts), '2023-11-14T22:13:20.000Z');
  assert.equal(
    formatFirestoreTimestamp({ seconds: 1700000000 }),
    '2023-11-14T22:13:20.000Z'
  );
  assert.equal(
    formatFirestoreTimestamp('2026-11-16T10:00:00Z'),
    '2026-11-16T10:00:00Z'
  );
});
