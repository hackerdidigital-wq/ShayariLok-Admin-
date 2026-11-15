export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  badge: string;
  time_label: string;
}

export interface ShayariItem {
  id: number;
  category: string;
  text: string;
  author: string;
  image_url?: string;
}

export interface ShayariLokConfig {
  app_name: string;
  latest_version_code: number;
  force_update_url: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  privacy_policy_url: string;
  social_link: string;
  ads_enabled: boolean;
  banner_ad_id: string;
  interstitial_ad_id: string;
  announcement_title: string;
  announcement_message: string;
  notifications: NotificationItem[];
  categories: string[];
  shayari_list: ShayariItem[];
}

export interface GitHubSettings {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
}

export interface PublishLogEntry {
  id: string;
  commitSha: string;
  branch: string;
  filePath: string;
  versionCode: number;
  shayariCount: number;
  message: string;
  createdAt?: Date | null;
}

export type AdminSection =
  | 'dashboard'
  | 'shayari'
  | 'notifications'
  | 'localization'
  | 'monetization'
  | 'android-api'
  | 'social-monitor'
  | 'proxy'
  | 'sync'
  | 'website'
  | 'settings';

export type SyncStatus =
  | 'idle'
  | 'loading'
  | 'synced'
  | 'publishing'
  | 'error';

export type ProxyMode =
  | 'direct'
  | 'cloudflare_worker'
  | 'custom_prefix'
  | 'mirror_read';

export type ProxyNodeKind = 'worker' | 'prefix' | 'mirror';

export interface ProxyNode {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  kind: ProxyNodeKind;
}

export interface ProxySettings {
  mode: ProxyMode;
  primaryProxyUrl: string;
  rawMirrorUrl: string;
  fallbackNodes: ProxyNode[];
  timeoutMs: number;
  maxRetries: number;
  autoFallbackToDirect: boolean;
  forwardPatThroughProxy: boolean;
  customHeaderName: string;
  customHeaderValue: string;
}

export interface ProxyAttemptLog {
  id: string;
  timestamp: string;
  operation: 'GET' | 'PUT' | 'PING';
  routeLabel: string;
  targetUrl: string;
  statusCode: number | null;
  latencyMs: number;
  ok: boolean;
  detail: string;
}

export interface ProxyDiagnosticResult {
  id: string;
  label: string;
  kind: 'direct' | ProxyNodeKind;
  url: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  detail: string;
}

export interface SuvicharItem {
  id: number;
  text: string;
  author: string;
  category: string;
}

export type PhotoShayariThemeId =
  | 'sunset_love'
  | 'morning_chai'
  | 'monsoon_rain'
  | 'journal_ink';

export interface PhotoShayariCard {
  id: number;
  text: string;
  author: string;
  category: string;
  theme: PhotoShayariThemeId;
}

export interface WebsiteVisibilityControls {
  showNotificationBell: boolean;
  showAnnouncementBanner: boolean;
  showSuvicharSection: boolean;
  showPhotoShayariSection: boolean;
  showMaintenanceNotice: boolean;
}

export interface WebsiteSocialLinks {
  whatsapp: string;
  facebook: string;
  instagram: string;
  youtube: string;
}

export interface WebsiteContentSettings {
  heroHeadline: string;
  heroSubheadline: string;
  controls: WebsiteVisibilityControls;
  socialLinks?: WebsiteSocialLinks;
  suvichar_list: SuvicharItem[];
  photo_shayari_list: PhotoShayariCard[];
}

export interface AppUserProfile {
  uid: string;
  displayName: string;
  username: string;
  city: string;
  address: string;
  bio: string;
  isOnline: boolean;
  isBlocked: boolean;
  blockReason: string;
  followersCount: number;
  followingCount: number;
  likesReceivedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SocialEdgeItem {
  id: string;
  actorId: string;
  targetId: string;
  actorName: string;
  targetName: string;
  type: 'follow' | 'like';
  createdAt: string;
}

export interface ChatRoomItem {
  id: string;
  participantIds: [string, string];
  participantNames: [string, string];
  lastMessage: string;
  lastSenderId: string;
  messageCount: number;
  flaggedSpam: boolean;
  updatedAt: string;
}

export interface ChatMessageItem {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  isFlagged: boolean;
  createdAt: string;
}

export interface LanguageUiLabels {
  appTitle: string;
  homeTab: string;
  categoriesTab: string;
  favoritesTab: string;
  settingsTab: string;
  languageLabel: string;
  shareButton: string;
  copyButton: string;
}

export interface LanguageItem {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  enabled: boolean;
  uiLabels: LanguageUiLabels;
}

export interface CountryItem {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  currency: string;
  defaultLanguageCode: string;
  enabled: boolean;
}

export type ThemePresetId =
  | 'indigo_editorial'
  | 'royal_midnight'
  | 'emerald_sufi'
  | 'rose_shayari';

export interface DynamicThemeConfig {
  presetId: ThemePresetId;
  primaryColor: string;
  accentColor: string;
  surfaceStyle: 'clean_card' | 'glass_soft' | 'minimal_outline' | 'dark_ink';
  cardCornerRadius: number;
  darkModeEnabled: boolean;
  gradientEnabled: boolean;
  fontScale: 'compact' | 'normal' | 'large';
}

export interface ScheduledNotificationItem {
  id: string;
  title: string;
  message: string;
  targetLanguage: string;
  targetCountry: string;
  scheduledFor: string;
  repeatMode: 'once' | 'daily' | 'weekly';
  status: 'scheduled' | 'paused';
}

export interface EngagementToolsConfig {
  dailyStreakEnabled: boolean;
  moodFilterEnabled: boolean;
  oneTapWhatsAppShare: boolean;
  confettiOnFavorite: boolean;
  dailyShayariGoal: number;
  pollQuestion: string;
  pollOptionA: string;
  pollOptionB: string;
}

export interface AppLocalizationExtras {
  default_language_code: string;
  default_country_code: string;
  supported_languages: LanguageItem[];
  supported_countries: CountryItem[];
  dynamic_theme: DynamicThemeConfig;
  scheduled_notifications: ScheduledNotificationItem[];
  engagement_tools: EngagementToolsConfig;
}
