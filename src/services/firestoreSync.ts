import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AppControlStudioConfig,
  AppLocalizationExtras,
  GitHubSettings,
  ProxySettings,
  PublishLogEntry,
  ShayariLokConfig,
  WebsiteContentSettings,
} from '../types/config';
import {
  normalizeAppControlConfig,
  prepareAppConfigMainForFirestore,
} from '../utils/appControlStudio';
import { normalizeConfig, prepareDraftForFirestore } from '../utils/configHelpers';
import { normalizeAppExtras } from '../utils/localizationAndExtras';
import {
  normalizeProxySettings,
  sanitizeProxySettingsForFirestore,
} from '../utils/proxyEngine';
import {
  normalizeWebsiteContent,
  preparePublicSiteForFirestore,
} from '../utils/websiteContent';

const SETTINGS_DOC_ID = 'github';
const DRAFT_DOC_ID = 'default';
const PROXY_DOC_ID = 'default';

export async function ensureUserProfile(user: User): Promise<void> {
  if (!db) return;
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: (user.email ?? 'admin@shayarilok.in').slice(0, 254),
        displayName: (user.displayName ?? 'Shayari Lok Admin').slice(0, 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        ref,
        {
          uid: user.uid,
          email: (user.email ?? 'admin@shayarilok.in').slice(0, 254),
          displayName: (user.displayName ?? 'Shayari Lok Admin').slice(0, 120),
          createdAt: snap.data().createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCloudRepoSettings(
  uid: string,
  settings: GitHubSettings,
  lastSha: string
): Promise<void> {
  if (!db) return;
  const owner = settings.owner.trim() || 'owner';
  const repo = settings.repo.trim() || 'repo';
  const branch = settings.branch.trim() || 'main';
  const filePath = settings.path.trim() || 'config.json';
  const path = `users/${uid}/settings/${SETTINGS_DOC_ID}`;
  const ref = doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID);
  try {
    await setDoc(ref, {
      ownerId: uid,
      githubOwner: owner.slice(0, 100),
      githubRepo: repo.slice(0, 120),
      githubBranch: branch.slice(0, 100),
      githubPath: filePath.slice(0, 256),
      lastSha: lastSha.slice(0, 128),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCloudProxyProfile(
  uid: string,
  proxySettings: ProxySettings
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const path = `users/${uid}/proxyProfiles/${PROXY_DOC_ID}`;
  const ref = doc(db, 'users', uid, 'proxyProfiles', PROXY_DOC_ID);
  const safe = sanitizeProxySettingsForFirestore(proxySettings);
  try {
    await setDoc(ref, {
      ownerId: uid,
      ...safe,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadCloudProxyProfile(
  uid: string
): Promise<ProxySettings | null> {
  if (!db) throw new Error('Firestore is not available.');
  const path = `users/${uid}/proxyProfiles/${PROXY_DOC_ID}`;
  const ref = doc(db, 'users', uid, 'proxyProfiles', PROXY_DOC_ID);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return normalizeProxySettings(snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function checkIsCloudAllowlistedAdmin(
  uid: string
): Promise<boolean> {
  if (!db || !uid) return false;
  const path = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function saveCloudDraft(
  uid: string,
  config: ShayariLokConfig,
  draftId = DRAFT_DOC_ID
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const safeDraftId = draftId.trim() || DRAFT_DOC_ID;
  const path = `users/${uid}/drafts/${safeDraftId}`;
  const ref = doc(db, 'users', uid, 'drafts', safeDraftId);
  const safe = prepareDraftForFirestore(config);
  try {
    await setDoc(ref, {
      ownerId: uid,
      ...safe,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadCloudDraft(
  uid: string,
  draftId = DRAFT_DOC_ID
): Promise<ShayariLokConfig | null> {
  if (!db) throw new Error('Firestore is not available.');
  const safeDraftId = draftId.trim() || DRAFT_DOC_ID;
  const path = `users/${uid}/drafts/${safeDraftId}`;
  const ref = doc(db, 'users', uid, 'drafts', safeDraftId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return normalizeConfig(snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function recordPublishLog(
  uid: string,
  entry: Omit<PublishLogEntry, 'id' | 'createdAt'>
): Promise<void> {
  if (!db) return;
  const path = `users/${uid}/publishLogs`;
  try {
    await addDoc(collection(db, 'users', uid, 'publishLogs'), {
      ownerId: uid,
      commitSha: entry.commitSha.slice(0, 128) || 'unknown',
      branch: entry.branch.slice(0, 100) || 'main',
      filePath: entry.filePath.slice(0, 256) || 'config.json',
      versionCode: Math.min(9999999, Math.max(1, Math.trunc(entry.versionCode))),
      shayariCount: Math.min(10000, Math.max(0, Math.trunc(entry.shayariCount))),
      message: entry.message.slice(0, 300) || 'Update config.json',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeUserWorkspace(
  uid: string,
  callbacks: {
    onSettings?: (data: {
      owner: string;
      repo: string;
      branch: string;
      path: string;
      lastSha: string;
    }) => void;
    onLogs?: (logs: PublishLogEntry[]) => void;
    onError?: (error: Error) => void;
  }
): Unsubscribe {
  if (!db) return () => {};
  const settingsPath = `users/${uid}/settings/${SETTINGS_DOC_ID}`;
  const unsubSettings = onSnapshot(
    doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID),
    (snap) => {
      if (snap.exists() && callbacks.onSettings) {
        const d = snap.data();
        callbacks.onSettings({
          owner: String(d.githubOwner ?? ''),
          repo: String(d.githubRepo ?? ''),
          branch: String(d.githubBranch ?? 'main'),
          path: String(d.githubPath ?? 'config.json'),
          lastSha: String(d.lastSha ?? ''),
        });
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, settingsPath);
      } catch (wrapped) {
        if (callbacks.onError && wrapped instanceof Error) {
          callbacks.onError(wrapped);
        }
      }
    }
  );

  const logsPath = `users/${uid}/publishLogs`;
  const logsQuery = query(
    collection(db, 'users', uid, 'publishLogs'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(15)
  );
  const unsubLogs = onSnapshot(
    logsQuery,
    (snapshot) => {
      if (!callbacks.onLogs) return;
      const items: PublishLogEntry[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const ts = d.createdAt as { toDate?: () => Date } | undefined;
        return {
          id: docSnap.id,
          commitSha: String(d.commitSha ?? ''),
          branch: String(d.branch ?? 'main'),
          filePath: String(d.filePath ?? 'config.json'),
          versionCode: Number(d.versionCode ?? 1),
          shayariCount: Number(d.shayariCount ?? 0),
          message: String(d.message ?? ''),
          createdAt: ts?.toDate ? ts.toDate() : null,
        };
      });
      callbacks.onLogs(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, logsPath);
      } catch (wrapped) {
        if (callbacks.onError && wrapped instanceof Error) {
          callbacks.onError(wrapped);
        }
      }
    }
  );

  return () => {
    unsubSettings();
    unsubLogs();
  };
}

export interface PublicSiteSnapshot {
  config: ShayariLokConfig;
  websiteContent: WebsiteContentSettings;
  organizationName: string;
  supportEmail: string;
  extras?: AppLocalizationExtras;
}

export interface PublicSiteSnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

function mapPublicSiteDocument(
  d: Record<string, unknown>
): PublicSiteSnapshot {
  return {
    config: normalizeConfig(d),
    websiteContent: normalizeWebsiteContent({
      heroHeadline: d.heroHeadline,
      heroSubheadline: d.heroSubheadline,
      controls: d.websiteControls,
      suvichar_list: d.suvichar_list,
      photo_shayari_list: d.photo_shayari_list,
    }),
    organizationName: String(d.organizationName ?? 'CyberKing Studios'),
    supportEmail: String(d.supportEmail ?? 'support@shayarilok.in'),
    extras:
      d.supported_languages || d.supported_countries || d.dynamic_theme
        ? normalizeAppExtras(d)
        : undefined,
  };
}

export async function loadPublicWebsiteStateOnce(
  siteId: string
): Promise<PublicSiteSnapshot | null> {
  if (!db || !siteId) return null;
  const path = `publicSites/${siteId}`;
  const ref = doc(db, 'publicSites', siteId);
  try {
    let snap;
    try {
      snap = await getDocFromServer(ref);
    } catch {
      snap = await getDoc(ref);
    }
    if (!snap.exists()) return null;
    return mapPublicSiteDocument(snap.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function publishPublicWebsiteState(
  uid: string,
  config: ShayariLokConfig,
  websiteContent: WebsiteContentSettings,
  organizationName: string,
  supportEmail: string,
  siteIdOverride?: string,
  extras?: AppLocalizationExtras
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const targetSiteId = siteIdOverride?.trim() || uid;
  const path = `publicSites/${targetSiteId}`;
  const ref = doc(db, 'publicSites', targetSiteId);
  const safe = preparePublicSiteForFirestore(
    config,
    websiteContent,
    organizationName,
    supportEmail,
    extras
  );
  try {
    await setDoc(ref, {
      ownerId: uid,
      ...safe,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribePublicWebsiteState(
  siteId: string,
  onData: (snapshot: PublicSiteSnapshot, meta: PublicSiteSnapshotMeta) => void,
  onError?: (error: Error) => void,
  onMissing?: () => void
): Unsubscribe {
  if (!db || !siteId) return () => {};
  const path = `publicSites/${siteId}`;
  const ref = doc(db, 'publicSites', siteId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        if (onMissing) onMissing();
        return;
      }
      onData(mapPublicSiteDocument(snap.data() as Record<string, unknown>), {
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export interface AppConfigMainRemoteSnapshot {
  control: AppControlStudioConfig;
  app_name?: string;
  ads_enabled?: boolean;
  banner_ad_id?: string;
  interstitial_ad_id?: string;
  privacy_policy_url?: string;
  dynamic_theme?: AppLocalizationExtras['dynamic_theme'];
}

export async function loadAppControlMainOnce(
  siteId?: string
): Promise<AppConfigMainRemoteSnapshot | null> {
  if (!db) return null;
  const candidatePaths: Array<[string, string, string, string]> = [
    ['publicSites', 'appConfig', 'main', 'config'],
  ];
  if (siteId?.trim() && siteId.trim() !== 'appConfig') {
    candidatePaths.push(['publicSites', siteId.trim(), 'appConfig', 'main']);
  }

  for (const [c1, d1, c2, d2] of candidatePaths) {
    const path = `${c1}/${d1}/${c2}/${d2}`;
    const ref = doc(db, c1, d1, c2, d2);
    try {
      let snap;
      try {
        snap = await getDocFromServer(ref);
      } catch {
        snap = await getDoc(ref);
      }
      if (!snap.exists()) continue;
      const data = snap.data() as Record<string, unknown>;
      return {
        control: normalizeAppControlConfig(data),
        app_name:
          typeof data.app_name === 'string' ? data.app_name : undefined,
        ads_enabled:
          typeof data.ads_enabled === 'boolean' ? data.ads_enabled : undefined,
        banner_ad_id:
          typeof data.banner_ad_id === 'string' ? data.banner_ad_id : undefined,
        interstitial_ad_id:
          typeof data.interstitial_ad_id === 'string'
            ? data.interstitial_ad_id
            : undefined,
        privacy_policy_url:
          typeof data.privacy_policy_url === 'string'
            ? data.privacy_policy_url
            : undefined,
        dynamic_theme:
          data.dynamic_theme && typeof data.dynamic_theme === 'object'
            ? (data.dynamic_theme as AppLocalizationExtras['dynamic_theme'])
            : undefined,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }
  return null;
}

export function subscribeAppControlMain(
  onData: (snapshot: AppConfigMainRemoteSnapshot, meta: PublicSiteSnapshotMeta) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  const path = 'publicSites/appConfig/main/config';
  const ref = doc(db, 'publicSites', 'appConfig', 'main', 'config');
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      onData(
        {
          control: normalizeAppControlConfig(data),
          app_name:
            typeof data.app_name === 'string' ? data.app_name : undefined,
          ads_enabled:
            typeof data.ads_enabled === 'boolean' ? data.ads_enabled : undefined,
          banner_ad_id:
            typeof data.banner_ad_id === 'string' ? data.banner_ad_id : undefined,
          interstitial_ad_id:
            typeof data.interstitial_ad_id === 'string'
              ? data.interstitial_ad_id
              : undefined,
          privacy_policy_url:
            typeof data.privacy_policy_url === 'string'
              ? data.privacy_policy_url
              : undefined,
          dynamic_theme:
            data.dynamic_theme && typeof data.dynamic_theme === 'object'
              ? (data.dynamic_theme as AppLocalizationExtras['dynamic_theme'])
              : undefined,
        },
        {
          fromCache: snap.metadata.fromCache,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        }
      );
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function publishAppControlMainState(
  uid: string,
  config: ShayariLokConfig,
  extras: AppLocalizationExtras,
  control: AppControlStudioConfig,
  siteIdOverride?: string
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const firestore = db;
  const payload = prepareAppConfigMainForFirestore(uid, config, extras, control);
  const targetSiteId = siteIdOverride?.trim() || uid;

  // 1. Canonical publicSites/appConfig/main/config document
  const canonicalPath = 'publicSites/appConfig/main/config';
  try {
    await setDoc(doc(firestore, 'publicSites', 'appConfig', 'main', 'config'), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, canonicalPath);
  }

  // 2. Site-scoped mirror publicSites/{siteId}/appConfig/main
  if (targetSiteId && targetSiteId !== 'appConfig') {
    const scopedPath = `publicSites/${targetSiteId}/appConfig/main`;
    try {
      await setDoc(
        doc(firestore, 'publicSites', targetSiteId, 'appConfig', 'main'),
        {
          ...payload,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, scopedPath);
    }
  }

  // 3. Dedicated banners collection: publicSites/appConfig/banners/{bannerId}
  const bannersColPath = 'publicSites/appConfig/banners';
  try {
    const bannersCol = collection(firestore, 'publicSites', 'appConfig', 'banners');
    const existingSnap = await getDocs(bannersCol);
    const keepIds = new Set(payload.banners.map((b) => b.id));
    const batch = writeBatch(firestore);
    existingSnap.docs.forEach((docSnap) => {
      if (!keepIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });
    payload.banners.forEach((banner) => {
      batch.set(doc(firestore, 'publicSites', 'appConfig', 'banners', banner.id), {
        ...banner,
        ownerId: uid,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, bannersColPath);
  }

  // 4. Dedicated FAQs collection: publicSites/appConfig/faqs/{faqId}
  const faqsColPath = 'publicSites/appConfig/faqs';
  try {
    const faqsCol = collection(firestore, 'publicSites', 'appConfig', 'faqs');
    const existingSnap = await getDocs(faqsCol);
    const keepIds = new Set(payload.faqs.map((f) => f.id));
    const batch = writeBatch(firestore);
    existingSnap.docs.forEach((docSnap) => {
      if (!keepIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });
    payload.faqs.forEach((faq) => {
      batch.set(doc(firestore, 'publicSites', 'appConfig', 'faqs', faq.id), {
        ...faq,
        ownerId: uid,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, faqsColPath);
  }
}

