import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from './configHelpers';
import {
  DEMO_APP_USERS,
  DEMO_CHAT_ROOMS,
  DEMO_SOCIAL_EDGES,
} from './socialMonitor';
import {
  computeCategoryDistribution,
  computeUserAnalyticsSummary,
} from './userAnalytics';

test('computeCategoryDistribution sorts categories by item count and computes percentages', () => {
  const dist = computeCategoryDistribution(DEFAULT_CONFIG);
  assert.ok(dist.length >= 4);
  const love = dist.find((d) => d.category === 'Love');
  assert.equal(love?.count, 2);
  assert.equal(love?.percent, 40);
});

test('computeUserAnalyticsSummary calculates online rate, cities, recent users, and 7-day trend', () => {
  const summary = computeUserAnalyticsSummary(
    DEMO_APP_USERS,
    DEMO_SOCIAL_EDGES,
    DEMO_CHAT_ROOMS
  );
  assert.equal(summary.totalUsers, DEMO_APP_USERS.length);
  assert.ok(summary.onlineUsers > 0);
  assert.ok(summary.onlineRatePercent > 0 && summary.onlineRatePercent <= 100);
  assert.ok(summary.topCities.length > 0);
  assert.equal(summary.weeklyTrend.length, 7);
  assert.ok(summary.recentUsers.length > 0);
});
