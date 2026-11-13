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
  | 'monetization'
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

export interface WebsiteContentSettings {
  heroHeadline: string;
  heroSubheadline: string;
  controls: WebsiteVisibilityControls;
  suvichar_list: SuvicharItem[];
  photo_shayari_list: PhotoShayariCard[];
}


