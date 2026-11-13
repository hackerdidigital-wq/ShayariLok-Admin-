import React, { useMemo, useState } from 'react';
import { Bell, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { NotificationItem, ShayariLokConfig } from '../types/config';
import { getNextId } from '../utils/configHelpers';

interface NotificationsSectionProps {
  config: ShayariLokConfig;
  onUpdate: (patch: Partial<ShayariLokConfig>) => void;
}

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  config,
  onUpdate,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [badge, setBadge] = useState('Shayari Alert');
  const [timeLabel, setTimeLabel] = useState('Today');
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-6">
      {/* In-App Announcement Banner Editor */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Home Screen Announcement Banner
              </h2>
              <p className="text-sm text-slate-500">
                यूजर ऐप में दिखने वाला मुख्य अनाउंसमेंट शीर्षक और संदेश।
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
              User App Banner Preview
            </div>
            <div className="font-display text-sm font-semibold text-slate-900">
              {config.announcement_title || 'Announcement Title'}
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {config.announcement_message ||
                'Your announcement message will appear here inside the Android app.'}
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
                App Bell Notifications ({config.notifications.length})
              </h2>
            </div>
          </div>

          {config.notifications.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl">
              <p className="text-sm font-medium text-slate-700">
                कोई नोटिफिकेशन नहीं है
              </p>
              <p className="text-xs text-slate-500 mt-1">
                यूजर ऐप के बेल आइकॉन में दिखाने के लिए बाएँ फ़ॉर्म से नया अलर्ट जोड़ें।
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {config.notifications.map((item) => (
                <article
                  key={item.id}
                  className={`p-4 transition-colors ${
                    editingId === item.id ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50/70'
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
    </div>
  );
};
