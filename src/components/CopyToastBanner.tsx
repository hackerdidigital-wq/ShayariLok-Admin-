import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { subscribeCopyToast, type CopyToastEventDetail } from '../utils/clipboardToast';

export const CopyToastBanner: React.FC = () => {
  const [toast, setToast] = useState<CopyToastEventDetail | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const unsub = subscribeCopyToast((detail) => {
      setToast(detail);
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        setToast((prev) => (prev?.id === detail.id ? null : prev));
      }, 2400);
    });
    return () => {
      unsub();
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-700 text-white shadow-xl border border-emerald-500/40 max-w-xs sm:max-w-sm"
    >
      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
      <div className="min-w-0">
        <div className="text-xs sm:text-sm font-semibold leading-tight">
          {toast.message}
        </div>
        {toast.label && (
          <div className="text-[11px] text-emerald-100 truncate">
            {toast.label}
          </div>
        )}
      </div>
    </div>
  );
};
