'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If it's a transient chunk load error (such as during hot recompilation), automatically reload once
    if (
      typeof window !== 'undefined' &&
      (error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('timeout'))
    ) {
      const hasReloaded = sessionStorage.getItem('aafiya_chunk_reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('aafiya_chunk_reloaded', 'true');
        window.location.reload();
      }
    }
  }, [error]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('aafiya_chunk_reloaded');
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">تحديث حزم النظام</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              حدث تأخير مؤقت في تحميل حزم الواجهة أثناء إعادة البناء البرمجي. يرجى تحديث الصفحة للمتابعة.
            </p>
          </div>
          <button
            onClick={handleReload}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-900/30 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث الصفحة الآن (Refresh Page)
          </button>
        </div>
      </body>
    </html>
  );
}
