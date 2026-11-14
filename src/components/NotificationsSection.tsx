import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bell,
  Check,
  CloudUpload,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Megaphone,
  Pencil,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { copyTextWithFeedback } from '../utils/clipboardToast';
import type {
  NotificationItem,
  PhotoShayariCard,
  PhotoShayariThemeId,
  ShayariLokConfig,
  SuvicharItem,
  WebsiteContentSettings,
  WebsiteVisibilityControls,
} from '../types/config';
import { getNextId } from '../utils/configHelpers';
import {
  DEFAULT_WEBSITE_SOCIAL_LINKS,
  PHOTO_THEME_META,
} from '../utils/websiteContent';

interface NotificationsSectionProps {
  config: ShayariLokConfig;
  onUpdate: (patch: Partial<ShayariLokConfig>) => void;
  websiteContent: WebsiteContentSettings;
  onUpdateWebsiteContent: (next: WebsiteContentSettings) => void;
  standaloneWebsiteUrl: string;
  user: User | null;
  liveSyncing: boolean;
  onSyncLiveWebsiteNow: () => Promise<void>;
}

const CONTROL_ITEMS: Array<{
  key: keyof WebsiteVisibilityControls;
  label: string;
  description: string;
}> = [
  {
    key: 'showNotificationBell',
    label: 'Website Notification Bell',
    description: 'वेबसाइट हेडर में लाइव बेल आइकॉन और अलर्ट ड्रॉअर दिखाएँ।',
  },
  {
    key: 'showAnnouncementBanner',
    label: 'Announcement Banner',
    description: 'होम पेज और बेल ड्रॉअर में मुख्य अनाउंसमेंट दिखाएँ।',
  },
  {
    key: 'showPhotoShayariSection',
    label: 'Photo Shayari Cards',
    description: 'वेबसाइट पर फोटो बैकग्राउंड वाली डिज़ाइन शायरियाँ दिखाएँ।',
  },
  {
    key: 'showSuvicharSection',
    label: 'Daily Suvichar Section',
    description: 'होम पेज व नेविगेशन में आज के सुविचार (Suvichar) दिखाएँ।',
  },
  {
    key: 'showMaintenanceNotice',
    label: 'Maintenance Notice Strip',
    description: 'जब Maintenance Mode ऑन हो तब वेबसाइट पर पीली चेतावनी दिखाएँ।',
  },
];

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  config,
  onUpdate,
  websiteContent,
  onUpdateWebsiteContent,
  standaloneWebsiteUrl,
  user,
  liveSyncing,
  onSyncLiveWebsiteNow,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [badge, setBadge] = useState('Shayari Alert');
  const [timeLabel, setTimeLabel] = useState('Today');
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Suvichar Quick Form
  const [suvText, setSuvText] = useState('');
  const [suvAuthor, setSuvAuthor] = useState('');
  const [suvCategory, setSuvCategory] = useState('प्रेरणा');
  const [suvError, setSuvError] = useState('');

  // Photo Shayari Quick Form
  const [photoText, setPhotoText] = useState('');
  const [photoAuthor, setPhotoAuthor] = useState('');
  const [photoCategory, setPhotoCategory] = useState('Love');
  const [photoTheme, setPhotoTheme] =
    useState<PhotoShayariThemeId>('sunset_love');
  const [photoError, setPhotoError] = useState('');

  const nextId = useMemo(
    () => getNextId(config.notifications),
    [config.notifications]
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setBadge('Shayari Alert');
    setTimeLabel('Today');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('नोटिफिकेशन का Title और Message दोनों भरें।');
      return;
    }

    if (editingId !== null) {
      const updated = config.notifications.map((n) =>
        n.id === editingId
          ? {
              ...n,
              title: title.trim(),
              message: message.trim(),
              badge: badge.trim() || 'App Info',
              time_label: timeLabel.trim() || 'Today',
            }
          : n
      );
      onUpdate({ notifications: updated });
      resetForm();
      return;
    }

    const created: NotificationItem = {
      id: nextId,
      title: title.trim(),
      message: message.trim(),
      badge: badge.trim() || 'Shayari Alert',
      time_label: timeLabel.trim() || 'Today',
    };

    onUpdate({ notifications: [created, ...config.notifications] });
    resetForm();
  };

  const handleStartEdit = (item: NotificationItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.message);
    setBadge(item.badge);
    setTimeLabel(item.time_label);
    setError('');
  };

  const handleDelete = (id: number) => {
    onUpdate({
      notifications: config.notifications.filter((n) => n.id !== id),
    });
    if (editingId === id) {
      resetForm();
    }
  };

  const toggleWebsiteControl = (key: keyof WebsiteVisibilityControls) => {
    onUpdateWebsiteContent({
      ...websiteContent,
      controls: {
        ...websiteContent.controls,
        [key]: !websiteContent.controls[key],
      },
    });
  };

  const handleAddSuvichar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suvText.trim()) {
      setSuvError('कृपया सुविचार टेक्स्ट लिखें।');
      return;
    }
    const maxId = websiteContent.suvichar_list.reduce(
      (max, item) => (item.id > max ? item.id : max),
      0
    );
    const created: SuvicharItem = {
      id: maxId + 1,
      text: suvText.trim(),
      author: suvAuthor.trim() || 'शायरी लोक',
      category: suvCategory.trim() || 'प्रेरणा',
    };
    onUpdateWebsiteContent({
      ...websiteContent,
      suvichar_list: [created, ...websiteContent.suvichar_list],
    });
    setSuvText('');
    setSuvAuthor('');
    setSuvError('');
  };

  const handleDeleteSuvichar = (id: number) => {
    onUpdateWebsiteContent({
      ...websiteContent,
      suvichar_list: websiteContent.suvichar_list.filter((s) => s.id !== id),
    });
  };

  const handleAddPhotoShayari = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoText.trim()) {
      setPhotoError('कृपया फोटो शायरी टेक्स्ट लिखें।');
      return;
    }
    const maxId = websiteContent.photo_shayari_list.reduce(
      (max, item) => (item.id > max ? item.id : max),
      0
    );
    const created: PhotoShayariCard = {
      id: maxId + 1,
      text: photoText.trim(),
      author: photoAuthor.trim() || 'शायरी लोक',
      category: photoCategory.trim() || 'Love',
      theme: photoTheme,
    };
    onUpdateWebsiteContent({
      ...websiteContent,
      photo_shayari_list: [created, ...websiteContent.photo_shayari_list],
    });
    setPhotoText('');
    setPhotoAuthor('');
    setPhotoError('');
  };

  const handleDeletePhotoShayari = (id: number) => {
    onUpdateWebsiteContent({
      ...websiteContent,
      photo_shayari_list: websiteContent.photo_shayari_list.filter(
        (p) => p.id !== id
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Real-Time Website Notification & Section Control Center */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Sliders className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Real-Time Website Notification &amp; Section Controller
              </h2>
              <p className="text-sm text-slate-500">
                यहाँ से किए गए हर बदलाव और टॉगल का असर आपकी लाइव वेबसाइट (फोटो शायरी, सुविचार और नोटिफिकेशन बेल) पर तुरंत रीयल-टाइम होता है।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {user && (
              <button
                type="button"
                disabled={liveSyncing}
                onClick={() => void onSyncLiveWebsiteNow()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-60"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>
                  {liveSyncing ? 'Syncing Cloud...' : 'Push Cloud Live Sync'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                void copyTextWithFeedback(standaloneWebsiteUrl, 'Website URL').then((ok) => {
                  if (ok) {
                    setCopiedUrl(true);
                    window.setTimeout(() => setCopiedUrl(false), 2000);
                  }
                });
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-700 font-semibold">Copied Successfully!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Website URL</span>
                </>
              )}
            </button>

            <a
              href={standaloneWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <span>Open Separate Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CONTROL_ITEMS.map((item) => {
            const active = websiteContent.controls[item.key];
            return (
              <label
                key={item.key}
                className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  active
                    ? 'bg-indigo-50/45 border-indigo-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleWebsiteControl(item.key)}
                  aria-label={item.label}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                />
              </label>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          <div>
            <label
              htmlFor="website-hero-headline"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Website Hero Headline (Live)
            </label>
            <input
              id="website-hero-headline"
              type="text"
              value={websiteContent.heroHeadline}
              onChange={(e) =>
                onUpdateWebsiteContent({
                  ...websiteContent,
                  heroHeadline: e.target.value,
                })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="website-hero-subheadline"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Website Hero Subheadline (Live)
            </label>
            <input
              id="website-hero-subheadline"
              type="text"
              value={websiteContent.heroSubheadline}
              onChange={(e) =>
                onUpdateWebsiteContent({
                  ...websiteContent,
                  heroSubheadline: e.target.value,
                })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="text-xs font-semibold text-slate-700">
            Website Footer Social Media Links (WhatsApp · Facebook · Instagram · YouTube)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                { key: 'whatsapp', label: 'WhatsApp Channel / Link' },
                { key: 'facebook', label: 'Facebook Page URL' },
                { key: 'instagram', label: 'Instagram Profile URL' },
                { key: 'youtube', label: 'YouTube Channel URL' },
              ] as const
            ).map((soc) => {
              const currentLinks =
                websiteContent.socialLinks ?? DEFAULT_WEBSITE_SOCIAL_LINKS;
              return (
                <div key={soc.key}>
                  <label
                    htmlFor={`website-social-${soc.key}`}
                    className="block text-[11px] font-medium text-slate-500 mb-1"
                  >
                    {soc.label}
                  </label>
                  <input
                    id={`website-social-${soc.key}`}
                    type="url"
                    value={currentLinks[soc.key]}
                    onChange={(e) =>
                      onUpdateWebsiteContent({
                        ...websiteContent,
                        socialLinks: {
                          ...currentLinks,
                          [soc.key]: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* In-App & Website Announcement Banner Editor */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Home Screen &amp; Website Announcement Banner
              </h2>
              <p className="text-sm text-slate-500">
                यूजर ऐप और लाइव वेबसाइट दोनों में दिखने वाला मुख्य अनाउंसमेंट शीर्षक और संदेश।
              </p>
            </div>
          </div>
          <span className="hidden sm:inline font-mono text-xs text-slate-400">
            announcement_title · announcement_message
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label
                htmlFor="announcement-title-input"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Announcement Title
              </label>
              <input
                id="announcement-title-input"
                type="text"
                value={config.announcement_title}
                onChange={(e) =>
                  onUpdate({ announcement_title: e.target.value })
                }
                placeholder="नई हिंदी शायरी संग्रह लाइव है"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="announcement-message-input"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Announcement Message
              </label>
              <textarea
                id="announcement-message-input"
                rows={3}
                value={config.announcement_message}
                onChange={(e) =>
                  onUpdate({ announcement_message: e.target.value })
                }
                placeholder="आज की ताज़ा शायरियाँ पढ़ें और WhatsApp पर शेयर करें..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="text-xs font-medium text-slate-500">
              Live App &amp; Website Banner Preview
            </div>
            <div className="font-display text-sm font-semibold text-slate-900">
              {config.announcement_title || 'Announcement Title'}
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {config.announcement_message ||
                'Your announcement message will appear here inside the Android app and Website.'}
            </p>
          </div>
        </div>
      </section>

      {/* Bell Notifications CRUD */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                {editingId !== null
                  ? `Edit Notification #${editingId}`
                  : 'Add Bell Notification'}
              </h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                {editingId !== null ? `ID #${editingId}` : `Next ID: #${nextId}`}
              </p>
            </div>
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="notif-title-input"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Title
              </label>
              <input
                id="notif-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                placeholder="आज की ख़ास शायरी"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="notif-message-input"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Message
              </label>
              <textarea
                id="notif-message-input"
                rows={3}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (error) setError('');
                }}
                placeholder="दिल को छू लेने वाली नई शायरियाँ लाइव हैं।"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="notif-badge-input"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Badge Type
                </label>
                <input
                  id="notif-badge-input"
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Shayari Alert"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="notif-time-input"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Time Label
                </label>
                <input
                  id="notif-time-input"
                  type="text"
                  value={timeLabel}
                  onChange={(e) => setTimeLabel(e.target.value)}
                  placeholder="Today / Pinned"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>
                {editingId !== null
                  ? 'Update Notification'
                  : 'Add Notification'}
              </span>
            </button>
          </form>
        </section>

        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-500" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                App &amp; Website Bell Notifications ({config.notifications.length})
              </h2>
            </div>
          </div>

          {config.notifications.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl">
              <p className="text-sm font-medium text-slate-700">
                कोई नोटिफिकेशन नहीं है
              </p>
              <p className="text-xs text-slate-500 mt-1">
                यूजर ऐप और वेबसाइट के बेल आइकॉन में दिखाने के लिए बाएँ फ़ॉर्म से नया अलर्ट जोड़ें।
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {config.notifications.map((item) => (
                <article
                  key={item.id}
                  className={`p-4 transition-colors ${
                    editingId === item.id
                      ? 'bg-indigo-50/50'
                      : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-indigo-700">
                          {item.badge}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.time_label}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          ID #{item.id}
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600">{item.message}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        aria-label={`Edit notification #${item.id}`}
                        className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Delete notification #${item.id}`}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Live Website Photo Shayari & Suvichar Publishers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Photo Shayari Studio Manager */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Website Photo Shayari Studio ({websiteContent.photo_shayari_list.length})
              </h2>
              <p className="text-xs text-slate-500">
                फोटो बैकग्राउंड के साथ वेबसाइट पर दिखने वाली शायरियाँ जोड़ें या हटाएँ।
              </p>
            </div>
          </div>

          <form onSubmit={handleAddPhotoShayari} className="space-y-3">
            <textarea
              rows={2}
              value={photoText}
              onChange={(e) => {
                setPhotoText(e.target.value);
                if (photoError) setPhotoError('');
              }}
              placeholder="फोटो के ऊपर दिखने वाली शायरी लिखें..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <div className="grid grid-cols-3 gap-2.5">
              <input
                type="text"
                value={photoCategory}
                onChange={(e) => setPhotoCategory(e.target.value)}
                placeholder="Category (Love)"
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={photoAuthor}
                onChange={(e) => setPhotoAuthor(e.target.value)}
                placeholder="Author"
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <select
                value={photoTheme}
                onChange={(e) =>
                  setPhotoTheme(e.target.value as PhotoShayariThemeId)
                }
                aria-label="Photo backdrop theme"
                className="px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                {(Object.keys(PHOTO_THEME_META) as PhotoShayariThemeId[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {PHOTO_THEME_META[key].label}
                    </option>
                  )
                )}
              </select>
            </div>
            {photoError && (
              <div className="text-xs text-red-700">{photoError}</div>
            )}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Photo Shayari to Website</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
            {websiteContent.photo_shayari_list.map((card) => (
              <div
                key={card.id}
                className="p-3.5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-[11px] font-mono text-slate-500">
                    {card.category} · {PHOTO_THEME_META[card.theme].label} ·{' '}
                    {card.author}
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-line line-clamp-2">
                    {card.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePhotoShayari(card.id)}
                  aria-label={`Delete photo shayari #${card.id}`}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Suvichar Manager */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Website Suvichar Manager ({websiteContent.suvichar_list.length})
              </h2>
              <p className="text-xs text-slate-500">
                लाइव वेबसाइट के सुविचार सेक्शन के लिए प्रेरक विचार जोड़ें या प्रबंधित करें।
              </p>
            </div>
          </div>

          <form onSubmit={handleAddSuvichar} className="space-y-3">
            <textarea
              rows={2}
              value={suvText}
              onChange={(e) => {
                setSuvText(e.target.value);
                if (suvError) setSuvError('');
              }}
              placeholder="नया हिंदी सुविचार लिखें..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                value={suvCategory}
                onChange={(e) => setSuvCategory(e.target.value)}
                placeholder="Category (सफलता)"
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={suvAuthor}
                onChange={(e) => setSuvAuthor(e.target.value)}
                placeholder="लेखक / स्रोत"
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
            {suvError && <div className="text-xs text-red-700">{suvError}</div>}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Suvichar to Website</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
            {websiteContent.suvichar_list.map((suv) => (
              <div
                key={suv.id}
                className="p-3.5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-[11px] font-mono text-amber-800">
                    {suv.category} · {suv.author}
                  </div>
                  <p className="text-xs text-slate-800 line-clamp-2">
                    {suv.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSuvichar(suv.id)}
                  aria-label={`Delete suvichar #${suv.id}`}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
