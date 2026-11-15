import React, { useMemo } from 'react';
import {
  Activity,
  BarChart3,
  MapPin,
  Users,
} from 'lucide-react';
import type {
  AppUserProfile,
  ChatRoomItem,
  ShayariLokConfig,
  SocialEdgeItem,
} from '../types/config';
import {
  computeCategoryDistribution,
  computeUserAnalyticsSummary,
} from '../utils/userAnalytics';

interface UserAnalyticsPanelProps {
  config: ShayariLokConfig;
  appUsers: AppUserProfile[];
  socialEdges: SocialEdgeItem[];
  chatRooms: ChatRoomItem[];
  dataMode: 'live' | 'sandbox';
  onOpenUsersMonitor: () => void;
}

export const UserAnalyticsPanel: React.FC<UserAnalyticsPanelProps> = ({
  config,
  appUsers,
  socialEdges,
  chatRooms,
  dataMode,
  onOpenUsersMonitor,
}) => {
  const analytics = useMemo(
    () => computeUserAnalyticsSummary(appUsers, socialEdges, chatRooms),
    [appUsers, socialEdges, chatRooms]
  );

  const categoryDist = useMemo(
    () => computeCategoryDistribution(config).slice(0, 6),
    [config]
  );

  const maxTrendValue = useMemo(
    () =>
      Math.max(
        1,
        ...analytics.weeklyTrend.map((b) => Math.max(b.activeUsers, b.interactions))
      ),
    [analytics.weeklyTrend]
  );

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900">
                User Analytics &amp; Live Activity
              </h2>
              <span
                className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  dataMode === 'live'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {dataMode === 'live' ? 'Cloud Live Stream' : 'Preview Telemetry'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ऐप पर कुल एक्टिव यूजर्स, लॉगिन गतिविधि, शहर वितरण और कैटेगरी अनुसार शायरी प्रदर्शन।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenUsersMonitor}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Full User &amp; Chat Monitor →</span>
        </button>
      </div>

      {/* 4 Compact Analytics KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs text-slate-500">Registered Users</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {analytics.totalUsers}
          </div>
          <div className="mt-1 text-[11px] font-medium text-emerald-700 tabular-nums">
            {analytics.onlineUsers} active online ({analytics.onlineRatePercent}%)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs text-slate-500">Social Engagement</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {analytics.totalFollows + analytics.totalLikes}
          </div>
          <div className="mt-1 text-[11px] text-slate-600 tabular-nums">
            {analytics.totalFollows} follows · {analytics.totalLikes} likes
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs text-slate-500">Chat Messages</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {analytics.totalMessages}
          </div>
          <div className="mt-1 text-[11px] text-slate-600 tabular-nums">
            Across {chatRooms.length} rooms
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs text-slate-500">Safety &amp; Moderation</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {analytics.blockedUsers} / {analytics.flaggedRooms}
          </div>
          <div className="mt-1 text-[11px] text-red-700 font-medium">
            Blocked users · Flagged rooms
          </div>
        </div>
      </div>

      {/* Charts + Recent Logins Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 7-Day Activity Bar Chart */}
        <div className="lg:col-span-5 p-4 rounded-xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>7-Day User Activity &amp; Engagement</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-indigo-600" />
                <span>Engagement</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                <span>Online</span>
              </span>
            </div>
          </div>

          <div
            className="h-40 flex items-end justify-between gap-2 pt-4 border-b border-slate-200 pb-2"
            role="img"
            aria-label="7-day active users and engagement chart"
          >
            {analytics.weeklyTrend.map((day) => {
              const engHeight = Math.max(
                10,
                Math.round((day.interactions / maxTrendValue) * 100)
              );
              const usrHeight = Math.max(
                8,
                Math.round((day.activeUsers / maxTrendValue) * 100)
              );
              return (
                <div
                  key={day.label}
                  className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
                  title={`${day.label}: ${day.activeUsers} active users, ${day.interactions} interactions`}
                >
                  <div className="w-full flex items-end justify-center gap-1 h-28">
                    <div
                      className="w-2.5 sm:w-3 bg-indigo-600 rounded-t transition-all"
                      style={{ height: `${engHeight}%` }}
                    />
                    <div
                      className="w-2.5 sm:w-3 bg-emerald-500 rounded-t transition-all"
                      style={{ height: `${usrHeight}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Category Distribution */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-slate-700">
              Shayari Category Breakdown
            </div>
            <div className="space-y-2">
              {categoryDist.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-700">
                      {item.category}
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {item.count} ({item.percent}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${Math.max(4, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Logins & Active Users Table */}
        <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">
              Recent Active Users &amp; Logins
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Top Cities: {analytics.topCities.map((c) => `${c.city} (${c.count})`).join(', ') || 'None'}
            </span>
          </div>

          {analytics.recentUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              अभी कोई रजिस्टर्ड ऐप यूज़र नहीं मिला।
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {analytics.recentUsers.map((u) => (
                <div
                  key={u.uid}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          u.isBlocked
                            ? 'bg-red-600'
                            : u.isOnline
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {u.displayName}
                      </span>
                      <span className="font-mono text-[11px] text-indigo-700 truncate">
                        @{u.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                      <span className="truncate">{u.city || 'India'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {u.followersCount} followers
                      </span>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                      u.isBlocked
                        ? 'bg-red-50 text-red-700'
                        : u.isOnline
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {u.isBlocked ? 'BLOCKED' : u.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
