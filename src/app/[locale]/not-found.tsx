import React from 'react';
import { FileSearch, Home } from 'lucide-react';
import Link from 'next/link';

// Localized not-found page as a Server Component
export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 text-right dir-rtl font-sans">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <FileSearch className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold">الصفحة غير موجودة (404)</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          عذراً، الرابط الذي تحاول الوصول إليه غير موجود أو تم نقله ضمن هيكلة المعمارية الجديدة.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors mx-auto"
        >
          <Home className="w-4 h-4" />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
