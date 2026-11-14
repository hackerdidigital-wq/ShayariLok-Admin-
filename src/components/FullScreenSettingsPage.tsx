import React, { useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Download,
  FileUp,
  Globe,
  History,
  LayoutGrid,
  Lock,
  Printer,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { copyTextWithFeedback } from '../utils/clipboardToast';
import type {
  GitHubSettings,
  ProxySettings,
  ShayariLokConfig,
} from '../types/config';
import {
  DEFAULT_CONFIG,
  PACKAGE_ID,
  normalizeConfig,
  serializeConfigJson,
} from '../utils/configHelpers';
import {
  auditConfigHygiene,
  deduplicateShayaris,
  estimateLocalStorageBytes,
  hashPinCode,
  parseBulkShayaris,
  syncMissingCategories,
  validatePublishGuardrails,
  type ActivityAuditEntry,
  type ConfigSnapshot,
  type EnterpriseSettings,
  type EnterpriseTabId,
} from '../utils/enterpriseSettings';
import { ENTERPRISE_MENU_OPTIONS } from './AdminBrandMenu';

interface FullScreenSettingsPageProps {
  activeTab: EnterpriseTabId | null;
  onSelectTab: (tab: EnterpriseTabId | null) => void;
  onBackToAdmin: () => void;
  onOpenLiveSite: () => void;
  enterprise: EnterpriseSettings;
  onSaveEnterprise: (next: EnterpriseSettings) => void;
  config: ShayariLokConfig;
  baselineConfig: ShayariLokConfig;
  onUpdateConfig: (next: ShayariLokConfig) => void;
  githubSettings: GitHubSettings;
  currentSha: string;
  commitMessage: string;
  proxySettings: ProxySettings;
  snapshots: ConfigSnapshot[];
  onCreateSnapshot: (label: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  auditLog: ActivityAuditEntry[];
  onClearAuditLog: () => void;
  onLogAction: (action: string, detail: string) => void;
  onLockNow: () => void;
  onWipePat: () => void;
  onResetToSeed: () => void;
  user: User | null;
}

function downloadJsonFile(filename: string, payload: unknown) {
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const FullScreenSettingsPage: React.FC<FullScreenSettingsPageProps> = ({
  activeTab,
  onSelectTab,
  onBackToAdmin,
  onOpenLiveSite,
  enterprise,
  onSaveEnterprise,
  config,
  baselineConfig,
  onUpdateConfig,
  githubSettings,
  currentSha,
  commitMessage,
  proxySettings,
  snapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  auditLog,
  onClearAuditLog,
  onLogAction,
  onLockNow,
  onWipePat,
  onResetToSeed,
  user,
}) => {
  const [draftEnt, setDraftEnt] = useState<EnterpriseSettings>(enterprise);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [bulkCategory, setBulkCategory] = useState(() =>
    config.categories.find((c) => c !== 'All') || 'Love'
  );
  const [bulkAuthor, setBulkAuthor] = useState(
    enterprise.adminDisplayName || 'Admin'
  );
  const [bulkInput, setBulkInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyText = (tag: string, text: string, label: string) => {
    void copyTextWithFeedback(text, label).then((ok) => {
      if (ok) {
        setCopiedTag(tag);
        window.setTimeout(() => {
          setCopiedTag((prev) => (prev === tag ? null : prev));
        }, 2000);
      }
    });
  };

  React.useEffect(() => {
    setDraftEnt(enterprise);
  }, [enterprise]);

  const hygiene = useMemo(() => auditConfigHygiene(config), [config]);
  const guardrailPreview = useMemo(
    () => validatePublishGuardrails(config, draftEnt, commitMessage),
    [config, draftEnt, commitMessage]
  );
  const bulkPreview = useMemo(
    () =>
      parseBulkShayaris(
        bulkInput,
        bulkCategory,
        bulkAuthor || 'Admin',
        config.shayari_list
      ),
    [bulkInput, bulkCategory, bulkAuthor, config.shayari_list]
  );

  const storageKb = useMemo(
    () => (estimateLocalStorageBytes() / 1024).toFixed(1),
    [config, snapshots, auditLog]
  );

  const categoryDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of config.shayari_list) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [config.shayari_list]);

  const currentIndex = useMemo(
    () =>
      activeTab
        ? ENTERPRISE_MENU_OPTIONS.findIndex((o) => o.id === activeTab)
        : -1,
    [activeTab]
  );
  const activeOption =
    currentIndex >= 0 ? ENTERPRISE_MENU_OPTIONS[currentIndex] : null;
  const prevOption =
    currentIndex > 0 ? ENTERPRISE_MENU_OPTIONS[currentIndex - 1] : null;
  const nextOption =
    currentIndex >= 0 && currentIndex < ENTERPRISE_MENU_OPTIONS.length - 1
      ? ENTERPRISE_MENU_OPTIONS[currentIndex + 1]
      : null;

  const liveSummaryMap: Record<EnterpriseTabId, string> = useMemo(() => {
    const activeRuleCount = [
      enterprise.requireCommitMessage,
      enterprise.strictSchemaGate,
      enterprise.confirmMaintenancePublish,
      enterprise.confirmBeforePublish,
    ].filter(Boolean).length;
    return {
      identity: `${enterprise.organizationName} · ${enterprise.environment}`,
      guardrails: `${activeRuleCount}/4 safety gates active`,
      snapshots: `${snapshots.length} restore points · Auto-save ${enterprise.autoSaveDraft ? 'On' : 'Off'}`,
      backup: `${config.shayari_list.length} shayaris ready to export`,
      bulk_import: `${config.categories.filter((c) => c !== 'All').length} active categories`,
      hygiene:
        hygiene.issueCount === 0
          ? '0 schema or duplicate issues'
          : `${hygiene.issueCount} items need review`,
      print_report: `v${config.latest_version_code} Release Blueprint`,
      pin_lock: enterprise.pinHash ? 'Passcode Lock Active' : 'No PIN configured',
      appearance: `${enterprise.density} · ${enterprise.devanagariScale} Devanagari`,
      security_vault: `${storageKb} KB local · ${auditLog.length} audit logs`,
    };
  }, [enterprise, snapshots.length, config, hygiene.issueCount, storageKb, auditLog.length]);

  const handleSaveIdentityOrRules = () => {
    onSaveEnterprise(draftEnt);
    setFeedback({
      type: 'success',
      text: 'सेटिंग्स सफलतापूर्वक सेव हो गईं।',
    });
  };

  const handleCreateSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      snapshotLabel.trim() ||
      `Checkpoint v${config.latest_version_code} (${config.shayari_list.length} shayaris)`;
    onCreateSnapshot(label);
    setSnapshotLabel('');
    setFeedback({
      type: 'success',
      text: `Snapshot "${label}" स्थानीय स्टोरेज में सेव हो गया।`,
    });
  };

  const handleExportConfigOnly = () => {
    const clean = normalizeConfig(config);
    downloadJsonFile(
      `shayari-lok-config-v${clean.latest_version_code}.json`,
      clean
    );
    onLogAction('Export JSON', `Downloaded clean config.json v${clean.latest_version_code}`);
    setFeedback({
      type: 'success',
      text: 'Android app schema के अनुसार config.json डाउनलोड हो गया।',
    });
  };

  const handleExportFullBackup = () => {
    downloadJsonFile(`shayari-lok-full-backup-${Date.now()}.json`, {
      exportedAt: new Date().toISOString(),
      app: PACKAGE_ID,
      enterprise: { ...enterprise, pinHash: '' },
      config: normalizeConfig(config),
    });
    onLogAction('Full Backup', 'Exported workspace + config JSON backup');
    setFeedback({
      type: 'success',
      text: 'पूर्ण एडमिन वर्कस्पेस बैकअप फ़ाइल डाउनलोड हो गई।',
    });
  };

  const handleImportJsonFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const rawConfig =
        parsed &&
        typeof parsed === 'object' &&
        'config' in parsed &&
        parsed.config
          ? parsed.config
          : parsed;
      const normalized = normalizeConfig(rawConfig);
      onUpdateConfig(normalized);
      onLogAction(
        'JSON Imported',
        `Loaded ${normalized.shayari_list.length} shayaris from ${file.name}`
      );
      setFeedback({
        type: 'success',
        text: `${file.name} से ${normalized.shayari_list.length} शायरियाँ लोड हो गईं।`,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'अमान्य JSON फ़ाइल।';
      setFeedback({ type: 'error', text: msg });
    } finally {
      e.target.value = '';
    }
  };

  const handleBulkImportSubmit = () => {
    if (bulkPreview.itemsToAdd.length === 0) {
      setFeedback({
        type: 'error',
        text: 'इम्पोर्ट करने के लिए कोई नई शायरी नहीं मिली।',
      });
      return;
    }
    onUpdateConfig({
      ...config,
      shayari_list: [...bulkPreview.itemsToAdd, ...config.shayari_list],
    });
    onLogAction(
      'Bulk Import',
      `Added ${bulkPreview.itemsToAdd.length} shayaris (${bulkPreview.skippedDuplicates} duplicates skipped)`
    );
    setBulkInput('');
    setFeedback({
      type: 'success',
      text: `${bulkPreview.itemsToAdd.length} नई शायरियाँ जोड़ दी गईं (${bulkPreview.skippedDuplicates} डुप्लिकेट छोड़े गए)।`,
    });
  };

  const handleCleanDuplicates = () => {
    const res = deduplicateShayaris(config);
    onUpdateConfig(res.config);
    onLogAction('Hygiene Clean', `Removed ${res.removedCount} duplicates/empty`);
    setFeedback({
      type: 'success',
      text: `${res.removedCount} डुप्लिकेट/खाली एंट्रीज़ हटाई गईं।`,
    });
  };

  const handleSyncCategories = () => {
    const res = syncMissingCategories(config);
    onUpdateConfig(res.config);
    onLogAction('Category Sync', `Added ${res.addedCount} unmapped categories`);
    setFeedback({
      type: 'success',
      text: `${res.addedCount} छूटी हुई कैटेगरीज़ लिस्ट में जोड़ दी गईं।`,
    });
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4 || newPin.trim().length > 8) {
      setFeedback({
        type: 'error',
        text: 'PIN कम से कम 4 और अधिकतम 8 अंकों का होना चाहिए।',
      });
      return;
    }
    if (newPin !== confirmPin) {
      setFeedback({
        type: 'error',
        text: 'दोनों PIN मेल नहीं खाते। कृपया पुनः जांचें।',
      });
      return;
    }
    const hash = await hashPinCode(newPin.trim());
    const next = { ...draftEnt, pinHash: hash };
    setDraftEnt(next);
    onSaveEnterprise(next);
    setNewPin('');
    setConfirmPin('');
    onLogAction('Security PIN Set', 'Updated admin lock passcode');
    setFeedback({
      type: 'success',
      text: 'Admin Passcode (PIN) सुरक्षित रूप से सेव हो गया।',
    });
  };

  const handleRemovePin = () => {
    const next = { ...draftEnt, pinHash: '', autoLockMinutes: 0 };
    setDraftEnt(next);
    onSaveEnterprise(next);
    onLogAction('Security PIN Removed', 'Disabled admin lock passcode');
    setFeedback({ type: 'success', text: 'Admin Passcode हटा दिया गया।' });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col">
      {/* Sticky Top Full-Screen Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToAdmin}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-sm min-w-0">
            <Settings className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-medium text-slate-400 whitespace-nowrap">
              {enterprise.organizationName}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                onSelectTab(null);
              }}
              className="font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Enterprise Settings
            </button>
            {activeOption && (
              <>
                <span className="text-slate-300" aria-hidden="true">
                  /
                </span>
                <h1 className="font-display font-semibold text-slate-900 truncate">
                  {activeOption.code}. {activeOption.label}
                </h1>
              </>
            )}
            {!activeOption && (
              <span className="text-slate-500 text-xs">
                · 10 Full-Screen Pages
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeTab !== null && (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                onSelectTab(null);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">All 10 Settings</span>
              <span className="md:hidden">All 10</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenLiveSite}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 whitespace-nowrap shrink-0"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Live Website</span>
          </button>
        </div>
      </header>

      {/* Mobile Module Selector when viewing an individual full-screen page */}
      {activeTab !== null && (
        <div className="xl:hidden px-4 py-2.5 bg-white border-b border-slate-200 no-print">
          <label htmlFor="fullscreen-setting-select" className="sr-only">
            Switch enterprise setting page
          </label>
          <select
            id="fullscreen-setting-select"
            value={activeTab}
            onChange={(e) => {
              setFeedback(null);
              onSelectTab(e.target.value as EnterpriseTabId);
            }}
            className="w-full px-3 py-2 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            {ENTERPRISE_MENU_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.code}. {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Full-Screen Hub: Overview of All 10 Dedicated Pages (#/settings) */}
      {activeTab === null ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Enterprise Control & Settings
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                प्रत्येक सेटिंग मॉड्यूल को अलग फुल-स्क्रीन पेज के रूप में खोलने के लिए किसी भी कार्ड पर क्लिक करें।
              </p>
            </div>
            <div className="font-mono text-xs text-slate-500 tabular-nums">
              {enterprise.organizationName} · {PACKAGE_ID} ·{' '}
              <span className="capitalize">{enterprise.environment}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ENTERPRISE_MENU_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    onSelectTab(opt.id);
                  }}
                  className="group text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50/20 transition-colors flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-indigo-600 tabular-nums">
                        {opt.code}
                      </span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-slate-900">
                        {opt.label}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {opt.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-600 truncate tabular-nums">
                      {liveSummaryMap[opt.id]}
                    </span>
                    <span className="font-semibold text-indigo-600 flex items-center gap-1 shrink-0">
                      Open Page
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      ) : (
        /* Dedicated Full-Screen Page for the Selected Setting (#/settings/<tabId>) */
        <div className="flex-1 flex min-h-0">
          {/* Desktop Side Rail for Instant Full-Page Switching */}
          <nav
            aria-label="Enterprise setting modules"
            className="hidden xl:flex flex-col w-72 shrink-0 bg-white border-r border-slate-200 p-3 space-y-1 no-print"
          >
            <div className="px-3 py-2 text-xs font-semibold text-slate-400">
              All 10 Setting Pages
            </div>
            {ENTERPRISE_MENU_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeTab === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(opt.id);
                    setFeedback(null);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="font-mono text-[11px] tabular-nums opacity-75">
                    {opt.code}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Main Full-Page Workspace */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
            <div className="max-w-5xl mx-auto space-y-6">
              {feedback && (
                <div
                  role="status"
                  className={`px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-2 no-print ${
                    feedback.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <span>{feedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="p-0.5 hover:opacity-75"
                    aria-label="Dismiss setting feedback"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 01. Workspace & Brand Identity */}
              {activeTab === 'identity' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      01. Workspace & Brand Identity
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      अपनी कंपनी/ऑर्गनाइज़ेशन का नाम, एडमिन पहचान और रिलीज़ एनवायरनमेंट सेट करें। यह नाम एडमिन हेडर, रिलीज़ शीट और लाइव वेबसाइट फुटर में दिखता है।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="ent-org-name"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Organization / Company Name
                      </label>
                      <input
                        id="ent-org-name"
                        type="text"
                        value={draftEnt.organizationName}
                        onChange={(e) =>
                          setDraftEnt({
                            ...draftEnt,
                            organizationName: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ent-admin-name"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Admin Display Name
                      </label>
                      <input
                        id="ent-admin-name"
                        type="text"
                        value={draftEnt.adminDisplayName}
                        onChange={(e) =>
                          setDraftEnt({
                            ...draftEnt,
                            adminDisplayName: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ent-support-email"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Admin Support / Release Email
                      </label>
                      <input
                        id="ent-support-email"
                        type="email"
                        value={draftEnt.supportEmail}
                        onChange={(e) =>
                          setDraftEnt({
                            ...draftEnt,
                            supportEmail: e.target.value,
                          })
                        }
                        placeholder="admin@shayarilok.in"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ent-env-select"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Workspace Environment
                      </label>
                      <select
                        id="ent-env-select"
                        value={draftEnt.environment}
                        onChange={(e) =>
                          setDraftEnt({
                            ...draftEnt,
                            environment:
                              e.target.value === 'staging'
                                ? 'staging'
                                : 'production',
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        <option value="production">
                          Production (Live Users)
                        </option>
                        <option value="staging">Staging / QA Test</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveIdentityOrRules}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Identity</span>
                  </button>
                </div>
              )}

              {/* 02. Pre-Publish Guardrails */}
              {activeTab === 'guardrails' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      02. Pre-Publish Safety Guardrails
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      गलत या अधूरा <code className="font-mono">config.json</code> GitHub पर लाइव पुश होने से रोकने के लिए सुरक्षा नियम लागू करें।
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {[
                      {
                        key: 'requireCommitMessage' as const,
                        title: 'Require Custom Commit Message',
                        desc: 'बिना कस्टम कमिट मैसेज लिखे GitHub Publish ब्लॉक करें।',
                      },
                      {
                        key: 'strictSchemaGate' as const,
                        title: 'Strict Schema & URL Gate',
                        desc: 'खाली शायरी टेक्स्ट या गलत URL (https:// के बिना) होने पर Publish रोकें।',
                      },
                      {
                        key: 'confirmMaintenancePublish' as const,
                        title: 'Maintenance Mode Release Alert',
                        desc: 'अगर maintenance_mode ऑन हो तो पब्लिश करने से पहले चेतावनी/पुष्टि मांगें।',
                      },
                      {
                        key: 'confirmBeforePublish' as const,
                        title: 'Always Confirm Before GitHub PUT',
                        desc: 'हर Publish से पहले अंतिम पुष्टि डायलॉग दिखाएं।',
                      },
                    ].map((rule) => (
                      <div
                        key={rule.key}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {rule.title}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500">
                            {rule.desc}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={draftEnt[rule.key]}
                          aria-label={rule.title}
                          onClick={() =>
                            setDraftEnt({
                              ...draftEnt,
                              [rule.key]: !draftEnt[rule.key],
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                            draftEnt[rule.key]
                              ? 'bg-indigo-600'
                              : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              draftEnt[rule.key]
                                ? 'translate-x-5'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`p-4 rounded-xl border text-xs sm:text-sm ${
                      guardrailPreview.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {guardrailPreview.ok ? (
                      <div className="flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          Current draft passes all active pre-publish guardrails.
                        </span>
                      </div>
                    ) : (
                      <ul className="list-disc pl-4 space-y-1">
                        {guardrailPreview.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveIdentityOrRules}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Guardrails</span>
                  </button>
                </div>
              )}

              {/* 03. Auto-Save & Snapshots */}
              {activeTab === 'snapshots' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      03. Auto-Save & Snapshot Restore Points
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      बड़े बदलावों से पहले तुरंत रीस्टोर पॉइंट (Snapshot) सेव करें और 1-क्लिक में वापस रोलबैक करें।
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Auto-Save Local Draft
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500">
                        हर एडिट को स्वचालित रूप से ब्राउज़र LocalStorage में सेव रखें।
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draftEnt.autoSaveDraft}
                      aria-label="Toggle auto-save local draft"
                      onClick={() => {
                        const next = {
                          ...draftEnt,
                          autoSaveDraft: !draftEnt.autoSaveDraft,
                        };
                        setDraftEnt(next);
                        onSaveEnterprise(next);
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                        draftEnt.autoSaveDraft
                          ? 'bg-indigo-600'
                          : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          draftEnt.autoSaveDraft
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <form
                    onSubmit={handleCreateSnapshotSubmit}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <input
                      type="text"
                      value={snapshotLabel}
                      onChange={(e) => setSnapshotLabel(e.target.value)}
                      placeholder={`Checkpoint label (e.g. Before Diwali Update v${config.latest_version_code})`}
                      className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Restore Point</span>
                    </button>
                  </form>

                  {snapshots.length === 0 ? (
                    <p className="text-sm text-slate-500 py-8 border border-dashed border-slate-200 rounded-xl text-center">
                      अभी कोई स्थानीय स्नैपशॉट सेव नहीं है। ऊपर से पहला रीस्टोर पॉइंट बनाएं।
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {snapshots.map((snap) => (
                        <div
                          key={snap.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {snap.label}
                            </div>
                            <div className="text-xs text-slate-500 font-mono tabular-nums">
                              {snap.createdAt} · v{snap.versionCode} ·{' '}
                              {snap.shayariCount} shayaris
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreSnapshot(snap.id);
                                setFeedback({
                                  type: 'success',
                                  text: `Restored "${snap.label}".`,
                                });
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSnapshot(snap.id)}
                              aria-label={`Delete snapshot ${snap.label}`}
                              className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 04. JSON Backup Import / Export */}
              {activeTab === 'backup' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      04. JSON Backup Import & Export
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      किसी भी समय पूरा <code className="font-mono">config.json</code> या ऑडिट बैकअप डाउनलोड करें, या फाइल से तुरंत रीस्टोर करें।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 border border-slate-200 rounded-xl space-y-4">
                      <div className="text-base font-semibold text-slate-900">
                        Export Live Schema / Backup
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500">
                        बिना किसी सीक्रेट PAT के Android ऐप के 15-फील्ड JSON या फुल मेटाडेटा बैकअप डाउनलोड करें।
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={handleExportConfigOnly}
                          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download config.json</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              'backup-json',
                              serializeConfigJson(config),
                              'config.json'
                            )
                          }
                          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                        >
                          {copiedTag === 'backup-json' ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-700" />
                              <span className="text-emerald-700">Copied Successfully!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy Live JSON</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleExportFullBackup}
                          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                          <Download className="w-4 h-4" />
                          <span>Full Backup (.json)</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-5 border border-slate-200 rounded-xl space-y-4">
                      <div className="text-base font-semibold text-slate-900">
                        Import from JSON File
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500">
                        लोकल <code className="font-mono">config.json</code> या बैकअप फ़ाइल चुनकर सीधे वर्तमान ड्राफ्ट में लोड करें।
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={(e) => void handleImportJsonFile(e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Choose JSON File to Restore</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 05. Bulk Shayari Importer (Full-Page 2-Column Split) */}
              {activeTab === 'bulk_import' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      05. Bulk Shayari Batch Importer
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      एक साथ दर्जनों हिंदी/Hinglish शायरियाँ इम्पोर्ट करें। प्रत्येक शायरी को <code className="font-mono">---</code> या खाली लाइन से अलग करें (या JSON array पेस्ट करें)।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="bulk-cat-select"
                            className="block text-xs font-semibold text-slate-700 mb-1.5"
                          >
                            Default Category
                          </label>
                          <select
                            id="bulk-cat-select"
                            value={bulkCategory}
                            onChange={(e) => setBulkCategory(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                          >
                            {config.categories
                              .filter((c) => c !== 'All')
                              .map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="bulk-author-input"
                            className="block text-xs font-semibold text-slate-700 mb-1.5"
                          >
                            Default Author
                          </label>
                          <input
                            id="bulk-author-input"
                            type="text"
                            value={bulkAuthor}
                            onChange={(e) => setBulkAuthor(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label
                            htmlFor="bulk-shayari-textarea"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            Paste Multi-Line Shayaris (separated by ---)
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(
                                'bulk-sample',
                                'तेरी ख़ामोशी भी मुझसे कुछ कहती है,\nहर धड़कन में तेरी ही याद रहती है।\n---\nमंज़िलें उन्हीं को मिलती हैं जिनके सपनों में जान होती है,\nपंखों से कुछ नहीं होता, हौसलों से उड़ान होती है।',
                                'Bulk Batch Template'
                              )
                            }
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
                          >
                            {copiedTag === 'bulk-sample' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span className="text-emerald-700">Copied Successfully!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Sample Format</span>
                              </>
                            )}
                          </button>
                        </div>
                        <textarea
                          id="bulk-shayari-textarea"
                          rows={9}
                          value={bulkInput}
                          onChange={(e) => setBulkInput(e.target.value)}
                          placeholder={
                            'पहली शायरी यहाँ लिखें,\nदूसरी लाइन यहाँ।\n---\nदूसरी शायरी यहाँ लिखें,\nनई लाइन के साथ।'
                          }
                          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs sm:text-sm text-slate-600 font-mono tabular-nums">
                          Ready to import:{' '}
                          <strong>{bulkPreview.itemsToAdd.length}</strong> new ·
                          Skipped duplicates:{' '}
                          <strong>{bulkPreview.skippedDuplicates}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={handleBulkImportSubmit}
                          disabled={bulkPreview.itemsToAdd.length === 0}
                          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <FileUp className="w-4 h-4" />
                          <span>Import Shayaris</span>
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-5 border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Live Parsed Preview</span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {bulkPreview.itemsToAdd.length} entries
                        </span>
                      </div>
                      {bulkPreview.itemsToAdd.length === 0 ? (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          बाईं ओर शायरियाँ पेस्ट करें — यहाँ ऑटो-जनरेटेड ID और प्रीव्यू दिखेगा।
                        </p>
                      ) : (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto">
                          {bulkPreview.itemsToAdd.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5"
                            >
                              <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                                #{item.id} · {item.category} · {item.author}
                              </div>
                              <p className="text-xs text-slate-800 whitespace-pre-line shayari-prose">
                                {item.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 06. Duplicate & Hygiene Auditor */}
              {activeTab === 'hygiene' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-slate-900">
                        06. Duplicate & Data Hygiene Auditor
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        डुप्लिकेट शायरियाँ, अनमैप्ड कैटेगरी, अमान्य URLs और AdMob IDs का रियल-टाइम ऑडिट।
                      </p>
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-slate-700">
                      Issues Found: {hygiene.issueCount}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500">Duplicates</div>
                      <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        {hygiene.duplicateShayaris.length}
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500">Empty Texts</div>
                      <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        {hygiene.emptyShayarisCount}
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500">
                        Unmapped Categories
                      </div>
                      <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        {hygiene.unmappedCategories.length}
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500">
                        Invalid URL / Ad IDs
                      </div>
                      <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        {hygiene.invalidUrls.length +
                          hygiene.invalidAdIds.length}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCleanDuplicates}
                      disabled={
                        hygiene.duplicateShayaris.length === 0 &&
                        hygiene.emptyShayarisCount === 0
                      }
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Remove Duplicates & Empty</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncCategories}
                      disabled={hygiene.unmappedCategories.length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                    >
                      <span>Sync Unmapped Categories</span>
                    </button>
                  </div>

                  {hygiene.issueCount === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
                      बढ़िया! आपके वर्तमान config.json में कोई डुप्लिकेट या स्कीमा त्रुटि नहीं मिली।
                    </div>
                  ) : (
                    <div className="space-y-2 border border-slate-200 rounded-xl p-4 text-xs text-slate-700">
                      {hygiene.invalidUrls.map((u) => (
                        <div key={u}>Invalid URL field: {u}</div>
                      ))}
                      {hygiene.invalidAdIds.map((ad) => (
                        <div key={ad}>Invalid AdMob ID field: {ad}</div>
                      ))}
                      {hygiene.unmappedCategories.map((c) => (
                        <div key={c}>Unmapped category in shayari_list: {c}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 07. Printable Corporate Release & Audit Sheet */}
              {activeTab === 'print_report' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6 print-sheet">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-900">
                        {enterprise.organizationName} — Release Audit Blueprint
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {config.app_name} ({PACKAGE_ID}) · Environment:{' '}
                        {enterprise.environment}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 no-print self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            'release-summary',
                            `${enterprise.organizationName} Release Audit\nApp: ${config.app_name} (${PACKAGE_ID})\nVersion: v${config.latest_version_code}\nShayaris: ${config.shayari_list.length}\nMaintenance: ${config.maintenance_mode ? 'ON' : 'OFF'}\nAdMob: ${config.ads_enabled ? 'Enabled' : 'Paused'}\nGitHub: ${githubSettings.owner}/${githubSettings.repo}@${githubSettings.branch}/${githubSettings.path}`,
                            'Release Audit Summary'
                          )
                        }
                        className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                      >
                        {copiedTag === 'release-summary' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-700" />
                            <span className="text-emerald-700">Copied Successfully!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Report</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print / Save PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-slate-500">Version Code</div>
                      <div className="mt-1 font-mono font-bold text-slate-900 text-xl tabular-nums">
                        v{config.latest_version_code}
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-slate-500">Total Shayaris</div>
                      <div className="mt-1 font-mono font-bold text-slate-900 text-xl tabular-nums">
                        {config.shayari_list.length}
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-slate-500">Maintenance Mode</div>
                      <div className="mt-1 font-semibold text-slate-900 text-base">
                        {config.maintenance_mode ? 'ENABLED' : 'OFF (Live)'}
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-slate-500">AdMob Ads</div>
                      <div className="mt-1 font-semibold text-slate-900 text-base">
                        {config.ads_enabled ? 'Enabled' : 'Paused'}
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Category</th>
                          <th className="py-3 px-4 font-semibold text-right">
                            Shayari Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categoryDistribution.map(([cat, count]) => (
                          <tr key={cat}>
                            <td className="py-3 px-4 text-slate-800">{cat}</td>
                            <td className="py-3 px-4 font-mono text-right tabular-nums text-slate-900 font-semibold">
                              {count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm space-y-1.5 font-mono text-slate-700">
                    <div>
                      GitHub Target:{' '}
                      {githubSettings.owner && githubSettings.repo
                        ? `${githubSettings.owner}/${githubSettings.repo}@${githubSettings.branch}/${githubSettings.path}`
                        : 'Not configured'}
                    </div>
                    <div>Active SHA: {currentSha || 'None'}</div>
                    <div>Proxy Mode: {proxySettings.mode}</div>
                    <div>
                      Prepared By: {enterprise.adminDisplayName} (
                      {enterprise.supportEmail || 'admin'})
                    </div>
                  </div>
                </div>
              )}

              {/* 08. Passcode Quick-Lock */}
              {activeTab === 'pin_lock' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      08. Admin Passcode Quick-Lock
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      डिवाइस शेयर करते समय एडमिन पैनल को सुरक्षित रखने के लिए 4–8 अंकों का लोकल PIN लॉक सेट करें।
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => void handleSavePin(e)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    <div>
                      <label
                        htmlFor="pin-new-input"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        New Admin PIN (4–8 digits)
                      </label>
                      <input
                        id="pin-new-input"
                        type="password"
                        inputMode="numeric"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="••••"
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pin-confirm-input"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Confirm PIN
                      </label>
                      <input
                        id="pin-confirm-input"
                        type="password"
                        inputMode="numeric"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="••••"
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                      >
                        <Lock className="w-4 h-4" />
                        <span>
                          {draftEnt.pinHash
                            ? 'Update Admin PIN'
                            : 'Enable PIN Lock'}
                        </span>
                      </button>

                      {draftEnt.pinHash && (
                        <>
                          <button
                            type="button"
                            onClick={onLockNow}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Lock Admin Now</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemovePin}
                            className="px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            Disable PIN
                          </button>
                        </>
                      )}
                    </div>
                  </form>

                  <div className="pt-5 border-t border-slate-100">
                    <label
                      htmlFor="auto-lock-select"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Idle Auto-Lock Timeout
                    </label>
                    <select
                      id="auto-lock-select"
                      value={draftEnt.autoLockMinutes}
                      disabled={!draftEnt.pinHash}
                      onChange={(e) => {
                        const next = {
                          ...draftEnt,
                          autoLockMinutes: Number(e.target.value) || 0,
                        };
                        setDraftEnt(next);
                        onSaveEnterprise(next);
                      }}
                      className="w-full sm:w-72 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg disabled:opacity-50"
                    >
                      <option value={0}>Off (Manual Lock Only)</option>
                      <option value={5}>After 5 minutes idle</option>
                      <option value={15}>After 15 minutes idle</option>
                      <option value={30}>After 30 minutes idle</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 09. Density & Typography */}
              {activeTab === 'appearance' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      09. Display Density & Devanagari Typography
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      बड़े शायरी कलेक्शन को आसानी से पढ़ने और एडिट करने के लिए स्पेसिंग और देवनागरी फ़ॉन्ट साइज़ चुनें।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 border border-slate-200 rounded-xl space-y-3">
                      <div className="text-sm font-semibold text-slate-800">
                        Workspace Density
                      </div>
                      <div className="flex gap-2.5">
                        {(['comfortable', 'compact'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              const next = { ...draftEnt, density: mode };
                              setDraftEnt(next);
                              onSaveEnterprise(next);
                            }}
                            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border capitalize ${
                              draftEnt.density === mode
                                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-semibold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 border border-slate-200 rounded-xl space-y-3">
                      <div className="text-sm font-semibold text-slate-800">
                        Devanagari Editor Font Size
                      </div>
                      <div className="flex gap-2.5">
                        {(['standard', 'large'] as const).map((scale) => (
                          <button
                            key={scale}
                            type="button"
                            onClick={() => {
                              const next = {
                                ...draftEnt,
                                devanagariScale: scale,
                              };
                              setDraftEnt(next);
                              onSaveEnterprise(next);
                            }}
                            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border capitalize ${
                              draftEnt.devanagariScale === scale
                                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-semibold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            {scale}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 10. Security Vault & Activity Audit Log */}
              {activeTab === 'security_vault' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      10. Security Vault, Activity Audit & Reset
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      स्थानीय स्टोरेज उपयोग, हाल के एडमिन एक्शन लॉग और इमरजेंसी PAT वाइप / रीसेट विकल्प।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-slate-500">LocalStorage Used</div>
                      <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                        {storageKb} KB
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-slate-500">GitHub PAT Vault</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {githubSettings.token.trim()
                          ? 'Stored Locally'
                          : 'Empty / Cleared'}
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <div className="text-slate-500">Cloud Auth Session</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                        {user ? user.email : 'Local Mode Only'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onWipePat();
                        setFeedback({
                          type: 'success',
                          text: 'GitHub PAT LocalStorage से सुरक्षित रूप से हटा दिया गया।',
                        });
                      }}
                      disabled={!githubSettings.token.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Panic Wipe PAT Token</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateConfig({ ...baselineConfig });
                        onLogAction('Draft Reverted', 'Reverted to baseline');
                        setFeedback({
                          type: 'success',
                          text: 'स्थानीय ड्राफ्ट को अंतिम सिंक बेसलाइन पर रीसेट किया गया।',
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Revert to Baseline</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onResetToSeed();
                        setFeedback({
                          type: 'success',
                          text: `Default ${DEFAULT_CONFIG.shayari_list.length}-shayari seed loaded.`,
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <span>Restore Factory Seed</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <History className="w-4 h-4 text-slate-500" />
                        <span>Local Admin Activity Log</span>
                      </div>
                      {auditLog.length > 0 && (
                        <button
                          type="button"
                          onClick={onClearAuditLog}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          Clear Log
                        </button>
                      )}
                    </div>

                    {auditLog.length === 0 ? (
                      <p className="text-sm text-slate-500 py-6 border border-dashed border-slate-200 rounded-xl text-center">
                        अभी कोई स्थानीय एक्टिविटी रिकॉर्ड नहीं हुई है।
                      </p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs sm:text-sm">
                        {auditLog.map((entry) => (
                          <div
                            key={entry.id}
                            className="px-4 py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800">
                                {entry.action}
                              </span>
                              <span className="text-slate-400"> · </span>
                              <span className="text-slate-600">
                                {entry.detail}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                              {entry.timestamp}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Full-Page Prev / Next Switcher */}
              <div className="flex items-center justify-between gap-4 pt-2 no-print">
                {prevOption ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      onSelectTab(prevOption.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>
                      {prevOption.code}. {prevOption.label}
                    </span>
                  </button>
                ) : (
                  <div />
                )}

                {nextOption && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      onSelectTab(nextOption.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                  >
                    <span>
                      {nextOption.code}. {nextOption.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};
