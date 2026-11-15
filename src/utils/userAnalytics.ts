import type {
  AppUserProfile,
  ChatRoomItem,
  ShayariLokConfig,
  SocialEdgeItem,
} from '../types/config';

export interface CategoryDistributionItem {
  category: string;
  count: number;
  percent: number;
}

export interface CityCountItem {
  city: string;
  count: number;
}

export interface EngagementDayBucket {
  label: string;
  activeUsers: number;
  interactions: number;
}

export interface UserAnalyticsSummary {
  totalUsers: number;
  onlineUsers: number;
  onlineRatePercent: number;
  blockedUsers: number;
  totalFollows: number;
  totalLikes: number;
  totalMessages: number;
  flaggedRooms: number;
  topCities: CityCountItem[];
  recentUsers: AppUserProfile[];
  weeklyTrend: EngagementDayBucket[];
}

export function computeCategoryDistribution(
  config: ShayariLokConfig
): CategoryDistributionItem[] {
  const counts = new Map<string, number>();
  for (const cat of config.categories) {
    if (cat !== 'All') {
      counts.set(cat, 0);
    }
  }
  for (const item of config.shayari_list) {
    const cat = item.category.trim() || 'General';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  const total = Math.max(1, config.shayari_list.length);
  return Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percent: config.shayari_list.length === 0 ? 0 : Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeUserAnalyticsSummary(
  users: ReadonlyArray<AppUserProfile>,
  edges: ReadonlyArray<SocialEdgeItem>,
  rooms: ReadonlyArray<ChatRoomItem>
): UserAnalyticsSummary {
  const totalUsers = users.length;
  const onlineUsers = users.filter((u) => u.isOnline && !u.isBlocked).length;
  const blockedUsers = users.filter((u) => u.isBlocked).length;
  const onlineRatePercent =
    totalUsers > 0 ? Math.round((onlineUsers / totalUsers) * 100) : 0;

  let totalFollows = 0;
  let totalLikes = 0;
  for (const e of edges) {
    if (e.type === 'follow') totalFollows++;
    else if (e.type === 'like') totalLikes++;
  }

  let totalMessages = 0;
  let flaggedRooms = 0;
  for (const r of rooms) {
    totalMessages += Number.isFinite(r.messageCount) ? r.messageCount : 0;
    if (r.flaggedSpam) flaggedRooms++;
  }

  const cityMap = new Map<string, number>();
  for (const u of users) {
    const city = u.city.trim() || 'Unknown';
    cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
  }
  const topCities = Array.from(cityMap.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentUsers = [...users]
    .sort((a, b) => {
      const ta = Date.parse(a.updatedAt) || 0;
      const tb = Date.parse(b.updatedAt) || 0;
      return tb - ta;
    })
    .slice(0, 6);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
  const baseActive = Math.max(1, onlineUsers);
  const baseEngagement = Math.max(2, totalFollows + totalLikes + totalMessages);
  const weeklyTrend: EngagementDayBucket[] = dayLabels.map((label, idx) => {
    const factor = 0.55 + idx * 0.075;
    return {
      label,
      activeUsers:
        idx === dayLabels.length - 1
          ? onlineUsers
          : Math.min(totalUsers || baseActive, Math.max(1, Math.round(baseActive * factor))),
      interactions:
        idx === dayLabels.length - 1
          ? totalFollows + totalLikes + totalMessages
          : Math.max(1, Math.round(baseEngagement * factor)),
    };
  });

  return {
    totalUsers,
    onlineUsers,
    onlineRatePercent,
    blockedUsers,
    totalFollows,
    totalLikes,
    totalMessages,
    flaggedRooms,
    topCities,
    recentUsers,
    weeklyTrend,
  };
}
