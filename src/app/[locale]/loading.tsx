import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-700 font-sans">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
        <div className="absolute font-black text-[11px] text-teal-700 font-sans">Aafiya</div>
      </div>
    </div>
  );
}
