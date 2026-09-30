import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import TestAppsClient from './TestAppsClient';

export const metadata: Metadata = {
  title: 'AAFIYA — Test Apps (Staging / Pilot)',
  description: 'AAFIYA Mobile Applications — Internal Staging & Pilot Testing Distribution',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function TestAppsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TestAppsClient locale={locale} />;
}
