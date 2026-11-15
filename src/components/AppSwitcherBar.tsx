import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Layers,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { ManagedAppProfile } from '../utils/multiAppRegistry';

interface AppSwitcherBarProps {
  apps: ManagedAppProfile[];
  activeAppId: string;
  onSelectApp: (appId: string) => void;
  onCreateApp: (input: {
    name: string;
    packageId: string;
    githubPath: string;
  }) => void;
  onDeleteApp: (appId: string) => void;
}

const ACCENT_DOT: Record<ManagedAppProfile['accentColor'], string> = {
  indigo: 'bg-indigo-600',
  emerald: 'bg-emerald-600',
  rose: 'bg-rose-600',
  amber: 'bg-amber-600',
};

export const AppSwitcherBar: React.FC<AppSwitcherBarProps> = ({
  apps,
  activeAppId,
  onSelectApp,
  onCreateApp,
  onDeleteApp,
}) => {
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [packageId, setPackageId] = useState('');
  const [githubPath, setGithubPath] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const activeApp = apps.find((a) => a.id === activeAppId) ?? apps[0];

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('कृपया नए ऐप का नाम दर्ज करें।');
      return;
    }
    if (!packageId.trim() || !packageId.includes('.')) {
      setError('सही Android Package ID दर्ज करें (जैसे: com.cyberking.suvichar)।');
      return;
    }
    onCreateApp({
      name: name.trim(),
      packageId: packageId.trim(),
      githubPath: githubPath.trim(),
    });
    setName('');
    setPackageId('');
    setGithubPath('');
    setError('');
    setShowAddForm(false);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch managed Android app"
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors max-w-[170px] sm:max-w-[230px]"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${ACCENT_DOT[activeApp.accentColor]}`}
          aria-hidden="true"
        />
        <span className="truncate">{activeApp.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 ring-1 ring-slate-900/5 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Multi-App Switcher ({apps.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
            >
              {showAddForm ? (
                <>
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span>Add App</span>
                </>
              )}
            </button>
          </div>

          {showAddForm ? (
            <form onSubmit={handleSubmit} className="p-3.5 space-y-3">
              <div>
                <label
                  htmlFor="new-app-name"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  App Name
                </label>
                <input
                  id="new-app-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. Suvichar Lok"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="new-app-package"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Android Package ID
                </label>
                <input
                  id="new-app-package"
                  type="text"
                  value={packageId}
                  onChange={(e) => {
                    setPackageId(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="com.cyberking.suvicharlok"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="new-app-path"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  GitHub Config Path (Optional)
                </label>
                <input
                  id="new-app-path"
                  type="text"
                  value={githubPath}
                  onChange={(e) => setGithubPath(e.target.value)}
                  placeholder="apps/suvichar/config.json"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {error && (
                <p className="text-[11px] font-medium text-red-700">{error}</p>
              )}

              <button
                type="submit"
                className="w-full px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Create &amp; Switch App
              </button>
            </form>
          ) : (
            <div
              role="listbox"
              aria-label="Managed applications"
              className="divide-y divide-slate-100 max-h-72 overflow-y-auto"
            >
              {apps.map((app) => {
                const selected = app.id === activeAppId;
                return (
                  <div
                    key={app.id}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${
                      selected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onSelectApp(app.id);
                        setOpen(false);
                      }}
                      className="flex-1 min-w-0 text-left flex items-start gap-2.5"
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ACCENT_DOT[app.accentColor]}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{app.name}</span>
                          {selected && (
                            <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">
                          {app.packageId} · {app.githubPath}
                        </div>
                      </div>
                    </button>

                    {app.id !== 'default' && (
                      <button
                        type="button"
                        onClick={() => onDeleteApp(app.id)}
                        aria-label={`Remove app ${app.name}`}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
