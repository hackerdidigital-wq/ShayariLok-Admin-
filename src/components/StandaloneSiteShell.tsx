import React, { useEffect, useState } from 'react';
import { subscribePublicWebsiteState } from '../services/firestoreSync';
import type { ShayariLokConfig, WebsiteContentSettings } from '../types/config';
import { DEFAULT_CONFIG } from '../utils/configHelpers';
import { loadEnterpriseSettings } from '../utils/enterpriseSettings';
import { fetchGitHubConfig, loadGitHubSettings, loadLocalDraft } from '../utils/githubApi';
import { loadProxySettings } from '../utils/proxyEngine';
import {
  buildStandaloneEntryUrl,
  parseStandaloneQuery,
  type PublicSitePageId,
} from '../utils/siteRoutes';
import {
  loadWebsiteContent,
  subscribeLocalLiveWebsiteState,
} from '../utils/websiteContent';
import { PublicWebsiteView } from './PublicWebsiteView';

interface StandaloneSiteShellProps {
  mode: 'website' | 'privacy';
}

export const StandaloneSiteShell: React.FC<StandaloneSiteShellProps> = ({
  mode,
}) => {
  const initialQuery =
    typeof window !== 'undefined'
      ? parseStandaloneQuery(window.location.search, window.location.hash)
      : { page: 'home' as PublicSitePageId, siteId: null, repoOverride: null };

  const [page, setPage] = useState<PublicSitePageId>(
    mode === 'privacy' ? 'privacy' : initialQuery.page
  );

  const [config, setConfig] = useState<ShayariLokConfig>(
    () => loadLocalDraft() ?? { ...DEFAULT_CONFIG }
  );
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentSettings>(() =>
    loadWebsiteContent()
  );

  const initialEnterprise = loadEnterpriseSettings();
  const [organizationName, setOrganizationName] = useState(
    initialEnterprise.organizationName || 'CyberKing Studios'
  );
  const [supportEmail, setSupportEmail] = useState(
    initialEnterprise.supportEmail || 'support@shayarilok.in'
  );

  const [syncState, setSyncState] = useState<
    'local' | 'loading' | 'live' | 'error'
  >('local');
  const [syncMessage, setSyncMessage] = useState('');

  // Same-browser real-time sync from Admin Panel (BroadcastChannel + storage events)
  useEffect(() => {
    return subscribeLocalLiveWebsiteState((payload) => {
      if (payload.config) setConfig(payload.config);
      if (payload.websiteContent) setWebsiteContent(payload.websiteContent);
      if (payload.organizationName) setOrganizationName(payload.organizationName);
      if (payload.supportEmail) setSupportEmail(payload.supportEmail);
      setSyncState('live');
    });
  }, []);

  // Cross-device real-time sync via Firestore /publicSites/{siteId} OR GitHub config.json
  useEffect(() => {
    if (initialQuery.siteId) {
      setSyncState('loading');
      const unsub = subscribePublicWebsiteState(
        initialQuery.siteId,
        (snap) => {
          setConfig(snap.config);
          setWebsiteContent(snap.websiteContent);
          setOrganizationName(snap.organizationName);
          setSupportEmail(snap.supportEmail);
          setSyncState('live');
          setSyncMessage('');
        },
        (err) => {
          setSyncState('error');
          setSyncMessage(err.message || 'Live website sync unavailable.');
        },
        () => {
          setSyncState('local');
        }
      );
      return unsub;
    }

    const storedGh = loadGitHubSettings();
    const targetRepo =
      initialQuery.repoOverride ??
      (storedGh.owner && storedGh.repo
        ? {
            owner: storedGh.owner,
            repo: storedGh.repo,
            branch: storedGh.branch || 'main',
            path: storedGh.path || 'config.json',
          }
        : null);

    if (!targetRepo) return;

    let cancelled = false;
    setSyncState('loading');
    fetchGitHubConfig(
      {
        owner: targetRepo.owner,
        repo: targetRepo.repo,
        branch: targetRepo.branch,
        path: targetRepo.path,
        token: '',
      },
      loadProxySettings()
    )
      .then((res) => {
        if (cancelled) return;
        setConfig(res.config);
        setSyncState('live');
        setSyncMessage('');
      })
      .catch((err) => {
        if (cancelled) return;
        setSyncState('error');
        setSyncMessage(
          err instanceof Error
            ? err.message
            : 'Unable to reach remote config; displaying cached content.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [initialQuery.siteId, initialQuery.repoOverride]);

  const handleNavigatePage = (nextPage: PublicSitePageId) => {
    if (mode === 'privacy' && nextPage === 'privacy') return;
    setPage(nextPage);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (nextPage === 'home') {
        url.searchParams.delete('page');
      } else {
        url.searchParams.set('page', nextPage);
      }
      window.history.replaceState(null, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '/';

  const standalonePrivacyHref = buildStandaloneEntryUrl(
    'privacy.html',
    origin,
    pathname,
    {
      siteId: initialQuery.siteId,
      repoOverride: initialQuery.repoOverride,
    }
  );
  const standaloneWebsiteHref = buildStandaloneEntryUrl(
    'website.html',
    origin,
    pathname,
    {
      siteId: initialQuery.siteId,
      repoOverride: initialQuery.repoOverride,
    }
  );

  return (
    <PublicWebsiteView
      page={mode === 'privacy' ? 'privacy' : page}
      onNavigatePage={handleNavigatePage}
      config={config}
      websiteContent={websiteContent}
      organizationName={organizationName}
      supportEmail={supportEmail}
      publicSyncState={syncState}
      publicSyncMessage={syncMessage}
      standalonePrivacyHref={standalonePrivacyHref}
      standaloneWebsiteHref={standaloneWebsiteHref}
      isPrivacyOnlyMode={mode === 'privacy'}
    />
  );
};
