import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AdminLockScreen } from './components/AdminLockScreen';
import { DashboardSection } from './components/DashboardSection';
import { FullScreenSettingsPage } from './components/FullScreenSettingsPage';
import { GitHubSyncSection } from './components/GitHubSyncSection';
import { JsonPreviewModal } from './components/JsonPreviewModal';
import { MonetizationSection } from './components/MonetizationSection';
import { NotificationsSection } from './components/NotificationsSection';
import { ProxySection } from './components/ProxySection';
import { PublicWebsiteView } from './components/PublicWebsiteView';
import { ShayariManagerSection } from './components/ShayariManagerSection';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WebsiteHubSection } from './components/WebsiteHubSection';
import { auth, firebaseInitError, googleProvider } from './firebase';
import {
  ensureUserProfile,
  loadCloudDraft,
  loadCloudProxyProfile,
  publishPublicWebsiteState,
  recordPublishLog,
  saveCloudDraft,
  saveCloudProxyProfile,
  saveCloudRepoSettings,
  subscribeUserWorkspace,
} from './services/firestoreSync';
import type {
  AdminSection,
  GitHubSettings,
  ProxyAttemptLog,
  ProxySettings,
  PublishLogEntry,
  ShayariLokConfig,
  SyncStatus,
  WebsiteContentSettings,
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
import {
  loadProxySettings,
  normalizeProxySettings,
  saveProxySettings,
} from './utils/proxyEngine';
import {
  loadAuditLog,
  loadEnterpriseSettings,
  loadSnapshots,
  normalizeEnterpriseSettings,
  saveAuditLog,
  saveEnterpriseSettings,
  saveSnapshots,
  validatePublishGuardrails,
  verifyPinCode,
  type ActivityAuditEntry,
  type ConfigSnapshot,
  type EnterpriseSettings,
  type EnterpriseTabId,
} from './utils/enterpriseSettings';
import {
  buildAdminHash,
  buildPublicSiteHash,
  buildSettingsHash,
  buildStandaloneEntryUrl,
  parseAppRoute,
  parsePublicRepoOverride,
  type AppRouteState,
  type PublicSitePageId,
} from './utils/siteRoutes';
import {
  broadcastLiveWebsiteState,
  loadWebsiteContent,
  saveWebsiteContent,
} from './utils/websiteContent';

function getCurrentRoute(): AppRouteState {
  if (typeof window === 'undefined') {
    return { view: 'admin', section: 'dashboard' };
  }
  return parseAppRoute(window.location.hash);
}

export default function App() {
  const [routeState, setRouteState] = useState<AppRouteState>(() =>
    getCurrentRoute()
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [settings, setSettings] = useState<GitHubSettings>(() =>
    loadGitHubSettings()
  );
  const [proxySettings, setProxySettings] = useState<ProxySettings>(() =>
    loadProxySettings()
  );
  const [attemptLogs, setAttemptLogs] = useState<ProxyAttemptLog[]>([]);
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

  const [enterprise, setEnterprise] = useState<EnterpriseSettings>(() =>
    loadEnterpriseSettings()
  );
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentSettings>(() =>
    loadWebsiteContent()
  );
  const [liveSyncing, setLiveSyncing] = useState(false);
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>(() =>
    loadSnapshots()
  );
  const [auditLog, setAuditLog] = useState<ActivityAuditEntry[]>(() =>
    loadAuditLog()
  );
  const [isLocked, setIsLocked] = useState(false);
  const [publishConfirmWarnings, setPublishConfirmWarnings] = useState<
    string[] | null
  >(null);
  const [publicSyncState, setPublicSyncState] = useState<
    'local' | 'loading' | 'live' | 'error'
  >('local');
  const [publicSyncMessage, setPublicSyncMessage] = useState('');

  const initialAutoSyncedRef = useRef(false);

  const activeSection: AdminSection =
    routeState.view === 'admin'
      ? routeState.section
      : routeState.view === 'settings'
        ? 'settings'
        : 'website';

  const logActivity = useCallback((action: string, detail: string) => {
    setAuditLog((prev) => {
      const next: ActivityAuditEntry[] = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          action,
          detail,
        },
        ...prev,
      ].slice(0, 40);
      saveAuditLog(next);
      return next;
    });
  }, []);

  const appendAttemptLog = useCallback((log: ProxyAttemptLog) => {
    setAttemptLogs((prev) => [log, ...prev].slice(0, 25));
  }, []);

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
    if (section === 'settings') {
      setRouteState({ view: 'settings', tab: null });
      if (typeof window !== 'undefined') {
        const target = buildSettingsHash(null);
        if (window.location.hash !== target) {
          window.location.hash = target;
        }
      }
      return;
    }

    setRouteState({ view: 'admin', section });
    if (typeof window !== 'undefined') {
      const targetHash = buildAdminHash(section);
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
  }, []);

  const navigateSettingsTab = useCallback((tab: EnterpriseTabId | null) => {
    setRouteState({ view: 'settings', tab });
    if (typeof window !== 'undefined') {
      const targetHash = buildSettingsHash(tab);
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const navigatePublicSite = useCallback((page: PublicSitePageId) => {
    setRouteState({ view: 'site', page });
    if (typeof window !== 'undefined') {
      const queryPart = window.location.hash.includes('?')
        ? `?${window.location.hash.split('?')[1]}`
        : '';
      const targetHash = `${buildPublicSiteHash(page)}${queryPart}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setRouteState(getCurrentRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Persist local draft & broadcast live updates in real time to open website/privacy tabs
  useEffect(() => {
    if (enterprise.autoSaveDraft) {
      saveLocalDraft(config);
    }
    saveWebsiteContent(websiteContent);
    broadcastLiveWebsiteState(config, websiteContent, enterprise);
  }, [config, websiteContent, enterprise]);

  // Debounced cross-device Firestore real-time mirror when signed in
  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      publishPublicWebsiteState(
        user.uid,
        config,
        websiteContent,
        enterprise.organizationName,
        enterprise.supportEmail
      ).catch(() => {
        // Non-fatal background live sync; explicit publish action surfaces errors
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [user, config, websiteContent, enterprise.organizationName, enterprise.supportEmail]);

  // Apply workspace density & Devanagari typography attributes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.density = enterprise.density;
    document.documentElement.dataset.devanagari = enterprise.devanagariScale;
  }, [enterprise.density, enterprise.devanagariScale]);

  // Idle auto-lock timer when PIN and timeout are enabled
  useEffect(() => {
    if (!enterprise.pinHash || enterprise.autoLockMinutes <= 0 || isLocked) {
      return;
    }
    const timeoutMs = enterprise.autoLockMinutes * 60 * 1000;
    let timer = window.setTimeout(() => setIsLocked(true), timeoutMs);
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsLocked(true), timeoutMs);
    };
    window.addEventListener('pointerdown', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [enterprise.pinHash, enterprise.autoLockMinutes, isLocked]);

  // Firebase Auth & Firestore Workspace Listener
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

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
        const result = await fetchGitHubConfig(
          activeSettings,
          proxySettings,
          appendAttemptLog
        );
        setConfig(result.config);
        setBaselineConfig(result.config);
        setCurrentSha(result.sha);
        saveLocalSha(result.sha);
        setSyncStatus('synced');
        const msg = `GitHub से लाइव config.json लोड हो गया (${result.routeLabel} · ${result.latencyMs}ms${result.sha ? ` · SHA: ${result.sha.slice(0, 7)}` : ''})`;
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
    [settings, proxySettings, appendAttemptLog, user, showBanner, navigateSection]
  );

  // Auto-load live config.json on boot when GitHub repo or public share query is configured
  useEffect(() => {
    if (initialAutoSyncedRef.current) return;
    initialAutoSyncedRef.current = true;
    const publicOverride =
      typeof window !== 'undefined'
        ? parsePublicRepoOverride(window.location.hash)
        : null;

    if (publicOverride) {
      setPublicSyncState('loading');
      fetchGitHubConfig(
        {
          owner: publicOverride.owner,
          repo: publicOverride.repo,
          branch: publicOverride.branch,
          path: publicOverride.path,
          token: '',
        },
        proxySettings,
        appendAttemptLog
      )
        .then((res) => {
          setConfig(res.config);
          setBaselineConfig(res.config);
          setPublicSyncState('live');
          setPublicSyncMessage('');
        })
        .catch((err) => {
          setPublicSyncState('error');
          setPublicSyncMessage(
            err instanceof Error
              ? err.message
              : 'Live GitHub config fetch failed; showing fallback content.'
          );
        });
      return;
    }

    if (isGitHubConfigured(settings, false)) {
      void handleSyncFromGitHub(settings);
    }
  }, [settings, proxySettings, appendAttemptLog, handleSyncFromGitHub]);

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

  const executePublish = async () => {
    setPublishConfirmWarnings(null);
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
        effectiveMessage,
        proxySettings,
        appendAttemptLog
      );

      setCurrentSha(res.sha);
      saveLocalSha(res.sha);
      setBaselineConfig(config);
      setCommitMessage('');
      setSyncStatus('synced');

      const okMsg = `GitHub पर सफलतापूर्वक पब्लिश हो गया (${res.routeLabel} · ${res.latencyMs}ms · SHA: ${res.sha.slice(0, 7)})`;
      setStatusMessage(okMsg);
      showBanner('success', okMsg);
      logActivity(
        'GitHub Published',
        `v${config.latest_version_code} via ${res.routeLabel} (${res.sha.slice(0, 7)})`
      );

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

  const handlePublishToGitHub = async () => {
    if (!isGitHubConfigured(settings, true)) {
      navigateSection('sync');
      showBanner(
        'info',
        'GitHub पर पब्लिश करने के लिए Owner, Repo, Path और Personal Access Token (PAT) भरें।'
      );
      return;
    }

    const guardrail = validatePublishGuardrails(
      config,
      enterprise,
      commitMessage
    );
    if (!guardrail.ok) {
      showBanner('error', guardrail.errors[0]);
      return;
    }

    if (guardrail.warnings.length > 0 || enterprise.confirmBeforePublish) {
      setPublishConfirmWarnings(
        guardrail.warnings.length > 0
          ? guardrail.warnings
          : [
              `Ready to push config.json (v${config.latest_version_code}, ${config.shayari_list.length} shayaris) to ${settings.owner}/${settings.repo}.`,
            ]
      );
      return;
    }

    await executePublish();
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) {
      showBanner(
        'error',
        firebaseInitError || 'Firebase Auth उपलब्ध नहीं है।'
      );
      return;
    }
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
    if (!auth) return;
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

  const handleSaveProxySettings = () => {
    const cleaned = normalizeProxySettings(proxySettings);
    setProxySettings(cleaned);
    saveProxySettings(cleaned);
    showBanner('success', 'एडवांस प्रॉक्सी और रूटिंग सेटिंग्स LocalStorage में सेव हो गईं।');
  };

  const handleSaveCloudProxy = async () => {
    if (!user) return;
    setCloudBusy(true);
    try {
      const cleaned = normalizeProxySettings(proxySettings);
      setProxySettings(cleaned);
      saveProxySettings(cleaned);
      await saveCloudProxyProfile(user.uid, cleaned);
      showBanner('success', 'प्रॉक्सी प्रोफ़ाइल (बिना सीक्रेट वैल्यू के) Firestore क्लाउड में सेव हो गई।');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Cloud proxy save failed';
      showBanner('error', msg);
    } finally {
      setCloudBusy(false);
    }
  };

  const handleLoadCloudProxy = async () => {
    if (!user) return;
    setCloudBusy(true);
    try {
      const cloudProxy = await loadCloudProxyProfile(user.uid);
      if (!cloudProxy) {
        showBanner('info', 'Firestore में अभी कोई सेव किया हुआ प्रॉक्सी प्रोफ़ाइल नहीं मिला।');
      } else {
        const merged: ProxySettings = {
          ...cloudProxy,
          customHeaderValue: proxySettings.customHeaderValue,
        };
        setProxySettings(merged);
        saveProxySettings(merged);
        showBanner('success', 'Firestore क्लाउड से प्रॉक्सी प्रोफ़ाइल लोड हो गई।');
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Cloud proxy restore failed';
      showBanner('error', msg);
    } finally {
      setCloudBusy(false);
    }
  };

  const handleDiscardChanges = () => {
    setConfig(baselineConfig);
    logActivity('Draft Discarded', 'Reverted unsaved local edits');
    showBanner('info', 'असहेजे गए स्थानीय बदलाव हटा दिए गए हैं।');
  };

  const handleOpenEnterpriseSetting = (tab: EnterpriseTabId | null) => {
    navigateSettingsTab(tab);
  };

  const handleSaveEnterprise = (next: EnterpriseSettings) => {
    const clean = normalizeEnterpriseSettings(next);
    setEnterprise(clean);
    saveEnterpriseSettings(clean);
    logActivity('Enterprise Settings', `Updated workspace settings`);
  };

  const handleCreateSnapshot = (label: string) => {
    const entry: ConfigSnapshot = {
      id: `snap-${Date.now()}`,
      label,
      createdAt: new Date().toLocaleString(),
      versionCode: config.latest_version_code,
      shayariCount: config.shayari_list.length,
      config: JSON.parse(JSON.stringify(config)) as ShayariLokConfig,
    };
    const next = [entry, ...snapshots].slice(0, 12);
    setSnapshots(next);
    saveSnapshots(next);
    logActivity('Snapshot Created', label);
  };

  const handleRestoreSnapshot = (id: string) => {
    const found = snapshots.find((s) => s.id === id);
    if (!found) return;
    setConfig(found.config);
    logActivity('Snapshot Restored', found.label);
    showBanner('success', `Snapshot "${found.label}" restored to active draft.`);
  };

  const handleDeleteSnapshot = (id: string) => {
    const next = snapshots.filter((s) => s.id !== id);
    setSnapshots(next);
    saveSnapshots(next);
  };

  const handleWipePat = () => {
    const wiped: GitHubSettings = { ...settings, token: '' };
    setSettings(wiped);
    saveGitHubSettings(wiped);
    logActivity('Security Wipe', 'Cleared GitHub PAT from LocalStorage');
  };

  const handleResetToSeed = () => {
    setConfig({ ...DEFAULT_CONFIG });
    logActivity('Factory Reset', 'Restored default Shayari Lok seed config');
  };

  const handleUnlockWorkspace = async (pin: string) => {
    const ok = await verifyPinCode(pin, enterprise.pinHash);
    if (ok) {
      setIsLocked(false);
      logActivity('Workspace Unlocked', 'Verified admin PIN');
    }
    return ok;
  };

  const handleSyncLiveWebsiteNow = useCallback(async () => {
    if (!user) return;
    setLiveSyncing(true);
    try {
      await publishPublicWebsiteState(
        user.uid,
        config,
        websiteContent,
        enterprise.organizationName,
        enterprise.supportEmail
      );
      showBanner('success', 'लाइव वेबसाइट (Firestore Cloud Real-Time Mirror) अपडेट हो गई।');
      logActivity('Live Website Synced', `Updated publicSites/${user.uid}`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Live website cloud sync failed';
      showBanner('error', msg);
    } finally {
      setLiveSyncing(false);
    }
  }, [user, config, websiteContent, enterprise.organizationName, enterprise.supportEmail, showBanner, logActivity]);

  const standaloneWebsiteUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : '/';
    return buildStandaloneEntryUrl('website.html', origin, pathname, {
      siteId: user?.uid ?? null,
      repoOverride: githubReady
        ? {
            owner: settings.owner,
            repo: settings.repo,
            branch: settings.branch || 'main',
            path: settings.path || 'config.json',
          }
        : null,
    });
  }, [user, githubReady, settings]);

  const standalonePrivacyUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : '/';
    return buildStandaloneEntryUrl('privacy.html', origin, pathname, {
      siteId: user?.uid ?? null,
      repoOverride: githubReady
        ? {
            owner: settings.owner,
            repo: settings.repo,
            branch: settings.branch || 'main',
            path: settings.path || 'config.json',
          }
        : null,
    });
  }, [user, githubReady, settings]);

  if (isLocked) {
    return (
      <AdminLockScreen
        organizationName={enterprise.organizationName}
        adminDisplayName={enterprise.adminDisplayName}
        onUnlock={handleUnlockWorkspace}
      />
    );
  }

  // Full-Screen Live Public Website Suite (#/site, #/site/shayari, #/site/suvichar, #/site/updates, #/site/privacy)
  if (routeState.view === 'site') {
    return (
      <PublicWebsiteView
        page={routeState.page}
        onNavigatePage={navigatePublicSite}
        onBackToAdmin={() => navigateSection('dashboard')}
        config={config}
        websiteContent={websiteContent}
        organizationName={enterprise.organizationName}
        supportEmail={enterprise.supportEmail}
        publicSyncState={publicSyncState}
        publicSyncMessage={publicSyncMessage}
        standalonePrivacyHref={standalonePrivacyUrl}
        standaloneWebsiteHref={standaloneWebsiteUrl}
      />
    );
  }

  // Full-Screen Enterprise Settings Hub & Individual 10 Setting Pages (#/settings, #/settings/<tab>)
  if (routeState.view === 'settings') {
    return (
      <FullScreenSettingsPage
        activeTab={routeState.tab}
        onSelectTab={navigateSettingsTab}
        onBackToAdmin={() => navigateSection('dashboard')}
        onOpenLiveSite={() => navigatePublicSite('home')}
        enterprise={enterprise}
        onSaveEnterprise={handleSaveEnterprise}
        config={config}
        baselineConfig={baselineConfig}
        onUpdateConfig={setConfig}
        githubSettings={settings}
        currentSha={currentSha}
        commitMessage={commitMessage}
        proxySettings={proxySettings}
        snapshots={snapshots}
        onCreateSnapshot={handleCreateSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        auditLog={auditLog}
        onClearAuditLog={() => {
          setAuditLog([]);
          saveAuditLog([]);
        }}
        onLogAction={logActivity}
        onLockNow={() => setIsLocked(true)}
        onWipePat={handleWipePat}
        onResetToSeed={handleResetToSeed}
        user={user}
      />
    );
  }

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
        organizationName={enterprise.organizationName}
        environment={enterprise.environment}
        hasPin={Boolean(enterprise.pinHash)}
        onOpenEnterpriseSetting={handleOpenEnterpriseSetting}
        onLockNow={() => setIsLocked(true)}
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
          environment={enterprise.environment}
          hasPin={Boolean(enterprise.pinHash)}
          onOpenEnterpriseSetting={handleOpenEnterpriseSetting}
          onOpenLiveSite={() => navigatePublicSite('home')}
          onLockNow={() => setIsLocked(true)}
        />

        <main
          className={`flex-1 max-w-6xl w-full mx-auto space-y-5 ${
            enterprise.density === 'compact'
              ? 'p-3 sm:p-4 lg:p-5'
              : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
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
                <span className="truncate sm:whitespace-normal">
                  {banner.text}
                </span>
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
              websiteContent={websiteContent}
              onUpdateWebsiteContent={setWebsiteContent}
              standaloneWebsiteUrl={standaloneWebsiteUrl}
              user={user}
              liveSyncing={liveSyncing}
              onSyncLiveWebsiteNow={handleSyncLiveWebsiteNow}
            />
          )}

          {activeSection === 'monetization' && (
            <MonetizationSection
              config={config}
              onUpdate={handleUpdateConfig}
              hostedPrivacyUrl={standalonePrivacyUrl}
              hostedWebsiteUrl={standaloneWebsiteUrl}
            />
          )}

          {activeSection === 'website' && (
            <WebsiteHubSection
              config={config}
              websiteContent={websiteContent}
              githubSettings={settings}
              user={user}
              liveSyncing={liveSyncing}
              onSyncLiveWebsiteNow={handleSyncLiveWebsiteNow}
              onOpenPublicPage={navigatePublicSite}
            />
          )}

          {activeSection === 'proxy' && (
            <ProxySection
              proxySettings={proxySettings}
              onChangeProxySettings={setProxySettings}
              onSaveProxySettings={handleSaveProxySettings}
              githubSettings={settings}
              attemptLogs={attemptLogs}
              onClearAttemptLogs={() => setAttemptLogs([])}
              user={user}
              cloudBusy={cloudBusy}
              onSaveCloudProxy={() => void handleSaveCloudProxy()}
              onLoadCloudProxy={() => void handleLoadCloudProxy()}
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
              proxySettings={proxySettings}
              onOpenProxySettings={() => navigateSection('proxy')}
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

      {publishConfirmWarnings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-guardrail-confirm-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2
              id="publish-guardrail-confirm-title"
              className="font-display text-base font-bold text-slate-900"
            >
              Confirm GitHub Publish
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
              {publishConfirmWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPublishConfirmWarnings(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executePublish()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Proceed & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
