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
  | 'sync';

export type SyncStatus =
  | 'idle'
  | 'loading'
  | 'synced'
  | 'publishing'
  | 'error';
