import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { DashboardSection } from './components/DashboardSection';
import { GitHubSyncSection } from './components/GitHubSyncSection';
import { JsonPreviewModal } from './components/JsonPreviewModal';
import { MonetizationSection } from './components/MonetizationSection';
import { NotificationsSection } from './components/NotificationsSection';
import { ShayariManagerSection } from './components/ShayariManagerSection';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { auth, googleProvider } from './firebase';
import {
  ensureUserProfile,
  loadCloudDraft,
  recordPublishLog,
  saveCloudDraft,
  saveCloudRepoSettings,
  subscribeUserWorkspace,
} from './services/firestoreSync';
import type {
  AdminSection,
  GitHubSettings,
  PublishLogEntry,
  ShayariLokConfig,
  SyncStatus,
} from './types/config';
import {
  DEFAULT_CONFIG,
  hasUnsavedChanges,
} from './utils/configHelpers';
import {
  fetchGitHubConfig,
  isGitHubConfigured,
  loadGitHubSettings,
  loadLocalDraft,
  loadSavedSha,
  publishGitHubConfig,
  saveGitHubSettings,
  saveLocalDraft,
  saveLocalSha,
} from './utils/githubApi';

const VALID_SECTIONS: ReadonlyArray<AdminSection> = [
  'dashboard',
  'shayari',
  'notifications',
  'monetization',
  'sync',
];

function getSectionFromHash(): AdminSection {
  if (typeof window === 'undefined') return 'dashboard';
  const raw = window.location.hash.replace(/^#\/?/, '').trim() as AdminSection;
  return VALID_SECTIONS.includes(raw) ? raw : 'dashboard';
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AdminSection>(() =>
    getSectionFromHash()
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [settings, setSettings] = useState<GitHubSettings>(() =>
    loadGitHubSettings()
  );
  const [currentSha, setCurrentSha] = useState<string>(() => loadSavedSha());
  const [commitMessage, setCommitMessage] = useState<string>('');

  const [baselineConfig, setBaselineConfig] = useState<ShayariLokConfig>(() => ({
    ...DEFAULT_CONFIG,
  }));
  const [config, setConfig] = useState<ShayariLokConfig>(
    () => loadLocalDraft() ?? { ...DEFAULT_CONFIG }
  );

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [publishLogs, setPublishLogs] = useState<PublishLogEntry[]>([]);

  const initialAutoSyncedRef = useRef(false);

  const unsaved = useMemo(
    () => hasUnsavedChanges(config, baselineConfig),
    [config, baselineConfig]
  );

  const githubReady = useMemo(
    () => isGitHubConfigured(settings, false),
    [settings]
  );

  const showBanner = useCallback(
    (type: 'success' | 'error' | 'info', text: string) => {
      setBanner({ type, text });
    },
    []
  );

  const navigateSection = useCallback((section: AdminSection) => {
    setActiveSection(section);
    if (typeof window !== 'undefined') {
      const targetHash = `#/${section}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setActiveSection(getSectionFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Persist local draft automatically so edits survive reload
  useEffect(() => {
    saveLocalDraft(config);
  }, [config]);

  // Firebase Auth & Firestore Workspace Listener
  useEffect(() => {
    let unsubWorkspace: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubWorkspace) {
        unsubWorkspace();
        unsubWorkspace = null;
      }

      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser) {
        setPublishLogs([]);
        return;
      }

      try {
        await ensureUserProfile(currentUser);
        unsubWorkspace = subscribeUserWorkspace(currentUser.uid, {
          onSettings: (cloudMeta) => {
            setSettings((prev) => {
              if (prev.owner && prev.repo) return prev;
              const merged: GitHubSettings = {
                owner: cloudMeta.owner,
                repo: cloudMeta.repo,
                branch: cloudMeta.branch || 'main',
                path: cloudMeta.path || 'config.json',
                token: prev.token,
              };
              saveGitHubSettings(merged);
              return merged;
            });
            if (cloudMeta.lastSha) {
              setCurrentSha((prev) => prev || cloudMeta.lastSha);
            }
          },
          onLogs: (logs) => setPublishLogs(logs),
          onError: (err) => {
            console.error(err);
          },
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Firebase profile sync failed';
        showBanner('error', msg);
      }
    });

    return () => {
      unsubAuth();
      if (unsubWorkspace) unsubWorkspace();
    };
  }, [showBanner]);

  const handleSyncFromGitHub = useCallback(
    async (targetSettings?: GitHubSettings) => {
      const activeSettings = targetSettings ?? settings;
      if (!isGitHubConfigured(activeSettings, false)) {
        navigateSection('sync');
        showBanner(
          'info',
          'पहले GitHub Username/Owner, Repository Name और File Path सेव करें।'
        );
        return;
      }

      setSyncStatus('loading');
      setStatusMessage('GitHub से लाइव config.json लोड हो रहा है...');
      try {
        const result = await fetchGitHubConfig(activeSettings);
        setConfig(result.config);
        setBaselineConfig(result.config);
        setCurrentSha(result.sha);
        saveLocalSha(result.sha);
        setSyncStatus('synced');
        const msg = `GitHub से लाइव config.json लोड हो गया (SHA: ${result.sha.slice(0, 7)})`;
        setStatusMessage(msg);
        showBanner('success', msg);

        if (user) {
          await saveCloudRepoSettings(user.uid, activeSettings, result.sha);
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'GitHub Sync विफल रहा।';
        setSyncStatus('error');
        setStatusMessage(msg);
        showBanner('error', msg);
      }
    },
    [settings, user, showBanner, navigateSection]
  );

  // Auto-load live config.json on app boot when GitHub repo is configured
  useEffect(() => {
    if (initialAutoSyncedRef.current) return;
    initialAutoSyncedRef.current = true;
    if (isGitHubConfigured(settings, false)) {
      void handleSyncFromGitHub(settings);
    }
  }, [settings, handleSyncFromGitHub]);

  const handleUpdateConfig = useCallback((patch: Partial<ShayariLokConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSaveSettings = async () => {
    const cleaned: GitHubSettings = {
      owner: settings.owner.trim(),
      repo: settings.repo.trim(),
      branch: settings.branch.trim() || 'main',
      path: settings.path.trim() || 'config.json',
      token: settings.token.trim(),
    };
    setSettings(cleaned);
    saveGitHubSettings(cleaned);
    showBanner('success', 'GitHub कनेक्शन सेटिंग्स LocalStorage में सेव हो गईं।');

    if (user && cleaned.owner && cleaned.repo) {
      try {
        await saveCloudRepoSettings(user.uid, cleaned, currentSha);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Cloud settings save failed';
        showBanner('error', msg);
      }
    }
  };

  const handlePublishToGitHub = async () => {
    if (!isGitHubConfigured(settings, true)) {
      navigateSection('sync');
      showBanner(
        'info',
        'GitHub पर पब्लिश करने के लिए Owner, Repo, Path और Personal Access Token (PAT) भरें।'
      );
      return;
    }

    setSyncStatus('publishing');
    setStatusMessage('GitHub रिपॉज़िटरी में config.json कमिट हो रहा है...');

    try {
      const effectiveMessage =
        commitMessage.trim() ||
        `Update config.json via Shayari Lok Admin (v${config.latest_version_code})`;

      const res = await publishGitHubConfig(
        settings,
        config,
        currentSha,
        effectiveMessage
      );

      setCurrentSha(res.sha);
      saveLocalSha(res.sha);
      setBaselineConfig(config);
      setCommitMessage('');
      setSyncStatus('synced');

      const okMsg = `GitHub पर सफलतापूर्वक पब्लिश हो गया! नया SHA: ${res.sha.slice(0, 7)}`;
      setStatusMessage(okMsg);
      showBanner('success', okMsg);

      if (user) {
        await Promise.all([
          saveCloudRepoSettings(user.uid, settings, res.sha),
          saveCloudDraft(user.uid, config),
          recordPublishLog(user.uid, {
            commitSha: res.commitSha,
            branch: settings.branch.trim() || 'main',
            filePath: settings.path.trim() || 'config.json',
            versionCode: config.latest_version_code,
            shayariCount: config.shayari_list.length,
            message: effectiveMessage,
          }),
        ]);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'GitHub Publish विफल रहा।';
      setSyncStatus('error');
      setStatusMessage(msg);
      showBanner('error', msg);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showBanner('success', 'Google अकाउंट से साइन-इन सफल रहा।');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Google Sign-In विफल रहा।';
      showBanner('error', msg);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
      showBanner('info', 'आप सफलतापूर्वक साइन-आउट हो गए हैं।');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Sign-Out विफल रहा।';
      showBanner('error', msg);
    }
  };

  const handleSaveCloudDraft = async () => {
    if (!user) return;
    setCloudBusy(true);
    try {
      await saveCloudDraft(user.uid, config);
      showBanner('success', 'वर्तमान config.json ड्राफ्ट Firestore क्लाउड में सेव हो गया।');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Cloud backup विफल रहा।';
      showBanner('error', msg);
    } finally {
      setCloudBusy(false);
    }
  };

  const handleLoadCloudDraft = async () => {
    if (!user) return;
    setCloudBusy(true);
    try {
      const cloudConfig = await loadCloudDraft(user.uid);
      if (!cloudConfig) {
        showBanner('info', 'Firestore में अभी कोई सेव किया हुआ ड्राफ्ट नहीं मिला।');
      } else {
        setConfig(cloudConfig);
        showBanner('success', 'Firestore क्लाउड से ड्राफ्ट लोड हो गया।');
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Cloud restore विफल रहा।';
      showBanner('error', msg);
    } finally {
      setCloudBusy(false);
    }
  };

  const handleDiscardChanges = () => {
    setConfig(baselineConfig);
    showBanner('info', 'असहेजे गए स्थानीय बदलाव हटा दिए गए हैं।');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={navigateSection}
        shayariCount={config.shayari_list.length}
        notificationCount={config.notifications.length}
        unsaved={unsaved}
        syncStatus={syncStatus}
        githubConfigured={githubReady}
        onSyncFromGitHub={() => void handleSyncFromGitHub()}
        onDiscardChanges={handleDiscardChanges}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          unsaved={unsaved}
          syncStatus={syncStatus}
          onOpenPreview={() => setPreviewOpen(true)}
          onPublish={() => void handlePublishToGitHub()}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          user={user}
          authLoading={authLoading}
          onSignIn={() => void handleGoogleSignIn()}
          onSignOut={() => void handleGoogleSignOut()}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-5">
          {banner && (
            <div
              role="status"
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                banner.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : banner.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {banner.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate sm:whitespace-normal">{banner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setBanner(null)}
                aria-label="Dismiss notification banner"
                className="p-1 rounded hover:bg-black/5 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeSection === 'dashboard' && (
            <DashboardSection
              config={config}
              onUpdate={handleUpdateConfig}
              onNavigate={navigateSection}
            />
          )}

          {activeSection === 'shayari' && (
            <ShayariManagerSection
              config={config}
              onUpdate={handleUpdateConfig}
            />
          )}

          {activeSection === 'notifications' && (
            <NotificationsSection
              config={config}
              onUpdate={handleUpdateConfig}
            />
          )}

          {activeSection === 'monetization' && (
            <MonetizationSection
              config={config}
              onUpdate={handleUpdateConfig}
            />
          )}

          {activeSection === 'sync' && (
            <GitHubSyncSection
              settings={settings}
              onChangeSettings={setSettings}
              onSaveSettings={() => void handleSaveSettings()}
              currentSha={currentSha}
              syncStatus={syncStatus}
              statusMessage={statusMessage}
              commitMessage={commitMessage}
              onChangeCommitMessage={setCommitMessage}
              onSyncFromGitHub={() => void handleSyncFromGitHub()}
              onPublishToGitHub={() => void handlePublishToGitHub()}
              user={user}
              onSignIn={() => void handleGoogleSignIn()}
              onSignOut={() => void handleGoogleSignOut()}
              onSaveCloudDraft={() => void handleSaveCloudDraft()}
              onLoadCloudDraft={() => void handleLoadCloudDraft()}
              cloudBusy={cloudBusy}
              publishLogs={publishLogs}
            />
          )}
        </main>
      </div>

      <JsonPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        config={config}
        unsaved={unsaved}
        currentSha={currentSha}
      />
    </div>
  );
}
