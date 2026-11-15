import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  Lock,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  PRIMARY_ADMIN_EMAIL,
  classifyFirebaseAuthError,
} from '../utils/adminAuth';
import { copyTextWithFeedback } from '../utils/clipboardToast';

interface AdminAuthGateProps {
  organizationName: string;
  user: User | null;
  authLoading: boolean;
  isAuthorizedUser: boolean;
  authError: unknown;
  canEnterLocalSandbox: boolean;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onEnterLocalSandbox: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  organizationName,
  user,
  authLoading,
  isAuthorizedUser,
  authError,
  canEnterLocalSandbox,
  onGoogleSignIn,
  onGoogleSignOut,
  onEnterLocalSandbox,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);

  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const errorInfo = authError
    ? classifyFirebaseAuthError(authError, hostname)
    : null;

  const handleSignInClick = async () => {
    setSigningIn(true);
    try {
      await onGoogleSignIn();
    } finally {
      setSigningIn(false);
    }
  };

  const handleCopyHostname = async () => {
    const ok = await copyTextWithFeedback(hostname, 'Authorized Domain');
    if (ok) {
      setCopiedHost(true);
      window.setTimeout(() => setCopiedHost(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-wider text-indigo-700 font-semibold">
              {organizationName} · Protected Admin
            </div>
            <h1 className="font-display text-xl font-bold text-slate-900 mt-0.5">
              Shayari Lok Admin Access
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              पैनल डेटा, लाइव ऐप कंट्रोल और Firestore सुरक्षा के लिए केवल वेरीफाइड एडमिन लॉगिन आवश्यक है।
            </p>
          </div>
        </div>

        {authLoading ? (
          <div className="py-6 text-center text-xs font-medium text-slate-500">
            Verifying Firebase authentication session...
          </div>
        ) : user && !isAuthorizedUser ? (
          <div className="space-y-4">
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-red-800">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Unauthorized Account</span>
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                अकाउंट <strong className="font-mono">{user.email || user.uid}</strong>{' '}
                एडमिन के रूप में अधिकृत नहीं है। केवल वेरीफाइड एडमिन (
                <code className="font-mono">{PRIMARY_ADMIN_EMAIL}</code> या allowlisted
                co-admin) ही पैनल खोल सकते हैं।
              </p>
            </div>

            <button
              type="button"
              onClick={() => void onGoogleSignOut()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out &amp; Switch Account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Zero-Trust Security Active</span>
              </div>
              <p>
                Authorized Admin Email:{' '}
                <code className="font-mono text-indigo-700 font-semibold">
                  {PRIMARY_ADMIN_EMAIL}
                </code>
              </p>
              <p className="text-[11px] text-slate-500">
                Firestore Security Rules block all non-admin writes and protect user chats &amp; app settings.
              </p>
            </div>

            {errorInfo && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-900"
              >
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{errorInfo.title}</span>
                </div>
                <p>{errorInfo.message}</p>
                <p className="text-[11px] text-amber-800">{errorInfo.hint}</p>
                {errorInfo.code === 'auth/unauthorized-domain' && (
                  <button
                    type="button"
                    onClick={() => void handleCopyHostname()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-white border border-amber-300 rounded-md text-amber-900 hover:bg-amber-100"
                  >
                    {copiedHost ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>Copied Successfully!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Domain: {hostname}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={signingIn}
              onClick={() => void handleSignInClick()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {signingIn ? 'Opening Google Sign-In...' : 'Sign in with Google Admin'}
              </span>
            </button>

            {canEnterLocalSandbox && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={onEnterLocalSandbox}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Open Local Preview Workspace (No Cloud Write)</span>
                </button>
                <p className="text-[11px] text-center text-slate-400">
                  Local preview runs in browser-only sandbox; cloud database writes still require Google Admin Sign-In.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
