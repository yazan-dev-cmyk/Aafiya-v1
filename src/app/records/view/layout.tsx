import type { Metadata } from 'next';
import React from 'react';
import '../../../index.css';

export const metadata: Metadata = {
  title: 'عرض السجل الطبي المشفر | Aafiya',
  description: 'عارض السجل الطبي الموحد الآمن - منصة عافية',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RecordsViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
