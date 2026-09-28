'use client';

import React from 'react';

export default function RadiologyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-sm border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-teal-400 text-sm">بوابة مركز الأشعة والتصوير (Radiology Portal Layout)</span>
          <span className="bg-teal-900/60 text-teal-300 px-2 py-0.5 rounded text-[10px] font-mono">NEXT.JS APP ROUTER</span>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
