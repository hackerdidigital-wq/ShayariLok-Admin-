import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  FileDown,
  FileUp,
  Layers,
  Lock,
  MoreVertical,
  Printer,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCog,
} from 'lucide-react';
import type { EnterpriseTabId } from '../utils/enterpriseSettings';

export interface EnterpriseMenuOption {
  id: EnterpriseTabId;
  code: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ENTERPRISE_MENU_OPTIONS: EnterpriseMenuOption[] = [
  {
    id: 'identity',
    code: '01',
    label: 'Workspace & Brand Identity',
    subtitle: 'Org name, admin profile & environment',
    icon: UserCog,
  },
  {
    id: 'guardrails',
    code: '02',
    label: 'Pre-Publish Guardrails',
    subtitle: 'Release safety gates & schema locks',
    icon: ShieldCheck,
  },
  {
    id: 'snapshots',
    code: '03',
    label: 'Auto-Save & Snapshots',
    subtitle: 'Create & restore config checkpoints',
    icon: Layers,
  },
  {
    id: 'backup',
    code: '04',
    label: 'JSON Backup Import / Export',
    subtitle: 'Full workspace backup & file restore',
    icon: FileDown,
  },
  {
    id: 'bulk_import',
    code: '05',
    label: 'Bulk Shayari Importer',
    subtitle: 'Batch import multi-line or JSON shayaris',
    icon: FileUp,
  },
  {
    id: 'hygiene',
    code: '06',
    label: 'Duplicate & Hygiene Auditor',
    subtitle: 'Clean duplicates & unmapped categories',
    icon: Sparkles,
  },
  {
    id: 'print_report',
    code: '07',
    label: 'Printable Release Sheet',
    subtitle: 'Corporate config blueprint & PDF print',
    icon: Printer,
  },
  {
    id: 'pin_lock',
    code: '08',
    label: 'Passcode Quick-Lock',
    subtitle: 'Admin PIN screen & idle lock timer',
    icon: Lock,
  },
  {
    id: 'appearance',
    code: '09',
    label: 'Density & Typography',
    subtitle: 'Compact view & Devanagari text scale',
    icon: SlidersHorizontal,
  },
  {
    id: 'security_vault',
    code: '10',
    label: 'Security Vault & Audit Log',
    subtitle: 'Activity trail, PAT wipe & reset',
    icon: Activity,
  },
];

interface AdminBrandMenuProps {
  environment: 'production' | 'staging';
  onSelectSetting: (tab: EnterpriseTabId | null) => void;
  onLockNow?: () => void;
  hasPin: boolean;
  align?: 'left' | 'right';
}

export const AdminBrandMenu: React.FC<AdminBrandMenuProps> = ({
  environment,
  onSelectSetting,
  onLockNow,
  hasPin,
  align = 'left',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open admin enterprise settings menu"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Enterprise Settings Menu"
        className={`p-1.5 rounded-lg transition-colors ${
          open
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Admin enterprise settings"
          className={`absolute top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSelectSetting(null);
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-indigo-50/70 border-b border-slate-200 flex items-center justify-between gap-2 text-left transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Settings className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-900 truncate">
                Settings · 10 Full-Page Tools
              </span>
            </div>
            <span className="font-mono text-[11px] font-medium text-indigo-600 capitalize shrink-0">
              {environment}
            </span>
          </button>

          <div className="max-h-[70vh] overflow-y-auto py-1.5 divide-y divide-slate-100">
            {ENTERPRISE_MENU_OPTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onSelectSetting(item.id);
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-start gap-2.5 hover:bg-indigo-50/70 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-indigo-600 tabular-nums">
                        {item.code}.
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {hasPin && onLockNow && (
            <div className="p-2 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onLockNow();
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lock Admin Panel Now</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
