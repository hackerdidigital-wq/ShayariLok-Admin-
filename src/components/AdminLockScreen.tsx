import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

interface AdminLockScreenProps {
  organizationName: string;
  adminDisplayName: string;
  onUnlock: (pin: string) => Promise<boolean>;
}

export const AdminLockScreen: React.FC<AdminLockScreenProps> = ({
  organizationName,
  adminDisplayName,
  onUnlock,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('कृपया अपना एडमिन PIN दर्ज करें।');
      return;
    }
    setChecking(true);
    setError('');
    const ok = await onUnlock(pin);
    setChecking(false);
    if (!ok) {
      setError('गलत पासकोड। कृपया सही एडमिन PIN डालें।');
      setPin('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-lock-title"
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">
              {organizationName} · {adminDisplayName}
            </div>
            <h2
              id="admin-lock-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              Admin Workspace Locked
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          सुरक्षा के लिए एडमिन पैनल लॉक है। संपादन और GitHub Publish जारी रखने के लिए अपना PIN दर्ज करें।
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="unlock-pin-input"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Admin Passcode (PIN)
            </label>
            <input
              id="unlock-pin-input"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 text-center tracking-[0.35em] text-base font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
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
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{checking ? 'Verifying...' : 'Unlock Workspace'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
