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
    console.error('Next.js App Router Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-right dir-rtl">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold">حدث خطأ غير متوقع في المنصة</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          نعتذر، حدثت مشكلة أثناء تحميل هذه الصفحة. لقد تم تسجليها تلقائياً لدى فريق الدعم الفني.
        </p>
        <button
          onClick={() => reset()}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة (Reset Boundary)
        </button>
      </div>
    </div>
  );
}
