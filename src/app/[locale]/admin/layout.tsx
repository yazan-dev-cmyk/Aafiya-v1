'use client';

import React from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-teal-400 text-sm">بوابة إدارة المنصة (Super Admin Layout)</span>
          <span className="bg-teal-900/60 text-teal-300 px-2 py-0.5 rounded text-[10px] font-mono">NEXT.JS APP ROUTER</span>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
