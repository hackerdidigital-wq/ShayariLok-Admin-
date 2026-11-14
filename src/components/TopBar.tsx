import React from 'react';
import type { User } from 'firebase/auth';
import {
  Code2,
  Globe,
  LogIn,
  LogOut,
  Menu,
  Settings,
  UploadCloud,
} from 'lucide-react';
import type { AdminSection, SyncStatus } from '../types/config';
import type { EnterpriseTabId } from '../utils/enterpriseSettings';
import { AdminBrandMenu } from './AdminBrandMenu';

interface TopBarProps {
  activeSection: AdminSection;
  unsaved: boolean;
  syncStatus: SyncStatus;
  onOpenPreview: () => void;
  onPublish: () => void;
  onOpenMobileMenu: () => void;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  environment: 'production' | 'staging';
  hasPin: boolean;
  onOpenEnterpriseSetting: (tab: EnterpriseTabId | null) => void;
  onOpenLiveSite: () => void;
  onLockNow: () => void;
}

const SECTION_TITLES: Record<AdminSection, string> = {
  dashboard: 'Dashboard & App Control',
  shayari: 'Shayari Manager',
  notifications: 'Notifications & Announcements',
  'social-monitor': 'Users & Live Chats (चैटिंग और यूजर्स कंट्रोल)',
  monetization: 'Monetization & Social Links',
  website: 'Live Public Websites',
  'android-api': 'Android App API & Code',
  proxy: 'Proxy & Mirror Routing',
  sync: 'GitHub Sync & Cloud Auth',
  settings: 'Enterprise Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  unsaved,
  syncStatus,
  onOpenPreview,
  onPublish,
  onOpenMobileMenu,
  user,
  authLoading,
  onSignIn,
  onSignOut,
  environment,
  hasPin,
  onOpenEnterpriseSetting,
  onOpenLiveSite,
  onLockNow,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline font-medium text-slate-400 whitespace-nowrap shrink-0">
            Shayari Lok
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
          {unsaved && (
            <span className="hidden xl:inline text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
              · Unsaved changes
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!authLoading &&
          (user ? (
            <div className="hidden xl:flex items-center gap-2 pr-2 border-r border-slate-200">
              <span className="text-xs font-medium text-slate-600 max-w-[140px] truncate">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign out of Google account"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Google Sign-In</span>
            </button>
          ))}

        <button
          type="button"
          onClick={onOpenLiveSite}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-600" />
          <span>Live Website</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenEnterpriseSetting(null)}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={onOpenPreview}
          className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Code2 className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Live JSON</span>
          <span className="sm:hidden">JSON</span>
        </button>

        <button
          type="button"
          onClick={onPublish}
          disabled={syncStatus === 'publishing' || syncStatus === 'loading'}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">
            {syncStatus === 'publishing' ? 'Publishing...' : 'Publish Changes'}
          </span>
          <span className="sm:hidden">
            {syncStatus === 'publishing' ? 'Pushing...' : 'Publish'}
          </span>
        </button>

        <div className="lg:hidden">
          <AdminBrandMenu
            environment={environment}
            hasPin={hasPin}
            onLockNow={onLockNow}
            onSelectSetting={onOpenEnterpriseSetting}
            align="right"
          />
        </div>
      </div>
    </header>
  );
};
