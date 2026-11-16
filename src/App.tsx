import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AdminAuthGate } from './components/AdminAuthGate';
import { AdminLockScreen } from './components/AdminLockScreen';
import { CopyToastBanner } from './components/CopyToastBanner';
import { DashboardSection } from './components/DashboardSection';
import { GitHubSyncSection } from './components/GitHubSyncSection';
import { JsonPreviewModal } from './components/JsonPreviewModal';
import { MonetizationSection } from './components/MonetizationSection';
import { NotificationsSection } from './components/NotificationsSection';
import { ProxySection } from './components/ProxySection';
import { ShayariManagerSection } from './components/ShayariManagerSection';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { auth, firebaseInitError, googleProvider } from './firebase';
import {
  checkIsCloudAllowlistedAdmin,
  ensureUserProfile,
  loadAppControlMainOnce,
  loadCloudDraft,
  loadCloudProxyProfile,
  loadPublicWebsiteStateOnce,
  publishAppControlMainState,
  publishPublicWebsiteState,
  recordPublishLog,
  saveCloudDraft,
  saveCloudProxyProfile,
  saveCloudRepoSettings,
  subscribeAppControlMain,
  subscribePublicWebsiteState,
  subscribeUserWorkspace,
} from './services/firestoreSync';
import { subscribeSocialMonitorData } from './services/socialFirestore';
import type {
  AdminSection,
  AppControlStudioConfig,
  AppLocalizationExtras,
  AppUserProfile,
  ChatRoomItem,
  GitHubSettings,
  ProxyAttemptLog,
  ProxySettings,
  PublishLogEntry,
  ShayariLokConfig,
  SocialEdgeItem,
  SyncStatus,
  WebsiteContentSettings,
} from './types/config';
import {
  hasSandboxQueryFlag,
  isAuthorizedAdminEmail,
  isLocalPreviewHost,
} from './utils/adminAuth';
import {
  loadAppControlConfig,
  normalizeAppControlConfig,
  prepareAppConfigMainForFirestore,
  saveAppControlConfig,
} from './utils/appControlStudio';
import {
  clearConfigTombstonesForApp,
  recordDeletedConfigItems,
  recordDeletedScheduledNotifications,
  recordDeletedWebsiteContentItems,
  unmarkReaddedConfigItems,
} from './utils/cacheTombstones';
import {
  DEFAULT_CONFIG,
  hasUnsavedChanges,
} from './utils/configHelpers';
import {
  fetchGitHubConfig,
  isGitHubConfigured,
  loadGitHubSettings,
  loadSavedSha,
  publishGitHubConfig,
  saveGitHubSettings,
  saveLocalSha,
} from './utils/githubApi';
import {
  loadAppExtras,
  normalizeAppExtras,
  saveAppExtras,
} from './utils/localizationAndExtras';
import {
  createManagedAppProfile,
  hasAppDraftStored,
  loadActiveAppId,
  loadAppDraft,
  loadManagedApps,
  resolveFirestoreSiteId,
  saveActiveAppId,
  saveAppDraft,
  saveManagedApps,
  type ManagedAppProfile,
} from './utils/multiAppRegistry';
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
  loadSandboxSocialState,
  SANDBOX_SOCIAL_CHANGED_EVENT,
  type SandboxSocialState,
} from './utils/socialMonitor';
import {
  broadcastLiveWebsiteState,
  loadWebsiteContent,
  preparePublicSiteForFirestore,
  saveWebsiteContent,
} from './utils/websiteContent';

const FullScreenSettingsPage = lazy(() =>
  import('./components/FullScreenSettingsPage').then((m) => ({
    default: m.FullScreenSettingsPage,
  }))
);
const PublicWebsiteView = lazy(() =>
  import('./components/PublicWebsiteView').then((m) => ({
    default: m.PublicWebsiteView,
  }))
);
const AndroidApiSection = lazy(() =>
  import('./components/AndroidApiSection').then((m) => ({
    default: m.AndroidApiSection,
  }))
);
const SocialMonitorSection = lazy(() =>
  import('./components/SocialMonitorSection').then((m) => ({
    default: m.SocialMonitorSection,
  }))
);
const WebsiteHubSection = lazy(() =>
  import('./components/WebsiteHubSection').then((m) => ({
    default: m.WebsiteHubSection,
  }))
);
const LocalizationStudioSection = lazy(() =>
  import('./components/LocalizationStudioSection').then((m) => ({
    default: m.LocalizationStudioSection,
  }))
);
const AppControlStudioSection = lazy(() =>
  import('./components/AppControlStudioSection').then((m) => ({
    default: m.AppControlStudioSection,
  }))
);

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

  const [managedApps, setManagedApps] = useState<ManagedAppProfile[]>(() =>
    loadManagedApps()
  );
  const [activeAppId, setActiveAppId] = useState<string>(() =>
    loadActiveAppId(loadManagedApps())
  );

  const activeApp = useMemo(
    () => managedApps.find((app) => app.id === activeAppId) ?? managedApps[0],
    [managedApps, activeAppId]
  );

  const [settings, setSettings] = useState<GitHubSettings>(() => {
    const loaded = loadGitHubSettings();
    const initialApps = loadManagedApps();
    const initialApp =
      initialApps.find((a) => a.id === loadActiveAppId(initialApps)) ??
      initialApps[0];
    return {
      ...loaded,
      path: loaded.path || initialApp.githubPath,
    };
  });
  const [proxySettings, setProxySettings] = useState<ProxySettings>(() =>
    loadProxySettings()
  );
  const [attemptLogs, setAttemptLogs] = useState<ProxyAttemptLog[]>([]);
  const [currentSha, setCurrentSha] = useState<string>(() => loadSavedSha());
  const [commitMessage, setCommitMessage] = useState<string>('');

  const [baselineConfig, setBaselineConfig] = useState<ShayariLokConfig>(() =>
    loadAppDraft(activeApp)
  );
  const [config, setConfig] = useState<ShayariLokConfig>(() =>
    loadAppDraft(activeApp)
  );

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudAllowlistedAdmin, setCloudAllowlistedAdmin] = useState(false);
  const [authError, setAuthError] = useState<unknown>(null);
  const [localSandboxUnlocked, setLocalSandboxUnlocked] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    hasSandboxQueryFlag(window.location.search, window.location.hash)
  );
  const [cloudBusy, setCloudBusy] = useState(false);
  const [publishLogs, setPublishLogs] = useState<PublishLogEntry[]>([]);

  const [enterprise, setEnterprise] = useState<EnterpriseSettings>(() =>
    loadEnterpriseSettings()
  );
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentSettings>(() =>
    loadWebsiteContent()
  );
  const [appExtras, setAppExtras] = useState<AppLocalizationExtras>(() =>
    loadAppExtras(activeApp.id)
  );
  const [appControl, setAppControl] = useState<AppControlStudioConfig>(() =>
    loadAppControlConfig(activeApp.id)
  );
  const [liveSyncing, setLiveSyncing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<
    'live' | 'syncing' | 'local'
  >('local');
  const [lastSyncLatencyMs, setLastSyncLatencyMs] = useState<number | null>(
    null
  );
  const [cloudAppUsers, setCloudAppUsers] = useState<AppUserProfile[]>([]);
  const [cloudSocialEdges, setCloudSocialEdges] = useState<SocialEdgeItem[]>([]);
  const [cloudChatRooms, setCloudChatRooms] = useState<ChatRoomItem[]>([]);

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

  const [hydratedSiteId, setHydratedSiteId] = useState<string>('');
  const [sandboxSocial, setSandboxSocial] = useState<SandboxSocialState>(() =>
    loadSandboxSocialState()
  );

  const initialAutoSyncedRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;
  const appExtrasRef = useRef(appExtras);
  appExtrasRef.current = appExtras;
  const appControlRef = useRef(appControl);
  appControlRef.current = appControl;
  const websiteContentRef = useRef(websiteContent);
  websiteContentRef.current = websiteContent;
  const hydratedSiteIdRef = useRef(hydratedSiteId);
  hydratedSiteIdRef.current = hydratedSiteId;
  const lastSyncedSignatureRef = useRef<string>('');
  const lastSyncedAppConfigSigRef = useRef<string>('');

  const canEnterLocalSandbox = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      isLocalPreviewHost(window.location.hostname) ||
      hasSandboxQueryFlag(window.location.search, window.location.hash)
    );
  }, []);

  const isAuthorizedAdmin = useMemo(() => {
    if (!user) return false;
    return (
      isAuthorizedAdminEmail(user.email, user.emailVerified) ||
      cloudAllowlistedAdmin
    );
  }, [user, cloudAllowlistedAdmin]);

  const canEnterAdmin =
    isAuthorizedAdmin || (localSandboxUnlocked && canEnterLocalSandbox);

  const activeSiteId = useMemo(() => {
    if (!user || !isAuthorizedAdmin) return '';
    return resolveFirestoreSiteId(user.uid, activeApp.id);
  }, [user, isAuthorizedAdmin, activeApp.id]);

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

  // Keep dashboard/analytics sandbox counts synchronized with persistent sandbox storage
  useEffect(() => {
    const syncSandbox = () => {
      setSandboxSocial(loadSandboxSocialState());
    };
    window.addEventListener(SANDBOX_SOCIAL_CHANGED_EVENT, syncSandbox);
    window.addEventListener('storage', syncSandbox);
    return () => {
      window.removeEventListener(SANDBOX_SOCIAL_CHANGED_EVENT, syncSandbox);
      window.removeEventListener('storage', syncSandbox);
    };
  }, []);

  // Persist per-app local draft & broadcast live updates in real time
  useEffect(() => {
    if (enterprise.autoSaveDraft) {
      saveAppDraft(activeApp.id, config);
    }
    saveAppExtras(activeApp.id, appExtras);
    saveWebsiteContent(websiteContent);
    broadcastLiveWebsiteState(config, websiteContent, enterprise);
  }, [activeApp.id, config, appExtras, websiteContent, enterprise]);

  // Fast 120ms debounced Firestore real-time mirror AFTER authoritative cloud hydration completes
  useEffect(() => {
    if (!user || !isAuthorizedAdmin || !activeSiteId) {
      setRealtimeStatus('local');
      setLastSyncLatencyMs(null);
      return;
    }
    if (hydratedSiteId !== activeSiteId) {
      setRealtimeStatus('syncing');
      return;
    }
    const payloadSignature = JSON.stringify(
      preparePublicSiteForFirestore(
        config,
        websiteContent,
        enterprise.organizationName,
        enterprise.supportEmail,
        appExtras
      )
    );
    if (payloadSignature === lastSyncedSignatureRef.current) {
      setRealtimeStatus('live');
      return;
    }
    setRealtimeStatus('syncing');
    const timer = window.setTimeout(() => {
      const startedAt =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      publishPublicWebsiteState(
        user.uid,
        config,
        websiteContent,
        enterprise.organizationName,
        enterprise.supportEmail,
        activeSiteId,
        appExtras
      )
        .then(() => {
          lastSyncedSignatureRef.current = payloadSignature;
          const elapsed =
            typeof performance !== 'undefined'
              ? Math.round(performance.now() - startedAt)
              : Math.round(Date.now() - startedAt);
          setLastSyncLatencyMs(Math.max(12, elapsed));
          setRealtimeStatus('live');
        })
        .catch((err) => {
          setRealtimeStatus('local');
          const msg =
            err instanceof Error
              ? err.message
              : 'Live Firestore sync failed for publicSites';
          showBanner('error', msg);
        });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    user,
    isAuthorizedAdmin,
    activeSiteId,
    hydratedSiteId,
    config,
    appExtras,
    websiteContent,
    enterprise.organizationName,
    enterprise.supportEmail,
    showBanner,
  ]);

  // Fast 180ms debounced Firestore mirror for publicSites/appConfig/main/config + banners + faqs
  useEffect(() => {
    if (!user || !isAuthorizedAdmin || !activeSiteId) return;
    if (hydratedSiteId !== activeSiteId) return;

    const appConfigPayload = prepareAppConfigMainForFirestore(
      user.uid,
      config,
      appExtras,
      appControl
    );
    const appConfigSig = JSON.stringify(appConfigPayload);
    if (appConfigSig === lastSyncedAppConfigSigRef.current) return;

    setRealtimeStatus('syncing');
    const timer = window.setTimeout(() => {
      const startedAt =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      publishAppControlMainState(
        user.uid,
        config,
        appExtras,
        appControl,
        activeSiteId
      )
        .then(() => {
          lastSyncedAppConfigSigRef.current = appConfigSig;
          const elapsed =
            typeof performance !== 'undefined'
              ? Math.round(performance.now() - startedAt)
              : Math.round(Date.now() - startedAt);
          setLastSyncLatencyMs(Math.max(12, elapsed));
          setRealtimeStatus('live');
        })
        .catch((err) => {
          setRealtimeStatus('local');
          const msg =
            err instanceof Error
              ? err.message
              : 'Live Firestore sync failed for publicSites/appConfig/main';
          showBanner('error', msg);
        });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [
    user,
    isAuthorizedAdmin,
    activeSiteId,
    hydratedSiteId,
    config,
    appExtras,
    appControl,
    showBanner,
  ]);

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

  // Firebase Auth, Admin Allowlist & Firestore Workspace Listeners
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    let unsubWorkspace: (() => void) | null = null;
    let unsubSocial: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubWorkspace) {
        unsubWorkspace();
        unsubWorkspace = null;
      }
      if (unsubSocial) {
        unsubSocial();
        unsubSocial = null;
      }

      setUser(currentUser);

      if (!currentUser) {
        setCloudAllowlistedAdmin(false);
        setPublishLogs([]);
        setCloudAppUsers([]);
        setCloudSocialEdges([]);
        setCloudChatRooms([]);
        setAuthLoading(false);
        return;
      }

      try {
        try {
          await currentUser.reload();
        } catch {
          // Ignore transient offline reload failure
        }
        try {
          await currentUser.getIdToken(true);
        } catch {
          // Ignore transient offline token refresh failure
        }

        let allowlisted = false;
        if (!isAuthorizedAdminEmail(currentUser.email, currentUser.emailVerified)) {
          allowlisted = await checkIsCloudAllowlistedAdmin(currentUser.uid);
        }
        setCloudAllowlistedAdmin(allowlisted);

        const authorized =
          isAuthorizedAdminEmail(currentUser.email, currentUser.emailVerified) ||
          allowlisted;

        if (!authorized) {
          setAuthLoading(false);
          return;
        }

        setAuthError(null);
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

        unsubSocial = subscribeSocialMonitorData({
          onUsers: (users) => setCloudAppUsers(users),
          onEdges: (edges) => setCloudSocialEdges(edges),
          onRooms: (rooms) => setCloudChatRooms(rooms),
          onError: (err) => {
            console.error(err);
          },
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Firebase profile sync failed';
        showBanner('error', msg);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubWorkspace) unsubWorkspace();
      if (unsubSocial) unsubSocial();
    };
  }, [showBanner]);

  // Cloud-first authoritative hydration + real-time listeners on active publicSites/{siteId} & publicSites/appConfig/main/config
  // Ensures deletions performed in Firestore or Admin Panel are never overwritten by stale local defaults.
  useEffect(() => {
    if (!user || !isAuthorizedAdmin || !activeSiteId) {
      setHydratedSiteId('');
      lastSyncedSignatureRef.current = '';
      lastSyncedAppConfigSigRef.current = '';
      return;
    }

    let cancelled = false;
    setHydratedSiteId('');
    lastSyncedSignatureRef.current = '';
    lastSyncedAppConfigSigRef.current = '';

    const applyRemoteSnapshot = (
      remoteSnap: Awaited<ReturnType<typeof loadPublicWebsiteStateOnce>>
    ) => {
      if (!remoteSnap) return;
      const mergedWeb: WebsiteContentSettings = {
        ...remoteSnap.websiteContent,
        socialLinks: websiteContentRef.current.socialLinks,
      };
      const resolvedExtras = remoteSnap.extras ?? appExtrasRef.current;
      const sig = JSON.stringify(
        preparePublicSiteForFirestore(
          remoteSnap.config,
          mergedWeb,
          remoteSnap.organizationName,
          remoteSnap.supportEmail,
          resolvedExtras
        )
      );
      lastSyncedSignatureRef.current = sig;
      saveAppDraft(activeApp.id, remoteSnap.config);
      saveWebsiteContent(mergedWeb);
      if (remoteSnap.extras) {
        saveAppExtras(activeApp.id, remoteSnap.extras);
        setAppExtras(remoteSnap.extras);
      }
      setConfig(remoteSnap.config);
      setBaselineConfig(remoteSnap.config);
      setWebsiteContent(mergedWeb);
    };

    const applyRemoteAppControl = (
      remoteMain: Awaited<ReturnType<typeof loadAppControlMainOnce>>,
      baseConfig: ShayariLokConfig,
      baseExtras: AppLocalizationExtras
    ) => {
      if (!remoteMain) return;
      const cleanControl = normalizeAppControlConfig(remoteMain.control);
      const nextCfg: ShayariLokConfig = {
        ...baseConfig,
        ...(remoteMain.app_name !== undefined
          ? { app_name: remoteMain.app_name }
          : {}),
        ...(remoteMain.ads_enabled !== undefined
          ? { ads_enabled: remoteMain.ads_enabled }
          : {}),
        ...(remoteMain.banner_ad_id !== undefined
          ? { banner_ad_id: remoteMain.banner_ad_id }
          : {}),
        ...(remoteMain.interstitial_ad_id !== undefined
          ? { interstitial_ad_id: remoteMain.interstitial_ad_id }
          : {}),
        ...(remoteMain.privacy_policy_url !== undefined
          ? { privacy_policy_url: remoteMain.privacy_policy_url }
          : {}),
      };
      const nextExtras: AppLocalizationExtras = remoteMain.dynamic_theme
        ? normalizeAppExtras({
            ...baseExtras,
            dynamic_theme: remoteMain.dynamic_theme,
          })
        : baseExtras;
      lastSyncedAppConfigSigRef.current = JSON.stringify(
        prepareAppConfigMainForFirestore(
          user.uid,
          nextCfg,
          nextExtras,
          cleanControl
        )
      );
      saveAppControlConfig(activeApp.id, null, cleanControl);
      setAppControl(cleanControl);
      if (remoteMain.dynamic_theme) {
        saveAppExtras(activeApp.id, nextExtras);
        setAppExtras(nextExtras);
      }
      if (
        remoteMain.app_name !== undefined ||
        remoteMain.ads_enabled !== undefined ||
        remoteMain.banner_ad_id !== undefined ||
        remoteMain.interstitial_ad_id !== undefined ||
        remoteMain.privacy_policy_url !== undefined
      ) {
        saveAppDraft(activeApp.id, nextCfg);
        setConfig(nextCfg);
      }
    };

    let unsubSite: (() => void) | null = null;
    let unsubAppMain: (() => void) | null = null;

    Promise.all([
      loadPublicWebsiteStateOnce(activeSiteId),
      loadAppControlMainOnce(activeSiteId).catch(() => null),
    ])
      .then(([remoteSnap, remoteMain]) => {
        if (cancelled) return;
        let currentCfg = configRef.current;
        let currentExtras = appExtrasRef.current;
        if (remoteSnap) {
          applyRemoteSnapshot(remoteSnap);
          currentCfg = remoteSnap.config;
          currentExtras = remoteSnap.extras ?? currentExtras;
        } else if (!hasAppDraftStored(activeApp.id)) {
          saveAppDraft(activeApp.id, currentCfg);
        }

        if (remoteMain) {
          applyRemoteAppControl(remoteMain, currentCfg, currentExtras);
        }

        setHydratedSiteId(activeSiteId);
        setRealtimeStatus('live');

        unsubSite = subscribePublicWebsiteState(
          activeSiteId,
          (snap, meta) => {
            if (cancelled) return;
            setRealtimeStatus('live');
            if (meta.hasPendingWrites) return;
            const mergedWeb: WebsiteContentSettings = {
              ...snap.websiteContent,
              socialLinks: websiteContentRef.current.socialLinks,
            };
            const resolvedExtras = snap.extras ?? appExtrasRef.current;
            const incomingSig = JSON.stringify(
              preparePublicSiteForFirestore(
                snap.config,
                mergedWeb,
                snap.organizationName,
                snap.supportEmail,
                resolvedExtras
              )
            );
            if (incomingSig !== lastSyncedSignatureRef.current) {
              applyRemoteSnapshot(snap);
            }
          },
          () => {
            if (!cancelled) setRealtimeStatus('local');
          }
        );

        unsubAppMain = subscribeAppControlMain(
          (snap, meta) => {
            if (cancelled) return;
            setRealtimeStatus('live');
            if (meta.hasPendingWrites) return;
            const cleanControl = normalizeAppControlConfig(snap.control);
            const incomingMainSig = JSON.stringify(
              prepareAppConfigMainForFirestore(
                user.uid,
                configRef.current,
                appExtrasRef.current,
                cleanControl
              )
            );
            if (incomingMainSig !== lastSyncedAppConfigSigRef.current) {
              applyRemoteAppControl(
                snap,
                configRef.current,
                appExtrasRef.current
              );
            }
          },
          () => {
            if (!cancelled) setRealtimeStatus('local');
          }
        );
      })
      .catch(() => {
        if (cancelled) return;
        setHydratedSiteId(activeSiteId);
        setRealtimeStatus('local');
      });

    return () => {
      cancelled = true;
      if (unsubSite) unsubSite();
      if (unsubAppMain) unsubAppMain();
    };
  }, [user, isAuthorizedAdmin, activeSiteId, activeApp.id]);

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
        saveAppDraft(activeApp.id, result.config);
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

  const pushImmediateCloudSync = useCallback(
    async (
      nextConfig: ShayariLokConfig,
      overrideExtras?: AppLocalizationExtras,
      overrideControl?: AppControlStudioConfig
    ) => {
      if (!user || !isAuthorizedAdmin || !activeSiteId) return;
      setRealtimeStatus('syncing');
      const startedAt =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const effectiveExtras = overrideExtras ?? appExtrasRef.current;
      const effectiveControl = overrideControl ?? appControlRef.current;
      try {
        await Promise.all([
          publishPublicWebsiteState(
            user.uid,
            nextConfig,
            websiteContent,
            enterprise.organizationName,
            enterprise.supportEmail,
            activeSiteId,
            effectiveExtras
          ),
          publishAppControlMainState(
            user.uid,
            nextConfig,
            effectiveExtras,
            effectiveControl,
            activeSiteId
          ),
        ]);
        lastSyncedSignatureRef.current = JSON.stringify(
          preparePublicSiteForFirestore(
            nextConfig,
            websiteContent,
            enterprise.organizationName,
            enterprise.supportEmail,
            effectiveExtras
          )
        );
        lastSyncedAppConfigSigRef.current = JSON.stringify(
          prepareAppConfigMainForFirestore(
            user.uid,
            nextConfig,
            effectiveExtras,
            effectiveControl
          )
        );
        const elapsed =
          typeof performance !== 'undefined'
            ? Math.round(performance.now() - startedAt)
            : Math.round(Date.now() - startedAt);
        setLastSyncLatencyMs(Math.max(12, elapsed));
        setRealtimeStatus('live');
      } catch {
        setRealtimeStatus('local');
      }
    },
    [
      user,
      isAuthorizedAdmin,
      activeSiteId,
      websiteContent,
      enterprise.organizationName,
      enterprise.supportEmail,
    ]
  );

  const handleUpdateConfig = useCallback(
    (patch: Partial<ShayariLokConfig>, instantSync?: boolean) => {
      const prev = configRef.current;
      const next = { ...prev, ...patch };
      recordDeletedConfigItems(activeApp.id, prev, next);
      unmarkReaddedConfigItems(activeApp.id, next);
      saveAppDraft(activeApp.id, next);
      setConfig(next);
      if (instantSync) {
        void pushImmediateCloudSync(next);
      }
    },
    [activeApp.id, pushImmediateCloudSync]
  );

  const handleUpdateWebsiteContent = useCallback(
    (next: WebsiteContentSettings) => {
      recordDeletedWebsiteContentItems(websiteContentRef.current, next);
      saveWebsiteContent(next);
      setWebsiteContent(next);
    },
    []
  );

  const handleUpdateExtras = useCallback(
    (next: AppLocalizationExtras, instantSync?: boolean) => {
      const safe = normalizeAppExtras(next);
      recordDeletedScheduledNotifications(
        appExtrasRef.current.scheduled_notifications,
        safe.scheduled_notifications
      );
      setAppExtras(safe);
      saveAppExtras(activeApp.id, safe);
      if (instantSync) {
        void pushImmediateCloudSync(configRef.current, safe);
      }
    },
    [activeApp.id, pushImmediateCloudSync]
  );

  const handleUpdateAppControl = useCallback(
    (next: AppControlStudioConfig, instantSync?: boolean) => {
      const saved = saveAppControlConfig(
        activeApp.id,
        appControlRef.current,
        next
      );
      setAppControl(saved);
      if (instantSync) {
        void pushImmediateCloudSync(
          configRef.current,
          appExtrasRef.current,
          saved
        );
      }
    },
    [activeApp.id, pushImmediateCloudSync]
  );

  const handleSelectApp = useCallback(
    (nextAppId: string) => {
      if (nextAppId === activeAppId) return;
      const target = managedApps.find((a) => a.id === nextAppId);
      if (!target) return;

      saveAppDraft(activeAppId, configRef.current);
      saveAppExtras(activeAppId, appExtrasRef.current);
      saveAppControlConfig(
        activeAppId,
        appControlRef.current,
        appControlRef.current
      );
      setActiveAppId(nextAppId);
      saveActiveAppId(nextAppId);

      const nextDraft = loadAppDraft(target);
      setConfig(nextDraft);
      setBaselineConfig(nextDraft);
      setAppExtras(loadAppExtras(target.id));
      setAppControl(loadAppControlConfig(target.id));
      setSettings((prev) => {
        const updated: GitHubSettings = {
          ...prev,
          path: target.githubPath || 'config.json',
        };
        saveGitHubSettings(updated);
        return updated;
      });
      logActivity('App Switched', `${target.name} (${target.packageId})`);
      showBanner('info', `Switched control panel to ${target.name} (${target.packageId}).`);
    },
    [activeAppId, managedApps, logActivity, showBanner]
  );

  const handleCreateApp = useCallback(
    (input: { name: string; packageId: string; githubPath: string }) => {
      saveAppDraft(activeAppId, configRef.current);
      saveAppExtras(activeAppId, appExtrasRef.current);
      saveAppControlConfig(
        activeAppId,
        appControlRef.current,
        appControlRef.current
      );
      const created = createManagedAppProfile(input, managedApps);
      const nextApps = [...managedApps, created];
      setManagedApps(nextApps);
      saveManagedApps(nextApps);
      setActiveAppId(created.id);
      saveActiveAppId(created.id);

      const initialDraft = loadAppDraft(created);
      saveAppDraft(created.id, initialDraft);
      setConfig(initialDraft);
      setBaselineConfig(initialDraft);
      const initialExtras = loadAppExtras(created.id);
      saveAppExtras(created.id, initialExtras);
      setAppExtras(initialExtras);
      const initialControl = loadAppControlConfig(created.id);
      saveAppControlConfig(created.id, null, initialControl);
      setAppControl(initialControl);
      setSettings((prev) => {
        const updated: GitHubSettings = {
          ...prev,
          path: created.githubPath,
        };
        saveGitHubSettings(updated);
        return updated;
      });
      logActivity('App Added', `${created.name} (${created.packageId})`);
      showBanner(
        'success',
        `नया ऐप "${created.name}" (${created.packageId}) मल्टी-ऐप कंट्रोल में जुड़ गया!`
      );
    },
    [activeAppId, managedApps, logActivity, showBanner]
  );

  const handleDeleteApp = useCallback(
    (appId: string) => {
      if (appId === 'default') return;
      const target = managedApps.find((a) => a.id === appId);
      const nextApps = managedApps.filter((a) => a.id !== appId);
      setManagedApps(nextApps);
      saveManagedApps(nextApps);
      if (activeAppId === appId) {
        const fallback = nextApps[0];
        setActiveAppId(fallback.id);
        saveActiveAppId(fallback.id);
        const fallbackDraft = loadAppDraft(fallback);
        setConfig(fallbackDraft);
        setBaselineConfig(fallbackDraft);
        setAppExtras(loadAppExtras(fallback.id));
        setAppControl(loadAppControlConfig(fallback.id));
        setSettings((prev) => {
          const updated: GitHubSettings = {
            ...prev,
            path: fallback.githubPath,
          };
          saveGitHubSettings(updated);
          return updated;
        });
      }
      if (target) {
        logActivity('App Removed', `${target.name} (${target.packageId})`);
        showBanner('info', `Removed ${target.name} from Multi-App switcher.`);
      }
    },
    [activeAppId, managedApps, logActivity, showBanner]
  );

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

  const executePublish = async (overrideConfig?: ShayariLokConfig) => {
    const targetConfig = overrideConfig ?? config;
    setPublishConfirmWarnings(null);
    setSyncStatus('publishing');
    setStatusMessage('GitHub रिपॉज़िटरी में config.json कमिट हो रहा है...');

    try {
      const effectiveMessage =
        commitMessage.trim() ||
        `Update config.json via Shayari Lok Admin (v${targetConfig.latest_version_code})`;

      const res = await publishGitHubConfig(
        settings,
        targetConfig,
        currentSha,
        effectiveMessage,
        proxySettings,
        appendAttemptLog
      );

      setCurrentSha(res.sha);
      saveLocalSha(res.sha);
      setConfig(targetConfig);
      setBaselineConfig(targetConfig);
      setCommitMessage('');
      setSyncStatus('synced');

      const okMsg = `GitHub पर सफलतापूर्वक पब्लिश हो गया (${res.routeLabel} · ${res.latencyMs}ms · SHA: ${res.sha.slice(0, 7)})`;
      setStatusMessage(okMsg);
      showBanner('success', okMsg);
      logActivity(
        'GitHub Published',
        `v${targetConfig.latest_version_code} via ${res.routeLabel} (${res.sha.slice(0, 7)})`
      );

      if (user && isAuthorizedAdmin) {
        await Promise.all([
          saveCloudRepoSettings(user.uid, settings, res.sha),
          saveCloudDraft(
            user.uid,
            targetConfig,
            activeApp.id === 'default' ? 'default' : activeApp.id
          ),
          recordPublishLog(user.uid, {
            commitSha: res.commitSha,
            branch: settings.branch.trim() || 'main',
            filePath: settings.path.trim() || 'config.json',
            versionCode: targetConfig.latest_version_code,
            shayariCount: targetConfig.shayari_list.length,
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
              `Ready to push ${settings.path || 'config.json'} (v${config.latest_version_code}, ${config.shayari_list.length} shayaris) to ${settings.owner}/${settings.repo}.`,
            ]
      );
      return;
    }

    await executePublish();
  };

  const handlePublishConfigNow = async (nextConfig: ShayariLokConfig) => {
    if (!isGitHubConfigured(settings, true)) {
      navigateSection('sync');
      showBanner(
        'info',
        'शायरी सेव हो गई है! GitHub config.json पर पब्लिश करने के लिए पहले Owner, Repo, Path और PAT सेव करें।'
      );
      return;
    }

    const guardrail = validatePublishGuardrails(
      nextConfig,
      enterprise,
      commitMessage
    );
    if (!guardrail.ok) {
      showBanner('error', guardrail.errors[0]);
      return;
    }

    await executePublish(nextConfig);
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) {
      const errObj = new Error(firebaseInitError || 'Firebase Auth उपलब्ध नहीं है।');
      setAuthError(errObj);
      showBanner('error', errObj.message);
      return;
    }
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      showBanner('success', 'Google अकाउंट से साइन-इन सफल रहा।');
    } catch (error) {
      setAuthError(error);
      const msg =
        error instanceof Error ? error.message : 'Google Sign-In विफल रहा।';
      showBanner('error', msg);
    }
  };

  const handleGoogleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setCloudAllowlistedAdmin(false);
      setAuthError(null);
      showBanner('info', 'आप सफलतापूर्वक साइन-आउट हो गए हैं।');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Sign-Out विफल रहा।';
      showBanner('error', msg);
    }
  };

  const handleSaveCloudDraft = async () => {
    if (!user || !isAuthorizedAdmin) return;
    setCloudBusy(true);
    try {
      await saveCloudDraft(
        user.uid,
        config,
        activeApp.id === 'default' ? 'default' : activeApp.id
      );
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
    if (!user || !isAuthorizedAdmin) return;
    setCloudBusy(true);
    try {
      const cloudConfig = await loadCloudDraft(
        user.uid,
        activeApp.id === 'default' ? 'default' : activeApp.id
      );
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
    clearConfigTombstonesForApp(activeApp.id);
    const seeded = { ...DEFAULT_CONFIG };
    saveAppDraft(activeApp.id, seeded);
    setConfig(seeded);
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
    saveAppDraft(activeApp.id, configRef.current);
    saveAppExtras(activeApp.id, appExtrasRef.current);
    saveAppControlConfig(
      activeApp.id,
      appControlRef.current,
      appControlRef.current
    );
    if (!user || !isAuthorizedAdmin || !activeSiteId) {
      showBanner(
        'info',
        'बदलाव लोकल ड्राफ्ट में सेव हो गए हैं। लाइव Firestore क्लाउड सिंक (publicSites/appConfig/main) के लिए Google Admin से साइन-इन करें।'
      );
      return;
    }
    setLiveSyncing(true);
    setRealtimeStatus('syncing');
    const startedAt =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      await Promise.all([
        publishPublicWebsiteState(
          user.uid,
          configRef.current,
          websiteContent,
          enterprise.organizationName,
          enterprise.supportEmail,
          activeSiteId,
          appExtrasRef.current
        ),
        publishAppControlMainState(
          user.uid,
          configRef.current,
          appExtrasRef.current,
          appControlRef.current,
          activeSiteId
        ),
      ]);
      lastSyncedSignatureRef.current = JSON.stringify(
        preparePublicSiteForFirestore(
          configRef.current,
          websiteContent,
          enterprise.organizationName,
          enterprise.supportEmail,
          appExtrasRef.current
        )
      );
      lastSyncedAppConfigSigRef.current = JSON.stringify(
        prepareAppConfigMainForFirestore(
          user.uid,
          configRef.current,
          appExtrasRef.current,
          appControlRef.current
        )
      );
      const elapsed =
        typeof performance !== 'undefined'
          ? Math.round(performance.now() - startedAt)
          : Math.round(Date.now() - startedAt);
      setLastSyncLatencyMs(Math.max(12, elapsed));
      setRealtimeStatus('live');
      showBanner(
        'success',
        `लाइव ऐप कंट्रोल, बैनर, AdMob, प्राइवेसी और FAQ (${activeSiteId} & appConfig/main) Firestore पर अपडेट हो गए (${Math.max(12, elapsed)}ms)।`
      );
      logActivity(
        'Live App & Site Synced',
        `Updated publicSites/${activeSiteId} & publicSites/appConfig/main/config`
      );
    } catch (error) {
      setRealtimeStatus('local');
      const msg =
        error instanceof Error ? error.message : 'Live website cloud sync failed';
      showBanner('error', msg);
    } finally {
      setLiveSyncing(false);
    }
  }, [
    activeApp.id,
    user,
    isAuthorizedAdmin,
    activeSiteId,
    websiteContent,
    enterprise.organizationName,
    enterprise.supportEmail,
    showBanner,
    logActivity,
  ]);

  const handleTriggerForceUpdate = useCallback(async () => {
    const nextVersion = configRef.current.latest_version_code + 1;
    const resolvedUrl =
      configRef.current.force_update_url.trim() ||
      `https://play.google.com/store/apps/details?id=${activeApp.packageId}`;
    const nextConfig: ShayariLokConfig = {
      ...configRef.current,
      latest_version_code: nextVersion,
      force_update_url: resolvedUrl,
    };
    setConfig(nextConfig);
    logActivity('Force Update Triggered', `${activeApp.name} -> v${nextVersion}`);
    if (user && isAuthorizedAdmin && activeSiteId) {
      await pushImmediateCloudSync(nextConfig);
      showBanner(
        'success',
        `Force Update v${nextVersion} (${activeApp.name}) Firestore पर लाइव पुश हो गया!`
      );
    } else {
      showBanner(
        'success',
        `Force Update वर्ज़न v${nextVersion} (${activeApp.name}) तैयार हो गया! (क्लाउड पुश के लिए Publish या Google Admin Sign-In करें)`
      );
    }
  }, [
    activeApp.name,
    activeApp.packageId,
    user,
    isAuthorizedAdmin,
    activeSiteId,
    pushImmediateCloudSync,
    logActivity,
    showBanner,
  ]);

  const effectiveAppUsers = useMemo(
    () => (isAuthorizedAdmin ? cloudAppUsers : sandboxSocial.users),
    [isAuthorizedAdmin, cloudAppUsers, sandboxSocial.users]
  );
  const effectiveSocialEdges = useMemo(
    () => (isAuthorizedAdmin ? cloudSocialEdges : sandboxSocial.edges),
    [isAuthorizedAdmin, cloudSocialEdges, sandboxSocial.edges]
  );
  const effectiveChatRooms = useMemo(
    () => (isAuthorizedAdmin ? cloudChatRooms : sandboxSocial.rooms),
    [isAuthorizedAdmin, cloudChatRooms, sandboxSocial.rooms]
  );
  const userDataMode: 'live' | 'sandbox' = isAuthorizedAdmin
    ? 'live'
    : 'sandbox';

  const standaloneWebsiteUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : '/';
    return buildStandaloneEntryUrl('website.html', origin, pathname, {
      siteId: activeSiteId || (user?.uid ?? null),
      repoOverride: githubReady
        ? {
            owner: settings.owner,
            repo: settings.repo,
            branch: settings.branch || 'main',
            path: activeApp.githubPath || settings.path || 'config.json',
          }
        : null,
    });
  }, [activeSiteId, user, githubReady, settings, activeApp.githubPath]);

  const standalonePrivacyUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : '/';
    return buildStandaloneEntryUrl('privacy.html', origin, pathname, {
      siteId: activeSiteId || (user?.uid ?? null),
      repoOverride: githubReady
        ? {
            owner: settings.owner,
            repo: settings.repo,
            branch: settings.branch || 'main',
            path: activeApp.githubPath || settings.path || 'config.json',
          }
        : null,
    });
  }, [activeSiteId, user, githubReady, settings, activeApp.githubPath]);

  // Full-Screen Live Public Website Suite (#/site, #/site/shayari, #/site/suvichar, #/site/updates, #/site/privacy)
  if (routeState.view === 'site') {
    return (
      <>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-medium text-slate-500">
              Loading public portal...
            </div>
          }
        >
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
        </Suspense>
        <CopyToastBanner />
      </>
    );
  }

  // Strict Zero-Trust Admin Authentication Gate
  if (!canEnterAdmin) {
    return (
      <>
        <AdminAuthGate
          organizationName={enterprise.organizationName}
          user={user}
          authLoading={authLoading}
          isAuthorizedUser={isAuthorizedAdmin}
          authError={authError}
          canEnterLocalSandbox={canEnterLocalSandbox}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          onEnterLocalSandbox={() => setLocalSandboxUnlocked(true)}
        />
        <CopyToastBanner />
      </>
    );
  }

  if (isLocked) {
    return (
      <AdminLockScreen
        organizationName={enterprise.organizationName}
        adminDisplayName={enterprise.adminDisplayName}
        onUnlock={handleUnlockWorkspace}
      />
    );
  }

  // Full-Screen Enterprise Settings Hub & Individual 10 Setting Pages (#/settings, #/settings/<tab>)
  if (routeState.view === 'settings') {
    return (
      <>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-medium text-slate-500">
              Loading Enterprise Settings...
            </div>
          }
        >
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
        </Suspense>
        <CopyToastBanner />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={navigateSection}
        shayariCount={config.shayari_list.length}
        notificationCount={config.notifications.length}
        languageCount={appExtras.supported_languages.filter((l) => l.enabled).length}
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
        activeAppName={activeApp.name}
        activePackageId={activeApp.packageId}
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
          apps={managedApps}
          activeAppId={activeApp.id}
          onSelectApp={handleSelectApp}
          onCreateApp={handleCreateApp}
          onDeleteApp={handleDeleteApp}
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
              activeApp={activeApp}
              extras={appExtras}
              control={appControl}
              appUsers={effectiveAppUsers}
              socialEdges={effectiveSocialEdges}
              chatRooms={effectiveChatRooms}
              userDataMode={userDataMode}
              realtimeStatus={realtimeStatus}
              lastSyncLatencyMs={lastSyncLatencyMs}
              onUpdate={handleUpdateConfig}
              onNavigate={navigateSection}
              onSyncLiveNow={handleSyncLiveWebsiteNow}
              onTriggerForceUpdate={handleTriggerForceUpdate}
            />
          )}

          {activeSection === 'app-studio' && (
            <Suspense
              fallback={
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Loading App Control &amp; CMS Studio...
                </div>
              }
            >
              <AppControlStudioSection
                config={config}
                extras={appExtras}
                control={appControl}
                user={user}
                realtimeStatus={realtimeStatus}
                lastSyncLatencyMs={lastSyncLatencyMs}
                githubSettings={settings}
                proxySettings={proxySettings}
                hostedPrivacyUrl={standalonePrivacyUrl}
                onUpdateConfig={handleUpdateConfig}
                onUpdateExtras={handleUpdateExtras}
                onUpdateControl={handleUpdateAppControl}
                onSaveAppConfigNow={handleSyncLiveWebsiteNow}
                onAttemptLog={appendAttemptLog}
              />
            </Suspense>
          )}

          {activeSection === 'shayari' && (
            <ShayariManagerSection
              config={config}
              onUpdate={handleUpdateConfig}
              githubSettings={settings}
              proxySettings={proxySettings}
              onAttemptLog={appendAttemptLog}
              onOpenGitHubSync={() => navigateSection('sync')}
              onPublishConfigNow={handlePublishConfigNow}
            />
          )}

          {activeSection === 'notifications' && (
            <NotificationsSection
              config={config}
              onUpdate={handleUpdateConfig}
              websiteContent={websiteContent}
              onUpdateWebsiteContent={handleUpdateWebsiteContent}
              standaloneWebsiteUrl={standaloneWebsiteUrl}
              user={user}
              liveSyncing={liveSyncing}
              onSyncLiveWebsiteNow={handleSyncLiveWebsiteNow}
            />
          )}

          {activeSection === 'localization' && (
            <Suspense
              fallback={
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Loading Languages, Countries &amp; Theme Studio...
                </div>
              }
            >
              <LocalizationStudioSection
                config={config}
                extras={appExtras}
                onUpdateExtras={handleUpdateExtras}
                user={user}
                activeSiteId={activeSiteId || undefined}
                realtimeStatus={realtimeStatus}
                onSyncLiveNow={handleSyncLiveWebsiteNow}
              />
            </Suspense>
          )}

          {activeSection === 'social-monitor' && (
            <Suspense
              fallback={
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Loading Users &amp; Live Chats monitor...
                </div>
              }
            >
              <SocialMonitorSection
                user={user}
                activeSiteId={activeSiteId || undefined}
                onSignIn={() => void handleGoogleSignIn()}
              />
            </Suspense>
          )}

          {activeSection === 'monetization' && (
            <MonetizationSection
              config={config}
              control={appControl}
              onUpdate={handleUpdateConfig}
              onUpdateControl={handleUpdateAppControl}
              onSaveAndSync={handleSyncLiveWebsiteNow}
              hostedPrivacyUrl={standalonePrivacyUrl}
              hostedWebsiteUrl={standaloneWebsiteUrl}
            />
          )}

          {activeSection === 'website' && (
            <Suspense
              fallback={
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Loading Live Websites hub...
                </div>
              }
            >
              <WebsiteHubSection
                config={config}
                websiteContent={websiteContent}
                githubSettings={settings}
                user={user}
                liveSyncing={liveSyncing}
                onSyncLiveWebsiteNow={handleSyncLiveWebsiteNow}
                onOpenPublicPage={navigatePublicSite}
                onOpenPinSettings={() => navigateSettingsTab('pin_lock')}
              />
            </Suspense>
          )}

          {activeSection === 'android-api' && (
            <Suspense
              fallback={
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Loading Android API &amp; SDK generator...
                </div>
              }
            >
              <AndroidApiSection
                config={config}
                extras={appExtras}
                githubSettings={settings}
                proxySettings={proxySettings}
                user={user}
                activeSiteId={activeSiteId || undefined}
                activePackageId={activeApp.packageId}
                onOpenGitHubSync={() => navigateSection('sync')}
                onOpenProxySettings={() => navigateSection('proxy')}
              />
            </Suspense>
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
      <CopyToastBanner />
    </div>
  );
}
