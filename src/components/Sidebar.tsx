import React from 'react';
import {
  Bell,
  BookOpenText,
  Coins,
  GitBranch,
  LayoutDashboard,
  RefreshCw,
  X,
} from 'lucide-react';
import type { AdminSection, SyncStatus } from '../types/config';
import { PACKAGE_ID } from '../utils/configHelpers';

interface SidebarProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  shayariCount: number;
  notificationCount: number;
  unsaved: boolean;
  syncStatus: SyncStatus;
  githubConfigured: boolean;
  onSyncFromGitHub: () => void;
  onDiscardChanges: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: AdminSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard & Control', icon: LayoutDashboard },
  { id: 'shayari', label: 'Shayari Manager', icon: BookOpenText },
  { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
  { id: 'monetization', label: 'Monetization & Links', icon: Coins },
  { id: 'sync', label: 'GitHub Sync & Auth', icon: GitBranch },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  shayariCount,
  notificationCount,
  unsaved,
  syncStatus,
  githubConfigured,
  onSyncFromGitHub,
  onDiscardChanges,
  mobileOpen,
  onCloseMobile,
}) => {
  const content = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 w-64">
      <div>
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200">
          <div className="min-w-0">
            <div className="font-display text-lg font-bold tracking-tight text-slate-900 truncate">
              Shayari Lok
            </div>
            <div className="font-mono text-[11px] text-slate-500 truncate">
              {PACKAGE_ID}
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Admin sections" className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const count =
              item.id === 'shayari'
                ? shayariCount
                : item.id === 'notifications'
                  ? notificationCount
                  : null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {count !== null && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? 'text-indigo-700 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500">Sync Status</div>
          <div className="text-xs font-semibold flex items-center gap-1.5">
            {unsaved ? (
              <span className="text-amber-700">Unsaved local edits</span>
            ) : syncStatus === 'synced' ? (
              <span className="text-emerald-700">Synced with GitHub</span>
            ) : syncStatus === 'error' ? (
              <span className="text-red-700">Sync error — check settings</span>
            ) : (
              <span className="text-slate-700">Local seed draft ready</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onSyncFromGitHub}
          disabled={!githubConfigured || syncStatus === 'loading' || syncStatus === 'publishing'}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              syncStatus === 'loading' ? 'animate-spin' : ''
            }`}
          />
          <span>
            {syncStatus === 'loading' ? 'Syncing...' : 'Sync from GitHub'}
          </span>
        </button>

        {unsaved && (
          <button
            type="button"
            onClick={onDiscardChanges}
            className="w-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Discard Unsaved Edits
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{content}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button
            type="button"
            aria-label="Close navigation backdrop"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/40"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
