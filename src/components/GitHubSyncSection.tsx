import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Cloud,
  DownloadCloud,
  Eye,
  EyeOff,
  GitBranch,
  History,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  UploadCloud,
  Waypoints,
} from 'lucide-react';
import type {
  GitHubSettings,
  ProxySettings,
  PublishLogEntry,
  SyncStatus,
} from '../types/config';

interface GitHubSyncSectionProps {
  settings: GitHubSettings;
  onChangeSettings: (next: GitHubSettings) => void;
  onSaveSettings: () => void;
  currentSha: string;
  syncStatus: SyncStatus;
  statusMessage: string;
  commitMessage: string;
  onChangeCommitMessage: (msg: string) => void;
  onSyncFromGitHub: () => void;
  onPublishToGitHub: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSaveCloudDraft: () => void;
  onLoadCloudDraft: () => void;
  cloudBusy: boolean;
  publishLogs: PublishLogEntry[];
  proxySettings: ProxySettings;
  onOpenProxySettings: () => void;
}

export const GitHubSyncSection: React.FC<GitHubSyncSectionProps> = ({
  settings,
  onChangeSettings,
  onSaveSettings,
  currentSha,
  syncStatus,
  statusMessage,
  commitMessage,
  onChangeCommitMessage,
  onSyncFromGitHub,
  onPublishToGitHub,
  user,
  onSignIn,
  onSignOut,
  onSaveCloudDraft,
  onLoadCloudDraft,
  cloudBusy,
  publishLogs,
  proxySettings,
  onOpenProxySettings,
}) => {
  const [showToken, setShowToken] = useState(false);

  const handleField = (key: keyof GitHubSettings, value: string) => {
    onChangeSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* GitHub Contents API Connection */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <GitBranch className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                GitHub REST Contents API Connection
              </h2>
              <p className="text-sm text-slate-500">
                सीधे GitHub API से <code className="font-mono text-xs">config.json</code> लोड और कमिट करें। आपका PAT केवल ब्राउज़र के LocalStorage में सुरक्षित रहता है।
              </p>
            </div>
          </div>

          {currentSha && (
            <div className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
              Active SHA: {currentSha.slice(0, 10)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="gh-owner-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              GitHub Username / Owner
            </label>
            <input
              id="gh-owner-input"
              type="text"
              value={settings.owner}
              onChange={(e) => handleField('owner', e.target.value)}
              placeholder="e.g. cyberking-dev"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="gh-repo-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Repository Name
            </label>
            <input
              id="gh-repo-input"
              type="text"
              value={settings.repo}
              onChange={(e) => handleField('repo', e.target.value)}
              placeholder="e.g. shayari-lok-config"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="gh-branch-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Branch
            </label>
            <input
              id="gh-branch-input"
              type="text"
              value={settings.branch}
              onChange={(e) => handleField('branch', e.target.value)}
              placeholder="main"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="gh-path-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              File Path
            </label>
            <input
              id="gh-path-input"
              type="text"
              value={settings.path}
              onChange={(e) => handleField('path', e.target.value)}
              placeholder="config.json"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="gh-pat-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              GitHub Personal Access Token (PAT — <code className="font-mono text-xs">Contents: Read & Write</code>)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="gh-pat-input"
                type={showToken ? 'text' : 'password'}
                value={settings.token}
                onChange={(e) => handleField('token', e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                autoComplete="off"
                className="w-full pl-10 pr-11 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                aria-label={showToken ? 'Hide token' : 'Show token'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="gh-commit-msg-input"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Commit Message (Optional)
            </label>
            <input
              id="gh-commit-msg-input"
              type="text"
              value={commitMessage}
              onChange={(e) => onChangeCommitMessage(e.target.value)}
              placeholder="Update config.json via Shayari Lok Admin"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {statusMessage && (
          <div
            role="status"
            className={`text-xs font-medium px-3.5 py-2.5 rounded-lg border ${
              syncStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : syncStatus === 'synced'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {statusMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onSaveSettings}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Connection</span>
          </button>

          <button
            type="button"
            onClick={onSyncFromGitHub}
            disabled={syncStatus === 'loading' || syncStatus === 'publishing'}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                syncStatus === 'loading' ? 'animate-spin' : ''
              }`}
            />
            <span>Sync from GitHub (GET)</span>
          </button>

          <button
            type="button"
            onClick={onPublishToGitHub}
            disabled={syncStatus === 'loading' || syncStatus === 'publishing'}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Publish to GitHub (PUT)</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Waypoints className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Active Route:{' '}
              <strong className="text-slate-900">
                {proxySettings.mode === 'direct'
                  ? 'Direct GitHub API'
                  : proxySettings.mode === 'cloudflare_worker'
                    ? 'Cloudflare Worker Proxy'
                    : proxySettings.mode === 'custom_prefix'
                      ? 'Prefix / CORS Relay'
                      : 'CDN Mirror Read + API Write'}
              </strong>
              {proxySettings.fallbackNodes.filter((n) => n.enabled).length > 0 &&
                ` · ${proxySettings.fallbackNodes.filter((n) => n.enabled).length} fallback node(s)`}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenProxySettings}
            className="text-indigo-600 hover:text-indigo-800 font-semibold whitespace-nowrap self-start sm:self-auto"
          >
            Configure Proxy & Mirrors →
          </button>
        </div>
      </section>

      {/* Firebase Google Auth & Cloud Backup */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Cloud className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Firebase Cloud Workspace & Publish History
              </h2>
              <p className="text-sm text-slate-500">
                Google Sign-In के ज़रिए अपने <code className="font-mono text-xs">config.json</code> ड्राफ्ट, रिपो मेटाडेटा और कमिट इतिहास को Firestore में सुरक्षित रखें।
              </p>
            </div>
          </div>

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

        {user ? (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-600 space-y-0.5">
                <div className="font-semibold text-slate-900">
                  Signed in as {user.displayName || 'Admin'}
                </div>
                <div className="font-mono text-slate-500">{user.email}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onLoadCloudDraft}
                  disabled={cloudBusy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Restore Cloud Draft</span>
                </button>
                <button
                  type="button"
                  onClick={onSaveCloudDraft}
                  disabled={cloudBusy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{cloudBusy ? 'Saving...' : 'Backup Draft to Cloud'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <History className="w-4 h-4 text-slate-500" />
                <span>Recent GitHub Publish Logs</span>
              </div>

              {publishLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 border border-dashed border-slate-200 rounded-lg text-center">
                  अभी तक कोई क्लाउड पब्लिश लॉग रिकॉर्ड नहीं हुआ है।
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-medium">Commit / SHA</th>
                        <th className="py-2.5 px-3 font-medium">Target</th>
                        <th className="py-2.5 px-3 font-medium">Message</th>
                        <th className="py-2.5 px-3 font-medium text-right">
                          Version
                        </th>
                        <th className="py-2.5 px-3 font-medium text-right">
                          Shayaris
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {publishLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono text-slate-700 tabular-nums">
                            {log.commitSha.slice(0, 7)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {log.branch}/{log.filePath}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate">
                            {log.message}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-700">
                            v{log.versionCode}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-700">
                            {log.shayariCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-4">
            आप बिना साइन-इन किए भी लोकल और GitHub Sync फ़ीचर्स का उपयोग कर सकते हैं। क्रॉस-डिवाइस क्लाउड ड्राफ्ट बैकअप और पब्लिश लॉग्स के लिए ऊपर <strong>Sign in with Google</strong> पर क्लिक करें।
          </div>
        )}
      </section>
    </div>
  );
};
